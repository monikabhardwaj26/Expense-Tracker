import client from './client'

// GET /api/predictions/monthly/ — a simple linear-regression estimate
// built from the user's own historical Expense data. Returns
// { available: false, message: ... } when there isn't enough history.
export const fetchMonthlyPrediction = () =>
  client.get('/predictions/monthly/').then((r) => r.data)
