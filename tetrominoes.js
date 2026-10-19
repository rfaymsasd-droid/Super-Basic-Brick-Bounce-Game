const TETROMINO_COLORS = ["accent", "accentSecondary", "accentTertiary", "brick", "enemy", "projectile", "paddle"];
const OBSTACLE_DENSITIES = {
  low: { min: 3, max: 5, interval: 24, burst: 1 },
  normal: { min: 5, max: 8, interval: 17, burst: 2 },
  high: { min: 8, max: 12, interval: 12, burst: 2 },
  chaos: { min: 35, max: 60, interval: 2, burst: 6 }
};
const CHAOS_WAVES = [
  { id: "tsunami", label: "Tetris Tsunami", duration: 300, interval: 2, burst: 7, minimum: 35, maximum: 60 },
  { id: "pixel-rain", label: "Pixel Rain", duration: 300, interval: 1, burst: 8, minimum: 55, maximum: 80 },
  { id: "giant-invasion", label: "Giant Invasion", duration: 240, interval: 3, burst: 3, minimum: 35, maximum: 48 },
  { id: "zigzag", label: "Zigzag Mayhem", duration: 300, interval: 2, burst: 6, minimum: 40, maximum: 65 },
  { id: "hypervelocity", label: "Hypervelocity Storm", duration: 240, interval: 2, burst: 7, minimum: 45, maximum: 70 },
  { id: "swarm", label: "Swarm", duration: 300, interval: 1, burst: 8, minimum: 60, maximum: 85 },
  { id: "mixed", label: "Mixed Madness", duration: 300, interval: 2, burst: 7, minimum: 40, maximum: 70 },
  { id: "corruption", label: "Corruption Storm", duration: 240, interval: 2, burst: 6, minimum: 35, maximum: 60 }
];
const MAX_CHAOS_OBSTACLES = 100;
const MAX_CHAOS_CELLS = 600;
const MAX_CHAOS_AREA = WIDTH * HEIGHT * 0.55;
const MAX_TETROMINO_PARTICLES = 500;
const OBSTACLE_GRID_SIZE = 64;
const CLASSIC_OBSTACLE_SHAPES = [
  { name: "I", cells: [[0, 0], [1, 0], [2, 0], [3, 0]] },
  { name: "O", cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  { name: "T", cells: [[1, 0], [0, 1], [1, 1], [2, 1]] },
  { name: "S", cells: [[1, 0], [2, 0], [0, 1], [1, 1]] },
  { name: "Z", cells: [[0, 0], [1, 0], [1, 1], [2, 1]] },
  { name: "J", cells: [[0, 0], [0, 1], [1, 1], [2, 1]] },
  { name: "L", cells: [[2, 0], [0, 1], [1, 1], [2, 1]] }
];
const PENTOMINO_SHAPES = [
  { name: "F", cells: [[1, 0], [2, 0], [0, 1], [1, 1], [1, 2]] },
  { name: "I5", cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]] },
  { name: "L5", cells: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 3]] },
  { name: "N", cells: [[0, 0], [0, 1], [1, 1], [1, 2], [1, 3]] },
  { name: "P", cells: [[0, 0], [1, 0], [0, 1], [1, 1], [0, 2]] },
  { name: "T5", cells: [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2]] },
  { name: "U", cells: [[0, 0], [2, 0], [0, 1], [1, 1], [2, 1]] },
  { name: "V", cells: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]] },
  { name: "W", cells: [[0, 0], [0, 1], [1, 1], [1, 2], [2, 2]] },
  { name: "X", cells: [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]] },
  { name: "Y", cells: [[0, 0], [0, 1], [0, 2], [0, 3], [1, 1]] },
  { name: "Z5", cells: [[0, 0], [1, 0], [1, 1], [1, 2], [2, 2]] }
];
const LARGE_OBSTACLE_SHAPES = [
  { name: "Long Snake", cells: [[0, 0], [1, 0], [2, 0], [2, 1], [3, 1], [4, 1], [4, 2], [5, 2]] },
  { name: "Giant L", cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [1, 4], [2, 4], [3, 4]] },
  { name: "Cross", cells: [[1, 0], [1, 1], [0, 2], [1, 2], [2, 2], [1, 3], [1, 4]] },
  { name: "Staircase", cells: [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2], [3, 3], [4, 3]] },
  { name: "Large T", cells: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [2, 1], [2, 2], [2, 3]] },
  { name: "Lightning", cells: [[0, 0], [1, 0], [2, 0], [2, 1], [1, 2], [2, 2], [0, 3], [1, 3], [2, 3]] },
  { name: "Hollow Square", cells: [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [3, 1], [0, 2], [3, 2], [0, 3], [1, 3], [2, 3], [3, 3]] },
  { name: "Wide Platform", cells: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [2, 1], [3, 1]] },
  { name: "Branch", cells: [[2, 0], [1, 1], [2, 1], [3, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2]] },
  { name: "Massive Structure", cells: [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [2, 1], [3, 1], [0, 2], [1, 2], [2, 2], [3, 2], [3, 3]] }
];

