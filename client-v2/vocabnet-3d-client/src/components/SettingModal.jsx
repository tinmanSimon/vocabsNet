import { useState, useEffect } from 'react'
import './DataModal.css'

export default function SettingModal({ open, onClose, settings, onUpdate }) {
  const [local, setLocal] = useState(settings)

  useEffect(() => {
    setLocal(settings)
  }, [settings, open])

  const handleChange = (e) => {
    const updated = { ...local, showNoteOnClick: e.target.checked }
    setLocal(updated)
  }

  const handleSubmit = () => {
    onUpdate(local)
    onClose()
  }

  if (!open) return null

  return (
    <div className="adm-backdrop" onClick={onClose}>
      <div className="adm-modal" onClick={(e) => e.stopPropagation()}>
        <h3>Settings</h3>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={local.showNoteOnClick}
            onChange={handleChange}
          />
          Show note on word click
        </label>

        <div className="adm-actions">
          <button className="btn-submit" onClick={handleSubmit}>Save</button>
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
