const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function loadCollisionsHarness() {
  const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'collisions.js'), 'utf8');
  const context = {
    console,
    Math,
    WIDTH: 400,
    HEIGHT: 600,
    ball: { x: 0, y: 0, width: 10, height: 10, vx: 0, vy: 5 },
    bricks: [],
    invaders: [{ x: 0, y: 0, width: 20, height: 20, intangible: false }],
    paddle: { x: 0, y: 0, width: 60, height: 10 },
    gameTheme: { accent: '#fff', accentSecondary: '#fff', brick: '#fff', enemy: '#fff', projectile: '#fff', paddle: '#fff' },
    playGameSound: () => {},
    spawnParticles: () => {},
    damageInvader: (index, targetBall) => {
      targetBall.hitCounter = (targetBall.hitCounter || 0) + 1;
    },
    catchBall: () => false,
    boxesTouch: (a, b) => !(a.x + a.width <= b.x || a.x >= b.x + b.width || a.y + a.height <= b.y || a.y >= b.y + b.height)
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return context;
}

test('boss overlap only counts one valid hit while contact remains active', () => {
  const context = loadCollisionsHarness();
  const { ball } = context;

  context.bounceOffInvaders(ball);
  context.bounceOffInvaders(ball);

  assert.equal(ball.hitCounter, 1, 'The same overlapping collision should not damage twice in one contact');
});

test('separated contacts can register fresh hits again', () => {
  const context = loadCollisionsHarness();
  const { ball } = context;

  context.bounceOffInvaders(ball);
  ball.x = -30;
  ball.y = -30;
  ball.lastInvaderHitIndex = null;
  ball.x = 5;
  ball.y = 5;

  context.bounceOffInvaders(ball);

  assert.equal(ball.hitCounter, 2, 'A fresh collision after separation should count as another valid hit');
});

test('invader bullets disappear on ball contact without changing ball movement', () => {
  const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'game.js'), 'utf8');
  const functionSource = source.match(/function updateInvaderBullets\(\) \{[\s\S]*?\n\}/)[0];
  const ball = { x: 20, y: 30, width: 12, height: 12, vx: 3, vy: -4 };
  const bullet = { x: 22, y: 32, width: 4, height: 8, vx: 0, vy: 0 };
  const context = {
    HEIGHT: 600,
    WIDTH: 400,
    activeEffects: {},
    balls: [ball],
    invaderBullets: [bullet],
    boxesTouch: (first, second) => !(first.x + first.width <= second.x || first.x >= second.x + second.width ||
      first.y + first.height <= second.y || first.y >= second.y + second.height),
    getPaddles: () => [],
    loseLife: () => assert.fail('Ball contact should not cost a life')
  };
  vm.createContext(context);
  vm.runInContext(functionSource, context);

  const originalBall = { ...ball };
  context.updateInvaderBullets();

  assert.equal(context.invaderBullets.length, 0);
  assert.deepEqual(ball, originalBall);
});

test('service worker keeps legacy and modern caches isolated', () => {
  const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'service-worker.js'), 'utf8');

  assert.match(source, /LEGACY_CACHE_NAME/i, 'Legacy cache should have its own cache key');
  assert.match(source, /cacheKey = requestUrl\.pathname\.includes\("\/legacy\/"\) \? "\.\/legacy\/index\.html" : "\.\/index\.html"/i,
    'Modern and legacy navigations should use distinct cache keys');
});

test('corruption surge enters a warning phase and repair bricks push it back', () => {
  const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'corruption.js'), 'utf8');
  const context = {
    console,
    Math,
    WIDTH: 900,
    HEIGHT: 650,
    movingTick: 0,
    activeMode: 'campaign',
    level: 3,
    balls: [{ x: 20, y: 300, width: 12, height: 12, vx: 2, vy: 4, caught: false }],
    invaders: [],
    bricks: [
      { x: 50, y: 120, width: 30, height: 16, type: 'normal', corruptionRepair: false },
      { x: 120, y: 120, width: 30, height: 16, type: 'normal', corruptionRepair: false },
      { x: 190, y: 120, width: 30, height: 16, type: 'normal', corruptionRepair: false }
    ],
    interfaceData: { settings: { corruptionIntensity: 0.5 } },
    ctx: { save() {}, restore() {}, fillRect() {}, beginPath() {}, stroke() {}, fillText() {}, fillStyle: '', font: '', textAlign: '', globalAlpha: 1 },
    registerBonusPoints: (points) => { context.bonus = (context.bonus || 0) + points; },
  };
  vm.createContext(context);
  vm.runInContext(source, context);

  vm.runInContext('triggerCorruptionSurge();', context);
  const state = vm.runInContext('corruptionState', context);
  assert.equal(state.active, true);
  assert.equal(state.stage, 'warning');
  assert.ok(context.bricks.some((brick) => brick.corruptionRepair));

  const repairBrick = context.bricks.find((brick) => brick.corruptionRepair);
  repairBrick.corruptionRepair = true;
  vm.runInContext('maybeAddCorruptionRepairBonus(bricks.find((brick) => brick.corruptionRepair));', context);
  const updatedState = vm.runInContext('corruptionState', context);
  assert.ok(updatedState.pressure <= 0.2);
  assert.equal(context.bonus, 200);
  assert.equal(context.bricks.filter((brick) => brick.corruptionRepair).length, 0);
});

