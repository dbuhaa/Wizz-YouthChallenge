import { useState, useEffect } from 'react'
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

  const [currentScreen, setCurrentScreen] = useState('loading'); 
  const [lastScore, setLastScore] = useState(0);
  const [activePlane, setActivePlane] = useState('a320neo');

  // Startup identity verification: Detect if our userId was hijacked by the old
  // IP convergence bug. If the DB record has a different name, fork off a new identity.
  useEffect(() => {
    const verifyIdentity = async () => {
      const savedName = (localStorage.getItem('wizzRouteRushUsername') || '').trim();
      
      // No username saved → new user, go to intro
      if (!savedName) {
        setCurrentScreen('intro');
        return;
      }

      try {
        const { data } = await supabase
          .from('leaderboard')
          .select('username')
          .eq('id', userId)
          .maybeSingle();

        if (data && data.username !== savedName) {
          // DB record exists but has a DIFFERENT name → someone else took over our userId
          // via the old IP merge. Fork: generate a fresh ID for THIS user.
          console.warn(`Identity mismatch: local="${savedName}" vs db="${data.username}". Creating fresh identity.`);
          const newId = crypto.randomUUID();
          localStorage.setItem('wizzRouteRushUserId', newId);
          setCookie('wizzRouteRushUserId', newId);
          setUserId(newId);
          // Send to intro so they can re-register under the new ID
          setCurrentScreen('intro');
          return;
        }
      } catch (err) {
        console.warn("Identity check failed, proceeding normally:", err);
      }

      // Everything checks out — go to menu
      setCurrentScreen('menu');
    };

    verifyIdentity();
  }, []); // Only run once on mount

  const handleGameOver = async (score) => {
    setLastScore(score);
    setCurrentScreen('gameover');

    if (userId) {
      try {
        // Only update score — NEVER overwrite username here.
        // Username is managed exclusively through IntroScreen/Settings.
        // This prevents two people on the same device from overwriting each other's names.
        const { data, error: fetchError } = await supabase
          .from('leaderboard')
          .select('score')
          .eq('id', userId)
          .maybeSingle();

        if (data) {
          // Update only if this run beat the high score
          if (score > data.score) {
            await supabase
              .from('leaderboard')
              .update({ score })
              .eq('id', userId);
          }
        } else {
          // Brand new user — insert with current username
          const username = localStorage.getItem('wizzRouteRushUsername');
          if (username) {
            await supabase.from('leaderboard').insert([{ id: userId, username, score }]);
          }
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
      {currentScreen === 'loading' && (
        <div className="screen" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--wizz-blue)' }}>
          <img src={`${import.meta.env.BASE_URL}wizz_logo.svg`} alt="Loading..." style={{ width: '120px', opacity: 0.8 }} />
        </div>
      )}

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