let TETROMINO_SHAPES = [];
let fallingTetrominoes = [];
let tetrominoParticles = [];
let tetrominoParticlePool = [];
let tetrominoFlashes = [];
let tetrominoSpawnTimer = 0;
let tetrominoWaveTimer = 0;
let tetrominoWave = "mixed";
let tetrominoTargetActive = 0;
let tetrominoSpawnCount = 0;
let recentTetrominoXs = [];
let nextTetrominoId = 1;
let tetrominoSpatialGrid = new Map();
let chaosWave = null;
let chaosWaveTimer = 0;
let chaosWarningTimer = 0;
let chaosIntensity = 0;
let chaosMaximumTimer = 0;
let chaosMaximumPending = false;
let chaosAnnouncementTimer = 0;
let chaosWaveIndex = -1;
let chaosWaveInterval = 2;
let chaosWaveBurst = 6;

function normalizeObstacleCells(cells) {
  let minX = Infinity;
  let minY = Infinity;
  for (const [x, y] of cells) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
  }
  return cells
    .map(([x, y]) => [x - minX, y - minY])
    .sort((a, b) => a[1] - b[1] || a[0] - b[0]);
}

function obstacleShapeKey(cells) {
  let best = "";
  for (let mirror = 0; mirror < 2; mirror += 1) {
    for (let rotation = 0; rotation < 4; rotation += 1) {
      const transformed = cells.map(([sourceX, sourceY]) => {
        let x = mirror ? -sourceX : sourceX;
        let y = sourceY;
        for (let turn = 0; turn < rotation; turn += 1) [x, y] = [-y, x];
        return [x, y];
      });
      const key = normalizeObstacleCells(transformed).map(([x, y]) => `${x},${y}`).join(";");
      if (!best || key < best) best = key;
    }
  }
  return best;
}

function buildTetrominoShapes() {
  const catalog = [];
  const unique = new Set();
  const addShape = (name, cells, keepOrientation = false) => {
    const normalized = normalizeObstacleCells(cells);
    const key = obstacleShapeKey(normalized);
    if (unique.has(key) && !keepOrientation) return false;
    if (keepOrientation && catalog.some((shape) =>
      shape.cells.map(([x, y]) => `${x},${y}`).join(";") === normalized.map(([x, y]) => `${x},${y}`).join(";"))) {
      return false;
    }
    unique.add(key);
    catalog.push({ name, cells: normalized });
    return true;
  };

  for (const shape of CLASSIC_OBSTACLE_SHAPES) addShape(shape.name, shape.cells, true);
  for (const shape of [...PENTOMINO_SHAPES, ...LARGE_OBSTACLE_SHAPES]) {
    addShape(shape.name, shape.cells);
  }
  addShape("Single", [[0, 0]]);
  addShape("Domino", [[0, 0], [1, 0]]);
  addShape("Line Three", [[0, 0], [1, 0], [2, 0]]);
  addShape("Corner Three", [[0, 0], [0, 1], [1, 1]]);

  let polyominoes = [[[0, 0]]];
  for (let size = 2; size <= 6; size += 1) {
    const next = new Map();
    for (const cells of polyominoes) {
      const occupied = new Set(cells.map(([x, y]) => `${x},${y}`));
      for (const [x, y] of cells) {
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const candidateX = x + dx;
          const candidateY = y + dy;
          const key = `${candidateX},${candidateY}`;
          if (occupied.has(key)) continue;
          const candidate = normalizeObstacleCells([...cells, [candidateX, candidateY]]);
          next.set(obstacleShapeKey(candidate), candidate);
        }
      }
    }
    polyominoes = [...next.values()];
    for (const cells of polyominoes) addShape(`Poly-${size}`, cells);
  }

  let generatedShapes = 0;
  for (let attempt = 0; attempt < 700 && generatedShapes < 120; attempt += 1) {
    const targetSize = 7 + Math.floor(Math.random() * 6);
    const cells = [[0, 0]];
    const occupied = new Set(["0,0"]);
    while (cells.length < targetSize) {
      const [x, y] = cells[Math.floor(Math.random() * cells.length)];
      const [dx, dy] = [[1, 0], [-1, 0], [0, 1], [0, -1]][Math.floor(Math.random() * 4)];
      const next = [x + dx, y + dy];
      const key = `${next[0]},${next[1]}`;
      if (!occupied.has(key)) {
        occupied.add(key);
        cells.push(next);
      }
    }
    if (addShape(`Procedural-${catalog.length + 1}`, cells)) generatedShapes += 1;
  }
  return catalog;
}

