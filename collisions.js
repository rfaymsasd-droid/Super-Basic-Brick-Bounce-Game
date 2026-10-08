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
    playGameSound("wall");
    spawnParticles(targetBall.x, targetBall.y + targetBall.height / 2, gameTheme.accentSecondary, 2, 0.8);
  }
  if (targetBall.x + targetBall.width > WIDTH) {
    targetBall.x = WIDTH - targetBall.width;
    targetBall.vx = -targetBall.vx;
    playGameSound("wall");
    spawnParticles(targetBall.x + targetBall.width, targetBall.y + targetBall.height / 2, gameTheme.accentSecondary, 2, 0.8);
  }
  if (targetBall.y < 0) {
    targetBall.y = 0;
    targetBall.vy = -targetBall.vy;
    playGameSound("wall");
    spawnParticles(targetBall.x + targetBall.width / 2, targetBall.y, gameTheme.accentSecondary, 2, 0.8);
  }
}

function bounceOffPaddle(targetBall = ball, targetPaddle = paddle) {
  if (boxesTouch(targetBall, targetPaddle) && targetBall.vy > 0) {
    targetBall.y = targetPaddle.y - targetBall.height;
    if (catchBall(targetBall, targetPaddle)) return;
    const impactOffset = (targetBall.x + targetBall.width / 2 - (targetPaddle.x + targetPaddle.width / 2)) / (targetPaddle.width / 2);
    const angle = Math.max(-1, Math.min(1, impactOffset)) * Math.PI / 3;
    const perfectHit = Math.abs(impactOffset) <= 0.18;
    const speed = (BALL_SPEED + Math.min((level - 1) * 0.2, 1.5)) * (perfectHit ? 1.08 : 1);
    targetBall.vx = Math.sin(angle) * speed;
    targetBall.vy = -Math.cos(angle) * speed;
    targetBall.trickShotPieces = [];
    targetBall.trickShotTimer = 0;
    paddleImpact = 9;
    impactPaddle = targetPaddle;
    if (perfectHit) {
      chargeSpecialAbility(20);
      registerBonusPoints(100);
      perfectHitTimer = 45;
      perfectHitX = targetPaddle.x + targetPaddle.width / 2;
      playGameSound("perfect");
      if (interfaceData.settings.cameraShake && !interfaceData.settings.reducedMotion) cameraShake = Math.max(cameraShake, 2);
    } else {
      playGameSound("paddle");
    }
    spawnParticles(targetBall.x + targetBall.width / 2, targetPaddle.y, gameTheme.paddle, 7, 1.7);
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

    spawnParticles(targetBall.x + targetBall.width / 2, targetBall.y + targetBall.height / 2, gameTheme.brick, 2, 0.8);
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