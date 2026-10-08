const POWER_UPS = [
  { id: "expand", name: "Expand", color: "#4de3ff", shape: "wide", duration: 600, weight: 10 },
  { id: "multiball", name: "Multiball", color: "#ff6b6b", shape: "triple", duration: 0, weight: 8 },
  { id: "magnet", name: "Magnet", color: "#ff69b4", shape: "horseshoe", duration: 540, weight: 8 },
  { id: "piercing", name: "Piercing Ball", color: "#ff8a3d", shape: "diamond", duration: 420, weight: 8 },
  { id: "shield", name: "Shield", color: "#65ffcc", shape: "hexagon", duration: 0, weight: 8 },
  { id: "slow", name: "Slow Motion", color: "#75aaff", shape: "clock", duration: 420, weight: 7 },
  { id: "life", name: "Extra Life", color: "#ff4d62", shape: "heart", duration: 0, weight: 3 },
  { id: "double", name: "Double Points", color: "#ffe45e", shape: "star", duration: 600, weight: 6 },
  { id: "laser", name: "Laser Paddle", color: "#dc83ff", shape: "laser", duration: 480, weight: 6 },
  { id: "shockwave", name: "Shockwave", color: "#ffad42", shape: "burst", duration: 0, weight: 5 }
];
let fallingPowerUps = [];
let activeEffects = {};
let laserShots = [];
let shieldCharges = 0;
let soundContext;
let movingTick = 0;
let laserCooldown = 0;
let gameParticles = [];
let musicNodes = [];
let musicMode = "";
let musicInterval = 0;
let musicStep = 0;
let musicVolumeApplied = -1;
const SPECIAL_ABILITIES = {
  pulse: { name: "Pulse", cost: 40 },
  overdrive: { name: "Overdrive", cost: 70 },
  timeWarp: { name: "Time Warp", cost: 100 }
};
let specialAbilityEnergy = 0;
let equippedSpecialAbility = "pulse";
let specialAbilityRemaining = 0;

function playGameSound(kind) {
  if (!interfaceData.settings.sound) return;
  const AudioContextType = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextType) return;
  soundContext ||= new AudioContextType();
  if (soundContext.state === "suspended") soundContext.resume();
  const notes = { wall: [260, 0.045], paddle: [440, 0.08], brick: [330, 0.06], enemy: [185, 0.09], powerup: [620, 0.1], destroy: [520, 0.11], perfect: [880, 0.12], ability: [720, 0.13], trick: [990, 0.14] };
  const [frequency, volume] = notes[kind] || notes.brick;
  const oscillator = soundContext.createOscillator();
  const gain = soundContext.createGain();
  oscillator.type = kind === "enemy" ? "triangle" : "sine";
  oscillator.frequency.setValueAtTime(frequency, soundContext.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(Math.max(100, frequency * 0.72), soundContext.currentTime + 0.09);
  gain.gain.setValueAtTime(volume * interfaceData.settings.sfxVolume, soundContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, soundContext.currentTime + 0.12);
  oscillator.connect(gain);
  gain.connect(soundContext.destination);
  oscillator.start();
  oscillator.stop(soundContext.currentTime + 0.12);
}

function updateMusic() {
  if (!interfaceData.settings.music || interfaceData.settings.musicVolume <= 0) {
    stopMusic();
    return;
  }
  if (!soundContext || soundContext.state === "suspended") return;
  const boss = gameActive && invaders.some((invader) => invader.type === "boss");
  const track = boss ? "boss" : gameActive ? "game" : "menu";
  if (musicMode === track && musicVolumeApplied === interfaceData.settings.musicVolume) return;
  stopMusic();
  musicMode = track;
  musicVolumeApplied = interfaceData.settings.musicVolume;
  musicStep = 0;
  playMusicNote();
  musicInterval = setInterval(playMusicNote, 340);
}

