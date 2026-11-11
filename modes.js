const MODE_NAMES = {
  campaign: "Campaign",
  classic: "Classic Arcade",
  endless: "Endless",
  time_attack: "Time Attack",
  boss_rush: "Boss Rush",
  survival: "Survival",
  daily: "Daily Challenge",
  zen: "Zen",
  coop: "Local Co-op",
  chaos: "Chaos Mode",
  admin: "Admin Sandbox"
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
const WITHER_STORM_PHASE_NAMES = ["", "AWAKENING", "SHELL", "MAW", "DEVOURER", "JUGGERNAUT", "SPLITTING", "BOWELS"];
let galacticBossFragments = [];
let galacticBossDefeatTimer = 0;
let galacticBossDefeatReward = 0;

function modeVisualRandom() {
  return typeof GameJuice === "undefined" ? Math.random() : GameJuice.random();
}

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
      bricks = makeBricks(level).map((brick) => ({
        ...brick,
        type: "normal",
        health: 1,
        maxHealth: 1,
        move: brick.movementGroup === "middle-row" ? slide : stayStill
      }));
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
    case "admin":
      bricks = makeBricks(level);
      invaders = [];
      resetAdminSandbox();
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
  const boss = invaders.find((invader) => invader.type === "boss");
  if (boss && typeof GameJuice !== "undefined") {
    GameJuice.emit("boss-intro", boss.x + boss.width / 2, boss.y + boss.height / 2, {
      color: boss.variant === "wither-storm" ? "#d77bea"
        : boss.variant === "galactic-commander" ? GALACTIC_COLORS.cyan : gameTheme.accent,
      label: boss.variant === "wither-storm" ? "WITHER STORM · INCOMING"
        : boss.variant === "galactic-commander" ? "GALACTIC COMMANDER"
          : "BOSS ENCOUNTER"
    });
  }
  updateStatus();
}

