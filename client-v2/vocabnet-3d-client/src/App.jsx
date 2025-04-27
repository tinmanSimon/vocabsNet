import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Graph from './Graph'

function App() {
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <Canvas camera={{ position: [0, 0, 50], fov: 60 }} style={{ background: 'lightblue' }}>
        <ambientLight />
        <pointLight position={[10, 10, 10]} />
        {/* <axesHelper args={[80]} />  */}
        <Graph />
        <OrbitControls />
      </Canvas>
    </div>
  )
}

export default App