function getObstacleSettings() {
  const settings = interfaceData.settings;
  const density = OBSTACLE_DENSITIES[settings.obstacleDensity] || OBSTACLE_DENSITIES.normal;
  const minimum = Math.max(20, Math.min(65, Number.isFinite(Number(settings.obstacleMinSize)) ? Number(settings.obstacleMinSize) : 20));
  const maximum = Math.max(minimum, Math.min(65, Number.isFinite(Number(settings.obstacleMaxSize)) ? Number(settings.obstacleMaxSize) : 50));
  return {
    density,
    minimum,
    maximum,
    speed: Math.max(0.5, Math.min(2, Number.isFinite(Number(settings.obstacleSpeed)) ? Number(settings.obstacleSpeed) : 1)),
    visualIntensity: Math.max(0, Math.min(1, Number.isFinite(Number(settings.obstacleVisualIntensity)) ? Number(settings.obstacleVisualIntensity) : 0.6))
  };
}

function chooseObstacleCellSize(wave) {
  const { minimum, maximum } = getObstacleSettings();
  if (interfaceData.settings.obstacleDensity === "chaos") {
    const giant = wave === "giant-invasion";
    const small = wave === "pixel-rain" || wave === "swarm";
    const low = giant ? Math.max(18, Math.min(26, minimum)) : small ? 10 : 14;
    const high = giant ? 44 : small ? 18 : 30;
    return Math.round((low + Math.random() * (high - low)) / 2) * 2;
  }
  const roll = Math.random();
  let fraction = roll < 0.42 ? 0.08 + Math.random() * 0.17
    : roll < 0.79 ? 0.28 + Math.random() * 0.22
      : roll < 0.96 ? 0.54 + Math.random() * 0.2
        : 0.82 + Math.random() * 0.18;
  if (wave === "small-storm") fraction *= 0.45;
  if (wave === "giant-cluster") fraction = 0.68 + Math.random() * 0.32;
  return Math.round((minimum + (maximum - minimum) * fraction) / 5) * 5;
}

function chooseTetrominoShape() {
  const variety = interfaceData.settings.obstacleShapeVariety !== false;
  const chaos = interfaceData.settings.obstacleDensity === "chaos";
  const smallWave = chaos && (chaosWave?.id === "pixel-rain" || chaosWave?.id === "swarm");
  const giantWave = chaos && chaosWave?.id === "giant-invasion";
  const chaosPool = smallWave
    ? TETROMINO_SHAPES.filter((shape) => shape.cells.length <= 6)
    : giantWave
      ? TETROMINO_SHAPES.filter((shape) => shape.cells.length >= 7)
      : TETROMINO_SHAPES;
  const pool = chaos && variety
    ? chaosPool
    : variety ? TETROMINO_SHAPES.filter((shape) => !shape.name.startsWith("Procedural-"))
      : [...CLASSIC_OBSTACLE_SHAPES, ...PENTOMINO_SHAPES.slice(0, 4)];
  return pool[Math.floor(Math.random() * pool.length)];
}

function orientObstacleShape(shape) {
  const mirror = Math.random() < 0.5 ? -1 : 1;
  const turns = Math.floor(Math.random() * 4);
  const cells = shape.cells.map(([sourceX, sourceY]) => {
    let x = sourceX * mirror;
    let y = sourceY;
    for (let turn = 0; turn < turns; turn += 1) [x, y] = [-y, x];
    return [x, y];
  });
  return normalizeObstacleCells(cells);
}

function chooseObstacleX(width) {
  const maxX = Math.max(0, WIDTH - width);
  let bestX = Math.random() * maxX;
  let bestDistance = -1;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = Math.random() * maxX;
    let nearest = Infinity;
    for (const previousX of recentTetrominoXs) nearest = Math.min(nearest, Math.abs(candidate - previousX));
    if (nearest > bestDistance) {
      bestDistance = nearest;
      bestX = candidate;
    }
  }
  recentTetrominoXs.push(bestX);
  if (recentTetrominoXs.length > 10) recentTetrominoXs.shift();
  return bestX;
}

