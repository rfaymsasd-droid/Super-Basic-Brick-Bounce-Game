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

test('fungal corruption starts after one minute and spreads to neighboring pixels', () => {
  const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'game.js'), 'utf8');
  const functionSource = source.match(/function updateFungalCorruption\(\) \{[\s\S]*?\n\}/)[0];
  const randomValues = [0.1, 0.2, 0.4, 0.7, 0.9, 0.3];
  let randomIndex = 0;
  const context = {
    FUNGAL_CORRUPTION_DELAY: 3600,
    Math: Object.create(Math),
    gameOver: false,
    campaignComplete: false,
    dailyComplete: false,
    fungalCorruption: {
      elapsedTicks: 0,
      active: false,
      columns: 8,
      rows: 8,
      infected: new Uint8Array(64),
      frontier: [],
      infectedCount: 0
    }
  };
  context.Math.random = () => {
    const value = randomValues[randomIndex % randomValues.length];
    randomIndex += 1;
    return value;
  };
  vm.createContext(context);
  vm.runInContext(functionSource, context);

  for (let tick = 0; tick < 3599; tick += 1) context.updateFungalCorruption();
  assert.equal(context.fungalCorruption.active, false);
  context.updateFungalCorruption();
  assert.equal(context.fungalCorruption.active, true);
  assert.ok(context.fungalCorruption.infectedCount > 1);
});

test('service worker keeps legacy and modern caches isolated', () => {
  const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'service-worker.js'), 'utf8');

  assert.match(source, /LEGACY_CACHE_NAME/i, 'Legacy cache should have its own cache key');
  assert.match(source, /cacheKey = requestUrl\.pathname\.includes\("\/legacy\/"\) \? "\.\/legacy\/index\.html" : "\.\/index\.html"/i,
    'Modern and legacy navigations should use distinct cache keys');
});

test('brick catalog includes the electric brick type', () => {
  const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'bricks.js'), 'utf8');
  const context = {
    console,
    Math,
    WIDTH: 900,
    activeMode: 'classic',
    getCampaignBrickType: () => 'normal'
  };
  vm.createContext(context);
  vm.runInContext(source, context);

  assert.ok(vm.runInContext('BRICK_TYPES.includes("electric")', context));
  assert.ok(vm.runInContext('makeBricks(1).some((brick) => brick.type === "electric")', context));
});

test('Wither Storm appears on Boss Rush round six and has an exposed-core damage window', () => {
  const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'modes.js'), 'utf8');
  const context = {
    console,
    Math,
    WIDTH: 900,
    HEIGHT: 650,
    activeMode: 'boss_rush',
    activeEffects: {},
    interfaceData: { settings: { reducedMotion: true } },
    invaderDirection: 1,
    invaderBullets: [],
    paddle: { x: 400, width: 72 },
    movingTick: 0
  };
  vm.createContext(context);
  vm.runInContext(source, context);

  const boss = vm.runInContext('makeBossInvader(6)', context);
  assert.equal(boss.variant, 'wither-storm');
  assert.equal(boss.maxHealth, 72);
  assert.ok(boss.width > 76);

  context.boss = boss;
  vm.runInContext('boss.entrance = false; updateWitherStorm(boss);', context);
  assert.equal(boss.coreOpen, true);
  assert.equal(boss.intangible, false);

  context.movingTick = 150;
  vm.runInContext('updateWitherStorm(boss);', context);
  assert.equal(boss.coreOpen, false);
  assert.equal(boss.intangible, true);
});

