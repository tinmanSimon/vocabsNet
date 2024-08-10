import React from 'react';
import './OverlayCard.css';

function OverlayCard({ title, description }) {
  return (
    <div className="overlay-card">
      <h1 className="overlay-title">{title}</h1>
      <p className="overlay-text">{description}</p>
    </div>
  );
}

export default OverlayCard;