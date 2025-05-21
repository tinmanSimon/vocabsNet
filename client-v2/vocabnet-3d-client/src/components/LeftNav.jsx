import { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react'
import './LeftNav.css'
import SettingModal from './SettingModal'

const LeftNav = forwardRef(function LeftNav(props, ref) {
  const { 
    onModalOpen,
    onModalClose,
    settings, 
    onUpdateSettings,
    handleLeftnavClick,
    onCollapse
  } = props

  const [open, setOpen] = useState(false)
  const [openSettingModal, setOpenSettingModal] = useState(false)
  const [targetPos, setTargetPos] = useState({x : 32, y : 32})
  const targetPosRef = useRef(targetPos)
  const [pos, setPos] = useState({ x: 32, y: 32})
  const [lastExpandPos, setLastExpandPos] = useState(null)
  const lastExpandRef = useRef(lastExpandPos)
  const leftnavRef = useRef()
  const rAFRef   = useRef()
  const posRef   = useRef(pos)
  useEffect(() => { posRef.current = pos }, [pos])
  useEffect(() => {
    lastExpandRef.current = lastExpandPos
  }, [lastExpandPos])

  useImperativeHandle(ref, () => ({
    isCollapsed: () => !open,
    setTargetPosition: (pos) => {
      setTargetPos({x : pos.x, y : pos.y})
      targetPosRef.current = pos
    }
  }))

  const onSettingModalClose = ()=>{
    onModalClose()
    setOpenSettingModal(false)
  }

  const dragRef = useRef(null)
  const startDrag = e => {
    dragRef.current = { x: e.clientX, y: e.clientY, origin: pos }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }
  const onMove = e => {
    const { x, y, origin } = dragRef.current
    setPos({ x: origin.x + e.clientX - x, y: origin.y + e.clientY - y })
  }
  const onUp = e => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)

    if (!open) {
      const moved = Math.hypot(
        e.clientX - dragRef.current.x,
        e.clientY - dragRef.current.y
      ) > 3
      const targetDist = Math.hypot(
        e.clientX - targetPosRef.current.x,
        e.clientY - targetPosRef.current.y
      )
      if (!moved) {
        setOpen(true)
        if (lastExpandRef.current) {
          console.log("lastExpandRef.current", lastExpandRef.current)
          setTargetPos({ x: lastExpandRef.current.x, y: lastExpandRef.current.y })
          targetPosRef.current = lastExpandRef.current
        }
      }
      else if (targetDist < 400) {
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

      setPos({ x: x + delta_x, y: y + delta_y })
      rAFRef.current = requestAnimationFrame(tick)
    }
    rAFRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rAFRef.current)
  }, [targetPos])

  /* ----- menu items ----- */
  const items = [
    { label: 'Add Data',    onClick: () => { handleLeftnavClick('add-data')}},
    { label: 'Remove Data', onClick: () => { handleLeftnavClick('remove-data')}},
    { label: 'Settings',    onClick: () => {onModalOpen();setOpenSettingModal(true);}},
    { label: 'Search Word', onClick: () => { handleLeftnavClick('search-word')}},
    { label: 'Search Tags', onClick: () => { handleLeftnavClick('search-tags')}},
    { label: 'Collapse',    onClick: () => {
      setOpen(false)
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
        left: pos.x,
        top: pos.y,
        width: open ? 160 : 40,
        height: open ? expandedH : 40
      }}
    >
      {/* single drag / click handle */}
      <div
        className="ln-handle"
        onMouseDown={startDrag}
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
      
      <SettingModal 
        open={openSettingModal}
        settings={settings} 
        onUpdate={onUpdateSettings} 
        onClose={onSettingModalClose} 
      />
    </div>
  )
})

export default LeftNav

