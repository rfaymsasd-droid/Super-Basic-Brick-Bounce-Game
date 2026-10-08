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

const WORLDS = [
  { name: "The Beginning", levels: "1–10", bricks: ["normal", "normal", "golden"], bossPattern: "spread" },
  { name: "Neon City", levels: "11–20", bricks: ["moving", "moving", "frozen"], bossPattern: "aimed" },
  { name: "The Red Zone", levels: "21–30", bricks: ["armored", "explosive", "armored"], bossPattern: "crossfire" },
  { name: "Quantum Rift", levels: "31–40", bricks: ["portal", "frozen", "indestructible"], bossPattern: "rift" },
  { name: "The Final Frontier", levels: "41–50", bricks: ["armored", "explosive", "portal", "golden", "chain", "moving"], bossPattern: "final" }
];

function getCampaignBrickType(levelNumber, slot) {
  const world = WORLDS[Math.min(Math.floor((levelNumber - 1) / 10), WORLDS.length - 1)];
  return world.bricks[slot % world.bricks.length];
}

const BOSS_ATTACKS = {
  spread: [[-1.8, 3.2], [0, 3.7], [1.8, 3.2]],
  aimed: [[-0.8, 3.5], [0, 4.2], [0.8, 3.5]],
  crossfire: [[-2.8, 2.8], [-1.4, 3.5], [0, 4], [1.4, 3.5], [2.8, 2.8]],
  rift: [[-2.4, 2.8], [2.4, 2.8], [-1.2, 3.6], [1.2, 3.6]],
  final: [[-2.6, 3], [-1.3, 4], [0, 4.6], [1.3, 4], [2.6, 3]]
};

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
  return `${WORLDS[Math.min(Math.floor((level - 1) / 10), 4)].name} · ${level}/50`;
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
  gravityField = activeMode === "campaign" && level >= 31 && level <= 40
    ? { x: WIDTH / 2, y: 260, radius: 190 }
    : null;

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
  updateStatus();
}

function makeBossInvader(bossLevel) {
  const worldIndex = activeMode === "campaign"
    ? Math.min(Math.floor((bossLevel - 1) / 10), WORLDS.length - 1)
    : (bossLevel - 1) % WORLDS.length;
  const world = WORLDS[worldIndex];
  const health = 24 + Math.floor(bossLevel / 10) * 4;
  return {
    x: WIDTH / 2 - 38,
    y: 92,
    width: 76,
    height: 48,
    type: "boss",
    health,
    maxHealth: health,
    fireTimer: 0,
    phase: 1,
    attackPattern: world.bossPattern,
    intangible: false
  };
}

function fireBossPattern(boss) {
  const pattern = BOSS_ATTACKS[boss.attackPattern] || BOSS_ATTACKS.spread;
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
  const width = 420;
  const x = (WIDTH - width) / 2;
  ctx.fillStyle = "#32152c";
  ctx.fillRect(x, 24, width, 12);
  ctx.fillStyle = "#ff4de1";
  ctx.fillRect(x, 24, width * boss.health / boss.maxHealth, 12);
  ctx.strokeStyle = "white";
  ctx.strokeRect(x, 24, width, 12);
  ctx.fillStyle = "white";
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(`${getWorldName()} BOSS · PHASE ${boss.phase}`, WIDTH / 2, 18);
}

function areModeObjectivesComplete() {
  if (activeMode === "classic") return remainingBrickTargets() === 0;
  if (activeMode === "boss_rush" || activeMode === "survival") return invaders.length === 0;
  if (activeMode === "daily") return remainingBrickTargets() === 0 && invaders.length === 0;
  return remainingBrickTargets() === 0 && invaders.length === 0;
}

function advanceModeLevel() {
  if (activeMode === "campaign" && level === 50) {
    endlessUnlocked = true;
    saveEndlessUnlocked();
    setEndlessOptionState();
    campaignComplete = true;
    gameOver = true;
    started = false;
    updateStatus();
    return;
  }
  if (activeMode === "daily") {
    dailyComplete = true;
    gameOver = true;
    started = false;
    return;
  }

  level += 1;
  if (activeMode === "boss_rush") lives += 1;
  if (activeMode === "survival" && level % 3 === 0) lives += 1;
  if (activeMode === "time_attack") modeTimer += 15 * 60;
  initializeModeLevel();
  started = false;
  ballAttached = true;
  balls = [ball];
  positionBall();
}

function drawModeOverlayTitle() {
  if (campaignComplete) return "CAMPAIGN COMPLETE";
  if (dailyComplete) return "DAILY CHALLENGE COMPLETE";
  if (activeMode === "time_attack" && modeTimer === 0) return "TIME UP";
  return "GAME OVER";
}
