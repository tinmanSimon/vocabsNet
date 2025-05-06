import * as THREE from 'three';

/**
 * Pick a random world‑space point visible to `camera`
 * whose distance from the camera is between `nearD` and `farD`.
 *
 *   • camera   – THREE.PerspectiveCamera
 *   • nearD    – smallest distance from camera (default 15)
 *   • farD     – largest distance from camera  (default 60)
 */
export function randomVecInView(camera, nearD = 30, farD = 90) {
  if (!camera.isPerspectiveCamera) {
    throw new Error('randomVecInView currently supports only PerspectiveCamera');
  }

  // 1) choose random depth in [nearD, farD]
  const d = THREE.MathUtils.randFloat(nearD, farD);

  // 2) compute half‑extents of the frustum at that depth
  const halfHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * d;
  const halfWidth  = halfHeight * camera.aspect;

  // 3) random offsets in that rectangle
  const rx = THREE.MathUtils.randFloatSpread(halfWidth * 2);   // [-halfWidth,  halfWidth]
  const ry = THREE.MathUtils.randFloatSpread(halfHeight * 2);  // [-halfHeight, halfHeight]

  // 4) build camera basis vectors
  const camDir   = new THREE.Vector3().copy(camera.getWorldDirection(new THREE.Vector3())); // forward (‑Z)
  const camUp    = new THREE.Vector3().copy(camera.up).normalize();
  const camRight = new THREE.Vector3().crossVectors(camDir, camUp).normalize(); // right‑hand

  // 5) position = camPos + dir*d + right*rx + up*ry
  const worldPos = camera.position
    .clone()
    .add(camDir.multiplyScalar(d))
    .add(camRight.multiplyScalar(rx))
    .add(camUp.multiplyScalar(ry));

  return [worldPos.x, worldPos.y, worldPos.z];
}
