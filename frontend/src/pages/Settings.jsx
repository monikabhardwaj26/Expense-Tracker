import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'
import { useAuth } from '../context/AuthContext.jsx'
import { updateMe } from '../api/auth'

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP']

export default function Settings() {
  const { user, updateUser, logout } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: user?.name || '',
    currency: user?.currency || 'INR',
    theme: user?.theme || 'light',
    notifications_enabled: user?.notifications_enabled ?? true,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const save = async (patch) => {
    const next = { ...form, ...patch }
    setForm(next)
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      const data = await updateMe(patch)
      updateUser(data)
      setSaved(true)
      setTimeout(() => setSaved(false), 1500)
    } catch {
      setError('Could not save this change. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleProfileSubmit = (e) => {
    e.preventDefault()
    save({ name: form.name })
  }

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <div className="app-shell">
      <Navbar />
      <main className="page-content settings-page">
        <h1>Settings</h1>

        {error && <p className="field-error">{error}</p>}
        {saved && <p className="save-confirmation">Saved.</p>}

        <section className="panel">
          <h2>Profile</h2>
          <form onSubmit={handleProfileSubmit} className="expense-form settings-form">
            <label>
              Name
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>
              Email
              <input value={user?.email || ''} disabled title="Email can't be changed here." />
            </label>
            <div className="modal-actions" style={{ justifyContent: 'flex-start' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save name'}
              </button>
            </div>
          </form>
        </section>

        <section className="panel">
          <h2>Currency</h2>
          <select
            value={form.currency}
            onChange={(e) => save({ currency: e.target.value })}
          >
            {CURRENCIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </section>

        <section className="panel">
          <h2>Theme</h2>
          <div className="theme-toggle">
            <button
              className={`btn ${form.theme === 'light' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => save({ theme: 'light' })}
            >
              Light
            </button>
            <button
              className={`btn ${form.theme === 'dark' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => save({ theme: 'dark' })}
            >
              Dark
            </button>
          </div>
        </section>

        <section className="panel">
          <h2>Notifications</h2>
          <label className="switch-row">
            <input
              type="checkbox"
              checked={form.notifications_enabled}
              onChange={(e) => save({ notifications_enabled: e.target.checked })}
            />
            Enable notifications
          </label>
        </section>

        <section className="panel">
          <h2>Account</h2>
          <button className="btn btn-danger" onClick={handleLogout}>Logout</button>
        </section>
      </main>
    </div>
  )
}
