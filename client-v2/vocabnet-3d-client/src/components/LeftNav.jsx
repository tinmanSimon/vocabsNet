import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import './LeftNav.css'
import './WordModal.css'
import './DataModal.css'

const LeftNav = forwardRef(function LeftNav(props, ref) {
  const { 
    handleLeftnavClick,
    onCollapse
  } = props

  const leftnavRef = useRef()
  const [open, setOpen] = useState(false)
  const openRef = useRef(open)
  const [targetPos, setTargetPos] = useState({x : 32, y : 32})
  const targetPosRef = useRef(targetPos)
  const [enableMoveToTarget, setEnableMoveToTarget] = useState(false)
  const enableMoveToTargetRef = useRef(enableMoveToTarget)
  const [pos, setPos] = useState({ x: 32, y: 32})
  const [lastExpandPos, setLastExpandPos] = useState(null)
  const lastExpandRef = useRef(lastExpandPos)
  const rAFRef   = useRef()
  const posRef   = useRef(pos)
  useEffect(() => { 
    posRef.current = pos 
    if (leftnavRef.current) {
      leftnavRef.current.style.transform =`translate3d(${pos.x}px, ${pos.y}px, 0)`;
    }
  }, [pos])
  useEffect(() => {
    lastExpandRef.current = lastExpandPos
  }, [lastExpandPos])

  useImperativeHandle(ref, () => ({
    isCollapsed: () => !open,
    setTargetPosition: (pos) => {
      if (openRef.current && enableMoveToTargetRef.current) {
        setTargetPos({x : pos.x, y : pos.y})
        targetPosRef.current = pos
      }
    },
    enableModalMove: (enable) =>{
      setEnableMoveToTarget(enable)
      enableMoveToTargetRef.current = enable
    }
  }))

  const dragRef = useRef(null)

  const getPoint = (e) => {
    if (e.touches?.length)       return e.touches[0]
    if (e.changedTouches?.length) return e.changedTouches[0]
    return e 
  }

  const lockPageScroll = () => {
    document.body.style.overscrollBehavior = 'contain'; // blocks pull-to-refresh
    document.body.style.touchAction        = 'none';    // blocks pan/zoom
  };

  const unlockPageScroll = () => {
    document.body.style.overscrollBehavior = '';
    document.body.style.touchAction        = '';
  };

  const startDrag = e => {
    lockPageScroll()
    const isTouchStart = e.type === 'touchstart'
    if (!isTouchStart) e.preventDefault();
    const { clientX, clientY } = getPoint(e)
    dragRef.current = { x: clientX, y: clientY, origin: pos }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove',   onMove, { passive:false })
    window.addEventListener('touchend',    onUp)
    window.addEventListener('touchcancel', onUp)
  }
  const onMove = e => {
    e.preventDefault()
    const { x, y, origin } = dragRef.current
    const { clientX, clientY } = getPoint(e)
    setPos({ x: origin.x + clientX - x, y: origin.y + clientY - y })
  }
  const onUp = e => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
    window.removeEventListener('touchmove',   onMove)
    window.removeEventListener('touchend',    onUp)
    window.removeEventListener('touchcancel', onUp)
    unlockPageScroll()

    if (!open) {
      const { clientX, clientY } = getPoint(e)
      const moved = Math.hypot(
        clientX - dragRef.current.x,
        clientY - dragRef.current.y
      ) > 3
      const targetDist = Math.hypot(
        clientX - targetPosRef.current.x,
        clientY - targetPosRef.current.y
      )
      if (!moved) {
        setOpen(true)
        openRef.current = open
        if (lastExpandRef.current && enableMoveToTargetRef.current) {
          setTargetPos({ x: lastExpandRef.current.x, y: lastExpandRef.current.y })
          targetPosRef.current = lastExpandRef.current
        }
      }
      else {
        if (targetDist < 400 && enableMoveToTargetRef.current)
          setTargetPos({x : targetPosRef.current.x, y : targetPosRef.current.y})
      }
    }
  }

  useEffect(() => {
    if (!targetPosRef.current) return
    let lastTime = null

    const tick = (time) => {
      if (lastTime === null) lastTime = time
      const dt = (time - lastTime) / 1000 
      lastTime = time

      const { x, y } = posRef.current
      const dx = targetPosRef.current.x - x
      const dy = targetPosRef.current.y - y
      const dist = Math.hypot(dx, dy)

      if (dist < 1.0) {
        setPos(targetPosRef.current)
        return
      }

      const speed = 400 
      const unit_x = dx / dist
      const unit_y = dy / dist

      let delta = speed * dt
      if (delta > dist) delta = dist

      const delta_x = unit_x * delta
      const delta_y = unit_y * delta

      posRef.current = { x: x + delta_x, y: y + delta_y }
      if ((delta_x*delta_x + delta_y*delta_y) > .16 && leftnavRef.current) {
        leftnavRef.current.style.transform = `translate3d(${posRef.current.x}px, ${posRef.current.y}px, 0)`
      }
      if (dist - delta < 1.0) {
        setPos(targetPosRef.current)
        cancelAnimationFrame(rAFRef.current)
        rAFRef.current = null  
        return
      }
      rAFRef.current = requestAnimationFrame(tick)
    }
    rAFRef.current = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(rAFRef.current)
      rAFRef.current = null  
    }
  }, [targetPos])

  /* ----- menu items ----- */
  const items = [
    { label: 'Add Data',    onClick: () => { handleLeftnavClick('add-data')}},
    { label: 'Remove Data', onClick: () => { handleLeftnavClick('remove-data')}},
    { label: 'Settings',    onClick: () => { handleLeftnavClick('settings')}},
    { label: 'Search Word', onClick: () => { handleLeftnavClick('search-word')}},
    { label: 'Search Tags', onClick: () => { handleLeftnavClick('search-tags')}},
    { label: 'Collapse',    onClick: () => {
      setOpen(false)
      openRef.current = open
      onCollapse?.()
      setLastExpandPos(pos)
      lastExpandRef.current = pos
    }}
  ]

  /* compute expanded height: header 40 px + items*48 px */
  const expandedH = 40 + items.length * 48

  return (
    <div
      ref={leftnavRef}
      className={`ln-box ${open ? 'open' : ''}`}
      style={{
        left: 0,
        top: 0,
        transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
        width: open ? 160 : 40,
        height: open ? expandedH : 40,
        willChange: 'transform'
      }}
    >
      {/* single drag / click handle */}
      <div
        className="ln-handle"
        onMouseDown={startDrag}
        onTouchStart={startDrag}
      >
        {!open && '☰'}
        {open && 'Menu'}
      </div>

      {/* list appears only when open */}
      {open && (
        <ul className="ln-menu">
          {items.map((it, i) => (
            <li
              key={it.label}
              onClick={it.onClick}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              {it.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
})

export default LeftNav

