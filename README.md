# SmartSpend AI — Prompt 1 + 2 + 3 (Final)

A full-stack, AI-enabled expense tracker: **React (Vite)** frontend +
**Django / Django REST Framework** backend, real SQLite database, and now a
backend-mediated **AI Financial Advisor**, a hand-rolled **ML spending
prediction**, and **receipt-scanning OCR** on top of the Prompt 1/2
foundation (auth, expenses, dashboard, transactions, budgets, goals, bills,
reports, settings).

## A note on this build — please read before running

This was written in a sandboxed environment with **no internet access**, so
`pip install` / `npm install` could not be run, and Django itself isn't
installed here — I could not start the servers or click through the app.
What I *could* verify for real, because Pillow/pytesseract/tesseract-ocr
happened to already be present in this sandbox:

- **The ML regression math** — extracted the exact `_simple_linear_regression`
  function and ran it against a perfect-trend series, a noisy series, and a
  flat series. All three produced correct slope/intercept/R² values.
- **The rule-based insight logic** — ran `generate_rule_based_insights`
  against a crafted "eventful" month (budget exceeded, spending up 80%,
  one category >40%, a large bill due soon) and a "quiet" month. The
  eventful case correctly fired all four insight types; the quiet case
  correctly returned zero insights (no fabricated content).
- **Receipt OCR, end-to-end, for real** — generated a synthetic receipt
  image with PIL, ran it through actual `pytesseract` + the real
  `tesseract-ocr` binary, and passed the OCR text through the exact
  extraction functions. It correctly pulled the total amount (₹400),
  merchant name, and category (`food`, via the "cafe" keyword). The date
  was misread as 2028 instead of 2026 — a genuine OCR artifact from my
  crude synthetic text rendering, not a bug in the extraction regex; real
  printed receipts should OCR more reliably, but this is a real limitation
  worth knowing about, not a hidden one.
- Every backend `.py` file (all apps) passes `python -m py_compile`, and
  every new/edited frontend file was checked for balanced brackets.

What I could **not** verify here: the actual Django server running, the
`/api/ai/chat/` and `/api/ai/insights/` endpoints calling a real AI
provider (no API key, no network), the React app building/rendering in a
browser, or the full click-through flow in point 19 of the prompt. Please
run it locally and tell me about anything that breaks — I'd rather you know
that now than have me claim a false "fully tested."

## 1. Final project structure

```
SmartSpend-AI/
  backend/
    smartspend/        settings, urls, wsgi/asgi
    accounts/           custom User (email login, theme, currency, notifications)
    expenses/            Expense CRUD + Dashboard aggregation
    budgets/              Budget CRUD, spent/remaining computed live
    goals/                  Goal CRUD, progress computed live
    bills/                    Bill CRUD + mark-paid, computed status
    reports/                   monthly report (JSON) + CSV download
    ai/                          AI chat + insights (backend-mediated)
    predictions/                  ML monthly spending prediction (linear regression)
    receipts/                      receipt OCR extraction (never auto-saves)
    requirements.txt, .env.example, manage.py
  frontend/
    src/
      api/            client.js + one module per backend app (auth, expenses,
                       budgets, goals, bills, reports, ai, predictions, receipts)
      components/     Navbar, ProtectedRoute, AddExpenseModal (+ receipt scan),
                       CategoryPieChart
      context/        AuthContext (token, theme)
      pages/          Landing, Signup, Login, Dashboard, Transactions, Budgets,
                       Goals, Bills, Reports, Settings, AIAdvisor
      styles/         index.css (light/dark theme, chat UI, charts, badges)
```

## 2. Main technologies used

React 18 + Vite, React Router, Axios, Recharts (category pie chart) on the
frontend; Django 5 + Django REST Framework + Token auth + django-cors-headers
+ python-decouple on the backend; SQLite as the database; the `anthropic`
Python SDK for the AI calls (backend-only); Pillow + pytesseract (+ the
system `tesseract-ocr` binary) for receipt OCR; a hand-written ordinary
least-squares linear regression (no ML library) for the spending
prediction.

## 3. Main database models

