import React from 'react'
import useDragResize from '../hooks/useDragResize'
import './ModalScaffold.css'

export default function ModalScaffold({
  children,
  title = '',
  className = '',
  onSubmit,
  onClose,
  visible,
  minWidth = 300,
  minHeight = 200,
  submitButtonText = "Update",
  initialPos = { x: 200, y: 100 },
  initialSize = { width: 500, height: 300 }
}) {
  const {
    pos, size, startDrag, startResize
  } = useDragResize({ minWidth, minHeight, initialPos, initialSize })

  if (!visible) return null
  return (
    <div
      className={`modal-frame ${className}`}
      style={{
        left: pos.x,
        top: pos.y,
        width: size.width,
        height: size.height,
        position: 'fixed'
      }}
    >
      <div className="modal-header" onMouseDown={startDrag}>
        {title}
      </div>

      <div className="modal-body">
        {children}
      </div>

      <div className="modal-footer">
        <button className="btn-submit" onClick={onSubmit}>{submitButtonText}</button>
        <button className="btn-cancel" onClick={onClose}>Cancel</button>
      </div>

      {/* Resize handles */}
      {['n', 'e', 's', 'w', 'ne', 'se', 'sw', 'nw'].map(dir => (
        <div
          key={dir}
          className={`resize-handle resize-handle-${dir}`}
          onMouseDown={(e) => startResize(e, dir)}
        />
      ))}
    </div>
  )
}
