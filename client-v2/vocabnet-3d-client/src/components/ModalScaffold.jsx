import { React, useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import useDragResize from '../hooks/useDragResize'
import './ModalScaffold.css'

const ModalScaffold = forwardRef(function ModalScaffold(props, ref) {
  const {
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
    initialSize = { width: 500, height: 300 },
    targetPosition = null
  } = props

  const [collapsed, setCollapsed] = useState(false)
  const [showContent, setShowContent] = useState(true)
  const [showHeader, setShowHeader] = useState(true)
  const [lastCollapse, setLastCollapse] = useState(false)
  const [targetPos, setTargetPos] = useState(null)
  const collapsedRef = useRef(collapsed)
  useEffect(() => {
    collapsedRef.current = collapsed
  }, [collapsed])

  const expand = () => {
    setCollapsed(false)
    setShowContent(false)
    setShowHeader(false)
    setTimeout(() => {setShowContent(true)}, 800) 
    setTimeout(() => {setShowHeader(true)}, 500) 
  }

  useImperativeHandle(ref, () => ({
    expand,
    isCollapsed: () => collapsedRef.current
  }))

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
    pos, size, startDrag, startResize, setPos, resizing
  } = useDragResize({ minWidth, minHeight, initialPos, initialSize, onClick: onHeaderClick })
  const interacting = resizing
  const posRef   = useRef(pos)
  const rAFRef   = useRef()
  useEffect(() => { posRef.current = pos }, [pos])

  useEffect(() => {
    if (!targetPos) return
    const speed = 0.03            // fraction of the remaining distance / frame
    const tick  = () => {
      const { x, y } = posRef.current
      const dx = targetPos.x - x
      const dy = targetPos.y - y
      const dist = Math.hypot(dx, dy)
      if (dist < 1.0) {             // snap when close enough
        setPos(targetPos)
        return
      }
      const delta_x = Math.min(dx * speed, 2.0)
      const delta_y = Math.min(dy * speed, 2.0)
      setPos({ x: x + delta_x, y: y + delta_y })
      rAFRef.current = requestAnimationFrame(tick)
    }
    rAFRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rAFRef.current)
  }, [targetPos])

  const handleClose = () => {
    if (collapseOnClose && collapsedRef.current === false) {
      setCollapsed(true)
      setLastCollapse(true)
      setTargetPos({ x: targetPosition.x, y: targetPosition.y })
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
        ${!collapsed ? 'header-lock-height' : ''}`} 
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
})

export default ModalScaffold
