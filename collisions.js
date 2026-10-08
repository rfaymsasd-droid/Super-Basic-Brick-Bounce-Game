function boxesTouch(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function bounceOffWalls(targetBall = ball) {
  if (targetBall.x < 0) {
    targetBall.x = 0;
    targetBall.vx = -targetBall.vx;
  }
  if (targetBall.x + targetBall.width > WIDTH) {
    targetBall.x = WIDTH - targetBall.width;
    targetBall.vx = -targetBall.vx;
  }
  if (targetBall.y < 0) {
    targetBall.y = 0;
    targetBall.vy = -targetBall.vy;
  }
}

function bounceOffPaddle(targetBall = ball, targetPaddle = paddle) {
  if (boxesTouch(targetBall, targetPaddle) && targetBall.vy > 0) {
    targetBall.y = targetPaddle.y - targetBall.height;
    if (catchBall(targetBall, targetPaddle)) return;
    const impactOffset = (targetBall.x + targetBall.width / 2 - (targetPaddle.x + targetPaddle.width / 2)) / (targetPaddle.width / 2);
    const angle = Math.max(-1, Math.min(1, impactOffset)) * Math.PI / 3;
    const speed = BALL_SPEED + Math.min((level - 1) * 0.2, 1.5);
    targetBall.vx = Math.sin(angle) * speed;
    targetBall.vy = -Math.cos(angle) * speed;
  }
}

function bounceOffBricks(targetBall = ball) {
  for (let index = bricks.length - 1; index >= 0; index -= 1) {
    const brick = bricks[index];
    if (!boxesTouch(targetBall, brick)) {
      continue;
    }

    const overlapX = Math.min(targetBall.x + targetBall.width, brick.x + brick.width) - Math.max(targetBall.x, brick.x);
    const overlapY = Math.min(targetBall.y + targetBall.height, brick.y + brick.height) - Math.max(targetBall.y, brick.y);

    if (!targetBall.piercing && overlapX < overlapY) {
      targetBall.vx = -targetBall.vx;
      if (targetBall.x < brick.x) {
        targetBall.x = brick.x - targetBall.width;
      } else {
        targetBall.x = brick.x + brick.width;
      }
    } else if (!targetBall.piercing) {
      targetBall.vy = -targetBall.vy;
      if (targetBall.y < brick.y) {
        targetBall.y = brick.y - targetBall.height;
      } else {
        targetBall.y = brick.y + brick.height;
      }
    }

    damageBrick(index, targetBall);
    break;
  }
}

function bounceOffInvaders(targetBall = ball) {
  for (let index = invaders.length - 1; index >= 0; index -= 1) {
    const invader = invaders[index];
    if (invader.intangible || !boxesTouch(targetBall, invader)) {
      continue;
    }

    targetBall.vy = -targetBall.vy;
    damageInvader(index, targetBall);
    break;
  }
}