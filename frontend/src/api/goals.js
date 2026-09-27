import client from './client'

export const listGoals = () => client.get('/goals/').then((r) => r.data)
export const createGoal = (data) => client.post('/goals/', data).then((r) => r.data)
export const updateGoal = (id, data) => client.patch(`/goals/${id}/`, data).then((r) => r.data)
export const deleteGoal = (id) => client.delete(`/goals/${id}/`)