function makeBossInvader(bossLevel, forceWitherStorm = false) {
  const attackPatterns = Object.keys(BOSS_ATTACKS);
  const witherStorm = forceWitherStorm || activeMode === "boss_rush" && bossLevel % 6 === 0;
  const health = witherStorm ? 72 : activeMode === "campaign" ? 18 : 24 + Math.floor(bossLevel / 10) * 4;
  const galacticCommander = activeMode === "campaign"
    ? bossLevel === CAMPAIGN_LEVEL_COUNT
    : activeMode === "endless"
      ? bossLevel % 20 === 0
      : activeMode === "boss_rush" && bossLevel % 2 === 1;
  return {
    x: WIDTH / 2 - (witherStorm ? 88 : galacticCommander ? 80 : 38),
    y: witherStorm ? -124 : galacticCommander ? -108 : 92,
    width: witherStorm ? 176 : galacticCommander ? 160 : 76,
    height: witherStorm ? 116 : galacticCommander ? 96 : 48,
    type: "boss",
    variant: witherStorm ? "wither-storm" : galacticCommander ? "galactic-commander" : "crimson",
    health,
    maxHealth: health,
    fireTimer: 0,
    phase: 1,
    entrance: galacticCommander || witherStorm,
    beamState: "idle",
    beamTimer: 0,
    beamCooldown: 180,
    beamCycle: 0,
    hoverTick: Math.random() * Math.PI * 2,
    coreOpen: false,
    witherVolley: 0,
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

function fireWitherStormAttack(boss) {
  const count = Math.min(9, 3 + (boss.phase - 1) * 2);
  const speed = Math.min(4.8, 2.8 + (boss.phase - 1) * 0.4);
  for (let index = 0; index < count; index += 1) {
    const x = boss.x + boss.width * (index + 1) / (count + 1);
    const targetX = paddle.x + paddle.width / 2;
    invaderBullets.push({
      x: x - 7,
      y: boss.y + boss.height - 4,
      width: 14,
      height: 14,
      vx: Math.max(-1.5, Math.min(1.5, (targetX - x) * 0.002)),
      vy: speed,
      speed,
      witherOrb: true
    });
  }
  boss.witherVolley += 1;
}

function getWitherStormBeamCenters(boss) {
  const centerX = boss.x + boss.width / 2;
  if (boss.phase < 4) return [centerX];
  return [boss.x + boss.width * 0.24, centerX, boss.x + boss.width * 0.76];
}

function getWitherStormActiveBeamCenters(boss) {
  const centers = getWitherStormBeamCenters(boss);
  if (centers.length === 1) return centers;
  const count = boss.phase >= 6 ? 3 : 2;
  return Array.from({ length: count }, (_, index) => centers[(boss.beamCycle + index) % centers.length]);
}

function updateWitherStorm(boss) {
  const slowFactor = activeEffects.slow ? 0.55 : 1;
  const reducedMotion = interfaceData.settings.reducedMotion;
  const healthRatio = boss.health / boss.maxHealth;
  boss.phase = Math.min(7, 1 + Math.floor((1 - healthRatio) * 7));
  if (!reducedMotion && boss._juicePhase !== undefined && boss._juicePhase !== boss.phase) {
    GameJuice.emit("boss-phase", boss.x + boss.width / 2, boss.y + boss.height / 2, {
      color: "#d77bea",
      label: WITHER_STORM_PHASE_NAMES[boss.phase],
      bossY: boss.y + boss.height + 24
    });
  }
  boss._juicePhase = boss.phase;
  boss.hoverTick += reducedMotion ? 0.02 : 0.045;
  if (boss.entrance) {
    boss.y = Math.min(68, boss.y + 1.6 * slowFactor);
    if (boss.y >= 68) boss.entrance = false;
  } else {
    const speed = (0.72 + boss.phase * 0.14) * (boss.adminSpeed || 1) * slowFactor;
    boss.x += invaderDirection * speed;
    if (boss.x < 18 || boss.x + boss.width > WIDTH - 18) {
      boss.x = Math.max(18, Math.min(WIDTH - boss.width - 18, boss.x));
      invaderDirection *= -1;
    }
    boss.y = 68 + (reducedMotion ? 0 : Math.sin(boss.hoverTick) * 5);
  }

  const cycle = 210 - boss.phase * 8;
  const openDuration = Math.max(34, 124 - boss.phase * 13);
  boss.coreOpen = !boss.entrance && movingTick % cycle < openDuration;
  boss.intangible = boss.entrance || !boss.coreOpen;

  if (boss.entrance) return;
  boss.fireTimer += slowFactor;
  const fireInterval = Math.max(42, 128 - boss.phase * 12);
  if (boss.fireTimer >= fireInterval) {
    boss.fireTimer = 0;
    fireWitherStormAttack(boss);
  }

  if (boss.beamState === "warning") {
    boss.beamTimer -= 1;
    if (boss.beamTimer <= 0) {
      boss.beamState = "active";
      boss.beamTimer = Math.max(72, 120 - boss.phase * 4);
    }
  } else if (boss.beamState === "active") {
    boss.beamTimer -= 1;
    if (boss.beamTimer <= 0) {
      boss.beamState = "retracting";
      boss.beamTimer = 28;
    }
  } else if (boss.beamState === "retracting") {
    boss.beamTimer -= 1;
    if (boss.beamTimer <= 0) {
      boss.beamState = "idle";
      boss.beamCooldown = Math.max(100, 220 - boss.phase * 15);
    }
  } else {
    boss.beamCooldown -= 1;
    if (boss.beamCooldown <= 0) {
      boss.beamState = "warning";
      boss.beamTimer = 48;
      boss.beamCycle = Math.floor(movingTick / 120) % 3;
      if (!reducedMotion) {
        GameJuice.emit("boss-warning", boss.x + boss.width / 2, boss.y + boss.height + 20, {
          color: "#e8b3f4",
          label: "TRACTOR BEAM LOCKING"
        });
        playGameSound("warning");
      }
    }
  }
}

function applyWitherStormPull(targetBall) {
  const boss = invaders.find((invader) => invader.variant === "wither-storm" && !invader.entrance);
  if (!boss) return;
  const dx = boss.x + boss.width / 2 - (targetBall.x + targetBall.width / 2);
  const dy = boss.y + boss.height / 2 - (targetBall.y + targetBall.height / 2);
  const distance = Math.hypot(dx, dy);
  const radius = 190 + boss.phase * 25;
  if (distance > 0 && distance < radius) {
    const strength = 0.035 + boss.phase * 0.025;
    const influence = 1 - distance / radius;
    targetBall.vx = Math.max(-7, Math.min(7, targetBall.vx + dx / distance * strength * influence));
    targetBall.vy = Math.max(-7, Math.min(7, targetBall.vy + dy / distance * strength * influence));
  }

  const beamActive = boss.beamState === "active" || boss.beamState === "retracting";
  const beamCenters = getWitherStormActiveBeamCenters(boss);
  const ballCenterX = targetBall.x + targetBall.width / 2;
  const beamCenter = beamCenters.find((centerX) => Math.abs(centerX - ballCenterX) < 38 + targetBall.width / 2);
  if (beamCenter !== undefined && targetBall.y + targetBall.height > boss.y + boss.height - 16) {
    const beamInfluence = 1 - Math.abs(beamCenter - ballCenterX) / (38 + targetBall.width / 2);
    targetBall.vx = Math.max(-7, Math.min(7, targetBall.vx + (beamCenter - ballCenterX) * 0.006 * beamInfluence));
    targetBall.vy = Math.max(-7, targetBall.vy - (beamActive ? 0.12 : 0.045) * beamInfluence);
  }

  const caughtInBeam = beamActive && beamCenter !== undefined &&
    targetBall.y + targetBall.height > boss.y + boss.height - 16;
  if (caughtInBeam) targetBall.witherSickness = (targetBall.witherSickness || 0) + 1;
  else if (targetBall.witherSickness) targetBall.witherSickness = Math.max(0, targetBall.witherSickness - 2);
  if (targetBall.witherSickness >= 90) {
    targetBall.witherSickness = 0;
    targetBall.slowTimer = Math.max(targetBall.slowTimer || 0, 90);
  }
}

function drawBossHealth() {
  const boss = invaders.find((invader) => invader.type === "boss");
  if (!boss) return;
  const galacticCommander = boss.variant === "galactic-commander";
  const witherStorm = boss.variant === "wither-storm";
  const width = galacticCommander ? 480 : witherStorm ? 460 : 420;
  const x = (WIDTH - width) / 2;
  const barY = galacticCommander ? 31 : 24;
  boss.displayHealth ??= boss.health;
  if (interfaceData.settings.reducedMotion || interfaceData.settings.decorativeEffects === false) {
    boss.displayHealth = boss.health;
  } else {
    boss.displayHealth += (boss.health - boss.displayHealth) * 0.18;
  }
  const healthRatio = Math.max(0, Math.min(1, boss.health / boss.maxHealth));
  const trailingRatio = Math.max(healthRatio, Math.min(1, boss.displayHealth / boss.maxHealth));
  ctx.fillStyle = gameTheme.surface;
  ctx.fillRect(x, barY, width, 14);
  if (trailingRatio > healthRatio && interfaceData.settings.decorativeEffects !== false) {
    ctx.fillStyle = gameTheme.accentSecondary;
    ctx.fillRect(x + width * healthRatio, barY, width * (trailingRatio - healthRatio), 14);
  }
  ctx.fillStyle = galacticCommander ? GALACTIC_COLORS.cyan : witherStorm ? "#d45bd0" : gameTheme.accent;
  ctx.fillRect(x, barY, width * boss.health / boss.maxHealth, 14);
  ctx.strokeStyle = galacticCommander ? GALACTIC_COLORS.blue : witherStorm ? "#f3a5ef" : "#ff7c84";
  ctx.strokeRect(x, barY, width, 14);
  ctx.fillStyle = "white";
  ctx.font = galacticCommander ? "bold 16px sans-serif" : "bold 14px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(galacticCommander
    ? `GALACTIC COMMANDER · PHASE ${boss.phase}`
    : witherStorm
      ? `WITHER STORM · ${WITHER_STORM_PHASE_NAMES[boss.phase]} · CORE ${boss.coreOpen ? "OPEN" : "CLOSED"}`
      : `${getWorldName()} BOSS · PHASE ${boss.phase}`, WIDTH / 2, galacticCommander ? 23 : 18);
}

function drawWitherStormTractorBeams(boss) {
  for (const targetBall of balls) {
    if (!targetBall.witherSickness && !targetBall.slowTimer) continue;
    ctx.save();
    ctx.globalAlpha = Math.min(0.65, (targetBall.witherSickness || 0) / 100 + (targetBall.slowTimer || 0) / 300);
    ctx.strokeStyle = "#d77bea";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(targetBall.x + targetBall.width / 2, targetBall.y + targetBall.height / 2,
      targetBall.width * 0.9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  if (boss.beamState === "idle") return;
  const extending = boss.beamState === "warning";
  const progress = boss.beamState === "retracting" ? boss.beamTimer / 28 : 1;
  const centers = getWitherStormActiveBeamCenters(boss);
  ctx.save();
  for (const centerX of centers) {
    const top = boss.y + boss.height - 8;
    if (extending) {
      ctx.globalAlpha = 0.72;
      ctx.fillStyle = "#e8b3f4";
      ctx.fillRect(centerX - 2, top, 4, HEIGHT - top);
      continue;
    }
    const width = 52 * progress;
    ctx.globalAlpha = 0.2 + progress * 0.2;
    ctx.fillStyle = "#a83fca";
    ctx.fillRect(centerX - width / 2, top, width, HEIGHT - top);
    ctx.globalAlpha = 0.75;
    ctx.fillStyle = "#df8df0";
    for (let row = 0; top + row * 12 < HEIGHT; row += 1) {
      const motionTick = interfaceData.settings.reducedMotion ? 0 : movingTick;
      const y = top + ((row * 12 + motionTick * 3) % Math.max(12, HEIGHT - top));
      ctx.fillRect(centerX - 2, y, 4, 6);
      if (!interfaceData.settings.reducedMotion && row % 3 === 0) {
        ctx.strokeStyle = "#fff4ff";
        ctx.beginPath();
        ctx.ellipse(centerX, y + 3, 11 + row % 4 * 3, 3, movingTick * 0.04, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  }
  if (extending) {
    ctx.fillStyle = "#f3d9ff";
    ctx.globalAlpha = 1;
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("TRACTOR BEAM LOCKING", WIDTH / 2, Math.min(HEIGHT - 18, boss.y + boss.height + 18));
  }
  ctx.restore();
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
      if (!interfaceData.settings.reducedMotion) {
        GameJuice.emit("boss-warning", boss.x + boss.width / 2, boss.y + boss.height + 20, {
          color: GALACTIC_COLORS.cyan,
          label: "TRACTOR BEAM LOCKING"
        });
        playGameSound("warning");
      }
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
    ctx.shadowBlur = 7 * interfaceData.settings.effectsIntensity * GameJuice.getQuality().glow;
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
    ctx.shadowBlur = 8 * interfaceData.settings.effectsIntensity * GameJuice.getQuality().glow;
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
    const angle = modeVisualRandom() * Math.PI * 2;
    const speed = (interfaceData.settings.reducedMotion ? 0.5 : 1) +
      modeVisualRandom() * (interfaceData.settings.reducedMotion ? 1.5 : 4);
    galacticBossFragments.push({
      x: boss.x + 10 + modeVisualRandom() * 140,
      y: boss.y + 4 + modeVisualRandom() * 84,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 3 + Math.floor(modeVisualRandom() * 5),
      color: colors[index % colors.length],
      life: 75 + Math.floor(modeVisualRandom() * 35)
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
    ctx.fillText(`BOSS DEFEATED · +${(galacticBossDefeatReward || 0).toLocaleString()}`, WIDTH / 2, HEIGHT / 2);
  }
}

function resetGalacticBossState() {
  galacticBossFragments = [];
  galacticBossDefeatTimer = 0;
  galacticBossDefeatReward = 0;
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