function playMusicNote() {
  if (!soundContext || !musicMode) return;
  const tracks = {
    menu: { root: 220, notes: [0, 4, 7, 11, 7, 4] },
    game: { root: 164.81, notes: [0, 3, 7, 10, 7, 3] },
    boss: { root: 110, notes: [0, 3, 5, 6, 3, 1] }
  };
  const track = tracks[musicMode];
  const frequency = track.root * 2 ** (track.notes[musicStep % track.notes.length] / 12);
  musicStep += 1;
  const oscillator = soundContext.createOscillator();
  const gain = soundContext.createGain();
  const now = soundContext.currentTime;
  oscillator.type = "triangle";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.07 * interfaceData.settings.musicVolume, now + 0.025);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
  oscillator.connect(gain);
  gain.connect(soundContext.destination);
  oscillator.onended = () => {
    oscillator.disconnect();
    gain.disconnect();
    musicNodes = musicNodes.filter((node) => node !== oscillator && node !== gain);
  };
  oscillator.start(now);
  oscillator.stop(now + 0.29);
  musicNodes.push(oscillator, gain);
}

function stopMusic() {
  if (musicInterval) clearInterval(musicInterval);
  musicInterval = 0;
  for (const node of musicNodes) {
    if (typeof node.stop === "function") {
      try {
        node.stop();
      } catch (error) {
        if (error.name !== "InvalidStateError") throw error;
      }
    }
    node.disconnect();
  }
  musicNodes = [];
  musicMode = "";
  musicVolumeApplied = -1;
}

function spawnParticles(x, y, color, count = 5, force = 2) {
  if (interfaceData.settings.reducedMotion || interfaceData.settings.effectsIntensity <= 0) return;
  const intensity = interfaceData.settings.effectsIntensity;
  count = Math.max(1, Math.round(count * intensity));
  force *= intensity;
  for (let index = 0; index < count; index += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 0.5 + Math.random() * force;
    gameParticles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: 1 + Math.random() * 2,
      color,
      life: 18 + Math.floor(Math.random() * 13),
      maxLife: 31
    });
  }
}

function updateGameEffects() {
  for (let index = gameParticles.length - 1; index >= 0; index -= 1) {
    const particle = gameParticles[index];
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vx *= 0.97;
    particle.vy *= 0.97;
    particle.life -= 1;
    if (particle.life <= 0) gameParticles.splice(index, 1);
  }
  for (const invader of invaders) {
    if (invader.flashTimer > 0) invader.flashTimer -= 1;
  }
  if (paddleImpact > 0) paddleImpact -= 1;
  if (perfectHitTimer > 0) perfectHitTimer -= 1;
  if (trickShotTimer > 0) trickShotTimer -= 1;
  for (const targetBall of balls) {
    if (targetBall.trickShotTimer > 0) targetBall.trickShotTimer -= 1;
  }
  if (cameraShake > 0) cameraShake *= 0.82;
  if (cameraShake < 0.15) cameraShake = 0;
}

function dropPowerUp(x, y, chance = 0.12) {
  if (Math.random() >= chance) return;
  const totalWeight = POWER_UPS.reduce((total, powerUp) => total + powerUp.weight, 0);
  let roll = Math.random() * totalWeight;
  const type = POWER_UPS.find((powerUp) => (roll -= powerUp.weight) <= 0) || POWER_UPS[0];
  fallingPowerUps.push({ ...type, x, y, width: 24, height: 24, vy: 1.8 });
}

function damageBrick(index, targetBall) {
  const brick = bricks[index];
  if (!brick) return;
  if (brick.type === "frozen") {
    targetBall.slowTimer = 150;
  }
  if (brick.type === "portal" && brick.portalCooldown <= 0) {
    const other = bricks.find((candidate, candidateIndex) => candidateIndex !== index && candidate.type === "portal");
    if (other) {
      targetBall.x = other.x + other.width / 2 - targetBall.width / 2;
      targetBall.y = other.y + other.height + 2;
      brick.portalCooldown = 45;
      other.portalCooldown = 45;
    }
  }
  if (brick.type === "indestructible") {
    const angle = Math.atan2(targetBall.vy, targetBall.vx) + (targetBall.vx >= 0 ? Math.PI / 4 : -Math.PI / 4);
    const speed = Math.hypot(targetBall.vx, targetBall.vy);
    targetBall.vx = Math.cos(angle) * speed;
    targetBall.vy = Math.sin(angle) * speed;
    return;
  }
  spawnParticles(targetBall.x + targetBall.width / 2, targetBall.y + targetBall.height / 2, brick.type === "frozen" ? gameTheme.accentTertiary : gameTheme.brick, 3, 1.1);
  playGameSound("brick");
  registerTargetHit(brick.type === "golden" ? 100 : 10);
  brick.health -= 1;
  if (brick.health > 0) {
    if (brick.type === "regenerating") brick.regenTimer = 360;
    return;
  }
  destroyBrick(index);
}

