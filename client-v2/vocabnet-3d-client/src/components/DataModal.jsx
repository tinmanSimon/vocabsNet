import { useState } from 'react'
import './DataModal.css'

export default function DataModal({ open, mode = "add-data", onClose, onSubmit }) {
  if (!open) return null

  const [words, setWords] = useState([])
  const [edges, setEdges] = useState([])

  const isAdd = mode === "add-data"
  const actionLabel = isAdd ? 'Add Data' : 'Remove Data'

  /* --- helpers to mutate arrays immutably --- */
  const updateWord = (i, val) =>
    setWords(w => w.map((v, idx) => (idx === i ? val : v)))

  const updateEdge = (i, field, val) =>
    setEdges(e =>
      e.map((edge, idx) =>
        idx === i ? { ...edge, [field]: val } : edge
      )
    )

  /* --- add row buttons --- */
  const addWordRow = () => setWords(w => [...w, ''])
  const addEdgeRow = () =>
    setEdges(e => [
      ...e,
      { edge_name: '', from_name: '', to_name: '', double_edge: false }
    ])

  const handleSubmit = e => {
    e.preventDefault()
    onSubmit({
      words: words.filter(w => w.trim() !== ''),
      edges: edges
        .filter(ed => ed.edge_name && ed.from_name && ed.to_name)
        .map(ed => ({
          ...ed,
          double_edge: !!ed.double_edge
        })),
      mode: mode
    })
    onClose()
  }

  return (
    <div className="adm-backdrop" onClick={onClose}>
      <form
        className="adm-modal"
        onClick={e => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="adm-toolbar">
          <button type="button" onClick={addWordRow}>Add Word</button>
          <button type="button" onClick={addEdgeRow}>Add Edge</button>
        </div>

        {/* word inputs */}
        {words.map((w, i) => (
          <div key={`w-${i}`} className="adm-row">
            <label>Word {i + 1}</label>
            <input
              value={w}
              onChange={e => updateWord(i, e.target.value)}
              placeholder="word"
            />
          </div>
        ))}

        {/* edge inputs */}
        {edges.map((ed, i) => (
            <div key={`e-${i}`} className="adm-edge">
                <label>Edge {i + 1}</label>

                <input
                className="edge-field"
                value={ed.edge_name}
                placeholder="Edge Name"
                onChange={e => updateEdge(i, 'edge_name', e.target.value)}
                />
                <input
                className="edge-field"
                value={ed.from_name}
                placeholder="From Node"
                onChange={e => updateEdge(i, 'from_name', e.target.value)}
                />
                <input
                className="edge-field"
                value={ed.to_name}
                placeholder="To Node"
                onChange={e => updateEdge(i, 'to_name', e.target.value)}
                />
                <label className="adm-check">
                <input
                    type="checkbox"
                    checked={ed.double_edge}
                    onChange={e => updateEdge(i, 'double_edge', e.target.checked)}
                />
                Double Edge
                </label>
            </div>
        ))}

        <div className="adm-actions">
          <button type="submit" className="btn-submit">{actionLabel}</button>
          <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
        </div>
      </form>
    </div>
  )
}