function spawnTetromino() {
  if (fallingTetrominoes.length >= MAX_CHAOS_OBSTACLES) return false;
  const shape = chooseTetrominoShape();
  const cells = orientObstacleShape(shape);
  if (interfaceData.settings.obstacleDensity === "chaos" &&
      fallingTetrominoes.reduce((total, piece) => total + piece.cells.length, 0) + cells.length > MAX_CHAOS_CELLS) return false;
  let columns = 1;
  let rows = 1;
  for (const [x, y] of cells) {
    columns = Math.max(columns, x + 1);
    rows = Math.max(rows, y + 1);
  }
  const wave = tetrominoWave;
  const chaos = interfaceData.settings.obstacleDensity === "chaos";
  const cellSize = chooseObstacleCellSize(chaos ? chaosWave?.id : wave);
  const width = columns * cellSize;
  const height = rows * cellSize;
  const settings = getObstacleSettings();
  const levelScale = Math.min(1.35, 1 + Math.max(0, level - 1) * 0.012);
  const waveScale = wave === "mixed" ? 1 : wave === "alternating" ? 0.92 : 1.08;
  if (chaos && (fallingTetrominoes.reduce((total, piece) => total + piece.cells.length * piece.cellSize * piece.cellSize, 0) +
      cells.length * cellSize * cellSize > MAX_CHAOS_AREA)) return false;
  if (chaos && cells.length > 7 && fallingTetrominoes.filter((piece) => piece.cells.length > 7).length >=
      (chaosWave?.id === "giant-invasion" ? 7 : 3)) return false;
  const speed = (0.65 + Math.random() * 0.65) * settings.speed * levelScale * waveScale *
    (chaos && chaosWave?.id === "hypervelocity" ? 2.5 + Math.random() * 1.5 : 1);
  let x = chooseObstacleX(width);
  if (chaos && chaosWave?.id === "zigzag") {
    const fraction = tetrominoSpawnCount % 2 === 0 ? 0.25 : 0.75;
    x = Math.max(0, Math.min(WIDTH - width, WIDTH * fraction - width / 2));
  } else if (wave === "alternating") {
    const fraction = tetrominoSpawnCount % 2 === 0 ? 0.1 : 0.9;
    x = Math.max(0, Math.min(WIDTH - width, WIDTH * fraction - width / 2));
  }
  tetrominoSpawnCount += 1;
  const colorIndex = Array.from(shape.name)
    .reduce((total, character) => total + character.charCodeAt(0), 0) % TETROMINO_COLORS.length;

  fallingTetrominoes.push({
    id: nextTetrominoId++,
    name: shape.name,
    cells,
    x,
    y: -height,
    cellSize,
    width,
    height,
    baseVy: speed,
    vy: speed,
    vx: chaos && (chaosWave?.id === "zigzag" || chaosWave?.id === "mixed" || chaosWave?.id === "corruption")
      ? (Math.random() - 0.5) * (chaosWave.id === "zigzag" ? 2.8 : 1.4)
      : 0,
    color: TETROMINO_COLORS[colorIndex],
    trail: [],
    pulse: Math.random() * Math.PI * 2,
    pattern: Math.floor(Math.random() * 3),
    chaosMotion: chaos && !interfaceData.settings.reducedMotion && Math.random() < 0.45
      ? ["drift", "wobble", "bounce", "rotate"][Math.floor(Math.random() * 4)] : "",
    motionTick: Math.floor(Math.random() * 90),
    direction: Math.random() < 0.5 ? -1 : 1,
    rotated: false
  });
  return true;
}

function clearTetrominoes() {
  fallingTetrominoes.length = 0;
  tetrominoSpatialGrid.clear();
  clearTetrominoVisualEffects();
  tetrominoSpawnTimer = 0;
  tetrominoWaveTimer = 0;
  tetrominoTargetActive = 0;
  recentTetrominoXs.length = 0;
  resetChaosWaveDirector();
}

function resetChaosWaveDirector() {
  chaosWave = null;
  chaosWaveTimer = 0;
  chaosWarningTimer = 0;
  chaosIntensity = 0;
  chaosMaximumTimer = 0;
  chaosMaximumPending = false;
  chaosAnnouncementTimer = 0;
  chaosWaveIndex = -1;
  chaosWaveInterval = 2;
  chaosWaveBurst = 6;
}

function clearTetrominoVisualEffects() {
  tetrominoParticles.length = 0;
  tetrominoFlashes.length = 0;
  tetrominoParticlePool.length = 0;
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
    if (particle.life <= 0) {
      tetrominoParticles.splice(index, 1);
      if (tetrominoParticlePool.length < 1000) tetrominoParticlePool.push(particle);
    }
  }
  for (let index = tetrominoFlashes.length - 1; index >= 0; index -= 1) {
    tetrominoFlashes[index].life -= 1;
    if (tetrominoFlashes[index].life <= 0) tetrominoFlashes.splice(index, 1);
  }
}

