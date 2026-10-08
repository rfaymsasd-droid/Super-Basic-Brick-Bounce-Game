const BRICK_COLUMNS = 16;
const BRICK_ROWS = 3;
const BRICK_WIDTH = 34;
const BRICK_HEIGHT = 15;
const BRICK_GAP = 3;
const BRICK_HEALTH = 4;
const BRICKS_TOP = 390;
const BRICK_LAYOUTS = [
  ["1111000011110000", "1111000011110000", "1111000011110000"],
  ["0001111111100000", "0011111111110000", "0001111111100000"],
  ["1111111111111111", "0000111111110000", "0000001111000000"],
  ["1001100110011001", "0110011001100110", "1001100110011001"]
];
const INVADER_LAYOUTS = [
  ["1111111111", "1111111111", "1111111111"],
  ["0011111100", "0111111110", "1111111111"],
  ["1110011111", "1111111111", "1110011111"],
  ["1010101010", "0101010101", "1010101010"]
];

function makeBricks(level = 1) {
  const list = [];
  const layout = BRICK_LAYOUTS[(level - 1) % BRICK_LAYOUTS.length];
  const totalWidth = BRICK_COLUMNS * BRICK_WIDTH + (BRICK_COLUMNS - 1) * BRICK_GAP;
  const left = (WIDTH - totalWidth) / 2;

  for (let row = 0; row < BRICK_ROWS; row += 1) {
    for (let col = 0; col < BRICK_COLUMNS; col += 1) {
      if (layout[row][col] === "1") {
        list.push({
          x: left + col * (BRICK_WIDTH + BRICK_GAP),
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

function makeInvaders(level = 1) {
  const list = [];
  const layout = INVADER_LAYOUTS[(level - 1) % INVADER_LAYOUTS.length];
  const formationWidth = INVADER_COLUMNS * INVADER_WIDTH + (INVADER_COLUMNS - 1) * INVADER_GAP_X;
  const left = (WIDTH - formationWidth) / 2;

  for (let row = 0; row < INVADER_ROWS; row += 1) {
    for (let col = 0; col < INVADER_COLUMNS; col += 1) {
      if (layout[row][col] !== "1") {
        continue;
      }
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