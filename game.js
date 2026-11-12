const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const witherStormOverlay = document.getElementById("wither-storm-overlay");
const witherStormOverlayCtx = witherStormOverlay.getContext("2d");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const BALL_SPEED = 4;
const STARTING_LIVES = 3;
const COMBO_DURATION = 180;
const INVADER_COLUMNS = 10;
const INVADER_ROWS = 3;
const INVADER_WIDTH = 30;
const INVADER_HEIGHT = 20;
const INVADER_GAP_X = 24;
const INVADER_GAP_Y = 18;
const INVADER_BULLET_SPEED = 3.5;
const FUNGAL_CORRUPTION_DELAY = 60 * 60;
const FUNGAL_CELL_SIZE = 4;

const ball = {
  x: 0,
  y: 0,
  width: 12,
  height: 12,
  vx: 0,
  vy: 0
};

const paddle = {
  x: WIDTH / 2 - 36,
  y: HEIGHT - 56,
  width: 72,
  height: 16,
  speed: 7
};

const secondPaddle = {
  x: WIDTH / 2 - 36,
  y: HEIGHT - 56,
  width: 72,
  height: 16,
  speed: 7
};

let bricks = [];
let invaders = [];
let invaderBullets = [];
let invaderDirection = 1;
let invaderFireTimer = 0;
let fungalCorruption = createFungalCorruptionState();
let ballAttached = true;
let balls = [ball];
let started = false;
let level = 1;
let lives = STARTING_LIVES;
let score = 0;
let highScore = loadHighScore();
let combo = 0;
let comboTimer = 0;
let perfectHitTimer = 0;
let perfectHitX = WIDTH / 2;
let trickShotTimer = 0;
let trickShotX = WIDTH / 2;
let trickShotY = HEIGHT / 2;
let paused = false;
let gameOver = false;
let activeMode = "campaign";
let modeTimer = 120 * 60;
let dailySeed = 0;
let endlessUnlocked = false;
let campaignComplete = false;
let dailyComplete = false;
let gravityField = null;
let levelStartScore = 0;
let paddleImpact = 0;
let impactPaddle = paddle;
let cameraShake = 0;
let paddleTargetX = paddle.x;
let secondPaddleTargetX = secondPaddle.x;
let objectiveBrickTotal = 0;
let objectiveInvaderTotal = 0;
let witherStormOverrunFragments = [];
let witherStormOverrunIntensity = 0;
let witherStormOverrunRadius = 0;
let witherStormLastCaptureTick = -1;
let witherStormOverrunTarget = null;
const backgroundStars = Array.from({ length: 56 }, (_, index) => ({
  x: (index * 167 + 47) % WIDTH,
  y: (index * 97 + 31) % HEIGHT,
  radius: index % 5 === 0 ? 1.5 : 0.8,
  speed: 0.15 + index % 4 * 0.08
}));
const statusCounters = new WeakMap();
const gamepadButtonState = new Map();

const keys = {};

function unlockAudio() {
  const AudioContextType = window.AudioContext || window.webkitAudioContext;
  if (AudioContextType) {
    soundContext ||= new AudioContextType();
    if (soundContext.state === "suspended") soundContext.resume();
  }
}

document.addEventListener("keydown", function (event) {
  const interactiveFocus = event.target.closest?.("button, input, select, textarea, a");
  if (interactiveFocus && event.code !== "Escape") return;
  keys[event.code] = true;
  if (!event.repeat) unlockAudio();

  if (event.code === getKeybind("launch")) {
    if (event.target !== canvas && event.target !== document.body) return;
    event.preventDefault();
    if (!event.repeat && !paused && !gameOver && gameActive && galacticBossDefeatTimer === 0) {
      recordLaunch();
      started = true;
      launchBall();
    }
  } else if (event.code === getKeybind("restart") && !event.repeat && (gameActive || gameOver)) {
    resetGame();
    beginGame(false);
  } else if (event.code === getKeybind("ability") && !event.repeat && gameActive && galacticBossDefeatTimer === 0) {
    activateSpecialAbility();
  } else if ((event.code === getKeybind("pause") || event.code === "Escape") && !event.repeat && !gameOver && gameActive) {
    if (paused) resumeGame();
    else pauseGame();
  }

  if (event.code.startsWith("Arrow")) {
    event.preventDefault();
  }
});

document.addEventListener("keyup", function (event) {
  keys[event.code] = false;
});
document.addEventListener("click", function () {
  unlockAudio();
  updateMusic();
});

canvas.addEventListener("pointerdown", (event) => {
  canvas.focus({ preventScroll: true });
  canvas.setPointerCapture(event.pointerId);
  updatePointerPaddle(event);
});
canvas.addEventListener("pointermove", (event) => {
  if (event.pointerType === "mouse" || event.buttons > 0 || event.pressure > 0) updatePointerPaddle(event);
});
canvas.addEventListener("pointerup", (event) => {
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
});
canvas.addEventListener("pointercancel", (event) => {
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
});

function updatePointerPaddle(event) {
  const bounds = canvas.getBoundingClientRect();
  if (!bounds.width) return;
  const canvasX = Math.max(0, Math.min(WIDTH, (event.clientX - bounds.left) * WIDTH / bounds.width));
  if (activeMode === "coop") {
    if (canvasX < WIDTH / 2) {
      paddleTargetX = Math.max(0, Math.min(WIDTH / 2 - paddle.width, canvasX - paddle.width / 2));
    } else {
      secondPaddleTargetX = Math.max(WIDTH / 2, Math.min(WIDTH - secondPaddle.width, canvasX - secondPaddle.width / 2));
    }
    return;
  }
  paddleTargetX = Math.max(0, Math.min(WIDTH - paddle.width, canvasX - paddle.width / 2));
}

function update() {
  if (!gameActive) return;
  updateGamepad();
  if (paused) return;

  if (gameOver) {
    updateTetrominoEffects();
    return;
  }
  if (galacticBossDefeatTimer > 0) {
    updateGameEffects();
    updateTetrominoEffects();
    if (updateGalacticBossEffects()) advanceModeLevel();
    return;
  }
  updateGameEffects();
  updateTetrominoEffects();
  movePaddle();
  if (ballAttached) {
    positionBall();
  }
  updateAdminEnemies();
  if (!started) {
    return;
  }

  updateFungalCorruption();

  if (activeMode === "time_attack") {
    modeTimer -= 1;
    if (modeTimer <= 0) {
      modeTimer = 0;
      showGameOver();
      return;
    }
  }

  updateMechanics();
  updateCorruption();
  updateChaosMode();
  moveInvaders();
  updateTetrominoes();
  for (let index = balls.length - 1; index >= 0; index -= 1) {
    const targetBall = balls[index];
    GameJuice.updateBallBounce(targetBall);
    if (targetBall.caught) continue;
    applyGalacticBeamForce(targetBall);
    applyWitherStormPull(targetBall);
    advanceBallWithCollisionChecks(targetBall);
    if (targetBall.caught) continue;
    if (targetBall.y > HEIGHT) {
      balls.splice(index, 1);
      recordMiss();
    }
  }
  if (balls.length === 0) {
    loseLife();
    updateStatus();
    return;
  }
  if (activeMode !== "zen") updateInvaderBullets();
  if (gameOver || !started) {
    updateStatus();
    return;
  }

  if (comboTimer > 0) {
    comboTimer -= 1;
    if (comboTimer === 0) {
      combo = 0;
    }
  }

  if (activeMode !== "admin" && !gameOver && started && galacticBossDefeatTimer === 0 && areModeObjectivesComplete()) advanceModeLevel();

  updateStatus();
}

