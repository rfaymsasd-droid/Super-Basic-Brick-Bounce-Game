function boxesTouch(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

function bounceOffWalls() {
  if (ball.x < 0) {
    ball.x = 0;
    ball.vx = -ball.vx;
  }
  if (ball.x + ball.width > WIDTH) {
    ball.x = WIDTH - ball.width;
    ball.vx = -ball.vx;
  }
  if (ball.y < 0) {
    ball.y = 0;
    ball.vy = -ball.vy;
  }
}

function bounceOffPaddle() {
  if (boxesTouch(ball, paddle) && ball.vy > 0) {
    ball.y = paddle.y - ball.height;
    const impactOffset = (ball.x + ball.width / 2 - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
    const angle = Math.max(-1, Math.min(1, impactOffset)) * Math.PI / 3;
    const speed = BALL_SPEED + Math.min((level - 1) * 0.2, 1.5);
    ball.vx = Math.sin(angle) * speed;
    ball.vy = -Math.cos(angle) * speed;
  }
}

function bounceOffBricks() {
  for (let index = bricks.length - 1; index >= 0; index -= 1) {
    const brick = bricks[index];
    if (!boxesTouch(ball, brick)) {
      continue;
    }

    const overlapX = Math.min(ball.x + ball.width, brick.x + brick.width) - Math.max(ball.x, brick.x);
    const overlapY = Math.min(ball.y + ball.height, brick.y + brick.height) - Math.max(ball.y, brick.y);

    if (overlapX < overlapY) {
      ball.vx = -ball.vx;
      if (ball.x < brick.x) {
        ball.x = brick.x - ball.width;
      } else {
        ball.x = brick.x + brick.width;
      }
    } else {
      ball.vy = -ball.vy;
      if (ball.y < brick.y) {
        ball.y = brick.y - ball.height;
      } else {
        ball.y = brick.y + brick.height;
      }
    }

    brick.health -= 1;
    registerTargetHit(10);
    if (brick.health <= 0) {
      bricks.splice(index, 1);
    }
    break;
  }
}

function bounceOffInvaders() {
  for (let index = invaders.length - 1; index >= 0; index -= 1) {
    const invader = invaders[index];
    if (!boxesTouch(ball, invader)) {
      continue;
    }

    ball.vy = -ball.vy;
    invaders.splice(index, 1);
    registerTargetHit(50);
    break;
  }
}