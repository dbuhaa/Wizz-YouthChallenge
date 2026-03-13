import React, { useState } from 'react';
import './IntroScreen.css';
import { supabase } from '../supabaseClient';

export default function IntroScreen({ userId, setUserId, onComplete, isSettings = false, onBack = null, isMuted, toggleMute }) {
  const [username, setUsername] = useState(() => localStorage.getItem('wizzRouteRushUsername') || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedName = username.trim();
    if (trimmedName.length > 0) {
      setIsSubmitting(true);
      
      try {
        // 1. Fetch current IP (optional, for same-device detection)
        let currentIp = '';
        try {
          const ipRes = await fetch('https://api.ipify.org?format=json');
          const ipData = await ipRes.json();
          currentIp = ipData.ip;
        } catch (ipErr) {
          console.error("Failed to fetch IP:", ipErr);
        }

        let ipColumnExists = true;

        // 2. Check if the desired username is already taken by a DIFFERENT user
        //    This prevents score theft — you can't claim someone else's name.
        {
          const { data: nameOwners, error: nameErr } = await supabase
            .from('leaderboard')
            .select('id, username')
            .eq('username', trimmedName);
          
          if (!nameErr && nameOwners && nameOwners.length > 0) {
            const ownedBySomeoneElse = nameOwners.some(r => r.id !== userId);
            if (ownedBySomeoneElse) {
              alert('This username is already taken by another player. Please choose a different one.');
              setIsSubmitting(false);
              return;
            }
          }
        }

        // 3. Find records that belong to THIS person (by ID, or same IP = same device)
        //    We NEVER match by username alone — that would merge different people.
        let myRecords = [];
        try {
          let query = supabase.from('leaderboard').select('*');
          if (currentIp) {
            query = query.or(`id.eq.${userId},ip.eq.${currentIp}`);
          } else {
            query = query.eq('id', userId);
          }
          const { data, error: queryError } = await query;

          if (queryError) {
            if (queryError.message.includes('column "ip" does not exist')) {
              ipColumnExists = false;
              const { data: fallbackData } = await supabase
                .from('leaderboard')
                .select('*')
                .eq('id', userId);
              myRecords = fallbackData || [];
            } else {
              throw queryError;
            }
          } else {
            myRecords = data || [];
          }
        } catch (searchErr) {
          console.warn("Search failed, falling back to ID-only:", searchErr);
          const { data } = await supabase.from('leaderboard').select('*').eq('id', userId);
          myRecords = data || [];
        }

        // 4. Converge same-person records: keep the one with the highest score
        let finalUserId = userId;
        let finalScore = 0;

        if (myRecords.length > 0) {
          finalScore = Math.max(...myRecords.map(m => m.score || 0));

          const currentRecord = myRecords.find(m => m.id === userId);
          if (currentRecord) {
            finalUserId = userId;
          } else {
            // Adopt the best existing record from same device
            const bestRecord = myRecords.reduce((prev, curr) => (prev.score > curr.score) ? prev : curr);
            finalUserId = bestRecord.id;
          }

          // Delete duplicate same-person records
          const idsToDelete = myRecords.map(m => m.id).filter(id => id !== finalUserId);
          if (idsToDelete.length > 0) {
            console.log("Converging same-person accounts:", idsToDelete);
            await supabase.from('leaderboard').delete().in('id', idsToDelete);
          }
        }

        // 5. Sync local identity if adopted
        if (finalUserId !== userId) {
          localStorage.setItem('wizzRouteRushUserId', finalUserId);
          if (setUserId) setUserId(finalUserId);
        }

        // 6. Upsert the survivor record with the new username
        const updateData = { 
          id: finalUserId, 
          username: trimmedName,
          score: finalScore
        };
        if (currentIp && ipColumnExists) updateData.ip = currentIp;

        const { error: upsertError } = await supabase
          .from('leaderboard')
          .upsert(updateData, { onConflict: 'id' });

        if (upsertError) {
          if (upsertError.message.includes('column "ip" does not exist')) {
            delete updateData.ip;
            const { error: retryError } = await supabase
              .from('leaderboard')
              .upsert(updateData, { onConflict: 'id' });
            if (retryError) throw retryError;
          } else {
            throw upsertError;
          }
        }

        // Success!
        localStorage.setItem('wizzRouteRushUsername', trimmedName);
        onComplete(trimmedName);
      } catch (err) {
        console.error("Internal sync error:", err);
        alert(`Error saving settings: ${err.message || 'unknown error'}.`);
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
            <>
              <button 
                type="button" 
                className="intro-button secondary"
                style={{ backgroundColor: 'rgba(255,255,255,0.1)', border: '2px solid white', marginTop: '10px' }}
                onClick={toggleMute}
                disabled={isSubmitting}
              >
                {isMuted ? '🔇 Unmute Music' : '🔊 Mute Music'}
              </button>

              <button 
                type="button" 
                className="intro-button secondary"
                style={{ backgroundColor: 'transparent', border: '2px solid white', marginTop: '10px' }}
                onClick={onBack}
                disabled={isSubmitting}
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
