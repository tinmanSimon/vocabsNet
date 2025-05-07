// Word.jsx
import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Text } from '@react-three/drei';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const Word = forwardRef(function Word({ name, position, opacity_speed = 0.5, removing = false, onFadeDone = () => {} }, ref) {
  const localRef = useRef()
  const { camera } = useThree()
  const currentPosition = useRef(new THREE.Vector3(...position))
  const animation_speed = 0.2

  useEffect(() => {
    if (localRef.current) {
      localRef.current.material.transparent = true
      localRef.current.material.opacity = 0
    }
  }, [])

  useFrame((_, delta) => {
    if (!localRef.current) return

    localRef.current.quaternion.copy(camera.quaternion)

    const targetVec = new THREE.Vector3(...position)
    const currentVec = currentPosition.current
    if (
      Math.abs(targetVec.x - currentVec.x) < 0.1 &&
      Math.abs(targetVec.y - currentVec.y) < 0.1 &&
      Math.abs(targetVec.z - currentVec.z) < 0.1
    ) {
      currentVec.copy(targetVec)
    } else {
      const lerpFactor = Math.max(0.01, 1 - Math.exp(-animation_speed * delta))
      currentVec.lerp(targetVec, lerpFactor)
    }
    localRef.current.position.copy(currentVec)

    const target = removing ? 0 : 1
    const mat = localRef.current.material
    const diff = target - mat.opacity
    const step = Math.sign(diff) * opacity_speed * delta
    if (Math.abs(step) > Math.abs(diff)) mat.opacity = target
    else mat.opacity += step

    if (removing && mat.opacity <= 0.01) onFadeDone()
  })

  // expose current position to parent
  useImperativeHandle(ref, () => ({
    getCurrentPosition: () => currentPosition.current.clone(),
    getTargetPosition: () => new THREE.Vector3(...position)
  }))

  return (
    <Text
      ref={localRef}
      fontSize={6}
      color="#36454F"
      anchorX="center"
      anchorY="middle"
    >
      {name}
    </Text>
  )
})

export default Word