const GALAGA_ORIGINAL_ENEMIES = [
  {
    variant: "zako",
    label: "Zako",
    category: "original",
    family: "grunt",
    health: 1,
    speed: 0.9,
    score: 100,
    palette: { body: "#f7b267", accent: "#ffd166", wing: "#ff7f50" }
  },
  {
    variant: "guard",
    label: "Guard",
    category: "original",
    family: "guard",
    health: 2,
    speed: 1.1,
    score: 140,
    palette: { body: "#ff9f1c", accent: "#ffe66d", wing: "#f94144" }
  },
  {
    variant: "boss-galaga",
    label: "Boss Galaga",
    category: "original",
    family: "boss",
    health: 8,
    speed: 0.7,
    score: 320,
    palette: { body: "#ff6b6b", accent: "#ffb703", wing: "#d90429" }
  },
  {
    variant: "sasori",
    label: "Sasori",
    category: "original",
    family: "scout",
    health: 1,
    speed: 1.45,
    score: 160,
    palette: { body: "#2ec4b6", accent: "#cbf3f0", wing: "#0f4c5c" }
  },
  {
    variant: "midori",
    label: "Midori",
    category: "original",
    family: "scout",
    health: 2,
    speed: 1.3,
    score: 175,
    palette: { body: "#90be6d", accent: "#d9ed92", wing: "#2a9d8f" }
  },
  {
    variant: "galaxian-flagship",
    label: "Galaxian Flagship",
    category: "original",
    family: "flagship",
    health: 5,
    speed: 0.95,
    score: 260,
    palette: { body: "#e0aaff", accent: "#f1c0e8", wing: "#7b2cbf" }
  },
  {
    variant: "tonbo",
    label: "Tonbo",
    category: "original",
    family: "scout",
    health: 2,
    speed: 1.55,
    score: 180,
    palette: { body: "#74c69d", accent: "#cfe1b9", wing: "#2d6a4f" }
  },
  {
    variant: "momiji",
    label: "Momiji",
    category: "original",
    family: "guard",
    health: 2,
    speed: 1.2,
    score: 200,
    palette: { body: "#f28482", accent: "#f6bd60", wing: "#c1121f" }
  },
  {
    variant: "bonus-enterprise",
    label: "Bonus Enterprise",
    category: "original",
    family: "bonus",
    health: 2,
    speed: 1.35,
    score: 240,
    palette: { body: "#a2d2ff", accent: "#dfe7fd", wing: "#4361ee" }
  }
];

