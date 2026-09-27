from rest_framework import permissions, status
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .services import ReceiptExtractionError, extract_receipt_data


class ScanReceiptView(APIView):
    """
    POST /api/receipts/scan/  (multipart/form-data, field name: "receipt")

    Extracts candidate amount/date/merchant/category from an uploaded
    receipt image so the frontend can pre-fill the Add Expense form.
    This NEVER creates an Expense itself — the user still reviews the
    pre-filled form and explicitly clicks Save (handled entirely by the
    existing expenses API). Any failure — bad file, missing OCR
    dependency, unreadable image — comes back as a clean, non-crashing
    response so the person can fall back to typing the expense manually.
    """
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser]

    def post(self, request):
        uploaded_file = request.FILES.get('receipt')
        if not uploaded_file:
            return Response({'detail': 'No receipt file was uploaded.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            data = extract_receipt_data(uploaded_file)
        except ReceiptExtractionError as exc:
            return Response({'success': False, 'message': str(exc)}, status=status.HTTP_200_OK)

        return Response({'success': True, 'extracted': data})
