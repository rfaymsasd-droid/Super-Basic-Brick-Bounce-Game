const CHAOS_INTENSITY_PRESETS = {
  intense: { multiplier: 0.8, maxActive: 3, tetrisBoost: 1.0, ballBoost: 1.0, minDelay: 250, maxDelay: 420 },
  insane: { multiplier: 1, maxActive: 4, tetrisBoost: 1.25, ballBoost: 1.25, minDelay: 200, maxDelay: 330 },
  catastrophic: { multiplier: 1.2, maxActive: 5, tetrisBoost: 1.5, ballBoost: 1.5, minDelay: 150, maxDelay: 240 },
  "total-chaos": { multiplier: 1.4, maxActive: 7, tetrisBoost: 1.8, ballBoost: 1.8, minDelay: 90, maxDelay: 180 }
};

const CHAOS_POWER_UP_POOL = Array.isArray(globalThis?.POWER_UPS)
  ? globalThis.POWER_UPS
  : Array.isArray(typeof POWER_UPS !== "undefined" ? POWER_UPS : null)
    ? POWER_UPS
    : [];

const CHAOS_EVENT_LIBRARY = [
  { id: "ball_apocalypse", label: "BALL APOCALYPSE", category: "ball", duration: 420, weight: 18, intensity: 1.2, start() { const baseBall = balls[0] || ball; const desired = Math.min(10, 4 + Math.floor(Math.random() * 4)); const existing = balls.length; for (let index = 0; index < desired && balls.length < 12; index += 1) { const source = balls[Math.min(existing, balls.length - 1)] || baseBall; const velocity = Math.max(2.5, Math.hypot(source.vx || BALL_SPEED, source.vy || -BALL_SPEED) * (0.8 + Math.random() * 0.6)); const angle = ((Math.random() * 2) - 1) * Math.PI * 0.9; const newBall = { ...source, x: source.x + Math.random() * 16, y: source.y + Math.random() * 16, width: source.width || 12, height: source.height || 12, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity, caught: false, trail: [...(source.trail || [])], trickShotPieces: [...(source.trickShotPieces || [])], slowTimer: source.slowTimer || 0, lastInvaderHitIndex: null, piercing: Boolean(source.piercing) }; balls.push(newBall); } if (typeof playGameSound === "function") playGameSound("trick"); } },
  { id: "hyperspeed", label: "HYPERSPEED", category: "ball", duration: 240, weight: 15, intensity: 1.1, start() { if (typeof setEffect === "function") setEffect("hyperspeed", 240); for (const targetBall of balls) { const magnitude = Math.hypot(targetBall.vx, targetBall.vy) || BALL_SPEED; targetBall.vx *= 1.25; targetBall.vy *= 1.25; const angle = Math.atan2(targetBall.vy, targetBall.vx); targetBall.vx = Math.cos(angle) * Math.max(4.5, magnitude * 1.12); targetBall.vy = Math.sin(angle) * Math.max(4.5, magnitude * 1.12); } } },
  { id: "slow_reality", label: "SLOW REALITY", category: "arena", duration: 210, weight: 12, intensity: 0.85, start() { if (typeof setEffect === "function") setEffect("slow", 210); } },
  { id: "ball_scramble", label: "BALL SCRAMBLE", category: "ball", duration: 180, weight: 12, intensity: 0.9, start() { for (const targetBall of balls) { if (targetBall.caught) continue; const magnitude = Math.max(3.5, Math.min(9, Math.hypot(targetBall.vx, targetBall.vy) || BALL_SPEED)); const angle = (Math.random() * Math.PI * 2); targetBall.vx = Math.cos(angle) * magnitude; targetBall.vy = Math.sin(angle) * magnitude; } } },
  { id: "pinball_frenzy", label: "PINBALL FRENZY", category: "ball", duration: 300, weight: 11, intensity: 0.95, start() { if (typeof setEffect === "function") setEffect("pinball", 300); for (const targetBall of balls) { if (!targetBall.caught) { const magnitude = Math.hypot(targetBall.vx, targetBall.vy) || BALL_SPEED; const angle = Math.atan2(targetBall.vy, targetBall.vx); targetBall.vx = Math.cos(angle + (Math.random() < 0.5 ? -1 : 1) * 0.8) * magnitude; targetBall.vy = Math.sin(angle + (Math.random() < 0.5 ? -1 : 1) * 0.8) * magnitude; } } } },
  { id: "portal_madness", label: "PORTAL MADNESS", category: "arena", duration: 260, weight: 10, intensity: 0.9, start() { if (!Array.isArray(bricks)) return; const candidates = bricks.filter((brick) => brick.type !== "indestructible"); const portalPositions = [ { x: 120, y: 170 }, { x: WIDTH - 200, y: 250 } ]; for (let index = 0; index < portalPositions.length; index += 1) { let candidate = candidates[(index * 3) % Math.max(1, candidates.length)] || { x: portalPositions[index].x, y: portalPositions[index].y, width: 26, height: 12, type: "portal", portalCooldown: 0 }; bricks.push({ x: portalPositions[index].x, y: portalPositions[index].y, width: 26, height: 12, type: "portal", portalCooldown: 0, health: 1, maxHealth: 1 }); } } },
  { id: "giant_ball", label: "GIANT BALL", category: "ball", duration: 220, weight: 9, intensity: 0.7, start() { for (const targetBall of balls) { if (!targetBall.caught) { targetBall.width = Math.max(16, targetBall.width * 1.5); targetBall.height = Math.max(16, targetBall.height * 1.5); } } } },
  { id: "microball", label: "MICROBALL", category: "ball", duration: 220, weight: 9, intensity: 0.7, start() { for (const targetBall of balls) { targetBall.width = Math.max(6, Math.min(targetBall.width || 12, 10)); targetBall.height = Math.max(6, Math.min(targetBall.height || 12, 10)); } } },
  { id: "tetris_apocalypse", label: "TETRIS APOCALYPSE", category: "tetris", duration: 420, weight: 18, intensity: 1.6, start() { if (typeof updateChaosWaveDirector === "function") { chaosWave = { id: "maximum", label: "TETRIS APOCALYPSE", duration: 420, interval: 1, burst: 8 }; chaosWaveInterval = 1; chaosWaveBurst = 8; tetrominoTargetActive = Math.max(40, Math.min(70, (tetrominoTargetActive || 45) + 20)); } for (let index = 0; index < 16; index += 1) { if (typeof spawnTetromino === "function") spawnTetromino(); } } },
  { id: "giant_formations", label: "GIANT FORMATIONS", category: "tetris", duration: 300, weight: 14, intensity: 1.35, start() { if (typeof updateChaosWaveDirector === "function") { chaosWave = { id: "giant-invasion", label: "GIANT FORMATIONS", duration: 300, interval: 3, burst: 4 }; chaosWaveInterval = 3; chaosWaveBurst = 4; tetrominoTargetActive = 52; } for (let index = 0; index < 8; index += 1) { if (typeof spawnTetromino === "function") spawnTetromino(); } } },
  { id: "pixel_rain", label: "PIXEL RAIN", category: "tetris", duration: 300, weight: 14, intensity: 1.25, start() { if (typeof updateChaosWaveDirector === "function") { chaosWave = { id: "pixel-rain", label: "PIXEL RAIN", duration: 300, interval: 1, burst: 10 }; chaosWaveInterval = 1; chaosWaveBurst = 10; tetrominoTargetActive = 58; } for (let index = 0; index < 12; index += 1) { if (typeof spawnTetromino === "function") spawnTetromino(); } } },
  { id: "speedfall", label: "SPEEDFALL", category: "tetris", duration: 220, weight: 12, intensity: 1.0, start() { if (typeof setEffect === "function") setEffect("slow", 0); if (typeof chaosWave !== "undefined") { chaosWaveInterval = 1; chaosWaveBurst = 8; } if (typeof tetrominoTargetActive !== "undefined") tetrominoTargetActive = Math.max(tetrominoTargetActive || 40, 52); } },
  { id: "wall_of_shapes", label: "WALL OF SHAPES", category: "tetris", duration: 260, weight: 10, intensity: 1.2, start() { if (typeof spawnTetromino === "function") { for (let index = 0; index < 10; index += 1) spawnTetromino(); } } },
  { id: "tetris_shuffle", label: "TETRIS SHUFFLE", category: "tetris", duration: 200, weight: 9, intensity: 1.0, start() { if (typeof updateChaosWaveDirector === "function") { chaosWave = { id: "mixed", label: "TETRIS SHUFFLE", duration: 200, interval: 1, burst: 7 }; chaosWaveInterval = 1; chaosWaveBurst = 7; tetrominoTargetActive = 65; } } },
  { id: "alien_invasion", label: "ALIEN INVASION", category: "enemy", duration: 420, weight: 14, intensity: 1.15, start() { const startX = 90; for (let row = 0; row < 2; row += 1) { for (let column = 0; column < 4; column += 1) { invaders.push({ x: startX + column * 42, y: 36 + row * 24, width: 20, height: 16, type: "scout", health: 1, fireTimer: 0, phase: 1, intangible: false, small: true }); } } } },
  { id: "enemy_swarm", label: "ENEMY SWARM", category: "enemy", duration: 280, weight: 12, intensity: 1.1, start() { for (let index = 0; index < 6; index += 1) { invaders.push({ x: 60 + index * 40 + Math.random() * 26, y: 26 + Math.random() * 120, width: 16, height: 12, type: "scout", health: 1, fireTimer: 0, phase: 1, intangible: false, small: true }); } } },
  { id: "projectile_storm", label: "PROJECTILE STORM", category: "enemy", duration: 240, weight: 13, intensity: 1.2, start() { invaderFireTimer = 0; if (typeof setEffect === "function") setEffect("projectile", 240); } },
  { id: "galactic_interference", label: "GALACTIC INTERFERENCE", category: "enemy", duration: 220, weight: 9, intensity: 1.1, start() { if (typeof setEffect === "function") setEffect("magnet", 220); for (const targetBall of balls) { if (!targetBall.caught) { const angle = Math.atan2(targetBall.vy, targetBall.vx) + (Math.random() < 0.5 ? -1 : 1) * 0.8; const magnitude = Math.hypot(targetBall.vx, targetBall.vy) || BALL_SPEED; targetBall.vx = Math.cos(angle) * Math.max(3.5, magnitude); targetBall.vy = Math.sin(angle) * Math.max(3.5, magnitude); } } } },
  { id: "boss_ambush", label: "BOSS AMBUSH", category: "enemy", duration: 300, weight: 8, intensity: 1.4, start() { if (invaders.some((invader) => invader.type === "boss")) return; invaders.push({ x: WIDTH / 2 - 38, y: 70, width: 76, height: 48, type: "boss", variant: "crimson", health: 22, maxHealth: 22, fireTimer: 0, phase: 1, entrance: false, beamState: "idle", beamTimer: 0, beamCooldown: 210, hoverTick: 0, attackPattern: "spread", intangible: false }); } },
  { id: "gravity_meltdown", label: "GRAVITY MELTDOWN", category: "arena", duration: 260, weight: 13, intensity: 1.15, start() { gravityField = { x: WIDTH * 0.5, y: HEIGHT * (0.25 + Math.random() * 0.45), radius: 150 + Math.random() * 120 }; } },
  { id: "paddle_mutation", label: "PADDLE MUTATION", category: "arena", duration: 220, weight: 11, intensity: 0.75, start() { paddle.width = 110; paddleTargetX = Math.min(paddleTargetX, WIDTH - paddle.width); if (activeMode === "coop") secondPaddle.width = 110; } },
  { id: "moving_walls", label: "MOVING WALLS", category: "arena", duration: 220, weight: 10, intensity: 0.8, start() { if (!Array.isArray(bricks)) return; const wall = { x: WIDTH * 0.25, y: HEIGHT * 0.55, width: 18, height: 150, type: "moving", moveDirection: 1, health: 6, maxHealth: 6 }; bricks.push(wall); } },
  { id: "arena_shake", label: "ARENA SHAKE", category: "arena", duration: 120, weight: 7, intensity: 0.5, start() { if (typeof cameraShake !== "undefined") cameraShake = Math.max(cameraShake, 2.4); } },
  { id: "corruption_outbreak", label: "CORRUPTION OUTBREAK", category: "arena", duration: 260, weight: 12, intensity: 1.3, start() { if (typeof triggerCorruptionSurge === "function") triggerCorruptionSurge(); } },
  { id: "reality_fracture", label: "REALITY FRACTURE", category: "arena", duration: 240, weight: 10, intensity: 1.2, start() { gravityField = { x: WIDTH * 0.5, y: HEIGHT * 0.5, radius: 220 }; if (typeof cameraShake !== "undefined") cameraShake = 3; } },
  { id: "power_up_rain", label: "POWER-UP RAIN", category: "reward", duration: 180, weight: 12, intensity: 0.85, start() { for (let index = 0; index < 5; index += 1) { const pool = CHAOS_POWER_UP_POOL.length ? CHAOS_POWER_UP_POOL : []; const powerUp = pool[Math.floor(Math.random() * pool.length)] || { type: "score", color: "#ffffff" }; if (typeof dropPowerUp === "function") dropPowerUp(Math.random() * (WIDTH - 24), -24, 1); else if (Array.isArray(fallingPowerUps)) fallingPowerUps.push({ ...powerUp, x: Math.random() * (WIDTH - 24), y: -24, width: 24, height: 24, vy: 1.5 + Math.random() * 1.8 }); } } },
  { id: "golden_rush", label: "GOLDEN RUSH", category: "reward", duration: 180, weight: 11, intensity: 0.7, start() { if (Array.isArray(bricks)) { for (let index = 0; index < 8; index += 1) { bricks.push({ x: 60 + index * 84, y: 60 + (index % 2) * 28, width: 30, height: 14, type: "golden", health: 1, maxHealth: 1, corruptionRepair: false }); } } } },
  { id: "jackpot", label: "JACKPOT", category: "reward", duration: 220, weight: 9, intensity: 0.75, start() { registerBonusPoints(500); } },
  { id: "shockwave_chain", label: "SHOCKWAVE CHAIN", category: "reward", duration: 180, weight: 9, intensity: 0.8, start() { for (let index = 0; index < 3; index += 1) { if (typeof applyShockwave === "function") applyShockwave(); } } },
  { id: "lucky_break", label: "LUCKY BREAK", category: "reward", duration: 260, weight: 10, intensity: 0.7, start() { if (typeof setEffect === "function") setEffect("shield", 240); if (typeof shieldCharges !== "undefined") shieldCharges += 1; if (typeof chargeSpecialAbility === "function") chargeSpecialAbility(20); } }
];

