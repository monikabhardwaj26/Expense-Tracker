import React, { createContext, useContext, useEffect, useState } from 'react'
import { registerUser, loginUser, fetchMe, logoutUser } from '../api/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('smartspend_user')
    return raw ? JSON.parse(raw) : null
  })
  const [token, setToken] = useState(() => localStorage.getItem('smartspend_token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // On first load, if a token exists, verify it against the backend
    // rather than trusting whatever is in localStorage.
    if (token) {
      fetchMe()
        .then((data) => {
          setUser(data)
          localStorage.setItem('smartspend_user', JSON.stringify(data))
        })
        .catch(() => {
          setUser(null)
          setToken(null)
          localStorage.removeItem('smartspend_token')
          localStorage.removeItem('smartspend_user')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const persist = (data) => {
    setToken(data.token)
    setUser(data.user)
    localStorage.setItem('smartspend_token', data.token)
    localStorage.setItem('smartspend_user', JSON.stringify(data.user))
  }

  const register = async (payload) => {
    const data = await registerUser(payload)
    persist(data)
    return data
  }

  const login = async (payload) => {
    const data = await loginUser(payload)
    persist(data)
    return data
  }

  const logout = async () => {
    try {
      await logoutUser()
    } catch {
      // Even if the server call fails, clear the local session.
    }
    setToken(null)
    setUser(null)
    localStorage.removeItem('smartspend_token')
    localStorage.removeItem('smartspend_user')
  }

  // Lets Settings (or anywhere else) push a freshly-updated user object into
  // context + localStorage after a successful PATCH /api/auth/me/.
  const updateUser = (data) => {
    setUser(data)
    localStorage.setItem('smartspend_user', JSON.stringify(data))
  }

  // Reflect the user's saved theme preference on the page immediately,
  // including right after login/signup and after a Settings update.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', user?.theme || 'light')
  }, [user?.theme])

  return (
    <AuthContext.Provider value={{ user, token, loading, register, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
