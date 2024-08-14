import { useState , useEffect, useRef, useCallback} from 'react'
import './App.css'
import OverlayCard from './OverlayCard'
import axios from "axios"
import ForceGraph3d from "react-force-graph-3d"
import SpriteText from 'three-spritetext'
import { Sidebar, Menu, MenuItem, SubMenu } from 'react-pro-sidebar'

function App() {
  const hostNameAndPort = "http://89.116.212.110:8000"
  const debugNameAndPort = "http://127.0.0.1:8000"
  let hostAndPort = hostNameAndPort

  const fg3dRef = useRef(null)
  const [nodesData, setNodesData] = useState({nodes : [], links : []}) 
  const [focusObject, setFocusObject] = useState({id:""}) 
  const [descriptionData, setDescriptionData] = useState({title: "", description: ""})
  const [descVisibility, setDescVisibility] = useState(false) 
  const [sidebarFocus, setSidebarFocus] = useState("")
  const hasMounted = useRef(false)

  const fetchAPI = async () => {
    const response = await axios.get(hostAndPort + "/api/vocabnet/getdata")
    setNodesData(response.data)
    if (response.data != null && response.data.focusNode != null)
      delayFocus(response.data.focusNode)
  }

  const delayFocus = async (id) => {
    await new Promise(resolve => setTimeout(resolve, 1500))
    focusCameraById(id)
  }

  const postAPI = async (reqParams) => {
    axios.post(reqParams.uri, reqParams.data)
    .then(function (response) {
      if (response.data != null && response.data.error != null) {
        console.log(response.data.error)
      }
      else if (response.data != null && response.data.focusNode != null){
        setNodesData(response.data)
        delayFocus(response.data.focusNode)
      }
    })
    .catch(function (error) {
      console.log(error);
    });
  }

  useEffect(() => {
    if (hasMounted.current) { return }
    fetchAPI()
    hasMounted.current = true
  }, [])

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
    if (node == null) {
      console.log("Couldn't find word: ", id)
      return
    }
    focusCameraOnNode(node) 
  }

  const focusCameraOnNode = node => {
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

  const handleLinkClick = link => {
    console.log("focus on link: ", link)
    const middlePos = Object.assign(...['x', 'y', 'z'].map(c => ({
      [c]: link.source[c] + (link.target[c] - link.source[c]) / 2 // calc middle point
    })));
    focusCameraOnNode(middlePos)
  }

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

  const isInputSingleValidWord = (inputStr) => {
    return /^[\w-]+$/.test(inputStr.trim());
  }

  const isInputSingleValidNum = (inputStr) => {
    return /^\d+$/.test(inputStr.trim()) && parseInt(inputStr.trim(), 10) > 0;
  }

  const overlayCallback = data => {
    switch (data.method) {
      case "add-words":
        console.log("adding words: ", data.words)
        console.log("adding edges: ", data.edges, " edge type: ", data.edgetype)
        postAPI({
          uri: hostAndPort + "/api/vocabnet/addwords",
          data : {
            "words" : data.words,
            "edges" : data.edges,
            "edgetype" : data.edgetype
          }
        })
        break

      case "remove-words":
        console.log("removing words: ", data.words)
        console.log("removing edges: ", data.edges, " edge type: ", data.edgetype)
        postAPI({
          uri: hostAndPort + "/api/vocabnet/removewords",
          data : {
            "words" : data.words,
            "edges" : data.edges,
            "edgetype" : data.edgetype
          }
        })
        break

      case "search-word":
        focusCameraById(data.word)
        break 
      
      case "search-words-in-net":
        console.log("Search through net with words: ", data.word)
        if (!isInputSingleValidWord(data.word)) {
          console.log("Invalid word input: ", data.word)
          break
        }
        postAPI({
          uri: hostAndPort + "/api/vocabnet/search",
          data : {
            "word" : data.word
          }
        })
        break 

      case "change-fov":
        console.log("Change fov: ", data.fov)
        if (!isInputSingleValidNum(data.fov)) {
          console.log("Invalid fov input: ", data.fov)
          break
        }
        postAPI({
          uri: hostAndPort + "/api/vocabnet/fov",
          data : {
            "fov" : data.fov,
            "focusWord" : focusObject.id
          }
        })
        break 
    }
  }

  return (
    <div className='side-container'>
      <Sidebar>
        <Menu>
          {focusObject.id != "" && (<MenuItem> {focusObject.id}: </MenuItem>)}
          <MenuItem onClick={() => handleDescClick("description")}> Description </MenuItem>
          <MenuItem onClick={() => handleDescClick("add-words")}> Add Words </MenuItem>
          <MenuItem onClick={() => handleDescClick("remove-words")}> Remove Words </MenuItem>
          <MenuItem onClick={() => handleDescClick("search-words")}> Search Local Word </MenuItem>
          <MenuItem onClick={() => handleDescClick("search-words-in-net")}> Search Through network </MenuItem>
          <MenuItem onClick={() => handleDescClick("field-of-view")}> Change field of view </MenuItem>
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
            linkThreeObjectExtend={true}
            linkThreeObject={link => {
              // extend link with text sprite
              const sprite = new SpriteText(`${link.value}`);
              sprite.material.depthWrite = false // make sprite background transparent
              sprite.textHeight = 2;
              return sprite;
            }}
            linkAutoColorBy={"value"}
            linkWidth={1.5}
            linkOpacity={0.3}
            linkPositionUpdate={(sprite, { start, end }) => {
              const middlePos = Object.assign(...['x', 'y', 'z'].map(c => ({
                [c]: start[c] + (end[c] - start[c]) / 2 // calc middle point
              })));
              // Position sprite
              Object.assign(sprite.position, middlePos);
            }}
            onLinkClick={handleLinkClick}
            ref={fg3dRef}
          />
        </div>
    </div>
  )
}

export default App
