import { useEffect, useState, useRef, createContext} from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Graph from './Graph'
import LoginModal from './components/LoginModal'
import { login, getData, createData } from './api/api'
import { CREATE_DATA_SUCCEED, CREATE_DATA_PARTIAL, CREATE_DATA_FAILED } from './api/api'
import { getToken } from './utils/request'
import LeftNav from './components/LeftNav'
import WelcomeBanner from "./components/WelcomeBanner"

function App() {
  const [showLogin, setShowLogin] = useState(!getToken())
  const [loginError, setLoginError] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [username, setUsername] = useState(null)
  const [showBanner, setShowBanner] = useState(false)
  const graphRef = useRef(null);

  const gotData = (data) => {
    const uname = data.user.username
    setUsername(uname)
    setShowBanner(true)
    setIsAuthenticated(true)

    console.log("gotData data: ", data)
  }

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
    console.log('Data request payload', data)
    if (data.mode === "add-data") {
      const createdData = await createData(data)
      graphRef.current?.applyPayload(createdData); 
    }
  }


  return (
      <div style={{ width: '100vw', height: '100vh' }}>
        {showLogin && <LoginModal onLogin={handleLogin} error={loginError} />}
        {!showLogin && (
          <>
            <LeftNav onDataRequest={handleDataRequest} username={username} />
            <Canvas camera={{ position: [0, 0, 50], fov: 60 }} style={{ background: 'lightblue' }}>
              <ambientLight />
              <pointLight position={[10, 10, 10]} />
              {showBanner && username && (
                <WelcomeBanner
                username={username}
                onDone={() => setShowBanner(false)}
                />
              )}
              {isAuthenticated && !showBanner && <Graph ref={graphRef}/>}
              <OrbitControls />
            </Canvas>
          </>
        )}
      </div>
  )
}

export default App