test('Wither Storm pull attracts nearby balls and its final phase fires seven orbs', () => {
  const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'modes.js'), 'utf8');
  const context = {
    console,
    Math,
    WIDTH: 900,
    HEIGHT: 650,
    activeMode: 'boss_rush',
    activeEffects: {},
    interfaceData: { settings: { reducedMotion: true } },
    invaderDirection: 1,
    invaderBullets: [],
    paddle: { x: 400, width: 72 },
    movingTick: 0
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  context.boss = { x: 360, y: 80, width: 176, height: 116, variant: 'wither-storm', phase: 3, entrance: false };
  context.invaders = [context.boss];
  context.nearBall = { x: 280, y: 220, width: 12, height: 12, vx: 0, vy: 0 };
  context.farBall = { x: 10, y: 500, width: 12, height: 12, vx: 0, vy: 0 };

  vm.runInContext('applyWitherStormPull(nearBall); applyWitherStormPull(farBall); fireWitherStormAttack(boss);', context);

  assert.ok(context.nearBall.vx > 0);
  assert.ok(context.nearBall.vy < 0);
  assert.deepEqual(context.farBall, { x: 10, y: 500, width: 12, height: 12, vx: 0, vy: 0 });
  assert.equal(context.invaderBullets.length, 7);
  assert.ok(context.invaderBullets.every((bullet) => bullet.witherOrb));
});

test('Wither Storm pixel-eats the playfield while restoring the paddle and balls', () => {
  const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'game.js'), 'utf8');
  const eatingMaskSource = source.match(/function drawWitherStormEatingMask\(target, width, height\) \{[\s\S]*?\n\}/)[0];
  const protectedObjectsSource = source.match(/function drawWitherStormProtectedObjects\(bounds\) \{[\s\S]*?\n\}/)[0];
  const fillRects = [];
  const restoredObjects = [];
  const context = {
    Math,
    WIDTH: 900,
    HEIGHT: 650,
    movingTick: 0,
    witherStormOverrunRadius: 48,
    witherStormOverrunIntensity: 1,
    witherStormOverlayCtx: {
      save() {},
      restore() {},
      set fillStyle(value) { this.currentFillStyle = value; },
      fillRect(...rect) { fillRects.push(rect); }
    },
    canvas: {},
    paddle: { x: 200, y: 590, width: 72, height: 16 },
    balls: [{ x: 220, y: 560, width: 12, height: 12 }],
    getPaddles: () => [context.paddle]
  };
  context.witherStormOverlayCtx.fillStyle = "";
  context.witherStormOverlayCtx.drawImage = (...args) => restoredObjects.push(args);
  context.witherStormOverlayCtx.clearRect = () => {};
  vm.createContext(context);
  vm.runInContext(`${eatingMaskSource}\n${protectedObjectsSource}`, context);

  context.drawWitherStormEatingMask({ x: 50, y: 50 }, 200, 150);
  context.drawWitherStormProtectedObjects({ left: 10, top: 20, width: 900, height: 650 });

  assert.ok(fillRects.length > 0, 'the expanding radius paints pixel-sized void tiles');
  assert.ok(fillRects.every(([x, y, width, height]) =>
    x >= 0 && y >= 0 && x + width <= 200 && y + height <= 150));
  assert.equal(restoredObjects.length, 2, 'both the paddle and ball are restored above the void');
  assert.deepEqual(restoredObjects.map((draw) => draw.slice(1, 5)), [
    [200, 590, 72, 16],
    [220, 560, 12, 12]
  ]);
});