test('corruption pushes balls down from the advancing top boundary and only triggers once per level', () => {
  const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'corruption.js'), 'utf8');
  const context = {
    console,
    Math,
    WIDTH: 900,
    HEIGHT: 650,
    movingTick: 0,
    activeMode: 'campaign',
    level: 3,
    balls: [{ x: 20, y: 10, width: 12, height: 12, vx: 2, vy: -4, caught: false }],
    bricks: [{ type: 'normal', corruptionRepair: false }],
    interfaceData: { settings: { corruptionIntensity: 0.5, reducedMotion: false } },
    registerBonusPoints: (points) => { context.bonus = (context.bonus || 0) + points; },
    updateStatus: () => {}
  };
  vm.createContext(context);
  vm.runInContext(source, context);

  vm.runInContext('triggerCorruptionSurge(); corruptionState.stage = "active"; updateCorruption();', context);
  assert.ok(context.balls[0].y > 70, 'the ball is moved below the corrupted area');
  assert.ok(context.balls[0].vy > 0, 'the ball is redirected toward the safe paddle area');

  vm.runInContext('corruptionState.stage = "active"; corruptionState.timer = 1; updateCorruption();', context);
  assert.equal(context.bonus, 250, 'surviving the surge awards the completion bonus');
  vm.runInContext('corruptionState.timer = 1; updateCorruption();', context);
  assert.equal(context.bonus, 250, 'the same level cannot trigger or reward a second surge');
});

test('boss-rush corruption marks an invader as a repair target when no bricks exist', () => {
  const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'corruption.js'), 'utf8');
  const context = {
    console,
    Math,
    WIDTH: 900,
    HEIGHT: 650,
    activeMode: 'boss_rush',
    level: 3,
    bricks: [],
    invaders: [{ x: 100, y: 50, width: 60, height: 40, intangible: false }],
    balls: [],
    registerBonusPoints: () => {}
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  vm.runInContext('triggerCorruptionSurge();', context);

  assert.equal(context.invaders[0].corruptionRepair, true);
});

test('the obstacle catalog contains classic tetrominoes and connected shapes up to twelve cells', () => {
  const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'tetrominoes.js'), 'utf8');
  const context = { console, Math, WIDTH: 900, HEIGHT: 650 };
  vm.createContext(context);
  vm.runInContext(source, context);

  const names = vm.runInContext('TETROMINO_SHAPES.map((shape) => shape.name)', context);
  const sizes = vm.runInContext('[...new Set(TETROMINO_SHAPES.map((shape) => shape.cells.length))]', context);
  for (const name of ['I', 'O', 'T', 'S', 'Z', 'J', 'L']) {
    assert.ok(names.includes(name), `${name} tetromino is present`);
  }
  for (let size = 1; size <= 12; size += 1) {
    assert.ok(sizes.includes(size), `connected ${size}-cell formations are present`);
  }
});

test('Chaos density exceeds High while regular density targets stay unchanged', () => {
  const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'tetrominoes.js'), 'utf8');
  const context = {
    console,
    Math,
    WIDTH: 900,
    HEIGHT: 650,
    interfaceData: { settings: { obstacleDensity: 'chaos', obstacleMinSize: 20, obstacleMaxSize: 50,
      obstacleSpeed: 1, obstacleVisualIntensity: 0.6 } }
  };
  vm.createContext(context);
  vm.runInContext(source, context);

  const chaos = vm.runInContext('getObstacleSettings().density', context);
  const high = vm.runInContext('OBSTACLE_DENSITIES.high', context);
  const normal = vm.runInContext('OBSTACLE_DENSITIES.normal', context);
  assert.ok(chaos.min > high.max);
  assert.equal(high.min, 8);
  assert.equal(high.max, 12);
  assert.equal(normal.min, 5);
  assert.equal(normal.max, 8);
});

test('Chaos director warns before starting a capped Maximum Chaos wave', () => {
  const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'tetrominoes.js'), 'utf8');
  const context = {
    console,
    Math,
    WIDTH: 900,
    HEIGHT: 650,
    activeMode: 'chaos',
    level: 1,
    activeEffects: {},
    interfaceData: { settings: { obstacleDensity: 'chaos', obstacleMinSize: 20, obstacleMaxSize: 50,
      obstacleSpeed: 1, obstacleVisualIntensity: 0.6, obstacleShapeVariety: true } },
    fallingTetrominoes: []
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  vm.runInContext('chaosIntensity = 96; chaosWave = CHAOS_WAVES[0]; updateChaosWaveDirector();', context);
  assert.equal(vm.runInContext('chaosWarningTimer', context), 45);
  assert.equal(vm.runInContext('chaosMaximumPending', context), true);
  vm.runInContext('for (let tick = 0; tick < 45; tick += 1) updateChaosWaveDirector();', context);
  assert.equal(vm.runInContext('chaosMaximumTimer', context), 210);
  assert.equal(vm.runInContext('tetrominoTargetActive', context), 100);
});