`User` (accounts), `Expense`, `Budget`, `Goal`, `Bill` — all Prompt 1/2
models, unchanged in Prompt 3. **No new models were needed for AI/ML/OCR**:
AI chat and insights are computed on the fly from existing data, the ML
prediction reads existing `Expense` rows, and receipt scanning never
persists anything itself (it only returns values for the existing Add
Expense form to use).

## 4. Main REST APIs (new in Prompt 3)

```
POST /api/ai/chat/                 { "message": "..." } -> { "reply": "..." }
GET  /api/ai/insights/             -> { "insights": [...], "ai_phrased": bool }
GET  /api/predictions/monthly/     -> prediction or { available: false, message }
POST /api/receipts/scan/           multipart "receipt" file -> extracted fields
```
(Full Prompt 1/2 API list is unchanged — see the code / earlier README
sections preserved in git history if needed.)

## 5. AI functionality

- **Architecture matches the required flow exactly**: React never calls the
  AI directly. `POST /api/ai/chat/` authenticates the user, builds a JSON
  "financial facts" object from their real `Expense`/`Budget`/`Goal`/`Bill`
  rows (`ai/services.py: build_financial_context`), sends that + the
  message to the AI as a system prompt that explicitly forbids inventing
  numbers, and returns only the reply text to React. The AI API key lives
  in `backend/.env` (`AI_API_KEY`), read via `python-decouple`, and is
  never sent to or readable by the frontend.
- **Insights** (`GET /api/ai/insights/`) are computed as plain facts first
  (`generate_rule_based_insights`) — budget exceeded/nearing limit,
  spending up/down ≥15% month-over-month, one category ≥40% of spend, a
  large bill due within a week. If an AI key is configured, the AI is asked
  only to *rephrase* those exact facts more naturally (same count, same
  order, no new numbers); if the AI is unavailable, the plain rule-based
  messages are returned as-is — insights work either way, never fabricated.
- **AI failure handling**: any AI error (missing key, network failure, bad
  response) is caught as `AIServiceError` and turned into the exact message
  the spec asked for — `"AI service is temporarily unavailable. Please try
  again."` — with a `503` status. The raw exception is never exposed.

### ⚠️ Setup this feature actually needs
`AI_API_KEY` must be set in `backend/.env` (an Anthropic API key from
https://console.anthropic.com), and `pip install anthropic` (already in
`requirements.txt`) must succeed. Without a key, `/api/ai/chat/` returns
the clean "temporarily unavailable" message, and `/api/ai/insights/` still
works using the plain rule-based phrasing (no AI needed for insights to be
useful).

## 6. ML functionality

`GET /api/predictions/monthly/` — a genuine, from-scratch **ordinary least
squares linear regression** (`predictions/services.py`), not a wrapper
around a library:
1. **Data prep** — pulls the user's real `Expense` rows, grouped by
   calendar month.
