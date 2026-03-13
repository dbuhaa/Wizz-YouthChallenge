import { useState } from 'react';
import './MenuScreen.css';

export default function MenuScreen({ onStartGame, onShowLeaderboard, setCurrentScreen }) {
  return (
    <div className="menu-screen screen">
      <div className="menu-header">
        <div className="wizz-logo-container">
           <img src={`${import.meta.env.BASE_URL}wizz_logo.svg`} alt="Wizz Air Logo" className="wizz-official-logo" />
        </div>
        <h2 className="menu-title-sub">ROUTE RUSH</h2>
        <p className="menu-subtitle">Race across the network.</p>
        <p className="menu-subtitle">Win real WDC Perks!</p>
      </div>
      
      <div className="menu-plane-preview">
        <div className="plane-mockup">
           <img src={`${import.meta.env.BASE_URL}plane_a321.png`} style={{ height: '100px', transform: 'rotate(45deg)' }} alt="Wizz Air A321neo" />
        </div>
      </div>
      
      <div className="menu-actions">
        <button className="play-button" onClick={onStartGame}>
          <span>Tap to Fly</span>
          <span className="subtitle">Real routes. Real rewards.</span>
        </button>
        
        <button className="wdc-club-button" onClick={() => setCurrentScreen('wdc-info')}>
          <div className="wdc-club-content">
             <span className="wdc-club-label">✈ WIZZ Discount Club</span>
             <span className="wdc-club-sub">See subscription offers & prizes for Top 200!</span>
          </div>
        </button>

        <button className="secondary-button" onClick={onShowLeaderboard}>
          Leaderboard & Prizes
        </button>
      </div>
    </div>
  );
}