function destroyBrick(index) {
  const [brick] = bricks.splice(index, 1);
  if (!brick) return;
  chargeSpecialAbility(3);
  spawnParticles(brick.x + brick.width / 2, brick.y + brick.height / 2, brick.type === "golden" ? gameTheme.accentSecondary : gameTheme.brick, 10, 2.7);
  cameraShake = Math.max(cameraShake, 1.4);
  playGameSound("destroy");
  recordDestroyedBrick();
  dropPowerUp(brick.x + brick.width / 2, brick.y, 0.14);
  if (brick.type === "explosive") {
    for (let neighborIndex = bricks.length - 1; neighborIndex >= 0; neighborIndex -= 1) {
      const neighbor = bricks[neighborIndex];
      const dx = neighbor.x + neighbor.width / 2 - (brick.x + brick.width / 2);
      const dy = neighbor.y + neighbor.height / 2 - (brick.y + brick.height / 2);
      if (neighbor.type !== "indestructible" && Math.hypot(dx, dy) < 80) {
        neighbor.health -= 1;
        if (neighbor.health <= 0) destroyBrick(neighborIndex);
      }
    }
  } else if (brick.type === "chain") {
    for (let neighborIndex = bricks.length - 1; neighborIndex >= 0; neighborIndex -= 1) {
      const neighbor = bricks[neighborIndex];
      if (neighbor.type === "chain" && neighbor.chainId === brick.chainId) destroyBrick(neighborIndex);
    }
  }
}

function damageInvader(index, targetBall) {
  const invader = invaders[index];
  if (!invader || invader.intangible || (invader.type !== "shield-generator" && isInvaderShielded(invader))) return;
  invader.flashTimer = 7;
  spawnParticles(targetBall.x + targetBall.width / 2, targetBall.y + targetBall.height / 2, gameTheme.enemy, 4, 1.4);
  playGameSound("enemy");
  invader.health -= 1;
  if (invader.health > 0) return;
  const [destroyed] = invaders.splice(index, 1);
  chargeSpecialAbility(3);
  spawnParticles(destroyed.x + destroyed.width / 2, destroyed.y + destroyed.height / 2, gameTheme.accent, destroyed.type === "boss" ? 24 : 12, 3.2);
  cameraShake = Math.max(cameraShake, destroyed.type === "boss" ? 5 : 2.2);
  registerTargetHit(destroyed.type === "boss" ? 3000 : destroyed.type === "tank" ? 100 : 50);
  if (destroyed.type === "boss") {
    if (destroyed.variant === "galactic-commander") {
      destroyed.beamState = "idle";
      destroyed.beamTimer = 0;
      invaderBullets = [];
      spawnGalacticBossFragments(destroyed);
      registerBonusPoints(5000);
      playGameSound("destroy");
    }
    if (activeMode === "campaign" || activeMode === "boss_rush") lives += 1;
  }
  dropPowerUp(destroyed.x + destroyed.width / 2, destroyed.y, destroyed.type === "boss" ? 1 : 0.18);
  if (destroyed.type === "splitter") {
    objectiveInvaderTotal += 2;
    for (let child = 0; child < 2; child += 1) {
      invaders.push({
        x: destroyed.x + child * 15,
        y: destroyed.y + 8,
        width: 14,
        height: 12,
        type: "scout",
        health: 1,
        fireTimer: 0,
        phase: 1,
        intangible: false,
        small: true
      });
    }
  }
}

function isInvaderShielded(invader) {
  return invaders.some((generator) => generator.type === "shield-generator" &&
    Math.hypot(generator.x - invader.x, generator.y - invader.y) < 125);
}

