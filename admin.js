const ADMIN_EATER_GLYPHS = ["0", "1", "X", "A", "?", "#"];
let adminColorDrain = 0;
let adminBorderDamage = 0;
let adminEatProgress = 0;
let adminEaterGlyphIndex = 0;

function resetAdminSandbox() {
  adminColorDrain = 0;
  adminBorderDamage = 0;
  adminEatProgress = 0;
  adminEaterGlyphIndex = 0;
  const tools = document.getElementById("admin-tools");
  if (tools) tools.hidden = activeMode !== "admin";
  const livesInput = document.getElementById("admin-lives");
  const obstacleInput = document.getElementById("admin-obstacles");
  const corruptionInput = document.getElementById("admin-corruption");
  if (livesInput) livesInput.value = String(lives);
  if (obstacleInput) obstacleInput.value = interfaceData.settings.obstacleDensity;
  if (corruptionInput) corruptionInput.checked = corruptionState.active;
}

function initializeAdminControls() {
  const rangeControls = [
    ["admin-enemy-scale", "admin-enemy-scale-value", (value) => `${Number(value).toFixed(1)}x`],
    ["admin-enemy-speed", "admin-enemy-speed-value", (value) => `${Number(value).toFixed(1)}x`],
    ["admin-eater-reach", "admin-eater-reach-value", (value) => `${value}px`]
  ];
  for (const [inputId, outputId, format] of rangeControls) {
    const input = document.getElementById(inputId);
    const output = document.getElementById(outputId);
    const update = () => { output.value = format(input.value); output.textContent = format(input.value); };
    input.addEventListener("input", update);
    update();
  }

  document.getElementById("admin-spawn-enemy").addEventListener("click", () => {
    spawnAdminEnemy(
      document.getElementById("admin-enemy-type").value,
      Number(document.getElementById("admin-enemy-scale").value),
      Number(document.getElementById("admin-enemy-speed").value),
      document.getElementById("admin-enemy-color").value,
      Number(document.getElementById("admin-eater-reach").value)
    );
  });
  document.getElementById("admin-spawn-powerup").addEventListener("click", () => {
    spawnAdminPowerup(document.getElementById("admin-powerup-type").value);
  });
  document.getElementById("admin-lives").addEventListener("change", (event) => {
    lives = Math.max(0, Math.min(99, Number(event.target.value) || 0));
    event.target.value = String(lives);
    if (lives > 0 && gameOver) {
      gameOver = false;
      started = false;
    }
    updateStatus();
  });
  document.getElementById("admin-obstacles").addEventListener("change", (event) => {
    interfaceData.settings.obstacleDensity = event.target.value;
  });
  document.getElementById("admin-corruption").addEventListener("change", (event) => {
    if (event.target.checked) {
      corruptionState.active = true;
      corruptionState.stage = CORRUPTION_STAGES.active;
      corruptionState.pressure = Math.max(0.35, corruptionState.pressure);
      corruptionState.timer = 3600;
    } else {
      resetCorruptionState();
    }
  });
  document.getElementById("admin-clear-enemies").addEventListener("click", () => {
    invaders = [];
  });
  document.getElementById("admin-restore-world").addEventListener("click", () => {
    adminBorderDamage = 0;
    adminEatProgress = 0;
    adminColorDrain = 0;
    bricks = makeBricks(level);
    invaders = [];
    clearTetrominoes();
    resetCorruptionState();
    fallingPowerUps = [];
    gameOver = false;
    lives = Math.max(1, lives);
    updateStatus();
  });
  document.getElementById("admin-reset-settings").addEventListener("click", resetAdminSettings);
}

function resetAdminSettings() {
  const defaults = [
    ["admin-enemy-type", "eater"],
    ["admin-enemy-scale", "1"],
    ["admin-enemy-speed", "1"],
    ["admin-enemy-color", "#c7ff4a"],
    ["admin-eater-reach", "100"],
    ["admin-powerup-type", "expand"]
  ];
  for (const [id, value] of defaults) document.getElementById(id).value = value;
  document.getElementById("admin-enemy-scale-value").textContent = "1.0x";
  document.getElementById("admin-enemy-speed-value").textContent = "1.0x";
  document.getElementById("admin-eater-reach-value").textContent = "100px";

  lives = getModeLives();
  document.getElementById("admin-lives").value = String(lives);
  interfaceData.settings.obstacleDensity = "low";
  document.getElementById("admin-obstacles").value = "low";
  document.getElementById("admin-corruption").checked = false;
  resetCorruptionState();
  if (gameOver) {
    gameOver = false;
    started = false;
  }
  updateStatus();
}

function spawnAdminEnemy(type, scale, speed, color, reach) {
  const width = (type === "boss" ? 76 : 30) * scale;
  const height = (type === "boss" ? 48 : 20) * scale;
  const enemy = {
    x: Math.max(12, Math.min(WIDTH - width - 12, Math.random() * (WIDTH - width))),
    y: 70 + Math.random() * 100,
    width,
    height,
    type,
    health: type === "boss" ? 12 : type === "tank" ? 3 : 1,
    maxHealth: type === "boss" ? 12 : type === "tank" ? 3 : 1,
    fireTimer: 0,
    phase: 1,
    intangible: false,
    adminSpeed: speed,
    adminColor: color,
    eatReach: reach,
    chewTick: 0,
    consumed: 0
  };
  invaders.push(enemy);
}

function spawnAdminPowerup(id) {
  const powerup = POWER_UPS.find((candidate) => candidate.id === id);
  if (!powerup) return;
  fallingPowerUps.push({ ...powerup, x: WIDTH / 2 - 12, y: 20, width: 24, height: 24, vy: 1.8 });
}

