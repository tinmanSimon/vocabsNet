import { useState , useEffect, useRef, useCallback} from 'react'
import './App.css'
import DescriptionCard from './DescriptionCard';
import axios from "axios"
import ForceGraph3d from "react-force-graph-3d";
import SpriteText from 'three-spritetext';
import { Sidebar, Menu, MenuItem, SubMenu } from 'react-pro-sidebar';


let initFocusId = ""

function App() {
  const fg3dRef = useRef(null);
  const [nodesData, setNodesData] = useState({nodes : [], links : []}) 
  const [focusObject, setFocusObject] = useState({id:""}) 
  const [descriptionData, setDescriptionData] = useState({title: "", description: ""});
  const [descVisibility, setDescVisibility] = useState(false) 
  const hasMounted = useRef(false);

  const fetchAPI = async () => {
    const response = await axios.get("http://127.0.0.1:8080/api/vocabnet");
    setNodesData(response.data);
    if (response.data != null && response.data.nodes != null)
      initFocusId = response.data.nodes[0].id
  }

  useEffect(() => {
    if (hasMounted.current) { return; }
    fetchAPI()
    initFocus()
    hasMounted.current = true;
  }, [])


  const initFocus = async () => {
    while (initFocusId == "")
      await new Promise(resolve => setTimeout(resolve, 1000));
    focusCameraById(initFocusId)
  }

  const cloneArray = array => {
    var newArray = []
    for (let c = 0; c < array.length; ++c) {
      let item = array[c]
      newArray.push(item)
    }
    return newArray
  }

  const mergeArray = (array1, array2) => {
    for (let c = 0; c < array2.length; ++c) {
      let item = array2[c]
      array1.push(item)
    }
  }

  // recursively doing DFS to find the first child with id and returns the data , a small hack for now
  const findNodeDataById = (id) => {
    var children = cloneArray(fg3dRef.current.scene().children)
    while (0 < children.length) {
      var child = children.pop()
      if (child != null && child.__data != null && child.__data.id == id) 
        return child.__data
      if (child.children != null) {
        mergeArray(children, child.children)
      }
        
    }
    return null
  }

  const focusCameraById = (id) => {
    let node = findNodeDataById(id)
    if (node == null) return 
    focusCameraOnNode(node) 
  }

  const focusCameraOnNode = node => {
    console.log("focus on " + node.id)
    // Aim at node from outside it
    const distance = 80;
    const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z);
    fg3dRef.current.cameraPosition(
      { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }, // new position
      node, // lookAt ({ x, y, z })
      3000  // ms transition duration
    );
    setFocusObject(node) 
    setDescriptionData({
      title: node.id,
      description: node.description
    });
  }

  const handleNodeClick = useCallback(focusCameraOnNode, []);

  const setNode3ObjectStyle = node => {
      const sprite = new SpriteText(node.id);
      sprite.material.depthWrite = false; // make sprite background transparent
      sprite.color = node.color;
      sprite.textHeight = 8;
      return sprite;
  };

  const handleDescClick = menuItem => {
    console.log("Sidebar: clicked on description! descVisibility: ", descVisibility)
    setDescVisibility(!descVisibility && focusObject.id != "")
  }

  // to do, add logic to refetch the data from server and focus on the node
  const handleSearchSubmit = e => {
    e.preventDefault();
    const form = e.target;
    const formData = new FormData(form);
    const formJson = Object.fromEntries(formData.entries());
    let searchId = String(formJson.myInput)
    focusCameraById(searchId)
  }

  return (
    <div className='side-container'>
      <Sidebar>
        <Menu>
          {focusObject.id != "" && (<MenuItem> {focusObject.id}: </MenuItem>)}
          <MenuItem onClick={handleDescClick}> Description </MenuItem>
          <form method="post" onSubmit={handleSearchSubmit}>
            <input name="myInput" defaultValue="Search" />
            <button type="reset">Reset form</button>
            <button type="submit">Submit form</button>
          </form>
        </Menu>
      </Sidebar>
        <div className="overlay-container">
          {descVisibility && (
            <DescriptionCard 
              style={descVisibility ? {} : { display: 'none' }}
              title={descriptionData.title}
              description={descriptionData.description}
            />)
          }
          <ForceGraph3d
            graphData={nodesData}
            onNodeClick={handleNodeClick}
            nodeAutoColorBy={"group"}
            nodeThreeObject={setNode3ObjectStyle}
            nodeThreeObjectExtend={false}
            linkAutoColorBy={"value"}
            ref={fg3dRef}
          />
        </div>
    </div>
  )
}

export default App
