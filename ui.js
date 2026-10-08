const UI_STORAGE_KEY = "brickBounceInterface";
const ACHIEVEMENTS = [
  { id: "first-brick", title: "First Break", description: "Destroy your first brick.", goal: 1, stat: "bricksDestroyed" },
  { id: "brick-100", title: "Demolition Crew", description: "Destroy 100 bricks.", goal: 100, stat: "bricksDestroyed" },
  { id: "score-10000", title: "Score Chaser", description: "Earn 10,000 points.", goal: 10000, stat: "bestScore" },
  { id: "level-10", title: "Final Approach", description: "Reach the Crimson boss.", goal: 10, stat: "highestLevel" },
  { id: "campaign-clear", title: "Crimson Clear", description: "Defeat the boss and clear all 10 campaign levels.", goal: 1, stat: "campaignComplete" }
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
  theme: Object.values(THEME_PRESETS).map(({ id, name, background }) => ({ id, name, color: background }))
    .concat([{ id: "custom", name: "Custom Theme", color: "#1a1b23" }]),
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
let customThemeDraft;
let themePreviewFrame = 0;
let themePreviewTick = 0;
let themePreviewActive = false;
let themePreviewFadeTimer = 0;
let customThemeDirty = false;
let themeBeforeDraft;

function loadInterfaceData() {
  const defaults = {
    save: { mode: "campaign", level: 1, score: 0 },
    stats: { gamesPlayed: 0, bricksDestroyed: 0, targetsHit: 0, launches: 0, misses: 0, highestLevel: 1, bestScore: 0, campaignComplete: false },
    achievements: [],
    customization: { ball: "classic", paddle: "classic", theme: "crimson", trail: "comet" },
    customTheme: { ...THEME_PRESETS.crimson, id: "custom", name: "Custom Theme" },
    settings: { sound: true, sfxVolume: 0.7, music: true, musicVolume: 0.2, reducedMotion: false, effectsIntensity: 0.6, colorblind: false, cameraShake: false, motionBlur: false, animatedGrid: true }
  };
  try {
    const stored = JSON.parse(localStorage.getItem(UI_STORAGE_KEY) || "{}");
    return {
      ...defaults,
      ...stored,
      save: { ...defaults.save, ...stored.save },
      stats: { ...defaults.stats, ...stored.stats },
      customization: {
        ...defaults.customization,
        ...stored.customization,
        theme: [...Object.keys(THEME_PRESETS), "custom"].includes(stored.customization?.theme)
          ? stored.customization.theme
          : defaults.customization.theme
      },
      customTheme: normalizeCustomTheme(stored.customTheme, defaults.customTheme),
      settings: { ...defaults.settings, ...stored.settings },
      achievements: Array.isArray(stored.achievements) ? stored.achievements : []
    };
  } catch (error) {
    console.warn("Unable to load interface progress.", error);
    return defaults;
  }
}

function normalizeCustomTheme(candidate, fallback = { ...THEME_PRESETS.crimson, id: "custom", name: "Custom Theme" }) {
  const theme = { ...fallback, ...candidate, id: "custom", name: "Custom Theme" };
  for (const { key } of CUSTOM_THEME_FIELDS) {
    if (!isValidThemeColor(theme[key])) theme[key] = fallback[key];
  }
  return isReadableTheme(theme) ? theme : { ...fallback };
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
  buildThemeInterface();
  applyCustomization();
  document.getElementById("main-menu").addEventListener("click", handleMenuClick);
  document.getElementById("panel-root").addEventListener("click", handlePanelClick);
  document.getElementById("game-over-panel").addEventListener("click", handleResultClick);
  document.getElementById("level-complete-panel").addEventListener("click", handleResultClick);
  document.getElementById("pause-panel").addEventListener("click", handlePauseClick);
  document.getElementById("fullscreen-button").addEventListener("click", toggleFullscreen);
  document.getElementById("settings-themes-button").addEventListener("click", () => openThemes("settings-screen"));
  document.getElementById("game-fullscreen-button").addEventListener("click", toggleFullscreen);
  document.getElementById("pause-button").addEventListener("click", pauseGame);
  document.getElementById("launch-button").addEventListener("click", () => {
    if (!gameActive || paused || gameOver) return;
    unlockAudio();
    if (!started || balls.some((targetBall) => targetBall.caught)) {
      recordLaunch();
      started = true;
      launchBall();
    }
  });
  document.getElementById("sound-setting").addEventListener("change", (event) => {
    interfaceData.settings.sound = event.target.checked;
    saveInterfaceData();
  });
  for (const [setting, key] of [
    ["music-setting", "music"],
    ["camera-shake-setting", "cameraShake"],
    ["motion-blur-setting", "motionBlur"],
    ["grid-setting", "animatedGrid"],
    ["colorblind-setting", "colorblind"]
  ]) {
    document.getElementById(setting).addEventListener("change", (event) => {
      interfaceData.settings[key] = event.target.checked;
      if (key === "colorblind") document.body.classList.toggle("colorblind-mode", event.target.checked);
      saveInterfaceData();
      updateMusic();
    });
  }
  for (const [id, key, outputId] of [
    ["effects-volume", "sfxVolume", "effects-volume-value"],
    ["music-volume", "musicVolume", "music-volume-value"],
    ["effects-intensity", "effectsIntensity", "effects-intensity-value"]
  ]) {
    const input = document.getElementById(id);
    input.addEventListener("input", () => {
      interfaceData.settings[key] = Number(input.value);
      document.getElementById(outputId).value = `${Math.round(Number(input.value) * 100)}%`;
      document.getElementById(outputId).textContent = `${Math.round(Number(input.value) * 100)}%`;
      saveInterfaceData();
      updateMusic();
    });
  }
  document.getElementById("motion-setting").addEventListener("change", (event) => {
    interfaceData.settings.reducedMotion = event.target.checked;
    applyCustomization();
    saveInterfaceData();
  });
  document.getElementById("mode-select").addEventListener("change", () => {
    interfaceData.save.mode = document.getElementById("mode-select").value;
    saveInterfaceData();
  });
  document.addEventListener("keydown", handleThemeKeyboard, { capture: true });
  document.addEventListener("fullscreenchange", updateFullscreenButton);
  window.addEventListener("blur", () => {
    if (gameActive && !paused && !gameOver) pauseGame();
  });
  renderAchievements();
  renderStatistics();
  renderModeOptions();
  renderContinueButton();
  showScreen("main-menu");
  startMenuBackground();
  if ("serviceWorker" in window.navigator && (window.location.protocol === "https:" || window.location.hostname === "localhost")) {
    window.navigator.serviceWorker.register("./service-worker.js")
      .catch((error) => console.error("Unable to register the offline app shell.", error));
  }
}

function buildThemeInterface() {
  customThemeDraft = normalizeCustomTheme(interfaceData.customTheme);
  const grid = document.getElementById("theme-card-grid");
  const themes = [
    ...Object.values(THEME_PRESETS),
    { ...customThemeDraft, id: "custom", name: "Custom Theme", description: "Build a palette that is uniquely yours." }
  ];

  for (const theme of themes) {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "theme-card";
    card.dataset.theme = theme.id;
    card.setAttribute("aria-pressed", String(interfaceData.customization.theme === theme.id));
    card.innerHTML = `<span class="theme-card-preview" aria-hidden="true"><span class="mini-score">SCORE 01240</span><span class="mini-bricks"><i></i><i></i><i></i><i></i><i></i><i></i></span><span class="mini-enemy">◆ ◆ ◆</span><span class="mini-ball"></span><span class="mini-paddle"></span></span><span class="theme-card-copy"><strong>${theme.name}</strong><span>${theme.description}</span></span><span class="theme-check" aria-hidden="true">✓</span>`;
    styleThemeCard(card, theme);
    grid.append(card);
  }

  const fields = document.getElementById("custom-theme-fields");
  for (const { key, label } of CUSTOM_THEME_FIELDS) {
    const field = document.createElement("div");
    field.className = "custom-color-field";
    field.innerHTML = `<label for="theme-hex-${key}">${label}</label><div class="custom-color-inputs"><input id="theme-picker-${key}" type="color" aria-label="${label} picker"><input id="theme-hex-${key}" type="text" inputmode="text" autocomplete="off" spellcheck="false" maxlength="7" pattern="#[0-9A-Fa-f]{6}" aria-label="${label} HEX value"></div>`;
    const picker = field.querySelector(`#theme-picker-${key}`);
    const hex = field.querySelector(`#theme-hex-${key}`);
    picker.value = customThemeDraft[key];
    hex.value = customThemeDraft[key].toUpperCase();
    picker.addEventListener("input", () => updateCustomThemeColor(key, picker.value, hex));
    hex.addEventListener("input", () => {
      if (isValidThemeColor(hex.value)) {
        picker.value = hex.value;
        updateCustomThemeColor(key, hex.value, hex);
      } else {
        hex.setAttribute("aria-invalid", "true");
        setThemeFeedback("Enter a valid six-digit HEX color.", true);
      }
    });
    hex.addEventListener("change", () => {
      if (!isValidThemeColor(hex.value)) {
        hex.value = customThemeDraft[key].toUpperCase();
        hex.removeAttribute("aria-invalid");
      }
    });
    fields.append(field);
  }

  document.getElementById("theme-card-grid").addEventListener("click", (event) => {
    const card = event.target.closest("[data-theme]");
    if (card) selectTheme(card.dataset.theme);
  });
  document.getElementById("themes-screen").addEventListener("click", (event) => {
    if (event.target.id === "themes-screen") closeThemes();
  });
  document.getElementById("themes-screen").querySelector("[data-action='theme-close']").addEventListener("click", closeThemes);
  document.getElementById("save-custom-theme").addEventListener("click", saveCustomTheme);
  document.getElementById("reset-custom-theme").addEventListener("click", resetCustomTheme);
}

function styleThemeCard(card, theme) {
  card.style.setProperty("--theme-background", theme.background);
  card.style.setProperty("--theme-surface", theme.surface);
  card.style.setProperty("--theme-accent", theme.accent);
  card.style.setProperty("--theme-secondary", theme.accentSecondary);
  card.style.setProperty("--theme-tertiary", theme.accentTertiary);
  card.style.setProperty("--theme-text", theme.text);
  card.style.setProperty("--theme-brick", theme.brick);
  card.style.setProperty("--theme-enemy", theme.enemy);
}

function renderThemeSelection() {
  const selected = interfaceData.customization.theme;
  for (const card of document.querySelectorAll(".theme-card")) {
    const isSelected = card.dataset.theme === selected;
    card.setAttribute("aria-pressed", String(isSelected));
    card.classList.toggle("selected", isSelected);
    const theme = card.dataset.theme === "custom"
      ? customThemeDraft
      : THEME_PRESETS[card.dataset.theme];
    if (theme) styleThemeCard(card, theme);
  }
}

function selectTheme(themeId) {
  if (themeId === "custom") customThemeDraft = normalizeCustomTheme(interfaceData.customTheme);
  else if (!THEME_PRESETS[themeId]) return;
  interfaceData.customization.theme = themeId;
  if (themeId === "custom") interfaceData.customTheme = { ...customThemeDraft };
  customThemeDirty = false;
  themeBeforeDraft = { theme: themeId, customTheme: { ...interfaceData.customTheme } };
  applyCustomization();
  saveInterfaceData();
  renderThemeSelection();
  syncCustomThemeFields();
  transitionThemePreview();
  drawThemePreview();
  setThemeFeedback(`${themeId === "custom" ? "Custom Theme" : THEME_PRESETS[themeId].name} applied.`, false);
}

function syncCustomThemeFields() {
  if (!document.getElementById("custom-theme-fields")) return;
  for (const { key } of CUSTOM_THEME_FIELDS) {
    const picker = document.getElementById(`theme-picker-${key}`);
    const hex = document.getElementById(`theme-hex-${key}`);
    if (picker && hex) {
      picker.value = customThemeDraft[key];
      hex.value = customThemeDraft[key].toUpperCase();
      hex.removeAttribute("aria-invalid");
    }
  }
}

function updateCustomThemeColor(key, value, hexInput) {
  if (!isValidThemeColor(value)) return;
  const nextTheme = { ...customThemeDraft, [key]: value.toUpperCase(), id: "custom", name: "Custom Theme" };
  hexInput.value = value.toUpperCase();
  hexInput.removeAttribute("aria-invalid");
  if (!isReadableTheme(nextTheme)) {
    document.getElementById(`theme-picker-${key}`).value = customThemeDraft[key];
    hexInput.value = customThemeDraft[key].toUpperCase();
    setThemeFeedback("Text must keep at least 4.5:1 contrast against the background and interface.", true);
    return;
  }
  customThemeDraft = nextTheme;
  interfaceData.customTheme = { ...customThemeDraft };
  interfaceData.customization.theme = "custom";
  customThemeDirty = true;
  applyCustomization();
  renderThemeSelection();
  transitionThemePreview();
  drawThemePreview();
  setThemeFeedback("Preview updated. Save your custom palette to keep it.", false);
}

function saveCustomTheme() {
  if (!isReadableTheme(customThemeDraft)) {
    setThemeFeedback("Increase text contrast before saving this palette.", true);
    return;
  }
  interfaceData.customTheme = { ...customThemeDraft };
  interfaceData.customization.theme = "custom";
  customThemeDirty = false;
  themeBeforeDraft = { theme: "custom", customTheme: { ...customThemeDraft } };
  applyCustomization();
  saveInterfaceData();
  renderThemeSelection();
  setThemeFeedback("Custom Theme saved and applied.", false);
}

function resetCustomTheme() {
  customThemeDraft = { ...THEME_PRESETS.crimson, id: "custom", name: "Custom Theme" };
  interfaceData.customTheme = { ...customThemeDraft };
  interfaceData.customization.theme = "crimson";
  customThemeDirty = false;
  themeBeforeDraft = { theme: "crimson", customTheme: { ...customThemeDraft } };
  applyCustomization();
  saveInterfaceData();
  syncCustomThemeFields();
  renderThemeSelection();
  setThemeFeedback("Restored the Crimson Arcade default palette.", false);
}

function setThemeFeedback(message, isError) {
  const feedback = document.getElementById("theme-feedback");
  feedback.textContent = message;
  feedback.classList.toggle("error", isError);
}

function openThemes(returnScreen) {
  settingsReturnScreen = returnScreen;
  customThemeDraft = normalizeCustomTheme(interfaceData.customTheme);
  themeBeforeDraft = { theme: interfaceData.customization.theme, customTheme: { ...interfaceData.customTheme } };
  customThemeDirty = false;
  syncCustomThemeFields();
  renderThemeSelection();
  setThemeFeedback("", false);
  showScreen("themes-screen");
  startThemePreview();
}

function closeThemes() {
  stopThemePreview();
  if (customThemeDirty && themeBeforeDraft) {
    interfaceData.customization.theme = themeBeforeDraft.theme;
    interfaceData.customTheme = { ...themeBeforeDraft.customTheme };
  }
  customThemeDirty = false;
  applyCustomization();
  showScreen(settingsReturnScreen);
}

function handleThemeKeyboard(event) {
  if (document.getElementById("themes-screen").hidden) return;
  if (event.key === "Escape") {
    event.preventDefault();
    event.stopImmediatePropagation();
    closeThemes();
    return;
  }
  if (event.key !== "Tab") return;
  const focusable = [...document.querySelectorAll("#themes-screen button:not(:disabled), #themes-screen input:not(:disabled)")];
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function startThemePreview() {
  stopThemePreview();
  themePreviewActive = true;
  drawThemePreview();
}

function transitionThemePreview() {
  const preview = document.getElementById("theme-preview");
  preview.classList.add("theme-preview-refresh");
  clearTimeout(themePreviewFadeTimer);
  themePreviewFadeTimer = setTimeout(() => preview.classList.remove("theme-preview-refresh"), 180);
}

function drawThemePreview() {
  if (!themePreviewActive) return;
  const canvas = document.getElementById("theme-preview");
  const ctx = canvas.getContext("2d");
  const draw = () => {
    if (!themePreviewActive) return;
    const { width, height } = canvas;
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, gameTheme.background);
    gradient.addColorStop(1, gameTheme.surface);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = gameTheme.text;
    ctx.globalAlpha = 0.85;
    ctx.font = "bold 13px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("SCORE  012,480", 24, 28);
    ctx.globalAlpha = 1;
    for (let index = 0; index < 7; index += 1) {
      ctx.fillStyle = index % 2 ? gameTheme.accentSecondary : gameTheme.brick;
      ctx.fillRect(24 + index * 47, 48, 39, 13);
    }
    ctx.fillStyle = gameTheme.enemy;
    for (let index = 0; index < 5; index += 1) {
      const x = 452 + index * 42;
      ctx.fillRect(x + 5, 43, 17, 5);
      ctx.fillRect(x, 48, 27, 9);
      ctx.fillRect(x + 4, 57, 5, 7);
      ctx.fillRect(x + 18, 57, 5, 7);
    }
    ctx.fillStyle = gameTheme.projectile;
    ctx.fillRect(548, 78 + Math.sin(themePreviewTick / 16) * 10, 3, 9);
    const ballX = 92 + (themePreviewTick * 2.1) % Math.max(1, width - 184);
    const ballY = 118 + Math.sin(themePreviewTick / 13) * 13;
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = gameTheme.ball;
    ctx.beginPath();
    ctx.arc(ballX - 13, ballY + 3, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.shadowColor = gameTheme.ball;
    ctx.shadowBlur = 9;
    ctx.beginPath();
    ctx.arc(ballX, ballY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = gameTheme.paddle;
    ctx.shadowColor = gameTheme.accent;
    ctx.shadowBlur = 10;
    ctx.fillRect(Math.min(width - 96, Math.max(24, ballX - 32)), height - 26, 64, 7);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = `${gameTheme.accent}88`;
    ctx.strokeRect(8, 8, width - 16, height - 16);
    themePreviewTick += 1;
    if (themePreviewActive && !interfaceData.settings.reducedMotion) {
      themePreviewFrame = requestAnimationFrame(draw);
    }
  };
  if (themePreviewFrame) cancelAnimationFrame(themePreviewFrame);
  themePreviewFrame = 0;
  draw();
}

function stopThemePreview() {
  themePreviewActive = false;
  if (themePreviewFrame) cancelAnimationFrame(themePreviewFrame);
  themePreviewFrame = 0;
}

function showScreen(screenId) {
  for (const screen of document.querySelectorAll(".screen")) {
    screen.hidden = screen.id !== screenId;
    screen.classList.toggle("screen-active", !screen.hidden);
  }
  document.body.classList.toggle("in-game", screenId === "game-shell");
  document.getElementById("game-shell").hidden = screenId !== "game-shell";
  if (screenId === "main-menu") renderContinueButton();
  const activeScreen = document.getElementById(screenId);
  const focusTarget = activeScreen?.querySelector("[data-autofocus], button:not(:disabled), input, select");
  focusTarget?.focus({ preventScroll: true });
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
      level = Math.min(interfaceData.save.level, CAMPAIGN_LEVEL_COUNT);
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
  } else if (action === "themes") {
    openThemes("main-menu");
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
  button.textContent = canContinue ? `Continue · ${getModeName(interfaceData.save.mode)} · Level ${Math.min(interfaceData.save.level, CAMPAIGN_LEVEL_COUNT)}` : "Continue · No saved progress";
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
    campaign: "Ten handcrafted levels, evolving enemy tactics, and a final boss.",
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
      if (category === "theme") {
        selectTheme(select.value);
      } else {
        saveInterfaceData();
        applyCustomization();
      }
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
  return interfaceData.customization.theme === "custom" || interfaceData.customization[category] === "classic"
    ? gameTheme[category]
    : option?.color || gameTheme[category];
}

function applyCustomization() {
  const selectedTheme = interfaceData.customization.theme === "custom"
    ? interfaceData.customTheme
    : THEME_PRESETS[interfaceData.customization.theme] || THEME_PRESETS.crimson;
  setGameTheme(selectedTheme);
  document.body.dataset.trail = interfaceData.customization.trail;
  document.documentElement.style.setProperty("--ball-color", getCustomizationColor("ball"));
  document.documentElement.style.setProperty("--paddle-color", getCustomizationColor("paddle"));
  document.getElementById("sound-setting").checked = interfaceData.settings.sound;
  document.getElementById("music-setting").checked = interfaceData.settings.music;
  document.getElementById("camera-shake-setting").checked = interfaceData.settings.cameraShake;
  document.getElementById("motion-blur-setting").checked = interfaceData.settings.motionBlur;
  document.getElementById("grid-setting").checked = interfaceData.settings.animatedGrid;
  document.getElementById("motion-setting").checked = interfaceData.settings.reducedMotion;
  document.getElementById("colorblind-setting").checked = interfaceData.settings.colorblind;
  document.getElementById("effects-volume").value = interfaceData.settings.sfxVolume;
  document.getElementById("music-volume").value = interfaceData.settings.musicVolume;
  document.getElementById("effects-intensity").value = interfaceData.settings.effectsIntensity;
  document.getElementById("effects-volume-value").textContent = `${Math.round(interfaceData.settings.sfxVolume * 100)}%`;
  document.getElementById("music-volume-value").textContent = `${Math.round(interfaceData.settings.musicVolume * 100)}%`;
  document.getElementById("effects-intensity-value").textContent = `${Math.round(interfaceData.settings.effectsIntensity * 100)}%`;
  document.body.classList.toggle("colorblind-mode", interfaceData.settings.colorblind);
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
  document.getElementById("music-setting").checked = interfaceData.settings.music;
  document.getElementById("camera-shake-setting").checked = interfaceData.settings.cameraShake;
  document.getElementById("motion-blur-setting").checked = interfaceData.settings.motionBlur;
  document.getElementById("grid-setting").checked = interfaceData.settings.animatedGrid;
  document.getElementById("motion-setting").checked = interfaceData.settings.reducedMotion;
  document.getElementById("colorblind-setting").checked = interfaceData.settings.colorblind;
  document.getElementById("effects-volume").value = interfaceData.settings.sfxVolume;
  document.getElementById("music-volume").value = interfaceData.settings.musicVolume;
  document.getElementById("effects-intensity").value = interfaceData.settings.effectsIntensity;
  for (const [outputId, key] of [["effects-volume-value", "sfxVolume"], ["music-volume-value", "musicVolume"], ["effects-intensity-value", "effectsIntensity"]]) {
    const value = `${Math.round(interfaceData.settings[key] * 100)}%`;
    document.getElementById(outputId).value = value;
    document.getElementById(outputId).textContent = value;
  }
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
  document.getElementById("next-level-button").textContent = campaignComplete ? "10 Levels Cleared · Endless Unlocked" : `Next Level · ${nextLevel}`;
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
    const completedLevel = activeMode === "campaign" ? Math.min(CAMPAIGN_LEVEL_COUNT, level + 1) : level + 1;
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
      context.fillStyle = `${gameTheme.background}88`;
      context.fillRect(0, 0, canvas.width, canvas.height);
      requestAnimationFrame(drawBackground);
      return;
    }
    context.clearRect(0, 0, canvas.width, canvas.height);
    const gradient = context.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, gameTheme.background);
    gradient.addColorStop(1, gameTheme.surface);
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
      context.fillStyle = i % 2 ? gameTheme.accent : gameTheme.accentSecondary;
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