function advanceBallWithCollisionChecks(targetBall) {
  const speed = Math.max(Math.abs(targetBall.vx), Math.abs(targetBall.vy)) *
    (activeEffects.slow ? 0.55 : targetBall.slowTimer > 0 ? 0.65 : 1);
  const steps = Math.max(1, Math.ceil(speed / Math.max(2, Math.min(targetBall.width, targetBall.height) / 2)));
  for (let step = 0; step < steps; step += 1) {
    moveBall(targetBall, 1 / steps);
    bounceOffWalls(targetBall);
    resolveTetrominoBallCollision(targetBall);
    for (const currentPaddle of getPaddles()) {
      bounceOffPaddle(targetBall, currentPaddle);
      if (targetBall.caught) return;
    }
    bounceOffBricks(targetBall);
    bounceOffInvaders(targetBall);
    if (targetBall.y > HEIGHT) return;
  }
}

function createFungalCorruptionState() {
  const columns = Math.ceil(WIDTH / FUNGAL_CELL_SIZE);
  const rows = Math.ceil(HEIGHT / FUNGAL_CELL_SIZE);
  return {
    elapsedTicks: 0,
    active: false,
    columns,
    rows,
    infected: new Uint8Array(columns * rows),
    frontier: [],
    infectedCount: 0
  };
}

function updateFungalCorruption() {
  if (gameOver || campaignComplete || dailyComplete) return;

  if (!fungalCorruption.active) {
    fungalCorruption.elapsedTicks += 1;
    if (fungalCorruption.elapsedTicks < FUNGAL_CORRUPTION_DELAY) return;

    fungalCorruption.active = true;
    const seedX = Math.floor(fungalCorruption.columns / 2);
    const seedY = Math.floor(fungalCorruption.rows / 2);
    const seedIndex = seedY * fungalCorruption.columns + seedX;
    fungalCorruption.infected[seedIndex] = 1;
    fungalCorruption.frontier.push(seedIndex);
    fungalCorruption.infectedCount = 1;
  }

  for (let growth = 0; growth < 2 && fungalCorruption.frontier.length > 0; growth += 1) {
    const frontierIndex = Math.floor(Math.random() * fungalCorruption.frontier.length);
    const cellIndex = fungalCorruption.frontier[frontierIndex];
    const cellX = cellIndex % fungalCorruption.columns;
    const cellY = Math.floor(cellIndex / fungalCorruption.columns);
    let spread = false;

    for (let attempt = 0; attempt < 12; attempt += 1) {
      const nextX = cellX + Math.floor(Math.random() * 3) - 1;
      const nextY = cellY + Math.floor(Math.random() * 3) - 1;
      if (nextX < 0 || nextX >= fungalCorruption.columns || nextY < 0 || nextY >= fungalCorruption.rows) continue;
      const nextIndex = nextY * fungalCorruption.columns + nextX;
      if (fungalCorruption.infected[nextIndex]) continue;

      fungalCorruption.infected[nextIndex] = 1;
      fungalCorruption.frontier.push(nextIndex);
      fungalCorruption.infectedCount += 1;
      spread = true;
      break;
    }

    if (!spread) {
      fungalCorruption.frontier[frontierIndex] = fungalCorruption.frontier[fungalCorruption.frontier.length - 1];
      fungalCorruption.frontier.pop();
    }
  }
}

function updateGamepad() {
  const gamepads = window.navigator?.getGamepads?.();
  if (!gamepads) return;
  for (const gamepad of gamepads) {
    if (!gamepad) continue;
    const axis = gamepad.axes[0] || 0;
    const dpadLeft = Boolean(gamepad.buttons[14]?.pressed);
    const dpadRight = Boolean(gamepad.buttons[15]?.pressed);
    const move = Math.abs(axis) > 0.18 ? axis : dpadRight ? 1 : dpadLeft ? -1 : 0;
    if (activeMode === "coop") {
      secondPaddleTargetX += move * paddle.speed;
    } else {
      paddleTargetX += move * paddle.speed;
    }
    const launchPressed = Boolean(gamepad.buttons[0]?.pressed);
    const abilityPressed = Boolean(gamepad.buttons[1]?.pressed);
    const pausePressed = Boolean(gamepad.buttons[9]?.pressed);
    const previous = gamepadButtonState.get(gamepad.index) || { launch: false, ability: false, pause: false };
    if (launchPressed && !previous.launch && gameActive && !paused && !gameOver && galacticBossDefeatTimer === 0) {
      recordLaunch();
      started = true;
      launchBall();
    }
    if (pausePressed && !previous.pause && gameActive && !gameOver) {
      if (paused) resumeGame();
      else pauseGame();
    }
    if (abilityPressed && !previous.ability && galacticBossDefeatTimer === 0) activateSpecialAbility();
    gamepadButtonState.set(gamepad.index, { launch: launchPressed, ability: abilityPressed, pause: pausePressed });
  }
}

function movePaddle() {
  const speed = paddle.speed * (activeEffects.slow ? 0.7 : 1);
  if (activeMode === "coop") {
    if (keys[getKeybind("moveLeft")]) paddleTargetX -= speed;
    if (keys[getKeybind("moveRight")]) paddleTargetX += speed;
    if (keys[getKeybind("alternateLeft")]) secondPaddleTargetX -= speed;
    if (keys[getKeybind("alternateRight")]) secondPaddleTargetX += speed;
    paddleTargetX = Math.max(0, Math.min(WIDTH / 2 - paddle.width, paddleTargetX));
    secondPaddleTargetX = Math.max(WIDTH / 2, Math.min(WIDTH - secondPaddle.width, secondPaddleTargetX));
    paddle.x += (paddleTargetX - paddle.x) * 0.72;
    secondPaddle.x += (secondPaddleTargetX - secondPaddle.x) * 0.72;
    return;
  }
  if (keys[getKeybind("moveLeft")] || keys[getKeybind("alternateLeft")]) paddleTargetX -= speed;
  if (keys[getKeybind("moveRight")] || keys[getKeybind("alternateRight")]) paddleTargetX += speed;
  paddleTargetX = Math.max(0, Math.min(WIDTH - paddle.width, paddleTargetX));
  paddle.x += (paddleTargetX - paddle.x) * 0.72;
}

function positionBall() {
  if (balls.length === 0) balls = [ball];
  ball.trickShotPieces = [];
  ball.trickShotTimer = 0;
  ball.caught = false;
  ball.piercing = Boolean(activeEffects.piercing);
  ball.slowTimer = 0;
  ball.vx = 0;
  ball.vy = 0;
  ball.x = paddle.x + (paddle.width - ball.width) / 2;
  ball.y = paddle.y - ball.height - 2;
}

function getPaddles() {
  return activeMode === "coop" ? [paddle, secondPaddle] : [paddle];
}

function launchBall() {
  if (!ballAttached && !balls.some((targetBall) => targetBall.caught)) {
    return;
  }
  ballAttached = false;
  for (const targetBall of balls) {
    targetBall.caught = false;
    targetBall.vx = targetBall.vx || BALL_SPEED * 0.65;
    targetBall.vy = -BALL_SPEED;
  }
}

function moveBall(targetBall, distanceFraction = 1) {
  const speedFactor = activeEffects.slow ? 0.55 : targetBall.slowTimer > 0 ? 0.65 : 1;
  if (interfaceData.customization.trail !== "none") {
    targetBall.trail ||= [];
    targetBall.trail.push({ x: targetBall.x + targetBall.width / 2, y: targetBall.y + targetBall.height / 2 });
    if (targetBall.trail.length > 8) targetBall.trail.shift();
  }
  if (gravityField) {
    const dx = gravityField.x - (targetBall.x + targetBall.width / 2);
    const dy = gravityField.y - (targetBall.y + targetBall.height / 2);
    const distance = Math.hypot(dx, dy);
    if (distance < gravityField.radius && distance > 0) {
      targetBall.vx += dx / distance * 0.035 * distanceFraction;
      targetBall.vy += dy / distance * 0.035 * distanceFraction;
    }
  }
  targetBall.x += targetBall.vx * speedFactor * distanceFraction;
  targetBall.y += targetBall.vy * speedFactor * distanceFraction;
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden && gameActive && !paused && !gameOver) pauseGame();
});

