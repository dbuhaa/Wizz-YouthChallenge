import React, { useEffect, useState } from 'react';
import './LeaderboardScreen.css';
import { getRewardForRank } from '../utils/rewards';
import { supabase } from '../supabaseClient';

export default function LeaderboardScreen({ onBack }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [viewLimit, setViewLimit] = useState(50);
  const [isLoading, setIsLoading] = useState(true);
  
  const myUserId = localStorage.getItem('wizzRouteRushUserId') || '';
  const myUsername = localStorage.getItem('wizzRouteRushUsername') || '';

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('leaderboard')
          .select('id, username, score')
          .order('score', { ascending: false })
          .limit(viewLimit);

        if (error) {
          console.error('Error fetching leaderboard:', error);
          setLeaderboard([]);
        } else {
          // Assign ranks and precise rewards mapped from Excel
          const ranked = (data || []).map((entry, index) => {
            const currentRank = index + 1;
            return {
              name: entry.username,
              score: entry.score,
              isLocal: entry.id === myUserId,
              rank: currentRank,
              reward: getRewardForRank(currentRank)
            };
          });
          setLeaderboard(ranked);
        }
      } catch (err) {
        console.error('Failed to fetch leaderboard.', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLeaderboard();
  }, [viewLimit, myUsername]);

  return (
    <div className="leaderboard-screen screen">
      <div className="leaderboard-header">
        <h2>Global Rankings</h2>
        <p>Top 200 win WDC prizes every week!</p>
      </div>

      <div className="leaderboard-tabs">
        <button 
           className={viewLimit === 50 ? "active-tab" : ""} 
           onClick={() => setViewLimit(50)}
        >
          Top 50
        </button>
        <button 
           className={viewLimit === 200 ? "active-tab" : ""} 
           onClick={() => setViewLimit(200)}
        >
          Top 200
        </button>
      </div>

      <div className="leaderboard-list">
        {isLoading ? (
          <div className="leaderboard-loading">Loading live scores...</div>
        ) : leaderboard.length === 0 ? (
          <div className="leaderboard-loading">No scores yet. Be the first!</div>
        ) : (
          leaderboard.map((entry, idx) => (
            <div key={idx} className={`leaderboard-item ${entry.rank <= 3 ? 'top-tier' : ''} ${entry.isLocal ? 'highlight-local' : ''}`}>
              <div className="rank">#{entry.rank}</div>
              <div className="name">{entry.name}</div>
              <div className="score-reward">
                <span className="score">{entry.score.toLocaleString()} pts</span>
                <span className="reward">{entry.reward}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <button className="back-button" onClick={onBack}>Back to Menu</button>
    </div>
  );
}
