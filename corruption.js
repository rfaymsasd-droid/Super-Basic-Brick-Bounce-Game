const CORRUPTION_STAGES = { stable: "stable", warning: "warning", active: "active", recovery: "recovery" };

const DEFAULT_CORRUPTION_STATE = () => ({
  active: false,
  stage: CORRUPTION_STAGES.stable,
  pressure: 0,
  timer: 0,
  triggeredThisLevel: false,
  lastRepairBonus: 0
});

let corruptionState = DEFAULT_CORRUPTION_STATE();

function resetCorruptionState() {
  corruptionState = DEFAULT_CORRUPTION_STATE();
  for (const brick of bricks) {
    brick.corruptionRepair = false;
  }
}

function shouldTriggerCorruptionEvent() {
  if (corruptionState.active || corruptionState.triggeredThisLevel) return false;
  if (activeMode !== "campaign" && activeMode !== "boss_rush") return false;
  if (level < 3) return false;
  if (activeMode === "boss_rush") return level % 2 === 1;
  return level % 3 === 0;
}

function markCorruptionRepairTargets() {
  for (const brick of bricks) {
    brick.corruptionRepair = false;
  }
  const candidates = bricks.filter((brick) => brick.type !== "indestructible" && brick.type !== "portal" && brick.type !== "chain");
  if (!candidates.length) return;
  const repairCount = Math.min(3, Math.max(1, Math.ceil(candidates.length * 0.2)));
  for (let index = 0; index < repairCount; index += 1) {
    const chosen = candidates[Math.floor(Math.random() * candidates.length)];
    if (chosen) chosen.corruptionRepair = true;
  }
}

function triggerCorruptionSurge() {
  if (corruptionState.active) return;
  corruptionState = {
    active: true,
    stage: CORRUPTION_STAGES.warning,
    pressure: 0.2,
    timer: 150,
    triggeredThisLevel: true,
    lastRepairBonus: 0
  };
  markCorruptionRepairTargets();
}

function getCorruptionBoundaryY() {
  if (!corruptionState.active) return HEIGHT + 36;
  const pressureScale = corruptionState.stage === CORRUPTION_STAGES.warning ? 0.25 : corruptionState.pressure;
  return HEIGHT - 52 - pressureScale * (HEIGHT - 120);
}

function updateCorruption() {
  if (!corruptionState.active) {
    if (shouldTriggerCorruptionEvent()) {
      triggerCorruptionSurge();
    }
    return;
  }

  if (corruptionState.stage === CORRUPTION_STAGES.warning) {
    corruptionState.timer -= 1;
    if (corruptionState.timer <= 0) {
      corruptionState.stage = CORRUPTION_STAGES.active;
      corruptionState.timer = 200;
    }
    return;
  }

  if (corruptionState.stage === CORRUPTION_STAGES.active) {
    corruptionState.pressure = Math.min(1, corruptionState.pressure + 0.006 + (activeMode === "boss_rush" ? 0.002 : 0.001));
    corruptionState.timer -= 1;
    if (corruptionState.pressure >= 1 || corruptionState.timer <= 0) {
      corruptionState.stage = CORRUPTION_STAGES.recovery;
      corruptionState.timer = 180;
    }
  } else if (corruptionState.stage === CORRUPTION_STAGES.recovery) {
    corruptionState.pressure = Math.max(0, corruptionState.pressure - 0.015);
    corruptionState.timer -= 1;
    if (corruptionState.pressure <= 0.06 || corruptionState.timer <= 0) {
      resetCorruptionState();
      corruptionState.triggeredThisLevel = false;
      return;
    }
  }

  const boundary = getCorruptionBoundaryY();
  for (const targetBall of balls) {
    if (targetBall.caught) continue;
    const centerY = targetBall.y + targetBall.height / 2;
    if (centerY < boundary - 8) continue;
    if (corruptionState.stage === CORRUPTION_STAGES.active) {
      targetBall.y = Math.min(targetBall.y, boundary - targetBall.height - 5);
      targetBall.vy = -Math.abs(targetBall.vy) * 0.75;
      targetBall.vx *= 0.96;
      if (targetBall.y < 8) targetBall.y = 8;
    } else if (corruptionState.stage === CORRUPTION_STAGES.warning) {
      targetBall.vy = -Math.abs(targetBall.vy) * 0.85;
    }
  }
}

function drawCorruption() {
  if (!corruptionState.active) return;
  const intensity = Number(interfaceData?.settings?.corruptionIntensity ?? 0.5);
  const boundary = getCorruptionBoundaryY();
  const alpha = corruptionState.stage === CORRUPTION_STAGES.warning ? 0.35 : corruptionState.stage === CORRUPTION_STAGES.recovery ? 0.5 : 0.8;

  ctx.save();
  ctx.fillStyle = `rgba(0, 14, 30, ${0.2 + alpha * 0.25})`;
  ctx.fillRect(0, boundary, WIDTH, HEIGHT - boundary);

  const scanlines = 6 + Math.round(intensity * 10);
  for (let row = 0; row < scanlines; row += 1) {
    const y = boundary + row * 18 + ((movingTick * (1.2 + intensity)) % 9);
    const glitch = Math.sin((row + movingTick * 0.5) * 0.9) * 24;
    ctx.fillStyle = row % 2 === 0 ? "rgba(0, 213, 255, 0.18)" : "rgba(255, 0, 212, 0.12)";
    ctx.fillRect(0, y, WIDTH, 6);
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.fillRect((WIDTH * 0.2) + glitch, y - 2, 24, 10);
  }

  for (let index = 0; index < 18 + Math.round(intensity * 20); index += 1) {
    const x = ((index * 73) + movingTick * (2 + intensity)) % WIDTH;
    const y = boundary + ((index * 47) % Math.max(18, HEIGHT - boundary));
    const size = 4 + (index % 3);
    ctx.fillStyle = index % 3 === 0 ? "#00D5FF" : index % 3 === 1 ? "#FF00D4" : "#00FFD5";
    ctx.globalAlpha = 0.4 + intensity * 0.4;
    ctx.fillRect(x, y, size, size);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#000000";
    ctx.fillRect(x + 1, y + 1, Math.max(1, size - 2), Math.max(1, size - 2));
  }

  if (corruptionState.stage === CORRUPTION_STAGES.warning || corruptionState.stage === CORRUPTION_STAGES.active) {
    ctx.strokeStyle = "rgba(0, 213, 255, 0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= WIDTH; x += 12) {
      const y = boundary + Math.sin((x + movingTick * 2) * 0.14) * (8 + intensity * 18);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.fillStyle = corruptionState.stage === CORRUPTION_STAGES.warning ? "#00D5FF" : "#FF00D4";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      corruptionState.stage === CORRUPTION_STAGES.warning ? "WARNING: SYSTEM CORRUPTION DETECTED" : "SYSTEM CORRUPTION",
      WIDTH / 2,
      Math.max(36, boundary - 18)
    );
  }

  ctx.restore();
}

function maybeAddCorruptionRepairBonus(brick) {
  if (!brick || !brick.corruptionRepair || !corruptionState.active) return;
  corruptionState.pressure = Math.max(0, corruptionState.pressure - 0.18);
  corruptionState.lastRepairBonus = 150;
  registerBonusPoints(150);
  brick.corruptionRepair = false;
  if (corruptionState.pressure < 0.2 && corruptionState.stage === CORRUPTION_STAGES.active) {
    corruptionState.stage = CORRUPTION_STAGES.recovery;
    corruptionState.timer = 120;
  }
}
