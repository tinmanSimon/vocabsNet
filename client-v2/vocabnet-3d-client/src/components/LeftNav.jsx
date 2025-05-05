import { useRef, useState } from 'react'
import './LeftNav.css'

export default function LeftNav() {
  const [open, setOpen] = useState(false)
  const [pos, setPos]   = useState(() => {
    const saved = sessionStorage.getItem('_leftnav_pos')
    return saved ? JSON.parse(saved) : { x: 16, y: 16 }
  })

  /** ---------- Drag logic -------------- */
  const startRef = useRef(null)

  const onMouseDown = e => {
    startRef.current = { x: e.clientX, y: e.clientY, pos }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  const onMove = e => {
    const { x, y, pos: p } = startRef.current
    setPos({ x: p.x + e.clientX - x, y: p.y + e.clientY - y })
  }

  const onUp = e => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)

    const moved =
      Math.hypot(
        e.clientX - startRef.current.x,
        e.clientY - startRef.current.y
      ) > 3

    sessionStorage.setItem('_leftnav_pos', JSON.stringify(pos))
    if (!moved) setOpen(o => !o)     // treat as click only if not dragged
  }

  /** ---------- Menu items -------------- */
  const items = [
    { label: 'Add Data',    onClick: () => console.log('add') },
    { label: 'Remove Data', onClick: () => console.log('remove') },
    { label: 'Settings',    onClick: () => console.log('settings') },
    { label: 'Collapse',    onClick: () => setOpen(false) }   // last item
  ]

  return (
    <div
      className={`ln-container ${open ? 'open' : ''}`}
      style={{ left: pos.x, top: pos.y }}
      onMouseDown={onMouseDown}
    >
      <div className="ln-toggle">{/* just a wrapper for animation */}</div>

      <ul className="ln-menu">
        {items.map((it, i) => (
          <li
            key={it.label}
            style={{ transitionDelay: `${open ? i * 80 : 0}ms` }}
            onClick={it.onClick}
          >
            {it.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
