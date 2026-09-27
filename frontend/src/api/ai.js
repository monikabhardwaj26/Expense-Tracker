import client from './client'

// POST /api/ai/chat/ — the backend (never React directly) talks to the AI
// service, using only this user's real financial data as context.
export const sendChatMessage = (message) =>
  client.post('/ai/chat/', { message }).then((r) => r.data)

// GET /api/ai/insights/ — real, rule-based facts computed from the
// database, optionally rephrased more naturally by the AI. Never fake.
export const fetchInsights = () => client.get('/ai/insights/').then((r) => r.data)
