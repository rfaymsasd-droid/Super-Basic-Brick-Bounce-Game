const GameJuice = (() => {
  const presets = {
    minimal: { particles: 64, multiplier: 0.45, glow: 0.55, trails: 0.55, shake: 0.35 },
    balanced: { particles: 160, multiplier: 0.85, glow: 0.85, trails: 0.85, shake: 0.7 },
    high: { particles: 280, multiplier: 1.2, glow: 1.1, trails: 1.15, shake: 1 },
    ultra: { particles: 420, multiplier: 1.55, glow: 1.3, trails: 1.35, shake: 1.1 }
  };
  const effects = [];
  const pool = [];
  const labels = [];
  const labelPool = [];
  const bounceVariants = {
    wall: { scaleX: 0.72, scaleY: 1.16, rotation: 0 },
    ceiling: { scaleX: 1.16, scaleY: 0.72, rotation: 0 },
    paddle: { scaleX: 1.2, scaleY: 0.7, rotation: 0 },
    perfect: { scaleX: 1.3, scaleY: 0.62, rotation: 0 },
    target: { scaleX: 0.78, scaleY: 1.16, rotation: 0.16 },
    obstacle: { scaleX: 0.84, scaleY: 1.14, rotation: -0.2 }
  };
  let cameraX = 0;
  let cameraY = 0;
  let randomState = ((Date.now() ^ 0x9e3779b9) >>> 0) || 0x6d2b79f5;

  function random() {
    randomState ^= randomState << 13;
    randomState ^= randomState >>> 17;
    randomState ^= randomState << 5;
    return (randomState >>> 0) / 0x100000000;
  }

  function settings() {
    return typeof interfaceData === "undefined" ? {} : interfaceData.settings || {};
  }

  function quality() {
    return presets[settings().visualQuality] || presets.balanced;
  }

  function enabled() {
    return settings().decorativeEffects !== false &&
      settings().effectsIntensity !== 0 &&
      settings().reducedMotion !== true;
  }

  function bounce(ball, variant = "target") {
    if (!ball || !enabled()) return;
    ball.bounceJuice = {
      variant: bounceVariants[variant] ? variant : "target",
      age: 0,
      duration: 9
    };
  }

  function updateBallBounce(ball) {
    if (!ball?.bounceJuice) return;
    ball.bounceJuice.age += 1;
    if (ball.bounceJuice.age >= ball.bounceJuice.duration) delete ball.bounceJuice;
  }

  function getBallBounceTransform(ball) {
    const effect = ball?.bounceJuice;
    const variant = effect && bounceVariants[effect.variant];
    if (!enabled() || !effect || !variant) return { scaleX: 1, scaleY: 1, rotation: 0 };
    const progress = Math.max(0, Math.min(1, effect.age / effect.duration));
    const pulse = Math.sin(progress * Math.PI);
    return {
      scaleX: 1 + (variant.scaleX - 1) * pulse,
      scaleY: 1 + (variant.scaleY - 1) * pulse,
      rotation: variant.rotation * pulse
    };
  }

  function acquire(values) {
    if (effects.length >= quality().particles) return false;
    const effect = pool.pop() || {};
    Object.assign(effect, values);
    effects.push(effect);
    return true;
  }

  function addLabel(text, x, y, color, size = 17) {
    if (!text || labels.length >= 8) return;
    const label = labelPool.pop() || {};
    Object.assign(label, { text, x, y, color, size, life: 52, maxLife: 52, vy: -0.55 });
    labels.push(label);
  }

  function addRing(x, y, color, radius = 8, life = 20, width = 2) {
    acquire({ kind: "ring", x, y, color, radius, life, maxLife: life, width });
  }

  function burst(x, y, color, count, force = 2, shape = "spark", directionX = 0, directionY = 0) {
    const settingsNow = settings();
    const preset = quality();
    if (!enabled() || effects.length >= preset.particles) return;
    const scaledCount = settingsNow.reducedMotion
      ? 0
      : Math.min(Math.ceil(count * preset.multiplier * settingsNow.effectsIntensity), preset.particles - effects.length);
    for (let index = 0; index < scaledCount; index += 1) {
      const angle = Math.atan2(directionY, directionX) +
        (directionX || directionY ? (random() - 0.5) * 2.4 : random() * Math.PI * 2);
      const speed = 0.45 + random() * force * preset.multiplier;
      const life = 15 + Math.floor(random() * 18);
      acquire({
        kind: shape,
        x,
        y,
        vx: Math.cos(angle) * speed + directionX * 0.12,
        vy: Math.sin(angle) * speed + directionY * 0.12,
        size: 1.2 + random() * 3.2,
        color,
        life,
        maxLife: life,
        gravity: shape === "shard" || shape === "pixel" ? 0.045 : 0.012,
        drag: 0.975,
        rotation: random() * Math.PI,
        spin: (random() - 0.5) * 0.16
      });
    }
  }

  function kick(power, x, y) {
    if (!enabled() || settings().cameraShake !== true) return;
    const preset = quality();
    const strength = power * preset.shake * settings().effectsIntensity;
    cameraX = Math.max(-3, Math.min(3, cameraX +
      Math.max(-2.2, Math.min(2.2, (0.5 - x / Math.max(1, WIDTH)) * strength))));
    cameraY = Math.max(-3, Math.min(3, cameraY +
      Math.max(-2.2, Math.min(2.2, (0.5 - y / Math.max(1, HEIGHT)) * strength))));
  }

  function emit(type, x, y, options = {}) {
    if (!enabled()) return;
    const color = options.color || gameTheme.accentSecondary;
    const directionX = options.directionX || 0;
    const directionY = options.directionY || 0;
    switch (type) {
      case "ball-hit":
        addRing(x, y, color, 5, 14, 1.5);
        burst(x, y, color, 4, 1.7, "spark", directionX, directionY);
        kick(0.7, x, y);
        break;
      case "paddle-hit":
        addRing(x, y, color, 7, 19, 2);
        burst(x, y, color, options.perfect ? 13 : 7, 2.6, "spark", directionX, -1);
        if (options.perfect) addLabel("PERFECT", x, y - 10, color, 14);
        kick(options.perfect ? 1.4 : 0.8, x, y);
        break;
      case "brick-hit":
        burst(x, y, color, options.armored ? 7 : 4, 1.8, options.electric ? "spark" : "shard", directionX, directionY);
        if (options.armored) addRing(x, y, color, 5, 12, 1.5);
        break;
      case "brick-break":
        burst(x, y, color, options.explosive ? 23 : options.frozen ? 15 : 12,
          options.explosive ? 3.8 : 2.7,
          options.frozen ? "pixel" : options.electric || options.armored ? "spark" : "shard",
          directionX, directionY);
        if (options.explosive || options.golden || options.portal || options.chain || options.regenerating) {
          addRing(x, y, color, 8, options.explosive ? 30 : 21, 2);
        }
        kick(options.explosive ? 2 : 1, x, y);
        break;
      case "forcefield":
        addRing(x, y, color, 6, 24, 2);
        break;
      case "portal":
        addRing(x, y, color, options.exit ? 5 : 8, 24, 2);
        burst(x, y, color, 8, 2, "spark");
        break;
      case "enemy-hit":
        burst(x, y, color, 6, 2.1, "spark", directionX, directionY);
        addRing(x, y, color, 5, 13, 1.5);
        break;
      case "enemy-defeat":
        burst(x, y, color, options.boss ? 32 : 14, options.boss ? 4.5 : 2.8, "shard", directionX, directionY);
        addRing(x, y, color, 9, options.boss ? 42 : 24, options.boss ? 3 : 2);
        if (options.boss) {
          addLabel(options.label || "TARGET ELIMINATED", WIDTH / 2, HEIGHT * 0.42, color, 22);
          kick(3, x, y);
        }
        break;
      case "power-up":
        burst(x, y, color, options.multiball ? 22 : 14, 3, options.multiball ? "spark" : "pixel");
        addRing(x, y, color, 8, 28, 2);
        addLabel(options.label || "POWER UP", x, y - 6, color, 14);
        break;
      case "shockwave":
        addRing(x, y, color, 10, 34, 3);
        addRing(x, y, color, 4, 27, 1.5);
        burst(x, y, color, 18, 3.2, "spark", 0, -1);
        kick(1.7, x, y);
        break;
      case "combo":
        addRing(x, y, color, 12, 27, 2);
        addLabel(options.label || "COMBO", x, y, color, 18);
        break;
      case "boss-intro":
      case "boss-phase":
      case "boss-warning":
        addRing(x, y, color, 12, type === "boss-intro" ? 48 : 30, type === "boss-intro" ? 3 : 2);
        addLabel(options.label || "WARNING", WIDTH / 2, options.bossY || 92, color, type === "boss-intro" ? 23 : 17);
        if (type !== "boss-warning") kick(type === "boss-intro" ? 2.5 : 1.5, x, y);
        break;
      case "row-reverse":
        burst(x, y, color, 5, 1.4, "spark", directionX, 0);
        addRing(x, y, color, 5, 15, 1.5);
        break;
      case "obstacle-impact":
        addRing(x, y, color, 7, 23, 2);
        burst(x, y, color, 9, 2, "pixel", 0, -1);
        break;
      case "corruption":
      case "chaos":
        addLabel(options.label || (type === "chaos" ? "SYSTEM OVERLOAD" : "SYSTEM CORRUPTION"),
          WIDTH / 2, y, color, 18);
        addRing(WIDTH / 2, y, color, 6, 32, 2);
        break;
      default:
        break;
    }
  }

  function update() {
    for (let index = effects.length - 1; index >= 0; index -= 1) {
      const effect = effects[index];
      effect.life -= 1;
      if (effect.kind === "ring") {
        effect.radius += 2.4;
      } else {
        effect.x += effect.vx;
        effect.y += effect.vy;
        effect.vy += effect.gravity;
        effect.vx *= effect.drag;
        effect.vy *= effect.drag;
        effect.rotation += effect.spin;
      }
      if (effect.life <= 0) {
        effects.splice(index, 1);
        if (pool.length < 500) pool.push(effect);
      }
    }
    for (let index = labels.length - 1; index >= 0; index -= 1) {
      const label = labels[index];
      label.life -= 1;
      label.y += label.vy;
      if (label.life <= 0) {
        labels.splice(index, 1);
        if (labelPool.length < 16) labelPool.push(label);
      }
    }
    cameraX *= 0.76;
    cameraY *= 0.76;
    if (Math.abs(cameraX) < 0.08) cameraX = 0;
    if (Math.abs(cameraY) < 0.08) cameraY = 0;
  }

  function applyCamera(context) {
    if (settings().reducedMotion || settings().cameraShake !== true) return;
    context.translate(cameraX, cameraY);
  }

  function draw(context) {
    if (!enabled()) return;
    const preset = quality();
    for (const effect of effects) {
      if (effect.x < -80 || effect.x > WIDTH + 80 || effect.y < -80 || effect.y > HEIGHT + 80) continue;
      const alpha = Math.max(0, effect.life / effect.maxLife);
      context.globalAlpha = alpha * 0.86;
      context.strokeStyle = effect.color;
      context.fillStyle = effect.color;
      if (effect.kind === "ring") {
        context.lineWidth = Math.max(0.7, effect.width * alpha);
        context.beginPath();
        context.arc(effect.x, effect.y, effect.radius, 0, Math.PI * 2);
        context.stroke();
        continue;
      }
      const size = effect.size * (0.6 + alpha * 0.5);
      if (effect.kind === "spark") {
        context.lineWidth = Math.max(0.7, size * 0.55);
        context.beginPath();
        context.moveTo(effect.x - effect.vx * 1.8, effect.y - effect.vy * 1.8);
        context.lineTo(effect.x, effect.y);
        context.stroke();
      } else {
        context.save();
        context.translate(effect.x, effect.y);
        context.rotate(effect.rotation);
        context.fillRect(-size / 2, -size / 2, size, effect.kind === "shard" ? size * 0.55 : size);
        context.restore();
      }
    }
    context.globalAlpha = 1;
    for (const label of labels) {
      context.save();
      context.globalAlpha = Math.min(1, label.life / 14) * preset.glow;
      context.fillStyle = label.color;
      context.font = `800 ${label.size}px system-ui, sans-serif`;
      context.textAlign = "center";
      context.shadowColor = label.color;
      context.shadowBlur = 5 * preset.glow;
      context.fillText(label.text, label.x, label.y);
      context.restore();
    }
    context.globalAlpha = 1;
  }

  function clear() {
    while (effects.length) {
      const effect = effects.pop();
      if (pool.length < 500) pool.push(effect);
    }
    while (labels.length) {
      const label = labels.pop();
      if (labelPool.length < 16) labelPool.push(label);
    }
    cameraX = 0;
    cameraY = 0;
  }

  function getQuality() {
    return quality();
  }

  return {
    emit, update, draw, clear, applyCamera, getQuality, enabled, random,
    bounce, updateBallBounce, getBallBounceTransform
  };
})();
