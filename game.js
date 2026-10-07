const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const BALL_SPEED = 4;
const STARTING_LIVES = 3;

const ball = {
  x: 0,
  y: 0,
  width: 12,
  height: 12,
  vx: 0,
  vy: 0
};

function resetBall() {
  ball.x = WIDTH / 2 - ball.width / 2;
  ball.y = HEIGHT / 2 - ball.height / 2;
  ball.vx = BALL_SPEED;
  ball.vy = BALL_SPEED;
}


const paddle = {
  x: WIDTH / 2 - 45,
  y: HEIGHT - 30,
  width: 90,
  height: 12,
  speed: 6
};


let bricks = [];
let level = 1;
let lives = STARTING_LIVES;
let paused = false;
let gameOver = false;


const keys = {};

document.addEventListener("keydown", function (event) {
  const key = event.key.toLowerCase();
  keys[key] = true;

  if (key === "r") {
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
  moveBall();

  bounceOffWalls();
  bounceOffPaddle();
  bounceOffBricks();

  if (bricks.length === 0) {
    level += 1;
    bricks = makeBricks();
    resetBall();
    return;
  }

  if (ball.y > HEIGHT) {
    lives -= 1;
    updateStatus();
    if (lives === 0) {
      gameOver = true;
    } else {
      resetBall();
    }
  }
}

function movePaddle() {
  if (keys["arrowleft"] || keys["a"]) {
    paddle.x = paddle.x - paddle.speed;
  }
  if (keys["arrowright"] || keys["d"]) {
    paddle.x = paddle.x + paddle.speed;
  }

  if (paddle.x < 0) {
    paddle.x = 0;
  }
  if (paddle.x + paddle.width > WIDTH) {
    paddle.x = WIDTH - paddle.width;
  }
}

function moveBall() {
  ball.x = ball.x + ball.vx;
  ball.y = ball.y + ball.vy;
}

function draw() {
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = "white";
  drawSquircle(paddle.x, paddle.y, paddle.width, paddle.height);
  drawSquircle(ball.x, ball.y, ball.width, ball.height);

  drawBricks();

  if (paused || gameOver) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    ctx.font = "bold 42px sans-serif";
    ctx.fillText(gameOver ? "GAME OVER" : "PAUSED", WIDTH / 2, HEIGHT / 2 - 12);
    ctx.font = "18px sans-serif";
    ctx.fillText(gameOver ? "Press R to restart" : "Press P to resume", WIDTH / 2, HEIGHT / 2 + 28);
  }
}

function updateStatus() {
  document.getElementById("level").textContent = level;
  document.getElementById("lives").textContent = lives;
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
  bricks = makeBricks();
  resetBall();
  paddle.x = WIDTH / 2 - paddle.width / 2;
  level = 1;
  lives = STARTING_LIVES;
  paused = false;
  gameOver = false;
  updateStatus();
}

function start() {
  resetGame();
  lastTime = performance.now();
  requestAnimationFrame(frame);
}

window.addEventListener("load", start);