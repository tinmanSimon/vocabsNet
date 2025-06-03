import { useEffect, useState, useRef } from 'react'
import './WordModal.css'      // ← re‑use .wm‑suggest‑list / item styles
import './DataModal.css' 

export default function EdgeNameInput({ value, onChange, existingEdges }) {
  const [hover,   setHover]   = useState(-1)
  const [focused, setFocused] = useState(false)
  const itemRefs              = useRef([])
  const keyboardInputDelay = useRef(0)

  const filtered = existingEdges
    .filter(e => {
      const lower = value.toLowerCase()
      return e.toLowerCase().startsWith(lower) && e.toLowerCase() !== lower
    })

  useEffect(() => {
    if (filtered.length > 0 && (hover === -1 || hover >= filtered.length)) {
      setHover(0)
    }
  }, [filtered.length, hover])

  const onKeyDown = (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHover(h => {
          const nxt = Math.min(h + 1, filtered.length - 1)
          setTimeout(() => {
              keyboardInputDelay.current += 1
              setTimeout(() => {
                keyboardInputDelay.current -= 1
              }, 300)
            itemRefs.current[nxt]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
          }, 0)
          return nxt
        })
        break
  
      case 'ArrowUp':
        e.preventDefault()
        setHover(h => {
          const nxt = Math.max(h - 1, 0)
          setTimeout(() => {
            keyboardInputDelay.current += 1
            setTimeout(() => {
              keyboardInputDelay.current -= 1
            }, 300)
            itemRefs.current[nxt]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
          }, 0)
          return nxt
        })
        break
  
      case 'Enter':
        if (hover > -1) {
          e.preventDefault()
          onChange(filtered[hover])
          setHover(-1)
        }
        break
  
      default:
        break
    }
  }

  return (
    /* wrapper gives us position:relative so .wm‑suggest‑list can be width:100% */
    <div className="edge-wrapper">
      <input
        className="edge-field"
        style={{ width:'100%' }} 
        value={value}
        placeholder="Edge Name"
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => setFocused(true)}
        onBlur ={() => setTimeout(() => setFocused(false), 100)}
      />

      {focused && filtered.length > 0 && (
        <div className="wm-suggest-list">
          {filtered.map((s,i) => (
            <div
              key={s}
              ref={el => itemRefs.current[i]=el}
              className={
                'wm-suggest-item' +
                ((i === hover) ? ' hover' : '')
              }
              onMouseEnter={() => {
                if (keyboardInputDelay.current === 0) {
                  setHover(i)
                }
              }}
              onMouseDown={e => { e.preventDefault(); onChange(s) }}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
