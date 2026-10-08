const MODE_NAMES = {
  campaign: "Campaign",
  classic: "Classic Arcade",
  endless: "Endless",
  time_attack: "Time Attack",
  boss_rush: "Boss Rush",
  survival: "Survival",
  daily: "Daily Challenge",
  zen: "Zen",
  coop: "Local Co-op"
};

const CAMPAIGN_LEVEL_COUNT = 10;
const WORLDS = [
  { name: "Crimson Sector", levels: "1–10", bossPattern: "spread" }
];

function getCampaignBrickType(levelNumber, slot) {
  const typesByLevel = [
    ["normal"],
    ["normal", "golden"],
    ["normal", "armored"],
    ["normal", "moving"],
    ["normal", "explosive"],
    ["armored", "frozen"],
    ["normal", "regenerating"],
    ["armored", "portal"],
    ["chain", "moving", "explosive"],
    ["armored", "explosive", "golden"]
  ];
  const types = typesByLevel[Math.min(Math.max(0, levelNumber - 1), typesByLevel.length - 1)];
  return types[slot % types.length];
}

const BOSS_ATTACKS = {
  spread: [[-1.8, 3.2], [0, 3.7], [1.8, 3.2]],
  aimed: [[-0.8, 3.5], [0, 4.2], [0.8, 3.5]],
  crossfire: [[-2.8, 2.8], [-1.4, 3.5], [0, 4], [1.4, 3.5], [2.8, 2.8]],
  rift: [[-2.4, 2.8], [2.4, 2.8], [-1.2, 3.6], [1.2, 3.6]],
  final: [[-2.6, 3], [-1.3, 4], [0, 4.6], [1.3, 4], [2.6, 3]]
};

const GALACTIC_COLORS = {
  outline: "#02133f",
  blue: "#0066FF",
  darkBlue: "#0645BB",
  magenta: "#FF00D4",
  purple: "#9900FF",
  cyan: "#00D5FF",
  turquoise: "#00FFD5",
  black: "#000000"
};
let galacticBossFragments = [];
let galacticBossDefeatTimer = 0;

function loadEndlessUnlocked() {
  try {
    return localStorage.getItem("brickBounceEndlessUnlocked") === "true";
  } catch (error) {
    console.warn("Unable to load endless mode unlock.", error);
    return false;
  }
}

function saveEndlessUnlocked() {
  try {
    localStorage.setItem("brickBounceEndlessUnlocked", "true");
  } catch (error) {
    console.warn("Unable to save endless mode unlock.", error);
  }
}

function setEndlessOptionState() {
  const option = document.querySelector('#mode-select option[value="endless"]');
  option.disabled = !endlessUnlocked;
  option.textContent = endlessUnlocked ? "Endless" : "Endless (Unlock by completing campaign)";
}

function getModeName(mode) {
  return MODE_NAMES[mode] || MODE_NAMES.campaign;
}

function getWorldName() {
  if (activeMode !== "campaign") return activeMode === "daily" ? `Daily · ${new Date().toISOString().slice(0, 10)}` : "";
  return `${WORLDS[0].name} · ${Math.min(level, CAMPAIGN_LEVEL_COUNT)}/${CAMPAIGN_LEVEL_COUNT}`;
}

function getModeLives() {
  return activeMode === "survival" ? 1 : STARTING_LIVES;
}

function getDailySeed() {
  const date = new Date().toISOString().slice(0, 10);
  let seed = 2166136261;
  for (const character of date) seed = Math.imul(seed ^ character.charCodeAt(0), 16777619);
  return seed >>> 0;
}

function initializeModeLevel() {
  invaderBullets = [];
  invaderFireTimer = 0;
  invaderDirection = 1;
  gravityField = null;

  switch (activeMode) {
    case "classic":
      bricks = makeBricks(level).map((brick) => ({ ...brick, type: "normal", health: 1, maxHealth: 1 }));
      invaders = [];
      break;
    case "boss_rush":
      bricks = [];
      invaders = [makeBossInvader(level)];
      break;
    case "survival":
      bricks = [];
      invaders = makeInvaders(level);
      break;
    case "daily":
      bricks = makeBricks(level, dailySeed);
      invaders = makeInvaders(level, dailySeed);
      break;
    case "campaign":
      bricks = makeBricks(level);
      invaders = level % 10 === 0 ? [makeBossInvader(level)] : makeInvaders(level);
      break;
    case "endless":
      bricks = makeBricks(level);
      invaders = level % 10 === 0 ? [makeBossInvader(level)] : makeInvaders(level);
      break;
    default:
      bricks = makeBricks(level);
      invaders = makeInvaders(level);
      break;
  }
  objectiveBrickTotal = remainingBrickTargets();
  objectiveInvaderTotal = invaders.length;
  updateStatus();
}

