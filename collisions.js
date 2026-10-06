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
    ball.vy = -ball.vy;
  }
}

function bounceOffBricks() {
  for (const brick of bricks) {
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

    bricks.splice(bricks.indexOf(brick), 1);
    break;
  }
}