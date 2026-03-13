import React, { useEffect, useState } from 'react';
import './GameOverScreen.css';
import { getRewardForRank, getRewardTierClass } from '../utils/rewards';
import { supabase } from '../supabaseClient';

export default function GameOverScreen({ score, onRestart, onMenu, onShowLeaderboard }) {
  const [playerRank, setPlayerRank] = useState(null);
  const [isLoadingRank, setIsLoadingRank] = useState(true);

  useEffect(() => {
    const fetchRank = async () => {
      setIsLoadingRank(true);
      try {
        // 1. Get total number of players
        const { count: total, error: countError } = await supabase
          .from('leaderboard')
          .select('*', { count: 'exact', head: true });
          
        if (!countError && total !== null) {
           setTotalPlayers(total);
        }

        // 2. Calculate rank by finding how many players have a STRICTLY GREATER score
        const { count: higherScoresCount, error: rankError } = await supabase
          .from('leaderboard')
          .select('*', { count: 'exact', head: true })
          .gt('score', score);

        if (!rankError && higherScoresCount !== null) {
          // Rank is simply (number of people better than you) + 1
          setPlayerRank(higherScoresCount + 1);
        }
      } catch (err) {
         console.error("Failed to fetch rank from Supabase:", err);
      } finally {
         setIsLoadingRank(false);
      }
    };

    fetchRank();
  }, [score]);

  let prizeText = "Better luck next time! Keep flying.";
  let prizeTier = "participant";

  if (playerRank !== null) {
      prizeText = getRewardForRank(playerRank);
      prizeTier = getRewardTierClass(playerRank);
  }

  return (
    <div className="gameover-screen screen">
      <div className="gameover-header">
        <h2>Run Complete!</h2>
        <div className="final-score">
          <span>Final Score</span>
          <strong>{score.toLocaleString()}</strong>
        </div>
        
        {isLoadingRank ? (
           <div className="rank-indicator" style={{ opacity: 0.7 }}>
             Calculating global rank...
           </div>
        ) : playerRank && (
          <div className="rank-indicator">
             You placed <strong>#{playerRank}</strong> out of {totalPlayers} players!
          </div>
        )}
      </div>

      <div className={`reward-box ${prizeTier}`}>
        <h3>Your Reward Tier</h3>
        <p className="prize-text">{prizeText}</p>
        <button className="leaderboard-link-button" onClick={onShowLeaderboard}>View Leaderboard</button>
      </div>

      <div className="gameover-actions">
        <button className="restart-button" onClick={onRestart}>Fly Again</button>
        <button className="menu-button" onClick={onMenu}>Home</button>
      </div>
    </div>
  );
}
