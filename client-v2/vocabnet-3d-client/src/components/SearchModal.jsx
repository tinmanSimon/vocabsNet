import { useState, useRef, useEffect } from 'react'
import './WordModal.css'
import './DataModal.css'

export default function SearchModal({ open, onSearch, onClose }) {
  /* ───── size / position ───── */
  const MIN_W = 320
  const MIN_H = 260
  const [pos,  setPos]  = useState({ x: 120, y: 120 })
  const [size, setSize] = useState({ width: 420, height: 200 })

  /* clear field each time modal opens */
  const [term, setTerm] = useState('')
  useEffect(() => { if (open) setTerm('') }, [open])

  /* ─── drag whole window ─── */
  const dragRef = useRef(null)
  const startDrag = (e) => {
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y }
    window.addEventListener('mousemove', moveDrag)
    window.addEventListener('mouseup', endDrag)
  }
  const moveDrag = (e) => {
    const { sx, sy, ox, oy } = dragRef.current
    setPos({ x: ox + e.clientX - sx, y: oy + e.clientY - sy })
  }
  const endDrag = () => {
    window.removeEventListener('mousemove', moveDrag)
    window.removeEventListener('mouseup', endDrag)
  }

  /* ─── resize from any edge / corner ─── */
  const startResize = (e, dir) => {
    e.preventDefault(); e.stopPropagation()
    const { clientX: sx, clientY: sy } = e
    const { width: sw, height: sh }   = size
    const { x: sl, y: st }            = pos

    const onMove = (e) => {
        let dx = e.clientX - sx, dy = e.clientY - sy
        let w = sw, h = sh, nx = sl, ny = st

        if (dir.includes('e')) w = Math.max(MIN_W, sw + dx)
        if (dir.includes('s')) h = Math.max(MIN_H, sh + dy)
        if (dir.includes('w')) {
            let desiredW = sw - dx
            if (desiredW < MIN_W) {
                desiredW = MIN_W
                dx = sw - MIN_W   // clamp dx to prevent jump-back later
            }
            w = desiredW
            nx = sl + dx
        }
        if (dir.includes('n')) {
            let desiredH = sh - dy
            if (desiredH < MIN_H) {
              desiredH = MIN_H
              dy = sh - MIN_H
            }
            h = desiredH
            ny = st + dy
        }
        setSize({ width: w, height: h })
        setPos({ x: nx, y: ny })
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  if (!open) return null

  return (
    <div
      className="wm-box"
      style={{ left: pos.x, top: pos.y, width: size.width, height: size.height }}
    >
      {/* header */}
      <div className="wm-header" onMouseDown={startDrag}>Search Word</div>

      {/* content */}
      <div className="wm-content" style={{ justifyContent: 'center' }}>
        <input
          className="wm-input"
          value={term}
          placeholder="Enter word…"
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSearch(term) }}
        />
        <div className="adm-actions">
            <button 
                className="btn-submit" 
                onClick={() => {
                    onSearch(term)
                    setTerm('')
                }}
            >
                Search
            </button>
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>

      {/* resize handles */}
      {['n','e','s','w','ne','se','sw','nw'].map(dir => (
        <div
          key={dir}
          className={`wm-resize-handle wm-${dir}`}
          onMouseDown={(e) => startResize(e, dir)}
        />
      ))}
    </div>
  )
}
