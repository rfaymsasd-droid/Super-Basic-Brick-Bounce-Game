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
    attackPattern: activeMode === "campaign"
      ? WORLDS[0].bossPattern
      : attackPatterns[(bossLevel - 1) % attackPatterns.length],
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
  ctx.fillStyle = gameTheme.surface;
  ctx.fillRect(x, 24, width, 12);
  ctx.fillStyle = gameTheme.accent;
  ctx.fillRect(x, 24, width * boss.health / boss.maxHealth, 12);
  ctx.strokeStyle = "#ff7c84";
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