const GALAGA_88_VARIANTS = [
  { variant: "babbit", label: "Babbit", category: "galaga-88", family: "grunt", health: 2, speed: 1.15, score: 120, palette: { body: "#ffe8d6", accent: "#ffb4a2", wing: "#e76f51" } },
  { variant: "bee", label: "Bee", category: "galaga-88", family: "grunt", health: 2, speed: 1.25, score: 130, palette: { body: "#f4d35e", accent: "#fdf2d7", wing: "#c77dff" } },
  { variant: "choucho", label: "Choucho", category: "galaga-88", family: "scout", health: 2, speed: 1.4, score: 150, palette: { body: "#bde0fe", accent: "#e9ecef", wing: "#5e548e" } },
  { variant: "daruma", label: "Daruma", category: "galaga-88", family: "guard", health: 3, speed: 1.05, score: 170, palette: { body: "#ffb703", accent: "#fb8500", wing: "#9d4edd" } },
  { variant: "dokuro", label: "Dokuro", category: "galaga-88", family: "guard", health: 3, speed: 1.1, score: 180, palette: { body: "#d9d9d9", accent: "#f5f3f4", wing: "#4f5d75" } },
  { variant: "don", label: "Don", category: "galaga-88", family: "grunt", health: 2, speed: 1.2, score: 125, palette: { body: "#ffafcc", accent: "#ffc8dd", wing: "#ff006e" } },
  { variant: "ga", label: "Ga", category: "galaga-88", family: "grunt", health: 1, speed: 1.3, score: 115, palette: { body: "#90dbf4", accent: "#d9f99d", wing: "#00b4d8" } },
  { variant: "galaxian", label: "Galaxian", category: "galaga-88", family: "flagship", health: 4, speed: 0.85, score: 280, palette: { body: "#cdb4db", accent: "#ffd6a5", wing: "#8338ec" } },
  { variant: "hae", label: "Hae", category: "galaga-88", family: "scout", health: 2, speed: 1.4, score: 155, palette: { body: "#8ecae6", accent: "#caf0f8", wing: "#0077b6" } },
  { variant: "hamburger", label: "Hamburger", category: "galaga-88", family: "bonus", health: 3, speed: 1.2, score: 240, palette: { body: "#ff9f1c", accent: "#fefae0", wing: "#e63946" } },
  { variant: "hitode", label: "Hitode", category: "galaga-88", family: "scout", health: 2, speed: 1.5, score: 160, palette: { body: "#7bdff2", accent: "#e2fbff", wing: "#3a86ff" } },
  { variant: "hiyoko", label: "Hiyoko", category: "galaga-88", family: "grunt", health: 2, speed: 1.1, score: 120, palette: { body: "#f7d6e0", accent: "#fff1e6", wing: "#ef476f" } },
  { variant: "kurage", label: "Kurage", category: "galaga-88", family: "guard", health: 3, speed: 1.0, score: 175, palette: { body: "#b8f2e6", accent: "#d8f3dc", wing: "#2a9d8f" } },
  { variant: "nin", label: "Nin", category: "galaga-88", family: "guard", health: 2, speed: 1.25, score: 145, palette: { body: "#bdb2ff", accent: "#ede7f6", wing: "#6d597a" } },
  { variant: "pan", label: "Pan", category: "galaga-88", family: "bonus", health: 2, speed: 1.35, score: 210, palette: { body: "#f9c74f", accent: "#fff3b0", wing: "#f9844a" } },
  { variant: "taco", label: "Taco", category: "galaga-88", family: "grunt", health: 2, speed: 1.28, score: 135, palette: { body: "#a7f3d0", accent: "#ecfeff", wing: "#34a0a4" } },
  { variant: "zou", label: "Zou", category: "galaga-88", family: "boss", health: 5, speed: 0.9, score: 260, palette: { body: "#f9dcc4", accent: "#ffe0b5", wing: "#f94144" } }
];

const GALAGA_REGISTRY = [...GALAGA_ORIGINAL_ENEMIES, ...GALAGA_88_VARIANTS];

function getGalagaEnemyDefinition(type) {
  const target = String(type || "").trim().toLowerCase();
  if (!target) return GALAGA_ORIGINAL_ENEMIES[0];
  return GALAGA_REGISTRY.find((entry) => {
    const variant = String(entry.variant || "").toLowerCase();
    const label = String(entry.label || "").toLowerCase();
    const family = String(entry.family || "").toLowerCase();
    return variant === target || label === target || family === target;
  }) || GALAGA_ORIGINAL_ENEMIES[0];
}

function createGalagaInvader(definition, x, y, order = 0) {
  const resolved = definition || GALAGA_ORIGINAL_ENEMIES[0];
  return {
    x,
    y,
    width: 26,
    height: 20,
    type: resolved.family || "scout",
    variant: resolved.variant,
    galaga: true,
    galagaCategory: resolved.category,
    health: resolved.health || 1,
    maxHealth: resolved.health || 1,
    fireTimer: 0,
    phase: 1,
    intangible: false,
    galagaPhase: order * 0.8,
    galagaDrift: Math.random() * Math.PI * 2,
    scoreValue: resolved.score || 100,
    palette: resolved.palette || { body: "#ffffff", accent: "#cfe8ff", wing: "#6baed6" }
  };
}

