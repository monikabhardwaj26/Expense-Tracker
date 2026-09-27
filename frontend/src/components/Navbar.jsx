import React, { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/dashboard', enabled: true },
  { label: 'Transactions', to: '/transactions', enabled: true },
  { label: 'Budgets', to: '/budgets', enabled: true },
  { label: 'AI Chat', to: '/ai-chat', enabled: true },
  { label: 'Reports', to: '/reports', enabled: true },
  { label: 'Goals', to: '/goals', enabled: true },
  { label: 'Bills', to: '/bills', enabled: true },
  { label: 'Settings', to: '/settings', enabled: true },
]

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/')
  }

  return (
    <header className="navbar">
      <div className="navbar-brand">
        <span className="logo-dot" />
        SmartSpend AI
      </div>

      <button className="navbar-toggle" onClick={() => setOpen((o) => !o)} aria-label="Toggle navigation">
        ☰
      </button>

      <nav className={`navbar-links ${open ? 'open' : ''}`}>
        {NAV_ITEMS.map((item) =>
          item.enabled ? (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </NavLink>
          ) : (
            <span key={item.to} className="nav-link disabled" title="Coming soon">
              {item.label}
            </span>
          )
        )}
      </nav>

      <div className="navbar-user">
        <span className="navbar-username">{user?.name}</span>
        <button className="btn btn-ghost" onClick={handleLogout}>Logout</button>
      </div>
    </header>
  )
}