function moveInvaders() {
  if (invaders.length === 0) {
    return;
  }

  if (activeMode === "classic" || activeMode === "zen") return;
  const witherStorm = invaders.find((invader) => invader.variant === "wither-storm");
  if (witherStorm) {
    updateWitherStorm(witherStorm);
    return;
  }
  const galacticCommander = invaders.find((invader) => invader.variant === "galactic-commander");
  if (galacticCommander) {
    updateGalacticCommander(galacticCommander);
    return;
  }
  const movingInvaders = invaders.filter((invader) => invader.type !== "eater");
  if (movingInvaders.length === 0) return;
  const speed = 0.9 * (activeEffects.slow ? 0.55 : 1);
  const leftEdge = Math.min(...movingInvaders.map((invader) => invader.x)) + invaderDirection * speed;
  const rightEdge = Math.max(...movingInvaders.map((invader) => invader.x + invader.width)) + invaderDirection * speed;

  if (leftEdge < 18 || rightEdge > WIDTH - 18) {
    invaderDirection *= -1;
    if (!invaders.some((invader) => invader.type === "boss")) {
      for (const invader of movingInvaders) {
        invader.y += 14;
      }
    }
  }

  for (const invader of movingInvaders) {
    if (invader.galaga) {
      const drift = Math.sin((movingTick + invader.galagaPhase) / 16) * 0.8;
      invader.x += (invaderDirection * speed * 0.8) + drift;
      invader.y += Math.cos((movingTick + invader.galagaPhase) / 18) * 0.35;
      continue;
    }
    const typeMultiplier = (invader.adminSpeed || 1) * (invader.type === "scout" ? 1.8 : invader.type === "boss" && invader.phase > 1 ? 1.5 : invader.small ? 1.5 : 1);
    invader.x += invaderDirection * speed * typeMultiplier;
  }

  if (activeMode === "zen") return;
  invaderFireTimer += activeEffects.slow ? 0.55 : 1;
  const boss = invaders.find((invader) => invader.type === "boss");
  const fireInterval = boss
    ? boss.phase === 1 ? 75 : boss.phase === 2 ? 50 : 32
    : Math.max(66, 90 - level * 2);
  if (invaderFireTimer >= fireInterval) {
    invaderFireTimer = 0;
    const shooter = boss && Math.random() < 0.45
      ? boss
      : invaders[Math.floor(Math.random() * invaders.length)];
    if (shooter) {
      let vx = 0;
      let vy = INVADER_BULLET_SPEED;
      if (shooter.type === "sniper" || shooter.type === "boss" && shooter.attackPattern === "aimed") {
        const dx = paddle.x + paddle.width / 2 - shooter.x;
        const dy = paddle.y - shooter.y;
        const magnitude = Math.hypot(dx, dy);
        vx = dx / magnitude * INVADER_BULLET_SPEED;
        vy = dy / magnitude * INVADER_BULLET_SPEED;
      }
      if (shooter.type === "boss") {
        fireBossPattern(shooter);
      } else {
        invaderBullets.push({
          x: shooter.x + shooter.width / 2 - 2,
          y: shooter.y + shooter.height,
          width: 4,
          height: 12,
          speed: INVADER_BULLET_SPEED,
          vx,
          vy,
        });
      }
    }
  }
}

function updateInvaderBullets() {
  for (let bulletIndex = invaderBullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
    const bullet = invaderBullets[bulletIndex];
    const slowFactor = activeEffects.slow ? 0.55 : 1;
    bullet.x += (bullet.vx || 0) * slowFactor;
    bullet.y += (bullet.vy || bullet.speed) * slowFactor;

    if (bullet.y > HEIGHT || bullet.x + bullet.width < 0 || bullet.x > WIDTH) {
      invaderBullets.splice(bulletIndex, 1);
      continue;
    }

    if (balls.some((targetBall) => boxesTouch(bullet, targetBall))) {
      invaderBullets.splice(bulletIndex, 1);
      continue;
    }

    if (getPaddles().some((targetPaddle) => boxesTouch(bullet, targetPaddle))) {
      invaderBullets.splice(bulletIndex, 1);
      loseLife();
      return;
    }
  }
}

function loseLife() {
  if (activeMode === "zen") {
    balls = [ball];
    started = false;
    ballAttached = true;
    positionBall();
    return;
  }
  invaderBullets = [];
  if (shieldCharges > 0) {
    shieldCharges -= 1;
    balls = [ball];
    ballAttached = true;
    started = false;
    positionBall();
    updateStatus();
    return;
  }
  lives -= 1;
  combo = 0;
  comboTimer = 0;
  balls = [ball];
  fallingPowerUps = [];
  activeEffects = {};
  laserShots = [];
  laserCooldown = 0;
  shieldCharges = 0;
  shockwaveTimer = 0;
  paddle.width = 72;
  secondPaddle.width = 72;
  paddleTargetX = Math.max(0, Math.min(WIDTH - paddle.width, paddle.x));
  secondPaddleTargetX = Math.max(WIDTH / 2, Math.min(WIDTH - secondPaddle.width, secondPaddle.x));
  updateStatus();
  if (lives === 0) {
    showGameOver();
    return;
  }

  started = false;
  ballAttached = true;
  positionBall();
}

function registerTargetHit(points) {
  combo += 1;
  comboTimer = COMBO_DURATION;
  score += points * Math.min(combo, 5);
  if (activeEffects.double) score += points * Math.min(combo, 5);
  recordTargetHit();
  if (score > highScore) {
    highScore = score;
    saveHighScore();
  }
  if (combo >= 3 && combo % 3 === 0) {
    GameJuice.emit("combo", WIDTH / 2, 112, {
      color: gameTheme.accentSecondary,
      label: `${Math.min(combo, 5)}× COMBO`
    });
    playGameSound("combo");
  }
  updateStatus();
}

function registerBonusPoints(points) {
  score += points;
  if (score > highScore) {
    highScore = score;
    saveHighScore();
  }
  updateStatus();
}

function registerTetrominoRicochet(targetBall, pieceId) {
  if (interfaceData.settings.obstacleDensity !== "chaos") {
    targetBall.trickShotPieces ||= [];
    if (targetBall.trickShotTimer <= 0) targetBall.trickShotPieces = [];
    targetBall.trickShotTimer = 600;
    if (targetBall.trickShotPieces.includes(pieceId)) return;
    targetBall.trickShotPieces.push(pieceId);
    if (targetBall.trickShotPieces.length < 3) return;
    targetBall.trickShotPieces = [];
    targetBall.trickShotTimer = 0;
    chargeSpecialAbility(25);
    registerBonusPoints(300);
    playGameSound("trick");
    GameJuice.emit("combo", targetBall.x + targetBall.width / 2, targetBall.y, {
      color: gameTheme.accentSecondary,
      label: "TRICK SHOT · +300"
    });
    if (!interfaceData.settings.reducedMotion && interfaceData.settings.effectsIntensity > 0) {
      spawnParticles(targetBall.x + targetBall.width / 2, targetBall.y + targetBall.height / 2,
        gameTheme.accentSecondary, 14, 2.5);
    }
    trickShotTimer = 55;
    trickShotX = targetBall.x + targetBall.width / 2;
    trickShotY = targetBall.y;
    return;
  }
  targetBall.trickShotPieces ||= [];
  if (targetBall.trickShotTimer <= 0) targetBall.trickShotPieces = [];
  targetBall.trickShotTimer = 600;
  targetBall.tetrominoRicochetIds ||= [];
  if (targetBall.tetrominoRicochetIds.includes(pieceId)) return;
  targetBall.tetrominoRicochetIds.push(pieceId);
  targetBall.tetrominoRicochetStreak = (targetBall.tetrominoRicochetStreak || 0) + 1;
  if (targetBall.tetrominoRicochetIds.length > 120) targetBall.tetrominoRicochetIds.shift();
  targetBall.trickShotPieces.push(pieceId);
  const streak = targetBall.tetrominoRicochetStreak;
  if (streak % 3 !== 0) return;
  const multiplier = Math.min(5, Math.floor(streak / 3));
  chargeSpecialAbility(15);
  registerBonusPoints(300 * multiplier);
  playGameSound("trick");
  GameJuice.emit("combo", targetBall.x + targetBall.width / 2, targetBall.y, {
    color: gameTheme.accentSecondary,
    label: `RICOCHET ×${multiplier}`
  });
  if (!interfaceData.settings.reducedMotion && interfaceData.settings.effectsIntensity > 0) {
    spawnParticles(targetBall.x + targetBall.width / 2, targetBall.y + targetBall.height / 2,
      gameTheme.accentSecondary, 14 + multiplier * 3, 2.5 + multiplier * 0.2);
  }
  trickShotTimer = 60;
  trickShotX = targetBall.x + targetBall.width / 2;
  trickShotY = targetBall.y;
}

