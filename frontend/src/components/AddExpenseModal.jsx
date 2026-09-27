import React, { useState, useRef } from 'react'
import { createExpense, updateExpense } from '../api/expenses'
import { scanReceipt } from '../api/receipts'

const CATEGORIES = ['food', 'travel', 'bills', 'shopping', 'entertainment', 'healthcare', 'education', 'transport', 'other']
const PAYMENT_METHODS = ['cash', 'card', 'upi']

const label = (s) => s.charAt(0).toUpperCase() + s.slice(1)

export default function AddExpenseModal({ onClose, onSaved, editingExpense }) {
  const isEditing = Boolean(editingExpense)
  const [form, setForm] = useState({
    amount: editingExpense?.amount ?? '',
    category: editingExpense?.category ?? 'food',
    date: editingExpense?.date ?? new Date().toISOString().slice(0, 10),
    description: editingExpense?.description ?? '',
    payment_method: editingExpense?.payment_method ?? 'cash',
  })
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanMessage, setScanMessage] = useState('')
  const fileInputRef = useRef(null)

  const validate = () => {
    const errs = {}
    if (!form.amount || Number(form.amount) <= 0) errs.amount = 'Amount must be greater than 0.'
    if (!form.category) errs.category = 'Category is required.'
    if (!form.date) errs.date = 'Date is required.'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSaving(true)
    try {
      if (isEditing) {
        await updateExpense(editingExpense.id, form)
      } else {
        await createExpense(form)
      }
      onSaved()
    } catch (err) {
      const data = err?.response?.data
      if (data && typeof data === 'object') {
        setErrors(data)
      } else {
        setErrors({ non_field_errors: ['Something went wrong. Please try again.'] })
      }
    } finally {
      setSaving(false)
    }
  }

  const handleScanClick = () => fileInputRef.current?.click()

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return

    setScanning(true)
    setScanMessage('')
    try {
      const result = await scanReceipt(file)
      if (!result.success) {
        // Extraction failed cleanly — never crashes, just falls back to
        // manual entry with a clear message. Nothing is auto-saved.
        setScanMessage(result.message || "Couldn't read this receipt. Please enter the details manually.")
        return
      }
      const extracted = result.extracted || {}
      // Only pre-fill fields the scan actually found — never overwrite
      // with a guess, and the user still reviews everything before Save.
      setForm((prev) => ({
        ...prev,
        amount: extracted.amount != null ? String(extracted.amount) : prev.amount,
        date: extracted.date || prev.date,
        description: extracted.description || prev.description,
        category: extracted.category || prev.category,
      }))
      setScanMessage('Receipt scanned — please review the details below before saving.')
    } catch (err) {
      setScanMessage("Couldn't read this receipt. Please enter the details manually.")
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Edit Expense' : 'Add Expense'}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {!isEditing && (
          <div className="receipt-scan-row">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <button type="button" className="btn btn-ghost btn-sm" onClick={handleScanClick} disabled={scanning}>
              {scanning ? 'Scanning…' : '📷 Scan Receipt'}
            </button>
            {scanMessage && <p className="scan-message">{scanMessage}</p>}
          </div>
        )}

        <form onSubmit={handleSubmit} className="expense-form">
          <label>
            Amount
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
            {errors.amount && <span className="field-error">{errors.amount}</span>}
          </label>

          <label>
            Category
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{label(c)}</option>
              ))}
            </select>
            {errors.category && <span className="field-error">{errors.category}</span>}
          </label>

          <label>
            Date
            <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            {errors.date && <span className="field-error">{errors.date}</span>}
          </label>

          <label>
            Note / description (optional)
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. Groceries at D-Mart"
            />
          </label>

          <label>
            Payment method
            <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })}>
              {PAYMENT_METHODS.map((p) => (
                <option key={p} value={p}>{p.toUpperCase()}</option>
              ))}
            </select>
          </label>

          {errors.non_field_errors && <p className="field-error">{errors.non_field_errors[0]}</p>}

          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
