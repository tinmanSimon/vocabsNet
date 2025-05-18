// src/hooks/useDragResize.js
import { useEffect, useRef, useState, useCallback } from 'react'

export default function useDragResize({
  minWidth  = 320,
  minHeight = 200,
  initialPos  = { x: 180, y: 100 },
  initialSize = { width: minWidth, height: minHeight }
} = {}) {
  /* ───────── state ───────── */
  const [pos,  setPos]  = useState(initialPos)
  const [size, setSize] = useState(initialSize)

  /* ───────── dragging ─────── */
  const dragRef = useRef(null)

  const startDrag = useCallback((e) => {
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y }
    window.addEventListener('mousemove', moveDrag)
    window.addEventListener('mouseup',   endDrag)
  }, [pos])

  const moveDrag = useCallback((e) => {
    const { sx, sy, ox, oy } = dragRef.current
    setPos({ x: ox + e.clientX - sx, y: oy + e.clientY - sy })
  }, [])

  const endDrag = useCallback(() => {
    window.removeEventListener('mousemove', moveDrag)
    window.removeEventListener('mouseup',   endDrag)
  }, [moveDrag])

  /* ───────── resizing ─────── */
  const startResize = useCallback((e, dir) => {
    e.preventDefault(); e.stopPropagation()

    const { clientX: sx, clientY: sy } = e
    const { width: sw, height: sh }    = size
    const { x: sl,   y: st }           = pos

    const onMove = (e) => {
      let dx = e.clientX - sx, dy = e.clientY - sy
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
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup',   onUp)
  }, [pos, size, minWidth, minHeight])

  /* ───────── cleanup on unmount ─────── */
  useEffect(() => () => {
    endDrag()      // removes any listeners that might still be attached
  }, [endDrag])

  return { pos, size, startDrag, startResize }
}
