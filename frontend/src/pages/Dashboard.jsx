import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import AddExpenseModal from '../components/AddExpenseModal.jsx'
import CategoryPieChart from '../components/CategoryPieChart.jsx'
import { fetchDashboard } from '../api/expenses'
import { fetchInsights } from '../api/ai'
import { fetchMonthlyPrediction } from '../api/predictions'

const CATEGORY_LABELS = {
  food: 'Food', travel: 'Travel', bills: 'Bills', shopping: 'Shopping',
  entertainment: 'Entertainment', healthcare: 'Healthcare', education: 'Education',
  transport: 'Transport', other: 'Other',
}

const formatMoney = (v) => `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

const barClass = (status) => {
  if (status === 'exceeded') return 'progress-fill exceeded'
  if (status === 'approaching') return 'progress-fill approaching'
  return 'progress-fill normal'
}

export default function Dashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  // AI insights and the ML prediction are fetched independently of the core
  // dashboard data so a slow/unavailable AI call never blocks balances,
  // transactions, or budgets from showing up.
  const [insights, setInsights] = useState(null)
  const [insightsError, setInsightsError] = useState(false)
  const [prediction, setPrediction] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    fetchDashboard()
      .then(setData)
      .catch(() => setError('Could not load dashboard data. Please check your connection and try again.'))
      .finally(() => setLoading(false))

    fetchInsights()
      .then((res) => setInsights(res.insights))
      .catch(() => setInsightsError(true))

    fetchMonthlyPrediction()
      .then(setPrediction)
      .catch(() => setPrediction(null))
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="app-shell">
      <Navbar />
      <main className="page-content">
        <h1>Dashboard</h1>

        {loading && (
          <div className="dashboard-skeleton">
            <p className="muted">Loading your dashboard…</p>
          </div>
        )}

        {!loading && error && (
          <div className="panel error-panel">
            <p className="field-error">{error}</p>
            <button className="btn btn-ghost btn-sm" onClick={load}>Retry</button>
          </div>
        )}

        {!loading && !error && data && (
          <>
            {/* 1. Total Balance card(s) — real, computed server-side */}
            <div className="stat-grid">
              <div className="stat-card">
                <span className="stat-label">Total Balance (all-time spend)</span>
                <span className="stat-value">{formatMoney(data.total_balance)}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">This Month's Spending</span>
                <span className="stat-value">{formatMoney(data.monthly_spending)}</span>
              </div>
              {prediction?.available && (
                <div className="stat-card prediction-card">
                  <span className="stat-label">Predicted Next-Month Spending</span>
                  <span className="stat-value">{formatMoney(prediction.predicted_amount)}</span>
                  <span className="prediction-caveat">
                    Estimate only, based on {prediction.history.length} months of your history — not a confirmed figure.
                  </span>
                </div>
              )}
            </div>

            {/* 2. Monthly category-wise expense chart, built entirely from API data */}
            <section className="panel">
              <h2>Category-wise Spending (this month)</h2>
              <CategoryPieChart data={data.category_breakdown} />
            </section>

            {/* 3. Recent Transactions */}
            <section className="panel">
              <div className="panel-header-row">
                <h2>Recent Transactions</h2>
                <Link to="/transactions" className="panel-link">View all →</Link>
              </div>
              {data.recent_transactions.length === 0 ? (
                <p className="empty-state">No transactions yet. Add your first expense to start tracking your spending.</p>
              ) : (
                <table className="transactions-table">
                  <thead>
                    <tr><th>Date</th><th>Category</th><th>Description</th><th>Payment</th><th>Amount</th></tr>
                  </thead>
                  <tbody>
                    {data.recent_transactions.map((t) => (
                      <tr key={t.id}>
                        <td>{t.date}</td>
                        <td>{CATEGORY_LABELS[t.category] || t.category}</td>
                        <td>{t.description || '—'}</td>
                        <td>{t.payment_method.toUpperCase()}</td>
                        <td>{formatMoney(t.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>

            {/* 4. Budget progress bars */}
            <section className="panel">
              <div className="panel-header-row">
                <h2>Budgets</h2>
                <Link to="/budgets" className="panel-link">Manage budgets →</Link>
              </div>
              {data.budgets.length === 0 ? (
                <p className="empty-state">No budgets created yet.</p>
              ) : (
                <div className="dashboard-budget-list">
                  {data.budgets.slice(0, 6).map((b) => (
                    <div key={b.id} className="dashboard-budget-item">
                      <div className="dashboard-budget-item-head">
                        <span>{CATEGORY_LABELS[b.category] || b.category}</span>
                        <span>{b.percentage_used}%</span>
                      </div>
                      <div className="progress-track">
                        <div className={barClass(b.status)} style={{ width: `${Math.min(b.percentage_used, 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {data.goals.length > 0 && (
              <section className="panel">
                <div className="panel-header-row">
                  <h2>Goal Progress</h2>
                  <Link to="/goals" className="panel-link">View all goals →</Link>
                </div>
                <div className="dashboard-budget-list">
                  {data.goals.map((g) => (
                    <div key={g.id} className="dashboard-budget-item">
                      <div className="dashboard-budget-item-head">
                        <span>{g.name}</span>
                        <span>{g.percentage}%</span>
                      </div>
                      <div className="progress-track">
                        <div className="progress-fill normal" style={{ width: `${g.percentage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            <section className="panel">
              <div className="panel-header-row">
                <h2>Upcoming Bills</h2>
                <Link to="/bills" className="panel-link">View all bills →</Link>
              </div>
              {data.upcoming_bills.length === 0 ? (
                <p className="empty-state">No upcoming bills.</p>
              ) : (
                <ul className="category-list">
                  {data.upcoming_bills.map((bill) => (
                    <li key={bill.id}>
                      <span>{bill.name} <span className="muted">({bill.due_date})</span></span>
                      <strong>{formatMoney(bill.amount)}</strong>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* 5. AI Insight box — real facts from GET /api/ai/insights/, computed
                 by Django from this user's own data (optionally rephrased by the
                 AI). Never a fabricated message. */}
            <section className="panel ai-insight-box">
              <div className="panel-header-row">
                <h2>🤖 AI Insight</h2>
                <Link to="/ai-chat" className="panel-link">Ask AI Advisor →</Link>
              </div>
              {insightsError ? (
                <p className="empty-state">Couldn't load AI insights right now. Please try again later.</p>
              ) : insights === null ? (
                <p className="muted">Loading insights…</p>
              ) : insights.length === 0 ? (
                <p className="empty-state">Nothing notable to flag this month — your spending looks steady.</p>
              ) : (
                <ul className="ai-insight-list">
                  {insights.map((ins, i) => (
                    <li key={i}>{ins.message}</li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}

        {/* 6. Floating + Add Expense button — always reachable from the Dashboard */}
        <button className="fab" onClick={() => setShowAdd(true)} aria-label="Add expense">+ Add Expense</button>
      </main>

      {showAdd && (
        <AddExpenseModal
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); load() }}
        />
      )}
    </div>
  )
}
