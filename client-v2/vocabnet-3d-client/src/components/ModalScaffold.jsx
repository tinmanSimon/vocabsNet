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
  initialPos = { x: 200, y: 100 },
  initialSize = { width: 500, height: 300 }
}) {

  const [collapsed, setCollapsed] = useState(false)
  const [showContent, setShowContent] = useState(true)
  const [restoring, setRestoring] = useState(false)
  const collapsedRef = useRef(collapsed)
  useEffect(() => {
    collapsedRef.current = collapsed
  }, [collapsed])

  const expand = () => {
    setCollapsed(false)
  }
  const onHeaderClick = ()=>{ if (collapsedRef.current) expand() }

  const {
    pos, size, startDrag, startResize
  } = useDragResize({ minWidth, minHeight, initialPos, initialSize, onClick: onHeaderClick })
  
  const handleClose = () => {
    if (collapseOnClose) {
      setCollapsed(true)
    } else {
      onClose?.()
    }
  }

  if (!visible) return null
  return (
    <div
      className={`modal-frame ${className} ${collapsed ? 'collapsed' : ''}`}
      style={{
        left: pos.x,
        top: pos.y,
        width: size.width,
        height: size.height,
        position: 'fixed'
      }}
    >
      <div className="modal-header" onMouseDown={startDrag}>
        {!collapsed && title}
        {collapsed && 'C'}
      </div>

        {!collapsed && (
          <>
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
          </>
        )}
    </div>
  )
}
