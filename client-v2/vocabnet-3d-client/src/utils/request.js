let token = localStorage.getItem('token') || ''
const BASE_URL = 'https://tinmansimon.uk/api/vocabnet'

export function setToken(newToken) {
  token = newToken
  localStorage.setItem('token', token)
}

export function getToken() {
  return token
}

export async function request(method, endpoint, body = null) {
  const headers = {
    'Content-Type': 'application/json'
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })

  if (res.status === 401) {
    throw new Error('unauthorized')
  }

  if (!res.ok) {
    const errMsg = await res.text()
    throw new Error(errMsg)
  }

  return res.json()
}
