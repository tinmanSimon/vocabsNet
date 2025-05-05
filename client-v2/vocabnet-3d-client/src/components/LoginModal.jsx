// components/LoginModal.jsx
import { useState } from 'react'

function LoginModal({ onLogin, error }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    onLogin(username, password)
  }

  return (
    <div style={{
      position: 'absolute', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10
    }}>
      <form onSubmit={handleSubmit} style={{ backgroundColor: 'white', padding: 20, borderRadius: 8 }}>
        <h3>Login</h3>
        <div>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            style={{ marginBottom: 10, width: '100%' }}
          />
        </div>
        <div>
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ marginBottom: 10, width: '100%' }}
          />
        </div>
        {error && <div style={{ color: 'red', marginBottom: 10 }}>Login failed. Try again.</div>}
        <button type="submit" style={{ width: '100%' }}>Login</button>
      </form>
    </div>
  )
}

export default LoginModal
