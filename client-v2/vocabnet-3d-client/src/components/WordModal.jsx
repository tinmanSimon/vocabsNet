import { useState, useEffect, useRef } from 'react'
import './DataModal.css'

export default function WordModal({
  open,
  initialNote = '',
  onClose,
  onUpdate,
  debounceMs = 800,
}) {
  const [note, setNote] = useState(initialNote)
  const [history, setHistory] = useState([initialNote])
  const [idx, setIdx] = useState(0)

  const debounceRef = useRef(null)
  const isUndoRedoRef = useRef(false)

  // reset on open or word change
  useEffect(() => {
    setNote(initialNote)
    setHistory([initialNote])
    setIdx(0)
  }, [initialNote, open])

  // debounced history recording
  useEffect(() => {
    if (!open || isUndoRedoRef.current) return

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(() => {
      setHistory(prev => {
        const current = note
        const capped = prev.slice(0, idx + 1)
        if (current !== capped[capped.length - 1]) {
          capped.push(current)
          setIdx(capped.length - 1)
        }
        return capped
      })
    }, debounceMs)

    return () => clearTimeout(debounceRef.current)
  }, [note, debounceMs, idx, open])

  const handleKeyDown = e => {
    if (e.ctrlKey && e.key.toLowerCase() === 'z') {
      e.preventDefault()
      isUndoRedoRef.current = true

      if (e.shiftKey) {
        // redo
        if (idx < history.length - 1) {
          const next = idx + 1
          setNote(history[next])
          setIdx(next)
        }
      } else {
        // undo
        if (idx > 0) {
          const prev = idx - 1
          setNote(history[prev])
          setIdx(prev)
        }
      }

      // release the lock on the next tick
      setTimeout(() => {
        isUndoRedoRef.current = false
      }, 0)
    }
  }

  if (!open) return null

  return (
    <div className="adm-backdrop" onClick={onClose}>
      <div className="adm-modal" onClick={e => e.stopPropagation()}>
        <textarea
          className="wm-textarea"
          value={note}
          onChange={e => setNote(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write your note here…"
        />
        <div className="adm-actions">
          <button type="button" className="btn-submit" onClick={() => onUpdate(note)}>
            Update
          </button>
          <button type="button" className="btn-cancel" onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