function makeBossInvader(bossLevel) {
  const attackPatterns = Object.keys(BOSS_ATTACKS);
  const health = activeMode === "campaign" ? 18 : 24 + Math.floor(bossLevel / 10) * 4;
  const galacticCommander = activeMode === "campaign"
    ? bossLevel === CAMPAIGN_LEVEL_COUNT
    : activeMode === "endless"
      ? bossLevel % 20 === 0
      : activeMode === "boss_rush" && bossLevel % 2 === 1;
  return {
    x: WIDTH / 2 - (galacticCommander ? 80 : 38),
    y: galacticCommander ? -108 : 92,
    width: galacticCommander ? 160 : 76,
    height: galacticCommander ? 96 : 48,
    type: "boss",
    variant: galacticCommander ? "galactic-commander" : "crimson",
    health,
    maxHealth: health,
    fireTimer: 0,
    phase: 1,
    entrance: galacticCommander,
    beamState: "idle",
    beamTimer: 0,
    beamCooldown: 210,
    hoverTick: Math.random() * Math.PI * 2,
    attackPattern: activeMode === "campaign"
      ? WORLDS[0].bossPattern
      : attackPatterns[(bossLevel - 1) % attackPatterns.length],
    intangible: false
  };
}

function fireBossPattern(boss) {
  const pattern = boss.variant === "galactic-commander"
    ? boss.phase === 3 ? BOSS_ATTACKS.final
      : boss.phase === 2 ? BOSS_ATTACKS.crossfire
        : BOSS_ATTACKS.spread
    : BOSS_ATTACKS[boss.attackPattern] || BOSS_ATTACKS.spread;
  const phaseScale = boss.phase === 3 ? 1.35 : boss.phase === 2 ? 1.15 : 1;
  for (const [vx, vy] of pattern) {
    invaderBullets.push({
      x: boss.x + boss.width / 2 - 2,
      y: boss.y + boss.height,
      width: 6,
      height: 12,
      vx: vx * phaseScale,
      vy: vy * phaseScale,
      speed: vy * phaseScale
    });
  }
}

function drawBossHealth() {
  const boss = invaders.find((invader) => invader.type === "boss");
  if (!boss) return;
  const galacticCommander = boss.variant === "galactic-commander";
  const width = galacticCommander ? 480 : 420;
  const x = (WIDTH - width) / 2;
  const barY = galacticCommander ? 31 : 24;
  ctx.fillStyle = gameTheme.surface;
  ctx.fillRect(x, barY, width, 14);
  ctx.fillStyle = galacticCommander ? GALACTIC_COLORS.cyan : gameTheme.accent;
  ctx.fillRect(x, barY, width * boss.health / boss.maxHealth, 14);
  ctx.strokeStyle = galacticCommander ? GALACTIC_COLORS.blue : "#ff7c84";
  ctx.strokeRect(x, barY, width, 14);
  ctx.fillStyle = "white";
  ctx.font = galacticCommander ? "bold 16px sans-serif" : "bold 14px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(galacticCommander
    ? `GALACTIC COMMANDER · PHASE ${boss.phase}`
    : `${getWorldName()} BOSS · PHASE ${boss.phase}`, WIDTH / 2, galacticCommander ? 23 : 18);
}

