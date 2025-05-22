// src/components/ModalsMatrix.jsx
import { useRef, useState, forwardRef, useImperativeHandle } from 'react'

/**
 * A draggable 3 × 3 matrix (each cell 60 × 60 px) that exposes
 * its current {x, y} position in real‑time.
 *
 * Grid lines fade in when two or more modals are observed and
 * continuously interpolate their stroke between #bef0ff → #0093cb → #bef0ff
 * over a 5 s cycle using a native SVG <animate> element.
 */
const ModalsMatrix = forwardRef(({ onPositionChange }, ref) => {
  /* ——— state & refs ——— */
  const [pos, setPos] = useState({ x: 22, y: 22 })
  const posRef = useRef(pos)
  const dragInfo = useRef({ dragging: false, offsetX: 0, offsetY: 0 })
  const observed = useRef([])
  const [visible, setVisible] = useState(false)

  const enableModalMove = () => {
    if (observed.current.length === 1) {
      observed.current[0].current?.enableModalMove?.(false)
    } else if (observed.current.length > 1) {
      const centres = getCellCenters()
      observed.current[0].current?.enableModalMove?.(true)
      observed.current[0].current?.setTargetPosition?.(centres[0])
    }
  }

  useImperativeHandle(ref, () => ({
    getPos: () => pos,

    observeModal(modalRef) {
      if (!modalRef?.current) return
      if (!observed.current.find(o => o === modalRef)) observed.current.push(modalRef)
      if (observed.current.length >= 2) {
        setVisible(true)
        enableModalMove()
      }
      const index = observed.current.indexOf(modalRef)
      const centres = getCellCenters()
      modalRef.current.setTargetPosition?.(centres[index])
    },

    unObserveModal(modalRef) {
      if (!modalRef?.current) return
      const index = observed.current.indexOf(modalRef)
      if (index !== -1) {
        observed.current.splice(index, 1)
        if (observed.current.length < 2) {
          setVisible(false)
          enableModalMove()
        }
        // realign remaining collapsed modals
        const centres = getCellCenters()
        observed.current.forEach((ref, idx) => {
          const api = ref.current
          if (api?.isCollapsed?.()) api.setTargetPosition?.(centres[idx])
        })
      }
    }
  }), [pos])

  /* ——— drag handlers ——— */
  const handleMouseDown = e => {
    dragInfo.current = {
      dragging: true,
      offsetX: e.clientX - pos.x,
      offsetY: e.clientY - pos.y
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const handleMouseMove = e => {
    if (!dragInfo.current.dragging) return
    const newPos = {
      x: e.clientX - dragInfo.current.offsetX,
      y: e.clientY - dragInfo.current.offsetY
    }
    setPos(newPos)
    posRef.current = newPos
    onPositionChange?.(newPos)
  }

  const handleMouseUp = () => {
    dragInfo.current.dragging = false
    window.removeEventListener('mousemove', handleMouseMove)
    window.removeEventListener('mouseup', handleMouseUp)

    const centres = getCellCenters()
    observed.current.forEach((ref, idx) => {
      const api = ref.current
      if (api?.isCollapsed?.()) api.setTargetPosition?.(centres[idx])
    })
  }

  function getCellCenters() {
    const cell = 60
    const out = []
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        out.push({
          x: posRef.current.x + c * cell + cell / 2 - 20,
          y: posRef.current.y + r * cell + cell / 2 - 20
        })
      }
    }
    return out
  }

  const animationValues = [
    "#0f0c29;#302b63;#4a47a3;#00b4d8;#1fb6ff;#00b4d8;#4a47a3;#302b63;#0f0c29",
    "#1a102e;#2b1240;#3d155d;#5a2080;#8741b3;#5a2080;#3d155d;#2b1240;#1a102e"
  ]
  const animDuration = "60s"

  /* ——— render ——— */
  return (
    <div
      style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        width: 180,
        height: 180,
        userSelect: 'none',
        zIndex: 0,
        pointerEvents: 'none'
      }}
    >
      <svg
        width={180}
        height={180}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        {/* vertical lines */}
        {[1, 2].map(i => (
          <line
            key={`v${i}`}
            x1={60 * i}
            y1={0}
            x2={60 * i}
            y2={180}
            strokeWidth={6}
            style={{
              pointerEvents: 'stroke',
              cursor: visible ? 'move' : 'auto',
              opacity: visible ? 1 : 0,
              transition: 'opacity 1.5s ease-in-out'
            }}
            onMouseDown={handleMouseDown}
          >
            {/* animate stroke colour every 5s */}
            <animate
              attributeName="stroke"
              values={animationValues[i - 1]}
              dur={animDuration}
              repeatCount="indefinite"
            />
          </line>
        ))}
        {/* horizontal lines */}
        {[1, 2].map(i => (
          <line
            key={`h${i}`}
            x1={0}
            y1={60 * i}
            x2={180}
            y2={60 * i}
            strokeWidth={6}
            style={{
              pointerEvents: 'stroke',
              cursor: visible ? 'move' : 'auto',
              opacity: visible ? 1 : 0,
              transition: 'opacity 1.5s ease-in-out'
            }}
            onMouseDown={handleMouseDown}
          >
            <animate
              attributeName="stroke"
              values={animationValues[i - 1]}
              dur={animDuration}
              repeatCount="indefinite"
            />
          </line>
        ))}
      </svg>
    </div>
  )
})

export default ModalsMatrix
