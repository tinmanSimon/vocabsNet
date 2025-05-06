import { useRef, useEffect } from 'react'
import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'

export default function WelcomeBanner({ username, onDone, speed = 2 }) {
  const ref = useRef()
  const phaseRef = useRef('in')
  const stayTimerRef = useRef(0)

  useEffect(() => {
    if (ref.current) {
        ref.current.material.transparent = true;
        ref.current.material.opacity = 0;
    }
  }, [])

  useFrame((_, delta) => {
    const text = ref.current
    if (!text || !text.material) return

    const mat = text.material

    if (phaseRef.current === 'in') {
      mat.opacity = Math.min(mat.opacity + speed * delta, 1)
      if (mat.opacity >= 1) phaseRef.current = 'stay'
    } else if (phaseRef.current === 'stay') {
      stayTimerRef.current += delta
      if (stayTimerRef.current >= 3) phaseRef.current = 'out'
    } else if (phaseRef.current === 'out') {
      mat.opacity = Math.max(mat.opacity - speed * delta, 0)
      if (mat.opacity <= 0.01) onDone()
    }
  })

  return (
    <Text
      ref={ref}
      fontSize={2.5}
      position={[0, 10, 0]} // upper third
      anchorX="center"
      anchorY="middle"
      color="#333"
    >
      {`Welcome ${username}`}
    </Text>
  )
}
