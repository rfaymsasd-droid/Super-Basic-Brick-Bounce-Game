const UI_STORAGE_KEY = "brickBounceInterface";
const ACHIEVEMENTS = [
  { id: "first-brick", title: "First Break", description: "Destroy your first brick.", goal: 1, stat: "bricksDestroyed" },
  { id: "brick-100", title: "Demolition Crew", description: "Destroy 100 bricks.", goal: 100, stat: "bricksDestroyed" },
  { id: "score-10000", title: "Score Chaser", description: "Earn 10,000 points.", goal: 10000, stat: "bestScore" },
  { id: "level-10", title: "World Traveler", description: "Reach level 10.", goal: 10, stat: "highestLevel" },
  { id: "campaign-clear", title: "Final Frontier", description: "Complete all 50 campaign levels.", goal: 1, stat: "campaignComplete" }
];
const CUSTOM_OPTIONS = {
  ball: [
    { id: "classic", name: "Classic", color: "#ffffff" },
    { id: "aqua", name: "Aqua", color: "#4de3ff" },
    { id: "rose", name: "Rose", color: "#ff6b9a" },
    { id: "gold", name: "Solar", color: "#ffe45e" }
  ],
  paddle: [
    { id: "classic", name: "Classic", color: "#ffffff" },
    { id: "aqua", name: "Aqua", color: "#4de3ff" },
    { id: "violet", name: "Violet", color: "#ba7bff" },
    { id: "gold", name: "Solar", color: "#ffe45e" }
  ],
  theme: [
    { id: "midnight", name: "Midnight", color: "#080b19" },
    { id: "nebula", name: "Nebula", color: "#160b24" },
    { id: "ocean", name: "Ocean", color: "#061b26" }
  ],
  trail: [
    { id: "none", name: "No trail", color: "#ffffff" },
    { id: "spark", name: "Spark", color: "#ffe45e" },
    { id: "comet", name: "Comet", color: "#4de3ff" },
    { id: "ember", name: "Ember", color: "#ff704e" }
  ]
};

let interfaceData = loadInterfaceData();
let menuAnimationFrame = 0;
let menuStars = [];
let menuTick = 0;
let gameActive = false;
let settingsReturnScreen = "main-menu";

function loadInterfaceData() {
  const defaults = {
    save: { mode: "campaign", level: 1, score: 0 },
    stats: { gamesPlayed: 0, bricksDestroyed: 0, targetsHit: 0, launches: 0, misses: 0, highestLevel: 1, bestScore: 0, campaignComplete: false },
    achievements: [],
    customization: { ball: "classic", paddle: "classic", theme: "midnight", trail: "none" },
    settings: { sound: true, reducedMotion: false }
  };
  try {
    const stored = JSON.parse(localStorage.getItem(UI_STORAGE_KEY) || "{}");
    return {
      ...defaults,
      ...stored,
      save: { ...defaults.save, ...stored.save },
      stats: { ...defaults.stats, ...stored.stats },
      customization: { ...defaults.customization, ...stored.customization },
      settings: { ...defaults.settings, ...stored.settings },
      achievements: Array.isArray(stored.achievements) ? stored.achievements : []
    };
  } catch (error) {
    console.warn("Unable to load interface progress.", error);
    return defaults;
  }
}

function saveInterfaceData() {
  try {
    localStorage.setItem(UI_STORAGE_KEY, JSON.stringify(interfaceData));
  } catch (error) {
    console.warn("Unable to save interface progress.", error);
  }
}

