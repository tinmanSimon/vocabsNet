import React, { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3, CatmullRomCurve3, TubeGeometry } from 'three'

const EdgeWithTraversalPoint = ({ 
  source, 
  target, 
  color = '#E5F3FD', 
  tubeRadius = 0.05,
  sourceGap = 0.5,
  targetGap = 0.5,
  bendAmount = 0.5,
  bendSpeed = 0.3,
  resolution = 16,
  traversalPointRadius = 0.12,
  traversalSpeed = 0.2,
  traversalColor = 'grey',
  doubleEdge = false
}) => {
  const timeRef = useRef(0)
  const traversalTimeRef = useRef(0)
  const tubeRef = useRef()
  const meshRef = useRef()
  const traversalPointRef = useRef()
  const traversalPointRef2 = useRef()
  const pointsRef = useRef([])
  const curveRef = useRef()

  if (doubleEdge) {
    traversalColor = '#008B8B'
  }
  
  // Setup function - runs once
  useEffect(() => {
    // Create Vector3 objects from arrays - only once
    const sourceVec = new Vector3(...source)
    const targetVec = new Vector3(...target)
    
    // Calculate direction vector and perpendicular vectors
    const direction = new Vector3().subVectors(targetVec, sourceVec).normalize()
    const upVector = new Vector3(0, 1, 0)
    let perpVector1, perpVector2
    
    if (Math.abs(direction.dot(upVector)) > 0.99) {
      perpVector1 = new Vector3(1, 0, 0).normalize()
      perpVector2 = new Vector3(0, 0, 1).normalize()
    } else {
      perpVector1 = new Vector3().crossVectors(direction, upVector).normalize()
      perpVector2 = new Vector3().crossVectors(direction, perpVector1).normalize()
    }
    
    // Calculate adjusted start and end points with gaps
    const reverseDirection = direction.clone().negate()
    const adjustedStart = sourceVec.clone().add(new Vector3().copy(direction).multiplyScalar(sourceGap))
    const adjustedEnd = targetVec.clone().add(new Vector3().copy(reverseDirection).multiplyScalar(targetGap))
    
    // Store these vectors in refs for reuse
    tubeRef.current = {
      sourceVec,
      targetVec,
      direction,
      perpVector1,
      perpVector2,
      adjustedStart,
      adjustedEnd
    }
    
    // Initialize the points array with Vector3 objects (reused)
    pointsRef.current = Array(resolution).fill().map(() => new Vector3())
    
    // Initialize points with positions
    for (let i = 0; i < resolution; i++) {
      const t = i / (resolution - 1)
      pointsRef.current[i].lerpVectors(adjustedStart, adjustedEnd, t)
    }
    
    // Create initial curve
    curveRef.current = new CatmullRomCurve3(pointsRef.current.slice())
  }, [source, target, sourceGap, targetGap, resolution])
  
  // Animation and geometry update
  useFrame((state, delta) => {
    if (!tubeRef.current) return
    
    const {
      adjustedStart,
      adjustedEnd,
      perpVector1,
      perpVector2
    } = tubeRef.current
    
    // Update wave animation time
    timeRef.current += delta * bendSpeed
    const time = timeRef.current
    
    // Update points
    for (let i = 0; i < resolution; i++) {
      const t = i / (resolution - 1)
      
      // Start with linear interpolation
      pointsRef.current[i].lerpVectors(adjustedStart, adjustedEnd, t)
      
      // Add displacement for middle sections
      if (t > 0.1 && t < 0.9) {
        const bendFactor = Math.sin(t * Math.PI) * bendAmount
        
        // Calculate and add displacements
        const disp1 = perpVector1.clone().multiplyScalar(
          bendFactor * Math.sin(t * 8 + time * 2)
        )
        const disp2 = perpVector2.clone().multiplyScalar(
          bendFactor * Math.sin(t * 6 + time * 2 + Math.PI / 3)
        )
        
        pointsRef.current[i].add(disp1).add(disp2)
      }
    }
    
    // Create a new curve each frame - needed for proper animation
    curveRef.current = new CatmullRomCurve3(pointsRef.current.slice())
    
    // Create new geometry for the updated curve
    const newGeometry = new TubeGeometry(curveRef.current, resolution, tubeRadius, 6, false)
    
    // Update mesh geometry
    if (meshRef.current) {
      // Dispose old geometry to prevent memory leaks
      if (meshRef.current.geometry) meshRef.current.geometry.dispose()
      meshRef.current.geometry = newGeometry
    }
    
    // Update traversal point position
    if (traversalPointRef.current && curveRef.current) {
      if (doubleEdge) {
        // Update traversal point animation time (cycle between 0.0 and 1.0)
        traversalTimeRef.current = (traversalTimeRef.current + delta * traversalSpeed) % 0.5 + 0.5
        
        // Get reverse position for second point
        if (traversalPointRef2.current) {
          const reversePosition = curveRef.current.getPointAt(1.0 - traversalTimeRef.current)
          traversalPointRef2.current.position.copy(reversePosition)
        }
      } else {
        // Single edge - full traversal
        traversalTimeRef.current = (traversalTimeRef.current + delta * traversalSpeed * 2.0) % 1.0
      }
      
      // Get position along the curve based on traversal time
      const position = curveRef.current.getPointAt(traversalTimeRef.current)
      traversalPointRef.current.position.copy(position)
    }
  })
  
  return (
    <>
      {/* Tube for the main path */}
      <mesh ref={meshRef}>
        <primitive 
          attach="geometry" 
          object={new TubeGeometry(
            new CatmullRomCurve3([
              new Vector3(...source).addScaledVector(new Vector3(...target).sub(new Vector3(...source)).normalize(), sourceGap),
              new Vector3(...target).addScaledVector(new Vector3(...source).sub(new Vector3(...target)).normalize(), targetGap)
            ]), 
            2, tubeRadius, 6, false
          )} 
        />
        <meshBasicMaterial color={color} />
      </mesh>
      
      {/* Traversal point */}
      <mesh ref={traversalPointRef}>
        <sphereGeometry args={[traversalPointRadius, 8, 8]} />
        <meshBasicMaterial color={traversalColor} />
      </mesh>
      
      {/* Second traversal point (for double edge) */}
      {doubleEdge && (
        <mesh ref={traversalPointRef2}>
          <sphereGeometry args={[traversalPointRadius, 8, 8]} />
          <meshBasicMaterial color={traversalColor} />
        </mesh>
      )}
    </>
  )
}

export default EdgeWithTraversalPoint