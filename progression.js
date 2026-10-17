const ASCENSION_BRANCHES = [
  { id: "ballistics", name: "Ballistics", symbol: "◇", color: "#ff5964", theme: "Ball speed, control and ricochets", names: ["Velocity", "Vector Control", "Ricochet Theory", "Split Trajectory", "Kinetic Drive"], effect: "ballSpeed" },
  { id: "paddle", name: "Paddle Engineering", symbol: "╋", color: "#ff9b54", theme: "Paddle response and precision", names: ["Servo Response", "Edge Calibration", "Rail Drive", "Catch Matrix", "Deflection Field"], effect: "paddleControl" },
  { id: "aliens", name: "Alien Intelligence", symbol: "⌘", color: "#b7e36b", theme: "Invader rewards and formation pressure", names: ["Xeno Archive", "Pattern Reader", "Breach Protocol", "Hunter's Mark", "Swarm Logic"], effect: "reward" },
  { id: "bosses", name: "Boss Technology", symbol: "⬡", color: "#ff6b9a", theme: "Boss damage and phase mastery", names: ["Armor Mapping", "Phase Breaker", "Core Resonance", "Weakpoint Lens", "Overload Pulse"], effect: "damage" },
  { id: "tetris", name: "Tetris Matrix", symbol: "▦", color: "#53d8c4", theme: "Formation ricochets and obstacle pressure", names: ["Shape Memory", "Corner Theory", "Cascade Echo", "Falling Lattice", "Prism Rebound"], effect: "ricochet" },
  { id: "corruption", name: "Corruption Protocol", symbol: "⌁", color: "#c184ff", theme: "Corruption repair and event intensity", names: ["Spore Scanner", "Repair Thread", "Signal Purge", "Living Firewall", "Entropy Lock"], effect: "repair" },
  { id: "rival", name: "Rival AI Network", symbol: "⟷", color: "#5eb7ff", theme: "Rival rewards and prediction pressure", names: ["Mirror Trace", "Opponent Model", "Counterline", "Adaptive Read", "Rival Bait"], effect: "rivalReward" },
  { id: "economy", name: "Economy Grid", symbol: "▤", color: "#ffd166", theme: "Credit generation and tougher objectives", names: ["Salvage Ledger", "Combo Dividend", "Target Bounty", "Risk Reserve", "Compound Yield"], effect: "credits" },
  { id: "powers", name: "Power Systems", symbol: "ϟ", color: "#79aaff", theme: "Ability charge and countermeasures", names: ["Capacitor Bank", "Pulse Tuning", "Overdrive Coil", "Time Dilation", "Surge Relay"], effect: "ability" },
  { id: "arena", name: "Arena Engineering", symbol: "⊞", color: "#65df9b", theme: "Arena physics and layout mastery", names: ["Boundary Geometry", "Portal Lens", "Bumper Logic", "Phase Anchor", "Vector Chamber"], effect: "arena" },
  { id: "chaos", name: "Chaos Engine", symbol: "※", color: "#ff7c45", theme: "Chaos rewards and simultaneous hazards", names: ["Event Scanner", "Entropy Dividend", "Storm Chaser", "Rule Breaker", "Critical Mass"], effect: "chaos" },
  { id: "ascension", name: "Ascension Core", symbol: "✳", color: "#f5e6ad", theme: "Late-cycle trials and permanent growth", names: ["Cycle Seed", "Gatekeeper", "Shardsmith", "Singularity Key", "Final Vector"], effect: "ascension" }
];

const ASCENSION_SECTORS = ["Crimson", "Helix", "Obsidian", "Ion", "Parallax", "Vesper", "Eventide", "Quasar", "Nexus", "Ascendant"];
const ASCENSION_HARD_CAP = Number.MAX_SAFE_INTEGER;