function initializeInterface() {
  buildCustomizationOptions();
  applyCustomization();
  document.getElementById("main-menu").addEventListener("click", handleMenuClick);
  document.getElementById("panel-root").addEventListener("click", handlePanelClick);
  document.getElementById("game-over-panel").addEventListener("click", handleResultClick);
  document.getElementById("level-complete-panel").addEventListener("click", handleResultClick);
  document.getElementById("pause-panel").addEventListener("click", handlePauseClick);
  document.getElementById("fullscreen-button").addEventListener("click", toggleFullscreen);
  document.getElementById("game-fullscreen-button").addEventListener("click", toggleFullscreen);
  document.getElementById("pause-button").addEventListener("click", pauseGame);
  document.getElementById("sound-setting").addEventListener("change", (event) => {
    interfaceData.settings.sound = event.target.checked;
    saveInterfaceData();
  });
  document.getElementById("motion-setting").addEventListener("change", (event) => {
    interfaceData.settings.reducedMotion = event.target.checked;
    applyCustomization();
    saveInterfaceData();
  });
  document.getElementById("mode-select").addEventListener("change", () => {
    interfaceData.save.mode = document.getElementById("mode-select").value;
    saveInterfaceData();
  });
  document.addEventListener("fullscreenchange", updateFullscreenButton);
  renderAchievements();
  renderStatistics();
  renderModeOptions();
  renderContinueButton();
  showScreen("main-menu");
  startMenuBackground();
}

function showScreen(screenId) {
  for (const screen of document.querySelectorAll(".screen")) {
    screen.hidden = screen.id !== screenId;
    screen.classList.toggle("screen-active", !screen.hidden);
  }
  document.body.classList.toggle("in-game", screenId === "game-shell");
  document.getElementById("game-shell").hidden = screenId !== "game-shell";
  if (screenId === "main-menu") renderContinueButton();
}

function handleMenuClick(event) {
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (!action) return;
  if (action === "play") {
    document.getElementById("mode-select").value = "campaign";
    resetGame();
    beginGame(false);
  } else if (action === "continue") {
    document.getElementById("mode-select").value = interfaceData.save.mode || "campaign";
    resetGame();
    if (activeMode === "campaign" || activeMode === "endless") {
      level = interfaceData.save.level;
      initializeModeLevel();
    }
    score = interfaceData.save.score || 0;
    lives = interfaceData.save.lives || getModeLives();
    beginGame(true);
  } else if (action === "modes") {
    settingsReturnScreen = "main-menu";
    renderModeOptions();
    showScreen("mode-screen");
  } else if (action === "customize") {
    settingsReturnScreen = "main-menu";
    renderCustomization();
    showScreen("customize-screen");
  } else if (action === "achievements") {
    settingsReturnScreen = "main-menu";
    renderAchievements();
    showScreen("achievements-screen");
  } else if (action === "statistics") {
    settingsReturnScreen = "main-menu";
    renderStatistics();
    showScreen("statistics-screen");
  } else if (action === "settings") {
    settingsReturnScreen = "main-menu";
    renderSettings();
    showScreen("settings-screen");
  } else if (action === "fullscreen") {
    toggleFullscreen();
  }
}

function beginGame(isContinue) {
  gameOver = false;
  paused = false;
  started = false;
  ballAttached = true;
  gameActive = true;
  if (!isContinue) {
    interfaceData.stats.gamesPlayed += 1;
    interfaceData.save = { mode: activeMode, level, score, lives };
    saveInterfaceData();
  }
  showScreen("game-shell");
  levelStartScore = score;
  updateStatus();
}

function renderContinueButton() {
  const button = document.getElementById("continue-button");
  const canContinue = interfaceData.stats.gamesPlayed > 0;
  button.disabled = !canContinue;
  button.textContent = canContinue ? `Continue · ${getModeName(interfaceData.save.mode)} · Level ${interfaceData.save.level}` : "Continue · No saved progress";
}

function renderModeOptions() {
  const container = document.getElementById("mode-cards");
  container.replaceChildren();
  for (const [mode, name] of Object.entries(MODE_NAMES)) {
    if (mode === "endless" && !endlessUnlocked) continue;
    const card = document.createElement("button");
    card.className = "mode-card";
    card.dataset.action = "choose-mode";
    card.dataset.mode = mode;
    card.innerHTML = `<strong>${name}</strong><span>${modeDescription(mode)}</span>`;
    container.append(card);
  }
}

