import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import './WordModal.css'
import './DataModal.css'
import ModalScaffold from './ModalScaffold'

const SearchModal = forwardRef(function SearchModal(props, ref) {
  const { open, onSearch, onClose } = props

  /* clear field each time modal opens */
  const [term, setTerm] = useState('')
  const searchRef = useRef()
  useEffect(() => { if (open) setTerm('') }, [open])

  useImperativeHandle(ref, () => ({
    expand: () => searchRef.current?.expand?.(),
    isCollapsed: () => searchRef.current?.isCollapsed?.()
  }))

  return (
    <ModalScaffold
      ref={searchRef}
      title="Search Word"
      className="wm-box"
      onClose={onClose}
      onSubmit={() => {onSearch(term); setTerm('')}}
      submitButtonText = "Search"
      collapseOnClose={true}
      initialism = { <img
        src="src/assets/search.png"
        alt="icon"
        className="header-icon-img"
      />}
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
})

export default SearchModal
