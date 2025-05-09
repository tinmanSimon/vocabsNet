import { request, setToken } from '../utils/request'

export const CREATE_DATA_SUCCEED = 1;
export const CREATE_DATA_PARTIAL = 2;
export const CREATE_DATA_FAILED = 3;

export async function login(username, password) {
  const data = await request('POST', '/login', { username, password })
  setToken(data.access_token)
  return data
}

function getGraphSize() {
  const raw = localStorage.getItem('app-settings')
  let graph_size = 10
  try {
    const localSetting = JSON.parse(raw)
    if (localSetting?.graph_size > 0) {
      graph_size = localSetting.graph_size
    }
  } catch (err) {
    console.warn("Failed to parse localStorage app-settings:", err)
  }
  return graph_size
}

export async function getData() {
  const data = await request('GET', '/getdata', {"graph_size" : getGraphSize()})
  console.log("data: ", data)
  return data
}

export async function createData(data) {
  try {
    await request('POST', '/createdata', data)
    let at_least_one_detached = false
    const wordSet = new Set(data.words.map(w => w.name));

    for (const word of data.words) {
      let detachedCreation = true
      for (const edge of data.edges) {
        if (edge.from_name === word.name && !wordSet.has(edge.to_name)){
          detachedCreation = false 
          break
        }
        if (edge.to_name === word.name && !wordSet.has(edge.from_name)){
          detachedCreation = false 
          break
        }
      }
      if (detachedCreation) {
        at_least_one_detached = true 
        break
      }
    }

    for (const edge of data.edges) {
      if (!wordSet.has(edge.from_name)) {
        data.words.push({ name: edge.from_name });
        wordSet.add(edge.from_name);
      }
      if (!wordSet.has(edge.to_name)) {
        data.words.push({ name: edge.to_name });
        wordSet.add(edge.to_name);
      }
    }

    data.focus_on_last_word = !at_least_one_detached
    return data
  } catch (err) {
    const msg = err.message || ''

    if (msg.includes('[add_words succeeded]')) {
      console.warn("Partial success: Words added, but edges failed");
      return {words: data.words, mode: data.mode}
    }

    console.error("Data creation failed entirely: ", msg);
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
  console.log("searchWord term: ", term)
  return await request('GET', '/search', { wordname: term, graph_size: getGraphSize() })
}

export async function searchByTags(tags){
  // return request('POST','/searchtags',{ tags, graph_size:getGraphSize() })
  const test_data = {
    "user": {
        "username": "najksdfujweqhdjsbhf",
        "last_focused_word": null
    },
    "words": [
        {
            "name": "rtc",
            "username": "najksdfujweqhdjsbhf",
        }, {
          "name": "a",
          "username": "najksdfujweqhdjsbhf",
        }, {
          "name": "aaaa",
          "username": "najksdfujweqhdjsbhf",
        }
    ]
  }
  return test_data
}