function modeDescription(mode) {
  const descriptions = {
    campaign: "50 crafted levels across five worlds.",
    classic: "Classic brick breaker with score chasing.",
    endless: "Keep going as the challenge scales up.",
    time_attack: "Clear as many waves as possible in two minutes.",
    boss_rush: "Fight one boss after another.",
    survival: "Survive escalating enemy formations on one life.",
    daily: "A shared, date-seeded daily formation.",
    zen: "A relaxed game without attacks or lost lives.",
    coop: "Two paddles, two players, one shared ball."
  };
  return descriptions[mode];
}

function buildCustomizationOptions() {
  for (const [category, options] of Object.entries(CUSTOM_OPTIONS)) {
    const select = document.getElementById(`${category}-skin`);
    select.replaceChildren();
    for (const option of options) {
      const element = document.createElement("option");
      element.value = option.id;
      element.textContent = option.name;
      select.append(element);
    }
    select.value = interfaceData.customization[category];
    select.addEventListener("change", () => {
      interfaceData.customization[category] = select.value;
      saveInterfaceData();
      applyCustomization();
    });
  }
}

function renderCustomization() {
  for (const [category, value] of Object.entries(interfaceData.customization)) {
    document.getElementById(`${category}-skin`).value = value;
  }
  applyCustomization();
}

function getCustomizationColor(category) {
  const option = CUSTOM_OPTIONS[category].find((entry) => entry.id === interfaceData.customization[category]);
  return option?.color || "#ffffff";
}

function applyCustomization() {
  document.body.dataset.theme = interfaceData.customization.theme;
  document.body.dataset.trail = interfaceData.customization.trail;
  document.documentElement.style.setProperty("--ball-color", getCustomizationColor("ball"));
  document.documentElement.style.setProperty("--paddle-color", getCustomizationColor("paddle"));
  document.getElementById("sound-setting").checked = interfaceData.settings.sound;
  document.getElementById("motion-setting").checked = interfaceData.settings.reducedMotion;
  document.body.classList.toggle("reduced-motion", interfaceData.settings.reducedMotion);
}

function renderAchievements() {
  const container = document.getElementById("achievement-list");
  container.replaceChildren();
  for (const achievement of ACHIEVEMENTS) {
    const earned = interfaceData.achievements.includes(achievement.id);
    const progress = achievement.stat === "campaignComplete"
      ? earned ? 1 : 0
      : Math.min(Number(interfaceData.stats[achievement.stat]) / achievement.goal, 1);
    const card = document.createElement("article");
    card.className = `achievement ${earned ? "earned" : "locked"}`;
    card.innerHTML = `<span class="badge">${earned ? "★" : "◇"}</span><div><strong>${achievement.title}</strong><p>${achievement.description}</p><progress max="1" value="${progress}"></progress></div><span>${earned ? "Earned" : `${Math.floor(progress * 100)}%`}</span>`;
    container.append(card);
  }
}

function renderStatistics() {
  const attempts = interfaceData.stats.targetsHit + interfaceData.stats.misses;
  const accuracy = attempts
    ? Math.round(interfaceData.stats.targetsHit / attempts * 100)
    : 0;
  const stats = [
    ["Games played", interfaceData.stats.gamesPlayed],
    ["Bricks destroyed", interfaceData.stats.bricksDestroyed],
    ["Target accuracy", `${accuracy}%`],
    ["Targets hit / misses", `${interfaceData.stats.targetsHit} / ${interfaceData.stats.misses}`],
    ["Best score", interfaceData.stats.bestScore.toLocaleString()],
    ["Highest level", interfaceData.stats.highestLevel]
  ];
  document.getElementById("statistics-list").innerHTML = stats
    .map(([label, value]) => `<div class="stat-tile"><span>${label}</span><strong>${value}</strong></div>`)
    .join("");
}