function updateGalacticCommander(boss) {
  const slowFactor = activeEffects.slow ? 0.55 : 1;
  boss.hoverTick += interfaceData.settings.reducedMotion ? 0.025 : 0.055;
  if (boss.entrance) {
    boss.y = Math.min(76, boss.y + 2.4 * slowFactor);
    if (boss.y >= 76) boss.entrance = false;
  } else if (boss.beamState === "idle" || boss.beamState === "retracting") {
    const phaseSpeed = boss.phase === 3 ? 2.2 : boss.phase === 2 ? 1.55 : 1;
    boss.x += invaderDirection * phaseSpeed * slowFactor;
    if (boss.x < 20 || boss.x + boss.width > WIDTH - 20) {
      boss.x = Math.max(20, Math.min(WIDTH - boss.width - 20, boss.x));
      invaderDirection *= -1;
    }
    boss.y = 76 + (interfaceData.settings.reducedMotion ? 0 : Math.sin(boss.hoverTick) * 5);
  }

  if (boss.beamState === "warning") {
    boss.beamTimer -= 1;
    if (boss.beamTimer <= 0) {
      boss.beamState = "extending";
      boss.beamTimer = 36;
    }
  } else if (boss.beamState === "extending") {
    boss.beamTimer -= 1;
    if (boss.beamTimer <= 0) {
      boss.beamState = "active";
      boss.beamTimer = boss.phase === 3 ? 300 : boss.phase === 2 ? 255 : 210;
    }
  } else if (boss.beamState === "active") {
    boss.beamTimer -= 1;
    if (boss.beamTimer <= 0) {
      boss.beamState = "retracting";
      boss.beamTimer = 45;
    }
  } else if (boss.beamState === "retracting") {
    boss.beamTimer -= 1;
    if (boss.beamTimer <= 0) {
      boss.beamState = "idle";
      boss.beamCooldown = boss.phase === 3 ? 135 : boss.phase === 2 ? 190 : 260;
    }
  } else if (!boss.entrance) {
    boss.beamCooldown -= 1;
    if (boss.beamCooldown <= 0) {
      boss.beamState = "warning";
      boss.beamTimer = 60;
    }
  }

  boss.fireTimer += slowFactor;
  const fireInterval = boss.phase === 3 ? 38 : boss.phase === 2 ? 55 : 78;
  if (boss.fireTimer >= fireInterval && boss.beamState !== "warning") {
    boss.fireTimer = 0;
    fireBossPattern(boss);
  }
}

function applyGalacticBeamForce(targetBall) {
  const boss = invaders.find((invader) => invader.variant === "galactic-commander" &&
    (invader.beamState === "extending" || invader.beamState === "active" ||
      invader.beamState === "retracting"));
  if (!boss) return;
  const beamProgress = boss.beamState === "extending"
    ? Math.max(0, 1 - boss.beamTimer / 36)
    : boss.beamState === "retracting" ? Math.max(0, boss.beamTimer / 45) : 1;
  const centerX = boss.x + boss.width / 2;
  const beamOriginY = boss.y + boss.height - 12;
  const relativeY = targetBall.y + targetBall.height / 2 - beamOriginY;
  const progressDown = relativeY / Math.max(1, HEIGHT - beamOriginY);
  if (progressDown < 0 || progressDown > beamProgress) return;

  const halfWidth = Math.min(230, 72 + progressDown * 155);
  const ballCenterX = targetBall.x + targetBall.width / 2;
  const distance = Math.abs(ballCenterX - centerX);
  if (distance > halfWidth + targetBall.width) return;
  const strength = boss.phase === 3 ? 0.12 : boss.phase === 2 ? 0.095 : 0.07;
  const pull = Math.sign(centerX - ballCenterX) * strength *
    Math.max(0, 1 - distance / (halfWidth + targetBall.width));
  targetBall.vx = Math.max(-6, Math.min(6, targetBall.vx + pull));
}

function drawGalacticTractorBeam(boss) {
  if (boss.beamState !== "extending" && boss.beamState !== "active" &&
      boss.beamState !== "retracting") return;
  const height = Math.max(0, HEIGHT - boss.y - boss.height);
  const beamProgress = boss.beamState === "extending"
    ? 1 - boss.beamTimer / 36
    : boss.beamState === "retracting" ? boss.beamTimer / 45 : 1;
  const drawnHeight = height * beamProgress;
  const centerX = boss.x + boss.width / 2;
  const beamOriginY = boss.y + boss.height - 12;
  const tick = interfaceData.settings.reducedMotion ? 0 : movingTick;
  ctx.save();
  if (!interfaceData.settings.reducedMotion && interfaceData.settings.effectsIntensity > 0) {
    ctx.shadowColor = GALACTIC_COLORS.cyan;
    ctx.shadowBlur = 7 * interfaceData.settings.effectsIntensity;
  }
  for (let row = 0; row * 10 < drawnHeight; row += 1) {
    const y = beamOriginY + row * 10;
    const depth = (row * 10) / Math.max(1, height);
    const halfWidth = Math.min(230, 38 + depth * 190);
    const curve = Math.abs(depth - 0.5) * 11;
    const color = (row + Math.floor(tick / 8)) % 3 === 0
      ? GALACTIC_COLORS.turquoise
      : (row + Math.floor(tick / 8)) % 2 === 0 ? GALACTIC_COLORS.cyan : GALACTIC_COLORS.blue;
    const outerWidth = Math.max(0, halfWidth - curve);
    const gap = 5;
    const segmentWidth = Math.max(0, (outerWidth - gap * 3) / 3);
    for (let segment = 0; segment < 3 && segmentWidth > 0; segment += 1) {
      const left = centerX - outerWidth + segment * (segmentWidth + gap);
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.55 + segment * 0.12;
      ctx.fillRect(left, y, segmentWidth, 5);
      ctx.fillRect(2 * centerX - left - segmentWidth, y, segmentWidth, 5);
    }
  }
  ctx.restore();
}