function updateMechanics() {
  movingTick += 1;
  if (specialAbilityRemaining > 0) {
    specialAbilityRemaining -= 1;
    if (specialAbilityRemaining === 0) updateSpecialAbilityStatus();
  }
  for (const brick of bricks) {
    if (brick.type === "moving") {
      brick.x += brick.moveDirection * 0.65 * (activeEffects.slow ? 0.55 : 1);
      if (brick.x < 24 || brick.x + brick.width > WIDTH - 24) brick.moveDirection *= -1;
    } else if (brick.type === "regenerating" && brick.health < brick.maxHealth) {
      brick.regenTimer -= 1;
      if (brick.regenTimer <= 0) {
        brick.health += 1;
        brick.regenTimer = 360;
      }
    }
    if (brick.portalCooldown > 0) brick.portalCooldown -= 1;
  }
  for (const invader of invaders) {
    if (invader.type === "phantom") invader.intangible = Math.floor(movingTick / 240) % 2 === 1;
    if (invader.type === "boss") {
      const healthRatio = invader.health / invader.maxHealth;
      invader.phase = healthRatio > 0.66 ? 1 : healthRatio > 0.33 ? 2 : 3;
    }
  }
  updateFallingPowerUps();
  updateLaserShots();
  if (laserCooldown > 0) laserCooldown -= 1;
  if (keys["f"] && activeEffects.laser && laserCooldown === 0) fireLaser();
  for (const [id, effect] of Object.entries(activeEffects)) {
    effect.remaining -= 1;
    if (effect.remaining <= 0) removeEffect(id);
  }
  for (const targetBall of balls) {
    if (targetBall.slowTimer > 0) targetBall.slowTimer -= 1;
    if (targetBall.caught) {
      const caughtBy = targetBall.caughtBy || paddle;
      targetBall.x = caughtBy.x + (caughtBy.width - targetBall.width) / 2;
      targetBall.y = caughtBy.y - targetBall.height - 2;
    }
  }
  updatePowerUpStatus();
  updateSpecialAbilityStatus();
}

function setEquippedSpecialAbility(ability) {
  if (!Object.prototype.hasOwnProperty.call(SPECIAL_ABILITIES, ability)) return;
  equippedSpecialAbility = ability;
  updateSpecialAbilityStatus();
}

function resetSpecialAbility() {
  specialAbilityEnergy = 0;
  specialAbilityRemaining = 0;
  updateSpecialAbilityStatus();
}

function chargeSpecialAbility(amount) {
  specialAbilityEnergy = Math.min(100, specialAbilityEnergy + amount);
  updateSpecialAbilityStatus();
}

function activateSpecialAbility() {
  if (!gameActive || !started || paused || gameOver || galacticBossDefeatTimer > 0) return false;
  if (specialAbilityRemaining > 0) return false;
  const ability = SPECIAL_ABILITIES[equippedSpecialAbility];
  if (specialAbilityEnergy < ability.cost) return false;

  specialAbilityEnergy -= ability.cost;
  playGameSound("ability");
  if (equippedSpecialAbility === "pulse") {
    applyShockwave();
    specialAbilityRemaining = 30;
  } else if (equippedSpecialAbility === "overdrive") {
    setEffect("piercing", 360);
    for (const targetBall of balls) targetBall.piercing = true;
    specialAbilityRemaining = 360;
  } else {
    setEffect("slow", 360);
    specialAbilityRemaining = 360;
  }
  updateSpecialAbilityStatus();
  return true;
}

function updateSpecialAbilityStatus() {
  const ability = SPECIAL_ABILITIES[equippedSpecialAbility];
  const button = document.getElementById("special-ability-button");
  const status = document.getElementById("ability-status");
  const bar = document.getElementById("ability-energy-bar");
  const progress = bar?.parentElement;
  if (!button || !status || !bar || !progress) return;
  const ready = specialAbilityEnergy >= ability.cost;
  button.textContent = specialAbilityRemaining > 0
    ? `${ability.name} · ${Math.ceil(specialAbilityRemaining / 60)}s`
    : `${ability.name} · ${Math.floor(specialAbilityEnergy)}/${ability.cost}`;
  button.disabled = !ready || specialAbilityRemaining > 0 || !gameActive || !started || paused || gameOver ||
    galacticBossDefeatTimer > 0;
  document.getElementById("special-ability-select").disabled = started;
  status.textContent = `Special energy · ${Math.floor(specialAbilityEnergy)}/100`;
  bar.style.width = `${specialAbilityEnergy}%`;
  progress.setAttribute("aria-valuenow", String(Math.floor(specialAbilityEnergy)));
  button.setAttribute("aria-label", specialAbilityRemaining > 0
    ? `${ability.name} active for ${Math.ceil(specialAbilityRemaining / 60)} seconds`
    : `Activate ${ability.name}, costs ${ability.cost} energy${ready ? ", ready" : ""}`);
}