test('Wither Storm evolves through seven stages and its tractor beam inflicts sickness', () => {
  const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'modes.js'), 'utf8');
  const context = {
    console,
    Math,
    WIDTH: 900,
    HEIGHT: 650,
    activeMode: 'boss_rush',
    activeEffects: {},
    interfaceData: { settings: { reducedMotion: true } },
    invaderDirection: 1,
    invaderBullets: [],
    paddle: { x: 400, width: 72 },
    movingTick: 0
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  context.boss = vm.runInContext('makeBossInvader(6)', context);
  context.invaders = [context.boss];
  context.boss.entrance = false;
  context.boss.health = 36;
  vm.runInContext('updateWitherStorm(boss);', context);
  assert.equal(context.boss.phase, 4);

  context.boss.health = 1;
  vm.runInContext('updateWitherStorm(boss);', context);
  assert.equal(context.boss.phase, 7);

  context.boss.beamState = 'active';
  context.boss.beamCycle = 0;
  context.targetBall = {
    x: context.boss.x + context.boss.width / 2 - 6,
    y: context.boss.y + context.boss.height + 30,
    width: 12,
    height: 12,
    vx: 0,
    vy: 0
  };
  vm.runInContext('for (let tick = 0; tick < 90; tick += 1) applyWitherStormPull(targetBall);', context);
  assert.equal(context.targetBall.slowTimer, 90);
  assert.ok(context.targetBall.vy < 0);
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
  const bricksSource = fs.readFileSync(require('node:path').join(__dirname, '..', 'bricks.js'), 'utf8');
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
  vm.runInContext(bricksSource, context);
  vm.runInContext(source, context);
  vm.runInContext(`
    for (const id of ['portal_madness', 'moving_walls', 'golden_rush']) {
      CHAOS_EVENT_LIBRARY.find((event) => event.id === id).start();
    }
  `, context);
  assert.ok(context.bricks.every((brick) => typeof brick.move === 'function' && brick.startX === brick.x));

  assert.ok(vm.runInContext('CHAOS_EVENT_LIBRARY.length >= 25', context));
  context.scheduler = vm.runInContext('createChaosScheduler();', context);
  assert.ok(context.scheduler);
  assert.equal(vm.runInContext('scheduler.activeEvents.length', context), 0);
  vm.runInContext('scheduler.start(); for (let tick = 0; tick < 260; tick += 1) scheduler.tick();', context);
  assert.ok(vm.runInContext('scheduler.activeEvents.length >= 1 || scheduler.warning !== null', context));
  vm.runInContext('scheduler.forceOverload();', context);
  assert.ok(vm.runInContext('scheduler.overloadTimer > 0 || scheduler.warning !== null', context));
});

test('Chaos scheduler keeps its boosted obstacle target stable and respects the event limit', () => {
  const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'chaos.js'), 'utf8');
  const context = {
    console,
    Math,
    WIDTH: 900,
    HEIGHT: 650,
    activeMode: 'chaos',
    chaosIntensity: 0,
    tetrominoTargetActive: 45,
    interfaceData: { settings: { chaosIntensity: 'catastrophic', chaosMaxEvents: 2 } },
    balls: [],
    fallingTetrominoes: [],
    invaders: [],
    bricks: [],
    paddle: { x: 150, y: 580, width: 120, height: 16 },
    secondPaddle: { x: 600, y: 580, width: 120, height: 16 },
    document: { getElementById: () => null }
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  vm.runInContext('CHAOS_EVENT_LIBRARY.forEach((event) => { event.start = () => {}; }); scheduler = createChaosScheduler(); for (let tick = 0; tick < 30; tick += 1) scheduler.updateIntensity(); scheduler.beginOverload();', context);

  assert.equal(vm.runInContext('tetrominoTargetActive', context), 68);
  assert.equal(vm.runInContext('scheduler.activeEvents.length', context), 2);
  assert.equal(vm.runInContext('scheduler.getMaxActiveEvents()', context), 2);
});

