import React, { useState } from 'react';
import './IntroScreen.css';

export default function IntroScreen({ onComplete, isSettings = false, onBack = null }) {
  const [username, setUsername] = useState(() => localStorage.getItem('wizzRouteRushUsername') || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedName = username.trim();
    if (trimmedName.length > 0) {
      setIsSubmitting(true);
      // Save locally to ensure we don't ask again on this device
      localStorage.setItem('wizzRouteRushUsername', trimmedName);
      onComplete(trimmedName);
    }
  };

  return (
    <div className="intro-screen screen">
      <img src={`${import.meta.env.BASE_URL}wizz_logo.svg`} alt="WIZZ Logo" className="intro-logo" />
      <h1 className="intro-title">{isSettings ? 'Settings' : 'Welcome Aboard!'}</h1>
      <p className="intro-subtitle">
        {isSettings 
          ? 'Change your current leaderboard username here.' 
          : 'Before we take off, please choose a username for the global leaderboard.'}
      </p>
      
      <form className="intro-form" onSubmit={handleSubmit}>
        <input 
          type="text" 
          className="intro-input" 
          placeholder="Enter Username..." 
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          maxLength={15}
          disabled={isSubmitting}
          autoFocus
        />
        <div className="intro-actions" style={{ display: 'flex', gap: '10px', width: '100%', flexDirection: 'column' }}>
          <button 
            type="submit" 
            className="intro-button"
            disabled={username.trim().length === 0 || isSubmitting}
          >
            {isSubmitting ? 'Saving...' : (isSettings ? 'Save Settings' : 'Start Game')}
          </button>
          
          {isSettings && (
            <button 
              type="button" 
              className="intro-button secondary"
              style={{ backgroundColor: 'transparent', border: '2px solid white', marginTop: '10px' }}
              onClick={onBack}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
