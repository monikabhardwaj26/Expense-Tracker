import client from './client'

export const registerUser = (data) => client.post('/auth/register/', data).then((r) => r.data)
export const loginUser = (data) => client.post('/auth/login/', data).then((r) => r.data)
export const fetchMe = () => client.get('/auth/me/').then((r) => r.data)
export const updateMe = (data) => client.patch('/auth/me/', data).then((r) => r.data)
export const logoutUser = () => client.post('/auth/logout/')