function updateFallingPowerUps() {
  for (let index = fallingPowerUps.length - 1; index >= 0; index -= 1) {
    const powerUp = fallingPowerUps[index];
    powerUp.y += powerUp.vy * (activeEffects.slow ? 0.55 : 1);
    if (getPaddles().some((targetPaddle) => boxesTouch(powerUp, targetPaddle))) {
      collectPowerUp(powerUp);
      fallingPowerUps.splice(index, 1);
    } else if (powerUp.y > HEIGHT) {
      fallingPowerUps.splice(index, 1);
    }
  }
}

function collectPowerUp(powerUp) {
  playPickupSound(powerUp.id);
  if (powerUp.id === "multiball") {
    const sourceBall = balls[0] || ball;
    for (const direction of [-1, 1]) {
      if (balls.length >= 3) break;
      balls.push({
        ...sourceBall,
        vx: sourceBall.vx + direction * 2.2 || direction * 2.2,
        vy: sourceBall.vy || -BALL_SPEED,
        caught: false,
        trickShotPieces: [],
        trickShotTimer: 0
      });
    }
  } else if (powerUp.id === "life") {
    lives += 1;
  } else if (powerUp.id === "shield") {
    shieldCharges += 1;
  } else if (powerUp.id === "shockwave") {
    applyShockwave();
  } else if (powerUp.id === "expand") {
    setEffect("expand", powerUp.duration);
    paddle.width = 120;
    if (activeMode === "coop") secondPaddle.width = 120;
    paddle.x = Math.min(paddle.x, activeMode === "coop" ? WIDTH / 2 - paddle.width : WIDTH - paddle.width);
    paddleTargetX = paddle.x;
    if (activeMode === "coop") secondPaddleTargetX = secondPaddle.x;
  } else if (powerUp.id === "slow") {
    setEffect("slow", powerUp.duration);
  } else if (powerUp.id === "double") {
    setEffect("double", powerUp.duration);
  } else if (powerUp.id === "magnet" || powerUp.id === "piercing" || powerUp.id === "laser") {
    setEffect(powerUp.id, powerUp.duration);
    if (powerUp.id === "piercing") for (const targetBall of balls) targetBall.piercing = true;
  }
  updateStatus();
}

function setEffect(id, duration) {
  activeEffects[id] = { remaining: duration, duration };
}

function removeEffect(id) {
  delete activeEffects[id];
  if (id === "expand") {
    paddle.width = 72;
    secondPaddle.width = 72;
  }
  if (id === "piercing") for (const targetBall of balls) targetBall.piercing = false;
}

function catchBall(targetBall, targetPaddle = paddle) {
  if (!activeEffects.magnet) return false;
  targetBall.caught = true;
  targetBall.caughtBy = targetPaddle;
  targetBall.vx = 0;
  targetBall.vy = 0;
  return true;
}

function applyShockwave() {
  const centerX = paddle.x + paddle.width / 2;
  const centerY = paddle.y - 150;
  for (let index = bricks.length - 1; index >= 0; index -= 1) {
    const brick = bricks[index];
    if (brick.type !== "indestructible" &&
      Math.hypot(brick.x + brick.width / 2 - centerX, brick.y + brick.height / 2 - centerY) < 190) {
      brick.health -= 1;
      if (brick.health <= 0) destroyBrick(index);
    }
  }
  for (let index = invaders.length - 1; index >= 0; index -= 1) {
    const invader = invaders[index];
    if (Math.hypot(invader.x + invader.width / 2 - centerX, invader.y + invader.height / 2 - centerY) < 190) {
      damageInvader(index, ball);
    }
  }
  shockwaveTimer = 30;
}

let shockwaveTimer = 0;

function fireLaser() {
  laserShots.push({ x: paddle.x + paddle.width * 0.25 - 2, y: paddle.y, width: 4, height: 12, vy: -8 });
  laserShots.push({ x: paddle.x + paddle.width * 0.75 - 2, y: paddle.y, width: 4, height: 12, vy: -8 });
  laserCooldown = 18;
}

function updateLaserShots() {
  for (let shotIndex = laserShots.length - 1; shotIndex >= 0; shotIndex -= 1) {
    const shot = laserShots[shotIndex];
    shot.y += shot.vy;
    if (shot.y + shot.height < 0) {
      laserShots.splice(shotIndex, 1);
      continue;
    }
    let hit = false;
    for (let index = bricks.length - 1; index >= 0; index -= 1) {
      if (boxesTouch(shot, bricks[index])) {
        damageBrick(index, ball);
        hit = true;
        break;
      }
    }
    if (!hit) {
      for (let index = invaders.length - 1; index >= 0; index -= 1) {
        if (boxesTouch(shot, invaders[index])) {
          damageInvader(index, ball);
          hit = true;
          break;
        }
      }
    }
    if (hit) laserShots.splice(shotIndex, 1);
  }
}

