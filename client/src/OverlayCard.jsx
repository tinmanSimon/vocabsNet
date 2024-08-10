import './OverlayCard.css';
import { React, useState , useEffect, useRef, useCallback} from 'react'

function OverlayCard({ descriptionData, sidebarFocus, callbackFunc }) {

  const wordInputRef = useRef(null)
  const searchInputRef = useRef(null)

  const overlayButtonsClick = e => {
    switch (e.target.id) {
      case "add-button":
        if (wordInputRef.current.value == "") return
        callbackFunc({
          "word" : wordInputRef.current.value,
          "method" : "add-words"
        })

      case "search-button":
        if (searchInputRef.current.value == "") return
        callbackFunc({
          "word" : searchInputRef.current.value,
          "method" : "search-word"
        })
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
          <input ref={wordInputRef} name="wordInput" placeholder="Word" />
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