import React, { useEffect, useState } from 'react';
import './GameOverScreen.css';
import { getRewardForRank, getRewardTierClass } from '../utils/rewards';
import { supabase } from '../supabaseClient';

export default function GameOverScreen({ score, userId, onRestart, onMenu, onShowLeaderboard }) {
  const [playerRank, setPlayerRank] = useState(null);
  const [totalPlayers, setTotalPlayers] = useState(0);
  const [isLoadingRank, setIsLoadingRank] = useState(true);
  const [highScore, setHighScore] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      setIsLoadingRank(true);
      try {
        // 1. Fetch current player's record to get their global high score
        const { data: userData } = await supabase
          .from('leaderboard')
          .select('score')
          .eq('id', userId)
          .maybeSingle();
        
        const currentHighScore = userData?.score || score;
        setHighScore(currentHighScore);

        // 2. Calculate rank based on HIGH SCORE
        const { count: higherScoresCount } = await supabase
          .from('leaderboard')
          .select('*', { count: 'exact', head: true })
          .gt('score', currentHighScore);

        const calculatedRank = (higherScoresCount || 0) + 1;
        setPlayerRank(calculatedRank);

        // 3. Get total number of players
        const { count: total } = await supabase
          .from('leaderboard')
          .select('*', { count: 'exact', head: true });
          
        // Ensure total count is at least as high as our rank to avoid "#6 out of 5" confusion
        setTotalPlayers(Math.max(total || 0, calculatedRank));

      } catch (err) {
         console.error("Failed to fetch ranking stats:", err);
      } finally {
         setIsLoadingRank(false);
      }
    };

    fetchStats();
  }, [score, userId]);

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
        <div className="score-summary">
          <div className="score-item">
            <span>Score</span>
            <strong>{score.toLocaleString()}</strong>
          </div>
          <div className="score-item highlight">
            <span>High Score</span>
            <strong>{highScore.toLocaleString()}</strong>
          </div>
        </div>
        
        {isLoadingRank ? (
           <div className="rank-indicator" style={{ opacity: 0.7 }}>
             Fetching global position...
           </div>
        ) : (
          <div className="rank-indicator">
             Your best is <strong>#{playerRank}</strong> out of {totalPlayers} pilots!
          </div>
        )}
      </div>

      <div className={`reward-box ${prizeTier}`}>
        <h3>Global Reward Tier</h3>
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
