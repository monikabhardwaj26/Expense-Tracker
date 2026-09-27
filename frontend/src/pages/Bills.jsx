import React, { useEffect, useState, useCallback } from 'react'
import Navbar from '../components/Navbar.jsx'
import { listBills, createBill, updateBill, deleteBill, markBillPaid } from '../api/bills'

const CATEGORIES = ['food', 'travel', 'bills', 'shopping', 'entertainment', 'healthcare', 'education', 'transport', 'other']
const RECURRENCE = ['one_time', 'weekly', 'monthly', 'yearly']
const label = (s) => s.replace('_', ' ').replace(/^\w/, (c) => c.toUpperCase())
const formatMoney = (v) => `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

function BillForm({ onClose, onSaved, editingBill }) {
  const isEditing = Boolean(editingBill)
  const [form, setForm] = useState({
    name: editingBill?.name ?? '',
    amount: editingBill?.amount ?? '',
    due_date: editingBill?.due_date ?? new Date().toISOString().slice(0, 10),
    recurrence: editingBill?.recurrence ?? 'monthly',
    category: editingBill?.category ?? 'bills',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return setError('Bill name is required.')
    if (!form.amount || Number(form.amount) <= 0) return setError('Amount must be greater than 0.')
    setSaving(true)
    setError('')
    try {
      if (isEditing) await updateBill(editingBill.id, form)
      else await createBill(form)
      onSaved()
    } catch {
      setError('Could not save this bill. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Edit Bill' : 'Add Bill'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="expense-form">
          <label>Bill name
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Netflix" />
          </label>
          <label>Amount
            <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
          </label>
          <label>Due date
            <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </label>
          <label>Recurrence
            <select value={form.recurrence} onChange={(e) => setForm({ ...form, recurrence: e.target.value })}>
              {RECURRENCE.map((r) => <option key={r} value={r}>{label(r)}</option>)}
            </select>
          </label>
          <label>Category
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{label(c)}</option>)}
            </select>
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

const statusClass = (s) => {
  if (s === 'paid') return 'badge badge-paid'
  if (s === 'overdue') return 'badge badge-overdue'
  return 'badge badge-upcoming'
}

export default function Bills() {
  const [bills, setBills] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    listBills()
      .then((data) => setBills(Array.isArray(data) ? data : data.results || []))
      .catch(() => setError('Could not load bills.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id) => {
    await deleteBill(id)
    setConfirmDeleteId(null)
    load()
  }

  const handleMarkPaid = async (id) => {
    await markBillPaid(id)
    load()
  }

  return (
    <div className="app-shell">
      <Navbar />
      <main className="page-content">
        <div className="page-header-row">
          <h1>Bills & Reminders</h1>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add Bill</button>
        </div>

        {loading && <p className="muted">Loading…</p>}
        {error && <p className="field-error">{error}</p>}
        {!loading && !error && bills.length === 0 && <p className="empty-state">No bills added yet.</p>}

        {!loading && bills.length > 0 && (
          <table className="transactions-table">
            <thead>
              <tr><th>Bill</th><th>Amount</th><th>Due date</th><th>Recurrence</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {bills.map((b) => (
                <tr key={b.id}>
                  <td>{b.name}</td>
                  <td>{formatMoney(b.amount)}</td>
                  <td>{b.due_date}</td>
                  <td>{label(b.recurrence)}</td>
                  <td><span className={statusClass(b.computed_status)}>{label(b.computed_status)}</span></td>
                  <td className="row-actions">
                    {b.computed_status !== 'paid' && (
                      <button className="btn btn-ghost btn-sm" onClick={() => handleMarkPaid(b.id)}>Mark as Paid</button>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditing(b)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => setConfirmDeleteId(b.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>

      {(showForm || editing) && (
        <BillForm
          editingBill={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSaved={() => { setShowForm(false); setEditing(null); load() }}
        />
      )}

      {confirmDeleteId && (
        <div className="modal-backdrop" onClick={() => setConfirmDeleteId(null)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <h3>Delete this bill?</h3>
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
