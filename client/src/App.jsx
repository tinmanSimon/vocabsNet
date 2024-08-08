import { useState , useEffect, useRef, useCallback} from 'react'
import './App.css'
import axios from "axios"
import ForceGraph3d from "react-force-graph-3d";
import SpriteText from 'three-spritetext';


function App() {
  const fg3dRef = useRef(null);
  const [nodesData, setNodesData] = useState({nodes : [], links : []}) 
  const [nodeStyle, setNodeStyle] = useState("SpriteText") 
  const fetchAPI = async () => {
    const response = await axios.get("http://127.0.0.1:8080/api/vocabnet");
    console.log(response.data);
    setNodesData(response.data);
  }

  useEffect(() => {
    fetchAPI()
  }, [])

  const handleClick = useCallback(node => {
    // Aim at node from outside it
    const distance = 80;
    const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);
    fg3dRef.current.cameraPosition(
      { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, // new position
      node, // lookAt ({ x, y, z })
      3000  // ms transition duration
    );
  }, [fg3dRef]);

  const setNode3ObjectStyle = useCallback(node => {
    if (nodeStyle == "SpriteText") {
      const sprite = new SpriteText(node.id);
      sprite.material.depthWrite = false; // make sprite background transparent
      sprite.color = node.color;
      sprite.textHeight = 8;
      return sprite;
    }
  }, [nodeStyle]);

  return (
    <div>
      <ForceGraph3d
        graphData={nodesData}
        onNodeClick={handleClick}
        nodeAutoColorBy={"group"}
        nodeThreeObject={setNode3ObjectStyle}
        ref={fg3dRef}
      />
    </div>
  )
}

export default App
