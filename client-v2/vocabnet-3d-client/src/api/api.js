import { request, setToken } from '../utils/request'

export async function login(username, password) {
  const data = await request('POST', '/login', { username, password })
  setToken(data.access_token)
  return data
}

export async function getData() {
  return await request('GET', '/getdata')
}