function getAdminEaterTargets(eater) {
  const targets = [
    ...bricks.map((item, index) => ({ item, list: bricks, index, kind: "brick" })),
    ...invaders.map((item, index) => ({ item, list: invaders, index, kind: "enemy" }))
      .filter(({ item }) => item !== eater && item.type !== "eater"),
    ...fallingTetrominoes.map((item, index) => ({ item, list: fallingTetrominoes, index, kind: "shape" })),
    ...fallingPowerUps.map((item, index) => ({ item, list: fallingPowerUps, index, kind: "powerup" }))
  ];
  if (corruptionState.active) {
    const boundary = getCorruptionBoundaryY();
    targets.push({ item: { x: 0, y: 0, width: WIDTH, height: boundary }, kind: "corruption" });
  }
  return targets
    .map((target) => ({ ...target, distance: Math.hypot(
      target.item.x + target.item.width / 2 - (eater.x + eater.width / 2),
      target.item.y + target.item.height / 2 - (eater.y + eater.height / 2)
    ) }))
    .filter((target) => target.distance < eater.eatReach + Math.max(eater.width, eater.height))
    .sort((first, second) => first.distance - second.distance);
}

function updateAdminEnemies() {
  if (activeMode !== "admin") return;
  adminColorDrain = Math.max(0, adminColorDrain - 0.0015);
  const eaters = invaders.filter((enemy) => enemy.type === "eater");
  for (const eater of eaters) {
    eater.chewTick += 1;
    const targets = getAdminEaterTargets(eater);
    if (targets.length) {
      const target = targets[0];
      const dx = target.item.x + target.item.width / 2 - (eater.x + eater.width / 2);
      const dy = target.item.y + target.item.height / 2 - (eater.y + eater.height / 2);
      const distance = Math.hypot(dx, dy);
      if (distance > 0) {
        eater.x += dx / distance * eater.adminSpeed * 1.4;
        eater.y += dy / distance * eater.adminSpeed * 1.4;
      }
      if (boxesTouch(eater, target.item)) {
        if (target.kind === "corruption") resetCorruptionState();
        else target.list.splice(target.index, 1);
        eater.consumed += 1;
        adminEaterGlyphIndex = (adminEaterGlyphIndex + 1) % ADMIN_EATER_GLYPHS.length;
        adminColorDrain = Math.min(1, adminColorDrain + 0.24);
        adminEatProgress = Math.min(100, adminEatProgress + (target.kind === "shape" ? 2 : 5));
        spawnParticles(eater.x + eater.width / 2, eater.y + eater.height / 2, eater.adminColor, 6, 1.5);
      }
      continue;
    }

    const edgeTarget = eater.x < WIDTH / 2 ? 18 : WIDTH - eater.width - 18;
    eater.x += Math.sign(edgeTarget - eater.x) * eater.adminSpeed;
    eater.y = Math.max(20, Math.min(HEIGHT - eater.height - 20, eater.y + Math.sin(eater.chewTick / 24) * 0.8));
    if (eater.x <= 20 || eater.x + eater.width >= WIDTH - 20) {
      if (eater.chewTick % 18 === 0) {
        adminBorderDamage = Math.min(100, adminBorderDamage + 1);
        adminEatProgress = Math.min(100, adminEatProgress + 0.12);
      }
    }
  }
}

function drawAdminEater(eater) {
  const centerX = eater.x + eater.width / 2;
  const centerY = eater.y + eater.height / 2;
  const pulse = 1 + Math.sin(eater.chewTick / 5) * 0.06;
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.scale(pulse, 1 / pulse);
  ctx.fillStyle = eater.adminColor || "#c7ff4a";
  ctx.shadowColor = ctx.fillStyle;
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.ellipse(0, 0, eater.width / 2, eater.height / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "#11150d";
  ctx.beginPath();
  ctx.ellipse(0, 4, eater.width * 0.3, eater.height * (0.18 + Math.abs(Math.sin(eater.chewTick / 4)) * 0.12), 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(-eater.width * 0.18, -eater.height * 0.12, Math.max(2, eater.width * 0.055), 0, Math.PI * 2);
  ctx.arc(eater.width * 0.18, -eater.height * 0.12, Math.max(2, eater.width * 0.055), 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#11150d";
  ctx.font = `bold ${Math.max(9, eater.height * 0.34)}px monospace`;
  ctx.textAlign = "center";
  ctx.fillText(ADMIN_EATER_GLYPHS[adminEaterGlyphIndex], 0, eater.height * 0.42);
  ctx.restore();
}

function drawAdminConsumption() {
  if (activeMode !== "admin") return;
  if (adminBorderDamage > 0) {
    const thickness = Math.min(24 + adminBorderDamage * 0.6, 100);
    ctx.fillStyle = "#030405";
    ctx.fillRect(0, 0, WIDTH, thickness);
    ctx.fillRect(0, HEIGHT - thickness, WIDTH, thickness);
    ctx.fillRect(0, 0, thickness, HEIGHT);
    ctx.fillRect(WIDTH - thickness, 0, thickness, HEIGHT);
    canvas.style.borderColor = adminBorderDamage > 15 ? "#030405" : "";
  } else {
    canvas.style.borderColor = "";
  }
  if (adminEatProgress >= 100) {
    ctx.fillStyle = "#030405";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "#c7ff4a";
    ctx.textAlign = "center";
    ctx.font = "bold 28px monospace";
    ctx.fillText("GAME CONSUMED", WIDTH / 2, HEIGHT / 2);
  }
}

function getAdminColorFilter() {
  return activeMode === "admin" && adminColorDrain > 0 ? `grayscale(${adminColorDrain})` : "none";
}