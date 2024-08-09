import { useState , useEffect, useRef, useCallback} from 'react'
import './App.css'
import DescriptionCard from './DescriptionCard';
import axios from "axios"
import ForceGraph3d from "react-force-graph-3d";
import SpriteText from 'three-spritetext';
import { Sidebar, Menu, MenuItem, SubMenu } from 'react-pro-sidebar';



function App() {
  const fg3dRef = useRef(null);
  const [nodesData, setNodesData] = useState({nodes : [], links : []}) 
  const [focusObject, setFocusObject] = useState({id:""}) 
  const [descriptionData, setDescriptionData] = useState({title: "", description: ""});
  const fetchAPI = async () => {
    const response = await axios.get("http://127.0.0.1:8080/api/vocabnet");
    setNodesData(response.data);
  }

  useEffect(() => {
    fetchAPI()
  }, [])

  const handleNodeClick = useCallback(node => {
    // Aim at node from outside it
    const distance = 80;
    const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);
    fg3dRef.current.cameraPosition(
      { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, // new position
      node, // lookAt ({ x, y, z })
      3000  // ms transition duration
    );
    setFocusObject(node);
    setDescriptionData({
      title: node.id,
      description: node.description
    });
  }, [fg3dRef]);

  const setNode3ObjectStyle = node => {
      const sprite = new SpriteText(node.id);
      sprite.material.depthWrite = false; // make sprite background transparent
      sprite.color = node.color;
      sprite.textHeight = 8;
      return sprite;
  };

  return (
    <div className='side-container'>
      <Sidebar>
        <Menu>
          <MenuItem> {focusObject.id}: </MenuItem>
          <MenuItem> Description </MenuItem>
        </Menu>
      </Sidebar>
      <div className='main-container'>
        <div className="overlay-container">
          <DescriptionCard 
            title={descriptionData.title}
            description={descriptionData.description}
          />
          <ForceGraph3d
            graphData={nodesData}
            onNodeClick={handleNodeClick}
            nodeAutoColorBy={"group"}
            nodeThreeObject={setNode3ObjectStyle}
            ref={fg3dRef}
          />
        </div>
      </div>
      
    </div>
  )
}

export default App
