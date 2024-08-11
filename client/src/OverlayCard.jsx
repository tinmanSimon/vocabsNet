import './OverlayCard.css';
import { React, useState , useEffect, useRef, useCallback} from 'react'

function OverlayCard({ descriptionData, sidebarFocus, callbackFunc }) {

  const wordInputRef = useRef(null)
  const searchInputRef = useRef(null)
  const edgesInputRef = useRef(null)
  const edgeTypeInputRef = useRef(null)

  const overlayButtonsClick = e => {
    switch (e.target.id) {
      case "add-button":
        if (wordInputRef.current == null) return
        if (wordInputRef.current.value == "" && edgesInputRef.current.value == "") return
        callbackFunc({
          "words" : wordInputRef.current.value,
          "edges" : edgesInputRef.current.value,
          "edgetype" : edgeTypeInputRef.current.value,
          "method" : "add-words"
        })
        wordInputRef.current.value = ""
        edgesInputRef.current.value = ""
        edgeTypeInputRef.current.value = ""
        break

      case "search-button":
        if (searchInputRef.current == null || searchInputRef.current.value == "") return
        callbackFunc({
          "words" : searchInputRef.current.value,
          "method" : "search-word"
        })
        break
    }
  }

  switch (sidebarFocus) {
    case "description":
      return (
        <div className="overlay-card">
          <h1 className="overlay-title">{descriptionData.title}</h1>
          <p className="overlay-text">{descriptionData.description}</p>
        </div>
      )
    case "add-words":
      return (
        <div className="overlay-card">
          <p>To add multiple words, separate words with ","</p>
          <p>Words: <input ref={wordInputRef} name="wordInput" placeholder="Word" /></p>
          <p>Single edge is source text separated by a single space. <br></br> Multiple edges are separate with ","</p>
          <p>Edges: <input ref={edgesInputRef} name="edgesInput" placeholder="Edges" /></p>
          <p>Edge type: <input ref={edgeTypeInputRef} name="edgeTypeInput" placeholder="Edges Type" /></p>
          <br></br>
          <button id="add-button" onClick={overlayButtonsClick}>add</button>
        </div>
      )
      case "search-words":
        return (
          <div className="overlay-card">
            <input ref={searchInputRef} name="searchInput" placeholder="Search" />
            <button id="search-button" onClick={overlayButtonsClick}>Search</button>
          </div>
        )
    default:
      return (<div></div>)
  }
  
}

export default OverlayCard;