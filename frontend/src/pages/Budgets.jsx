import React, { useEffect, useState, useCallback } from 'react'
import Navbar from '../components/Navbar.jsx'
import { listBudgets, createBudget, updateBudget, deleteBudget } from '../api/budgets'

const CATEGORIES = ['food', 'travel', 'bills', 'shopping', 'entertainment', 'healthcare', 'education', 'transport', 'other']
const label = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const formatMoney = (v) => `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
const currentMonth = () => new Date().toISOString().slice(0, 7)

function BudgetForm({ onClose, onSaved, editingBudget }) {
  const isEditing = Boolean(editingBudget)
  const [form, setForm] = useState({
    category: editingBudget?.category ?? 'food',
    amount: editingBudget?.amount ?? '',
    month: editingBudget?.month?.slice(0, 7) ?? currentMonth(),
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.amount || Number(form.amount) <= 0) {
      setError('Budget amount must be greater than 0.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = { category: form.category, amount: form.amount, month: `${form.month}-01` }
      if (isEditing) {
        await updateBudget(editingBudget.id, payload)
      } else {
        await createBudget(payload)
      }
      onSaved()
    } catch (err) {
      const data = err?.response?.data
      const msg = data?.non_field_errors?.[0] || data?.amount?.[0] || 'Could not save this budget. It may already exist for that category and month.'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Edit Budget' : 'Set New Budget'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="expense-form">
          <label>
            Category
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} disabled={isEditing}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{label(c)}</option>)}
            </select>
          </label>
          <label>
            Monthly budget amount
            <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </label>
          <label>
            Month
            <input type="month" value={form.month} onChange={(e) => setForm({ ...form, month: e.target.value })} disabled={isEditing} />
          </label>
          {error && <p className="field-error">{error}</p>}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Budgets() {
  const [budgets, setBudgets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const month = currentMonth()

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    listBudgets(month)
      .then((data) => setBudgets(Array.isArray(data) ? data : data.results || []))
      .catch(() => setError('Could not load budgets.'))
      .finally(() => setLoading(false))
  }, [month])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id) => {
    await deleteBudget(id)
    setConfirmDeleteId(null)
    load()
  }

  const barClass = (status) => {
    if (status === 'exceeded') return 'progress-fill exceeded'
    if (status === 'approaching') return 'progress-fill approaching'
    return 'progress-fill normal'
  }

  return (
    <div className="app-shell">
      <Navbar />
      <main className="page-content">
        <div className="page-header-row">
          <h1>Budgets — {month}</h1>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Set New Budget</button>
        </div>

        {loading && <p className="muted">Loading…</p>}
        {error && <p className="field-error">{error}</p>}

        {!loading && !error && budgets.length === 0 && (
          <p className="empty-state">No budgets created yet.</p>
        )}

        <div className="budget-grid">
          {budgets.map((b) => (
            <div key={b.id} className="budget-card">
              <div className="budget-card-header">
                <h3>{label(b.category)}</h3>
                <div className="row-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditing(b)}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => setConfirmDeleteId(b.id)}>Delete</button>
                </div>
              </div>
              <p className="budget-numbers">
                {formatMoney(b.spent)} of {formatMoney(b.amount)} spent
              </p>
              <div className="progress-track">
                <div className={barClass(b.status)} style={{ width: `${Math.min(b.percentage_used, 100)}%` }} />
              </div>
              <p className="budget-footer">
                <span>{b.percentage_used}% used</span>
                <span>{Number(b.remaining) >= 0 ? `${formatMoney(b.remaining)} remaining` : `${formatMoney(Math.abs(b.remaining))} over`}</span>
              </p>
            </div>
          ))}
        </div>
      </main>

      {(showForm || editing) && (
        <BudgetForm
          editingBudget={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSaved={() => { setShowForm(false); setEditing(null); load() }}
        />
      )}

      {confirmDeleteId && (
        <div className="modal-backdrop" onClick={() => setConfirmDeleteId(null)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <h3>Delete this budget?</h3>
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
