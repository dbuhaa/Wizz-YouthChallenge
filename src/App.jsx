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
  const [userId] = useState(() => {
    let id = localStorage.getItem('wizzRouteRushUserId');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('wizzRouteRushUserId', id);
    }
    return id;
  });

  const [currentScreen, setCurrentScreen] = useState(() => {
    return localStorage.getItem('wizzRouteRushUsername') ? 'menu' : 'intro';
  }); // 'intro', 'menu', 'select', 'game', 'gameover', 'leaderboard', 'wdc-info'
  const [lastScore, setLastScore] = useState(0);
  const [activePlane, setActivePlane] = useState('a320neo');

  const handleGameOver = async (score) => {
    setLastScore(score);
    setCurrentScreen('gameover');

    const username = localStorage.getItem('wizzRouteRushUsername');

    if (username && userId) {
      try {
        // Upsert by ID to ensure name changes don't create duplicate entries
        // and that history is preserved.
        const { data, error: fetchError } = await supabase
          .from('leaderboard')
          .select('score')
          .eq('id', userId)
          .maybeSingle();

        if (data) {
          // Update only if higher score
          if (score > data.score) {
            await supabase
              .from('leaderboard')
              .update({ score, username }) // Also update name in case it changed
              .eq('id', userId);
          } else {
            // Even if score isn't higher, still update the name to reflect any changes
            await supabase
              .from('leaderboard')
              .update({ username })
              .eq('id', userId);
          }
        } else {
          // New user entry with our pre-generated ID
          await supabase.from('leaderboard').insert([{ id: userId, username, score }]);
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
          userId={userId}
          onComplete={(username) => {
            setCurrentScreen('menu');
          }}
        />
      )}

      {currentScreen === 'settings' && (
        <IntroScreen 
          userId={userId}
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
