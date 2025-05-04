import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Text } from '@react-three/drei'

function Word({ position, name = "Word" }) {
  const ref = useRef()
  const { camera } = useThree()

  useFrame(() => {
    if (ref.current) {
      // Update position
      ref.current.position.set(...position)

      // Make the text face the camera (billboard effect)
      ref.current.quaternion.copy(camera.quaternion)
    }
  })

  return (
    <Text
      ref={ref}
      fontSize={6}
      color="#36454F"
      anchorX="center"
      anchorY="middle"
    >
      {name}
    </Text>
  )
}

export default Word
