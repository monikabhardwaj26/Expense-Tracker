"""
Receipt scanning: image -> OCR text -> heuristic field extraction.

Requires the optional `pytesseract` Python package AND the system
`tesseract-ocr` binary to be installed (see backend/README notes / the
project README). Neither is a pure-pip dependency we can guarantee is
present, so this module fails *safely*: if either is missing, or OCR
can't make sense of the image, it raises ReceiptExtractionError with a
clear message and the view returns a clean "couldn't read this receipt"
response — it never crashes and never invents field values.

Extraction is heuristic (regex over OCR text), not a trained model — it's
labeled as such in the API response. Whatever it returns is only ever used
to *pre-fill* the Add Expense form; the user must review and press Save,
exactly like the UX spec's flow requires.
"""
import re
from datetime import datetime

from PIL import Image, UnidentifiedImageError

MAX_FILE_SIZE_BYTES = 8 * 1024 * 1024  # 8 MB
ALLOWED_CONTENT_TYPES = {'image/jpeg', 'image/png', 'image/webp'}

CATEGORY_KEYWORDS = {
    'food': ['restaurant', 'cafe', 'coffee', 'food', 'kitchen', 'dine', 'pizza', 'burger', 'bakery'],
    'travel': ['airlines', 'airways', 'flight', 'hotel', 'resort', 'travels'],
    'transport': ['uber', 'ola', 'taxi', 'cab', 'metro', 'fuel', 'petrol', 'diesel', 'parking'],
    'shopping': ['mart', 'store', 'mall', 'retail', 'supermarket', 'bazaar'],
    'entertainment': ['cinema', 'movie', 'theatre', 'multiplex'],
    'healthcare': ['pharmacy', 'clinic', 'hospital', 'medical', 'chemist'],
    'bills': ['electricity', 'water board', 'broadband', 'recharge', 'utility'],
}

DATE_PATTERNS = [
    (r'(\d{4})[-/](\d{1,2})[-/](\d{1,2})', '%Y-%m-%d'),
    (r'(\d{1,2})[-/](\d{1,2})[-/](\d{4})', '%d-%m-%Y'),
    (r'(\d{1,2})[-/](\d{1,2})[-/](\d{2})(?!\d)', '%d-%m-%y'),
]

AMOUNT_LINE_KEYWORDS = ('total', 'amount due', 'grand total', 'net payable', 'amount paid')


class ReceiptExtractionError(Exception):
    """Raised when the receipt can't be read — bad file, no OCR available,
    or OCR produced nothing usable. The view turns this into a clean,
    user-facing message and lets the person fill the form in manually."""


def validate_upload(uploaded_file):
    if uploaded_file.size > MAX_FILE_SIZE_BYTES:
        raise ReceiptExtractionError('That image is too large (max 8 MB).')
    content_type = getattr(uploaded_file, 'content_type', None)
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise ReceiptExtractionError('Please upload a JPEG, PNG, or WEBP image of the receipt.')
    try:
        image = Image.open(uploaded_file)
        image.verify()
    except (UnidentifiedImageError, OSError) as exc:
        raise ReceiptExtractionError('This file does not look like a valid image.') from exc
    uploaded_file.seek(0)


def _run_ocr(uploaded_file):
    try:
        import pytesseract
    except ImportError as exc:
        raise ReceiptExtractionError(
            "Receipt scanning needs the 'pytesseract' package and the system "
            "'tesseract-ocr' binary installed on the backend. Neither is "
            "installed here, so text can't be extracted from this image."
        ) from exc

    try:
        image = Image.open(uploaded_file)
        text = pytesseract.image_to_string(image)
    except Exception as exc:
        raise ReceiptExtractionError(
            'Could not run OCR on this image (is tesseract-ocr installed on the server?).'
        ) from exc

    if not text or not text.strip():
        raise ReceiptExtractionError('No readable text was found on this receipt.')
    return text


def _extract_amount(text):
    lines = text.splitlines()
    candidates = []
    for line in lines:
        for match in re.finditer(r'(?:₹|rs\.?|inr)?\s*([0-9]{1,3}(?:,[0-9]{2,3})*(?:\.[0-9]{1,2})?)', line, re.IGNORECASE):
            raw = match.group(1).replace(',', '')
            try:
                value = float(raw)
            except ValueError:
                continue
            if value <= 0:
                continue
            is_total_line = any(k in line.lower() for k in AMOUNT_LINE_KEYWORDS)
            candidates.append((value, is_total_line))

    if not candidates:
        return None

    total_candidates = [v for v, is_total in candidates if is_total]
    if total_candidates:
        return max(total_candidates)
    return max(v for v, _ in candidates)


def _extract_date(text):
    for pattern, fmt in DATE_PATTERNS:
        match = re.search(pattern, text)
        if not match:
            continue
        raw = match.group(0).replace('/', '-')
        for candidate_fmt in (fmt, fmt.replace('-', '/')):
            try:
                return datetime.strptime(raw, candidate_fmt).date().isoformat()
            except ValueError:
                continue
    return None


def _extract_merchant(text):
    for line in text.splitlines():
        cleaned = line.strip()
        if len(cleaned) >= 3 and not cleaned.isdigit():
            return cleaned[:100]
    return None


def _extract_category(text, merchant):
    haystack = f'{text} {merchant or ""}'.lower()
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(kw in haystack for kw in keywords):
            return category
    return 'other'


def extract_receipt_data(uploaded_file):
    """
    Validates the upload, runs OCR, and heuristically extracts
    amount/date/merchant/category. Raises ReceiptExtractionError on any
    failure (never returns guessed/fabricated field values).
    """
    validate_upload(uploaded_file)
    text = _run_ocr(uploaded_file)

    amount = _extract_amount(text)
    receipt_date = _extract_date(text)
    merchant = _extract_merchant(text)
    category = _extract_category(text, merchant)

    if amount is None and receipt_date is None and merchant is None:
        raise ReceiptExtractionError('Could not extract any usable details from this receipt.')

    return {
        'amount': amount,
        'date': receipt_date,
        'description': merchant,
        'category': category,
        'extraction_method': 'ocr_heuristic',
    }
