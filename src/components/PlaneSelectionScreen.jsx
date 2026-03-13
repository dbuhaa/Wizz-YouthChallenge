import React, { useState } from 'react';
import './PlaneSelectionScreen.css';

export default function PlaneSelectionScreen({ onSelectPlane, onBack }) {
  const [selectedPlane, setSelectedPlane] = useState('a320neo'); // 'a320neo' or 'a321neo'

  return (
    <div className="selection-screen screen">
      <div className="selection-header">
        <h2>Select Aircraft</h2>
        <p>Choose your Wizz Air plane model</p>
      </div>

      <div className="plane-options">
        <label className={`plane-card ${selectedPlane === 'a320neo' ? 'active' : ''}`}>
          <input 
            type="radio" 
            name="planeSelect" 
            value="a320neo"
            checked={selectedPlane === 'a320neo'}
            onChange={() => setSelectedPlane('a320neo')}
            className="hidden-radio"
          />
          <img src="/plane.png" alt="A320neo" className="plane-preview" />
          <div className="plane-details">
            <h3>Airbus A320neo</h3>
            <p>Nimble and classic</p>
          </div>
        </label>

        <label className={`plane-card ${selectedPlane === 'a321neo' ? 'active' : ''}`}>
          <input 
            type="radio" 
            name="planeSelect" 
            value="a321neo"
            checked={selectedPlane === 'a321neo'}
            onChange={() => setSelectedPlane('a321neo')}
            className="hidden-radio"
          />
          <img src="/plane_a321.png" alt="A321neo" className="plane-preview long" />
          <div className="plane-details">
            <h3>Airbus A321neo</h3>
            <p>Extended fuselage, larger hitbox but 10% score bonus!</p>
          </div>
        </label>
      </div>

      <div className="selection-actions">
        <button className="start-run-button" onClick={() => onSelectPlane(selectedPlane)}>
          Start Flight
        </button>
        <button className="back-button" onClick={onBack}>
          Back to Menu
        </button>
      </div>
    </div>
  );
}
