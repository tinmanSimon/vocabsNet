import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import './WordModal.css'
import './DataModal.css'
import ModalScaffold from './ModalScaffold'
import searchIcon from '../assets/search.png';

const SearchModal = forwardRef(function SearchModal(props, ref) {
  const { open, onSearch, onClose, onCollapse, zIndexCount, setZIndexCount} = props

  /* clear field each time modal opens */
  const [term, setTerm] = useState('')
  const searchRef = useRef()
  useEffect(() => { if (open) setTerm('') }, [open])

  useImperativeHandle(ref, () => ({
    expand: (params) => searchRef.current?.expand?.(params),
    isCollapsed: () => searchRef.current?.isCollapsed?.(),
    setTargetPosition: (pos) => {
      searchRef.current?.setTargetPosition(pos)
    }
  }))

  const getInitSize = () => {
    return { width: 320, height: 160 }
  }

  const getModalInitPos = () => {
    const { width, height } = getInitSize()
    const centerX = Math.floor(window.innerWidth / 2 - width / 2) 
    const centerY = Math.floor(window.innerHeight / 2 - height / 2) 
    return {
      x: Math.min(centerX, 200),
      y: Math.min(centerY, 80),
    }
  }

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
        src={searchIcon}
        alt="icon"
        className="header-icon-img"
      />}
      visible={open}
      minWidth={320}
      minHeight={160}
      initialPos={getModalInitPos()}
      initialSize={getInitSize()}
      onCollapse={onCollapse}
      zIndexCount={zIndexCount}
      setZIndexCount={setZIndexCount}
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
