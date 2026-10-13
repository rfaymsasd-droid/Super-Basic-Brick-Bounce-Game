const CORRUPTION_STAGES = { stable: "stable", warning: "warning", active: "active", recovery: "recovery" };

const DEFAULT_CORRUPTION_STATE = () => ({
  active: false,
  stage: CORRUPTION_STAGES.stable,
  pressure: 0,
  timer: 0,
  triggeredThisLevel: false,
  lastRepairBonus: 0,
  survived: false
});

let corruptionState = DEFAULT_CORRUPTION_STATE();

function clearCorruptionRepairTargets() {
  for (const target of [...bricks, ...invaders]) {
    target.corruptionRepair = false;
  }
}

function resetCorruptionState() {
  corruptionState = DEFAULT_CORRUPTION_STATE();
  clearCorruptionRepairTargets();
}

function shouldTriggerCorruptionEvent() {
  if (corruptionState.active || corruptionState.triggeredThisLevel) return false;
  if (activeMode !== "campaign" && activeMode !== "boss_rush") return false;
  if (level < 3) return false;
  if (activeMode === "boss_rush") return level % 2 === 1;
  return level % 3 === 0;
}

function markCorruptionRepairTargets() {
  clearCorruptionRepairTargets();
  const candidates = bricks.filter((brick) => brick.type !== "indestructible" && brick.type !== "portal" && brick.type !== "chain");
  if (!candidates.length) {
    const invader = invaders.find((candidate) => !candidate.intangible);
    if (invader) invader.corruptionRepair = true;
    return;
  }
  const repairCount = Math.min(3, Math.max(1, Math.ceil(candidates.length * 0.2)));
  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [candidates[index], candidates[swapIndex]] = [candidates[swapIndex], candidates[index]];
  }
  for (const brick of candidates.slice(0, repairCount)) {
    brick.corruptionRepair = true;
  }
}

function triggerCorruptionSurge() {
  if (corruptionState.active || corruptionState.triggeredThisLevel) return;
  corruptionState = {
    active: true,
    stage: CORRUPTION_STAGES.warning,
    pressure: 0.04,
    timer: 180,
    triggeredThisLevel: true,
    lastRepairBonus: 0,
    survived: false
  };
  markCorruptionRepairTargets();
}

function getCorruptionBoundaryY() {
  return 70 + corruptionState.pressure * Math.min(260, HEIGHT - 230);
}

function finishCorruptionSurge() {
  clearCorruptionRepairTargets();
  corruptionState.stage = CORRUPTION_STAGES.recovery;
  corruptionState.survived = true;
  corruptionState.timer = 180;
  corruptionState.lastRepairBonus = 250;
  registerBonusPoints(250);
}

function finishCorruptionRecovery() {
  clearCorruptionRepairTargets();
  corruptionState = { ...DEFAULT_CORRUPTION_STATE(), triggeredThisLevel: true };
}

function updateCorruptionStatus() {
  const indicator = document.getElementById("corruption-indicator");
  if (!indicator) return;
  indicator.hidden = !corruptionState.active;
  if (!corruptionState.active) return;
  const stage = corruptionState.stage;
  const stageLabel = stage === CORRUPTION_STAGES.warning
    ? `Warning · ${Math.ceil(corruptionState.timer / 60)}s`
    : stage === CORRUPTION_STAGES.active
      ? "Advancing"
      : "Recovery";
  document.getElementById("corruption-stage").textContent = stageLabel;
  const progress = Math.round(corruptionState.pressure * 100);
  const meter = document.getElementById("corruption-meter");
  meter.style.width = `${progress}%`;
  const track = document.getElementById("corruption-meter-track");
  track.setAttribute("aria-valuenow", String(progress));
  track.setAttribute("aria-valuetext", `${stageLabel}, ${progress}% corruption`);
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
      corruptionState.timer = 360;
    }
    return;
  }

  if (corruptionState.stage === CORRUPTION_STAGES.active) {
    corruptionState.pressure = Math.min(1, corruptionState.pressure + (activeMode === "boss_rush" ? 0.0022 : 0.0018));
    corruptionState.timer -= 1;
    if (corruptionState.timer <= 0) finishCorruptionSurge();
  } else if (corruptionState.stage === CORRUPTION_STAGES.recovery) {
    corruptionState.pressure = Math.max(0, corruptionState.pressure - 0.008);
    corruptionState.timer -= 1;
    if (corruptionState.pressure <= 0.04 || corruptionState.timer <= 0) {
      finishCorruptionRecovery();
      return;
    }
  }

  if (corruptionState.stage !== CORRUPTION_STAGES.active) return;
  const boundary = getCorruptionBoundaryY();
  for (const targetBall of balls) {
    if (targetBall.caught) continue;
    const centerY = targetBall.y + targetBall.height / 2;
    if (centerY >= boundary) continue;
    targetBall.y = boundary + 3;
    targetBall.vy = Math.max(1.5, Math.abs(targetBall.vy));
  }
}

