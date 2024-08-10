import { useState , useEffect, useRef, useCallback} from 'react'
import './App.css'
import OverlayCard from './OverlayCard'
import axios from "axios"
import ForceGraph3d from "react-force-graph-3d"
import SpriteText from 'three-spritetext'
import { Sidebar, Menu, MenuItem, SubMenu } from 'react-pro-sidebar'


let initFocusId = ""

function App() {
  const fg3dRef = useRef(null)
  const [nodesData, setNodesData] = useState({nodes : [], links : []}) 
  const [focusObject, setFocusObject] = useState({id:""}) 
  const [descriptionData, setDescriptionData] = useState({title: "", description: ""})
  const [descVisibility, setDescVisibility] = useState(false) 
  const [sidebarFocus, setSidebarFocus] = useState("")
  const hasMounted = useRef(false)

  const fetchAPI = async () => {
    const response = await axios.get("http://127.0.0.1:8080/api/vocabnet")
    setNodesData(response.data)
    if (response.data != null && response.data.focusNode != null)
      initFocusId = response.data.focusNode
  }

  useEffect(() => {
    if (hasMounted.current) { return }
    fetchAPI()
    initFocus()
    hasMounted.current = true
  }, [])


  const initFocus = async () => {
    while (initFocusId == "")
      await new Promise(resolve => setTimeout(resolve, 2000))
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
    console.log("focus on word: " + node.id)
    const distance = 80
    const distRatio = 1 + distance/Math.hypot(node.x, node.y, node.z)
    let newPosition = { x: node.x * distRatio, y: node.y * distRatio, z: node.z * distRatio }
    if (node.x == 0 && node.y == 0 && node.z == 0) {
      newPosition = {x: 40, y: 40, z: 40}
    } 
    fg3dRef.current.cameraPosition(
      newPosition, // new position
      node, // lookAt ({ x, y, z })
      3000  // ms transition duration
    )
    setFocusObject(node) 
    setDescriptionData({
      title: node.id,
      description: node.description
    })
  }

  const handleNodeClick = useCallback(focusCameraOnNode, [])

  const setNode3ObjectStyle = node => {
      const sprite = new SpriteText(node.id)
      sprite.material.depthWrite = false // make sprite background transparent
      sprite.color = node.color
      sprite.textHeight = 8
      return sprite
  }

  const handleDescClick = (id) => {
    console.log('Sidebar: clicked on %s!', id)
    if (sidebarFocus == id){
      setSidebarFocus("")
      setDescVisibility(false)
    } else {
      setSidebarFocus(id)
      setDescVisibility(true)
    }
  }

  const overlayCallback = data => {
    switch (data.method) {
      case "add-words":
        // todo add words
        console.log("we gon add words")

        case "search-word":
          focusCameraById(data.word)
    }
  }

  return (
    <div className='side-container'>
      <Sidebar>
        <Menu>
          {focusObject.id != "" && (<MenuItem> {focusObject.id}: </MenuItem>)}
          <MenuItem onClick={() => handleDescClick("description")}> Description </MenuItem>
          <MenuItem onClick={() => handleDescClick("add-words")}> Add Words </MenuItem>
          <MenuItem onClick={() => handleDescClick("search-words")}> Search Words </MenuItem>
        </Menu>
      </Sidebar>
        <div className="overlay-container">
          {descVisibility && (
            <OverlayCard 
            descriptionData={descriptionData}
            sidebarFocus={sidebarFocus}
            callbackFunc={overlayCallback}
            />)
          }
          <ForceGraph3d
            graphData={nodesData}
            onNodeClick={handleNodeClick}
            nodeAutoColorBy={"group"}
            nodeThreeObject={setNode3ObjectStyle}
            nodeThreeObjectExtend={false}
            linkAutoColorBy={"value"}
            linkWidth={1.5}
            linkOpacity={0.3}
            ref={fg3dRef}
          />
        </div>
    </div>
  )
}

export default App
