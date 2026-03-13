import React, { useEffect, useRef, useState } from 'react';
import './GameScreen.css';

export default function GameScreen({ onGameOver, activePlane = 'a320neo' }) {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [multiplierTimer, setMultiplierTimer] = useState(0);
  const [hudShield, setHudShield] = useState(false);
  const [hudSpeedBoost, setHudSpeedBoost] = useState(false);
  const [hudTurbulence, setHudTurbulence] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const width = canvas.parentElement.clientWidth;
    const height = canvas.parentElement.clientHeight;
    canvas.width = width;
    canvas.height = height;

    // Game State
    let animationFrameId;
    let isGameRunning = true;
    let currentScore = 0;
    let gameSpeed = 4;

    // === PERK STATE ===
    let hasShield = false;        // Invincible perk: one-time survival
    let speedBoostTimer = 0;      // Speed boost: frames remaining
    const SPEED_BOOST_DURATION = 60; // ~1 second at 60fps

    // === TURBULENCE STATE ===
    let turbulenceTimer = 0;
    const TURBULENCE_DURATION = 45; // ~0.75 seconds
    let lastTurbulenceMilestone = 0; // Track which 10k milestone last triggered
    let turbulenceShakeX = 0;
    let turbulenceShakeY = 0;

    // === CLOUD SYSTEM ===
    const clouds = [];
    for (let i = 0; i < 8; i++) {
      clouds.push({
        x: Math.random() * width,
        y: Math.random() * height,
        w: 60 + Math.random() * 100,
        h: 25 + Math.random() * 40,
        speed: 0.3 + Math.random() * 0.5,
        opacity: 0.15 + Math.random() * 0.25
      });
    }

    // === PERK COLLECTIBLES ===
    const perks = []; // { x, y, radius, type: 'shield' | 'speed' }

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
    let frameCount = 0;

    // === INPUT HANDLERS ===
    const handleKeyDown = (e) => {
      if (turbulenceTimer > 0) return; // Can't steer during turbulence
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        player.lane = Math.max(0, player.lane - 1);
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        player.lane = Math.min(NUM_LANES - 1, player.lane + 1);
      }
    };

    const handlePointerDown = (e) => {
      if (turbulenceTimer > 0) return;
      const rect = canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const x = clientX - rect.left;
      player.lane = Math.floor(x / laneWidth);
    };

    const handlePointerMove = (e) => {
      if (turbulenceTimer > 0) return;
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

    const drawSkyBackground = () => {
      // Sky gradient (top = lighter blue, bottom = deeper blue)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, '#87CEEB');   // Light sky blue
      skyGrad.addColorStop(0.4, '#5BA3D9'); // Mid blue
      skyGrad.addColorStop(0.8, '#2E75B6'); // Deeper blue
      skyGrad.addColorStop(1, '#1B4F8A');   // Dark horizon
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // Scrolling clouds
      clouds.forEach(cloud => {
        cloud.y += cloud.speed + (gameSpeed * 0.3);
        if (cloud.y > height + 50) {
          cloud.y = -cloud.h - 20;
          cloud.x = Math.random() * width;
          cloud.w = 60 + Math.random() * 100;
        }

        ctx.fillStyle = `rgba(255, 255, 255, ${cloud.opacity})`;
        // Draw clouds as soft rounded shapes
        ctx.beginPath();
        const cx = cloud.x;
        const cy = cloud.y;
        ctx.ellipse(cx, cy, cloud.w / 2, cloud.h / 2, 0, 0, Math.PI * 2);
        ctx.fill();
        // Smaller puffs for organic look
        ctx.beginPath();
        ctx.ellipse(cx - cloud.w * 0.3, cy + 3, cloud.w * 0.25, cloud.h * 0.35, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(cx + cloud.w * 0.25, cy - 2, cloud.w * 0.2, cloud.h * 0.3, 0, 0, Math.PI * 2);
        ctx.fill();
      });

      // Lane dividers
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 2;
      ctx.setLineDash([30, 20]);
      const offset = (frameCount * gameSpeed) % 50;
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
        ctx.shadowColor = '#00ff88';
        ctx.shadowBlur = 20;
        ctx.strokeStyle = 'rgba(0, 255, 136, 0.6)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.width * 0.7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Speed boost trail
      if (speedBoostTimer > 0) {
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
      // Obstacles
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

      // Collectibles (Coins)
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

      // Perks
      perks.forEach(perk => {
        const pulse = Math.sin(frameCount * 0.1) * 3;
        const r = perk.radius + pulse;

        if (perk.type === 'shield') {
          // Green glowing shield icon
          ctx.save();
          ctx.shadowColor = '#00ff88';
          ctx.shadowBlur = 15;
          ctx.fillStyle = 'rgba(0, 255, 136, 0.3)';
          ctx.beginPath();
          ctx.arc(perk.x, perk.y, r + 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#00ff88';
          ctx.beginPath();
          ctx.arc(perk.x, perk.y, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          // Shield symbol
          ctx.fillStyle = '#fff';
          ctx.font = `bold ${Math.floor(r)}px Nunito`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('🛡', perk.x, perk.y);
        } else if (perk.type === 'speed') {
          // Orange/gold speed boost icon
          ctx.save();
          ctx.shadowColor = '#ffd700';
          ctx.shadowBlur = 15;
          ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
          ctx.beginPath();
          ctx.arc(perk.x, perk.y, r + 5, 0, Math.PI * 2);
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
      if (turbulenceTimer <= 0) return;
      // Red-tinted warning overlay
      const intensity = (turbulenceTimer / TURBULENCE_DURATION) * 0.15;
      ctx.fillStyle = `rgba(255, 50, 50, ${intensity})`;
      ctx.fillRect(0, 0, width, height);

      // Warning text
      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + Math.sin(frameCount * 0.3) * 0.3})`;
      ctx.font = 'bold 24px Nunito';
      ctx.textAlign = 'center';
      ctx.fillText('⚠ TURBULENCE ⚠', width / 2, 80);
      ctx.restore();
    };

    // === GAME LOGIC ===
    const updatePlayState = () => {
      // === TURBULENCE CHECK ===
      const currentMilestone = Math.floor(currentScore / 10000);
      if (currentMilestone > lastTurbulenceMilestone && currentMilestone > 0) {
        // Trigger turbulence at each 10k milestone with 70% chance
        if (Math.random() < 0.7) {
          turbulenceTimer = TURBULENCE_DURATION;
          setHudTurbulence(true);
          // Random lane shift
          const shiftDir = Math.random() > 0.5 ? 1 : -1;
          const shiftAmount = 1 + Math.floor(Math.random() * 2); // 1-2 lanes
          player.lane = Math.max(0, Math.min(NUM_LANES - 1, player.lane + (shiftDir * shiftAmount)));
        }
        lastTurbulenceMilestone = currentMilestone;
      }

      // === TURBULENCE UPDATE ===
      if (turbulenceTimer > 0) {
        turbulenceTimer--;
        // Screen shake
        turbulenceShakeX = (Math.random() - 0.5) * 8;
        turbulenceShakeY = (Math.random() - 0.5) * 6;
        // Random small lane drift during turbulence
        if (frameCount % 12 === 0) {
          const drift = Math.random() > 0.5 ? 1 : -1;
          player.lane = Math.max(0, Math.min(NUM_LANES - 1, player.lane + drift));
        }
        if (turbulenceTimer <= 0) {
          turbulenceShakeX = 0;
          turbulenceShakeY = 0;
          setHudTurbulence(false);
        }
      }

      // === SPEED BOOST UPDATE ===
      if (speedBoostTimer > 0) {
        speedBoostTimer--;
        if (speedBoostTimer <= 0) {
          setHudSpeedBoost(false);
        }
      }

      // Update Player position towards target lane X smoothly
      const targetX = getLaneX(player.lane);
      const dx = targetX - player.x;
      player.x += dx * 0.2;
      
      const effectiveSpeed = speedBoostTimer > 0 ? gameSpeed * 2.5 : gameSpeed;
      const spawnFreqScale = Math.max(15, 50 - ((gameSpeed - 5) * 2));

      // Spawn Logic
      if (frameCount % Math.floor(spawnFreqScale) === 0) { 
        // Spawn Obstacle
        if (Math.random() > 0.4) {
          const spawnLane = Math.floor(Math.random() * NUM_LANES);
          const isEnemyPlane = currentScore > 2000 && Math.random() > 0.6; 
          
          obstacles.push({
            x: getLaneX(spawnLane),
            y: -50,
            radius: isEnemyPlane ? 30 : 25,
            type: isEnemyPlane ? 'enemy' : 'storm',
            isSmart: !isEnemyPlane && Math.random() > 0.7,
            localSpeedMod: isEnemyPlane ? 2 : 0
          });
        }
        
        // Spawn Collectible
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

        // Spawn Perks (rare)
        if (Math.random() > 0.97) { // ~3% chance per spawn cycle
          const spawnLane = Math.floor(Math.random() * NUM_LANES);
          const perkType = Math.random() > 0.5 ? 'shield' : 'speed';
          // Don't spawn shield if player already has one
          if (perkType === 'shield' && hasShield) {
            // Skip
          } else {
            perks.push({
              x: getLaneX(spawnLane),
              y: -50,
              radius: 18,
              type: perkType
            });
          }
        }
      }

      // Move entities and check collisions
      for (let i = obstacles.length - 1; i >= 0; i--) {
        const obs = obstacles[i];
        
        const currentEntitySpeed = effectiveSpeed + (obs.localSpeedMod || 0);
        obs.y += currentEntitySpeed;
        
        if (obs.isSmart && obs.y > 0 && obs.y < player.y - 100) {
            if (obs.x < player.x - 5) obs.x += 1 + (gameSpeed * 0.1);
            if (obs.x > player.x + 5) obs.x -= 1 + (gameSpeed * 0.1);
        }
        
        const dist = Math.hypot(player.x - obs.x, player.y - obs.y);
        if (dist < obs.radius + player.width/2 - 10) {
          // During speed boost, player is invincible — destroy obstacle
          if (speedBoostTimer > 0) {
            obstacles.splice(i, 1);
            currentScore += 200; // Bonus for destroying obstacle
            continue;
          }
          // Shield absorbs one hit
          if (hasShield) {
            hasShield = false;
            setHudShield(false);
            obstacles.splice(i, 1);
            continue;
          }
          // Collision — game over
          isGameRunning = false;
          setTimeout(() => onGameOver(Math.floor(currentScore)), 500);
        }

        if (obs.y > height + 50) obstacles.splice(i, 1);
      }

      // Collectibles
      for (let i = collectibles.length - 1; i >= 0; i--) {
        const col = collectibles[i];
        col.y += effectiveSpeed;

        const dist = Math.hypot(player.x - col.x, player.y - col.y);
        if (dist < col.radius + player.width/2) {
          currentScore += col.scoreVal * (multiplierTimer > 0 ? 2 : 1);
          collectibles.splice(i, 1);
        } else if (col.y > height + 50) {
          collectibles.splice(i, 1);
        }
      }

      // Perk collection
      for (let i = perks.length - 1; i >= 0; i--) {
        const perk = perks[i];
        perk.y += effectiveSpeed;

        const dist = Math.hypot(player.x - perk.x, player.y - perk.y);
        if (dist < perk.radius + player.width/2) {
          if (perk.type === 'shield') {
            hasShield = true;
            setHudShield(true);
          } else if (perk.type === 'speed') {
            speedBoostTimer = SPEED_BOOST_DURATION;
            setHudSpeedBoost(true);
          }
          perks.splice(i, 1);
        } else if (perk.y > height + 50) {
          perks.splice(i, 1);
        }
      }

      // Base score increase
      const scoreMultiplier = speedBoostTimer > 0 ? 3 : (multiplierTimer > 0 ? 2 : 1);
      currentScore += 0.5 * scoreMultiplier;
      
      if (frameCount % 10 === 0) {
        setScore(Math.floor(currentScore));
      }

      // Speed scaling
      if (frameCount % 1200 === 0 && gameSpeed < 18) {
        gameSpeed += 0.5;
      }
    };

    const gameLoop = () => {
      if (!isGameRunning) return;

      setMultiplierTimer(prev => {
        if (prev === 1) setMultiplier(1);
        return prev > 0 ? prev - 1 : 0;
      });

      updatePlayState();

      // Render with screen shake
      ctx.save();
      if (turbulenceTimer > 0) {
        ctx.translate(turbulenceShakeX, turbulenceShakeY);
      }

      ctx.clearRect(-10, -10, width + 20, height + 20);
      drawSkyBackground();
      drawEntities();
      drawPlayer();
      drawTurbulenceOverlay();

      ctx.restore();

      frameCount++;
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
        <div className="game-score">
          Score: {score.toLocaleString()}
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