function drawCorruption() {
  if (!corruptionState.active) return;
  const intensity = Number(interfaceData?.settings?.corruptionIntensity ?? 0.5);
  if (intensity <= 0) return;
  const boundary = getCorruptionBoundaryY();
  const reducedMotion = interfaceData.settings.reducedMotion;
  const tick = reducedMotion ? 0 : movingTick;
  const alpha = corruptionState.stage === CORRUPTION_STAGES.warning ? 0.18 : corruptionState.stage === CORRUPTION_STAGES.recovery ? 0.35 : 0.58;

  ctx.save();
  ctx.globalAlpha = alpha * intensity;
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, WIDTH, Math.max(0, boundary - 2));

  const scanlines = Math.max(1, Math.round(4 + intensity * 8));
  for (let row = 0; row < scanlines && row * 18 < boundary; row += 1) {
    const y = (row * 18 + (tick % 9)) % Math.max(1, boundary);
    const glitch = reducedMotion ? 0 : Math.sin((row + tick * 0.5) * 0.9) * 24;
    ctx.fillStyle = row % 2 === 0 ? "#00D5FF" : "#FF00D4";
    ctx.fillRect(Math.max(0, WIDTH * 0.1 + glitch), y, WIDTH * 0.8, 2);
  }

  const fragments = Math.round(14 + intensity * 20);
  for (let index = 0; index < fragments; index += 1) {
    const x = ((index * 73 + (reducedMotion ? 0 : tick * (1 + intensity))) % WIDTH + WIDTH) % WIDTH;
    const y = ((index * 47 + (reducedMotion ? 0 : tick * 0.35)) % Math.max(1, boundary) + boundary) % Math.max(1, boundary);
    const size = 4 + index % 5;
    ctx.fillStyle = ["#0066FF", "#00D5FF", "#00FFD5", "#FF00D4", "#9900FF"][index % 5];
    ctx.fillRect(x, y, size, size);
    if (index % 3 === 0) {
      ctx.fillStyle = "#000000";
      ctx.fillRect(x + 1, y + 1, Math.max(1, size - 2), Math.max(1, size - 2));
    } else if (index % 4 === 0) {
      ctx.fillStyle = "#ffffff";
      ctx.font = "10px monospace";
      ctx.fillText(["0", "1", "X", "!", "#"][index % 5], x, y);
    }
  }

  if (corruptionState.stage !== CORRUPTION_STAGES.recovery) {
    ctx.globalAlpha = 0.45 + intensity * 0.45;
    ctx.strokeStyle = "#00D5FF";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= WIDTH; x += 12) {
      const y = boundary + Math.sin((x + tick * 2) * 0.14) * (4 + intensity * 12);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = "#00D5FF";
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";
    ctx.globalAlpha = 0.9;
    ctx.fillText(
      corruptionState.stage === CORRUPTION_STAGES.warning ? "WARNING: SYSTEM CORRUPTION DETECTED" : "SYSTEM CORRUPTION",
      WIDTH / 2,
      Math.min(28, Math.max(14, boundary - 12))
    );
  }
  ctx.restore();
}

function maybeAddCorruptionRepairBonus(brick) {
  if (!brick || !brick.corruptionRepair || !corruptionState.active) return;
  corruptionState.pressure = Math.max(0, corruptionState.pressure - 0.18);
  corruptionState.lastRepairBonus = 200;
  registerBonusPoints(200);
  brick.corruptionRepair = false;
  if (corruptionState.pressure < 0.12 && corruptionState.stage === CORRUPTION_STAGES.active) {
    corruptionState.stage = CORRUPTION_STAGES.recovery;
    corruptionState.timer = 120;
    corruptionState.survived = false;
  }
}

function drawCorruptionRepairMarker(target, x = target.x, y = target.y) {
  if (!target.corruptionRepair) return;
  ctx.fillStyle = "#00FFD5";
  ctx.fillRect(x + target.width - 10, y + 2, 8, 8);
  ctx.fillStyle = "#000000";
  ctx.font = "bold 8px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("+", x + target.width - 6, y + 6);
}
