const TETROMINO_SHAPES = [
  { name: "I", cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },
  { name: "O", cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  { name: "T", cells: [[1, 0], [0, 1], [1, 1], [2, 1]] },
  { name: "S", cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  { name: "Z", cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  { name: "J", cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  { name: "L", cells: [[2, 0], [0, 1], [1, 1], [2, 1]] }
];

const TETROMINO_COLORS = ["accent", "accentSecondary", "accentTertiary", "brick", "enemy", "projectile", "paddle"];
let fallingTetrominoes = [];
let tetrominoParticles = [];
let tetrominoFlashes = [];
let tetrominoSpawnTimer = 0;

function getTetrominoDifficulty() {
  if (level >= 21) return { interval: 190, maxActive: 3, speed: [1.05, 1.55], cellSize: 40 };
  if (level >= 13) return { interval: 235, maxActive: 3, speed: [0.9, 1.35], cellSize: 38 };
  if (level >= 8) return { interval: 300, maxActive: 2, speed: [0.8, 1.2], cellSize: 36 };
  if (level >= 4) return { interval: 390, maxActive: 1, speed: [0.7, 1.05], cellSize: 34 };
  return { interval: 510, maxActive: 1, speed: [0.55, 0.85], cellSize: 32 };
}

function spawnTetromino() {
  const difficulty = getTetrominoDifficulty();
  const shape = TETROMINO_SHAPES[Math.floor(Math.random() * TETROMINO_SHAPES.length)];
  const columns = Math.max(...shape.cells.map(([x]) => x)) + 1;
  const rows = Math.max(...shape.cells.map(([, y]) => y)) + 1;
  const width = columns * difficulty.cellSize;
  const height = rows * difficulty.cellSize;
  const speed = difficulty.speed[0] + Math.random() * (difficulty.speed[1] - difficulty.speed[0]);

  fallingTetrominoes.push({
    shape,
    x: Math.random() * Math.max(0, WIDTH - width),
    y: -height,
    cellSize: difficulty.cellSize,
    width,
    height,
    baseVy: speed,
    vy: speed,
    vx: 0,
    color: TETROMINO_COLORS[Math.floor(Math.random() * TETROMINO_COLORS.length)],
    trail: []
  });
}

function clearTetrominoes() {
  fallingTetrominoes = [];
  clearTetrominoVisualEffects();
  tetrominoSpawnTimer = 0;
}

function clearTetrominoVisualEffects() {
  tetrominoParticles = [];
  tetrominoFlashes = [];
}

function updateTetrominoEffects() {
  if (!interfaceData.settings.tetrisEffects || interfaceData.settings.reducedMotion) {
    clearTetrominoVisualEffects();
    return;
  }
  for (let index = tetrominoParticles.length - 1; index >= 0; index -= 1) {
    const particle = tetrominoParticles[index];
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vx *= 0.97;
    particle.vy *= 0.97;
    particle.life -= 1;
    if (particle.life <= 0) tetrominoParticles.splice(index, 1);
  }
  for (let index = tetrominoFlashes.length - 1; index >= 0; index -= 1) {
    tetrominoFlashes[index].life -= 1;
    if (tetrominoFlashes[index].life <= 0) tetrominoFlashes.splice(index, 1);
  }
}

function updateTetrominoes() {
  const difficulty = getTetrominoDifficulty();
  const slowFactor = activeEffects.slow ? 0.55 : 1;
  tetrominoSpawnTimer += slowFactor;
  if (tetrominoSpawnTimer >= difficulty.interval && fallingTetrominoes.length < difficulty.maxActive) {
    tetrominoSpawnTimer = 0;
    spawnTetromino();
  }

  for (let index = fallingTetrominoes.length - 1; index >= 0; index -= 1) {
    const piece = fallingTetrominoes[index];
    piece.vy = piece.baseVy * slowFactor;
    if (interfaceData.settings.tetrisEffects && !interfaceData.settings.reducedMotion) {
      piece.trail.push(piece.y);
      if (piece.trail.length > 5) piece.trail.shift();
    } else {
      piece.trail.length = 0;
    }
    piece.y += piece.vy;
    if (piece.y + piece.height >= HEIGHT) {
      const impactY = HEIGHT - piece.height / 2;
      fallingTetrominoes.splice(index, 1);
      createTetrominoExplosion(piece.x + piece.width / 2, impactY, piece.color);
    }
  }

}

function createTetrominoExplosion(x, y, colorKey) {
  const color = gameTheme[colorKey] || gameTheme.accent;
  if (interfaceData.settings.tetrisEffects && !interfaceData.settings.reducedMotion && interfaceData.settings.effectsIntensity > 0) {
    const intensity = interfaceData.settings.effectsIntensity;
    const count = Math.round(22 * intensity);
    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3.4 * intensity;
      const life = 24 + Math.floor(Math.random() * 20);
      tetrominoParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 4,
        color,
        life,
        maxLife: life
      });
    }
    tetrominoFlashes.push({ x, y, color, life: 10, maxLife: 10 });
    if (interfaceData.settings.cameraShake) cameraShake = Math.max(cameraShake, 1.1);
  }
}

function resolveTetrominoBallCollision(targetBall) {
  const speedFactor = activeEffects.slow ? 0.55 : targetBall.slowTimer > 0 ? 0.65 : 1;
  for (const piece of fallingTetrominoes) {
    for (const [column, row] of piece.shape.cells) {
      const square = {
        x: piece.x + column * piece.cellSize,
        y: piece.y + row * piece.cellSize,
        width: piece.cellSize,
        height: piece.cellSize
      };
      if (!boxesTouch(targetBall, square)) continue;

      const overlapX = Math.min(targetBall.x + targetBall.width, square.x + square.width) -
        Math.max(targetBall.x, square.x);
      const overlapY = Math.min(targetBall.y + targetBall.height, square.y + square.height) -
        Math.max(targetBall.y, square.y);
      const ballVelocityX = targetBall.vx * speedFactor;
      const ballVelocityY = targetBall.vy * speedFactor;

      if (overlapX < overlapY) {
        if (targetBall.x + targetBall.width / 2 < square.x + square.width / 2) {
          targetBall.x = square.x - targetBall.width;
        } else {
          targetBall.x = square.x + square.width;
        }
        const normalX = targetBall.x < square.x ? -1 : 1;
        if ((ballVelocityX - piece.vx) * normalX < 0) {
          targetBall.vx = -targetBall.vx;
        }
      } else {
        const hitTop = targetBall.y + targetBall.height / 2 < square.y + square.height / 2;
        targetBall.y = hitTop ? square.y - targetBall.height : square.y + square.height;
        const normalY = hitTop ? -1 : 1;
        if ((ballVelocityY - piece.vy) * normalY < 0) {
          targetBall.vy = (2 * piece.vy - ballVelocityY) / speedFactor;
        }
      }

      if (interfaceData.settings.tetrisEffects && !interfaceData.settings.reducedMotion && interfaceData.settings.effectsIntensity > 0) {
        spawnParticles(targetBall.x + targetBall.width / 2, targetBall.y + targetBall.height / 2,
          gameTheme[piece.color] || gameTheme.accent, 3, 1);
      }
      return true;
    }
  }
  return false;
}

function drawTetrominoes() {
  for (const piece of fallingTetrominoes) {
    const color = gameTheme[piece.color] || gameTheme.accent;
    if (piece.trail.length > 0) {
      piece.trail.forEach((trailY, index) => {
        ctx.globalAlpha = (index + 1) / piece.trail.length * 0.08 * interfaceData.settings.effectsIntensity;
        ctx.fillStyle = color;
        for (const [column, row] of piece.shape.cells) {
          drawSquircle(piece.x + column * piece.cellSize, trailY + row * piece.cellSize,
            piece.cellSize, piece.cellSize);
        }
      });
      ctx.globalAlpha = 1;
    }

    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = interfaceData.settings.reducedMotion ? 0 : 7 * interfaceData.settings.effectsIntensity;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    for (const [column, row] of piece.shape.cells) {
      const x = piece.x + column * piece.cellSize;
      const y = piece.y + row * piece.cellSize;
      ctx.globalAlpha = 0.64;
      ctx.fillStyle = color;
      drawSquircle(x + 1, y + 1, piece.cellSize - 2, piece.cellSize - 2);
      ctx.globalAlpha = 0.95;
      drawSquircleOutline(x + 1, y + 1, piece.cellSize - 2, piece.cellSize - 2);
    }
    ctx.restore();
  }

  if (!interfaceData.settings.tetrisEffects || interfaceData.settings.reducedMotion ||
      interfaceData.settings.effectsIntensity <= 0) return;
  for (const particle of tetrominoParticles) {
    ctx.globalAlpha = particle.life / particle.maxLife * 0.8;
    ctx.fillStyle = particle.color;
    ctx.shadowColor = particle.color;
    ctx.shadowBlur = 8;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
  }
  for (const flash of tetrominoFlashes) {
    ctx.globalAlpha = flash.life / flash.maxLife * 0.35;
    ctx.fillStyle = flash.color;
    ctx.beginPath();
    ctx.arc(flash.x, flash.y, (flash.maxLife - flash.life + 1) * 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

function drawSquircleOutline(x, y, width, height) {
  const radius = Math.min(width, height) / 3;
  const right = x + width;
  const bottom = y + height;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(right - radius, y);
  ctx.quadraticCurveTo(right, y, right, y + radius);
  ctx.lineTo(right, bottom - radius);
  ctx.quadraticCurveTo(right, bottom, right - radius, bottom);
  ctx.lineTo(x + radius, bottom);
  ctx.quadraticCurveTo(x, bottom, x, bottom - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.stroke();
}