function updateChaosWaveDirector() {
  if (chaosMaximumTimer > 0) {
    chaosMaximumTimer -= 1;
    if (chaosMaximumTimer === 0) {
      startChaosWave(CHAOS_WAVES.find((wave) => wave.id === "mixed"));
      tetrominoTargetActive = 45;
      chaosIntensity = 28;
    }
    return;
  }

  if (chaosWarningTimer > 0) {
    chaosWarningTimer -= 1;
    if (chaosWarningTimer === 0) {
      if (chaosMaximumPending) {
        chaosMaximumPending = false;
        chaosMaximumTimer = 210;
        chaosWaveInterval = 1;
        chaosWaveBurst = 10;
        tetrominoTargetActive = MAX_CHAOS_OBSTACLES;
        chaosWave = { id: "maximum", label: "MAXIMUM CHAOS", duration: 210, interval: 1, burst: 10 };
        chaosAnnouncementTimer = 150;
      } else {
        startChaosWave(chaosWave);
      }
    }
    return;
  }

  if (!chaosWave) {
    startChaosWave(CHAOS_WAVES.find((wave) => wave.id === "mixed"));
    chaosWaveTimer = 240;
    tetrominoTargetActive = 45;
    return;
  }

  chaosWaveTimer -= 1;
  if (chaosWaveTimer <= 0) {
    if (chaosIntensity >= 85 && chaosMaximumTimer === 0) {
      chaosIntensity = 100;
      chaosWarningTimer = 45;
      chaosAnnouncementTimer = 45;
      chaosMaximumPending = true;
      chaosWaveTimer = 240;
      return;
    }
    const queuedWave = CHAOS_WAVES[(chaosWaveIndex + 1 + Math.floor(Math.random() * (CHAOS_WAVES.length - 1))) % CHAOS_WAVES.length];
    if (queuedWave.id === "pixel-rain" || queuedWave.id === "swarm") {
      chaosWave = queuedWave;
      chaosWarningTimer = 45;
      chaosAnnouncementTimer = 45;
      chaosMaximumPending = false;
      chaosWaveTimer = 180;
      return;
    }
    startChaosWave(queuedWave);
  }

  const active = fallingTetrominoes.length;
  const cellCount = fallingTetrominoes.reduce((total, piece) => total + piece.cells.length, 0);
  const target = Math.max(1, tetrominoTargetActive);
  const densityScore = Math.min(1, active / target) * 65;
  const cellScore = Math.min(1, cellCount / MAX_CHAOS_CELLS) * 25;
  const waveScore = chaosWave.id === "mixed" ? 5 : 10;
  const targetIntensity = Math.round(Math.min(100, densityScore + cellScore + waveScore));
  chaosIntensity += Math.sign(targetIntensity - chaosIntensity) *
    Math.min(2, Math.abs(targetIntensity - chaosIntensity) * 0.08);

  if (chaosIntensity >= 85 && chaosMaximumTimer === 0) {
    chaosIntensity = 100;
    chaosWarningTimer = 45;
    chaosAnnouncementTimer = 45;
    chaosMaximumPending = true;
    chaosWaveTimer = 240;
    return;
  }
}

function startChaosWave(wave) {
  chaosWave = wave;
  chaosWaveTimer = wave.duration;
  chaosWaveInterval = wave.interval;
  chaosWaveBurst = wave.burst;
  tetrominoTargetActive = wave.minimum +
    Math.floor(Math.random() * (wave.maximum - wave.minimum + 1));
  chaosAnnouncementTimer = 100;
}

function updateChaosIntensityStatus() {
  const meter = document.getElementById("chaos-meter");
  const indicator = document.getElementById("chaos-level-indicator");
  if (!meter || !indicator) return;
  const visible = interfaceData.settings.obstacleDensity === "chaos";
  indicator.hidden = !visible;
  if (!visible) return;
  const progress = Math.max(0, Math.min(100, Math.round(chaosIntensity)));
  meter.style.width = `${progress}%`;
  const track = document.getElementById("chaos-meter-track");
  track.setAttribute("aria-valuenow", String(progress));
  track.setAttribute("aria-valuetext", `${progress}% chaos, ${fallingTetrominoes.length} obstacles`);
  document.getElementById("chaos-level-value").textContent = `${progress}%`;
  document.getElementById("chaos-wave-status").textContent = chaosWarningTimer > 0
    ? `Incoming: ${chaosMaximumPending ? "Maximum Chaos" : chaosWave?.label || "special wave"}`
    : chaosMaximumTimer > 0
      ? "MAXIMUM CHAOS"
      : `${chaosWave?.label || "Mixed Madness"} · ${fallingTetrominoes.length} formations`;
}

function rotateFallingTetromino(piece) {
  const oldCenterX = piece.x + piece.width / 2;
  const oldCenterY = piece.y + piece.height / 2;
  piece.cells = normalizeObstacleCells(piece.cells.map(([x, y]) => [-y, x]));
  let columns = 1;
  let rows = 1;
  for (const [x, y] of piece.cells) {
    columns = Math.max(columns, x + 1);
    rows = Math.max(rows, y + 1);
  }
  piece.width = columns * piece.cellSize;
  piece.height = rows * piece.cellSize;
  piece.x = oldCenterX - piece.width / 2;
  piece.y = oldCenterY - piece.height / 2;
}

function rebuildTetrominoSpatialGrid() {
  tetrominoSpatialGrid.clear();
  for (const piece of fallingTetrominoes) {
    const minColumn = Math.floor(piece.x / OBSTACLE_GRID_SIZE);
    const maxColumn = Math.floor((piece.x + piece.width) / OBSTACLE_GRID_SIZE);
    const minRow = Math.floor(piece.y / OBSTACLE_GRID_SIZE);
    const maxRow = Math.floor((piece.y + piece.height) / OBSTACLE_GRID_SIZE);
    for (let row = minRow; row <= maxRow; row += 1) {
      for (let column = minColumn; column <= maxColumn; column += 1) {
        const key = `${column}:${row}`;
        if (!tetrominoSpatialGrid.has(key)) tetrominoSpatialGrid.set(key, []);
        tetrominoSpatialGrid.get(key).push(piece);
      }
    }
  }
}

