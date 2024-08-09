import React from 'react';
import './DescriptionCard.css';

function DescriptionCard({ title, description }) {
  return (
    <div className="description-card">
      <h1 className="description-title">{title}</h1>
      <p className="description-text">{description}</p>
    </div>
  );
}

export default DescriptionCard;