function drawGalacticCommander(boss) {
  const unit = 4;
  const centerX = boss.x + boss.width / 2;
  const y = Math.round(boss.y + (interfaceData.settings.reducedMotion ? 0 : Math.sin(boss.hoverTick) * 2));
  const rect = (x, row, width, height, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(centerX + x * unit), Math.round(y + row * unit), width * unit, height * unit);
    ctx.fillRect(Math.round(centerX - (x + width) * unit), Math.round(y + row * unit), width * unit, height * unit);
  };

  drawGalacticTractorBeam(boss);
  ctx.save();
  ctx.imageSmoothingEnabled = false;
  if (!interfaceData.settings.reducedMotion && boss.phase === 3) {
    ctx.shadowColor = GALACTIC_COLORS.magenta;
    ctx.shadowBlur = 8 * interfaceData.settings.effectsIntensity;
  }
  const outline = GALACTIC_COLORS.outline;
  rect(-2, 0, 4, 2, outline);
  rect(-4, 2, 8, 2, outline);
  rect(-6, 4, 12, 2, outline);
  rect(-9, 6, 18, 3, outline);
  rect(-13, 9, 26, 3, outline);
  rect(-15, 12, 30, 3, outline);
  rect(-14, 15, 28, 3, outline);
  rect(-11, 18, 22, 2, outline);

  rect(-1, 0, 2, 3, GALACTIC_COLORS.blue);
  rect(-7, -2, 2, 4, outline);
  rect(-6, -1, 1, 3, GALACTIC_COLORS.cyan);
  rect(-3, 0, 1, 2, GALACTIC_COLORS.darkBlue);
  rect(-3, 2, 6, 2, GALACTIC_COLORS.darkBlue);
  rect(-5, 4, 10, 2, GALACTIC_COLORS.blue);
  rect(-8, 6, 16, 2, GALACTIC_COLORS.darkBlue);
  rect(-12, 9, 24, 2, GALACTIC_COLORS.blue);
  rect(-14, 12, 28, 2, GALACTIC_COLORS.darkBlue);
  rect(-12, 14, 24, 2, GALACTIC_COLORS.blue);
  rect(-9, 16, 18, 2, GALACTIC_COLORS.darkBlue);

  rect(-2, 3, 4, 2, GALACTIC_COLORS.purple);
  rect(-4, 5, 8, 2, GALACTIC_COLORS.magenta);
  rect(-7, 7, 14, 2, GALACTIC_COLORS.purple);
  rect(-9, 9, 18, 2, GALACTIC_COLORS.magenta);
  rect(-7, 11, 14, 2, GALACTIC_COLORS.purple);
  rect(-4, 13, 8, 2, GALACTIC_COLORS.magenta);
  rect(-2, 15, 4, 2, GALACTIC_COLORS.darkBlue);

  rect(-16, 9, 3, 2, GALACTIC_COLORS.darkBlue);
  rect(-17, 11, 3, 2, GALACTIC_COLORS.blue);
  rect(-15, 13, 2, 2, GALACTIC_COLORS.magenta);
  rect(-13, 15, 2, 2, GALACTIC_COLORS.magenta);
  rect(-11, 17, 2, 2, GALACTIC_COLORS.blue);
  rect(-9, 19, 2, 2, GALACTIC_COLORS.darkBlue);
  rect(-6, 20, 2, 1, GALACTIC_COLORS.blue);
  rect(-2, 18, 4, 1, GALACTIC_COLORS.black);
  rect(-1, 19, 2, 1, GALACTIC_COLORS.black);
  rect(-16, 7, 1, 1, GALACTIC_COLORS.cyan);
  rect(-2, 1, 1, 1, GALACTIC_COLORS.turquoise);
  ctx.restore();
  if (boss.beamState === "warning") {
    ctx.save();
    ctx.fillStyle = GALACTIC_COLORS.cyan;
    ctx.textAlign = "center";
    ctx.font = "bold 12px monospace";
    ctx.globalAlpha = interfaceData.settings.reducedMotion
      ? 0.9
      : 0.55 + Math.sin(boss.beamTimer * 0.22) * 0.35;
    ctx.fillText("TRACTOR BEAM LOCKING", centerX, y + boss.height + 19);
    ctx.restore();
  }
}

