const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

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
let ballAttached = true;
let balls = [ball];
let started = false;
let level = 1;
let lives = STARTING_LIVES;
let score = 0;
let highScore = loadHighScore();
let combo = 0;
let comboTimer = 0;
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
  const key = event.key.toLowerCase();
  const interactiveFocus = event.target.closest?.("button, input, select, textarea, a");
  if (interactiveFocus && event.code !== "Escape") return;
  keys[key] = true;
  if (!event.repeat) unlockAudio();

  if (event.code === "Space") {
    if (event.target !== canvas && event.target !== document.body) return;
    event.preventDefault();
    if (!event.repeat && !paused && !gameOver && gameActive) {
      recordLaunch();
      started = true;
      launchBall();
    }
  } else if (key === "r" && !event.repeat && (gameActive || gameOver)) {
    resetGame();
    beginGame(false);
  } else if ((key === "p" || key === "escape") && !event.repeat && !gameOver && gameActive) {
    if (paused) resumeGame();
    else pauseGame();
  }

  if (event.key.startsWith("Arrow")) {
    event.preventDefault();
  }
});

document.addEventListener("keyup", function (event) {
  keys[event.key.toLowerCase()] = false;
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
  updateGameEffects();
  updateTetrominoEffects();
  movePaddle();
  if (ballAttached) {
    positionBall();
  }
  if (!started) {
    return;
  }

  if (activeMode === "time_attack") {
    modeTimer -= 1;
    if (modeTimer <= 0) {
      modeTimer = 0;
      showGameOver();
      return;
    }
  }

  updateMechanics();
  moveInvaders();
  updateTetrominoes();
  for (let index = balls.length - 1; index >= 0; index -= 1) {
    const targetBall = balls[index];
    if (targetBall.caught) continue;
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

  if (!gameOver && started && areModeObjectivesComplete()) advanceModeLevel();

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
    const pausePressed = Boolean(gamepad.buttons[9]?.pressed);
    const previous = gamepadButtonState.get(gamepad.index) || { launch: false, pause: false };
    if (launchPressed && !previous.launch && gameActive && !paused && !gameOver) {
      recordLaunch();
      started = true;
      launchBall();
    }
    if (pausePressed && !previous.pause && gameActive && !gameOver) {
      if (paused) resumeGame();
      else pauseGame();
    }
    gamepadButtonState.set(gamepad.index, { launch: launchPressed, pause: pausePressed });
  }
}

function movePaddle() {
  const speed = paddle.speed * (activeEffects.slow ? 0.7 : 1);
  if (activeMode === "coop") {
    if (keys["arrowleft"]) paddleTargetX -= speed;
    if (keys["arrowright"]) paddleTargetX += speed;
    if (keys["a"]) secondPaddleTargetX -= speed;
    if (keys["d"]) secondPaddleTargetX += speed;
    paddleTargetX = Math.max(0, Math.min(WIDTH / 2 - paddle.width, paddleTargetX));
    secondPaddleTargetX = Math.max(WIDTH / 2, Math.min(WIDTH - secondPaddle.width, secondPaddleTargetX));
    paddle.x += (paddleTargetX - paddle.x) * 0.72;
    secondPaddle.x += (secondPaddleTargetX - secondPaddle.x) * 0.72;
    return;
  }
  if (keys["arrowleft"] || keys["a"]) paddleTargetX -= speed;
  if (keys["arrowright"] || keys["d"]) paddleTargetX += speed;
  paddleTargetX = Math.max(0, Math.min(WIDTH - paddle.width, paddleTargetX));
  paddle.x += (paddleTargetX - paddle.x) * 0.72;
}

function positionBall() {
  if (balls.length === 0) balls = [ball];
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
  const speed = 0.9 * (activeEffects.slow ? 0.55 : 1);
  const leftEdge = Math.min(...invaders.map((invader) => invader.x)) + invaderDirection * speed;
  const rightEdge = Math.max(...invaders.map((invader) => invader.x + invader.width)) + invaderDirection * speed;

  if (leftEdge < 18 || rightEdge > WIDTH - 18) {
    invaderDirection *= -1;
    if (!invaders.some((invader) => invader.type === "boss")) {
      for (const invader of invaders) {
        invader.y += 14;
      }
    }
  }

  for (const invader of invaders) {
    const typeMultiplier = invader.type === "scout" ? 1.8 : invader.type === "boss" && invader.phase > 1 ? 1.5 : invader.small ? 1.5 : 1;
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
  updateStatus();
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
  if (interfaceData.settings.motionBlur && interfaceData.settings.effectsIntensity > 0 && !interfaceData.settings.reducedMotion && started && !paused && !gameOver) {
    const blurAlpha = 0.42 * interfaceData.settings.effectsIntensity;
    ctx.fillStyle = `rgba(0, 0, 0, ${blurAlpha})`;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  } else {
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = gameTheme.background;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  ctx.save();
  if (interfaceData.settings.cameraShake && !interfaceData.settings.reducedMotion && cameraShake > 0) {
    const shake = cameraShake * interfaceData.settings.effectsIntensity;
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  }
  drawGameBackground();
  drawTetrominoes();
  ctx.fillStyle = getCustomizationColor("paddle");
  drawPaddle(paddle);
  if (activeMode === "coop") drawPaddle(secondPaddle);
  for (const targetBall of balls) {
    const trailColor = interfaceData.settings.reducedMotion || interfaceData.customization.trail === "none"
      ? null
      : interfaceData.customization.trail === "spark" ? gameTheme.accentSecondary
      : interfaceData.customization.trail === "ember" ? gameTheme.accent : gameTheme.accentSecondary;
    if (trailColor && targetBall.trail) {
      targetBall.trail.forEach((point, index) => {
        ctx.globalAlpha = (index + 1) / targetBall.trail.length * 0.18 * interfaceData.settings.effectsIntensity;
        ctx.fillStyle = trailColor;
        ctx.shadowColor = trailColor;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(point.x, point.y, targetBall.width * (index + 1) / targetBall.trail.length / 2, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
    }
    ctx.fillStyle = targetBall.piercing ? "#ff8a3d" : getCustomizationColor("ball");
    ctx.shadowColor = ctx.fillStyle;
    ctx.shadowBlur = 7 * interfaceData.settings.effectsIntensity;
    drawSquircle(targetBall.x, targetBall.y, targetBall.width, targetBall.height);
    ctx.shadowBlur = 0;
  }
  drawBricks();
  drawInvaders();
  drawEnemyDetails();
  drawGameParticles();
  drawInvaderBullets();
  drawPowerUps();
  drawBossHealth();
  if (gravityField) {
    ctx.strokeStyle = `${gameTheme.accentSecondary}99`;
    ctx.beginPath();
    ctx.arc(gravityField.x, gravityField.y, gravityField.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

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
}

function drawPaddle(targetPaddle) {
  const scale = paddleImpact > 0 && impactPaddle === targetPaddle ? 1 + paddleImpact / 90 : 1;
  ctx.save();
  ctx.translate(targetPaddle.x + targetPaddle.width / 2, targetPaddle.y + targetPaddle.height / 2);
  ctx.scale(1, scale);
  ctx.translate(-(targetPaddle.x + targetPaddle.width / 2), -(targetPaddle.y + targetPaddle.height / 2));
  ctx.shadowColor = getCustomizationColor("paddle");
  ctx.shadowBlur = interfaceData.settings.reducedMotion ? 0 : 8 * interfaceData.settings.effectsIntensity;
  drawSquircle(targetPaddle.x, targetPaddle.y, targetPaddle.width, targetPaddle.height);
  ctx.restore();
}

function drawInvaders() {
  for (const invader of invaders) {
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
    ctx.fillStyle = invader.flashTimer > 0 ? "#ffffff" : colors[invader.type] || "white";
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
  }
}

function drawInvaderBullets() {
  for (const bullet of invaderBullets) {
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
  invaderDirection = 1;
  invaderFireTimer = 0;
  paddle.x = WIDTH / 2 - paddle.width / 2;
  secondPaddle.x = WIDTH / 2 - secondPaddle.width / 2;
  paddleTargetX = paddle.x;
  secondPaddleTargetX = secondPaddle.x;
  level = 1;
  score = 0;
  combo = 0;
  comboTimer = 0;
  fallingPowerUps = [];
  activeEffects = {};
  laserShots = [];
  shieldCharges = 0;
  laserCooldown = 0;
  shockwaveTimer = 0;
  cameraShake = 0;
  paddleImpact = 0;
  impactPaddle = paddle;
  gameParticles = [];
  clearTetrominoes();
  movingTick = 0;
  gravityField = null;
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