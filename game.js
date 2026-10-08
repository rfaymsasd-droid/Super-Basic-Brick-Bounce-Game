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

let bricks = [];
let invaders = [];
let invaderBullets = [];
let invaderDirection = 1;
let invaderFireTimer = 0;
let ballAttached = true;
let started = false;
let level = 1;
let lives = STARTING_LIVES;
let score = 0;
let highScore = loadHighScore();
let combo = 0;
let comboTimer = 0;
let paused = false;
let gameOver = false;

const keys = {};

document.addEventListener("keydown", function (event) {
  const key = event.key.toLowerCase();
  keys[key] = true;

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

  moveInvaders();
  moveBall();
  bounceOffWalls();
  bounceOffPaddle();
  bounceOffBricks();
  bounceOffInvaders();
  updateInvaderBullets();

  if (comboTimer > 0) {
    comboTimer -= 1;
    if (comboTimer === 0) {
      combo = 0;
    }
  }

  if (!gameOver && ball.y > HEIGHT) {
    loseLife();
  }

  if (!gameOver && bricks.length === 0 && invaders.length === 0) {
    level += 1;
    bricks = makeBricks(level);
    invaders = makeInvaders(level);
    invaderBullets = [];
    invaderDirection = 1;
    invaderFireTimer = 0;
    started = false;
    ballAttached = true;
    positionBall();
  }

  updateStatus();
}

function movePaddle() {
  if (keys["arrowleft"] || keys["a"]) {
    paddle.x -= paddle.speed;
  }
  if (keys["arrowright"] || keys["d"]) {
    paddle.x += paddle.speed;
  }

  paddle.x = Math.max(0, Math.min(WIDTH - paddle.width, paddle.x));
}

function positionBall() {
  ball.x = paddle.x + (paddle.width - ball.width) / 2;
  ball.y = paddle.y - ball.height - 2;
}

function launchBall() {
  if (!ballAttached) {
    return;
  }
  ballAttached = false;
  ball.vx = BALL_SPEED * 0.65;
  ball.vy = -BALL_SPEED;
}

function moveBall() {
  ball.x += ball.vx;
  ball.y += ball.vy;
}

function moveInvaders() {
  if (invaders.length === 0) {
    return;
  }

  const speed = 0.7 + Math.min(level * 0.08, 1.2);
  const leftEdge = Math.min(...invaders.map((invader) => invader.x)) + invaderDirection * speed;
  const rightEdge = Math.max(...invaders.map((invader) => invader.x + invader.width)) + invaderDirection * speed;

  if (leftEdge < 18 || rightEdge > WIDTH - 18) {
    invaderDirection *= -1;
    for (const invader of invaders) {
      invader.y += 14;
    }
  }

  for (const invader of invaders) {
    invader.x += invaderDirection * speed;
  }

  invaderFireTimer += 1;
  const fireInterval = Math.max(28, 90 - level * 5);
  if (invaderFireTimer >= fireInterval) {
    invaderFireTimer = 0;
    const shooter = invaders[Math.floor(Math.random() * invaders.length)];
    if (shooter) {
      invaderBullets.push({
        x: shooter.x + shooter.width / 2 - 2,
        y: shooter.y + shooter.height,
        width: 4,
        height: 12,
        speed: INVADER_BULLET_SPEED
      });
    }
  }
}

function updateInvaderBullets() {
  for (let bulletIndex = invaderBullets.length - 1; bulletIndex >= 0; bulletIndex -= 1) {
    const bullet = invaderBullets[bulletIndex];
    bullet.y += bullet.speed;

    if (bullet.y > HEIGHT) {
      invaderBullets.splice(bulletIndex, 1);
      continue;
    }

    if (boxesTouch(bullet, paddle)) {
      invaderBullets.splice(bulletIndex, 1);
      loseLife();
      return;
    }
  }
}

function loseLife() {
  lives -= 1;
  combo = 0;
  comboTimer = 0;
  updateStatus();
  invaderBullets = [];

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
  drawSquircle(ball.x, ball.y, ball.width, ball.height);
  drawBricks();
  drawInvaders();
  drawInvaderBullets();

  if (paused || gameOver || !started) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.font = "bold 42px sans-serif";
    const title = gameOver ? "GAME OVER" : paused ? "PAUSED" : "READY";
    ctx.fillText(title, WIDTH / 2, HEIGHT / 2 - 12);
    ctx.font = "18px sans-serif";
    const prompt = gameOver ? "Press R to restart" : paused ? "Press P to resume" : "Press SPACE to launch";
    ctx.fillText(prompt, WIDTH / 2, HEIGHT / 2 + 28);
  }
}

function drawInvaders() {
  ctx.fillStyle = "white";
  for (const invader of invaders) {
    const { x, y, width, height } = invader;
    ctx.fillRect(x + 7, y, width - 14, 5);
    ctx.fillRect(x + 3, y + 5, width - 6, 8);
    ctx.fillRect(x, y + 11, width, 5);
    ctx.fillRect(x + 5, y + 16, 5, height - 16);
    ctx.fillRect(x + width - 10, y + 16, 5, height - 16);
    ctx.fillStyle = "black";
    ctx.fillRect(x + 8, y + 7, 3, 3);
    ctx.fillRect(x + width - 11, y + 7, 3, 3);
    ctx.fillStyle = "white";
  }
}

function drawInvaderBullets() {
  ctx.fillStyle = "white";
  for (const bullet of invaderBullets) {
    ctx.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);
  }
}

function updateStatus() {
  document.getElementById("level").textContent = level;
  document.getElementById("lives").textContent = lives;
  document.getElementById("score").textContent = score.toLocaleString();
  document.getElementById("high-score").textContent = highScore.toLocaleString();
  document.getElementById("combo").textContent = `x${combo}`;
  document.getElementById("bricks-left").textContent = bricks.length;
  document.getElementById("invaders-left").textContent = invaders.length;
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
  bricks = makeBricks(1);
  invaders = makeInvaders(1);
  invaderBullets = [];
  invaderDirection = 1;
  invaderFireTimer = 0;
  paddle.x = WIDTH / 2 - paddle.width / 2;
  level = 1;
  lives = STARTING_LIVES;
  score = 0;
  combo = 0;
  comboTimer = 0;
  started = false;
  ballAttached = true;
  paused = false;
  gameOver = false;
  positionBall();
  updateStatus();
}

function start() {
  resetGame();
  lastTime = performance.now();
  requestAnimationFrame(frame);
}

window.addEventListener("load", start);