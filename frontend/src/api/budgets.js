import client from './client'

export const listBudgets = (month) =>
  client.get('/budgets/', { params: month ? { month } : {} }).then((r) => r.data)

export const createBudget = (data) => client.post('/budgets/', data).then((r) => r.data)
export const updateBudget = (id, data) => client.patch(`/budgets/${id}/`, data).then((r) => r.data)
export const deleteBudget = (id) => client.delete(`/budgets/${id}/`)
