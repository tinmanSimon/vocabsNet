import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { Flipper, Flipped } from 'react-flip-toolkit'
import './WordModal.css'
import './DataModal.css'

const TAG_COLOURS = [
  "#d32f2f", "#c62828", "#b71c1c", "#ad1457", "#880e4f",
  "#6a1b9a", "#4a148c", "#4527a0", "#311b92", "#283593",
  "#1a237e", "#1565c0", "#0d47a1", "#1976d2", "#1e88e5",
  "#2196f3", "#1565c0", "#0277bd", "#01579b", "#00838f",
  "#006064", "#00897b", "#004d40", "#00695c", "#2e7d32",
  "#1b5e20", "#33691e", "#558b2f", "#689f38", "#7cb342",
  "#827717", "#9e9d24", "#afb42b", "#f9a825", "#f57f17",
  "#ef6c00", "#e65100", "#d84315", "#bf360c", "#6d4c41",
  "#4e342e", "#3e2723", "#5d4037", "#263238", "#37474f",
  "#455a64", "#546e7a", "#607d8b", "#78909c", "#90a4ae",
  "#8e24aa", "#7b1fa2", "#6a1b9a", "#5e35b1", "#512da8",
  "#4527a0", "#3949ab", "#303f9f", "#283593", "#1e88e5",
  "#1565c0", "#0d47a1", "#00838f", "#0097a7", "#00acc1",
  "#00bcd4", "#00897b", "#00796b", "#00695c", "#004d40",
  "#43a047", "#388e3c", "#2e7d32", "#1b5e20", "#33691e",
  "#558b2f", "#689f38", "#827717", "#9e9d24", "#afb42b",
  "#f9a825", "#f57f17", "#ef6c00", "#e65100", "#d84315",
  "#bf360c", "#a1887f", "#795548", "#6d4c41", "#5d4037",
  "#4e342e", "#3e2723", "#263238", "#212121", "#37474f",
  "#455a64", "#546e7a", "#607d8b", "#90a4ae", "#78909c"
]

const colourFor = (t) => {
  let h = 0; for (let c of t) h = c.charCodeAt(0)+((h<<5)-h)
    return TAG_COLOURS[Math.abs(h)%TAG_COLOURS.length]
}

const TagChip = ({ tag, idx, onRemove, onDragStart, onDragOver, onDrop }) => (
  <span
    className="wm-tag-chip"
    style={{ background: colourFor(tag) }}
    draggable={true}                         // ← MUST be explicitly true
    onDragStart={(e) => onDragStart(e, idx)}
    onDragOver={(e) => onDragOver(e, idx)}
    onDrop={(e) => onDrop(e, idx)}           // ← NOT just on container
  >
    {tag}
    <span className="remove" onClick={() => onRemove(idx)}>✕</span>
  </span>
)

export default function WordModal({
  open,
  initialNote = '',
  onClose,
  onUpdate,
  initialTags = ['a', 'b', 'c'],
  existingTags = ["c", "a", "b", "aaa", "aab", "aac", "aad"],
  debounceMs = 800,
  name = 'Word Note'
}) {

  /* ───────────────── position + size ───────────────── */
  const MIN_W = 320
  const MIN_H = 320

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
  const [note, setNote] = useState('')
  const [history, setHistory] = useState([initialNote])
  const [idx, setIdx] = useState(0)
  const debounceRef = useRef(null)
  const undoRedoRef = useRef(false)

  useEffect(() => {
    if (open) {
      setNote(initialNote)
      setHistory([initialNote])
      setIdx(0)
    }
  }, [open])

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

  const [tags,setTags]     = useState(initialTags)
  const [tagIn,setTagIn]   = useState('')
  const [hover,setHover]   = useState(-1)
  const dragFrom = useRef(null)

  useEffect(() => {
    if (open) {
      setTags(initialTags)
      setTagIn('')
      setHover(-1)
    }
  }, [open])
  
  const addTag = useCallback((t)=>{
    t=t.trim(); if(!t||tags.includes(t))return
    setTags(p=>[...p,t]); setTagIn(''); setHover(-1)
  },[tags])
  
  const suggestions = tagIn
    ? existingTags.filter(t=>t.toLowerCase().includes(tagIn.toLowerCase()))
    .filter(t=>!tags.includes(t)).slice(0,8)
    : []

  const tagKey = (e)=>{
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHover(i => Math.min(i + 1, suggestions.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHover(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      hover > -1 ? addTag(suggestions[hover]) : addTag(tagIn)
    } else if (e.key === 'Backspace' && tagIn === '' && tags.length > 0) {
      e.preventDefault()
      setTags(prev => prev.slice(0, -1))
    } else {
      if (hover !== -1) setHover(-1)
    }
  }
  
  const rm=(i)=>setTags(p=>p.filter((_,j)=>j!==i))

  const dragS = (e, i) => {
    console.log('dragStart', i)
    dragFrom.current = i
  }

  const dragO = (e, idx) => {
    e.preventDefault()
  
    const from = dragFrom.current
    const to = idx
  
    if (from === null || from === to) return
  
    setTags(prev => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  
    dragFrom.current = to
  }

  const dragE = () => {
    console.log('drop complete')
    dragFrom.current = null
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
        <Flipper flipKey={tags.join(',')}>
          <div className="wm-tag-area">
            {tags.map((t, i) => (
              <Flipped key={t} flipId={t}>
                <div>
                  <TagChip
                    key={`${t}-${i}`}
                    tag={t}
                    idx={i}
                    onRemove={rm}
                    onDragStart={dragS}
                    onDragOver={dragO}
                    onDrop={dragE}
                  />
                </div>
              </Flipped>
            ))}
            <input
              className="wm-tag-input"
              value={tagIn}
              onChange={e => { setTagIn(e.target.value); setHover(-1) }}
              onKeyDown={tagKey}
              placeholder="add tag…"
            />

            {suggestions.length > 0 && (
              <div className="wm-suggest-list">
                {suggestions.map((s, i) => (
                  <div
                    key={s}
                    className={'wm-suggest-item' + (i === hover ? ' hover' : '')}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(-1)}
                    onMouseDown={e => { e.preventDefault(); addTag(s) }}
                  >
                    {s}
                  </div>
                ))}
              </div>
            )}
          </div>
        </Flipper>
        <div className="adm-actions">
          <button className="btn-submit"
            onClick={() => onUpdate ? onUpdate(note,tags) : null}>
              Update
          </button>
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
