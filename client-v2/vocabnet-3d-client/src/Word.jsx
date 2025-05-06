// Word.jsx
import { useRef, useEffect } from 'react';
import { Text } from '@react-three/drei';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Props
 *  name        – label string
 *  position    – target [x,y,z]
 *  opacity_speed       – opacity change per second (default 2  ⇒ 0.5 s fade)
 */
export default function Word({ name, position, opacity_speed = 0.5, removing = false, onFadeDone = () => {}}) {
  const ref = useRef();
  const { camera } = useThree();
  const currentPosition = useRef(new THREE.Vector3(...position));
  const animation_speed = 0.2

  /* --- ensure we're using a transparent material --- */
  useEffect(() => {
    if (ref.current) {
      ref.current.material.transparent = true;
      ref.current.material.opacity = 0;
    }
  }, []);

  useFrame((_, delta) => {
    if (!ref.current) return;

    /* billboard */
    ref.current.quaternion.copy(camera.quaternion);

    /* --- position animation --- */
    const targetVec = new THREE.Vector3(...position);
    const currentVec = currentPosition.current;
    if (
      Math.abs(targetVec.x - currentVec.x) < 0.1 &&
      Math.abs(targetVec.y - currentVec.y) < 0.1 &&
      Math.abs(targetVec.z - currentVec.z) < 0.1
    ) {
      currentVec.copy(targetVec); // snap to target
    } else {
      const lerpFactor = Math.max(0.01, 1 - Math.exp(-animation_speed * delta))
      currentVec.lerp(targetVec, lerpFactor) 
    }
    ref.current.position.copy(currentVec);

    /* opacity tween */
    const target = removing ? 0 : 1;
    const mat = ref.current.material;
    const diff = target - mat.opacity;
    const step = Math.sign(diff) * opacity_speed * delta;
    if (Math.abs(step) > Math.abs(diff)) mat.opacity = target;
    else mat.opacity += step;

    if (removing && mat.opacity <= 0.01) onFadeDone();
  });

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
  );
}
