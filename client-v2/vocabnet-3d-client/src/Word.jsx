import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'

function Node({position, name = "Word" }) {
  const ref = useRef()

  useFrame(() => {
    if (ref.current) {
      ref.current.position.set(...position)
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

export default Node
