import { useState, useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import './WordModal.css'
import './DataModal.css'
import EdgeNameInput from './EdgeNameInput'
import ModalScaffold from './ModalScaffold'

const DataModal = forwardRef(function DataModal(props, ref) {
  const { 
    open, username, mode, onClose, onSubmit, existingEdges, 
    onCollapse,zIndexCount, setZIndexCount 
  } = props
  const scaffoldRef = useRef()

  useImperativeHandle(ref, () => ({
    expand: (params) => scaffoldRef.current?.expand?.(params),
    isCollapsed: () => scaffoldRef.current?.isCollapsed?.(),
    setTargetPosition: (pos) => {
      scaffoldRef.current?.setTargetPosition(pos)
    }
  }))
  /* ────────────────────────────────────────────────────────────
     Form state (copied from original DataModal)
  ──────────────────────────────────────────────────────────── */
  const [words, setWords] = useState([])
  const [edges, setEdges] = useState([])
  const [ready, setReady] = useState(false)

  const initWordsEdges = ()=>{
    setWords([''])
    setEdges([{ edge_name: '', from_name: '', to_name: '', double_edge: false }])
  }

  /* clear rows each time the modal opens so we always start fresh */
  useEffect(() => { 
    if (open) { 
      initWordsEdges()
      setReady(true)
    } else {
      setReady(false)
    }
  }, [open])

  const isAdd        = mode === 'add-data'
  const wordLabel    = isAdd ? 'Add Word'    : 'Remove Word'
  const edgeLabel    = isAdd ? 'Add Edge'    : 'Remove Edge'
  const actionLabel  = isAdd ? 'Add Data'    : 'Remove Data'
  const initialism = isAdd ? '+' : '−'

  /* — helpers to mutate arrays immutably — */
  const updateWord = (i, val) =>
    setWords(w => w.map((v, idx) => (idx === i ? val : v)))

  const updateEdge = (i, field, val) =>
    setEdges(e => e.map((edge, idx) => idx === i ? { ...edge, [field]: val } : edge))

  /* — add‑row buttons — */
  const addWordRow = () => setWords(w => [...w, ''])
  const addEdgeRow = () =>
    setEdges(e => [...e, { edge_name: '', from_name: '', to_name: '', double_edge: false }])

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({
      words: words.filter(w => w.trim() !== '').map(w => ({ name: w, username })),
      edges: edges.filter(ed => ed.edge_name && ed.from_name && ed.to_name)
                 .map(ed => ({ ...ed, username, double_edge: !!ed.double_edge })),
      mode,
    })
    initWordsEdges()
  }

  return (
    <ModalScaffold
      ref={scaffoldRef}
      title={actionLabel}
      className="wm-box"
      onClose={onClose}
      onSubmit={handleSubmit}
      submitButtonText = {actionLabel}
      initialism = {initialism}
      visible={open && ready}
      collapseOnClose={true}
      minWidth={560}
      minHeight={240}
      initialPos={{ x: 200, y: 80 }}
      initialSize={{ width: 560, height: 240 }}
      onCollapse={onCollapse}
      zIndexCount={zIndexCount}
      setZIndexCount={setZIndexCount}
    >
      <div className="wm-content" style={{ overflowY: 'auto', gap: 8 }}>
        {/* toolbar */}
        <div className="adm-toolbar">
          <button type="button" onClick={addWordRow}>{wordLabel}</button>
          <button type="button" onClick={addEdgeRow}>{edgeLabel}</button>
        </div>

        <div className="adm-middle">
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
              <label>Edge {i + 1}</label>
              <EdgeNameInput
                value={ed.edge_name}
                onChange={val => updateEdge(i, 'edge_name', val)}
                existingEdges={existingEdges}
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
                Double Edge
              </label>
            </div>
          ))}
        </div>
      </div>
    </ModalScaffold>
  )
})

export default DataModal
