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

test('service worker keeps legacy and modern caches isolated', () => {
  const source = fs.readFileSync(require('node:path').join(__dirname, '..', 'service-worker.js'), 'utf8');

  assert.match(source, /LEGACY_CACHE_NAME/i, 'Legacy cache should have its own cache key');
  assert.match(source, /cacheKey = requestUrl\.pathname\.includes\("\/legacy\/"\) \? "\.\/legacy\/index\.html" : "\.\/index\.html"/i,
    'Modern and legacy navigations should use distinct cache keys');
});
