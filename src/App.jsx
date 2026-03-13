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

    if (username) {
      try {
        // Check if user already exists in DB
        const { data, error } = await supabase
          .from('leaderboard')
          .select('score')
          .eq('username', username)
          .maybeSingle();

        if (data) {
          // Update only if the new score is higher than their database score
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
            setCurrentScreen('menu');
          }}
        />
      )}

      {currentScreen === 'settings' && (
        <IntroScreen 
          isSettings={true}
          onComplete={(username) => {
            setCurrentScreen('menu');
          }}
          onBack={() => setCurrentScreen('menu')}
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