test('the game loads the complete Chaos event scheduler', () => {
  const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');

  assert.match(source, /<script src="\.\/chaos\.js"><\/script>/);
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

test('admin eater consumes nearby bricks and advances its visual consumption state', () => {
  const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'admin.js'), 'utf8');
  const brick = { x: 100, y: 100, width: 34, height: 15 };
  const eater = {
    x: 100, y: 100, width: 30, height: 20, type: 'eater', adminSpeed: 1,
    adminColor: '#c7ff4a', eatReach: 100, chewTick: 0, consumed: 0
  };
  const context = {
    console, Math, WIDTH: 900, HEIGHT: 650, activeMode: 'admin',
    bricks: [brick], invaders: [eater], fallingTetrominoes: [], fallingPowerUps: [],
    corruptionState: { active: false },
    boxesTouch: (first, second) => !(first.x + first.width <= second.x || first.x >= second.x + second.width ||
      first.y + first.height <= second.y || first.y >= second.y + second.height),
    spawnParticles: () => {}
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  context.updateAdminEnemies();

  assert.equal(context.bricks.length, 0);
  assert.equal(eater.consumed, 1);
  assert.ok(vm.runInContext('adminColorDrain', context) > 0);
  assert.ok(vm.runInContext('adminEatProgress', context) > 0);
});

test('admin sandbox can spawn a scaled Wither Storm with its boss mechanics', () => {
  const modesSource = fs.readFileSync(require('node:path').join(__dirname, '..', 'modes.js'), 'utf8');
  const adminSource = fs.readFileSync(require('node:path').join(__dirname, '..', 'admin.js'), 'utf8');
  const html = fs.readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
  const context = {
    console,
    Math,
    WIDTH: 900,
    HEIGHT: 650,
    activeMode: 'admin',
    activeEffects: {},
    interfaceData: { settings: { reducedMotion: true } },
    invaderDirection: 1,
    invaderBullets: [],
    paddle: { x: 400, width: 72 },
    invaders: [],
    movingTick: 0
  };
  vm.createContext(context);
  vm.runInContext(modesSource, context);
  vm.runInContext(adminSource, context);
  vm.runInContext('spawnAdminEnemy("wither-storm", 1.5, 2, "#ff00ff", 100);', context);

  const boss = context.invaders[0];
  assert.match(html, /<option value="wither-storm">Wither Storm<\/option>/);
  assert.equal(boss.variant, 'wither-storm');
  assert.equal(boss.width, 264);
  assert.equal(boss.health, 72);
  assert.equal(boss.entrance, false);
  assert.equal(boss.adminSpeed, 2);
  const previousX = boss.x;
  vm.runInContext('updateWitherStorm(invaders[0]);', context);
  assert.notEqual(boss.x, previousX);
});

test('admin reset settings restores defaults without clearing spawned entities', () => {
  const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'admin.js'), 'utf8');
  const ids = ['admin-enemy-type', 'admin-enemy-scale', 'admin-enemy-speed', 'admin-enemy-color',
    'admin-eater-reach', 'admin-powerup-type', 'admin-enemy-scale-value', 'admin-enemy-speed-value',
    'admin-eater-reach-value', 'admin-lives', 'admin-obstacles', 'admin-corruption'];
  const elements = Object.fromEntries(ids.map((id) => [id, {}]));
  const brick = {};
  const enemy = {};
  const powerup = {};
  const context = {
    console, Math, document: { getElementById: (id) => elements[id] },
    getModeLives: () => 3, lives: 1, gameOver: true, started: true,
    bricks: [brick], invaders: [enemy], fallingPowerUps: [powerup],
    interfaceData: { settings: { obstacleDensity: 'chaos' } },
    corruptionState: { active: true },
    resetCorruptionState: () => { context.corruptionState.active = false; },
    updateStatus: () => {}
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  vm.runInContext('resetAdminSettings()', context);

  assert.equal(elements['admin-enemy-type'].value, 'eater');
  assert.equal(elements['admin-enemy-scale'].value, '1');
  assert.equal(elements['admin-powerup-type'].value, 'expand');
  assert.equal(elements['admin-lives'].value, '3');
  assert.equal(elements['admin-obstacles'].value, 'low');
  assert.equal(elements['admin-corruption'].checked, false);
  assert.equal(context.interfaceData.settings.obstacleDensity, 'low');
  assert.equal(context.lives, 3);
  assert.equal(context.gameOver, false);
  assert.deepEqual(context.bricks, [brick]);
  assert.deepEqual(context.invaders, [enemy]);
  assert.deepEqual(context.fallingPowerUps, [powerup]);
});

