// Word.jsx
import { useRef, useEffect } from 'react';
import { Text } from '@react-three/drei';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * Props
 *  name        – label string
 *  position    – target [x,y,z]
 *  speed       – opacity change per second (default 2  ⇒ 0.5 s fade)
 */
export default function Word({ name, position, speed = 0.5, removing = false, onFadeDone = () => {}}) {
  const ref = useRef();
  const { camera } = useThree();

  /* --- ensure we're using a transparent material --- */
  useEffect(() => {
    if (ref.current) {
      ref.current.material.transparent = true;
      ref.current.material.opacity = 0;
    }
  }, []);

  /* --- update position every render (instant jump), billboard each frame --- */
  useEffect(() => {
    if (ref.current) ref.current.position.set(...position);
  }, [position]);

  useFrame((_, delta) => {
    if (!ref.current) return;

    /* billboard */
    ref.current.quaternion.copy(camera.quaternion);

    /* opacity tween */
    const target = removing ? 0 : 1;
    const mat = ref.current.material;
    const diff = target - mat.opacity;
    const step = Math.sign(diff) * speed * delta;
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
