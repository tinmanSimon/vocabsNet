import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import TagInput from './TagInput'
import './WordModal.css'
import './DataModal.css'
import ModalScaffold from './ModalScaffold'
import noteIcon from '../assets/note.png';

const WordModal = forwardRef(function WordModal(props, ref) {
  const {
    open,
    initialNote = '',
    onClose,
    onUpdate,
    initialTags = [],
    existingTags = [],
    debounceMs = 800,
    name = 'Word Note',
    onCollapse,
    zIndexCount, 
    setZIndexCount
  } = props

  /* ───────────────── note + history (unchanged) ───────────────── */
  const [note, setNote] = useState('')
  const [history, setHistory] = useState([initialNote])
  const [idx, setIdx] = useState(0)
  const debounceRef = useRef(null)
  const undoRedoRef = useRef(false)
  const wordRef = useRef()
  const [ready, setReady] = useState(false)

  useImperativeHandle(ref, () => ({
    expand: (params) => wordRef.current?.expand?.(params),
    isCollapsed: () => wordRef.current?.isCollapsed?.(),
    setTargetPosition: (pos) => {
      wordRef.current?.setTargetPosition(pos)
    },
    collapse: () =>{wordRef.current?.collapse?.()}
  }))

  useEffect(() => {
    if (open) {
      setNote(initialNote)
      setHistory([initialNote])
      setIdx(0)
      setTags(initialTags)
      setReady(true)
    } else {
      setReady(false)
      setNote('')
      setTags([])
      setHistory([])
      setIdx(0)
    }
  }, [open, name])

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

  const [tags, setTags] = useState(initialTags)

  return (
    <ModalScaffold
      ref={wordRef}
      title={name}
      className="wm-box"
      onClose={onClose}
      onSubmit={() => onUpdate(note, tags)}
      visible={open && ready}
      collapseOnClose={true}
      initialism = { <img
        src={noteIcon}
        alt="icon"
        className="header-icon-img"
      />}
      minWidth={330}
      minHeight={330}
      initialPos={{ x: 200, y: 80 }}
      initialSize={{ width: 330, height: 330 }}
      onCollapse={onCollapse}
      zIndexCount={zIndexCount}
      setZIndexCount={setZIndexCount}
    >
      {/* ── BODY that can scroll ──  */}
      <div className="wm-body">
        <TagInput value={tags}
            onChange={setTags}
            existingTags={existingTags}/>
        <textarea
          className="wm-textarea"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write your note here…"
        />
      </div>
    </ModalScaffold>
  )
})

export default WordModal