function getChaosIntensityPreset() {
  const chosen = typeof interfaceData?.settings?.chaosIntensity === "string"
    ? interfaceData.settings.chaosIntensity
    : "catastrophic";
  return CHAOS_INTENSITY_PRESETS[chosen] || CHAOS_INTENSITY_PRESETS.catastrophic;
}

function getChaosWarningList() {
  const labels = CHAOS_EVENT_LIBRARY.map((event) => event.label);
  const shuffled = [...labels].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 6);
}

function createChaosScheduler() {
  const scheduler = {
    activeEvents: [],
    warning: null,
    overloadTimer: 0,
    overloadCooldown: 0,
    tickCount: 0,
    nextRoll: 180,
    intensity: 0,
    started: false,
    start() {
      scheduler.activeEvents = [];
      scheduler.warning = null;
      scheduler.overloadTimer = 0;
      scheduler.overloadCooldown = 180;
      scheduler.tickCount = 0;
      scheduler.nextRoll = 180;
      scheduler.intensity = 0;
      scheduler.started = true;
      if (typeof chaosIntensity !== "undefined") chaosIntensity = 0;
    },
    reset() {
      scheduler.start();
    },
    getMaxActiveEvents() {
      return getChaosIntensityPreset().maxActive;
    },
    chooseWeightedEvent() {
      const weighted = CHAOS_EVENT_LIBRARY.filter((event) => {
        if (scheduler.activeEvents.some((entry) => entry.id === event.id)) return false;
        const typeCount = scheduler.activeEvents.filter((entry) => entry.category === event.category).length;
        if (event.category === "ball" && typeCount >= 2) return false;
        if (["tetris", "enemy", "arena", "reward"].includes(event.category) && typeCount >= 1) return false;
        return true;
      });
      if (!weighted.length) return null;
      const totalWeight = weighted.reduce((sum, event) => sum + event.weight, 0);
      let roll = Math.random() * totalWeight;
      for (const event of weighted) {
        roll -= event.weight;
        if (roll <= 0) return event;
      }
      return weighted[weighted.length - 1];
    },
    beginWarning() {
      scheduler.warning = {
        label: "WARNING: SYSTEM OVERLOAD",
        countdown: 180,
        types: getChaosWarningList()
      };
      if (typeof playGameSound === "function") playGameSound("enemy");
      const status = typeof document !== "undefined" ? document.getElementById("chaos-event-status") : null;
      if (status) status.textContent = `Chaos event: ${scheduler.warning.label}`;
    },
    beginOverload() {
      const overloadLabels = getChaosWarningList();
      scheduler.warning = null;
      scheduler.overloadTimer = 540;
      scheduler.overloadCooldown = 480;
      const selected = overloadLabels.slice(0, 6);
      for (const label of selected) {
        const event = CHAOS_EVENT_LIBRARY.find((entry) => entry.label === label || entry.id === label);
        if (!event) continue;
        if (scheduler.activeEvents.some((entry) => entry.id === event.id)) continue;
        const entry = {
          id: event.id,
          label: event.label,
          category: event.category,
          remaining: Math.max(180, event.duration || 240),
          createdAt: scheduler.tickCount,
          started: false,
          cleanup: null,
          update: event.update || null
        };
        scheduler.activeEvents.push(entry);
        if (typeof event.start === "function") event.start();
      }
      if (typeof chaosIntensity !== "undefined") chaosIntensity = 100;
      const status = typeof document !== "undefined" ? document.getElementById("chaos-event-status") : null;
      if (status) status.textContent = "Chaos event: SYSTEM OVERLOAD";
    },
    cleanupExpired() {
      for (let index = scheduler.activeEvents.length - 1; index >= 0; index -= 1) {
        const entry = scheduler.activeEvents[index];
        entry.remaining -= 1;
        if (typeof entry.update === "function") entry.update();
        if (entry.remaining <= 0) {
          scheduler.activeEvents.splice(index, 1);
          if (entry.category === "arena" && entry.id === "portal_madness") {
            if (Array.isArray(bricks)) bricks = bricks.filter((brick) => brick.type !== "portal");
          }
          if (entry.category === "ball" && ["giant_ball", "microball"].includes(entry.id)) {
            for (const targetBall of balls) {
              if (!targetBall.caught) {
                targetBall.width = 12;
                targetBall.height = 12;
              }
            }
          }
          if (entry.category === "arena" && entry.id === "paddle_mutation") {
            paddle.width = 72;
            if (activeMode === "coop") secondPaddle.width = 72;
          }
          if (entry.category === "arena" && entry.id === "gravity_meltdown") {
            gravityField = null;
          }
        }
      }
    },
    updateIntensity() {
      const preset = getChaosIntensityPreset();
      const score = Math.min(100, scheduler.activeEvents.length * 18 + (scheduler.overloadTimer > 0 ? 32 : 0) + Math.random() * 10);
      scheduler.intensity = Math.min(100, Math.max(scheduler.intensity, score) + (scheduler.warning ? 3 : 0));
      if (typeof chaosIntensity !== "undefined") chaosIntensity = Math.min(100, Math.max(chaosIntensity, scheduler.intensity));
      if (typeof tetrominoTargetActive !== "undefined") {
        tetrominoTargetActive = Math.max(30, Math.min(90, Math.round((tetrominoTargetActive || 45) * preset.tetrisBoost)));
      }
    },
    tick() {
      if (activeMode !== "chaos") {
        scheduler.warning = null;
        scheduler.overloadTimer = 0;
        return;
      }
      scheduler.tickCount += 1;
      if (scheduler.warning) {
        scheduler.warning.countdown -= 1;
        const status = typeof document !== "undefined" ? document.getElementById("chaos-event-status") : null;
        if (status) status.textContent = `Chaos event: ${scheduler.warning.label} · ${Math.max(0, Math.ceil(scheduler.warning.countdown / 60))}s`;
        if (scheduler.warning.countdown <= 0) scheduler.beginOverload();
      }
      if (scheduler.overloadTimer > 0) {
        scheduler.overloadTimer -= 1;
        if (scheduler.overloadTimer === 0) {
          scheduler.activeEvents = scheduler.activeEvents.filter((entry) => !["tetris_apocalypse", "ball_apocalypse", "alien_invasion", "power_up_rain", "gravity_meltdown", "corruption_outbreak"].includes(entry.id));
          scheduler.overloadCooldown = 600;
        }
      }
      scheduler.cleanupExpired();
      scheduler.updateIntensity();
      if (scheduler.overloadTimer > 0) return;
      scheduler.nextRoll -= 1;
      if (scheduler.warning || scheduler.overloadTimer > 0) return;
      const preset = getChaosIntensityPreset();
      const interval = Math.max(preset.minDelay, preset.maxDelay - Math.round(scheduler.intensity * 0.8));
      if (scheduler.nextRoll <= 0) {
        const maxActive = scheduler.getMaxActiveEvents();
        const nextEvent = scheduler.chooseWeightedEvent();
        if (nextEvent && scheduler.activeEvents.length < maxActive) {
          const entry = {
            id: nextEvent.id,
            label: nextEvent.label,
            category: nextEvent.category,
            remaining: nextEvent.duration || 240,
            createdAt: scheduler.tickCount,
            started: false,
            update: nextEvent.update || null
          };
          scheduler.activeEvents.push(entry);
          if (typeof nextEvent.start === "function") nextEvent.start();
          scheduler.nextRoll = Math.max(60, interval + Math.floor(Math.random() * 120));
          const status = typeof document !== "undefined" ? document.getElementById("chaos-event-status") : null;
          if (status) status.textContent = `Chaos event: ${nextEvent.label}`;
        } else {
          scheduler.nextRoll = Math.max(30, interval / 2);
        }
      }
      if (scheduler.overloadCooldown <= 0 && scheduler.intensity > 70 && Math.random() < 0.012 * Math.max(1, preset.multiplier)) {
        scheduler.beginWarning();
      }
      scheduler.overloadCooldown = Math.max(0, scheduler.overloadCooldown - 1);
    },
    forceOverload() {
      scheduler.beginWarning();
      scheduler.warning.countdown = 1;
      scheduler.tick();
    }
  };

  scheduler.start();
  return scheduler;
}

let chaosScheduler = null;

if (typeof globalThis !== "undefined") {
  globalThis.CHAOS_EVENT_LIBRARY = CHAOS_EVENT_LIBRARY;
  globalThis.CHAOS_INTENSITY_PRESETS = CHAOS_INTENSITY_PRESETS;
  globalThis.createChaosScheduler = createChaosScheduler;
  globalThis.chaosScheduler = null;
}
