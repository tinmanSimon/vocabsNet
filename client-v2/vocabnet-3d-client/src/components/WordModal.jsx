import { useState, useEffect, useRef } from 'react'
import './WordModal.css'       // new styles
import './DataModal.css'       // reuse button/textarea rules

export default function WordModal({
  open,
  initialNote = '',
  onClose,
  onUpdate,
  debounceMs = 800,
}) {
  /* ---------- position & drag ---------- */
  const [pos, setPos] = useState({ x: 200, y: 80 })
  const dragRef = useRef(null)

  const startDrag = e => {
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }
  const onMove = e => {
    const { sx, sy, ox, oy } = dragRef.current
    setPos({ x: ox + e.clientX - sx, y: oy + e.clientY - sy })
  }
  const onUp = () => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }

  /* ---------- note + history logic (unchanged) ---------- */
  const [note, setNote] = useState(initialNote)
  const [history, setHistory] = useState([initialNote])
  const [idx, setIdx] = useState(0)
  const debounceRef   = useRef(null)
  const isUndoRedoRef = useRef(false)

  useEffect(() => {               // reset when word changes
    setNote(initialNote)
    setHistory([initialNote])
    setIdx(0)
  }, [initialNote, open])

  useEffect(() => {               // debounced push
    if (!open || isUndoRedoRef.current) return
    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(() => {
      setHistory(prev => {
        const sn = note
        const h  = prev.slice(0, idx + 1)
        if (sn !== h[h.length - 1]) {
          h.push(sn)
          setIdx(h.length - 1)
        }
        return h
      })
    }, debounceMs)

    return () => clearTimeout(debounceRef.current)
  }, [note, debounceMs, idx, open])

  const handleKeyDown = e => {
    if (e.ctrlKey && e.key.toLowerCase() === 'z') {
      e.preventDefault()
      isUndoRedoRef.current = true

      if (e.shiftKey) {
        if (idx < history.length - 1) {
          setIdx(i => i + 1)
          setNote(history[idx + 1])
        }
      } else if (idx > 0) {
        setIdx(i => i - 1)
        setNote(history[idx - 1])
      }
      setTimeout(() => { isUndoRedoRef.current = false }, 0)
    }
  }

  if (!open) return null

  return (
    <div
      className="wm-box"
      style={{ left: pos.x, top: pos.y }}
    >
      <div className="wm-header" onMouseDown={startDrag}>
        Word Note
      </div>

      <textarea
        className="wm-textarea"
        value={note}
        onChange={e => setNote(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Write your note here…"
      />

      <div className="adm-actions">
        <button
          type="button"
          className="btn-submit"
          onClick={() => onUpdate(note)}
        >
          Update
        </button>
        <button
          type="button"
          className="btn-cancel"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
