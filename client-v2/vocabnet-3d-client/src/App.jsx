import { useEffect, useState, useRef, createContext} from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Graph from './Graph'
import LoginModal from './components/LoginModal'
import { login, getData, createData, removeData, updateNote } from './api/api'
import { CREATE_DATA_SUCCEED, CREATE_DATA_PARTIAL, CREATE_DATA_FAILED } from './api/api'
import { getToken } from './utils/request'
import LeftNav from './components/LeftNav'
import WelcomeBanner from "./components/WelcomeBanner"
import WordModal from './components/WordModal'
import SearchModal from './components/SearchModal'
import SearchTagsModal from './components/SearchTagsModal'
import { searchWord, searchByTags }  from './api/api'

function App() {
  const [showLogin, setShowLogin] = useState(!getToken())
  const [loginError, setLoginError] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState(null)
  const [showBanner, setShowBanner] = useState(false)
  const [initialPayload, setInitialPayload] = useState(null)
  const [noteModal, setNoteModal] = useState({ open:false, name:'', note:'' })
  const [noteDict, setNoteDict] = useState({})
  const [settings, setSettings] = useState(() => {
    const cached = localStorage.getItem('app-settings')
    return cached ? JSON.parse(cached) : { showNoteOnClick: true }
  })
  const [searchModalOpen, setSearchModalOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const settingsRef = useRef(settings)
  const graphRef = useRef(null);
  const controlsRef = useRef()
  const noteDictRef = useRef(noteDict)
  const [tagDict, setTagDict] = useState({})
  const tagDictRef = useRef(tagDict)
  const [existingTags, setExistingTags] = useState([])
  const [searchTagsModal,setSearchTagsModal]=useState({open:false,results:[]})


  useEffect(() => {
    tagDictRef.current = tagDict
  }, [tagDict])

  useEffect(() => {
    settingsRef.current = settings
  }, [settings])

  const replaceGraphData = (data, term) => {
    if (data?.words?.length) {
      graphRef.current?.replaceWithData(
        { words: data.words, edges: data.edges, mode: 'add-data' },
        term.trim()
      )

      setNoteDict(prev => {
        const dict = {}
        for (const w of data.words || []) {
          dict[w.name] = w.note || ''
        }
        noteDictRef.current = dict 
        return dict
      })

      const tagD = {}
      for (const w of data.words || []) {
        tagD[w.name] = w.tags || []
      }
      setTagDict(tagD)
    }
  }

  const refresh = async () =>{
    const data = await getData()
    if (data.words) {
      replaceGraphData(data, data.words[0].name)
    }
  }

  const handleUpdateSettings = async (newSettings) => {
    const needRefresh = settingsRef.current.graph_size != newSettings.graph_size
    setSettings(newSettings)
    settingsRef.current = newSettings   // ✅ immediate access
    localStorage.setItem('app-settings', JSON.stringify(newSettings))
    if (needRefresh) await refresh()
  }

  const parseExistingTags = (data) => {
    if (!data || !data.tags_meta) return [];
  
    return Object.entries(data.tags_meta)
      .sort((a, b) => b[1] - a[1])  
      .map(([tag, _count]) => tag); 
  };

  const gotData = (data) => {
    const uname = data.user.username
    setUsername(uname)
    setShowBanner(true)
    setIsAuthenticated(true)

    setInitialPayload({
      words: data.words || [],
      edges: data.edges || [],
      mode: "add-data"
    })

    // build centralized note dictionary
    const dict = {}
    for (const w of data.words || []) {
      dict[w.name] = w.note || ''
    }
    setNoteDict(dict)

    const tagD = {}
    for (const w of data.words || []) {
      tagD[w.name] = w.tags || []
    }
    setTagDict(tagD)

    const existingTagsList = parseExistingTags(data)
    setExistingTags(existingTagsList)
  }

  useEffect(() => {
    noteDictRef.current = noteDict
  }, [noteDict])

  useEffect(() => {
    if (!getToken()) return

    getData()
      .then(gotData)
      .catch(err => {
        if (err.message === 'unauthorized') {
          setShowLogin(true)
        } else {
          console.error(err)
        }
      })
  }, [])

  useEffect(() => {
    if (!showBanner && isAuthenticated && graphRef.current && initialPayload) {
      graphRef.current.applyPayload(initialPayload)
      setInitialPayload(null) // prevent future re-invocations
    }
  }, [showBanner, isAuthenticated, graphRef.current])

  const handleLogin = async (username, password) => {
    try {
      await login(username, password)
      setShowLogin(false)
      setLoginError(false)

      const data = await getData()
      gotData(data)
    } catch (err) {
      if (err.message === 'unauthorized') {
        setLoginError(true)
      } else {
        console.error(err)
      }
    }
  }

  const handleDataRequest = async data => {
    if (data.mode === "add-data") {
      const createdData = await createData(data)
      graphRef.current?.applyPayload(createdData); 
    } else if (data.mode === "remove-data") {
      const removedData = await removeData(data)
      graphRef.current?.applyPayload(removedData); 
    }
  }

  /* ─── Word click from Graph → show modal ─── */
  const handleWordClick = (name) => {
    if (!settingsRef.current.showNoteOnClick) return 
    const existingNote = noteDictRef.current[name] || ''
    setNoteModal({ open:true, name, note: existingNote })
  }

  /* ─── persist note change ─── */
  const handleNoteUpdate = async (newNote, tags) => {
    try {
      const updatedData = await updateNote({ 
        wordname: noteModal.name, 
        note: newNote,
        tags: tags
      })
      setNoteDict(prev => {
        const newDict = { ...prev, [noteModal.name]: updatedData.note }
        noteDictRef.current = newDict 
        return newDict
      })
      setTagDict(prev => {
        const newDict = { ...prev, [noteModal.name]: tags }
        tagDictRef.current = newDict
        return newDict
      })
      setExistingTags(prev => {
        const tagSet = new Set(prev)
        for (const tag of tags) tagSet.add(tag)
        return Array.from(tagSet)
      })
    } finally {
      setNoteModal({ open:false, name:'', note:'' })
    }
  }

  const handleSearch = async (term) => {
    if (!term?.trim()) return
    
    // 1) local search
    if (graphRef.current?.hasWord(term)) {
      graphRef.current.focusOnWord(term, {suppressClickCallback: true})
      return
    }
    
    // 2) server search
    const data = await searchWord(term.trim())
    replaceGraphData(data, term)
  }

  const handleOpenSearchTags=()=>setSearchTagsModal({open:true,results:[]})

  const handleTagSearch=async(selectedTags)=>{
    if(!selectedTags.length)return
    const data=await searchByTags(selectedTags)
    setSearchTagsModal({open:true,results:data.words||[]})
  }

  const handleWordFromTag=(word)=>{
    handleSearch(word)        // reuse the existing word‑search flow
  }

  return (
      <div style={{ width: '100vw', height: '100vh' }}>
        {showLogin && <LoginModal onLogin={handleLogin} error={loginError} />}
        {!showLogin && (
          <>
            <LeftNav 
              onModalOpen={()=>{setModalOpen(true)}}
              onModalClose={()=>{setModalOpen(false)}}
              onDataRequest={handleDataRequest} 
              username={username} 
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onSearchRequest={()=>{ setSearchModalOpen(true)}}
              onSearchTagsRequest={handleOpenSearchTags}
            />
            <Canvas camera={{ position: [0, 0, 50], fov: 60 }} style={{ background: 'lightblue' }}>
              <ambientLight />
              <pointLight position={[10, 10, 10]} />
              {showBanner && username && (
                <WelcomeBanner
                username={username}
                onDone={() => setShowBanner(false)}
                />
              )}
              {isAuthenticated && !showBanner && 
                <Graph 
                  ref={graphRef} 
                  orbitControlsRef={controlsRef}
                  onWordClick={handleWordClick}
                  pauseInteraction={noteModal.open || searchModalOpen || modalOpen || searchTagsModal.open }
                />
              }
              <OrbitControls ref={controlsRef}/>
            </Canvas>

            <WordModal
              open={noteModal.open}
              initialNote={noteModal.note}
              initialTags={tagDict[noteModal.name] || []}
              existingTags={existingTags}
              onClose={() => setNoteModal({ open:false, name:'', note:'' })}
              onUpdate={handleNoteUpdate}
              debounceMs={600} 
              name={noteModal.name}
            />
            <SearchModal
              open={searchModalOpen}
              onSearch={(term)=>{handleSearch(term)}}
              onClose={()=>setSearchModalOpen(false)}
            />
            <SearchTagsModal
              open={searchTagsModal.open}
              existingTags={existingTags}
              results={searchTagsModal.results}
              onSearch={handleTagSearch}
              onWordClick={handleWordFromTag}
              onClose={()=>setSearchTagsModal({open:false,results:[]})}
            />
          </>
        )}
      </div>
  )
}

export default App
