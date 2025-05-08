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
  const data = await request('GET', '/getdata')
  return data
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

export async function updateNote(data) {
  try {
    await request('POST', '/updatenote', data)
    return data
  } catch (err) {
    const msg = err.message || ''
    console.error("Update note failed entirely");
    return {}
  }
}

export async function searchWord(term) {
  // return await request('POST', '/search', { wordname: term })
  console.log("searchWord term: ", term)

  const test_data = {
    "user": {"username": "najksdfujweqhdjsbhf"},
    "words": [
        {
            "name": "e",
            "username": "najksdfujweqhdjsbhf",
            "note": "asdf"
        },
        {
            "name": "f",
            "username": "najksdfujweqhdjsbhf",
            "note": "wazup"
        },
        {
            "name": "g",
            "username": "najksdfujweqhdjsbhf",
            "note": ""
        }
    ],
    "edges": [
        {
            "edge_name": "a",
            "from_name": "e",
            "to_name": "f",
            "username": "najksdfujweqhdjsbhf",
            "double_edge": true
        },
        {
            "edge_name": "a",
            "from_name": "f",
            "to_name": "g",
            "username": "najksdfujweqhdjsbhf",
            "double_edge": false
        }
    ]
}

  return test_data


  // console.error('Search: word not found on server')
}