import React from 'react';
import './OverlayCard.css';

function OverlayCard({ descriptionData, sidebarFocus }) {
  const handleWordEdgeSubmit = e => {
    e.preventDefault()
    const form = e.target
    const formData = new FormData(form)
    const formJson = Object.fromEntries(formData.entries())
    let word = String(formJson.wordInput)
    console.log(word)
  }

  switch (sidebarFocus) {
    case "description":
      return (
        <div className="overlay-card">
          <h1 className="overlay-title">{descriptionData.title}</h1>
          <p className="overlay-text">{descriptionData.description}</p>
        </div>
      )
    case "add-word":
      return (
        <div className="overlay-card">
          <form method="post" onSubmit={handleWordEdgeSubmit}>
            <input name="wordInput" defaultValue="word" />
            <button type="submit">add</button>
          </form>
        </div>
      )
    default:
      return (<div></div>)
  }
  
}

export default OverlayCard;