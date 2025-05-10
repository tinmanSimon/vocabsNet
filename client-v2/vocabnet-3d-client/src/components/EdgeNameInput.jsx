import { useState, useRef } from 'react'
import './WordModal.css'      // ← re‑use .wm‑suggest‑list / item styles
import './DataModal.css' 

export default function EdgeNameInput({ value, onChange, existingEdges }) {
  const [hover,   setHover]   = useState(-1)
  const [focused, setFocused] = useState(false)
  const itemRefs              = useRef([])

  const filtered = existingEdges
    .filter(e => {
      const lower = value.toLowerCase()
      return e.toLowerCase().includes(lower) && e.toLowerCase() !== lower
    })

  /* keyboard nav identical to TagInput */
  const key = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHover(h => {
        const nxt = Math.min(h + 1, filtered.length - 1)
        setTimeout(() => itemRefs.current[nxt]?.scrollIntoView({block:'nearest'}), 0)
        return nxt
      })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHover(h => {
        const nxt = Math.max(h - 1, 0)
        setTimeout(() => itemRefs.current[nxt]?.scrollIntoView({block:'nearest'}), 0)
        return nxt
      })
    } else if (e.key === 'Enter') {
      if (hover > -1) {                       // choose highlighted suggestion
        e.preventDefault()
        onChange(filtered[hover])
        setHover(-1)
      }
    } else if (hover !== -1) {
      setHover(-1)
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
        onKeyDown={key}
        onFocus={() => setFocused(true)}
        onBlur ={() => setTimeout(() => setFocused(false), 100)}
      />

      {focused && filtered.length > 0 && (
        <div className="wm-suggest-list">
          {filtered.map((s,i) => (
            <div
              key={s}
              ref={el => itemRefs.current[i]=el}
              className={'wm-suggest-item'+(i===hover?' hover':'')}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(-1)}
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