function getTetrominoCollisionCandidates(targetBall) {
  const minColumn = Math.floor(targetBall.x / OBSTACLE_GRID_SIZE);
  const maxColumn = Math.floor((targetBall.x + targetBall.width) / OBSTACLE_GRID_SIZE);
  const minRow = Math.floor(targetBall.y / OBSTACLE_GRID_SIZE);
  const maxRow = Math.floor((targetBall.y + targetBall.height) / OBSTACLE_GRID_SIZE);
  const candidates = new Set();
  for (let row = minRow; row <= maxRow; row += 1) {
    for (let column = minColumn; column <= maxColumn; column += 1) {
      for (const piece of tetrominoSpatialGrid.get(`${column}:${row}`) || []) candidates.add(piece);
    }
  }
  return candidates;
}

function updateTetrominoes() {
  const settings = getObstacleSettings();
  if (interfaceData.customization.theme === "legacy" || interfaceData.settings.obstacleDensity === "off") {
    fallingTetrominoes.length = 0;
    tetrominoSpatialGrid.clear();
    tetrominoTargetActive = 0;
    tetrominoSpawnTimer = 0;
    resetChaosWaveDirector();
    updateChaosIntensityStatus();
    return;
  }

  const chaos = interfaceData.settings.obstacleDensity === "chaos";
  if (chaos) {
    updateChaosWaveDirector();
  } else {
    tetrominoWaveTimer += 1;
    if (tetrominoWaveTimer >= 240) {
      tetrominoWaveTimer = 0;
      const waves = ["small-storm", "giant-cluster", "alternating", "mixed"];
      tetrominoWave = waves[Math.floor(Math.random() * waves.length)];
      const preset = settings.density;
      tetrominoTargetActive = preset.min + Math.floor(Math.random() * (preset.max - preset.min + 1));
    }
    if (tetrominoTargetActive === 0) {
      tetrominoTargetActive = settings.density.min +
        Math.floor(Math.random() * (settings.density.max - settings.density.min + 1));
      tetrominoWave = ["small-storm", "mixed", "alternating"][Math.floor(Math.random() * 3)];
    }
  }

  const slowFactor = activeEffects.slow ? 0.55 : 1;
  tetrominoSpawnTimer += slowFactor;
  const progression = Math.max(0.72, 1 - Math.max(0, level - 1) * 0.006);
  const interval = chaos ? chaosWaveInterval : settings.density.interval;
  const burst = chaos ? chaosWaveBurst : settings.density.burst;
  const spawnInterval = Math.max(1, interval * progression * (0.72 + Math.random() * 0.56));
  if (tetrominoSpawnTimer >= spawnInterval) {
    const missing = Math.min(burst, tetrominoTargetActive - fallingTetrominoes.length);
    if (missing > 0) {
      tetrominoSpawnTimer = 0;
      for (let index = 0; index < missing; index += 1) {
        if (!spawnTetromino()) break;
      }
    } else {
      tetrominoSpawnTimer = Math.min(tetrominoSpawnTimer, interval * 1.28);
    }
  }

  const speedFactor = activeEffects.slow ? 0.55 : 1;
  const effects = interfaceData.settings.tetrisEffects && !interfaceData.settings.reducedMotion;
  const trailEnabled = effects && settings.visualIntensity > 0 &&
    (!chaos || fallingTetrominoes.length < 60);
  for (let index = fallingTetrominoes.length - 1; index >= 0; index -= 1) {
    const piece = fallingTetrominoes[index];
    piece.vy = piece.baseVy * speedFactor;
    piece.motionTick += 1;
    piece.pulse += chaos && !interfaceData.settings.reducedMotion ? 0.08 : 0.045;
    if (chaos && piece.chaosMotion === "drift") {
      piece.x += piece.vx;
      if (piece.x < 0 || piece.x + piece.width > WIDTH) piece.vx *= -1;
      piece.x = Math.max(0, Math.min(WIDTH - piece.width, piece.x));
    } else if (chaos && piece.chaosMotion === "wobble") {
      piece.x += Math.sin(piece.motionTick * 0.055) * 0.8;
      piece.x = Math.max(0, Math.min(WIDTH - piece.width, piece.x));
    } else if (chaos && piece.chaosMotion === "bounce") {
      piece.x += piece.direction * (1.1 + (piece.motionTick % 90) / 100);
      if (piece.x < 0 || piece.x + piece.width > WIDTH) piece.direction *= -1;
      piece.x = Math.max(0, Math.min(WIDTH - piece.width, piece.x));
    } else if (chaos && piece.chaosMotion === "rotate" && piece.motionTick % 72 === 0) {
      rotateFallingTetromino(piece);
      piece.x = Math.max(0, Math.min(WIDTH - piece.width, piece.x));
    }
    if (trailEnabled) {
      piece.trail.push(piece.y);
      if (piece.trail.length > (chaos ? 3 : 4)) piece.trail.shift();
    } else {
      piece.trail.length = 0;
    }
    piece.y += piece.vy;
    if (piece.y + piece.height >= HEIGHT) {
      fallingTetrominoes.splice(index, 1);
      createTetrominoExplosion(piece.x + piece.width / 2, HEIGHT, piece.color);
    }
  }
  if (!chaos) {
    for (let missing = settings.density.min - fallingTetrominoes.length;
      missing > 0 && fallingTetrominoes.length < MAX_CHAOS_OBSTACLES; missing -= 1) {
      if (!spawnTetromino()) break;
    }
  }
  rebuildTetrominoSpatialGrid();
  if (chaosAnnouncementTimer > 0) chaosAnnouncementTimer -= 1;
  if (chaos) updateChaosIntensityStatus();
}

