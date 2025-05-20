import { React, useState, useRef, useEffect } from 'react'
import useDragResize from '../hooks/useDragResize'
import './ModalScaffold.css'

export default function ModalScaffold({
  children,
  title = '',
  className = '',
  onSubmit,
  onClose,
  visible,
  collapseOnClose = false,
  minWidth = 300,
  minHeight = 200,
  submitButtonText = "Update",
  initialism='B',
  initialPos = { x: 200, y: 100 },
  initialSize = { width: 500, height: 300 }
}) {

  const [collapsed, setCollapsed] = useState(false)
  const [showContent, setShowContent] = useState(true)
  const [showHeader, setShowHeader] = useState(true)
  const [lastCollapse, setLastCollapse] = useState(false)
  const collapsedRef = useRef(collapsed)
  useEffect(() => {
    collapsedRef.current = collapsed
  }, [collapsed])

  const expand = () => {
    setCollapsed(false)
    setShowContent(false)
    setShowHeader(false)
    setTimeout(() => {
      setShowContent(true)
    }, 1200) 
    setTimeout(() => {
      setShowHeader(true)
    }, 500) 
  }

  const onHeaderClick = (e) => {
    if (collapsedRef.current) {
      if (e.target.closest('.remove')) {
        // click was on ✕ button — skip expansion
        return
      }
      expand()
    }
  }

  const {
    pos, size, startDrag, startResize, resizing
  } = useDragResize({ minWidth, minHeight, initialPos, initialSize, onClick: onHeaderClick })
  const interacting = resizing

  const handleClose = () => {
    if (collapseOnClose && collapsedRef.current === false) {
      setCollapsed(true)
      setLastCollapse(true)
    } else {
      onClose?.()
      setCollapsed(false)
      setLastCollapse(false)
    }
  }

  if (!visible) return null
  return (
    <div
      className={`modal-frame ${className} 
        ${collapsed ? 'collapsed' : ''}
        ${interacting ? 'no-transition' : ''}`}
      style={{
        left: pos.x,
        top: pos.y,
        width: size.width,
        height: size.height,
        position: 'fixed'
      }}
    >
      <div className={`modal-header
        ${!collapsed && !showContent ? 'header-lock-height' : ''}`} 
        onMouseDown={startDrag}
      >
        { showHeader &&
          <span className={collapsed ? 'fade-out' : 'fade-in'}>
            {title}
          </span>
        }

        {lastCollapse && 
          <div className="header-container">
            <span className={`header-icon ${collapsed ? 'fade-in' : 'fade-out'}`}>
              {initialism}
            </span>
            <span className={`remove ${collapsed ? 'fade-in' : 'fade-out'}`} onClick={handleClose}>✕</span>
          </div>
        }
      </div>

      {!collapsed && showContent && (
        <div className="modal-content-fade fade-in">
          <div className="modal-body">
            {children}
          </div>

          <div className="modal-footer">
            <button className="btn-submit" onClick={onSubmit}>{submitButtonText}</button>
            <button className="btn-cancel" onClick={handleClose}>Cancel</button>
          </div>

          {['n', 'e', 's', 'w', 'ne', 'se', 'sw', 'nw'].map(dir => (
            <div
              key={dir}
              className={`resize-handle resize-handle-${dir}`}
              onMouseDown={(e) => startResize(e, dir)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
