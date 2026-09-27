import client from './client'

// POST /api/receipts/scan/ — uploads a receipt image and gets back
// candidate field values to pre-fill the Add Expense form. This never
// creates an expense by itself; the user still reviews and clicks Save.
export const scanReceipt = (file) => {
  const formData = new FormData()
  formData.append('receipt', file)
  return client
    .post('/receipts/scan/', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    .then((r) => r.data)
}
