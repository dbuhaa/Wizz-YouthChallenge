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
        // 1. Fetch current IP (optional, for recovery)
        let currentIp = '';
        try {
          const ipRes = await fetch('https://api.ipify.org?format=json');
          const ipData = await ipRes.json();
          currentIp = ipData.ip;
        } catch (ipErr) {
          console.error("Failed to fetch IP:", ipErr);
        }

        // 2. Fetch all candidates for convergence (ID, Username, OR IP)
        let matches = [];
        let ipColumnExists = true;

        try {
          // Attempt a robust search if IP column exists
          const query = supabase.from('leaderboard').select('*');
          
          // Logic: 
          // 1. Matches this specific ID (Always the same person)
          // 2. Matches BOTH this Username AND this IP (Account recovery for the SAME person)
          if (currentIp && ipColumnExists) {
            query.or(`id.eq.${userId},and(username.eq.${trimmedName},ip.eq.${currentIp})`);
          } else {
            query.or(`id.eq.${userId},username.eq.${trimmedName}`);
          }
          
          const { data, error: queryError } = await query;
          
          if (queryError) {
             // If error is specifically about the 'ip' column, fallback
             if (queryError.message.includes('column "ip" does not exist')) {
                ipColumnExists = false;
                const { data: fallbackData } = await supabase
                  .from('leaderboard')
                  .select('*')
                  .or(`id.eq.${userId},username.eq.${trimmedName}`);
                matches = fallbackData || [];
             } else {
                throw queryError;
             }
          } else {
            matches = data || [];
          }
        } catch (searchErr) {
          console.warn("Search for matches failed, falling back to minimal sync:", searchErr);
          // Last resort fallback
          const { data } = await supabase.from('leaderboard').select('*').eq('id', userId);
          matches = data || [];
        }

        // 3. Determine Final Identity and Max Score
        let finalUserId = userId;
        let finalScore = 0;

        if (matches.length > 0) {
          // Survivor is the record with the highest score
          const survivor = matches.reduce((prev, curr) => (prev.score > curr.score) ? prev : curr);
          finalUserId = survivor.id;
          finalScore = survivor.score;

          // converge logic: delete all others
          const idsToDelete = matches.map(m => m.id).filter(id => id !== finalUserId);
          if (idsToDelete.length > 0) {
            console.log("Converging accounts, removing duplicates:", idsToDelete);
            await supabase.from('leaderboard').delete().in('id', idsToDelete);
          }
        }

        // 4. Adoption: Sync local and global state
        if (finalUserId !== userId) {
          localStorage.setItem('wizzRouteRushUserId', finalUserId);
          if (setUserId) setUserId(finalUserId);
        }

        // 5. Upsert final survivor record
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
          // If we mis-detected the 'ip' column, try one last time without it
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
        alert(`Error saving settings: ${err.message || 'unknown error'}.\n\nIf you see 'column ip does not exist', please ask the developer to run the database migration.`);
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
