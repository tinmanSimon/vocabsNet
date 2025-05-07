// Graph.jsx
import { useState, useRef, forwardRef, useImperativeHandle } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import Word from './Word'
import Edge from './Edge'
import { randomVecInView } from './utils/randomVecInView'
import spreadWords from './utils/spreadWords'
import { AxesHelper } from 'three'


/* ------------------------------------------------- *
 * Graph
 * ------------------------------------------------- */
const Graph = forwardRef(({ orbitControlsRef }, ref) => {
  /* ---------------- state ---------------- */
  const [nodes, setNodes] = useState([]) // [{ name, position, isRemoving }]
  const [edges, setEdges] = useState([]) // [{ from_name, to_name, ... }]
  const [focusedItemName, setFocusedItemName] = useState(null)

  /* ---------------- camera helpers ---------------- */
  const { camera } = useThree()
  const camTargetRef   = useRef(null) // THREE.Vector3 | null
  const camLookAtRef   = useRef(null) // THREE.Vector3 | null
  const camLerpSpeed   = 3.0          // higher = faster

  const wordRefs = useRef(new Map())
  const lookAtTarget = useRef(new THREE.Vector3(0, 0, 0))

  /* ---------------- utilities ---------------- */
  const edgeKey = e =>
    `${e.edge_name}-${e.from_name}-${e.to_name}-${e.double_edge ? 1 : 0}`

  const handleWordFadeDone = name =>
    setNodes(prev => prev.filter(n => n.name !== name))
  const handleEdgeFadeDone = key =>
    setEdges(prev => prev.filter(e => edgeKey(e) !== key))

  /* ---------------- public API ---------------- */
  useImperativeHandle(ref, () => ({
    applyPayload({ words = [], edges: edgeArr = [], mode }) {
      if (mode === 'add-data') {
        setNodes(prevNodes => {
          setEdges(prevEdges => {
            /* -------- merge words -------- */
            const existing = new Map(prevNodes.map(n => [n.name, n]))
            const mergedWords = [...prevNodes]
            let lastNewWord = null

            words.forEach(w => {
              if (!existing.has(w.name)) {
                const newWord = {
                  name: w.name,
                  position: randomVecInView(camera),
                  isRemoving: false,
                }
                mergedWords.push(newWord)
                lastNewWord = newWord
              }
            })

            /* -------- merge edges -------- */
            const existingKeys = new Set(prevEdges.map(edgeKey))
            const newEdges = edgeArr.filter(e => !existingKeys.has(edgeKey(e)))
            const mergedEdges = [
              ...prevEdges,
              ...newEdges.map(e => ({ ...e, isRemoving: false })),
            ]

            /* -------- layout -------- */
            const laidOut = spreadWords(mergedWords, mergedEdges, {
              nodeDistance:        40,
              edgeDistance:        30,
              edgeEdgeDistance:    30,
              iterations:          30,
              boxSize:             500,
            })

            setNodes(laidOut)
            setEdges(mergedEdges)
            return prevEdges // satisfy React set‑state signature
          })
          return prevNodes
        })

      } else if (mode === 'remove-data') {
        /* mark removals for fade‑out */
        if (words.length) {
          setNodes(prev =>
            prev.map(n =>
              words.some(w => w.name === n.name)
                ? { ...n, isRemoving: true }
                : n,
            ),
          )
        }
        if (edgeArr.length || words.length) {
          setEdges(prev =>
            prev.map(e =>
              edgeArr.some(x => edgeKey(x) === edgeKey(e)) ||
              words.some(w => w.name === e.from_name || w.name === e.to_name)
                ? { ...e, isRemoving: true }
                : e,
            ),
          )
        }
      }
    },
  }))

  /* ---------------- camera animation ---------------- */
  useFrame((_, delta) => {
    if (focusedItemName) {
      const refObj = wordRefs.current.get(focusedItemName)
      if (!refObj || !refObj.getCurrentPosition) return
  
      const itemPos = refObj.getCurrentPosition()
  
      // Direction: from item to current camera position
      const dir = camera.position.clone().sub(itemPos).normalize()
      const offset = dir.multiplyScalar(50)
      const curTargetPos = itemPos.clone().add(offset)
  
      const step = 1 - Math.exp(-3 * delta)
      camera.position.lerp(curTargetPos, step)
      camera.lookAt(itemPos)

      const finalItemPos = refObj.getTargetPosition()
      const finalTargetPos = finalItemPos.clone().add(offset)

      if (camera.position.distanceTo(finalTargetPos) < 0.2 && orbitControlsRef?.current) {
        camera.position.copy(finalTargetPos)
        camera.lookAt(itemPos)
        orbitControlsRef.current.target.copy(itemPos)
        orbitControlsRef.current.update()
  
        setFocusedItemName(null)
      }
    }
  })
  
  

  /* ---------------- render ---------------- */
  const posMap = Object.fromEntries(nodes.map(n => [n.name, n.position]))

  return (
    <>
    {/* <primitive object={new AxesHelper(100)} /> */}
      {/* EDGES */}
      {edges.map(e => {
        const a = posMap[e.from_name]
        const b = posMap[e.to_name]
        if (!a || !b) return null
        return (
          <Edge
            key={edgeKey(e)}
            source={a}
            target={b}
            name={e.edge_name}
            doubleEdge={e.double_edge}
            removing={e.isRemoving}
            onFadeDone={() => handleEdgeFadeDone(edgeKey(e))}
          />
        )
      })}

      {/* WORDS */}
      {nodes.map(n => (
      <Word
        key={n.name}
        name={n.name}
        position={n.position}
        removing={n.isRemoving}
        ref={(el) => {
          if (el) wordRefs.current.set(n.name, el)
          else wordRefs.current.delete(n.name)
        }}
        onFadeDone={() => handleWordFadeDone(n.name)}
      />
    ))}
    </>
  )
})

export default Graph
