const BRICK_COLUMNS = 8;
const BRICK_ROWS = 4;
const BRICK_WIDTH = 60;
const BRICK_HEIGHT = 20;
const BRICK_GAP = 6;
const BRICKS_TOP = 50;

function makeBricks() {
  const list = [];

  const totalWidth = BRICK_COLUMNS * BRICK_WIDTH + (BRICK_COLUMNS - 1) * BRICK_GAP;
  const left = (WIDTH - totalWidth) / 2;

  for (let row = 0; row < BRICK_ROWS; row++) {
    for (let col = 0; col < BRICK_COLUMNS; col++) {
      list.push({
        x: left + col * (BRICK_WIDTH + BRICK_GAP),
        y: BRICKS_TOP + row * (BRICK_HEIGHT + BRICK_GAP),
        width: BRICK_WIDTH,
        height: BRICK_HEIGHT
      });
    }
  }

  return list;
}

function drawBricks() {
  ctx.fillStyle = "white";
  for (const brick of bricks) {
    const radius = Math.min(brick.width, brick.height) / 3;
    const control = radius * 0.8;
    const right = brick.x + brick.width;
    const bottom = brick.y + brick.height;

    ctx.beginPath();
    ctx.moveTo(brick.x + radius, brick.y);
    ctx.lineTo(right - radius, brick.y);
    ctx.bezierCurveTo(right - radius + control, brick.y, right, brick.y + radius - control, right, brick.y + radius);
    ctx.lineTo(right, bottom - radius);
    ctx.bezierCurveTo(right, bottom - radius + control, right - radius + control, bottom, right - radius, bottom);
    ctx.lineTo(brick.x + radius, bottom);
    ctx.bezierCurveTo(brick.x + radius - control, bottom, brick.x, bottom - radius + control, brick.x, bottom - radius);
    ctx.lineTo(brick.x, brick.y + radius);
    ctx.bezierCurveTo(brick.x, brick.y + radius - control, brick.x + radius - control, brick.y, brick.x + radius, brick.y);
    ctx.closePath();
    ctx.fill();
  }
}