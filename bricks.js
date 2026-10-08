const BRICK_COLUMNS = 16;
const BRICK_ROWS = 3;
const BRICK_WIDTH = 34;
const BRICK_HEIGHT = 15;
const BRICK_GAP = 3;
const BRICKS_TOP = 390;
const BRICK_TYPES = ["normal", "armored", "explosive", "regenerating", "moving", "golden", "frozen", "portal", "indestructible", "chain"];
const BRICK_LAYOUTS = [
  ["0000111111000000", "0000111111000000", "0000000000000000"],
  ["0000011111100000", "0001111111111000", "0011000000001100"],
  ["1111111111111111", "0000111111110000", "0000001111000000"],
  ["1001100110011001", "0110011001100110", "1001100110011001"],
  ["1111111111111111", "1000000000000001", "1111111111111111"],
  ["1100000000000011", "0110000000000110", "0011000000001100"],
  ["1111111111111111", "0011001100110011", "0000110000110000"],
  ["1010101010101010", "0101010101010101", "1010101010101010"],
  ["1111000000001111", "0011111111111100", "1100000000000011"],
  ["1000000000000001", "0111111111111110", "0011111111111100"]
];
const INVADER_LAYOUTS = [
  ["0011111100", "0011111100", "0000000000"],
  ["0001111000", "0011111100", "0001111000"],
  ["1110000111", "0111001110", "0011111100"],
  ["1010101010", "0101010101", "1010101010"],
  ["0000110000", "0011111100", "0111111110"],
  ["1110011111", "1100011101", "1000000101"],
  ["1000000001", "0110000110", "0011111100"],
  ["1111111111", "0001101100", "1111111111"],
  ["1001100110", "0110011001", "1010101010"],
  ["0011111100", "0111111110", "1111111111"]
];

function makeBricks(level = 1, seed = 0) {
  const list = [];
  const layoutOffset = seed ? seed % BRICK_LAYOUTS.length : Math.max(0, level - 1);
  const layout = BRICK_LAYOUTS[layoutOffset % BRICK_LAYOUTS.length];
  const totalWidth = BRICK_COLUMNS * BRICK_WIDTH + (BRICK_COLUMNS - 1) * BRICK_GAP;
  const left = (WIDTH - totalWidth) / 2;

  for (let row = 0; row < BRICK_ROWS; row += 1) {
    for (let col = 0; col < BRICK_COLUMNS; col += 1) {
      if (layout[row][col] === "1") {
        const slot = row * BRICK_COLUMNS + col + (seed ? seed % BRICK_TYPES.length : level - 1);
        const type = activeMode === "campaign"
          ? getCampaignBrickType(level, slot)
          : seed
            ? BRICK_TYPES[(Math.imul(slot + 1, 31) + (seed >>> 8)) % BRICK_TYPES.length]
            : BRICK_TYPES[(slot) % BRICK_TYPES.length];
        const health = type === "armored" ? 3 : type === "regenerating" ? 2 : 1;
        list.push({
          x: left + col * (BRICK_WIDTH + BRICK_GAP),
          y: BRICKS_TOP + row * (BRICK_HEIGHT + BRICK_GAP),
          width: BRICK_WIDTH,
          height: BRICK_HEIGHT,
          type,
          health,
          maxHealth: health,
          moveDirection: col % 2 === 0 ? 1 : -1,
          regenTimer: 0,
          portalCooldown: 0,
          chainId: `${row}-${Math.floor(col / 2)}`
        });
      }
    }
  }

  for (const brick of list.filter((candidate) => candidate.type === "chain")) {
    const neighbor = list.find((candidate) => candidate !== brick &&
      candidate.y === brick.y &&
      candidate.type === "normal" &&
      Math.abs(candidate.x - brick.x) <= BRICK_WIDTH + BRICK_GAP);
    if (neighbor) {
      neighbor.type = "chain";
      neighbor.health = 1;
      neighbor.maxHealth = 1;
      neighbor.chainId = brick.chainId;
    }
  }

  return list;
}