function hashSeed(value) {
  let hash = 2166136261;
  for (const character of String(value)) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function safeUpgradeCost(baseCost, multiplier, level, tier) {
  const logarithm = Math.log(baseCost) + level * Math.log(multiplier) + (tier - 1) * Math.log(1.12);
  if (!Number.isFinite(logarithm) || logarithm >= Math.log(ASCENSION_HARD_CAP)) return ASCENSION_HARD_CAP;
  return Math.max(1, Math.ceil(Math.exp(logarithm)));
}

function buildAscensionDefinitions(seed = "vector-break-ascension-v1", prestige = 0) {
  const nodes = [];
  const seedValue = hashSeed(`${seed}:${prestige}`);
  for (const [branchIndex, branch] of ASCENSION_BRANCHES.entries()) {
    for (let index = 0; index < 25; index += 1) {
      const tier = index + 1;
      const sector = Math.min(10, Math.floor(index * 10 / 25) + 1);
      const previousId = index > 0 ? `${branch.id}-${index}` : null;
      const sectorEnd = Math.ceil(sector * 2.5) - 1;
      const value = 0.004 + ((seedValue + branchIndex * 17 + tier * 13) % 4) * 0.001;
      nodes.push({
        id: `${branch.id}-${tier}`,
        name: `${branch.names[index % branch.names.length]} ${tier > branch.names.length ? `· ${tier}` : ""}`.trim(),
        description: `${branch.theme}. Stronger vectors also provoke a more adaptive arena.`,
        branch: branch.id,
        sector,
        tier,
        level: 0,
        maxLevel: 5,
        baseCost: 100,
        costMultiplier: 1.75 + Math.min(0.25, prestige * 0.01),
        upgradeType: branch.effect,
        powerExponent: 0.82,
        playerBenefit: value,
        threatIncrease: Math.max(1, Math.ceil(tier / 5)),
        prerequisites: previousId ? [{ id: previousId, level: 5 }] : [],
        unlocked: !previousId,
        purchased: false,
        generationSeed: (seedValue ^ Math.imul(branchIndex + 1, 2654435761) ^ Math.imul(tier, 2246822519)) >>> 0,
        rarity: tier % 10 === 0 ? "rare" : tier % 5 === 0 ? "uncommon" : "common",
        childNodeIds: [],
        specialEffects: [branch.effect],
        prestigePersistence: "reset",
        sectorCapstone: tier === sectorEnd + 1
      });
    }
  }

  for (let sector = 1; sector <= 10; sector += 1) {
    const left = ASCENSION_BRANCHES[(sector - 1) % ASCENSION_BRANCHES.length];
    const right = ASCENSION_BRANCHES[(sector + 5) % ASCENSION_BRANCHES.length];
    const tier = Math.ceil(sector * 2.5);
    nodes.push({
      id: `synergy-${sector}`,
      name: `${left.name.split(" ")[0]} × ${right.name.split(" ")[0]} Link`,
      description: `A cross-branch resonance joining ${left.theme.toLowerCase()} with ${right.theme.toLowerCase()}.`,
      branch: left.id,
      sector,
      tier,
      level: 0,
      maxLevel: 1,
      baseCost: 900 + sector * 250,
      costMultiplier: 2.1,
      upgradeType: "synergy",
      powerExponent: 0.75,
      playerBenefit: 0.015,
      threatIncrease: sector + 2,
      prerequisites: [{ id: `${left.id}-${tier}`, level: 1 }, { id: `${right.id}-${tier}`, level: 1 }],
      unlocked: false,
      purchased: false,
      generationSeed: (seedValue ^ Math.imul(sector, 3266489917)) >>> 0,
      rarity: sector === 10 ? "legendary" : "rare",
      childNodeIds: [],
      specialEffects: [left.effect, right.effect],
      prestigePersistence: "reset",
      hidden: sector === 7
    });
  }

  nodes.push({
    id: "ascension-gate",
    name: "The Ascension Gate",
    description: "Requires all ten sector capstones and verified completion of the final campaign and duel objectives.",
    branch: "ascension",
    sector: 10,
    tier: 26,
    level: 0,
    maxLevel: 1,
    baseCost: 1000000,
    costMultiplier: 2,
    upgradeType: "gate",
    powerExponent: 1,
    playerBenefit: 0,
    threatIncrease: 10,
    prerequisites: [],
    unlocked: false,
    purchased: false,
    generationSeed: (seedValue ^ 0x9e3779b9) >>> 0,
    rarity: "ascended",
    childNodeIds: [],
    specialEffects: ["final-trial"],
    prestigePersistence: "reset",
    gate: true
  });

  const byId = new Map(nodes.map((node) => [node.id, node]));
  for (const node of nodes) {
    for (const prerequisite of node.prerequisites) byId.get(prerequisite.id)?.childNodeIds.push(node.id);
  }
  return nodes;
}

function normalizeAscensionState(candidate = {}) {
  const seed = typeof candidate.seed === "string" && candidate.seed.length <= 80 ? candidate.seed : "vector-break-ascension-v1";
  const prestige = Number.isSafeInteger(candidate.prestige) && candidate.prestige >= 0 ? candidate.prestige : 0;
  const definitions = buildAscensionDefinitions(seed, prestige);
  const validIds = new Set(definitions.map((node) => node.id));
  const levels = {};
  if (candidate.levels && typeof candidate.levels === "object" && !Array.isArray(candidate.levels)) {
    for (const [id, value] of Object.entries(candidate.levels)) {
      if (validIds.has(id) && Number.isInteger(value) && value > 0) {
        const definition = definitions.find((node) => node.id === id);
        levels[id] = Math.min(definition.maxLevel, value);
      }
    }
  }
  const finiteInteger = (value, fallback = 0) => Number.isSafeInteger(value) && value >= 0 ? value : fallback;
  return {
    version: 1,
    seed,
    credits: Math.min(ASCENSION_HARD_CAP, finiteInteger(candidate.credits, 100)),
    shards: finiteInteger(candidate.shards),
    levels,
    threatRating: finiteInteger(candidate.threatRating),
    sector: Math.min(10, Math.max(1, finiteInteger(candidate.sector, 1))),
    prestige,
    completion: {
      sectorCapstones: Array.isArray(candidate.completion?.sectorCapstones)
        ? [...new Set(candidate.completion.sectorCapstones.filter((value) => Number.isInteger(value) && value >= 1 && value <= 10))]
        : [],
      campaignComplete: candidate.completion?.campaignComplete === true,
      finalBossDefeated: candidate.completion?.finalBossDefeated === true,
      finalRivalDefeated: candidate.completion?.finalRivalDefeated === true
    }
  };
}

function isAscensionNodeUnlocked(node, state) {
  if (node.gate) {
    const completion = state.completion;
    return completion.sectorCapstones.length === 10 && completion.campaignComplete && completion.finalBossDefeated && completion.finalRivalDefeated;
  }
  return node.prerequisites.every(({ id, level }) => (state.levels[id] || 0) >= level);
}

var UpgradeManager = {
  branches: ASCENSION_BRANCHES,
  generate: buildAscensionDefinitions,
  createState(seed, prestige = 0) {
    return normalizeAscensionState({ seed: seed || "vector-break-ascension-v1", prestige, credits: 100 });
  },
  normalize: normalizeAscensionState,
  definitions(state) {
    return buildAscensionDefinitions(state.seed, state.prestige);
  },
  cost(node, level = 0) {
    return safeUpgradeCost(node.baseCost, node.costMultiplier, level, node.tier);
  },
  purchase(stateInput, nodeId) {
    const state = normalizeAscensionState(stateInput);
    const node = buildAscensionDefinitions(state.seed, state.prestige).find((entry) => entry.id === nodeId);
    if (!node) return { ok: false, reason: "unknown-node", state };
    const level = state.levels[nodeId] || 0;
    if (level >= node.maxLevel) return { ok: false, reason: "max-level", state };
    if (!isAscensionNodeUnlocked(node, state)) return { ok: false, reason: "prerequisites", state };
    const cost = this.cost(node, level);
    if (state.credits < cost) return { ok: false, reason: "credits", state, cost };
    state.credits -= cost;
    state.levels[nodeId] = level + 1;
    state.threatRating = Math.min(ASCENSION_HARD_CAP, state.threatRating + node.threatIncrease);
    state.sector = Math.max(state.sector, node.sector);
    return { ok: true, state, node, cost, previousThreat: state.threatRating - node.threatIncrease };
  },
  modifiers(stateInput) {
    const state = normalizeAscensionState(stateInput);
    let ballSpeed = 0;
    let paddleControl = 0;
    let reward = 0;
    for (const node of buildAscensionDefinitions(state.seed, state.prestige)) {
      const level = state.levels[node.id] || 0;
      if (!level) continue;
      const value = node.playerBenefit * Math.pow(level, node.powerExponent);
      if (node.upgradeType === "ballSpeed") ballSpeed += value;
      if (node.upgradeType === "paddleControl") paddleControl += value;
      if (["reward", "credits", "rivalReward", "chaos", "ascension", "synergy"].includes(node.upgradeType)) reward += value;
    }
    const threat = state.threatRating;
    return {
      ballSpeedMultiplier: 1 + Math.min(0.35, ballSpeed),
      paddleControl: Math.min(0.25, paddleControl),
      rewardMultiplier: 1 + Math.min(0.5, reward),
      enemySpeedMultiplier: 1 + Math.min(0.35, threat * 0.002),
      projectilePressureMultiplier: 1 + Math.min(0.5, threat * 0.003)
    };
  },
  awardCredits(stateInput, amount) {
    const state = normalizeAscensionState(stateInput);
    if (!Number.isFinite(amount) || amount <= 0) return state;
    state.credits = Math.min(ASCENSION_HARD_CAP, state.credits + Math.floor(amount));
    return state;
  }
};

function getProgressionModifiers() {
  return typeof interfaceData !== "undefined" && interfaceData.progression
    ? UpgradeManager.modifiers(interfaceData.progression)
    : UpgradeManager.modifiers(UpgradeManager.createState());
}

function awardProgressionCredits(amount) {
  if (typeof interfaceData === "undefined" || !interfaceData.progression) return;
  interfaceData.progression = UpgradeManager.awardCredits(interfaceData.progression, amount);
  if (typeof saveInterfaceData === "function") saveInterfaceData();
}