function createGalagaWave(level = 1, seed = 0) {
  const roster = level >= 8 ? GALAGA_REGISTRY : GALAGA_ORIGINAL_ENEMIES;
  const list = [];
  const patternRows = Math.min(3, Math.max(2, Math.floor(level / 3) + 2));
  const patternColumns = 3 + Math.min(3, Math.floor(level / 4));
  const left = (WIDTH - (patternColumns * (INVADER_WIDTH + INVADER_GAP_X)) + INVADER_GAP_X) / 2;

  for (let row = 0; row < patternRows; row += 1) {
    for (let column = 0; column < patternColumns; column += 1) {
      const index = (seed + row * patternColumns + column + level) % roster.length;
      const definition = roster[index];
      const x = left + column * (INVADER_WIDTH + INVADER_GAP_X) + (row % 2 === 0 ? 8 : -4);
      const y = 48 + row * (INVADER_HEIGHT + INVADER_GAP_Y) + (column % 2 === 0 ? 6 : -2);
      list.push(createGalagaInvader(definition, x, y, row + column));
    }
  }

  return list;
}

function buildGalagaSpawnQueue(level = 1, seed = 0) {
  const list = [];
  if (level < 3) return list;
  const additional = Math.min(6, Math.max(2, Math.floor(level / 2)));
  for (let index = 0; index < additional; index += 1) {
    const roster = level >= 8 ? GALAGA_REGISTRY : GALAGA_ORIGINAL_ENEMIES;
    const definition = roster[(index + level + seed) % roster.length];
    list.push(createGalagaInvader(definition, 90 + index * 110, 82 + (index % 2) * 26, index));
  }
  return list;
}

function drawGalagaEnemy(invader) {
  const definition = getGalagaEnemyDefinition(invader.variant);
  const palette = invader.palette || definition.palette || { body: gameTheme.enemy, accent: gameTheme.accentSecondary, wing: gameTheme.accent };
  const bob = interfaceData && !interfaceData.settings.reducedMotion ? Math.sin(movingTick / 10 + invader.galagaPhase) * 1.3 : 0;

  ctx.save();
  ctx.translate(invader.x + invader.width / 2, invader.y + invader.height / 2 + bob);
  ctx.fillStyle = invader.flashTimer > 0 ? "#ffffff" : palette.body || gameTheme.enemy;
  ctx.strokeStyle = palette.accent || gameTheme.accentSecondary;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  if (definition.family === "boss" || definition.variant === "galaxian-flagship" || definition.variant === "zou" || definition.variant === "boss-galaga") {
    ctx.moveTo(-14, 7);
    ctx.lineTo(-8, -9);
    ctx.lineTo(0, -15);
    ctx.lineTo(8, -9);
    ctx.lineTo(14, 7);
    ctx.lineTo(7, 12);
    ctx.lineTo(-7, 12);
    ctx.closePath();
  } else if (definition.family === "bonus") {
    ctx.moveTo(-12, 0);
    ctx.lineTo(-5, -10);
    ctx.lineTo(0, -4);
    ctx.lineTo(5, -10);
    ctx.lineTo(12, 0);
    ctx.lineTo(8, 10);
    ctx.lineTo(-8, 10);
    ctx.closePath();
  } else {
    ctx.moveTo(-12, 3);
    ctx.lineTo(-8, -8);
    ctx.lineTo(0, -12);
    ctx.lineTo(8, -8);
    ctx.lineTo(12, 3);
    ctx.lineTo(7, 11);
    ctx.lineTo(-7, 11);
    ctx.closePath();
  }
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = palette.wing || palette.accent || gameTheme.accentSecondary;
  ctx.beginPath();
  ctx.moveTo(-14, 0);
  ctx.lineTo(-20, 9);
  ctx.lineTo(-9, 6);
  ctx.closePath();
  ctx.moveTo(14, 0);
  ctx.lineTo(20, 9);
  ctx.lineTo(9, 6);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = gameTheme.background;
  ctx.fillRect(-4, -2, 3, 3);
  ctx.fillRect(1, -2, 3, 3);
  ctx.restore();
}
