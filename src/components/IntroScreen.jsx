import React, { useState } from 'react';
import './IntroScreen.css';
import { supabase } from '../supabaseClient';

export default function IntroScreen({ userId, setUserId, onComplete, isSettings = false, onBack = null }) {
  const [username, setUsername] = useState(() => localStorage.getItem('wizzRouteRushUsername') || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = username.trim();
    if (trimmedName.length > 0) {
      setIsSubmitting(true);
      
      try {
        // Fetch current IP to enforce "one user per IP" requirement and convergence
        let currentIp = '';
        try {
          const ipRes = await fetch('https://api.ipify.org?format=json');
          const ipData = await ipRes.json();
          currentIp = ipData.ip;
        } catch (ipErr) {
          console.error("Failed to fetch IP:", ipErr);
        }

        // --- CONVERGENCE LOGIC ---
        // Find ALL records that match either this IP or the chosen username
        let matches = [];
        const isNewUser = !localStorage.getItem('wizzRouteRushUsername');

        if (currentIp) {
          const { data } = await supabase
            .from('leaderboard')
            .select('*')
            .or(`ip.eq.${currentIp},username.eq.${trimmedName}`);
          matches = data || [];
        } else {
          const { data } = await supabase
            .from('leaderboard')
            .select('*')
            .eq('username', trimmedName);
          matches = data || [];
        }

        let finalUserId = userId;
        let finalScore = 0;

        if (matches.length > 0) {
          // 1. Determine the "Survivor" (record with the highest score)
          const survivor = matches.reduce((prev, curr) => (prev.score > curr.score) ? prev : curr);
          
          finalUserId = survivor.id;
          finalScore = survivor.score;

          // 2. Converge: Delete all OTHER records found in the match
          const idsToDelete = matches
            .map(m => m.id)
            .filter(id => id !== finalUserId);

          if (idsToDelete.length > 0) {
            console.log("Converging accounts, deleting duplicates:", idsToDelete);
            await supabase.from('leaderboard').delete().in('id', idsToDelete);
          }
        }

        // 3. Adoption: Update local storage and state with the survivor (or current) ID
        if (finalUserId !== userId) {
          localStorage.setItem('wizzRouteRushUserId', finalUserId);
          if (setUserId) setUserId(finalUserId);
        }

        // 4. Upsert the final state
        const updateData = { 
          id: finalUserId, 
          username: trimmedName,
          score: finalScore // Preserve the best score found during convergence
        };
        if (currentIp) updateData.ip = currentIp;

        const { error } = await supabase
          .from('leaderboard')
          .upsert(updateData, { onConflict: 'id' });

        if (error) {
          console.error("Failed to sync username/convergence:", error);
          alert("Error saving settings. Please verify your internet connection.");
          setIsSubmitting(false);
          return;
        }

        // Save locally only after DB success
        localStorage.setItem('wizzRouteRushUsername', trimmedName);
        onComplete(trimmedName);
      } catch (err) {
        console.error("Internal error during convergence:", err);
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