function updatePowerUpStatus() {
  const status = document.getElementById("powerup-status");
  if (!status) return;
  const active = Object.entries(activeEffects).map(([id, effect]) => {
    const definition = POWER_UPS.find((powerUp) => powerUp.id === id);
    return `${definition.name} ${Math.ceil(effect.remaining / 60)}s`;
  });
  if (shieldCharges > 0) active.push(`Shield x${shieldCharges}`);
  if (balls.length > 1) active.push(`Multiball x${balls.length}`);
  status.textContent = active.length ? `Active: ${active.join(" · ")}` : "No active power-ups";
}

function playPickupSound(id) {
  if (!interfaceData.settings.sound) return;
  const AudioContextType = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextType) return;
  soundContext ||= new AudioContextType();
  const oscillator = soundContext.createOscillator();
  const gain = soundContext.createGain();
  const pitch = POWER_UPS.findIndex((powerUp) => powerUp.id === id);
  oscillator.frequency.value = 320 + pitch * 38;
  oscillator.type = id === "life" ? "sine" : "triangle";
  gain.gain.setValueAtTime(0.08 * interfaceData.settings.sfxVolume, soundContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, soundContext.currentTime + 0.16);
  oscillator.connect(gain);
  gain.connect(soundContext.destination);
  oscillator.start();
  oscillator.stop(soundContext.currentTime + 0.16);
}

