import { useState } from 'react'
import './App.css'
import MenuScreen from './components/MenuScreen'
import LeaderboardScreen from './components/LeaderboardScreen'
import GameOverScreen from './components/GameOverScreen'
import GameScreen from './components/GameScreen'
import PlaneSelectionScreen from './components/PlaneSelectionScreen'
import WdcInfoScreen from './components/WdcInfoScreen'
import IntroScreen from './components/IntroScreen'
import { supabase } from './supabaseClient'

function App() {
  const [currentScreen, setCurrentScreen] = useState(() => {
    return localStorage.getItem('wizzRouteRushUsername') ? 'menu' : 'intro';
  }); // 'intro', 'menu', 'select', 'game', 'gameover', 'leaderboard', 'wdc-info'
  const [lastScore, setLastScore] = useState(0);
  const [activePlane, setActivePlane] = useState('a320neo');

  const handleGameOver = async (score) => {
    setLastScore(score);
    setCurrentScreen('gameover');

    const username = localStorage.getItem('wizzRouteRushUsername');
    const localBest = parseInt(localStorage.getItem('wizzRouteRushBest') || '0', 10);

    // If it's a new personal best, save it locally and sync to Supabase
    if (score > localBest) {
      localStorage.setItem('wizzRouteRushBest', score.toString());
      
      if (username) {
        try {
          // Check if user already exists
          const { data, error } = await supabase
            .from('leaderboard')
            .select('score')
            .eq('username', username)
            .single();

          if (data) {
            // Update only if higher (which it should be based on local check)
            if (score > data.score) {
              await supabase.from('leaderboard').update({ score }).eq('username', username);
            }
          } else {
            // New user entry
            await supabase.from('leaderboard').insert([{ username, score }]);
          }
        } catch (err) {
          console.error("Failed to sync score to Supabase", err);
        }
      }
    }
  };

  const handleStartRun = (planeId) => {
    setActivePlane(planeId);
    setCurrentScreen('game');
  };

  return (
    <div className="app-container">
      {currentScreen === 'intro' && (
        <IntroScreen 
          onComplete={(username) => {
            // Username is already saved to localStorage inside IntroScreen
            setCurrentScreen('menu');
          }}
        />
      )}

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
