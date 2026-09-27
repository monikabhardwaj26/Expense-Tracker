import React, { useEffect, useState, useCallback } from 'react'
import Navbar from '../components/Navbar.jsx'
import AddExpenseModal from '../components/AddExpenseModal.jsx'
import { listExpenses, deleteExpense } from '../api/expenses'

const CATEGORIES = ['', 'food', 'travel', 'bills', 'shopping', 'entertainment', 'healthcare', 'education', 'transport', 'other']
const label = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All categories')
const formatMoney = (v) => `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

export default function Transactions() {
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [editing, setEditing] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [showAdd, setShowAdd] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    const params = {}
    if (search) params.search = search
    if (category) params.category = category
    if (dateFrom) params.date_from = dateFrom
    if (dateTo) params.date_to = dateTo
    listExpenses(params)
      .then((data) => setExpenses(Array.isArray(data) ? data : data.results || []))
      .catch(() => setError('Could not load transactions.'))
      .finally(() => setLoading(false))
  }, [search, category, dateFrom, dateTo])

  useEffect(() => {
    const t = setTimeout(load, 250) // debounce search-as-you-type
    return () => clearTimeout(t)
  }, [load])

  const handleDelete = async (id) => {
    await deleteExpense(id)
    setConfirmDeleteId(null)
    load()
  }

  return (
    <div className="app-shell">
      <Navbar />
      <main className="page-content">
        <h1>Transactions</h1>

        <div className="filters-bar">
          <input
            type="text"
            placeholder="Search description or category…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{label(c)}</option>)}
          </select>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title="From date" />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} title="To date" />
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}>+ Add Expense</button>
        </div>

        {loading && <p className="muted">Loading…</p>}
        {error && <p className="field-error">{error}</p>}

        {!loading && !error && expenses.length === 0 && (
          <p className="empty-state">No transactions yet. Add your first expense to start tracking your spending.</p>
        )}

        {!loading && expenses.length > 0 && (
          <table className="transactions-table">
            <thead>
              <tr><th>Date</th><th>Category</th><th>Description</th><th>Payment</th><th>Amount</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {expenses.map((t) => (
                <tr key={t.id}>
                  <td>{t.date}</td>
                  <td>{label(t.category)}</td>
                  <td>{t.description || '—'}</td>
                  <td>{t.payment_method.toUpperCase()}</td>
                  <td>{formatMoney(t.amount)}</td>
                  <td className="row-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditing(t)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => setConfirmDeleteId(t.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>

      {(showAdd || editing) && (
        <AddExpenseModal
          editingExpense={editing}
          onClose={() => { setShowAdd(false); setEditing(null) }}
          onSaved={() => { setShowAdd(false); setEditing(null); load() }}
        />
      )}

      {confirmDeleteId && (
        <div className="modal-backdrop" onClick={() => setConfirmDeleteId(null)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <h3>Delete this transaction?</h3>
            <p>This can't be undone.</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmDeleteId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => handleDelete(confirmDeleteId)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
