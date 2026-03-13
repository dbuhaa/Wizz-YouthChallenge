import React, { useState } from 'react';
import './IntroScreen.css';

export default function IntroScreen({ onComplete }) {
  const [username, setUsername] = useState('');
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
      <h1 className="intro-title">Welcome Aboard!</h1>
      <p className="intro-subtitle">Before we take off, please choose a username for the global leaderboard.</p>
      
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
        <button 
          type="submit" 
          className="intro-button"
          disabled={username.trim().length === 0 || isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Start Game'}
        </button>
      </form>
    </div>
  );
}