function createTetrominoExplosion(x, y, colorKey) {
  const settings = getObstacleSettings();
  if (!interfaceData.settings.tetrisEffects || !interfaceData.settings.obstacleExplosionParticles ||
      interfaceData.settings.reducedMotion || settings.visualIntensity <= 0 ||
      tetrominoParticles.length >= MAX_TETROMINO_PARTICLES) return;
  const color = gameTheme[colorKey] || gameTheme.accent;
  const intensity = settings.visualIntensity;
  const count = Math.min(Math.round(18 * intensity), MAX_TETROMINO_PARTICLES - tetrominoParticles.length);
  for (let index = 0; index < count; index += 1) {
    const particle = tetrominoParticlePool.pop() || {};
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.8 + Math.random() * 3 * intensity;
    const life = 20 + Math.floor(Math.random() * 18);
    Object.assign(particle, {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 2 + Math.random() * 4,
      color,
      life,
      maxLife: life
    });
    tetrominoParticles.push(particle);
  }
  tetrominoFlashes.push({ x, y, color, life: 9, maxLife: 9 });
  if (interfaceData.settings.cameraShake && !interfaceData.settings.reducedMotion) cameraShake = Math.max(cameraShake, 0.7);
}

function drawChaosAnnouncement() {
  if (interfaceData.settings.obstacleDensity !== "chaos" || chaosAnnouncementTimer <= 0) return;
  const isMaximum = chaosMaximumTimer > 0 || chaosMaximumPending;
  const label = chaosWarningTimer > 0
    ? isMaximum ? "MAXIMUM CHAOS INCOMING" : `${chaosWave?.label || "SPECIAL WAVE"} INCOMING`
    : isMaximum ? "MAXIMUM CHAOS" : chaosWave?.label || "CHAOS WAVE";
  ctx.save();
  ctx.globalAlpha = interfaceData.settings.reducedMotion ? 0.9 : Math.min(1, chaosAnnouncementTimer / 20);
  ctx.fillStyle = isMaximum ? "#ff4fe1" : gameTheme.accentSecondary;
  ctx.textAlign = "center";
  ctx.font = "bold 24px monospace";
  ctx.shadowColor = ctx.fillStyle;
  ctx.shadowBlur = interfaceData.settings.reducedMotion ? 0 : 10 * interfaceData.settings.obstacleVisualIntensity;
  ctx.fillText(label, WIDTH / 2, 82);
  ctx.restore();
}

function resolveTetrominoBallCollision(targetBall) {
  const speedFactor = activeEffects.slow ? 0.55 : targetBall.slowTimer > 0 ? 0.65 : 1;
  const settings = getObstacleSettings();
  const ballRight = targetBall.x + targetBall.width;
  const ballBottom = targetBall.y + targetBall.height;
  for (const piece of getTetrominoCollisionCandidates(targetBall)) {
    if (ballRight <= piece.x || targetBall.x >= piece.x + piece.width ||
        ballBottom <= piece.y || targetBall.y >= piece.y + piece.height) continue;
    for (const [column, row] of piece.cells) {
      const squareX = piece.x + column * piece.cellSize;
      const squareY = piece.y + row * piece.cellSize;
      const squareRight = squareX + piece.cellSize;
      const squareBottom = squareY + piece.cellSize;
      if (ballRight <= squareX || targetBall.x >= squareRight ||
          ballBottom <= squareY || targetBall.y >= squareBottom) continue;

      const overlapX = Math.min(ballRight, squareRight) - Math.max(targetBall.x, squareX);
      const overlapY = Math.min(ballBottom, squareBottom) - Math.max(targetBall.y, squareY);
      const ballVelocityX = targetBall.vx * speedFactor;
      const ballVelocityY = targetBall.vy * speedFactor;
      if (overlapX < overlapY) {
        const hitLeft = targetBall.x + targetBall.width / 2 < squareX + piece.cellSize / 2;
        targetBall.x = hitLeft ? squareX - targetBall.width : squareRight;
        const normalX = hitLeft ? -1 : 1;
        if ((ballVelocityX - piece.vx) * normalX < 0) targetBall.vx = -targetBall.vx;
      } else {
        const hitTop = targetBall.y + targetBall.height / 2 < squareY + piece.cellSize / 2;
        targetBall.y = hitTop ? squareY - targetBall.height : squareBottom;
        const normalY = hitTop ? -1 : 1;
        if ((ballVelocityY - piece.vy) * normalY < 0) {
          targetBall.vy = (2 * piece.vy - ballVelocityY) / speedFactor;
        }
      }
      if (interfaceData.settings.tetrisEffects && settings.visualIntensity > 0) {
        const intensity = settings.visualIntensity;
        spawnParticles(targetBall.x + targetBall.width / 2, targetBall.y + targetBall.height / 2,
          gameTheme[piece.color] || gameTheme.accent, Math.max(1, Math.round(3 * intensity)), 0.8 * intensity);
      }
      registerTetrominoRicochet(targetBall, piece.id);
      return true;
    }
  }
  return false;
}

