import { useEffect, useState, useRef, createContext} from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Graph from './Graph'
import LoginModal from './components/LoginModal'
import { login, getData, createData, removeData, updateNote } from './api/api'
import ModalsMatrix from './components/ModalsMatrix';
import { getToken } from './utils/request'
import LeftNav from './components/LeftNav'
import WelcomeBanner from "./components/WelcomeBanner"
import WordModal from './components/WordModal'
import SearchModal from './components/SearchModal'
import SearchTagsModal from './components/SearchTagsModal'
import DataModal from './components/DataModal'
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
    return cached ? JSON.parse(cached) : { showNoteOnClick: false }
  })
  const [openAddDataModal, setOpenAddDataModal] = useState(false)
  const [openRemoveDataModal, setOpenRemoveDataModal] = useState(false)
  const addDataRef = useRef()
  const removeDataRef = useRef()
  const searchRef = useRef()
  const wordRef = useRef()
  const searchTagsRef = useRef()
  const [searchModalOpen, setSearchModalOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const settingsRef = useRef(settings)
  const graphRef = useRef(null);
  const controlsRef = useRef()
  const noteDictRef = useRef(noteDict)
  const [tagDict, setTagDict] = useState({})
  const tagDictRef = useRef(tagDict)
  const [existingTags, setExistingTags] = useState([])
  const [existingEdges, setExistingEdges] = useState([])
  const [searchTagsModal,setSearchTagsModal]=useState({open:false,results:[]})
  const matrixRef = useRef(null);
  const leftnavRef = useRef(null);
  const [zIndexCount, setZIndexCount] = useState(0) 

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

  const parseExistingEdges = (data) => {
    if (!data || !data.edges_meta) return [];
  
    return Object.entries(data.edges_meta)
      .sort((a, b) => b[1] - a[1])  
      .map(([edge, _count]) => edge); 
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

    const existingEdgesList = parseExistingEdges(data)
    setExistingEdges(existingEdgesList)
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
      setExistingEdges(prev => {
        const edgeSet = new Set(prev)
        for (const edge of createdData.edges) edgeSet.add(edge.edge_name)
        return Array.from(edgeSet)
      })
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
    setZIndexCount(prev => prev + 1)
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
      wordRef.current?.collapse()
    }
  }

  const handleSearch = async (term) => {
    if (!term?.trim()) return
    
    // 1) local search
    if (graphRef.current?.hasWord(term)) {
      graphRef.current.focusOnWord(term, {suppressClickCallback: true})
      const existingNote = noteDictRef.current[term.trim()] || ''
      setNoteModal({ open:noteModal.open, name:term.trim(), note: existingNote })
      return
    }
    
    // 2) server search
    const data = await searchWord(term.trim())
    replaceGraphData(data, term)
    const existingNote = noteDictRef.current[term.trim()] || ''
    setNoteModal({ open:noteModal.open, name:term.trim(), note: existingNote })
  }

  const handleTagSearch=async(selectedTags)=>{
    if(!selectedTags.length)return
    const data=await searchByTags(selectedTags)
    setSearchTagsModal({open:true,results:data.words||[]})
  }

  const handleWordFromTag=(wordname)=>{
    handleSearch(wordname)        // reuse the existing word‑search flow
  }

  const handleLeftnavClick = (menu_id) => {
    let alreadyExpanded = false
    switch (menu_id) {
      case 'add-data':
        alreadyExpanded = openAddDataModal
        if (!openAddDataModal) {
          setOpenAddDataModal(true)
        }
        addDataRef.current?.expand({alreadyExpanded: alreadyExpanded})
        break
    
      case 'remove-data':
        alreadyExpanded = openRemoveDataModal
        if (!openRemoveDataModal) {
          setOpenRemoveDataModal(true)
        }
        removeDataRef.current?.expand({alreadyExpanded: alreadyExpanded})
        break
    
      case 'search-word':
        alreadyExpanded = searchModalOpen
        if (!searchModalOpen) {
          setSearchModalOpen(true)
        }
        searchRef.current?.expand({alreadyExpanded: alreadyExpanded})
        break

      case 'search-tags':
        alreadyExpanded = searchTagsModal.open
        if (!searchTagsModal.open) {
          setSearchTagsModal({open:true,results:[]})
        }
        searchTagsRef.current?.expand({alreadyExpanded: alreadyExpanded})
        break
    
      default:
        break
    }
  }

  useEffect(() => {
    if (matrixRef.current && leftnavRef.current) {
      matrixRef.current.observeModal(leftnavRef);
    }
  }, []);

  return (
      <div style={{ width: '100vw', height: '100vh' }}>
        {showLogin && <LoginModal onLogin={handleLogin} error={loginError} />}
        {!showLogin && (
          <>
            <LeftNav 
              ref={leftnavRef}
              onModalOpen={()=>{setModalOpen(true)}}
              onModalClose={()=>{setModalOpen(false)}}
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              handleLeftnavClick={handleLeftnavClick}
              onCollapse={() => {
                matrixRef.current?.observeModal(leftnavRef);
              }}
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
                  pauseInteraction={noteModal.open || searchModalOpen || modalOpen || searchTagsModal.open || openAddDataModal || openRemoveDataModal}
                />
              }
              <OrbitControls ref={controlsRef}/>
            </Canvas>

            <WordModal
              ref={wordRef}
              open={noteModal.open}
              initialNote={noteModal.note}
              initialTags={tagDict[noteModal.name] || []}
              existingTags={existingTags}
              onClose={() => {
                setNoteModal({ open:false, name:'', note:'' })
                matrixRef.current?.unObserveModal(wordRef)
              }}
              onUpdate={handleNoteUpdate}
              debounceMs={600} 
              name={noteModal.name}
              onCollapse={() => {
                matrixRef.current?.observeModal(wordRef);
              }}
              zIndexCount={zIndexCount}
              setZIndexCount={setZIndexCount}
            />
            <SearchModal
              ref={searchRef}
              open={searchModalOpen}
              onSearch={(term)=>{handleSearch(term)}}
              onClose={()=>{
                setSearchModalOpen(false)
                matrixRef.current?.unObserveModal(searchRef)
              }}
              onCollapse={() => {
                matrixRef.current?.observeModal(searchRef);
              }}
              zIndexCount={zIndexCount}
              setZIndexCount={setZIndexCount}
            />
            <SearchTagsModal
              ref={searchTagsRef}
              open={searchTagsModal.open}
              existingTags={existingTags}
              results={searchTagsModal.results}
              onSearch={handleTagSearch}
              onWordClick={handleWordFromTag}
              onClose={()=>{
                setSearchTagsModal({open:false,results:[]})
                matrixRef.current?.unObserveModal(searchTagsRef)
              }}
              onCollapse={() => {
                matrixRef.current?.observeModal(searchTagsRef);
              }}
              zIndexCount={zIndexCount}
              setZIndexCount={setZIndexCount}
            />
            <DataModal 
              username={username} 
              open={openAddDataModal}
              mode={'add-data'}
              onSubmit={handleDataRequest} 
              onClose={()=>{
                setOpenAddDataModal(false)
                matrixRef.current?.unObserveModal(addDataRef)
              }} 
              existingEdges={existingEdges}
              ref={addDataRef}
              onCollapse={() => {
                matrixRef.current?.observeModal(addDataRef);
              }}
              zIndexCount={zIndexCount}
              setZIndexCount={setZIndexCount}
            />

            <DataModal 
              username={username} 
              open={openRemoveDataModal}
              mode={"remove-data"}
              onSubmit={handleDataRequest} 
              onClose={()=>{
                setOpenRemoveDataModal(false)
                matrixRef.current?.unObserveModal(removeDataRef)
              }} 
              existingEdges={existingEdges}
              ref={removeDataRef}
              onCollapse={() => {
                matrixRef.current?.observeModal(removeDataRef);
              }}
              zIndexCount={zIndexCount}
              setZIndexCount={setZIndexCount}
            />
            
            <ModalsMatrix ref={matrixRef}/>
          </>
        )}
      </div>
  )
}

export default App
