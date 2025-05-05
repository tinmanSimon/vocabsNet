import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Graph from './Graph'
import LoginModal from './components/LoginModal'
import { login, getData } from './api/api'
import { getToken } from './utils/request'
import LeftNav from './components/LeftNav'

function App() {
  const [showLogin, setShowLogin] = useState(!getToken())
  const [loginError, setLoginError] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    if (!getToken()) return

    getData()
      .then(() => setIsAuthenticated(true))
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

      // optionally fetch data here
      const data = await getData()
      setIsAuthenticated(true)
    } catch (err) {
      if (err.message === 'unauthorized') {
        setLoginError(true)
      } else {
        console.error(err)
      }
    }
  }

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      {showLogin && <LoginModal onLogin={handleLogin} error={loginError} />}
      {!showLogin && (
        <>
          <LeftNav />
          <Canvas camera={{ position: [0, 0, 50], fov: 60 }} style={{ background: 'lightblue' }}>
            <ambientLight />
            <pointLight position={[10, 10, 10]} />
            {isAuthenticated && <Graph />}
            <OrbitControls />
          </Canvas>
        </>
      )}
    </div>
  )
}

export default App