2. **Feature creation** — each month becomes a point `(month_index, total_spent)`.
3. **Model training** — closed-form OLS computed by hand over those points.
4. **Prediction** — evaluates the fitted line one month past the last one
   seen (clamped at 0, since spending can't be negative).
5. **Result handling** — requires at least 3 months of real history; below
   that it returns `{ "available": false, "message": "Not enough
   historical data to generate a reliable spending prediction." }` rather
   than guessing. When available, it also returns R² so the estimate is
   never presented as more certain than it is.

I verified the regression math directly (see the note at the top) against
known inputs — it's correct. I could not verify it against a real Django
database with real historical expenses, since Django doesn't run here.

On the Dashboard, the prediction appears as a **visually distinct, dashed
"Predicted Next-Month Spending" card** with an explicit "estimate only, not
a confirmed figure" caption — never mixed in with real totals.

## 7. Receipt functionality

`POST /api/receipts/scan/` (multipart, field `receipt`) → validates the
upload (size, content-type, that it's actually a readable image), runs
OCR via `pytesseract`, and heuristically extracts amount / date / merchant
/ category via regex and keyword matching. This is explicitly a heuristic,
not a trained model, and the response says so (`extraction_method:
"ocr_heuristic"`).

**Safety, exactly as required**: scanning never creates an Expense by
itself. The Add Expense modal's new "📷 Scan Receipt" button uploads the
image, pre-fills only the fields that were actually found, shows "please
review the details below before saving," and the user must still press
**Save** — which goes through the normal, already-validated Expense API.
If extraction fails for any reason (bad file, OCR unavailable, unreadable
image), the endpoint returns `{"success": false, "message": "..."}` (HTTP
200, not a crash), and the modal shows that message with the form left
open for manual entry.

### ⚠️ Setup this feature actually needs
Two things beyond a normal `pip install`:
1. The Python package `pytesseract` (in `requirements.txt`).
2. The **system** `tesseract-ocr` binary, which pip cannot install —
   `sudo apt install tesseract-ocr` (Debian/Ubuntu), `brew install
   tesseract` (macOS), or the Windows installer from the tesseract-ocr
   project. Without it, `pytesseract` raises an error that the backend
   catches and turns into a clean "couldn't read this receipt" response —
   scanning fails safely, the rest of the app is unaffected, and Add
   Expense still works by typing values in manually.

I verified this real OCR pipeline end-to-end in this sandbox (see the note
at the top) because those two pieces happened to already be installed
here — that's a genuine test, not a simulation, though it used a
synthetic receipt image rather than a real photographed one.

## 8. How to run the backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# edit .env: set SECRET_KEY, and AI_API_KEY if you want live AI chat/insights
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser   # optional
python manage.py runserver
```
For receipt scanning, also install the system `tesseract-ocr` binary (see
section 7).

## 9. How to run the frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## 10. Known limitations

- AI chat/insights require a valid `AI_API_KEY`; without one, chat shows
  the "temporarily unavailable" message and insights fall back to the
  plain rule-based phrasing (still real, just less conversational).
- Receipt scanning requires the system `tesseract-ocr` binary in addition
  to the Python packages; without it, scanning fails safely and the user
  falls back to typing the expense manually.
- The ML prediction needs at least 3 months of real expense history per
  user; new accounts will correctly see "not enough historical data" until
  they've logged that much.
- Receipt OCR is heuristic (regex/keyword-based), not a trained model —
  accuracy depends on how cleanly the receipt photo OCRs; the extracted
  fields are always pre-fill suggestions the user reviews, never
  auto-saved.
- No income-entry feature exists, so Reports/AI insights never invent an
  income-vs-expense balance.
- Bill recurrence doesn't auto-generate the next occurrence after
  "Mark as Paid" (kept simple, per the Prompt 2 instruction).

## 11. Final testing status — honest summary

**Actually tested in this sandbox (real code, real execution):**
- ML linear regression math (3 scenarios, correct results).
- Rule-based AI insight logic (eventful month + quiet month, correct
  results, zero fabricated insights).
- Receipt OCR pipeline end-to-end on a synthetic image (correct amount,
  merchant, category; one OCR digit misread on the date, noted above).
- Receipt upload validation (garbage file, oversized file, wrong
  content-type all rejected safely, no crash).
- Every backend `.py` file compiles (`py_compile`) across all ten apps.
- Every new/edited frontend file has balanced brackets; the file tree and
  imports were manually cross-checked (routes ↔ Navbar ↔ pages ↔ API
  modules ↔ backend URLs) for consistency.

**Not tested (no internet/Django in this sandbox) — please verify locally:**
- Running `python manage.py runserver` and `npm run dev` together.
- The full click-through in the prompt's test flow (Landing → Sign Up →
  … → Logout → Landing).
- `/api/ai/chat/` and `/api/ai/insights/` against a real AI provider.
- Real per-user data isolation under an actual running server (the code
  follows the same `get_queryset()` + object-permission pattern used and
  reasoned about since Prompt 1, but I have not clicked through it with
  two live accounts here).
- Responsive rendering in an actual browser at desktop/tablet/mobile
  widths (CSS was written with the same responsive patterns as Prompt 1/2,
  which I also haven't visually rendered).

If anything fails on your first run, send me the exact error — I'll fix it
directly rather than guess.
