// Graph.jsx
import { 
  useState, 
  useRef, 
  forwardRef, 
  useImperativeHandle, 
  useCallback,
  useEffect
} from 'react'
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
const Graph = forwardRef(({ orbitControlsRef, onWordClick, pauseInteraction }, ref) => {
  /* ---------------- state ---------------- */
  const [nodes, setNodes] = useState([]) // [{ name, position, isRemoving }]
  const [edges, setEdges] = useState([]) // [{ from_name, to_name, ... }]
  const [focusedItemName, setFocusedItemName] = useState(null)

  /* ---------------- camera helpers ---------------- */
  const { camera } = useThree()
  const camTargetRef   = useRef(null) // THREE.Vector3 | null
  const camLookAtRef   = useRef(null) // THREE.Vector3 | null
  const camLerpSpeed   = 50        // higher = faster
  const totalDistRef = useRef(0) 
  const keysPressed = useRef({
    w: false,
    a: false,
    s: false,
    d: false,
  })

  const stopAnim = () => {
    camTargetRef.current = camLookAtRef.current = null
    setFocusedItemName(null)
  }

  const wordRefs = useRef(new Map())
  const lookAtTarget = useRef(new THREE.Vector3(0, 0, 0))
  const pauseInteractionRef = useRef(pauseInteraction)
  useEffect(() => {
    pauseInteractionRef.current = pauseInteraction
  }, [pauseInteraction])

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
  
  /* ---------- click‑handler handed down to <Word> ---------- */
  const handleWordClick = useCallback(
    (name) => {
      // skip if we’re already focusing the same word
      if (name === focusedItemName) return
      const refObj = wordRefs.current.get(name)
      if (!refObj || !refObj.getTargetPosition) return
      const itemPos = refObj.getTargetPosition()
      const dir     = camera.position.clone().sub(itemPos).normalize()
      const camTarget = itemPos.clone().add(dir.multiplyScalar(50))
      const camLookAt = itemPos
      camTargetRef.current   = camTarget
      camLookAtRef.current   = camLookAt
      totalDistRef.current   = camTarget.distanceTo(camera.position)
      setFocusedItemName(name)
      /* ── notify parent so it can open WordModal ── */
      onWordClick?.(name)
    }, [focusedItemName])

  /* ---------------- camera animation ---------------- */
  useFrame((_, delta) => {
    if (camTargetRef.current && camLookAtRef.current && orbitControlsRef?.current) {
      const currentDist = camera.position.distanceTo(camTargetRef.current)
      const totalDist = totalDistRef.current || 1
      const duration = 2.0
      const travelProgress= delta * 1.0 / duration
      const remainProgress = currentDist / totalDist 
      let step = travelProgress / remainProgress
      if (remainProgress < 0.2) step = Math.max(0.01, (5 - duration) * delta)
      
      /* 1️⃣ move camera */
      camera.position.lerp(camTargetRef.current, step)
      
      /* 2️⃣ move orbitControls’ target in sync */
      orbitControlsRef.current.target.lerp(camLookAtRef.current, step)
      orbitControlsRef.current.update()
      
      /* 3️⃣ finish up */
      if (camera.position.distanceToSquared(camTargetRef.current) < 0.01) {
        camera.position.copy(camTargetRef.current)
        orbitControlsRef.current.target.copy(camLookAtRef.current)
        orbitControlsRef.current.update()
        
        camTargetRef.current = camLookAtRef.current = null
        setFocusedItemName(null)
      }
    } else if (orbitControlsRef?.current) {
      if (pauseInteractionRef.current) return
      const moveSpeed = 100 * delta
      const dir = new THREE.Vector3()

      if (keysPressed.current.w) dir.z += 1
      if (keysPressed.current.s) dir.z -= 1
      if (keysPressed.current.a) dir.x -= 1
      if (keysPressed.current.d) dir.x += 1

      if (dir.lengthSq() > 0) {
        dir.normalize()

        // get forward direction from camera -> target
        const forward = orbitControlsRef.current.target.clone().sub(camera.position).normalize()

        const right = new THREE.Vector3()
        right.crossVectors(forward, camera.up).normalize()

        const moveVec = new THREE.Vector3()
          .addScaledVector(forward, dir.z)
          .addScaledVector(right, dir.x)
          .multiplyScalar(moveSpeed)

        camera.position.add(moveVec)
        orbitControlsRef.current.target.add(moveVec)
        orbitControlsRef.current.update()
      }
    }
  })
  
  /* -------- abort animation the instant the user drags / scrolls -------- */
  useEffect(() => {
    const controls = orbitControlsRef?.current
    if (!controls || !camTargetRef.current) return

    let timeout = setTimeout(() => {
      controls.addEventListener('start', stopAnim)
    }, 100) // Delay listener attachment by 100ms

    return () => {
      clearTimeout(timeout)
      controls.removeEventListener('start', stopAnim)
    }
  }, [orbitControlsRef, focusedItemName])

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (pauseInteractionRef.current) return
      if (['w', 'a', 's', 'd'].includes(e.key.toLowerCase())) {
        keysPressed.current[e.key.toLowerCase()] = true
      }
      if (camTargetRef.current || camLookAtRef.current) {
        stopAnim()
      }
    }
  
    const handleKeyUp = (e) => {
      if (pauseInteractionRef.current) return
      if (['w', 'a', 's', 'd'].includes(e.key.toLowerCase())) {
        keysPressed.current[e.key.toLowerCase()] = false
      }
    }
  
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])
  
  

  /* ---------------- render ---------------- */
  const posMap = Object.fromEntries(nodes.map(n => [n.name, n.position]))

  return (
    <>
    {/* {<primitive object={new AxesHelper(100)} /> } */}
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
        onClick={handleWordClick}
      />
    ))}
    </>
  )
})

export default Graph