function drawPowerUps() {
  for (const powerUp of fallingPowerUps) {
    ctx.fillStyle = powerUp.color;
    ctx.beginPath();
    if (powerUp.shape === "wide") {
      ctx.roundRect(powerUp.x, powerUp.y + 7, powerUp.width, 10, 4);
    } else if (powerUp.shape === "triple") {
      ctx.arc(powerUp.x + 6, powerUp.y + 12, 4, 0, Math.PI * 2);
      ctx.arc(powerUp.x + 12, powerUp.y + 12, 4, 0, Math.PI * 2);
      ctx.arc(powerUp.x + 18, powerUp.y + 12, 4, 0, Math.PI * 2);
    } else if (powerUp.shape === "heart") {
      ctx.moveTo(powerUp.x + 12, powerUp.y + 21);
      ctx.bezierCurveTo(powerUp.x - 2, powerUp.y + 12, powerUp.x + 4, powerUp.y, powerUp.x + 12, powerUp.y + 7);
      ctx.bezierCurveTo(powerUp.x + 20, powerUp.y, powerUp.x + 26, powerUp.y + 12, powerUp.x + 12, powerUp.y + 21);
    } else if (powerUp.shape === "star" || powerUp.shape === "burst") {
      const spikes = powerUp.shape === "star" ? 5 : 8;
      for (let point = 0; point < spikes * 2; point += 1) {
        const radius = point % 2 === 0 ? 11 : 5;
        const angle = point * Math.PI / spikes - Math.PI / 2;
        const x = powerUp.x + 12 + Math.cos(angle) * radius;
        const y = powerUp.y + 12 + Math.sin(angle) * radius;
        if (point === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    } else if (powerUp.shape === "hexagon") {
      for (let point = 0; point < 6; point += 1) {
        const angle = point * Math.PI / 3;
        const x = powerUp.x + 12 + Math.cos(angle) * 11;
        const y = powerUp.y + 12 + Math.sin(angle) * 11;
        if (point === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
    } else if (powerUp.shape === "diamond") {
      ctx.moveTo(powerUp.x + 12, powerUp.y + 1);
      ctx.lineTo(powerUp.x + 23, powerUp.y + 12);
      ctx.lineTo(powerUp.x + 12, powerUp.y + 23);
      ctx.lineTo(powerUp.x + 1, powerUp.y + 12);
      ctx.closePath();
    } else if (powerUp.shape === "horseshoe") {
      ctx.moveTo(powerUp.x + 4, powerUp.y + 6);
      ctx.lineTo(powerUp.x + 4, powerUp.y + 14);
      ctx.arc(powerUp.x + 12, powerUp.y + 14, 8, Math.PI, 0, true);
      ctx.lineTo(powerUp.x + 20, powerUp.y + 6);
      ctx.lineTo(powerUp.x + 15, powerUp.y + 6);
      ctx.lineTo(powerUp.x + 15, powerUp.y + 12);
      ctx.arc(powerUp.x + 12, powerUp.y + 12, 3, 0, Math.PI);
      ctx.lineTo(powerUp.x + 9, powerUp.y + 6);
      ctx.closePath();
    } else if (powerUp.shape === "laser") {
      ctx.moveTo(powerUp.x + 5, powerUp.y + 20);
      ctx.lineTo(powerUp.x + 8, powerUp.y + 5);
      ctx.lineTo(powerUp.x + 12, powerUp.y + 10);
      ctx.lineTo(powerUp.x + 16, powerUp.y + 5);
      ctx.lineTo(powerUp.x + 19, powerUp.y + 20);
      ctx.closePath();
    } else {
      ctx.arc(powerUp.x + 12, powerUp.y + 12, 9, 0, Math.PI * 2);
      if (powerUp.shape === "clock") {
        ctx.moveTo(powerUp.x + 12, powerUp.y + 12);
        ctx.lineTo(powerUp.x + 12, powerUp.y + 5);
        ctx.moveTo(powerUp.x + 12, powerUp.y + 12);
        ctx.lineTo(powerUp.x + 18, powerUp.y + 15);
      }
    }
    ctx.fill();
    if (powerUp.shape === "clock") {
      ctx.strokeStyle = "black";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.lineWidth = 1;
    }
    ctx.fillStyle = "black";
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(powerUp.name[0], powerUp.x + 12, powerUp.y + 16);
  }
  for (const shot of laserShots) {
    ctx.fillStyle = gameTheme.accentSecondary;
    ctx.fillRect(shot.x, shot.y, shot.width, shot.height);
  }
  if (shieldCharges > 0) {
    ctx.strokeStyle = gameTheme.accentSecondary;
    ctx.beginPath();
    ctx.arc(paddle.x + paddle.width / 2, paddle.y + 12, paddle.width / 2 + 8, Math.PI, Math.PI * 2);
    ctx.stroke();
  }
  if (shockwaveTimer > 0) {
    ctx.strokeStyle = `rgba(255, 173, 66, ${shockwaveTimer / 30})`;
    ctx.beginPath();
    ctx.arc(paddle.x + paddle.width / 2, paddle.y - 150, (30 - shockwaveTimer) * 7, 0, Math.PI * 2);
    ctx.stroke();
    shockwaveTimer -= 1;
  }
}

function drawEnemyDetails() {
  for (const invader of invaders) {
    if (invader.variant === "galactic-commander") continue;
    const colors = {
      standard: gameTheme.enemy,
      scout: gameTheme.accentSecondary,
      tank: gameTheme.enemy,
      sniper: gameTheme.projectile,
      phantom: gameTheme.accentTertiary,
      "shield-generator": gameTheme.accentSecondary,
      splitter: gameTheme.accentTertiary,
      boss: gameTheme.accent
    };
    ctx.fillStyle = colors[invader.type] || "white";
    if (invader.type === "boss") {
      ctx.fillRect(invader.x, invader.y - 5, invader.width * invader.health / invader.maxHealth, 3);
      ctx.strokeStyle = gameTheme.accent;
      ctx.strokeRect(invader.x, invader.y, invader.width, invader.height);
    } else if (invader.type === "shield-generator") {
      ctx.strokeStyle = gameTheme.accentSecondary;
      ctx.beginPath();
      ctx.arc(invader.x + invader.width / 2, invader.y + invader.height / 2, 8, 0, Math.PI * 2);
      ctx.stroke();
    } else if (invader.health > 1) {
      ctx.fillRect(invader.x + 2, invader.y - 3, (invader.width - 4) * invader.health / 3, 2);
    }
    if (invader.type !== "shield-generator" && isInvaderShielded(invader)) {
      ctx.strokeStyle = gameTheme.accentSecondary;
      ctx.beginPath();
      ctx.arc(invader.x + invader.width / 2, invader.y + invader.height / 2, invader.width / 2 + 3, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (invader.intangible) {
      ctx.globalAlpha = 0.28;
      ctx.fillRect(invader.x, invader.y, invader.width, invader.height);
      ctx.globalAlpha = 1;
    }
  }
}
