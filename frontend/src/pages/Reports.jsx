import React, { useEffect, useState, useCallback } from 'react'
import Navbar from '../components/Navbar.jsx'
import { fetchMonthlyReport, downloadMonthlyReport } from '../api/reports'

const label = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const formatMoney = (v) => `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
const currentMonth = () => new Date().toISOString().slice(0, 7)

export default function Reports() {
  const [month, setMonth] = useState(currentMonth())
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    fetchMonthlyReport(month)
      .then(setReport)
      .catch(() => setError('Could not load the report for this month.'))
      .finally(() => setLoading(false))
  }, [month])

  useEffect(() => { load() }, [load])

  const handleDownload = async () => {
    setDownloading(true)
    try {
      await downloadMonthlyReport(month)
    } catch {
      setError('Could not download the report. Please try again.')
    } finally {
      setDownloading(false)
    }
  }

  const maxCategory = report?.category_breakdown?.length
    ? Math.max(...report.category_breakdown.map((c) => Number(c.total)))
    : 0

  return (
    <div className="app-shell">
      <Navbar />
      <main className="page-content">
        <div className="page-header-row">
          <h1>Reports</h1>
          <div className="row-actions">
            <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            <button className="btn btn-ghost" onClick={handleDownload} disabled={downloading || loading}>
              {downloading ? 'Preparing…' : 'Download Report'}
            </button>
          </div>
        </div>

        {loading && <p className="muted">Loading…</p>}
        {error && <p className="field-error">{error}</p>}

        {report && !loading && (
          <>
            <div className="stat-grid">
              <div className="stat-card">
                <span className="stat-label">Total Expenses ({report.month})</span>
                <span className="stat-value">{formatMoney(report.total_expenses)}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Highest Spending Category</span>
                <span className="stat-value">
                  {report.highest_spending_category ? label(report.highest_spending_category.category) : '—'}
                </span>
              </div>
            </div>

            {!report.income_tracked && (
              <p className="muted" style={{ marginBottom: '1rem' }}>
                Income tracking isn't part of the app yet, so no income-vs-expense balance is shown — only real expense data.
              </p>
            )}

            <section className="panel">
              <h2>Category-wise Spending</h2>
              {report.category_breakdown.length === 0 ? (
                <p className="empty-state">No expenses recorded for this month.</p>
              ) : (
                <div className="bar-chart">
                  {report.category_breakdown.map((c) => (
                    <div key={c.category} className="bar-row">
                      <span className="bar-label">{label(c.category)}</span>
                      <div className="bar-track">
                        <div className="bar-fill" style={{ width: `${maxCategory ? (Number(c.total) / maxCategory) * 100 : 0}%` }} />
                      </div>
                      <span className="bar-value">{formatMoney(c.total)}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="panel">
              <h2>Budget Summary</h2>
              {report.budget_summary.length === 0 ? (
                <p className="empty-state">No budgets set for this month.</p>
              ) : (
                <table className="transactions-table">
                  <thead><tr><th>Category</th><th>Budget</th><th>Spent</th><th>Remaining</th></tr></thead>
                  <tbody>
                    {report.budget_summary.map((b) => (
                      <tr key={b.category}>
                        <td>{label(b.category)}</td>
                        <td>{formatMoney(b.budget)}</td>
                        <td>{formatMoney(b.spent)}</td>
                        <td>{formatMoney(b.remaining)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
