import { useRef, useState } from 'react'
import './LeftNav.css'
import DataModal from './DataModal'

export default function LeftNav({ onDataRequest, username }) {
  const [open, setOpen] = useState(false)
  const [launchedMenuItem, setLaunchedMenuItem] = useState("")
  const [pos, setPos] = useState(() => {
    return { x: 32, y: 32 }
  })

  const MODALS = {
    "add-data": <DataModal username={username} open mode="add-data" onSubmit={onDataRequest} onClose={() => setLaunchedMenuItem('')} />,
    "remove-data": <DataModal username={username} open mode="remove-data" onSubmit={onDataRequest} onClose={() => setLaunchedMenuItem('')} />,
  }
  
  function renderLaunchedModal() {
    return MODALS[launchedMenuItem] || null
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
      if (!moved) setOpen(true)
    }
  }

  /* ----- menu items ----- */
  const items = [
    { label: 'Add Data',    onClick: () => setLaunchedMenuItem("add-data") },
    { label: 'Remove Data', onClick: () => setLaunchedMenuItem("remove-data") },
    { label: 'Settings',    onClick: () => console.log('settings') },
    { label: 'Search',    onClick: () => console.log('search') },
    { label: 'Collapse',    onClick: () => setOpen(false) }
  ]

  /* compute expanded height: header 40 px + items*48 px */
  const expandedH = 40 + items.length * 48

  return (
    <div
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
      {renderLaunchedModal()}
    </div>
  )
}
