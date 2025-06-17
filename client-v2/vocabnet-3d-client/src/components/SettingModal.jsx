import { useState, useEffect, useImperativeHandle, useRef, forwardRef } from 'react'
import './DataModal.css'
import './ModalScaffold.css'
import ModalScaffold from './ModalScaffold'
import settingsIcon from '../assets/settings.png';

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
    scaffoldRef.current?.collapse?.()
  }

  const getInitSize = () => {
    return { width: 360, height: 220 }
  }

  const getModalInitPos = () => {
    const { width, height } = getInitSize()
    const centerX = Math.floor(window.innerWidth / 2 - width / 2) 
    const centerY = Math.floor(window.innerHeight / 2 - height / 2) 
    return {
      x: Math.min(centerX, 200),
      y: Math.min(centerY, 80),
    }
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
      initialism={<img src={settingsIcon} alt="settings" className="header-icon-img" />}
      minWidth={360}
      minHeight={220}
      initialPos={getModalInitPos()}
      initialSize={getInitSize()}
      onCollapse={onCollapse}
      zIndexCount={zIndexCount}
      setZIndexCount={setZIndexCount}
    >
      <div
        className="dm-content"
        style={{
          display: 'flex',          // flex container
          flexDirection: 'column',  // stack the two labels
          justifyContent: 'center', // vertical-center inside the box
          gap: '12px',
          margin: '20px 20px'          // space on both left & right
        }}
      >

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          Show note on word click
          <input
            type="checkbox"
            name="showNoteOnClick"
            checked={local.showNoteOnClick}
            onChange={handleChange}
          />
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          Graph Size:
          <input
            type="number"
            name="graph_size"
            value={String(local.graph_size ?? 0)}
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
