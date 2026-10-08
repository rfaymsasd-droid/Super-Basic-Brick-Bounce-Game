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
  keys[key] = true;
  if (!event.repeat) unlockAudio();

  if (event.code === "Space") {
    event.preventDefault();
    if (!event.repeat && !paused && !gameOver) {
      started = true;
      launchBall();
    }
  } else if (key === "r" && !event.repeat) {
    resetGame();
  } else if (key === "p" && !event.repeat && !gameOver) {
    paused = !paused;
  }

  if (event.key.startsWith("Arrow")) {
    event.preventDefault();
  }
});

document.addEventListener("keyup", function (event) {
  keys[event.key.toLowerCase()] = false;
});

function update() {
  if (paused || gameOver) {
    return;
  }

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
      gameOver = true;
      updateStatus();
      return;
    }
  }

  updateMechanics();
  moveInvaders();
  for (let index = balls.length - 1; index >= 0; index -= 1) {
    const targetBall = balls[index];
    if (targetBall.caught) continue;
    moveBall(targetBall);
    bounceOffWalls(targetBall);
    for (const currentPaddle of getPaddles()) {
      bounceOffPaddle(targetBall, currentPaddle);
      if (targetBall.caught) break;
    }
    if (targetBall.caught) continue;
    bounceOffBricks(targetBall);
    bounceOffInvaders(targetBall);
    if (targetBall.y > HEIGHT) balls.splice(index, 1);
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

function movePaddle() {
  const speed = paddle.speed * (activeEffects.slow ? 0.7 : 1);
  if (activeMode === "coop") {
    if (keys["arrowleft"]) paddle.x -= speed;
    if (keys["arrowright"]) paddle.x += speed;
    if (keys["a"]) secondPaddle.x -= speed;
    if (keys["d"]) secondPaddle.x += speed;
    paddle.x = Math.max(0, Math.min(WIDTH / 2 - paddle.width, paddle.x));
    secondPaddle.x = Math.max(WIDTH / 2, Math.min(WIDTH - secondPaddle.width, secondPaddle.x));
    return;
  }
  if (keys["arrowleft"] || keys["a"]) paddle.x -= speed;
  if (keys["arrowright"] || keys["d"]) paddle.x += speed;
  paddle.x = Math.max(0, Math.min(WIDTH - paddle.width, paddle.x));
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

function moveBall(targetBall) {
  const speedFactor = activeEffects.slow ? 0.55 : targetBall.slowTimer > 0 ? 0.65 : 1;
  if (gravityField) {
    const dx = gravityField.x - (targetBall.x + targetBall.width / 2);
    const dy = gravityField.y - (targetBall.y + targetBall.height / 2);
    const distance = Math.hypot(dx, dy);
    if (distance < gravityField.radius && distance > 0) {
      targetBall.vx += dx / distance * 0.035;
      targetBall.vy += dy / distance * 0.035;
    }
  }
  targetBall.x += targetBall.vx * speedFactor;
  targetBall.y += targetBall.vy * speedFactor;
}

function moveInvaders() {
  if (invaders.length === 0) {
    return;
  }

  if (activeMode === "classic" || activeMode === "zen") return;
  const speed = (0.7 + Math.min(level * 0.08, 1.2)) * (activeEffects.slow ? 0.55 : 1);
  const leftEdge = Math.min(...invaders.map((invader) => invader.x)) + invaderDirection * speed;
  const rightEdge = Math.max(...invaders.map((invader) => invader.x + invader.width)) + invaderDirection * speed;

  if (leftEdge < 18 || rightEdge > WIDTH - 18) {
    invaderDirection *= -1;
    for (const invader of invaders) {
      invader.y += 14;
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
    : Math.max(28, 90 - level * 5);
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
          electric: activeMode === "campaign" && level >= 11 && level <= 20 && Math.random() < 0.35
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
  updateStatus();
  if (lives === 0) {
    gameOver = true;
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
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "white";
  drawSquircle(paddle.x, paddle.y, paddle.width, paddle.height);
  if (activeMode === "coop") drawSquircle(secondPaddle.x, secondPaddle.y, secondPaddle.width, secondPaddle.height);
  for (const targetBall of balls) {
    ctx.fillStyle = targetBall.piercing ? "#ff8a3d" : "white";
    drawSquircle(targetBall.x, targetBall.y, targetBall.width, targetBall.height);
  }
  drawBricks();
  drawInvaders();
  drawEnemyDetails();
  drawInvaderBullets();
  drawPowerUps();
  drawBossHealth();
  if (gravityField) {
    ctx.strokeStyle = "rgba(152, 108, 255, 0.6)";
    ctx.beginPath();
    ctx.arc(gravityField.x, gravityField.y, gravityField.radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (paused || gameOver || !started) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "white";
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

function drawInvaders() {
  for (const invader of invaders) {
    const { x, y, width, height } = invader;
    const colors = { scout: "#64e8ff", tank: "#ff9f43", sniper: "#ff5757", phantom: "#a88bff", "shield-generator": "#65ffcc", splitter: "#c4ff5c", boss: "#ff4de1" };
    ctx.fillStyle = colors[invader.type] || "white";
    ctx.globalAlpha = invader.intangible ? 0.25 : 1;
    ctx.fillRect(x + 7, y, width - 14, 5);
    ctx.fillRect(x + 3, y + 5, width - 6, 8);
    ctx.fillRect(x, y + 11, width, 5);
    ctx.fillRect(x + 5, y + 16, 5, height - 16);
    ctx.fillRect(x + width - 10, y + 16, 5, height - 16);
    ctx.fillStyle = "black";
    ctx.fillRect(x + 8, y + 7, 3, 3);
    ctx.fillRect(x + width - 11, y + 7, 3, 3);
    ctx.globalAlpha = 1;
  }
}

function drawInvaderBullets() {
  for (const bullet of invaderBullets) {
    ctx.fillStyle = bullet.electric ? "#4de3ff" : "white";
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
    if (bullet.electric) {
      ctx.strokeStyle = "#b5f7ff";
      ctx.strokeRect(bullet.x - 2, bullet.y - 2, bullet.width + 4, bullet.height + 4);
    }
  }
}

function updateStatus() {
  document.getElementById("level").textContent = level;
  document.getElementById("lives").textContent = activeMode === "zen" ? "∞" : lives;
  document.getElementById("score").textContent = score.toLocaleString();
  document.getElementById("high-score").textContent = highScore.toLocaleString();
  document.getElementById("combo").textContent = `x${combo}`;
  document.getElementById("bricks-left").textContent = remainingBrickTargets();
  document.getElementById("invaders-left").textContent = invaders.length;
  document.getElementById("mode").textContent = getModeName(activeMode);
  document.getElementById("world").textContent = getWorldName();
  document.getElementById("timer").textContent = activeMode === "time_attack" ? `${Math.ceil(modeTimer / 60)}s` : "";
  updatePowerUpStatus();
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

  draw();
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
  movingTick = 0;
  gravityField = null;
  paddle.width = 72;
  secondPaddle.width = 72;
  started = false;
  ballAttached = true;
  balls = [ball];
  paused = false;
  gameOver = false;
  campaignComplete = false;
  dailyComplete = false;
  lives = getModeLives();
  if (activeMode === "coop") {
    paddle.x = WIDTH / 4 - paddle.width / 2;
    secondPaddle.x = WIDTH * 3 / 4 - secondPaddle.width / 2;
  }
  initializeModeLevel();
  positionBall();
  updateStatus();
}

function start() {
  endlessUnlocked = loadEndlessUnlocked();
  document.getElementById("mode-select").addEventListener("change", resetGame);
  document.getElementById("restart-mode").addEventListener("click", resetGame);
  setEndlessOptionState();
  resetGame();
  lastTime = performance.now();
  requestAnimationFrame(frame);
}

window.addEventListener("load", start);