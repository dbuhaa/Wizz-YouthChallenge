import React, { useEffect, useRef, useState } from 'react';
import './GameScreen.css';

export default function GameScreen({ onGameOver, activePlane = 'a320neo' }) {
  const canvasRef = useRef(null);
  const scoreRef = useRef(null); // Ref for direct DOM mutation
  const [multiplier, setMultiplier] = useState(1);
  let multiplierTimerMs = 0; // Local variable instead of React state

  const [hudShield, setHudShield] = useState(false);
  const [hudSpeedBoost, setHudSpeedBoost] = useState(false);
  const [hudTurbulence, setHudTurbulence] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const width = canvas.parentElement.clientWidth;
    const height = canvas.parentElement.clientHeight;
    
    // Scale for high-DPI displays, but CAP at 1.5 to save massive mobile GPU power
    // Many modern phones are 3x or 4x, rendering a 4K canvas silently and killing FPS
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    
    // Normalize coordinate system to use CSS pixels
    ctx.scale(dpr, dpr);
    
    // Cache the sky gradient (huge performance boost on mobile)
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, '#87CEEB');   // Light sky blue
    skyGrad.addColorStop(0.4, '#5BA3D9'); // Mid blue
    skyGrad.addColorStop(0.8, '#2E75B6'); // Deeper blue
    skyGrad.addColorStop(1, '#1B4F8A');   // Dark horizon

    // Game State
    let animationFrameId;
    let lastTime = performance.now();
    let isGameRunning = true;
    let currentScore = 0;
    
    // Base Speed: Pixels per second
    const INITIAL_SPEED = 600;
    let gameSpeedPPS = INITIAL_SPEED; 
    let elapsedTimeMs = 0;

    // === PERK STATE ===
    let hasShield = false;
    let speedBoostTimeMs = 0;
    const SPEED_BOOST_DURATION_MS = 1000;

    // === TURBULENCE STATE ===
    let turbulenceTimeMs = 0;
    const TURBULENCE_DURATION_MS = 750;
    let lastTurbulenceMilestone = 0;
    let turbulenceShakeX = 0;
    let turbulenceShakeY = 0;

    // === CLOUD SYSTEM ===
    // Offscreen Canvas Optimization: Drawing complex ellipses 24+ times per frame kills mobile GPUs.
    // We draw an idealized cloud *once* tightly to an offscreen buffer, then stamp it as an image.
    const cloudBuffer = document.createElement('canvas');
    cloudBuffer.width = 160;
    cloudBuffer.height = 80;
    const cloudCtx = cloudBuffer.getContext('2d');
    cloudCtx.fillStyle = '#ffffff';
    cloudCtx.beginPath();
    cloudCtx.ellipse(80, 40, 50, 20, 0, 0, Math.PI * 2); // Center main body
    cloudCtx.fill();
    cloudCtx.beginPath();
    cloudCtx.ellipse(50, 45, 25, 15, 0, 0, Math.PI * 2); // Left puff
    cloudCtx.fill();
    cloudCtx.beginPath();
    cloudCtx.ellipse(110, 42, 20, 12, 0, 0, Math.PI * 2); // Right puff
    cloudCtx.fill();

    const clouds = [];
    for (let i = 0; i < 8; i++) {
      clouds.push({
        x: Math.random() * width,
        y: Math.random() * height,
        w: 60 + Math.random() * 100,
        h: 25 + Math.random() * 40,
        speedPPS: 20 + Math.random() * 30, // Pixels per second
        opacity: 0.15 + Math.random() * 0.25
      });
    }

    // === PERK COLLECTIBLES ===
    const perks = []; 

    // Load Sprites
    const baseUrl = import.meta.env.BASE_URL;
    const planeImg = new Image();
    planeImg.src = activePlane === 'a321neo' ? `${baseUrl}plane_a321.png` : `${baseUrl}plane.png`;
    const enemyImg = new Image();
    enemyImg.src = `${baseUrl}enemy_plane.png`;
    const stormImg = new Image();
    stormImg.src = `${baseUrl}storm.png`;
    const coinSmallImg = new Image();
    coinSmallImg.src = `${baseUrl}coin_small.png`;
    const coinMedImg = new Image();
    coinMedImg.src = `${baseUrl}coin_medium.png`;
    const coinLargeImg = new Image();
    coinLargeImg.src = `${baseUrl}coin_large.png`;

    // Player & Lane Object
    const NUM_LANES = 5;
    const laneWidth = width / NUM_LANES;
    const getLaneX = (laneIndex) => (laneIndex * laneWidth) + (laneWidth / 2);

    const player = {
      lane: 2,
      x: getLaneX(2),
      y: height - 120,
      width: activePlane === 'a321neo' ? 90 : 60,
      height: activePlane === 'a321neo' ? 95 : 70
    };

    // Entities Arrays
    const obstacles = [];
    const collectibles = [];
    
    // Spawning timers (ms)
    let timeSinceLastSpawn = 0;

    // === INPUT HANDLERS ===
    const handleKeyDown = (e) => {
      if (turbulenceTimeMs > 0) return;
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        player.lane = Math.max(0, player.lane - 1);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        player.lane = Math.min(NUM_LANES - 1, player.lane + 1);
      }
    };

    const handlePointerDown = (e) => {
      if (turbulenceTimeMs > 0) return;
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const x = clientX - rect.left;
      player.lane = Math.floor(x / laneWidth);
    };

    const handlePointerMove = (e) => {
      if (turbulenceTimeMs > 0) return;
      if(!e.touches && e.buttons !== 1) return;
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const x = clientX - rect.left;
      player.lane = Math.floor(x / laneWidth);
    };

    window.addEventListener('keydown', handleKeyDown);
    canvas.addEventListener('pointerdown', handlePointerDown);
    canvas.addEventListener('pointermove', handlePointerMove);

    // === DRAWING FUNCTIONS ===

    const drawSkyBackground = (dt) => {
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // Scrolling clouds (dt based)
      clouds.forEach(cloud => {
        cloud.y += (cloud.speedPPS + gameSpeedPPS * 0.3) * (dt / 1000);
        if (cloud.y > height + 50) {
          cloud.y = -cloud.h - 20;
          cloud.x = Math.random() * width;
          cloud.w = 60 + Math.random() * 100;
          cloud.h = 25 + Math.random() * 40;
        }

        ctx.globalAlpha = cloud.opacity;
        ctx.drawImage(
          cloudBuffer, 
          cloud.x - cloud.w / 2, 
          cloud.y - cloud.h / 2, 
          cloud.w, 
          cloud.h
        );
        ctx.globalAlpha = 1.0;
      });

      // Lane dividers
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 2;
      ctx.setLineDash([30, 20]);
      const offset = (elapsedTimeMs / 1000 * gameSpeedPPS) % 50;
      for (let lane = 1; lane < NUM_LANES; lane++) {
        const lx = (width * lane) / NUM_LANES;
        ctx.beginPath();
        ctx.moveTo(lx, -50 + offset);
        ctx.lineTo(lx, height + 50);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    };

    const drawPlayer = () => {
      // Shield glow effect
      if (hasShield) {
        ctx.save();
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.8)';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.width * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(0, 255, 136, 0.2)';
        ctx.fill();
        ctx.restore();
      }

      // Speed boost trail
      if (speedBoostTimeMs > 0) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.moveTo(player.x - player.width / 2, player.y + player.height / 2);
        ctx.lineTo(player.x, player.y + player.height / 2 + 30 + Math.random() * 15);
        ctx.lineTo(player.x + player.width / 2, player.y + player.height / 2);
        ctx.fill();
        ctx.restore();
      }

      if (planeImg.complete) {
        ctx.drawImage(
          planeImg,
          player.x - player.width / 2,
          player.y - player.height / 2,
          player.width,
          player.height
        );
      } else {
        ctx.fillStyle = '#c6007e';
        ctx.beginPath();
        ctx.moveTo(player.x, player.y - player.height / 2);
        ctx.lineTo(player.x - player.width / 2, player.y + player.height / 2);
        ctx.lineTo(player.x + player.width / 2, player.y + player.height / 2);
        ctx.fill();
      }
    };

    const drawEntities = () => {
      obstacles.forEach(obs => {
        let drawImg = stormImg;
        if (obs.type === 'enemy') drawImg = enemyImg;

        if (drawImg.complete) {
           ctx.drawImage(drawImg, obs.x - obs.radius * 1.5, obs.y - obs.radius * 1.5, obs.radius * 3, obs.radius * 3);
        } else {
           ctx.fillStyle = obs.type === 'enemy' ? '#888' : '#ff4d4f';
           ctx.fillRect(obs.x - obs.radius, obs.y - obs.radius, obs.radius * 2, obs.radius * 2);
        }
      });

      collectibles.forEach(col => {
        let imgToDraw = coinSmallImg;
        if (col.type === 'medium') imgToDraw = coinMedImg;
        if (col.type === 'large') imgToDraw = coinLargeImg;

        if (imgToDraw.complete) {
           ctx.drawImage(imgToDraw, col.x - col.radius, col.y - col.radius, col.radius * 2, col.radius * 2);
        } else {
           ctx.fillStyle = '#ffd700';
           ctx.beginPath();
           ctx.arc(col.x, col.y, col.radius, 0, Math.PI * 2);
           ctx.fill();
        }
      });

      perks.forEach(perk => {
        const pulse = Math.sin(elapsedTimeMs / 150) * 3;
        const r = perk.radius + pulse;

        if (perk.type === 'shield') {
          ctx.save();
          ctx.fillStyle = 'rgba(0, 255, 136, 0.4)';
          ctx.beginPath();
          ctx.arc(perk.x, perk.y, r + 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#00ff88';
          ctx.beginPath();
          ctx.arc(perk.x, perk.y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          ctx.fillStyle = '#fff';
          ctx.font = `bold ${Math.floor(r)}px Nunito`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🛡', perk.x, perk.y);
        } else if (perk.type === 'speed') {
          ctx.save();
          ctx.fillStyle = 'rgba(255, 215, 0, 0.4)';
          ctx.beginPath();
          ctx.arc(perk.x, perk.y, r + 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffa500';
          ctx.beginPath();
          ctx.arc(perk.x, perk.y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          ctx.fillStyle = '#fff';
          ctx.font = `bold ${Math.floor(r)}px Nunito`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⚡', perk.x, perk.y);
        }
      });
    };

    const drawTurbulenceOverlay = () => {
      if (turbulenceTimeMs <= 0) return;
      const intensity = (turbulenceTimeMs / TURBULENCE_DURATION_MS) * 0.15;
      ctx.fillStyle = `rgba(255, 50, 50, ${intensity})`;
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + Math.sin(elapsedTimeMs / 100) * 0.3})`;
      ctx.font = 'bold 24px Nunito';
      ctx.textAlign = 'center';
      ctx.fillText('⚠ TURBULENCE ⚠', width / 2, 80);
      ctx.restore();
    };

    // === GAME LOGIC (DT BASED) ===
    const updatePlayState = (dt) => {
      const currentMilestone = Math.floor(currentScore / 10000);
      if (currentMilestone > lastTurbulenceMilestone && currentMilestone > 0) {
        if (Math.random() < 0.7) {
          turbulenceTimeMs = TURBULENCE_DURATION_MS;
          setHudTurbulence(true);
          const shiftDir = Math.random() > 0.5 ? 1 : -1;
          const shiftAmount = 1 + Math.floor(Math.random() * 2);
          player.lane = Math.max(0, Math.min(NUM_LANES - 1, player.lane + (shiftDir * shiftAmount)));
        }
        lastTurbulenceMilestone = currentMilestone;
      }

      if (turbulenceTimeMs > 0) {
        turbulenceTimeMs -= dt;
        turbulenceShakeX = (Math.random() - 0.5) * 8;
        turbulenceShakeY = (Math.random() - 0.5) * 6;
        
        // Random drift (~every 200ms)
        if (Math.random() < (dt / 200)) {
          const drift = Math.random() > 0.5 ? 1 : -1;
          player.lane = Math.max(0, Math.min(NUM_LANES - 1, player.lane + drift));
        }
        if (turbulenceTimeMs <= 0) {
          turbulenceShakeX = 0;
          turbulenceShakeY = 0;
          setHudTurbulence(false);
        }
      }

      if (speedBoostTimeMs > 0) {
        speedBoostTimeMs -= dt;
        if (speedBoostTimeMs <= 0) {
          setHudSpeedBoost(false);
        }
      }

      // Smooth player interpolation (dt dependent)
      const targetX = getLaneX(player.lane);
      const dx = targetX - player.x;
      // Interpolate with dt. At 60fps, dt ~16ms. (1 - exp(-k*dt)) gives framerate independent lerp
      player.x += dx * (1 - Math.exp(-0.015 * dt)); 
      
      const effectiveSpeedPPS = speedBoostTimeMs > 0 ? gameSpeedPPS * 2.5 : gameSpeedPPS;
      
      // Calculate spawn interval in ms based on game speed (faster game = spawn sooner)
      // At speed 600, interval = ~500ms. At max speed 1500, interval = ~200ms
      const spawnIntervalMs = Math.max(200, 500 - ((gameSpeedPPS - 600) * 0.33));
      timeSinceLastSpawn += dt;

      // Spawning
      if (timeSinceLastSpawn > spawnIntervalMs) {
        timeSinceLastSpawn = 0;
        
        if (Math.random() > 0.4) {
          const spawnLane = Math.floor(Math.random() * NUM_LANES);
          const isEnemyPlane = currentScore > 2000 && Math.random() > 0.6; 
          
          obstacles.push({
            x: getLaneX(spawnLane),
            y: -50,
            radius: isEnemyPlane ? 30 : 25,
            type: isEnemyPlane ? 'enemy' : 'storm',
            isSmart: !isEnemyPlane && Math.random() > 0.7,
            localSpeedModPPS: isEnemyPlane ? 120 : 0
          });
        }
        
        if (Math.random() > 0.3) {
          const spawnLane = Math.floor(Math.random() * NUM_LANES);
          let type = 'small';
          let radius = 15;
          let val = 100;
          
          const roll = Math.random();
          if (roll > 0.95) {
             type = 'large'; radius = 25; val = 1000;
          } else if (roll > 0.75) {
             type = 'medium'; radius = 20; val = 500;
          }

          collectibles.push({
            x: getLaneX(spawnLane),
            y: -50,
            radius: radius,
            type: type,
            scoreVal: val
          });
        }

        if (Math.random() > 0.97) {
          const spawnLane = Math.floor(Math.random() * NUM_LANES);
          const perkType = Math.random() > 0.5 ? 'shield' : 'speed';
          if (!(perkType === 'shield' && hasShield)) {
            perks.push({
              x: getLaneX(spawnLane),
              y: -50,
              radius: 18,
              type: perkType
            });
          }
        }
      }

      // Entities movement (dt dependent)
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        
        const currentEntitySpeedPPS = effectiveSpeedPPS + (obs.localSpeedModPPS || 0);
        const moveDist = currentEntitySpeedPPS * (dt / 1000);
        obs.y += moveDist;
        
        // Smart obstacle movement
        if (obs.isSmart && obs.y > 0 && obs.y < player.y - 100) {
            const seekingSpeedPPS = 60 + (gameSpeedPPS * 0.1);
            const seekMove = seekingSpeedPPS * (dt / 1000);
            if (obs.x < player.x - 5) obs.x += seekMove;
            if (obs.x > player.x + 5) obs.x -= seekMove;
        }
        
        const dist = Math.hypot(player.x - obs.x, player.y - obs.y);
        if (dist < obs.radius + player.width/2 - 10) {
          if (speedBoostTimeMs > 0) {
            obstacles.splice(i, 1);
            // Reward proportional to speed for destroying obstacles while boosting
            const speedFactor = effectiveSpeedPPS / INITIAL_SPEED;
            currentScore += 200 * speedFactor;
            continue;
          }
          if (hasShield) {
            hasShield = false;
            setHudShield(false);
            obstacles.splice(i, 1);
            continue;
          }
          isGameRunning = false;
          setTimeout(() => onGameOver(Math.floor(currentScore)), 500);
        }

        if (obs.y > height + 50) obstacles.splice(i, 1);
      }

      for (let i = collectibles.length - 1; i >= 0; i--) {
        const col = collectibles[i];
        col.y += effectiveSpeedPPS * (dt / 1000);

        const dist = Math.hypot(player.x - col.x, player.y - col.y);
        if (dist < col.radius + player.width/2) {
          const speedFactor = effectiveSpeedPPS / INITIAL_SPEED;
          const perkMultiplier = multiplierTimerMs > 0 ? 2 : 1;
          currentScore += col.scoreVal * speedFactor * perkMultiplier;
          collectibles.splice(i, 1);
        } else if (col.y > height + 50) {
          collectibles.splice(i, 1);
        }
      }

      for (let i = perks.length - 1; i >= 0; i--) {
        const perk = perks[i];
        perk.y += effectiveSpeedPPS * (dt / 1000);

        const dist = Math.hypot(player.x - perk.x, player.y - perk.y);
        if (dist < perk.radius + player.width/2) {
          if (perk.type === 'shield') {
            hasShield = true;
            setHudShield(true);
          } else if (perk.type === 'speed') {
            speedBoostTimeMs = SPEED_BOOST_DURATION_MS;
            setHudSpeedBoost(true);
          }
          perks.splice(i, 1);
        } else if (perk.y > height + 50) {
          perks.splice(i, 1);
        }
      }

      // Base score increase proportional to speed and active perks
      const speedFactor = effectiveSpeedPPS / INITIAL_SPEED;
      const perkMultiplier = speedBoostTimeMs > 0 ? 3 : (multiplierTimerMs > 0 ? 2 : 1);
      currentScore += 30 * speedFactor * perkMultiplier * (dt / 1000);
      
      // Direct DOM mutation for score to avoid React re-renders hitting the GPU
      if (scoreRef.current && Math.floor(elapsedTimeMs / 100) > Math.floor((elapsedTimeMs - dt) / 100)) {
        scoreRef.current.innerText = `Score: ${Math.floor(currentScore).toLocaleString()}`;
      }

      // Speed scaling: Increase by +50 PPS every 15 seconds (up to 1500)
      if (gameSpeedPPS < 1500 && Math.floor(elapsedTimeMs / 15000) > Math.floor((elapsedTimeMs - dt) / 15000)) {
        gameSpeedPPS += 50;
      }
    };

    const gameLoop = (time) => {
      if (!isGameRunning) return;
      
      // Calculate delta time in ms
      const dt = Math.min(time - lastTime, 100); 
      lastTime = time;
      elapsedTimeMs += dt;

      if (multiplierTimerMs > 0) {
        multiplierTimerMs -= dt;
        if (multiplierTimerMs <= 0) setMultiplier(1);
      }

      updatePlayState(dt);

      ctx.save();
      if (turbulenceTimeMs > 0) {
        ctx.translate(turbulenceShakeX, turbulenceShakeY);
      }

      ctx.clearRect(-10, -10, width + 20, height + 20);
      drawSkyBackground(dt);
      drawEntities();
      drawPlayer();
      drawTurbulenceOverlay();

      ctx.restore();

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    animationFrameId = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
      canvas.removeEventListener('pointerdown', handlePointerDown);
      canvas.removeEventListener('pointermove', handlePointerMove);
    };
  }, [onGameOver, activePlane]);

  return (
    <div className="game-screen screen">
      <div className="game-hud">
        <div className="game-score" ref={scoreRef}>
          Score: 0
        </div>
        <div className="hud-perks">
          {hudShield && (
            <div className="hud-perk shield-perk">🛡 Shield</div>
          )}
          {hudSpeedBoost && (
            <div className="hud-perk speed-perk">⚡ Boost!</div>
          )}
          {hudTurbulence && (
            <div className="hud-perk turbulence-perk">⚠ Turbulence</div>
          )}
          {multiplier > 1 && (
            <div className="game-multiplier pulse">
               2X WDC BONUS!
            </div>
          )}
        </div>
      </div>
      <canvas ref={canvasRef} className="game-canvas"></canvas>
    </div>
  );
}
