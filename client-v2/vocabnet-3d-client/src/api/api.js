import { request, setToken } from '../utils/request'

export const CREATE_DATA_SUCCEED = 1;
export const CREATE_DATA_PARTIAL = 2;
export const CREATE_DATA_FAILED = 3;

export async function login(username, password) {
  const data = await request('POST', '/login', { username, password })
  setToken(data.access_token)
  return data
}

export async function getData() {
  return await request('GET', '/getdata')
}

export async function createData(data) {
  try {
    await request('POST', '/createdata', data)
    console.log("Data creation succeeded");
    return data
  } catch (err) {
    const msg = err.message || ''

    if (msg.includes('[add_words succeeded]')) {
      console.warn("Partial success: Words added, but edges failed");
      return {words: data.words, mode: data.mode}
    }

    console.error("Data creation failed entirely");
    return {}
  }
}

export async function removeData(data) {
  try {
    await request('POST', '/removedata', data)
    console.log("Data removal succeeded");
    return data
  } catch (err) {
    const msg = err.message || ''
    console.error("Data removal failed entirely");
    return {}
  }
}