test('Chaos spatial grid returns nearby pieces without scanning unrelated formations', () => {
  const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'tetrominoes.js'), 'utf8');
  const context = { console, Math, WIDTH: 900, HEIGHT: 650 };
  vm.createContext(context);
  vm.runInContext(source, context);
  vm.runInContext(`
    fallingTetrominoes = [
      { id: 1, x: 10, y: 10, width: 20, height: 20, cells: [[0, 0]], cellSize: 20 },
      { id: 2, x: 700, y: 500, width: 20, height: 20, cells: [[0, 0]], cellSize: 20 }
    ];
    rebuildTetrominoSpatialGrid();
  `, context);

  const candidates = vm.runInContext('Array.from(getTetrominoCollisionCandidates({ x: 14, y: 14, width: 10, height: 10 }), (piece) => piece.id)', context);
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0], 1);
});

test('turning obstacle density Off clears Chaos formations and its spatial index', () => {
  const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'tetrominoes.js'), 'utf8');
  const context = {
    console,
    Math,
    WIDTH: 900,
    HEIGHT: 650,
    activeMode: 'chaos',
    interfaceData: { settings: { obstacleDensity: 'off', obstacleMinSize: 20, obstacleMaxSize: 50,
      obstacleSpeed: 1, obstacleVisualIntensity: 0.6 }, customization: { theme: 'crimson' } },
    fallingTetrominoes: [{ id: 1 }],
    document: { getElementById: () => null },
    tetrominoSpatialGrid: new Map([['0:0', [{ id: 1 }]]]),
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  vm.runInContext('updateTetrominoes();', context);

  assert.equal(vm.runInContext('fallingTetrominoes.length', context), 0);
  assert.equal(vm.runInContext('tetrominoSpatialGrid.size', context), 0);
  assert.equal(vm.runInContext('chaosIntensity', context), 0);
});

test('Chaos Overdrive includes a multi-event scheduler with at least 25 event definitions and safe overload warnings', () => {
  const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'chaos.js'), 'utf8');
  const context = {
    console,
    Math,
    WIDTH: 900,
    HEIGHT: 650,
    activeMode: 'chaos',
    interfaceData: { settings: { obstacleDensity: 'chaos', reducedMotion: false } },
    balls: [{ x: 100, y: 300, width: 12, height: 12, vx: 3, vy: -3, caught: false, trail: [], trickShotPieces: [] }],
    fallingTetrominoes: [],
    invaders: [],
    bricks: [],
    paddle: { x: 150, y: 580, width: 120, height: 16 },
    paddleTargetX: 150,
    gameTheme: { accent: '#fff', accentSecondary: '#fff', brick: '#fff', enemy: '#fff', projectile: '#fff', paddle: '#fff' },
    playGameSound: () => {},
    setEffect: () => {},
    applyShockwave: () => {},
    registerBonusPoints: () => {},
    triggerCorruptionSurge: () => {},
    spawnParticles: () => {},
    dropPowerUp: () => {},
    collectPowerUp: () => {},
    createTetrominoExplosion: () => {},
    createRainbowWarning: () => {},
    document: { getElementById: () => ({ hidden: false, textContent: '', style: {} }) }
  };
  vm.createContext(context);
  vm.runInContext(source, context);

  assert.ok(vm.runInContext('CHAOS_EVENT_LIBRARY.length >= 25', context));
  context.scheduler = vm.runInContext('createChaosScheduler();', context);
  assert.ok(context.scheduler);
  assert.equal(vm.runInContext('scheduler.activeEvents.length', context), 0);
  vm.runInContext('scheduler.start(); for (let tick = 0; tick < 260; tick += 1) scheduler.tick();', context);
  assert.ok(vm.runInContext('scheduler.activeEvents.length >= 1 || scheduler.warning !== null', context));
  vm.runInContext('scheduler.forceOverload();', context);
  assert.ok(vm.runInContext('scheduler.overloadTimer > 0 || scheduler.warning !== null', context));
});

test('Galaga roster includes the original nine enemies and the expanded Galaga 88 entries', () => {
  const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'galaga-enemies.js'), 'utf8');
  const context = { console, Math, WIDTH: 900, HEIGHT: 650, invaders: [] };
  vm.createContext(context);
  vm.runInContext(source, context);

  assert.ok(vm.runInContext('GALAGA_ORIGINAL_ENEMIES.length >= 9', context));
  assert.ok(vm.runInContext('GALAGA_88_VARIANTS.length >= 17', context));
  assert.ok(vm.runInContext('GALAGA_REGISTRY.length >= 26', context));
  const entry = vm.runInContext('getGalagaEnemyDefinition("zako")', context);
  assert.equal(entry.variant, 'zako');
  assert.equal(entry.category, 'original');
  assert.ok(entry.health >= 1);
});