function spawnGalacticBossFragments(boss) {
  galacticBossFragments = [];
  const colors = [GALACTIC_COLORS.blue, GALACTIC_COLORS.darkBlue, GALACTIC_COLORS.magenta,
    GALACTIC_COLORS.purple, GALACTIC_COLORS.cyan, GALACTIC_COLORS.turquoise];
  const fragmentCount = interfaceData.settings.reducedMotion ? 30 : 54;
  for (let index = 0; index < fragmentCount; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (interfaceData.settings.reducedMotion ? 0.5 : 1) +
      Math.random() * (interfaceData.settings.reducedMotion ? 1.5 : 4);
    galacticBossFragments.push({
      x: boss.x + 10 + Math.random() * 140,
      y: boss.y + 4 + Math.random() * 84,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 3 + Math.floor(Math.random() * 5),
      color: colors[index % colors.length],
      life: 75 + Math.floor(Math.random() * 35)
    });
  }
  galacticBossDefeatTimer = 150;
}

function updateGalacticBossEffects() {
  for (let index = galacticBossFragments.length - 1; index >= 0; index -= 1) {
    const fragment = galacticBossFragments[index];
    fragment.x += fragment.vx;
    fragment.y += fragment.vy;
    fragment.vx *= 0.985;
    fragment.vy *= 0.985;
    fragment.life -= 1;
    if (fragment.life <= 0) galacticBossFragments.splice(index, 1);
  }
  if (galacticBossDefeatTimer > 0) galacticBossDefeatTimer -= 1;
  return galacticBossDefeatTimer === 0;
}

function drawGalacticBossEffects() {
  for (const fragment of galacticBossFragments) {
    ctx.globalAlpha = Math.min(1, fragment.life / 35);
    ctx.fillStyle = fragment.color;
    ctx.fillRect(Math.round(fragment.x), Math.round(fragment.y), fragment.size, fragment.size);
  }
  ctx.globalAlpha = 1;
  if (galacticBossDefeatTimer > 0) {
    ctx.fillStyle = GALACTIC_COLORS.cyan;
    ctx.font = "bold 32px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("BOSS DEFEATED · +5,000", WIDTH / 2, HEIGHT / 2);
  }
}

function resetGalacticBossState() {
  galacticBossFragments = [];
  galacticBossDefeatTimer = 0;
}

function areModeObjectivesComplete() {
  if (activeMode === "classic") return remainingBrickTargets() === 0;
  if (activeMode === "boss_rush" || activeMode === "survival") return invaders.length === 0;
  if (activeMode === "daily") return remainingBrickTargets() === 0 && invaders.length === 0;
  return remainingBrickTargets() === 0 && invaders.length === 0;
}

function advanceModeLevel() {
  saveLevelProgress();
  if (activeMode === "campaign" && level === CAMPAIGN_LEVEL_COUNT) {
    endlessUnlocked = true;
    saveEndlessUnlocked();
    setEndlessOptionState();
    campaignComplete = true;
    recordCampaignComplete();
    interfaceData.save = { mode: "endless", level: 1, score, lives };
    saveInterfaceData();
    started = false;
    updateStatus();
    showLevelComplete(levelStartScore, null);
    return;
  }
  if (activeMode === "daily") {
    dailyComplete = true;
    started = false;
    showGameOver();
    return;
  }

  const next = level + 1;
  if (activeMode === "survival" && next % 3 === 0) lives += 1;
  if (activeMode === "time_attack") modeTimer += 15 * 60;
  started = false;
  showLevelComplete(levelStartScore, next);
}

function drawModeOverlayTitle() {
  if (campaignComplete) return "CAMPAIGN COMPLETE";
  if (dailyComplete) return "DAILY CHALLENGE COMPLETE";
  if (activeMode === "time_attack" && modeTimer === 0) return "TIME UP";
  return "GAME OVER";
}