function drawBricks() {
  const colorblind = document.body.classList.contains("colorblind-mode");
  const symbols = { normal: "N", armored: "A", explosive: "E", regenerating: "R", moving: "M", golden: "G", frozen: "F", portal: "P", indestructible: "X", chain: "C" };
  for (const brick of bricks) {
    const colors = {
      normal: gameTheme.brick,
      armored: gameTheme.accentSecondary,
      explosive: gameTheme.accent,
      regenerating: gameTheme.accentTertiary,
      moving: gameTheme.accentSecondary,
      golden: gameTheme.text,
      frozen: gameTheme.accentTertiary,
      portal: gameTheme.accentSecondary,
      indestructible: gameTheme.surface,
      chain: gameTheme.accentTertiary
    };
    ctx.fillStyle = colors[brick.type] || "white";
    ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
    if (brick.type === "armored") {
      ctx.fillStyle = gameTheme.background;
      ctx.fillRect(brick.x + 3, brick.y + 3, brick.width - 6, 2);
      ctx.fillRect(brick.x + 3, brick.y + 9, brick.width - 6, 2);
    } else if (brick.type === "explosive") {
      ctx.fillStyle = gameTheme.text;
      ctx.fillRect(brick.x + brick.width / 2 - 1, brick.y + 3, 2, brick.height - 6);
      ctx.fillRect(brick.x + 7, brick.y + brick.height / 2 - 1, brick.width - 14, 2);
    } else if (brick.type === "regenerating") {
      ctx.fillStyle = gameTheme.background;
      ctx.fillRect(brick.x + 5, brick.y + 5, brick.width - 10, 5);
    } else if (brick.type === "golden") {
      ctx.strokeStyle = gameTheme.text;
      ctx.strokeRect(brick.x + 4, brick.y + 3, brick.width - 8, brick.height - 6);
    } else if (brick.type === "portal") {
      ctx.strokeStyle = gameTheme.text;
      ctx.beginPath();
      ctx.ellipse(brick.x + brick.width / 2, brick.y + brick.height / 2, 6, 5, 0, 0, Math.PI * 2);
      ctx.stroke();
    } else if (brick.type === "indestructible") {
      ctx.fillStyle = gameTheme.background;
      ctx.fillRect(brick.x + 5, brick.y + 5, brick.width - 10, 5);
    } else if (brick.type === "chain") {
      ctx.fillStyle = gameTheme.background;
      ctx.fillRect(brick.x + 3, brick.y + 6, brick.width - 6, 3);
    } else if (brick.type === "frozen") {
      ctx.fillStyle = gameTheme.text;
      ctx.fillRect(brick.x + brick.width / 2 - 1, brick.y + 3, 2, brick.height - 6);
      ctx.fillRect(brick.x + 9, brick.y + brick.height / 2 - 1, brick.width - 18, 2);
    }
    if (colorblind) {
      ctx.strokeStyle = gameTheme.text;
      ctx.lineWidth = 1.5;
      ctx.setLineDash(brick.type === "armored" || brick.type === "indestructible" ? [2, 1] : []);
      ctx.strokeRect(brick.x + 1, brick.y + 1, brick.width - 2, brick.height - 2);
      ctx.setLineDash([]);
      ctx.fillStyle = gameTheme.background;
      ctx.font = "bold 8px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(symbols[brick.type], brick.x + brick.width / 2, brick.y + brick.height / 2);
    }
    if (brick.health < brick.maxHealth) {
      ctx.fillStyle = gameTheme.text;
      ctx.fillRect(brick.x + 2, brick.y + brick.height - 3, (brick.width - 4) * brick.health / brick.maxHealth, 2);
      ctx.strokeStyle = `${gameTheme.background}cc`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(brick.x + brick.width * 0.34, brick.y + 2);
      ctx.lineTo(brick.x + brick.width * 0.45, brick.y + brick.height * 0.48);
      ctx.lineTo(brick.x + brick.width * 0.38, brick.y + brick.height - 4);
      ctx.stroke();
      if (brick.health < brick.maxHealth - 1) {
        ctx.beginPath();
        ctx.moveTo(brick.x + brick.width * 0.7, brick.y + 3);
        ctx.lineTo(brick.x + brick.width * 0.58, brick.y + brick.height * 0.58);
        ctx.stroke();
      }
    }
  }
}

function makeInvaders(level = 1, seed = 0) {
  const list = [];
  const layoutOffset = seed ? seed % INVADER_LAYOUTS.length : level - 1;
  const layout = INVADER_LAYOUTS[layoutOffset % INVADER_LAYOUTS.length];
  const formationWidth = INVADER_COLUMNS * INVADER_WIDTH + (INVADER_COLUMNS - 1) * INVADER_GAP_X;
  const left = (WIDTH - formationWidth) / 2;

  for (let row = 0; row < INVADER_ROWS; row += 1) {
    for (let col = 0; col < INVADER_COLUMNS; col += 1) {
      if (layout[row][col] !== "1") {
        continue;
      }
      list.push({
        x: left + col * (INVADER_WIDTH + INVADER_GAP_X),
        y: 52 + row * (INVADER_HEIGHT + INVADER_GAP_Y),
        width: INVADER_WIDTH,
        height: INVADER_HEIGHT,
        type: activeMode === "campaign" ? getCampaignInvaderType(level, row * INVADER_COLUMNS + col) :
          ((row * INVADER_COLUMNS + col + (seed ? seed % 30 : level)) % 11 === 0 && level >= 2) ? "shield-generator" :
          (row * INVADER_COLUMNS + col + (seed ? seed % 30 : level)) % 13 === 0 ? "splitter" :
          (row * INVADER_COLUMNS + col + (seed ? seed % 30 : level)) % 9 === 0 ? "phantom" :
          (row * INVADER_COLUMNS + col + (seed ? seed % 30 : level)) % 7 === 0 ? "sniper" :
          (row * INVADER_COLUMNS + col + (seed ? seed % 30 : level)) % 5 === 0 ? "tank" :
          (row * INVADER_COLUMNS + col + (seed ? seed % 30 : level)) % 3 === 0 ? "scout" : "standard",
        health: 1,
        fireTimer: 0,
        phase: 1,
        intangible: false
      });
      const invader = list[list.length - 1];
      if (invader.type === "tank") invader.health = 3;
      if (invader.type === "shield-generator") invader.health = 2;
      if (invader.type === "boss") {
        invader.width = 54;
        invader.height = 36;
        invader.health = 16;
        invader.phase = 1;
      }
    }
  }

  return list;
}

function getCampaignInvaderType(levelNumber, slot) {
  const types = [
    ["standard"],
    ["scout", "standard", "standard"],
    ["tank", "standard", "scout"],
    ["sniper", "standard", "scout"],
    ["tank", "standard", "scout"],
    ["splitter", "scout", "standard"],
    ["phantom", "standard", "sniper"],
    ["tank", "shield-generator", "scout", "standard"],
    ["phantom", "sniper", "splitter", "tank", "scout"],
    ["standard"]
  ];
  const levelTypes = types[Math.min(Math.max(0, levelNumber - 1), types.length - 1)];
  return levelTypes[slot % levelTypes.length];
}