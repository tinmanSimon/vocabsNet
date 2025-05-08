import { useState, useEffect, useRef } from 'react'
import './WordModal.css'
import './DataModal.css'

export default function WordModal({
  open,
  initialNote = '',
  onClose,
  onUpdate,
  debounceMs = 800,
  name = 'Word Note'
}) {
  /* ───────────────── position + size ───────────────── */
  const MIN_W = 320
  const MIN_H = 260

  const [pos, setPos]   = useState({ x: 200, y: 80 })
  const [size, setSize] = useState({ width: 520, height: 340 })

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
      let dx = e.clientX - sx
      let dy = e.clientY - sy
      let w  = sw, h = sh, nx = sl, ny = st

      if (dir.includes('e')) w = Math.max(MIN_W, sw + dx)
      if (dir.includes('s')) h = Math.max(MIN_H, sh + dy)
      if (dir.includes('w')) {
        w  = Math.max(MIN_W, sw - dx)
        nx = sl + (sw - w)             // move left edge with cursor
      }
      if (dir.includes('n')) {
        h  = Math.max(MIN_H, sh - dy)
        ny = st + (sh - h)             // move top edge with cursor
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

  /* ───────────────── note + history (unchanged) ───────────────── */
  const [note, setNote] = useState(initialNote)
  const [history, setHistory] = useState([initialNote])
  const [idx, setIdx] = useState(0)
  const debounceRef = useRef(null)
  const undoRedoRef = useRef(false)

  useEffect(() => {
    setNote(initialNote)
    setHistory([initialNote])
    setIdx(0)
  }, [initialNote, open])

  useEffect(() => {
    if (!open || undoRedoRef.current) return
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(() => {
      setHistory(prev => {
        const snap = note
        const arr  = prev.slice(0, idx + 1)
        if (snap !== arr[arr.length - 1]) {
          arr.push(snap)
          setIdx(arr.length - 1)
        }
        return arr
      })
    }, debounceMs)

    return () => clearTimeout(debounceRef.current)
  }, [note, debounceMs, idx, open])

  const handleKeyDown = (e) => {
    if (!e.ctrlKey || e.key.toLowerCase() !== 'z') return
    e.preventDefault()
    undoRedoRef.current = true

    if (e.shiftKey && idx < history.length - 1) {
      setIdx(i => i + 1); setNote(history[idx + 1])
    } else if (!e.shiftKey && idx > 0) {
      setIdx(i => i - 1); setNote(history[idx - 1])
    }
    setTimeout(() => { undoRedoRef.current = false }, 0)
  }

  if (!open) return null

  return (
    <div
      className="wm-box"
      style={{ left: pos.x, top: pos.y, width: size.width, height: size.height }}
    >
      {/* header (drag handle) */}
      <div className="wm-header" onMouseDown={startDrag}>{name}</div>

      {/* content area flexes; textarea grows with box */}
      <div className="wm-content">
        <textarea
          className="wm-textarea"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write your note here…"
        />
        <div className="adm-actions">
          <button className="btn-submit" onClick={() => onUpdate(note)}>Update</button>
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>

      {/* eight resize handles */}
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