function drawTetrominoes() {
  const settings = getObstacleSettings();
  drawChaosStormEffects(settings.visualIntensity);
  for (const piece of fallingTetrominoes) {
    const color = gameTheme[piece.color] || gameTheme.accent;
    if (piece.trail.length > 0) {
      piece.trail.forEach((trailY, index) => {
        ctx.globalAlpha = (index + 1) / piece.trail.length * 0.07 * settings.visualIntensity;
        ctx.fillStyle = color;
        for (const [column, row] of piece.cells) {
          drawSquircle(piece.x + column * piece.cellSize, trailY + row * piece.cellSize,
            piece.cellSize, piece.cellSize);
        }
      });
      ctx.globalAlpha = 1;
    }

    ctx.save();
    const pulse = interfaceData.settings.reducedMotion || !interfaceData.settings.tetrisEffects
      ? 1
      : 0.9 + Math.sin(piece.pulse) * 0.1;
    ctx.shadowColor = color;
    ctx.shadowBlur = interfaceData.settings.tetrisEffects &&
      (interfaceData.settings.obstacleDensity !== "chaos" || fallingTetrominoes.length < 60)
      ? 6 * settings.visualIntensity : 0;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    for (const [column, row] of piece.cells) {
      const x = piece.x + column * piece.cellSize;
      const y = piece.y + row * piece.cellSize;
      ctx.globalAlpha = 0.68;
      ctx.fillStyle = color;
      drawSquircle(x + 1, y + 1, piece.cellSize - 2, piece.cellSize - 2);
      ctx.globalAlpha = pulse;
      drawSquircleOutline(x + 1, y + 1, piece.cellSize - 2, piece.cellSize - 2);
    }
    ctx.restore();
  }

  if (!interfaceData.settings.tetrisEffects || !interfaceData.settings.obstacleExplosionParticles ||
      interfaceData.settings.reducedMotion || settings.visualIntensity <= 0) return;
  for (const particle of tetrominoParticles) {
    ctx.globalAlpha = particle.life / particle.maxLife * settings.visualIntensity;
    ctx.fillStyle = particle.color;
    ctx.shadowColor = particle.color;
    ctx.shadowBlur = 6 * settings.visualIntensity;
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
  }
  for (const flash of tetrominoFlashes) {
    ctx.globalAlpha = flash.life / flash.maxLife * 0.32 * settings.visualIntensity;
    ctx.fillStyle = flash.color;
    ctx.beginPath();
    ctx.arc(flash.x, flash.y, (flash.maxLife - flash.life + 1) * 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.shadowBlur = 0;
}

function drawChaosStormEffects(visualIntensity) {
  if (interfaceData.settings.obstacleDensity !== "chaos" ||
      (chaosWave?.id !== "corruption" && chaosWave?.id !== "maximum") ||
      visualIntensity <= 0) return;
  const motion = interfaceData.settings.reducedMotion ? 0 : movingTick;
  ctx.save();
  ctx.globalAlpha = Math.min(0.24, visualIntensity * 0.22);
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, 44, HEIGHT);
  ctx.fillRect(WIDTH - 44, 0, 44, HEIGHT);
  for (let index = 0; index < 18; index += 1) {
    const y = (index * 39 + motion * 1.3) % HEIGHT;
    const side = index % 2 ? WIDTH - 40 : 5;
    ctx.fillStyle = ["#0066FF", "#00D5FF", "#FF00D4", "#9900FF"][index % 4];
    ctx.fillRect(side, y, 12 + index % 4 * 4, 3 + index % 3 * 3);
  }
  ctx.restore();
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

TETROMINO_SHAPES = buildTetrominoShapes();