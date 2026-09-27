import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api'

const client = axios.create({ baseURL: BASE_URL })

// Attach the auth token (if present) to every outgoing request.
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('smartspend_token')
  if (token) {
    config.headers.Authorization = `Token ${token}`
  }
  return config
})

// If the backend says the token is no longer valid, clear it so the app
// drops back to a logged-out state instead of looping on failed requests.
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('smartspend_token')
      localStorage.removeItem('smartspend_user')
    }
    return Promise.reject(error)
  }
)

export default client
