import client from './client'

export const listBills = () => client.get('/bills/').then((r) => r.data)
export const createBill = (data) => client.post('/bills/', data).then((r) => r.data)
export const updateBill = (id, data) => client.patch(`/bills/${id}/`, data).then((r) => r.data)
export const deleteBill = (id) => client.delete(`/bills/${id}/`)
export const markBillPaid = (id) => client.patch(`/bills/${id}/mark-paid/`).then((r) => r.data)
