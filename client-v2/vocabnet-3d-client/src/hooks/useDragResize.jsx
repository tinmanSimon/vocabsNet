// src/hooks/useDragResize.js
import { useEffect, useRef, useState, useCallback } from 'react'

export default function useDragResize({
  minWidth  = 320,
  minHeight = 200,
  initialPos  = { x: 180, y: 100 },
  initialSize = { width: minWidth, height: minHeight },
  onClick = null,
  moveToTargetPos = null
} = {}) {
  /* ───────── state ───────── */
  const [pos,  setPos]  = useState(initialPos)
  const [size, setSize] = useState(initialSize)
  const [resizing, setResizing] = useState(false)

  /* ───────── dragging ─────── */
  const dragRef = useRef(null)

  const lockPageScroll = () => {
    document.body.style.overscrollBehavior = 'contain'; // blocks pull-to-refresh
    document.body.style.touchAction        = 'none';    // blocks pan/zoom
  };

  const unlockPageScroll = () => {
    document.body.style.overscrollBehavior = '';
    document.body.style.touchAction        = '';
  };

  const getPoint = (e) => {
    if (e.touches?.length)       return e.touches[0]
    if (e.changedTouches?.length) return e.changedTouches[0]
    return e                      // normal Mouse / Pointer event
  }

  const startDrag = useCallback((e) => {
    e.preventDefault();
    lockPageScroll();
    const { clientX, clientY } = getPoint(e)
    dragRef.current = {
      sx: clientX,
      sy: clientY,
      ox: pos.x,
      oy: pos.y,
      moved: false
    }
    window.addEventListener('mousemove', moveDrag)
    window.addEventListener('mouseup',   endDrag)
    window.addEventListener('touchmove',   moveDrag, { passive:false })
    window.addEventListener('touchend',    endDrag)
    window.addEventListener('touchcancel', endDrag)
  }, [pos])

  const moveDrag = useCallback((e) => {
    e.preventDefault();
    const ref = dragRef.current
    const { clientX, clientY } = getPoint(e)
    const dx = clientX - ref.sx
    const dy = clientY - ref.sy
    const distance = Math.sqrt(dx * dx + dy * dy)
    if (distance > 3) ref.moved = true
  
    setPos({ x: ref.ox + dx, y: ref.oy + dy })
  }, [])
  
  const endDrag = useCallback((e) => {
    window.removeEventListener('mousemove', moveDrag)
    window.removeEventListener('mouseup',   endDrag)
    window.removeEventListener('touchmove',   moveDrag)
    window.removeEventListener('touchend',    endDrag)
    window.removeEventListener('touchcancel', endDrag)
    unlockPageScroll()
  
    const ref = dragRef.current
    if (ref && !ref.moved && typeof onClick === 'function') {
      onClick(e)
    } else {
      moveToTargetPos(true)
    }
  }, [])

  /* ───────── resizing ─────── */
  const startResize = useCallback((e, dir) => {
    e.preventDefault()
    e.stopPropagation()
    setResizing(true)
    lockPageScroll()

    const { clientX: sx, clientY: sy } = getPoint(e)
    const { width: sw, height: sh }    = size
    const { x: sl,   y: st }           = pos

    const onMove = (e) => {
      const { clientX, clientY } = getPoint(e)
      let dx = clientX - sx, dy = clientY - sy
      let w  = sw, h = sh, nx = sl, ny = st

      if (dir.includes('e')) w = Math.max(minWidth,  sw + dx)
      if (dir.includes('s')) h = Math.max(minHeight, sh + dy)
      if (dir.includes('w')) {             // west → shrink from left
        w  = Math.max(minWidth,  sw - dx)
        nx = sl + (sw - w)
      }
      if (dir.includes('n')) {             // north → shrink from top
        h  = Math.max(minHeight, sh - dy)
        ny = st + (sh - h)
      }
      setSize({ width: w,  height: h  })
      setPos ({ x: nx,     y: ny })
    }

    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup',   onUp)
      window.removeEventListener('touchmove',   onMove)
      window.removeEventListener('touchend',    onUp)
      window.removeEventListener('touchcancel', onUp)
      setResizing(false)
      unlockPageScroll()
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
    window.addEventListener('touchmove',   onMove, { passive:false })
    window.addEventListener('touchend',    onUp)
    window.addEventListener('touchcancel', onUp)
  }, [pos, size, minWidth, minHeight])

  /* ───────── cleanup on unmount ─────── */
  useEffect(() => () => {
    endDrag()      // removes any listeners that might still be attached
  }, [endDrag])

  return { pos, size, startDrag, startResize, setSize, setPos, resizing }
}