test('brick movement strategies slide the middle row together and preserve other moving bricks', () => {
  const root = require('node:path').join(__dirname, '..');
  const bricksSource = fs.readFileSync(require('node:path').join(root, 'bricks.js'), 'utf8');
  const mechanicsSource = fs.readFileSync(require('node:path').join(root, 'mechanics.js'), 'utf8');
  const updateMechanicsSource = mechanicsSource.match(/function updateMechanics\(\) \{[\s\S]*?\n\}/)[0];
  const context = {
    console,
    Math,
    WIDTH: 900,
    activeMode: 'classic',
    activeEffects: {},
    bricks: [],
    invaders: [],
    balls: [],
    movingTick: 0,
    specialAbilityRemaining: 0,
    laserCooldown: 0,
    keys: {},
    gameTheme: { accentSecondary: '#fff' },
    getCampaignBrickType: () => 'normal',
    getKeybind: () => 'laser',
    spawnParticles: () => {},
    updateFallingPowerUps: () => {},
    updateLaserShots: () => {},
    updatePowerUpStatus: () => {},
    updateSpecialAbilityStatus: () => {}
  };
  vm.createContext(context);
  vm.runInContext(bricksSource, context);
  vm.runInContext(updateMechanicsSource, context);
  context.bricks = context.makeBricks(1);

  const slideStrategy = context.slide;
  const stayStillStrategy = context.stayStill;
  const middleRow = context.bricks.filter((brick) => brick.y === 408);
  const otherMovingBrick = context.bricks.find((brick) => brick.type === 'moving' && brick.y !== 408);
  assert.ok(middleRow.length > 0);
  assert.ok(otherMovingBrick);
  for (const brick of context.bricks) {
    assert.equal(brick.startX, brick.x);
    assert.equal(typeof brick.move, 'function');
    if (brick.y === 408) {
      assert.equal(brick.move, slideStrategy);
      assert.equal(brick.moveSpeed, 2);
      assert.equal(brick.moveMinX, brick.startX - 30);
      assert.equal(brick.moveMaxX, brick.startX + 30);
    } else if (brick.type === 'moving') {
      assert.equal(brick.move, slideStrategy);
      assert.equal(brick.moveSpeed, 0.65);
    } else {
      assert.equal(brick.move, stayStillStrategy);
    }
  }

  context.updateMechanics();
  assert.equal(middleRow[0].x, middleRow[0].startX + 2);
  assert.equal(otherMovingBrick.x, otherMovingBrick.startX + 0.65);

  for (let tick = 1; tick < 15; tick += 1) context.updateMechanics();
  for (const brick of middleRow) assert.equal(brick.x, brick.startX + 30);

  for (let tick = 0; tick < 15; tick += 1) context.updateMechanics();
  for (const brick of middleRow) assert.equal(brick.x, brick.startX);

  for (let first = 0; first < context.bricks.length; first += 1) {
    for (let second = first + 1; second < context.bricks.length; second += 1) {
      const a = context.bricks[first];
      const b = context.bricks[second];
      const overlaps = a.x < b.x + b.width && a.x + a.width > b.x &&
        a.y < b.y + b.height && a.y + a.height > b.y;
      assert.equal(overlaps, false, 'brick movement should not cause bricks to overlap');
    }
  }

  const modesSource = fs.readFileSync(require('node:path').join(root, 'modes.js'), 'utf8');
  const initializeModeLevelSource = modesSource.match(/function initializeModeLevel\(\) \{[\s\S]*?\n\}/)[0];
  Object.assign(context, {
    level: 1,
    dailySeed: 0,
    invaderBullets: [],
    invaderFireTimer: 0,
    invaderDirection: 1,
    gravityField: null,
    objectiveBrickTotal: 0,
    objectiveInvaderTotal: 0,
    remainingBrickTargets: () => context.bricks.length,
    updateStatus: () => {}
  });
  vm.runInContext(initializeModeLevelSource, context);
  context.initializeModeLevel();
  assert.ok(context.bricks.filter((brick) => brick.movementGroup === 'middle-row')
    .every((brick) => brick.move === slideStrategy));
  assert.ok(context.bricks.filter((brick) => brick.movementGroup !== 'middle-row')
    .every((brick) => brick.move === stayStillStrategy));
});
