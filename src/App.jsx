import { useState } from 'react'
import './App.css'
import MenuScreen from './components/MenuScreen'
import LeaderboardScreen from './components/LeaderboardScreen'
import GameOverScreen from './components/GameOverScreen'
import GameScreen from './components/GameScreen'
import PlaneSelectionScreen from './components/PlaneSelectionScreen'
import WdcInfoScreen from './components/WdcInfoScreen'

function App() {
  const [currentScreen, setCurrentScreen] = useState('menu'); // 'menu', 'select', 'game', 'gameover', 'leaderboard', 'wdc-info'
  const [lastScore, setLastScore] = useState(0);
  const [activePlane, setActivePlane] = useState('a320neo');

  const handleGameOver = (score) => {
    setLastScore(score);
    setCurrentScreen('gameover');

    // Save score to local storage for the prototype leaderboard
    const localScores = JSON.parse(localStorage.getItem('wizzRouteRushScores') || '[]');
    localScores.push({ score: score, date: new Date().toISOString() });
    localStorage.setItem('wizzRouteRushScores', JSON.stringify(localScores));
  };

  const handleStartRun = (planeId) => {
    setActivePlane(planeId);
    setCurrentScreen('game');
  };

  return (
    <div className="app-container">
      {currentScreen === 'menu' && (
        <MenuScreen 
          onStartGame={() => setCurrentScreen('select')}
          onShowLeaderboard={() => setCurrentScreen('leaderboard')}
          setCurrentScreen={setCurrentScreen}
        />
      )}
      
      {currentScreen === 'select' && (
        <PlaneSelectionScreen 
          onSelectPlane={handleStartRun}
          onBack={() => setCurrentScreen('menu')}
        />
      )}
      
      {currentScreen === 'leaderboard' && (
        <LeaderboardScreen 
          onBack={() => setCurrentScreen('menu')}
        />
      )}

      {currentScreen === 'wdc-info' && (
        <WdcInfoScreen 
          onBack={() => setCurrentScreen('menu')}
        />
      )}
      
      {currentScreen === 'game' && (
        <GameScreen onGameOver={handleGameOver} activePlane={activePlane} />
      )}
      
      {currentScreen === 'gameover' && (
        <GameOverScreen 
          score={lastScore}
          onRestart={() => setCurrentScreen('game')}
          onMenu={() => setCurrentScreen('menu')}
          onShowLeaderboard={() => setCurrentScreen('leaderboard')}
        />
      )}
    </div>
  )
}

export default App
