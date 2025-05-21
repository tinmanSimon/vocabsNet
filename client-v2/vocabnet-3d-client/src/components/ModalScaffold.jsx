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
  const [lastExpandPos, setLastExpandPos] = useState(null)
  const lastExpandRef = useRef(lastExpandPos)
  const collapsedRef = useRef(collapsed)
  useEffect(() => {
    collapsedRef.current = collapsed
  }, [collapsed])

  useEffect(() => {
    lastExpandRef.current = lastExpandPos
  }, [lastExpandPos])

  const expand = () => {
    setCollapsed(false)
    collapsedRef.current = false
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
      moveToTargetPos()
    }
  }

  const moveToTargetPos = (collapseOnly = false) => {
    if (collapseOnly && collapsedRef.current != true) return
    if (targetPosition === null) return
    const { x, y } = posRef.current
    const dist = Math.hypot(targetPosition.x - x, targetPosition.y - y)
    if (collapseOnly && dist > 400) return
    if (collapsedRef.current === true) {
      if (targetPosition) setTargetPos({ x: targetPosition.x, y: targetPosition.y })
    } else {
      if (lastExpandRef.current) 
        setTargetPos({ x: lastExpandRef.current.x, y: lastExpandRef.current.y })
    }
  }

  const {
    pos, size, startDrag, startResize, setPos, resizing
  } = useDragResize({ minWidth, minHeight, initialPos, initialSize, onClick: onHeaderClick, moveToTargetPos })
  const interacting = resizing
  const posRef   = useRef(pos)
  const rAFRef   = useRef()
  useEffect(() => { posRef.current = pos }, [pos])

  useEffect(() => {
    if (!targetPos) return
    let lastTime = null

    const tick = (time) => {
      if (lastTime === null) lastTime = time
      const dt = (time - lastTime) / 1000 
      lastTime = time

      const { x, y } = posRef.current
      const dx = targetPos.x - x
      const dy = targetPos.y - y
      const dist = Math.hypot(dx, dy)

      if (dist < 1.0) {
        setPos(targetPos)
        return
      }

      const speed = 400 
      const unit_x = dx / dist
      const unit_y = dy / dist

      let delta = speed * dt
      if (delta > dist) delta = dist

      const delta_x = unit_x * delta
      const delta_y = unit_y * delta

      setPos({ x: x + delta_x, y: y + delta_y })
      rAFRef.current = requestAnimationFrame(tick)
    }
    rAFRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rAFRef.current)
  }, [targetPos])

  const handleClose = () => {
    if (collapseOnClose && collapsedRef.current === false) {
      setCollapsed(true)
      collapsedRef.current = true
      setLastCollapse(true)
      moveToTargetPos()
      setLastExpandPos(pos)
      lastExpandRef.current = pos
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
