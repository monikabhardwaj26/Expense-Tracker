import client from './client'

export const listExpenses = (params = {}) =>
  client.get('/expenses/', { params }).then((r) => r.data)

export const createExpense = (data) =>
  client.post('/expenses/', data).then((r) => r.data)

export const updateExpense = (id, data) =>
  client.patch(`/expenses/${id}/`, data).then((r) => r.data)

export const deleteExpense = (id) => client.delete(`/expenses/${id}/`)

export const fetchDashboard = () => client.get('/dashboard/').then((r) => r.data)
