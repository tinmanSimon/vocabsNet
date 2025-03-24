import './OverlayCard.css';
import axios from "axios"
import { React, useState , useEffect, useRef, useCallback} from 'react'

function OverlayCard({ descriptionData, sidebarFocus, callbackFunc, wordHistory, focusWord}) {

  let hostAndPort = "https://tinmansimon.uk"

  const wordInputRef = useRef(null)
  const singleInputRef = useRef(null)
  const edgesInputRef = useRef(null)
  const edgeTypeInputRef = useRef(null)
  const usernameInputRef = useRef(null)
  const passwordInputRef = useRef(null)
  const [focusWordNote, setFocusWordNote] = useState("")

  const fetchNote = async (focusWord) => {
    let token = localStorage.getItem("token");
    if (token === null) return;
    console.log(focusWord)
    const response = await axios.get(hostAndPort + "/api/vocabnet/note", {
      params: { focusWord: focusWord }, 
      headers: { Authorization: `Bearer ${token}` }
    })
    if (response.data != null && response.data.note != null) {
      setFocusWordNote(response.data.note)
      console.log(response.data.note)
    }
  }

  const refValidationCheck = () => {
    if (wordInputRef.current == null) return false
    if (wordInputRef.current.value == "" && edgesInputRef.current.value == "") return false 
    return true
  }

  const getWordsEdgesReqParams = method => {
    if (!refValidationCheck()) return {}
    return {
      "words" : wordInputRef.current.value,
      "edges" : edgesInputRef.current.value,
      "edgetype" : edgeTypeInputRef.current.value,
      "method" : method
    }
  }

  const resetInputs = () => {
    wordInputRef.current.value = ""
    edgesInputRef.current.value = ""
    edgeTypeInputRef.current.value = ""
    usernameInputRef.current.value = ""
    passwordInputRef.current.value = ""
  }

  const overlayButtonsClick = e => {
    switch (e.target.id) {
      case "add-button":
        if (!refValidationCheck()) return
        callbackFunc(getWordsEdgesReqParams("add-words"))
        resetInputs()
        break
      
      case "remove-button":
        if (!refValidationCheck()) return
        callbackFunc(getWordsEdgesReqParams("remove-words"))
        resetInputs()
        break

      case "search-button":
        if (singleInputRef.current == null || singleInputRef.current.value == "") return
        callbackFunc({
          "word" : singleInputRef.current.value,
          "method" : "search-word"
        })
        break

      case "search-in-net-button":
        if (singleInputRef.current == null || singleInputRef.current.value == "") return
        callbackFunc({
          "word" : singleInputRef.current.value,
          "method" : "search-words-in-net"
        })
        break

      case "fov-button":
        if (singleInputRef.current == null || singleInputRef.current.value == "") return
        callbackFunc({
          "fov" : singleInputRef.current.value,
          "method" : "change-fov"
        })
        break

      case "backup-button":
        callbackFunc({
          "method" : "backup-server"
        })
        break

      case "login-button":
        callbackFunc({
          "method" : "login-server",
          "username" : usernameInputRef.current.value,
          "password" : passwordInputRef.current.value
        })
        break
    }
  }

    if (sidebarFocus == "description") {
      return (
        <div className="overlay-card">
          <h1 className="overlay-title">{descriptionData.title}</h1>
          <p className="overlay-text" style={{whiteSpace: "pre-line", textAlign: "left"}}>
            {descriptionData.description}
          </p>
        </div>
      )
    }

    let placeholder = "Search"
    if (sidebarFocus == "field-of-view") placeholder = "Change FOV"

    if (sidebarFocus == "search-words" || sidebarFocus == "search-words-in-net" || sidebarFocus == "field-of-view") {
      return (
        <div className="overlay-card">
          <input ref={singleInputRef} name="singleInput" placeholder={placeholder} />
          {sidebarFocus == "search-words" && 
            <button id="search-button" onClick={overlayButtonsClick}>Search</button>}
          {sidebarFocus == "search-words-in-net" && 
            <button id="search-in-net-button" onClick={overlayButtonsClick}>Search In Net</button>}
          {sidebarFocus == "field-of-view" && 
            <button id="fov-button" onClick={overlayButtonsClick}>Change field of view</button>}
        </div>
      )
    }

    if (sidebarFocus == "add-words" || sidebarFocus == "remove-words") {
      return (
        <div className="overlay-card">
          <p>To handle multiple words, separate words with ","</p>
          <p>Words: <input ref={wordInputRef} name="wordInput" placeholder="Word" /></p>
          <p>Single edge is source text separated by a single space. <br></br> Multiple edges are separate with ","</p>
          <p>Edges: <input ref={edgesInputRef} name="edgesInput" placeholder="Edges" /></p>
          <p>Edge type: <input ref={edgeTypeInputRef} name="edgeTypeInput" placeholder="Edges Type" /></p>
          <br></br>
          {sidebarFocus == "add-words" && <button id="add-button" onClick={overlayButtonsClick}>add</button>}
          {sidebarFocus == "remove-words" && <button id="remove-button" onClick={overlayButtonsClick}>remove</button>}
        </div>
      )
    }

    if (sidebarFocus == "back-up") {
      return (
        <div className="overlay-card">
          <button id="backup-button" onClick={overlayButtonsClick}>Back up</button>
        </div>
      )
    }

    if (sidebarFocus == "log-in") {
      return (
        <div className="overlay-card">
          <p>Please enter your username and password</p>
          <p>Username: <input ref={usernameInputRef} name="usernameInput" placeholder="Username" /></p>
          <p>Password: <input ref={passwordInputRef} name="passwordInput" placeholder="Password" /></p>
          <br></br>
          <button id="login-button" onClick={overlayButtonsClick}>Submit</button>
        </div>
      )
    } 

    if (sidebarFocus == "get-history") { 
      if (wordHistory == null) {
        return;
      }

      return (
        <div className="overlay-card">
          {wordHistory.slice().reverse().join(', ')}
        </div>
      )
    }

    if (sidebarFocus == "note") {
      console.log("asdfasdf")
      fetchNote(focusWord)
      return (
        <div className="overlay-card">
          {/* <br>{focusWordNote}</br> */}
          <button id="login-button" onClick={overlayButtonsClick}>Submit</button>
        </div>
      )
    } 

    return (<div></div>)
  
  
}

export default OverlayCard;