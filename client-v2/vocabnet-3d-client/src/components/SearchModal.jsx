import { useState, useRef, useEffect } from 'react'
import './WordModal.css'
import './DataModal.css'
import ModalScaffold from './ModalScaffold'

export default function SearchModal({ open, onSearch, onClose }) {
  /* clear field each time modal opens */
  const [term, setTerm] = useState('')
  useEffect(() => { if (open) setTerm('') }, [open])

  return (
    <ModalScaffold
      title="Search Word"
      className="wm-box"
      onClose={onClose}
      onSubmit={() => {onSearch(term); setTerm('')}}
      submitButtonText = "Search"
      visible={open}
      minWidth={320}
      minHeight={160}
      initialPos={{ x: 200, y: 80 }}
      initialSize={{ width: 320, height: 160 }}
    >
      <div className="wm-content" style={{ justifyContent: 'center' }}>
        <input
          className="wm-input"
          value={term}
          placeholder="Enter word…"
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSearch(term) }}
        />
      </div>
    </ModalScaffold>
  )
}
