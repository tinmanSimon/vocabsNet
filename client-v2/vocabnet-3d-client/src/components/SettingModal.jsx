import { useState, useEffect } from 'react'
import './DataModal.css'
import "./ModalScaffold.css"

export default function SettingModal({ open, onClose, settings, onUpdate }) {
  const [local, setLocal] = useState(settings)

  useEffect(() => {
    setLocal(settings)
  }, [settings, open])

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target
    const newValue = type === 'checkbox' ? checked : parseInt(value, 10) || 0
    setLocal(prev => ({ ...prev, [name]: newValue }))
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
            name="showNoteOnClick"
            checked={local.showNoteOnClick}
            onChange={handleChange}
          />
          Show note on word click
        </label>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
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

        <div className="adm-actions">
          <button className="btn-submit" onClick={handleSubmit}>Save</button>
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
