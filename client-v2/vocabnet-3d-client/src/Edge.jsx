import React, { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { Vector3, CatmullRomCurve3, TubeGeometry } from 'three'
import { Text } from '@react-three/drei'

const EdgeWithTraversalPoint = ({ 
  source, 
  target, 
  name,
  color = '#E5F3FD', 
  tubeRadius = 0.2,
  sourceGap = 0.5,
  targetGap = 0.5,
  bendAmount = 5,
  bendSpeed = 0.3,
  resolution = 2,
  traversalPointRadius = 0.5,
  traversalSpeed = 0.2,
  traversalColor = 'grey',
  fadeSpeed = 0.5,
  moveSpeed = 0.2,
  doubleEdge = false,
  removing = false,
  onFadeDone = () => {}
}) => {
  const timeRef = useRef(0)
  const traversalTimeRef = useRef(0)
  const meshRef = useRef()
  const traversalPointRef = useRef()
  const traversalPointRef2 = useRef()
  const pointsRef = useRef([])
  const curveRef = useRef()
  const textRef = useRef()

  const animatedSource = useRef(new Vector3(...source))
  const animatedTarget = useRef(new Vector3(...target))

  if (doubleEdge) traversalColor = '#008B8B'
  const { camera } = useThree()

  useFrame((state, delta) => {
    // Animate source/target positions
    const targetSource = new Vector3(...source)
    const targetTarget = new Vector3(...target)
    animatedSource.current.lerp(targetSource, Math.max(0.01, 1 - Math.exp(-moveSpeed * delta)))
    animatedTarget.current.lerp(targetTarget, Math.max(0.01, 1 - Math.exp(-moveSpeed * delta)))

    // Geometry calculations
    const direction = new Vector3().subVectors(animatedTarget.current, animatedSource.current).normalize()
    const upVector = new Vector3(0, 1, 0)

    let perpVector1, perpVector2
    if (Math.abs(direction.dot(upVector)) > 0.99) {
      perpVector1 = new Vector3(1, 0, 0)
      perpVector2 = new Vector3(0, 0, 1)
    } else {
      perpVector1 = new Vector3().crossVectors(direction, upVector).normalize()
      perpVector2 = new Vector3().crossVectors(direction, perpVector1).normalize()
    }

    const adjustedStart = animatedSource.current.clone().add(direction.clone().multiplyScalar(sourceGap))
    const adjustedEnd = animatedTarget.current.clone().add(direction.clone().negate().multiplyScalar(targetGap))

    // Update wave animation time
    timeRef.current += delta * bendSpeed
    const time = timeRef.current

    // Update points
    if (pointsRef.current.length !== resolution) {
      pointsRef.current = Array(resolution).fill().map(() => new Vector3())
    }

    for (let i = 0; i < resolution; i++) {
      const t = i / (resolution - 1)
      pointsRef.current[i].lerpVectors(adjustedStart, adjustedEnd, t)

      if (t > 0.1 && t < 0.9) {
        const bendFactor = Math.sin(t * Math.PI) * bendAmount
        const disp1 = perpVector1.clone().multiplyScalar(bendFactor * Math.sin(t * 8 + time * 2))
        const disp2 = perpVector2.clone().multiplyScalar(bendFactor * Math.sin(t * 6 + time * 2 + Math.PI / 3))
        pointsRef.current[i].add(disp1).add(disp2)
      }
    }

    // Create curve and geometry
    curveRef.current = new CatmullRomCurve3(pointsRef.current.slice())
    const newGeometry = new TubeGeometry(curveRef.current, resolution, tubeRadius, 6, false)

    if (meshRef.current) {
      if (meshRef.current.geometry) meshRef.current.geometry.dispose()
      meshRef.current.geometry = newGeometry
    }

    // Update traversal point position
    if (traversalPointRef.current && curveRef.current) {
      if (doubleEdge) {
        traversalTimeRef.current = (traversalTimeRef.current + delta * traversalSpeed) % 0.5 + 0.5
        if (traversalPointRef2.current) {
          const reversePosition = curveRef.current.getPointAt(1.0 - traversalTimeRef.current)
          traversalPointRef2.current.position.copy(reversePosition)
        }
      } else {
        traversalTimeRef.current = (traversalTimeRef.current + delta * traversalSpeed * 2.0) % 1.0
      }

      const position = curveRef.current.getPointAt(traversalTimeRef.current)
      traversalPointRef.current.position.copy(position)
    }

    // Update label position
    if (curveRef.current && textRef.current) {
      const mid = curveRef.current.getPointAt(0.5)
      const cameraPos = state.camera.position
      const directionToCamera = new Vector3().subVectors(cameraPos, mid).normalize()
      const offsetPosition = mid.clone().add(directionToCamera.multiplyScalar(10))
      textRef.current.position.copy(offsetPosition)
      textRef.current.lookAt(cameraPos)
    }

    // Opacity fade
    const targetOpacity = removing ? 0 : 1
    const mat = meshRef.current.material
    const diff = targetOpacity - mat.opacity
    const step = Math.sign(diff) * fadeSpeed * delta
    if (Math.abs(step) > Math.abs(diff)) mat.opacity = targetOpacity
    else mat.opacity += step

    traversalPointRef.current.material.opacity = mat.opacity
    if (doubleEdge && traversalPointRef2.current)
      traversalPointRef2.current.material.opacity = mat.opacity
    if (textRef.current && textRef.current.material)
      textRef.current.material.opacity = mat.opacity

    if (removing && mat.opacity <= 0.01) onFadeDone()
  })

  return (
    <>
      {/* Tube */}
      <mesh ref={meshRef}>
        <tubeGeometry args={[new CatmullRomCurve3([animatedSource.current, animatedTarget.current]), 2, tubeRadius, 6, false]} />
        <meshBasicMaterial color={color} transparent opacity={0} />
      </mesh>

      {/* Traversal point */}
      <mesh ref={traversalPointRef}>
        <sphereGeometry args={[traversalPointRadius, 8, 8]} />
        <meshBasicMaterial color={traversalColor} transparent opacity={0} />
      </mesh>

      {/* Double edge traversal point */}
      {doubleEdge && (
        <mesh ref={traversalPointRef2}>
          <sphereGeometry args={[traversalPointRadius, 8, 8]} />
          <meshBasicMaterial color={traversalColor} transparent opacity={0} />
        </mesh>
      )}

      {/* Label */}
      <Text
        ref={textRef}
        fontSize={1.5}
        color="black"
        anchorX="center"
        anchorY="middle"
        depthOffset={-1}
      >
        {name}
      </Text>
    </>
  )
}

export default EdgeWithTraversalPoint
