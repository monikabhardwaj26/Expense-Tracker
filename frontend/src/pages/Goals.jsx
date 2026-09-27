import React, { useEffect, useState, useCallback } from 'react'
import Navbar from '../components/Navbar.jsx'
import { listGoals, createGoal, updateGoal, deleteGoal } from '../api/goals'

const formatMoney = (v) => `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

function GoalForm({ onClose, onSaved, editingGoal }) {
  const isEditing = Boolean(editingGoal)
  const [form, setForm] = useState({
    name: editingGoal?.name ?? '',
    target_amount: editingGoal?.target_amount ?? '',
    current_amount: editingGoal?.current_amount ?? 0,
    deadline: editingGoal?.deadline ?? '',
  })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return setError('Goal name is required.')
    if (!form.target_amount || Number(form.target_amount) <= 0) return setError('Target amount must be greater than 0.')
    setSaving(true)
    setError('')
    try {
      const payload = { ...form, deadline: form.deadline || null }
      if (isEditing) {
        await updateGoal(editingGoal.id, payload)
      } else {
        await createGoal(payload)
      }
      onSaved()
    } catch (err) {
      setError('Could not save this goal. Please check the values and try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Edit Goal' : 'Add New Goal'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <form onSubmit={handleSubmit} className="expense-form">
          <label>
            Goal name
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Laptop" />
          </label>
          <label>
            Target amount
            <input type="number" min="0" step="0.01" value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} />
          </label>
          <label>
            Current amount saved
            <input type="number" min="0" step="0.01" value={form.current_amount} onChange={(e) => setForm({ ...form, current_amount: e.target.value })} />
          </label>
          <label>
            Deadline (optional)
            <input type="date" value={form.deadline || ''} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
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

export default function Goals() {
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    listGoals()
      .then((data) => setGoals(Array.isArray(data) ? data : data.results || []))
      .catch(() => setError('Could not load goals.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id) => {
    await deleteGoal(id)
    setConfirmDeleteId(null)
    load()
  }

  return (
    <div className="app-shell">
      <Navbar />
      <main className="page-content">
        <div className="page-header-row">
          <h1>Goals</h1>
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>+ Add New Goal</button>
        </div>

        {loading && <p className="muted">Loading…</p>}
        {error && <p className="field-error">{error}</p>}
        {!loading && !error && goals.length === 0 && <p className="empty-state">No goals created yet.</p>}

        <div className="budget-grid">
          {goals.map((g) => (
            <div key={g.id} className="budget-card">
              <div className="budget-card-header">
                <h3>{g.name}</h3>
                <div className="row-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditing(g)}>Edit</button>
                  <button className="btn btn-danger btn-sm" onClick={() => setConfirmDeleteId(g.id)}>Delete</button>
                </div>
              </div>
              <p className="budget-numbers">{formatMoney(g.current_amount)} of {formatMoney(g.target_amount)}</p>
              <div className="progress-track">
                <div
                  className={`progress-fill ${g.status === 'completed' ? 'normal' : 'approaching'}`}
                  style={{ width: `${g.percentage}%` }}
                />
              </div>
              <p className="budget-footer">
                <span>{g.percentage}%</span>
                <span>{g.status === 'completed' ? 'Completed 🎉' : g.deadline ? `Due ${g.deadline}` : 'No deadline'}</span>
              </p>
            </div>
          ))}
        </div>
      </main>

      {(showForm || editing) && (
        <GoalForm
          editingGoal={editing}
          onClose={() => { setShowForm(false); setEditing(null) }}
          onSaved={() => { setShowForm(false); setEditing(null); load() }}
        />
      )}

      {confirmDeleteId && (
        <div className="modal-backdrop" onClick={() => setConfirmDeleteId(null)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()}>
            <h3>Delete this goal?</h3>
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
