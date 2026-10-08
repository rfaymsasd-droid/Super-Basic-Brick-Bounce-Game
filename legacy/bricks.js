const BRICK_BANKS = 4;
const BRICK_COLUMNS = 4;
const BRICK_ROWS = 3;
const BRICK_WIDTH = 34;
const BRICK_HEIGHT = 15;
const BRICK_GAP = 3;
const BRICK_BANK_GAP = 40;
const BRICK_HEALTH = 4;
const BRICKS_TOP = 390;

function makeBricks() {
  const list = [];

  const bankWidth = BRICK_COLUMNS * BRICK_WIDTH + (BRICK_COLUMNS - 1) * BRICK_GAP;
  const totalWidth = BRICK_BANKS * bankWidth + (BRICK_BANKS - 1) * BRICK_BANK_GAP;
  const left = (WIDTH - totalWidth) / 2;

  for (let bank = 0; bank < BRICK_BANKS; bank++) {
    for (let row = 0; row < BRICK_ROWS; row++) {
      for (let col = 0; col < BRICK_COLUMNS; col++) {
        list.push({
          x: left + bank * (bankWidth + BRICK_BANK_GAP) + col * (BRICK_WIDTH + BRICK_GAP),
          y: BRICKS_TOP + row * (BRICK_HEIGHT + BRICK_GAP),
          width: BRICK_WIDTH,
          height: BRICK_HEIGHT,
          health: BRICK_HEALTH
        });
      }
    }
  }

  return list;
}

function drawBricks() {
  ctx.fillStyle = "white";
  for (const brick of bricks) {
    const segmentWidth = brick.width / BRICK_HEALTH;
    for (let segment = 0; segment < brick.health; segment += 1) {
      ctx.fillRect(
        brick.x + segment * segmentWidth,
        brick.y,
        segmentWidth - 1,
        brick.height
      );
    }
  }
}

function makeInvaders() {
  const list = [];
  const formationWidth = INVADER_COLUMNS * INVADER_WIDTH + (INVADER_COLUMNS - 1) * INVADER_GAP_X;
  const left = (WIDTH - formationWidth) / 2;

  for (let row = 0; row < INVADER_ROWS; row += 1) {
    for (let col = 0; col < INVADER_COLUMNS; col += 1) {
      list.push({
        x: left + col * (INVADER_WIDTH + INVADER_GAP_X),
        y: 52 + row * (INVADER_HEIGHT + INVADER_GAP_Y),
        width: INVADER_WIDTH,
        height: INVADER_HEIGHT
      });
    }
  }

  return list;
}