function renderSettings() {
  document.getElementById("sound-setting").checked = interfaceData.settings.sound;
  document.getElementById("motion-setting").checked = interfaceData.settings.reducedMotion;
}

function handlePanelClick(event) {
  const button = event.target.closest("[data-action]");
  if (button?.dataset.action === "back") {
    showScreen(settingsReturnScreen);
  } else if (button?.dataset.action === "choose-mode") {
    document.getElementById("mode-select").value = button.dataset.mode;
    resetGame();
    beginGame(false);
  }
}

function handlePauseClick(event) {
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action === "resume") {
    resumeGame();
  } else if (action === "restart") {
    resetGame();
    beginGame(false);
  } else if (action === "settings") {
    settingsReturnScreen = "pause-panel";
    renderSettings();
    showScreen("settings-screen");
  } else if (action === "menu") {
    saveSessionProgress();
    paused = false;
    gameOver = false;
    gameActive = false;
    showScreen("main-menu");
  }
}

function handleResultClick(event) {
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action === "next") {
    nextLevel();
    showScreen("game-shell");
  } else if (action === "retry") {
    resetGame();
    beginGame(false);
  } else if (action === "menu") {
    saveSessionProgress();
    gameOver = false;
    gameActive = false;
    showScreen("main-menu");
  }
}

function pauseGame() {
  paused = true;
  settingsReturnScreen = "pause-panel";
  renderSettings();
  showScreen("pause-panel");
}

function resumeGame() {
  paused = false;
  gameActive = true;
  showScreen("game-shell");
}

function showLevelComplete(previousScore, nextLevel) {
  gameOver = false;
  paused = true;
  const earned = Math.max(1, Math.min(3, lives + (score - previousScore > 500 ? 1 : 0)));
  document.getElementById("level-result-title").textContent = campaignComplete ? "Campaign Complete" : `Level ${level} Complete`;
  document.getElementById("level-score").textContent = (score - previousScore).toLocaleString();
  document.getElementById("level-bonus").textContent = (lives * 100).toLocaleString();
  document.getElementById("level-stars").textContent = "★".repeat(earned) + "☆".repeat(3 - earned);
  document.getElementById("next-level-button").textContent = campaignComplete ? "All 50 Levels Cleared" : `Next Level · ${nextLevel}`;
  document.getElementById("next-level-button").disabled = campaignComplete;
  interfaceData.stats.bestScore = Math.max(interfaceData.stats.bestScore, score);
  renderStatistics();
  saveInterfaceData();
  showScreen("level-complete-panel");
}

function showGameOver() {
  gameOver = true;
  paused = true;
  gameActive = false;
  interfaceData.stats.bestScore = Math.max(interfaceData.stats.bestScore, score);
  if (activeMode === "campaign" || activeMode === "endless") {
    interfaceData.save = { mode: activeMode, level, score, lives };
  }
  saveInterfaceData();
  document.getElementById("game-over-title").textContent = dailyComplete ? "Daily Challenge Complete" : modeTimer === 0 ? "Time Attack Complete" : "Game Over";
  document.getElementById("final-score").textContent = score.toLocaleString();
  document.getElementById("best-score").textContent = interfaceData.stats.bestScore.toLocaleString();
  renderAchievements();
  renderStatistics();
  showScreen("game-over-panel");
}

function saveLevelProgress() {
  if (activeMode === "campaign" || activeMode === "endless") {
    const completedLevel = activeMode === "campaign" ? Math.min(50, level + 1) : level + 1;
    interfaceData.save = { mode: activeMode, level: Math.max(interfaceData.save.level, completedLevel), score, lives };
  }
  interfaceData.stats.highestLevel = Math.max(interfaceData.stats.highestLevel, level);
  interfaceData.stats.bestScore = Math.max(interfaceData.stats.bestScore, score);
  unlockAchievements();
  saveInterfaceData();
}

