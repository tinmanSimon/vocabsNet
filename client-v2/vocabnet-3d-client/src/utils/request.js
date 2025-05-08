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

  // For GET requests, convert body to query string
  let url = `${BASE_URL}${endpoint}`
  if (method === 'GET' && body && typeof body === 'object') {
    const query = new URLSearchParams(body).toString()
    url += `?${query}`
  }

  const res = await fetch(url, {
    method,
    headers,
    body: method === 'GET' ? undefined : JSON.stringify(body)
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
