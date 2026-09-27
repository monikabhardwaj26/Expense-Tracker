import React, { useState, useRef, useEffect } from 'react'
import Navbar from '../components/Navbar.jsx'
import { sendChatMessage } from '../api/ai'

const SUGGESTED_QUESTIONS = [
  'Can I save more?',
  'Analyze this month',
  'Should I buy this?',
]

const GENERIC_AI_ERROR = 'AI service is temporarily unavailable. Please try again.'

export default function AIAdvisor() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  const send = async (text) => {
    const trimmed = text.trim()
    if (!trimmed || sending) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', text: trimmed }])
    setSending(true)

    try {
      const data = await sendChatMessage(trimmed)
      setMessages((prev) => [...prev, { role: 'ai', text: data.reply }])
    } catch (err) {
      const backendMessage = err?.response?.data?.detail
      const shown = backendMessage || GENERIC_AI_ERROR
      setMessages((prev) => [...prev, { role: 'ai', text: shown, isError: true }])
    } finally {
      setSending(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    send(input)
  }

  return (
    <div className="app-shell">
      <Navbar />
      <main className="page-content chat-page">
        <h1>AI Financial Advisor</h1>
        <p className="muted chat-subtitle">
          Ask about your real spending, budgets, and goals — answers are grounded in your
          actual SmartSpend data, not guesses.
        </p>

        <div className="chat-window">
          {messages.length === 0 && !sending && (
            <div className="chat-empty-state">
              <p className="empty-state">
                No messages yet. Try one of the suggestions below, or ask your own question.
              </p>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`chat-bubble-row ${m.role === 'user' ? 'from-user' : 'from-ai'}`}>
              <div className={`chat-bubble ${m.role === 'user' ? 'bubble-user' : 'bubble-ai'} ${m.isError ? 'bubble-error' : ''}`}>
                {m.text}
              </div>
            </div>
          ))}

          {sending && (
            <div className="chat-bubble-row from-ai">
              <div className="chat-bubble bubble-ai bubble-typing">Thinking…</div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <div className="suggested-questions">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button key={q} className="chip" onClick={() => send(q)} disabled={sending}>
              {q}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="chat-input-row">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your spending, budgets, or goals…"
            disabled={sending}
          />
          <button type="submit" className="btn btn-primary" disabled={sending || !input.trim()}>
            {sending ? 'Sending…' : 'Send'}
          </button>
        </form>
      </main>
    </div>
  )
}
