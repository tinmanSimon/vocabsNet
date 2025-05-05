import { useState } from 'react'
import './AddDataModal.css'

export default function AddDataModal({ open, onClose, onAdd }) {
  if (!open) return null

  const [words, setWords] = useState('')
  const [edges, setEdges] = useState('')

  const handleSubmit = e => {
    e.preventDefault()
    onAdd({ words, edges })
    onClose()
  }

  return (
    <div className="adm-backdrop" onClick={onClose}>
      <form className="adm-modal" onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3>Add Data</h3>

        <label>Words (comma‑separated)</label>
        <textarea
          value={words}
          onChange={e => setWords(e.target.value)}
          placeholder="word1, word2, word3"
        />

        <label>Edges (JSON or CSV)</label>
        <textarea
          value={edges}
          onChange={e => setEdges(e.target.value)}
          placeholder='e.g. [{"from":"word1","to":"word2"}]'
        />

        <div className="adm-actions">
          <button type="submit">Add Data</button>
          <button type="button" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  )
}