function recordDestroyedBrick() {
  interfaceData.stats.bricksDestroyed += 1;
  unlockAchievements();
  saveInterfaceData();
}

function recordTargetHit() {
  interfaceData.stats.targetsHit += 1;
  interfaceData.stats.bestScore = Math.max(interfaceData.stats.bestScore, score);
  unlockAchievements();
  saveInterfaceData();
}

function recordLaunch() {
  interfaceData.stats.launches += 1;
  saveInterfaceData();
}

function recordCampaignComplete() {
  interfaceData.stats.campaignComplete = true;
  unlockAchievements();
  saveInterfaceData();
}

function recordMiss() {
  interfaceData.stats.misses += 1;
  saveInterfaceData();
}

function unlockAchievements() {
  for (const achievement of ACHIEVEMENTS) {
    const value = achievement.stat === "campaignComplete"
      ? Number(interfaceData.stats.campaignComplete)
      : Number(interfaceData.stats[achievement.stat]);
    if (value >= achievement.goal && !interfaceData.achievements.includes(achievement.id)) {
      interfaceData.achievements.push(achievement.id);
    }
  }
  renderAchievements();
}

function nextLevel() {
  paused = false;
  level += 1;
  initializeModeLevel();
  balls = [ball];
  ballAttached = true;
  positionBall();
  started = false;
  gameActive = true;
  levelStartScore = score;
  updateStatus();
}

function toggleFullscreen() {
  const target = document.getElementById("app");
  const request = target.requestFullscreen?.bind(target);
  const exit = document.exitFullscreen?.bind(document);
  const operation = document.fullscreenElement ? exit?.() : request?.();
  if (operation?.catch) operation.catch((error) => console.error("Unable to toggle fullscreen.", error));
}

function updateFullscreenButton() {
  document.getElementById("fullscreen-button").textContent = document.fullscreenElement ? "Exit full screen" : "Full screen";
}

function startMenuBackground() {
  const canvas = document.getElementById("menu-background");
  const context = canvas.getContext("2d");
  menuStars = Array.from({ length: 72 }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    radius: 1 + Math.random() * 2,
    speed: 0.15 + Math.random() * 0.8,
    phase: Math.random() * Math.PI * 2
  }));
  const drawBackground = () => {
    menuTick += 1;
    if (interfaceData.settings.reducedMotion) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "rgba(5, 8, 24, 0.35)";
      context.fillRect(0, 0, canvas.width, canvas.height);
      requestAnimationFrame(drawBackground);
      return;
    }
    context.clearRect(0, 0, canvas.width, canvas.height);
    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#080b19");
    gradient.addColorStop(1, "#20103b");
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    for (const star of menuStars) {
      star.y += star.speed;
      if (star.y > canvas.height) star.y = 0;
      context.globalAlpha = 0.3 + (Math.sin(menuTick / 30 + star.phase) + 1) * 0.35;
      context.fillStyle = "#ffffff";
      context.beginPath();
      context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
    for (let i = 0; i < 5; i += 1) {
      const x = canvas.width * (0.15 + i * 0.17) + Math.sin(menuTick / 55 + i) * 55;
      const y = 120 + (i % 2) * 145 + Math.cos(menuTick / 70 + i) * 28;
      context.fillStyle = i % 2 ? "rgba(77, 227, 255, .65)" : "rgba(255, 228, 94, .6)";
      context.fillRect(x, y, 42, 14);
    }
    menuAnimationFrame = requestAnimationFrame(drawBackground);
  };
  drawBackground();
}

function saveSessionProgress() {
  interfaceData.save = { mode: activeMode, level, score, lives };
  interfaceData.stats.highestLevel = Math.max(interfaceData.stats.highestLevel, level);
  interfaceData.stats.bestScore = Math.max(interfaceData.stats.bestScore, score);
  saveInterfaceData();
}

document.addEventListener("DOMContentLoaded", initializeInterface);
