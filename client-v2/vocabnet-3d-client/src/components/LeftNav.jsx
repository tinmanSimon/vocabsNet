import { useRef, useState } from 'react'
import './LeftNav.css'
import DataModal from './DataModal'
import SettingModal from './SettingModal'
import SearchModal  from './SearchModal'

export default function LeftNav({ 
  onModalOpen,
  onModalClose,
  onDataRequest, 
  username, 
  settings, 
  onUpdateSettings,
  onSearchRequest,
  onSearchTagsRequest
}) {
  const [open, setOpen] = useState(false)
  const [launchedMenuItem, setLaunchedMenuItem] = useState("")
  const [pos, setPos] = useState(() => {
    return { x: 32, y: 32 }
  })

  const modalClose = ()=>{
    onModalClose()
    setLaunchedMenuItem('')
  }

  const MODALS = {
    "add-data": <DataModal username={username} open mode="add-data" onSubmit={onDataRequest} onClose={modalClose} />,
    "remove-data": <DataModal username={username} open mode="remove-data" onSubmit={onDataRequest} onClose={modalClose} />,
    "settings": <SettingModal open settings={settings} onUpdate={onUpdateSettings} onClose={modalClose} />,
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
    { label: 'Add Data',    onClick: () => {onModalOpen();setLaunchedMenuItem("add-data")}},
    { label: 'Remove Data', onClick: () => {onModalOpen();setLaunchedMenuItem("remove-data")}},
    { label: 'Settings',    onClick: () => {onModalOpen();setLaunchedMenuItem("settings")}},
    { label: 'Search Word', onClick: () => onSearchRequest() },
    { label: 'Search Tags', onClick: () => onSearchTagsRequest() },
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
