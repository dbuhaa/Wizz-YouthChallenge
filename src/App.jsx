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

import { getCookie, setCookie } from './utils/cookies'

const BGM_PATH = `${import.meta.env.BASE_URL}songs/bgm.mp3`;

function App() {
  const [userId, setUserId] = useState(() => {
    // Advanced Identity: Check strictly in order
    let id = localStorage.getItem('wizzRouteRushUserId') || getCookie('wizzRouteRushUserId');
    
    if (!id) {
      id = crypto.randomUUID();
    }
    
    // Always sync both for durability
    localStorage.setItem('wizzRouteRushUserId', id);
    setCookie('wizzRouteRushUserId', id);
    return id;
  });

  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('wizzRouteRushMuted') === 'true');
  const [bgm] = useState(() => {
    const audio = new Audio(BGM_PATH);
    audio.loop = true;
    return audio;
  });

  const toggleMute = () => {
    setIsMuted(prev => {
      const next = !prev;
      localStorage.setItem('wizzRouteRushMuted', next);
      if (next) bgm.pause();
      else bgm.play().catch(e => console.warn("Autoplay blocked", e));
      return next;
    });
  };

  // Start music on first interaction if not muted
  useEffect(() => {
    const startAudio = () => {
      if (!isMuted) {
        bgm.play().catch(e => console.warn("Start audio failed:", e));
      }
      window.removeEventListener('pointerdown', startAudio);
      window.removeEventListener('keydown', startAudio);
    };
    window.addEventListener('pointerdown', startAudio);
    window.addEventListener('keydown', startAudio);
    return () => {
      window.removeEventListener('pointerdown', startAudio);
      window.removeEventListener('keydown', startAudio);
    };
  }, [bgm, isMuted]);

  const [currentScreen, setCurrentScreen] = useState(() => {
    return localStorage.getItem('wizzRouteRushUsername') ? 'menu' : 'intro';
  }); 
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
          setUserId={setUserId}
          onComplete={(username) => {
            setCurrentScreen('menu');
          }}
        />
      )}

      {currentScreen === 'settings' && (
        <IntroScreen 
          userId={userId}
          setUserId={setUserId}
          isSettings={true}
          isMuted={isMuted}
          toggleMute={toggleMute}
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
          isMuted={isMuted}
          toggleMute={toggleMute}
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
        <GameScreen 
          onGameOver={handleGameOver} 
          onMenu={() => setCurrentScreen('menu')}
          activePlane={activePlane} 
          isMuted={isMuted}
          toggleMute={toggleMute}
        />
      )}
      
      {currentScreen === 'gameover' && (
        <GameOverScreen 
          userId={userId}
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
