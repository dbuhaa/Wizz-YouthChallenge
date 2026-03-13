import React, { useEffect, useState } from 'react';
import './LeaderboardScreen.css';
import { getRewardForRank } from '../utils/rewards';

const baseMockLeaderboard = [
  { name: "Ionut P.", score: 45200 },
  { name: "Maria D.", score: 41050 },
  { name: "Alex V.", score: 39800 },
  { name: "Elena G.", score: 31200 },
  { name: "Andrei S.", score: 25400 },
  { name: "Diana M.", score: 18900 }
];

// Generate more mock entries to fill out a top 200
const extendedMockLeaderboard = [...baseMockLeaderboard];
for (let i = 7; i <= 200; i++) {
  extendedMockLeaderboard.push({
    name: `Player ${i}`,
    score: Math.floor(18000 - i * 80) + Math.floor(Math.random() * 50)
  });
}

export default function LeaderboardScreen({ onBack }) {
  const [leaderboard, setLeaderboard] = useState([]);
  const [viewLimit, setViewLimit] = useState(50);

  useEffect(() => {
    // Load local scores
    const localScores = JSON.parse(localStorage.getItem('wizzRouteRushScores') || '[]');
    
    // Combine local scores with mock scores
    const combined = [...extendedMockLeaderboard];
    localScores.forEach(local => {
      combined.push({ name: "YOU", score: local.score, isLocal: true });
    });

    // Sort descending by score
    combined.sort((a, b) => b.score - a.score);

    // Assign ranks and precise rewards mapped from Excel
    const ranked = combined.map((entry, index) => {
      const currentRank = index + 1;
      return {
        ...entry,
        rank: currentRank,
        reward: getRewardForRank(currentRank)
      };
    });

    // Keep top viewLimit
    setLeaderboard(ranked.slice(0, viewLimit));
  }, [viewLimit]);

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
        {leaderboard.map((entry, idx) => (
          <div key={idx} className={`leaderboard-item ${entry.rank <= 3 ? 'top-tier' : ''} ${entry.isLocal ? 'highlight-local' : ''}`}>
            <div className="rank">#{entry.rank}</div>
            <div className="name">{entry.name}</div>
            <div className="score-reward">
              <span className="score">{entry.score.toLocaleString()} pts</span>
              <span className="reward">{entry.reward}</span>
            </div>
          </div>
        ))}
      </div>

      <button className="back-button" onClick={onBack}>Back to Menu</button>
    </div>
  );
}
