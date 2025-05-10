import { useState, useEffect, useRef } from 'react'
import './WordModal.css'            // re‑use draggable / resizable styles
import './DataModal.css'            // keep existing field/layout styles

export default function DataModal({ open, username, mode, onClose, onSubmit }) {
  /* ────────────────────────────────────────────────────────────
     Geometry (drag / resize) — identical behaviour to SearchModal
  ──────────────────────────────────────────────────────────── */
  const MIN_W = 560
  const MIN_H = 240
  const [pos,  setPos]  = useState({ x: 160, y: 80 })
  const [size, setSize] = useState({ width: 600, height: 420 })

  /* ─── drag whole window ─── */
  const dragRef = useRef(null)
  const startDrag = (e) => {
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y }
    window.addEventListener('mousemove', moveDrag)
    window.addEventListener('mouseup',  endDrag)
  }
  const moveDrag = (e) => {
    const { sx, sy, ox, oy } = dragRef.current
    setPos({ x: ox + e.clientX - sx, y: oy + e.clientY - sy })
  }
  const endDrag = () => {
    window.removeEventListener('mousemove', moveDrag)
    window.removeEventListener('mouseup',  endDrag)
  }

  /* ─── resize from edges / corners ─── */
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
        if (desiredW < MIN_W) { desiredW = MIN_W; dx = sw - MIN_W }
        w  = desiredW
        nx = sl + dx
      }
      if (dir.includes('n')) {
        let desiredH = sh - dy
        if (desiredH < MIN_H) { desiredH = MIN_H; dy = sh - MIN_H }
        h  = desiredH
        ny = st + dy
      }

      setSize({ width: w, height: h })
      setPos({ x: nx,    y: ny })
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
  }

  /* ────────────────────────────────────────────────────────────
     Form state (copied from original DataModal)
  ──────────────────────────────────────────────────────────── */
  const [words, setWords] = useState([])
  const [edges, setEdges] = useState([])
  const [ready, setReady] = useState(false)

  const initWordsEdges = ()=>{
    setWords([''])
    setEdges([{ edge_name: '', from_name: '', to_name: '', double_edge: false }])
  }

  /* clear rows each time the modal opens so we always start fresh */
  useEffect(() => { 
    if (open) { 
      initWordsEdges()
      setReady(true)
    } else {
      setReady(false)
    }
  }, [open])

  const isAdd        = mode === 'add-data'
  const wordLabel    = isAdd ? 'Add Word'    : 'Remove Word'
  const edgeLabel    = isAdd ? 'Add Edge'    : 'Remove Edge'
  const actionLabel  = isAdd ? 'Add Data'    : 'Remove Data'

  /* — helpers to mutate arrays immutably — */
  const updateWord = (i, val) =>
    setWords(w => w.map((v, idx) => (idx === i ? val : v)))

  const updateEdge = (i, field, val) =>
    setEdges(e => e.map((edge, idx) => idx === i ? { ...edge, [field]: val } : edge))

  /* — add‑row buttons — */
  const addWordRow = () => setWords(w => [...w, ''])
  const addEdgeRow = () =>
    setEdges(e => [...e, { edge_name: '', from_name: '', to_name: '', double_edge: false }])

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      words: words.filter(w => w.trim() !== '').map(w => ({ name: w, username })),
      edges: edges.filter(ed => ed.edge_name && ed.from_name && ed.to_name)
                 .map(ed => ({ ...ed, username, double_edge: !!ed.double_edge })),
      mode,
    })
    initWordsEdges()
  }

  if (!open || !ready) return null

  /* ────────────────────────────────────────────────────────────
     Render
  ──────────────────────────────────────────────────────────── */
  return (
    <div
      className="wm-search-box"         /* same look‑and‑feel as other modals */
      style={{ left: pos.x, top: pos.y, width: size.width, height: size.height }}
    >
      {/* ── header / drag handle ── */}
      <div className="wm-header" onMouseDown={startDrag}>
        {isAdd ? 'Add Data' : 'Remove Data'}
      </div>

      {/* ── scrollable content inside a <form> ── */}
      <form className="wm-content" style={{ overflowY: 'auto', gap: 8 }} onSubmit={handleSubmit}>
        {/* toolbar */}
        <div className="adm-toolbar">
          <button type="button" onClick={addWordRow}>{wordLabel}</button>
          <button type="button" onClick={addEdgeRow}>{edgeLabel}</button>
        </div>

        <div className="adm-middle">
          {/* word inputs */}
          {words.map((w, i) => (
            <div key={`w-${i}`} className="adm-row">
              <label>Word {i + 1}</label>
              <input
                value={w}
                onChange={e => updateWord(i, e.target.value)}
                placeholder="word"
              />
            </div>
          ))}

          {/* edge inputs */}
          {edges.map((ed, i) => (
            <div key={`e-${i}`} className="adm-edge">
              <label>Edge {i + 1}</label>
              <input
                className="edge-field"
                value={ed.edge_name}
                placeholder="Edge Name"
                onChange={e => updateEdge(i, 'edge_name', e.target.value)}
              />
              <input
                className="edge-field"
                value={ed.from_name}
                placeholder="From Node"
                onChange={e => updateEdge(i, 'from_name', e.target.value)}
              />
              <input
                className="edge-field"
                value={ed.to_name}
                placeholder="To Node"
                onChange={e => updateEdge(i, 'to_name', e.target.value)}
              />
              <label className="adm-check">
                <input
                  type="checkbox"
                  checked={ed.double_edge}
                  onChange={e => updateEdge(i, 'double_edge', e.target.checked)}
                />
                Double Edge
              </label>
            </div>
          ))}
        </div>

        

        {/* actions */}
        <div className="adm-actions">
          <button type="submit" className="btn-submit">{actionLabel}</button>
          <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
        </div>
      </form>

      {/* ── resize handles ── */}
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
