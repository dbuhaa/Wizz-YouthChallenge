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


  const [currentScreen, setCurrentScreen] = useState('loading'); 
  const [lastScore, setLastScore] = useState(0);
  const [activePlane, setActivePlane] = useState('a320neo');

  // Startup identity verification: Ensure the user is signed in anonymously
  useEffect(() => {
    const initAuth = async () => {
      try {
        console.group("Secure Auth Sync");
        console.log("Initializing secure session...");
        
        // 1. Get existing session or sign in anonymously
        let { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          console.log("No session found, signing in anonymously...");
          const { data, error } = await supabase.auth.signInAnonymously();
          if (error) {
            console.error("Supabase Auth Error:", error.message);
            alert("Security Error: Please ensure Anonymous Auth is enabled in your Supabase Dashboard.");
            throw error;
          }
          session = data.session;
        }

        const authenticatedId = session.user.id;
        console.log("Session verified. Secure ID:", authenticatedId);
        
        // 2. Sync state precisely
        setUserId(authenticatedId);
        localStorage.setItem('wizzRouteRushUserId', authenticatedId);
        setCookie('wizzRouteRushUserId', authenticatedId);

        // 3. Identity Check: If the DB username doesn't match local, go to intro
        const savedName = (localStorage.getItem('wizzRouteRushUsername') || '').trim();
        if (!savedName) {
          console.log("No saved name found, going to intro.");
          setCurrentScreen('intro');
          console.groupEnd();
          return;
        }

        console.log("Verifying profile for:", savedName);
        const { data: profile } = await supabase
          .from('leaderboard')
          .select('username')
          .eq('id', authenticatedId)
          .maybeSingle();

        if (profile && profile.username !== savedName) {
           console.warn("Profile mismatch, requiring intro re-save.");
           setCurrentScreen('intro');
        } else {
           console.log("Identity confirmed. Entering menu.");
           setCurrentScreen('menu');
        }

      } catch (err) {
        console.error("Auth initialization failed:", err);
        setCurrentScreen('intro'); 
      } finally {
        console.groupEnd();
      }
    };

    initAuth();
  }, []);

  const handleGameOver = async (score) => {
    setLastScore(score);
    setCurrentScreen('gameover');

    // Use a fresh check to get the most accurate UID
    const { data: authData } = await supabase.auth.getUser();
    const activeId = authData?.user?.id || userId;

    if (activeId) {
      try {
        const { data } = await supabase
          .from('leaderboard')
          .select('score')
          .eq('id', activeId)
          .maybeSingle();

        if (data) {
          if (score > data.score) {
            await supabase
              .from('leaderboard')
              .update({ score })
              .eq('id', activeId);
          }
        } else {
          const username = localStorage.getItem('wizzRouteRushUsername');
          if (username) {
            await supabase.from('leaderboard').insert([{ id: activeId, username, score }]);
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
        <GameScreen 
          onGameOver={handleGameOver} 
          onMenu={() => setCurrentScreen('menu')}
          activePlane={activePlane} 
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
