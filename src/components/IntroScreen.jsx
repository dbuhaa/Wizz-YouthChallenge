import React, { useState } from 'react';
import './IntroScreen.css';
import { supabase } from '../supabaseClient';

export default function IntroScreen({ userId, onComplete, isSettings = false, onBack = null }) {
  const [username, setUsername] = useState(() => localStorage.getItem('wizzRouteRushUsername') || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = username.trim();
    if (trimmedName.length > 0) {
      setIsSubmitting(true);
      
      try {
        // Fetch current IP to enforce "one user per IP" requirement
        let currentIp = '';
        try {
          const ipRes = await fetch('https://api.ipify.org?format=json');
          const ipData = await ipRes.json();
          currentIp = ipData.ip;
        } catch (ipErr) {
          console.error("Failed to fetch IP:", ipErr);
        }

        // 1. Check if this username already exists
        const { data: nameMatch } = await supabase
          .from('leaderboard')
          .select('id')
          .eq('username', trimmedName)
          .maybeSingle();

        // 2. ALSO check if this IP already has a registered user
        let ipMatch = null;
        if (currentIp) {
          const { data } = await supabase
            .from('leaderboard')
            .select('id')
            .eq('ip', currentIp)
            .maybeSingle();
          ipMatch = data;
        }

        let finalUserId = userId;

        // Adoption logic: prioritze IP match then Name match
        // Only adopt if we are currently "anonymous" or "new"
        const isNewUser = !localStorage.getItem('wizzRouteRushUsername');
        
        if (isNewUser) {
          if (ipMatch && ipMatch.id !== userId) {
            finalUserId = ipMatch.id;
          } else if (nameMatch && nameMatch.id !== userId) {
            finalUserId = nameMatch.id;
          }
        } else {
          // If we ARE an existing user (in settings), we check if the name is taken by SOMEONE ELSE
          if (nameMatch && nameMatch.id !== userId) {
            alert("This username is already taken. Please choose another one.");
            setIsSubmitting(false);
            return;
          }
        }

        if (finalUserId !== userId) {
           localStorage.setItem('wizzRouteRushUserId', finalUserId);
        }

        // Prepare update data
        const updateData = { 
          id: finalUserId, 
          username: trimmedName 
        };
        
        // Only include IP if we found one
        if (currentIp) {
          updateData.ip = currentIp;
        }

        // Sync to Supabase using the persistent ID
        const { error } = await supabase
          .from('leaderboard')
          .upsert(updateData, { onConflict: 'id' });

        if (error) {
          console.error("Failed to sync username:", error);
          alert("Error saving username. Please try again.");
          setIsSubmitting(false);
          return;
        }

        // Save locally only after DB success
        localStorage.setItem('wizzRouteRushUsername', trimmedName);
        onComplete(trimmedName);
      } catch (err) {
        console.error("Internal error syncing username:", err);
        setIsSubmitting(false);
      }
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
