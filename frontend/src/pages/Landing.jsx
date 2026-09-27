import React from 'react'
import { Link } from 'react-router-dom'

const FEATURES = [
  { title: 'Expense Tracking', desc: 'Log every rupee you spend and see exactly where it goes.' },
  { title: 'Smart Budgets', desc: 'Set category budgets and track them against real spending.' },
  { title: 'AI Financial Advice', desc: 'Ask questions about your money and get tailored guidance.' },
  { title: 'Spending Insights', desc: 'Understand your habits with clear, up-to-date breakdowns.' },
]

export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-hero">
        <div className="logo-dot large" />
        <h1>SmartSpend AI</h1>
        <p className="tagline">Track expenses, get AI advice</p>
        <div className="landing-actions">
          <Link to="/login" className="btn btn-ghost">Login</Link>
          <Link to="/signup" className="btn btn-primary">Sign Up</Link>
        </div>
      </header>

      <section className="feature-grid">
        {FEATURES.map((f) => (
          <div key={f.title} className="feature-card">
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  )
}