function loadHighScore() {
  try {
    return Number(localStorage.getItem("brickBounceHighScore")) || 0;
  } catch (error) {
    console.warn("Unable to load the high score.", error);
    return 0;
  }
}

function saveHighScore() {
  try {
    localStorage.setItem("brickBounceHighScore", String(highScore));
  } catch (error) {
    console.warn("Unable to save the high score.", error);
  }
}

function draw() {
  const visualQuality = GameJuice.getQuality();
  if (interfaceData.settings.motionBlur && visualQuality.multiplier >= 0.8 &&
      interfaceData.settings.effectsIntensity > 0 && !interfaceData.settings.reducedMotion &&
      interfaceData.settings.decorativeEffects !== false && started && !paused && !gameOver) {
    const blurAlpha = Math.min(0.42, 0.22 * visualQuality.trails) * interfaceData.settings.effectsIntensity;
    ctx.fillStyle = `rgba(0, 0, 0, ${blurAlpha})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  } else {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = gameTheme.background;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  ctx.save();
  ctx.filter = getAdminColorFilter();
  if (interfaceData.settings.cameraShake && !interfaceData.settings.reducedMotion && cameraShake > 0) {
    const shake = Math.min(3.2, cameraShake) * interfaceData.settings.effectsIntensity * visualQuality.shake;
    ctx.translate((GameJuice.random() - 0.5) * shake, (GameJuice.random() - 0.5) * shake);
  }
  GameJuice.applyCamera(ctx);
  drawGameBackground();
  drawTetrominoes();
  drawCorruption();
  ctx.fillStyle = getCustomizationColor("paddle");
  drawPaddle(paddle);
  if (activeMode === "coop") drawPaddle(secondPaddle);
  if (perfectHitTimer > 0 || trickShotTimer > 0) {
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "bold 17px system-ui";
    if (perfectHitTimer > 0) {
      ctx.globalAlpha = Math.min(1, perfectHitTimer / 12);
      ctx.fillStyle = gameTheme.accentSecondary;
      const rise = interfaceData.settings.reducedMotion ? 0 : (45 - perfectHitTimer) * 0.35;
      ctx.fillText("PERFECT HIT! +100", perfectHitX, paddle.y - 15 - rise);
    } else {
      ctx.globalAlpha = Math.min(1, trickShotTimer / 12);
      ctx.fillStyle = gameTheme.accent;
      const rise = interfaceData.settings.reducedMotion ? 0 : (55 - trickShotTimer) * 0.35;
      ctx.fillText("TRICK SHOT! +300", trickShotX, trickShotY - rise);
    }
    ctx.restore();
  }
  for (const targetBall of balls) {
    const speed = Math.hypot(targetBall.vx, targetBall.vy);
    const speedRatio = Math.max(0, Math.min(1, (speed - BALL_SPEED) / (BALL_SPEED * 0.8)));
    const trailColor = interfaceData.settings.reducedMotion || interfaceData.customization.trail === "none"
      ? null
      : interfaceData.customization.trail === "spark" ? gameTheme.accentSecondary
      : interfaceData.customization.trail === "ember" ? gameTheme.accent : gameTheme.accentSecondary;
    if (trailColor && interfaceData.settings.decorativeEffects !== false && targetBall.trail) {
      targetBall.trail.forEach((point, index) => {
        const trailQuality = visualQuality.trails;
        ctx.globalAlpha = (index + 1) / targetBall.trail.length *
          (0.12 + speedRatio * 0.1) * interfaceData.settings.effectsIntensity * trailQuality;
        ctx.fillStyle = trailColor;
        ctx.shadowColor = trailColor;
        ctx.shadowBlur = interfaceData.settings.reducedMotion ? 0
          : Math.min(8, 3 + speedRatio * 4) * visualQuality.glow;
        ctx.beginPath();
        ctx.arc(point.x, point.y, targetBall.width * (index + 1) / targetBall.trail.length *
          (0.34 + speedRatio * 0.12), 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }
    ctx.fillStyle = targetBall.piercing ? "#ff8a3d" : getCustomizationColor("ball");
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = interfaceData.settings.decorativeEffects === false ? 0
      : 7 * interfaceData.settings.effectsIntensity * visualQuality.glow;
    const bounce = GameJuice.getBallBounceTransform(targetBall);
    ctx.save();
    ctx.translate(targetBall.x + targetBall.width / 2, targetBall.y + targetBall.height / 2);
    ctx.rotate(bounce.rotation);
    ctx.scale(bounce.scaleX, bounce.scaleY);
    drawSquircle(-targetBall.width / 2, -targetBall.height / 2, targetBall.width, targetBall.height);
    ctx.restore();
    ctx.shadowBlur = 0;
  }
  drawBricks();
  drawInvaders();
  drawEnemyDetails();
  drawGalacticBossEffects();
  drawGameParticles();
  GameJuice.draw(ctx);
  drawInvaderBullets();
  drawPowerUps();
  drawBossHealth();
  drawAdminConsumption();
  if (gravityField) {
    ctx.strokeStyle = `${gameTheme.accentSecondary}99`;
    ctx.beginPath();
    ctx.arc(gravityField.x, gravityField.y, gravityField.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  drawNicoTextureMosaic(ctx, WIDTH, HEIGHT, 0.18);

  if (paused || gameOver || !started) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = gameTheme.text;
    ctx.textAlign = "center";
    ctx.font = "bold 42px sans-serif";
    const title = gameOver ? drawModeOverlayTitle() : paused ? "PAUSED" : "READY";
    ctx.fillText(title, WIDTH / 2, HEIGHT / 2 - 12);
    ctx.font = "18px sans-serif";
    const prompt = gameOver
      ? campaignComplete ? "Campaign complete! Endless mode unlocked — press R" : "Press R to restart"
      : paused ? "Press P to resume"
        : activeMode === "coop" ? "Player 1: ←/→ · Player 2: A/D · Space to launch"
          : "Press SPACE to launch";
    ctx.fillText(prompt, WIDTH / 2, HEIGHT / 2 + 28);
  }
  drawChaosAnnouncement();
  drawFungalCorruption();
  drawWitherStormOverrun();
}

function drawWitherStormOverrun() {
  const gameShell = document.getElementById("game-shell");
  const boss = invaders.find((invader) => invader.variant === "wither-storm");
  const isEating = !gameShell.hidden && gameActive && started && !gameOver && boss && boss.phase >= 6;
  const reducedMotion = interfaceData.settings.reducedMotion;
  const width = window.innerWidth;
  const height = window.innerHeight;
  const pixelRatio = Math.min(2, window.devicePixelRatio || 1);
  if (witherStormOverlay.width !== Math.round(width * pixelRatio) ||
      witherStormOverlay.height !== Math.round(height * pixelRatio)) {
    witherStormOverlay.width = Math.round(width * pixelRatio);
    witherStormOverlay.height = Math.round(height * pixelRatio);
    witherStormOverlayCtx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  witherStormOverrunIntensity = isEating
    ? reducedMotion ? 0.65 : Math.min(1, witherStormOverrunIntensity + 0.008)
    : Math.max(0, witherStormOverrunIntensity - 0.035);
  witherStormOverrunRadius = isEating
    ? Math.min(Math.hypot(width, height), witherStormOverrunRadius + Math.max(2, Math.hypot(width, height) / 360))
    : Math.max(0, witherStormOverrunRadius - Math.max(width, height) / 25);
  if (reducedMotion || interfaceData.settings.decorativeEffects === false) witherStormOverrunFragments = [];
  if (boss && isEating) {
    const bounds = canvas.getBoundingClientRect();
    witherStormOverrunTarget = {
      x: bounds.left + (boss.x + boss.width / 2) * bounds.width / WIDTH,
      y: bounds.top + (boss.y + boss.height / 2) * bounds.height / HEIGHT
    };
    if (!reducedMotion && movingTick % 4 === 0 && witherStormLastCaptureTick !== movingTick) {
      witherStormLastCaptureTick = movingTick;
      captureWitherStormPixels(bounds, witherStormOverrunTarget);
    }
  }

  if (witherStormOverrunIntensity <= 0 && witherStormOverrunRadius <= 0 && witherStormOverrunFragments.length === 0) {
    witherStormOverlay.style.display = "none";
    witherStormOverrunTarget = null;
    return;
  }
  witherStormOverlay.style.display = "block";
  witherStormOverlayCtx.clearRect(0, 0, width, height);
  if (witherStormOverrunRadius > 0 && witherStormOverrunTarget) {
    drawWitherStormEatingMask(witherStormOverrunTarget, width, height);
  }
  if (boss && isEating) drawWitherStormScreenRift(boss, witherStormOverrunTarget, width, height, reducedMotion);
  drawWitherStormPixelFragments(reducedMotion);
  if (witherStormOverrunRadius > 0) drawWitherStormProtectedObjects(canvas.getBoundingClientRect());
}

function drawWitherStormEatingMask(target, width, height) {
  const radius = witherStormOverrunRadius;
  const cellSize = 8;
  const startY = Math.max(0, Math.floor((target.y - radius) / cellSize) * cellSize);
  const endY = Math.min(height, Math.ceil((target.y + radius) / cellSize) * cellSize);

  witherStormOverlayCtx.save();
  witherStormOverlayCtx.fillStyle = `rgba(22, 7, 29, ${0.96 * witherStormOverrunIntensity})`;
  for (let y = startY; y < endY; y += cellSize) {
    const rowY = y + cellSize / 2 - target.y;
    const halfWidth = Math.sqrt(Math.max(0, radius * radius - rowY * rowY));
    const edge = Math.sin(y * 0.17 + movingTick * 0.09) * cellSize;
    const left = Math.max(0, Math.floor((target.x - halfWidth + edge) / cellSize) * cellSize);
    const right = Math.min(width, Math.ceil((target.x + halfWidth + edge) / cellSize) * cellSize);
    if (right > left) witherStormOverlayCtx.fillRect(left, y, right - left, cellSize);
  }
  witherStormOverlayCtx.restore();
}

function drawWitherStormProtectedObjects(bounds) {
  const scaleX = bounds.width / WIDTH;
  const scaleY = bounds.height / HEIGHT;
  const objects = [...getPaddles(), ...balls];
  for (const object of objects) {
    const left = bounds.left + object.x * scaleX;
    const top = bounds.top + object.y * scaleY;
    const width = object.width * scaleX;
    const height = object.height * scaleY;
    const sourceX = Math.max(0, object.x);
    const sourceY = Math.max(0, object.y);
    const sourceWidth = Math.min(WIDTH - sourceX, object.width);
    const sourceHeight = Math.min(HEIGHT - sourceY, object.height);
    if (sourceWidth <= 0 || sourceHeight <= 0) continue;

    witherStormOverlayCtx.clearRect(left, top, width, height);
    witherStormOverlayCtx.drawImage(
      canvas,
      sourceX, sourceY, sourceWidth, sourceHeight,
      left, top, sourceWidth * scaleX, sourceHeight * scaleY
    );
  }
}

function captureWitherStormPixels(bounds, target) {
  const scaleX = bounds.width / WIDTH;
  const scaleY = bounds.height / HEIGHT;
  for (let index = 0; index < 3; index += 1) {
    const sourceX = Math.floor(GameJuice.random() * (WIDTH - 4));
    const sourceY = Math.floor(GameJuice.random() * (HEIGHT - 4));
    try {
      const pixels = ctx.getImageData(sourceX, sourceY, 4, 4);
      const tile = document.createElement("canvas");
      tile.width = 4;
      tile.height = 4;
      tile.getContext("2d").putImageData(pixels, 0, 0);
      witherStormOverrunFragments.push({
        tile,
        x: bounds.left + sourceX * scaleX,
        y: bounds.top + sourceY * scaleY,
        targetX: target.x,
        targetY: target.y,
        size: 4 + GameJuice.random() * 5,
        life: 52,
        maxLife: 52,
        drift: GameJuice.random() * Math.PI * 2
      });
    } catch (error) {
      return;
    }
  }
  if (witherStormOverrunFragments.length > 120) {
    witherStormOverrunFragments.splice(0, witherStormOverrunFragments.length - 120);
  }
}

function drawWitherStormPixelFragments(reducedMotion) {
  for (let index = witherStormOverrunFragments.length - 1; index >= 0; index -= 1) {
    const fragment = witherStormOverrunFragments[index];
    if (witherStormOverrunTarget) {
      fragment.targetX = witherStormOverrunTarget.x;
      fragment.targetY = witherStormOverrunTarget.y;
    }
    const pull = reducedMotion ? 0.12 : 0.035;
    const drift = reducedMotion ? 0 : Math.sin(fragment.drift + movingTick * 0.08) * 1.5;
    fragment.x += (fragment.targetX - fragment.x) * pull + drift;
    fragment.y += (fragment.targetY - fragment.y) * pull;
    fragment.life -= 1;
    if (fragment.life <= 0) {
      witherStormOverrunFragments.splice(index, 1);
      continue;
    }
    witherStormOverlayCtx.globalAlpha = Math.min(1, fragment.life / 16);
    witherStormOverlayCtx.drawImage(fragment.tile, fragment.x, fragment.y, fragment.size, fragment.size);
  }
  witherStormOverlayCtx.globalAlpha = 1;
}

function drawWitherStormScreenRift(boss, target, width, height, reducedMotion) {
  const intensity = witherStormOverrunIntensity;
  const bounds = canvas.getBoundingClientRect();
  const bodyWidth = bounds.width * (boss.phase >= 7 ? 0.42 + intensity * 0.86 : 0.2 + intensity * 0.38);
  const bodyHeight = bounds.height * (boss.phase >= 7 ? 0.3 + intensity * 0.58 : 0.17 + intensity * 0.22);
  const radius = Math.max(width, height) * (boss.phase >= 7 ? 0.3 + intensity * 0.92 : 0.18 + intensity * 0.42);
  const stormCtx = witherStormOverlayCtx;

  stormCtx.save();
  const rift = stormCtx.createRadialGradient(target.x, target.y, bodyWidth * 0.12,
    target.x, target.y, Math.max(1, radius));
  rift.addColorStop(0, `rgba(9, 4, 15, ${0.36 * intensity})`);
  rift.addColorStop(0.55, `rgba(24, 8, 31, ${0.2 * intensity})`);
  rift.addColorStop(1, "rgba(21, 4, 29, 0)");
  stormCtx.fillStyle = rift;
  stormCtx.fillRect(0, 0, width, height);

  const tendrilCount = boss.phase >= 7 ? 13 : 7;
  const sweep = reducedMotion ? 0 : movingTick * 0.009;
  for (let index = 0; index < tendrilCount; index += 1) {
    const angle = index * Math.PI * 2 / tendrilCount + sweep;
    const startX = target.x + Math.cos(angle) * bodyWidth * 0.22;
    const startY = target.y + Math.sin(angle) * bodyHeight * 0.2;
    const reach = Math.hypot(width, height) * (0.32 + intensity * 0.55);
    const endX = Math.max(-40, Math.min(width + 40, target.x + Math.cos(angle) * reach));
    const endY = Math.max(-40, Math.min(height + 40, target.y + Math.sin(angle) * reach));
    const bend = Math.sin(angle + sweep * 2) * 55;
    stormCtx.beginPath();
    stormCtx.moveTo(startX, startY);
    stormCtx.quadraticCurveTo(
      (startX + endX) / 2 - Math.sin(angle) * bend,
      (startY + endY) / 2 + Math.cos(angle) * bend,
      endX,
      endY
    );
    stormCtx.lineCap = "round";
    stormCtx.strokeStyle = `rgba(18, 12, 24, ${0.74 * intensity})`;
    stormCtx.lineWidth = 9 + intensity * (boss.phase >= 7 ? 28 : 14);
    stormCtx.stroke();
    stormCtx.strokeStyle = `rgba(164, 54, 158, ${0.42 * intensity})`;
    stormCtx.lineWidth = 2 + intensity * 4;
    stormCtx.stroke();
  }

  stormCtx.shadowColor = "#8f3a98";
  stormCtx.shadowBlur = 18 * intensity;
  stormCtx.fillStyle = `rgba(28, 19, 34, ${0.88 * intensity})`;
  stormCtx.beginPath();
  stormCtx.ellipse(target.x, target.y, bodyWidth / 2, bodyHeight / 2, 0, 0, Math.PI * 2);
  stormCtx.fill();
  for (const offset of [-0.31, 0, 0.31]) {
    stormCtx.beginPath();
    stormCtx.ellipse(target.x + bodyWidth * offset, target.y - bodyHeight * 0.1,
      bodyWidth * 0.2, bodyHeight * 0.38, 0, 0, Math.PI * 2);
    stormCtx.fill();
  }

  const eyeCount = boss.phase >= 7 ? 9 : 3;
  for (let index = 0; index < eyeCount; index += 1) {
    const eyeX = target.x + (index - (eyeCount - 1) / 2) * bodyWidth / (eyeCount + 1);
    const eyeY = target.y - bodyHeight * (index % 2 === 0 ? 0.16 : 0.08);
    stormCtx.fillStyle = `rgba(222, 116, 244, ${0.9 * intensity})`;
    stormCtx.fillRect(eyeX - 4, eyeY - 5, 8, 10);
    stormCtx.fillStyle = `rgba(255, 246, 255, ${0.85 * intensity})`;
    stormCtx.fillRect(eyeX - 1, eyeY - 2, 3, 4);
  }
  stormCtx.fillStyle = `rgba(4, 3, 8, ${0.88 * intensity})`;
  stormCtx.fillRect(target.x - bodyWidth * 0.12, target.y + bodyHeight * 0.12,
    bodyWidth * 0.24, bodyHeight * 0.16);
  stormCtx.restore();
}

function drawFungalCorruption() {
  if (!fungalCorruption.active) return;

  ctx.save();
  ctx.fillStyle = "#000000";
  for (let row = 0; row < fungalCorruption.rows; row += 1) {
    let runStart = -1;
    for (let column = 0; column <= fungalCorruption.columns; column += 1) {
      const infected = column < fungalCorruption.columns && fungalCorruption.infected[row * fungalCorruption.columns + column];
      if (infected && runStart < 0) runStart = column;
      if (!infected && runStart >= 0) {
        ctx.fillRect(
          runStart * FUNGAL_CELL_SIZE,
          row * FUNGAL_CELL_SIZE,
          (column - runStart) * FUNGAL_CELL_SIZE,
          FUNGAL_CELL_SIZE
        );
        runStart = -1;
      }
    }
  }
  ctx.restore();
}

function drawPaddle(targetPaddle) {
  const scale = paddleImpact > 0 && impactPaddle === targetPaddle ? 1 + paddleImpact / 90 : 1;
  ctx.save();
  ctx.translate(targetPaddle.x + targetPaddle.width / 2, targetPaddle.y + targetPaddle.height / 2);
  ctx.scale(1, scale);
  ctx.translate(-(targetPaddle.x + targetPaddle.width / 2), -(targetPaddle.y + targetPaddle.height / 2));
  ctx.shadowColor = getCustomizationColor("paddle");
  ctx.shadowBlur = interfaceData.settings.reducedMotion || interfaceData.settings.decorativeEffects === false
    ? 0 : 8 * interfaceData.settings.effectsIntensity * GameJuice.getQuality().glow;
  drawSquircle(targetPaddle.x, targetPaddle.y, targetPaddle.width, targetPaddle.height);
  if (targetPaddle === paddle) {
    ctx.fillStyle = `${gameTheme.text}bb`;
    drawSquircle(targetPaddle.x + targetPaddle.width * 0.42, targetPaddle.y + 2,
      targetPaddle.width * 0.16, Math.max(2, targetPaddle.height - 4));
  }
  if (interfaceData.settings.decorativeEffects !== false) {
    const targetX = targetPaddle === paddle ? paddleTargetX : secondPaddleTargetX;
    const acceleration = Math.max(-1, Math.min(1, (targetX - targetPaddle.x) / 35));
    const highlightOffset = acceleration * targetPaddle.width * 0.18;
    const highlight = ctx.createLinearGradient(
      targetPaddle.x + targetPaddle.width * 0.5 + highlightOffset - targetPaddle.width * 0.18,
      0,
      targetPaddle.x + targetPaddle.width * 0.5 + highlightOffset + targetPaddle.width * 0.18,
      0
    );
    highlight.addColorStop(0, `${gameTheme.accentSecondary}00`);
    highlight.addColorStop(0.5, `${gameTheme.accentSecondary}bb`);
    highlight.addColorStop(1, `${gameTheme.accentSecondary}00`);
    ctx.fillStyle = highlight;
    ctx.fillRect(targetPaddle.x + 5, targetPaddle.y + 2, targetPaddle.width - 10, 2);
  }
  ctx.restore();
}

function drawInvaders() {
  for (const invader of invaders) {
    if (invader.type === "eater") {
      drawAdminEater(invader);
      continue;
    }
    if (invader.variant === "wither-storm") {
      drawWitherStorm(invader);
      continue;
    }
    if (invader.variant === "galactic-commander") {
      drawGalacticCommander(invader);
      drawCorruptionRepairMarker(invader);
      continue;
    }
    if (invader.galaga) {
      drawGalagaEnemy(invader);
      drawCorruptionRepairMarker(invader);
      continue;
    }
    const { x, y, width, height } = invader;
    const colors = {
      standard: gameTheme.enemy,
      scout: gameTheme.accentSecondary,
      tank: gameTheme.enemy,
      sniper: gameTheme.projectile,
      phantom: gameTheme.accentTertiary,
      "shield-generator": gameTheme.accentSecondary,
      splitter: gameTheme.accentTertiary,
      boss: gameTheme.accent
    };
    const idleOffset = interfaceData.settings.reducedMotion ? 0 : Math.sin(movingTick / 14 + x * 0.02) * 1.1;
    ctx.fillStyle = invader.flashTimer > 0 ? "#ffffff" : invader.adminColor || colors[invader.type] || "white";
    ctx.globalAlpha = invader.intangible ? 0.25 : 1;
    ctx.fillRect(x + 7, y + idleOffset, width - 14, 5);
    ctx.fillRect(x + 3, y + 5 + idleOffset, width - 6, 8);
    ctx.fillRect(x, y + 11 + idleOffset, width, 5);
    ctx.fillRect(x + 5, y + 16 + idleOffset, 5, height - 16);
    ctx.fillRect(x + width - 10, y + 16 + idleOffset, 5, height - 16);
    ctx.fillStyle = gameTheme.background;
    ctx.fillRect(x + 8, y + 7, 3, 3);
    ctx.fillRect(x + width - 11, y + 7, 3, 3);
    if (interfaceData.settings.colorblind) {
      const symbols = { standard: "I", scout: "S", tank: "T", sniper: "N", phantom: "P", "shield-generator": "G", splitter: "X", boss: "B" };
      const markerWidth = invader.type === "boss" ? 13 : 9;
      ctx.globalAlpha = 1;
      ctx.fillStyle = gameTheme.background;
      ctx.fillRect(x + width - markerWidth, y - 3, markerWidth, 9);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1;
      ctx.strokeRect(x + width - markerWidth, y - 3, markerWidth, 9);
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 7px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(symbols[invader.type] || "I", x + width - markerWidth / 2, y + 1);
    }
    ctx.globalAlpha = 1;
    drawCorruptionRepairMarker(invader, x, y + idleOffset);
  }
}

function drawWitherStorm(boss) {
  const { x, y, width, height } = boss;
  const centerX = x + width / 2;
  const bodyColor = boss.flashTimer > 0 ? "#ffffff" : boss.adminColor || "#302638";
  const shadowColor = "#17131d";
  drawWitherStormTractorBeams(boss);
  ctx.save();
  if (!interfaceData.settings.reducedMotion) {
    ctx.shadowColor = boss.coreOpen ? "#e45bd5" : "#78518e";
    ctx.shadowBlur = 9 * interfaceData.settings.effectsIntensity * GameJuice.getQuality().glow;
  }
  ctx.fillStyle = shadowColor;
  ctx.fillRect(x + 24, y + 23, width - 48, 62);
  ctx.fillRect(x + 5, y + 32, 54, 43);
  ctx.fillRect(x + width - 59, y + 32, 54, 43);
  ctx.fillStyle = bodyColor;
  ctx.fillRect(x + 33, y + 14, width - 66, 65);
  ctx.fillRect(x + 12, y + 27, 55, 42);
  ctx.fillRect(x + width - 67, y + 27, 55, 42);
  if (boss.phase >= 6) {
    for (const bodyX of [x + 5, x + width / 3, x + width * 2 / 3]) {
      ctx.fillStyle = shadowColor;
      ctx.fillRect(bodyX, y + 45, 54, 43);
      ctx.fillStyle = bodyColor;
      ctx.fillRect(bodyX + 5, y + 48, 44, 35);
    }
  }
  ctx.fillRect(centerX - 18, y + 4, 36, 16);
  ctx.fillRect(centerX - 60, y + 18, 30, 18);
  ctx.fillRect(centerX + 30, y + 18, 30, 18);

  const headPositions = boss.phase < 3 ? [centerX] : [x + 39, centerX, x + width - 39];
  const headRows = boss.phase >= 6 ? [y + 31, y + 47, y + 63] : [y + 40];
  for (const headX of headPositions) {
    for (const headY of headRows) {
      ctx.fillStyle = boss.phase >= 3 ? "#d887ed" : "#f0d7e8";
      ctx.fillRect(headX - 10, headY, 7, 7);
      ctx.fillRect(headX + 3, headY, 7, 7);
      ctx.fillStyle = boss.phase >= 3 ? "#4c1d69" : "#281d30";
      ctx.fillRect(headX - 8, headY + 2, 3, 3);
      ctx.fillRect(headX + 5, headY + 2, 3, 3);
    }
  }

  ctx.fillStyle = boss.phase === 7 ? "#120c17" : boss.coreOpen ? "#ffb5f2" : "#8d508f";
  ctx.fillRect(centerX - 13, y + 58, 26, 20);
  ctx.fillStyle = boss.phase === 7 && boss.coreOpen ? "#fff0fb" : boss.coreOpen ? "#fff0fb" : "#4a3150";
  ctx.fillRect(centerX - 6, y + 62, 12, 12);
  if (boss.phase === 7) {
    ctx.fillStyle = "#f6d5e8";
    ctx.fillRect(centerX - 12, y + 56, 4, 3);
    ctx.fillRect(centerX + 8, y + 56, 4, 3);
    ctx.fillRect(centerX - 12, y + 77, 4, 3);
    ctx.fillRect(centerX + 8, y + 77, 4, 3);
  }

  ctx.fillStyle = shadowColor;
  const tendrilCount = boss.phase >= 6 ? 9 : boss.phase >= 3 ? 5 : 2;
  for (let tendril = 0; tendril < tendrilCount; tendril += 1) {
    const tendrilX = x + 10 + tendril * (width - 20) / Math.max(1, tendrilCount - 1);
    const tendrilY = y + 78 + (tendril % 2) * 4;
    ctx.beginPath();
    ctx.moveTo(tendrilX, tendrilY);
    ctx.lineTo(tendrilX + 20, tendrilY + 2);
    ctx.lineTo(tendrilX + 18 + Math.sin(boss.hoverTick + tendril) * 4, y + height);
    ctx.lineTo(tendrilX + 8, tendrilY + 13);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = boss.coreOpen ? "#ffd4f5" : "#c28ac3";
  ctx.font = "bold 10px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(boss.phase === 7 && boss.coreOpen ? "BOWELS EXPOSED" : boss.coreOpen ? "CORE EXPOSED" : "CORE SHIELDED",
    centerX, y + height + 12);
}

function drawInvaderBullets() {
  for (const bullet of invaderBullets) {
    if (bullet.witherOrb) {
      ctx.fillStyle = "#dd81db";
      ctx.beginPath();
      ctx.arc(bullet.x + bullet.width / 2, bullet.y + bullet.height / 2, bullet.width / 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff0fb";
      ctx.fillRect(bullet.x + bullet.width / 2 - 2, bullet.y + bullet.height / 2 - 2, 4, 4);
      continue;
    }
    ctx.fillStyle = bullet.electric ? gameTheme.accentSecondary : gameTheme.projectile;
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    if (bullet.electric) {
      ctx.strokeStyle = gameTheme.text;
      ctx.strokeRect(bullet.x - 2, bullet.y - 2, bullet.width + 4, bullet.height + 4);
    }
  }
}

function updateStatus() {
  updateStatusCounter("level", level);
  updateStatusCounter("lives", activeMode === "zen" ? "∞" : lives);
  updateStatusCounter("score", score, (value) => Math.round(value).toLocaleString());
  updateStatusCounter("high-score", highScore, (value) => Math.round(value).toLocaleString());
  updateStatusCounter("combo", combo, (value) => `x${Math.round(value)}`);
  updateStatusCounter("bricks-left", remainingBrickTargets());
  updateStatusCounter("invaders-left", invaders.length);
  updateCorruptionStatus();
  updateChaosIntensityStatus();
  const ricochetStreak = Math.max(0, ...balls.map((targetBall) => targetBall.tetrominoRicochetStreak || 0));
  const streakStatus = document.getElementById("ricochet-streak");
  streakStatus.textContent = ricochetStreak ? `x${Math.min(5, 1 + Math.floor(ricochetStreak / 3))} · ${ricochetStreak}` : "—";
  document.getElementById("ricochet-streak-indicator").hidden = interfaceData.settings.obstacleDensity !== "chaos";
  document.getElementById("mode").textContent = getModeName(activeMode);
  document.getElementById("world").textContent = getWorldName();
  document.getElementById("timer").textContent = activeMode === "time_attack" ? `${Math.ceil(modeTimer / 60)}s` : "";
  const remainingBricks = remainingBrickTargets();
  const remainingInvaders = invaders.length;
  const brickProgress = objectiveBrickTotal ? (objectiveBrickTotal - remainingBricks) / objectiveBrickTotal : 1;
  const invaderProgress = objectiveInvaderTotal ? (objectiveInvaderTotal - remainingInvaders) / objectiveInvaderTotal : 1;
  document.getElementById("bricks-progress-bar").style.width = `${Math.max(0, Math.min(1, brickProgress)) * 100}%`;
  document.getElementById("invaders-progress-bar").style.width = `${Math.max(0, Math.min(1, invaderProgress)) * 100}%`;
  updatePowerUpStatus();
  updateSpecialAbilityStatus();
}

function updateStatusCounter(id, target, format = (value) => String(value)) {
  const element = document.getElementById(id);
  if (typeof target !== "number") {
    statusCounters.delete(element);
    element.textContent = target;
    return;
  }
  let animation = statusCounters.get(element);
  if (!animation) {
    animation = { current: target, from: target, target, start: performance.now() };
    statusCounters.set(element, animation);
  } else if (animation.target !== target) {
    animation.from = animation.current;
    animation.target = target;
    animation.start = performance.now();
  }
  const progress = Math.min(1, (performance.now() - animation.start) / 180);
  const eased = 1 - (1 - progress) ** 3;
  animation.current = animation.from + (animation.target - animation.from) * eased;
  element.textContent = format(animation.current);
}

function drawGameBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, gameTheme.background);
  gradient.addColorStop(1, gameTheme.surface);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  if (interfaceData.settings.decorativeEffects === false || GameJuice.getQuality().multiplier < 0.6) return;
  for (const star of backgroundStars) {
    const y = (star.y + (interfaceData.settings.reducedMotion ? 0 : movingTick * star.speed)) % HEIGHT;
    ctx.globalAlpha = 0.18 + (star.radius > 1 ? 0.12 : 0);
    ctx.fillStyle = gameTheme.accentSecondary;
    ctx.fillRect(star.x, y, star.radius, star.radius);
  }
  ctx.globalAlpha = 1;
  if (interfaceData.settings.animatedGrid && !interfaceData.settings.reducedMotion) {
    ctx.strokeStyle = `${gameTheme.accent}18`;
    ctx.lineWidth = 1;
    const gridOffset = movingTick % 36;
    for (let y = gridOffset; y < HEIGHT; y += 36) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(WIDTH, y);
      ctx.stroke();
    }
  }
}

function drawGameParticles() {
  if (interfaceData.settings.decorativeEffects === false) return;
  for (const particle of gameParticles) {
    ctx.globalAlpha = particle.life / particle.maxLife * 0.72;
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
  }
  ctx.globalAlpha = 1;
}

function remainingBrickTargets() {
  return bricks.filter((brick) => brick.type !== "indestructible").length;
}

function drawSquircle(x, y, width, height) {
  const radius = Math.min(width, height) / 3;
  const control = radius * 0.8;
  const right = x + width;
  const bottom = y + height;

  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(right - radius, y);
  ctx.bezierCurveTo(right - radius + control, y, right, y + radius - control, right, y + radius);
  ctx.lineTo(right, bottom - radius);
  ctx.bezierCurveTo(right, bottom - radius + control, right - radius + control, bottom, right - radius, bottom);
  ctx.lineTo(x + radius, bottom);
  ctx.bezierCurveTo(x + radius - control, bottom, x, bottom - radius + control, x, bottom - radius);
  ctx.lineTo(x, y + radius);
  ctx.bezierCurveTo(x, y + radius - control, x + radius - control, y, x + radius, y);
  ctx.closePath();
  ctx.fill();
}

const STEP = 1000 / 60;
let lastTime = 0;
let leftover = 0;

function frame(now) {
  if (interfaceData.customization.theme === "legacy") {
    lastTime = now;
    leftover = 0;
    requestAnimationFrame(frame);
    return;
  }
  leftover = leftover + (now - lastTime);
  lastTime = now;

  if (leftover > 250) {
    leftover = 250;
  }

  while (leftover >= STEP) {
    update();
    leftover = leftover - STEP;
  }

  updateMusic();
  draw();
  if (document.hidden && gameActive && !paused && !gameOver) pauseGame();
  requestAnimationFrame(frame);
}

function resetGame() {
  const selectedMode = document.getElementById("mode-select").value;
  if (selectedMode === "endless" && !endlessUnlocked) {
    document.getElementById("mode-select").value = "campaign";
    activeMode = "campaign";
  } else {
    activeMode = selectedMode;
  }
  modeTimer = 120 * 60;
  dailySeed = getDailySeed();
  invaderBullets = [];
  fungalCorruption = createFungalCorruptionState();
  invaderDirection = 1;
  invaderFireTimer = 0;
  paddle.width = 72;
  secondPaddle.width = 72;
  paddle.x = WIDTH / 2 - paddle.width / 2;
  secondPaddle.x = WIDTH / 2 - secondPaddle.width / 2;
  paddleTargetX = paddle.x;
  secondPaddleTargetX = secondPaddle.x;
  level = 1;
  score = 0;
  combo = 0;
  comboTimer = 0;
  perfectHitTimer = 0;
  trickShotTimer = 0;
  fallingPowerUps = [];
  activeEffects = {};
  resetSpecialAbility();
  laserShots = [];
  shieldCharges = 0;
  laserCooldown = 0;
  shockwaveTimer = 0;
  resetGalacticBossState();
  resetCorruptionState();
  cameraShake = 0;
  paddleImpact = 0;
  impactPaddle = paddle;
  witherStormOverrunFragments = [];
  witherStormOverrunIntensity = 0;
  witherStormOverrunRadius = 0;
  witherStormOverrunTarget = null;
  witherStormLastCaptureTick = -1;
  gameParticles.length = 0;
  gameParticlePool.length = 0;
  GameJuice.clear();
  clearTetrominoes();
  movingTick = 0;
  gravityField = null;
  resetChaosMode();
  paddle.width = 72;
  secondPaddle.width = 72;
  paddleTargetX = paddle.x;
  secondPaddleTargetX = secondPaddle.x;
  started = false;
  ballAttached = true;
  balls = [ball];
  paused = false;
  gameOver = false;
  campaignComplete = false;
  dailyComplete = false;
  levelStartScore = 0;
  lives = getModeLives();
  resetAdminSandbox();
  if (activeMode === "coop") {
    paddle.x = WIDTH / 4 - paddle.width / 2;
    secondPaddle.x = WIDTH * 3 / 4 - secondPaddle.width / 2;
    paddleTargetX = paddle.x;
    secondPaddleTargetX = secondPaddle.x;
  }
  initializeModeLevel();
  positionBall();
  updateStatus();
}

function start() {
  endlessUnlocked = loadEndlessUnlocked();
  document.getElementById("mode-select").addEventListener("change", () => {
    resetGame();
    beginGame(false);
  });
  document.getElementById("restart-mode").addEventListener("click", () => {
    resetGame();
    beginGame(false);
  });
  setEndlessOptionState();
  resetGame();
  lastTime = performance.now();
  requestAnimationFrame(frame);
}

window.addEventListener("load", start);