import { useState, useEffect, useImperativeHandle, useRef, forwardRef } from 'react'
import './DataModal.css'
import './ModalScaffold.css'
import ModalScaffold from './ModalScaffold'

/**
 * SettingsModal – now using the common ModalScaffold wrapper so it behaves
 * consistently with SearchModal, WordModal, etc.
 */
const SettingModal = forwardRef(function SettingModal (props, ref) {
  const {
    open,
    onClose,
    settings,
    onUpdate,
    onCollapse,            // optional – let parent know we collapsed
    zIndexCount,           // from App state – keeps stacking context consistent
    setZIndexCount         // state setter from App
  } = props

  /* ────────────────────────────────────────── state ───────────────────────────────────────── */
  const [local, setLocal] = useState(settings)
  const scaffoldRef = useRef()

  /* keep local form state in‑sync whenever modal re‑opens or settings change */
  useEffect(() => { setLocal(settings) }, [settings, open])

  /* expose the same helpers other modals provide (expand / collapse / setTargetPosition) */
  useImperativeHandle(ref, () => ({
    expand: (params) => scaffoldRef.current?.expand?.(params),
    isCollapsed: () => scaffoldRef.current?.isCollapsed?.(),
    collapse: () => scaffoldRef.current?.collapse?.(),
    setTargetPosition: (pos) => scaffoldRef.current?.setTargetPosition?.(pos)
  }))

  /* ───────────────────────────────────────── handlers ─────────────────────────────────────── */
  const handleChange = (e) => {
    const { name, type, checked, value } = e.target
    const newValue = type === 'checkbox' ? checked : parseInt(value, 10) || 0
    setLocal(prev => ({ ...prev, [name]: newValue }))
  }

  const handleSubmit = () => {
    onUpdate(local)
    onClose()
  }

  /* ────────────────────────────────────────── render ──────────────────────────────────────── */
  return (
    <ModalScaffold
      ref={scaffoldRef}
      title="Settings"
      className="dm-box"
      visible={open}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitButtonText="Save"
      collapseOnClose={true}
      initialism={<img src="src/assets/settings.png" alt="settings" className="header-icon-img" />}
      minWidth={360}
      minHeight={220}
      initialPos={{ x: 260, y: 120 }}
      initialSize={{ width: 360, height: 220 }}
      onCollapse={onCollapse}
      zIndexCount={zIndexCount}
      setZIndexCount={setZIndexCount}
    >
      <div className="dm-content" style={{ gap: '12px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            name="showNoteOnClick"
            checked={local.showNoteOnClick}
            onChange={handleChange}
          />
          Show note on word click
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          Graph Size:
          <input
            type="number"
            name="graph_size"
            value={local.graph_size ?? 0}
            onChange={handleChange}
            min={0}
            style={{ width: '80px', height: '20px' }}
          />
        </label>
      </div>
    </ModalScaffold>
  )
})

export default SettingModal
