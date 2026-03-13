import React, { useEffect, useState } from 'react';
import './GameOverScreen.css';
import { getRewardForRank, getRewardTierClass } from '../utils/rewards';

const baseMockLeaderboard = [
  { name: "Ionut P.", score: 45200 },
  { name: "Maria D.", score: 41050 },
  { name: "Alex V.", score: 39800 },
  { name: "Elena G.", score: 31200 },
  { name: "Andrei S.", score: 25400 },
  { name: "Diana M.", score: 18900 }
];

export default function GameOverScreen({ score, onRestart, onMenu, onShowLeaderboard }) {
  const [playerRank, setPlayerRank] = useState(null);
  const [totalPlayers, setTotalPlayers] = useState(0);

  useEffect(() => {
    // Calculate final rank directly
    const localScores = JSON.parse(localStorage.getItem('wizzRouteRushScores') || '[]');
    const combined = [...baseMockLeaderboard];
    localScores.forEach(local => {
      combined.push({ name: "YOU", score: local.score, isLocal: true });
    });

    // Make sure current score is in there in case app state hasn't flushed yet
    if (!combined.find(c => c.score === score && c.isLocal)) {
       combined.push({ name: "YOU", score: score, isLocal: true });
    }

    combined.sort((a, b) => b.score - a.score);
    
    // Find the current run's rank (first index matching this score that is local)
    const rankIndex = combined.findIndex(c => c.score === score && c.isLocal);
    setPlayerRank(rankIndex + 1);
    setTotalPlayers(combined.length);
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
        
        {playerRank && (
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
