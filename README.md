# VECTOR BREAK

**Crimson Arcade** — a local-first brick-breaker with evolving enemy tactics, ten handcrafted levels, and a three-phase boss finale.

## Play

Serve the repository over HTTP (service workers and installation require `localhost` or HTTPS):

```sh
python3 -m http.server 8000
```

Open <http://localhost:8000>. The game has no build step. Campaign progress, best score, settings, achievements, and unlocks are stored in the browser. Once loaded, the optional PWA shell is available offline.

## Controls

| Input | Action |
| --- | --- |
| Left / Right arrows or A / D | Move the paddle |
| Mouse movement or touch drag | Aim the paddle |
| Space or **Launch** | Launch or release a caught ball |
| E or **Ability** | Activate the equipped special ability |
| P, Escape, or **Pause** | Pause or resume |
| R | Restart |
| F | Fire while Laser Paddle is active |
| Controller left stick / D-pad | Move the paddle |
| Controller A / B / Start | Launch / activate ability / pause |

In Local Co-op, Player 1 uses the arrows and Player 2 uses A/D. Mouse or touch control targets the paddle on the corresponding half of the playfield.

## Campaign

The ten-level Crimson Sector introduces mechanics in stages instead of relying on speed increases:

1. Basic brick rows and standard invaders.
2. Scout formations and bonus bricks.
3. Armored targets and split formations.
4. Moving bricks and alternating enemy lines.
5. Explosive bricks and a tighter enemy formation.
6. Frozen bricks and splitter invaders.
7. Regenerating bricks and phantoms.
8. Portal bricks and shield generators.
9. Chain reactions and a mixed elite formation.
10. Armored and explosive targets alongside the three-phase Galactic Commander. Defeating it unlocks Endless.

The HUD tracks score, personal best, combo, lives, level, remaining targets, objective progress, and special ability energy. Paddle impact position aims the ball; centered sweet-spot hits award bonus points and energy, and destroying bricks or invaders also charges the meter. Choose Pulse, Overdrive, or Time Warp before launching. Ricocheting off three distinct falling shapes within ten seconds, without a paddle hit between them, earns a Tetris trick-shot bonus. Enemy projectiles threaten the paddle but cannot damage bricks.

## Other modes and features

- Classic Arcade, Endless (unlocked by the campaign), Time Attack, Boss Rush, Survival, Daily Challenge, Zen, and Local Co-op.
- Ten brick types, seven enemy types, ten collectible power-ups, locally saved achievements and statistics.
- Four complete palettes plus a persistent custom color editor, contrast validation, and live animated theme preview.
- An **Original (Legacy)** theme launches the authentic pre-modernization game in an isolated frame. Its original HTML, CSS, and JavaScript are preserved from upstream commit [`876816664f75c670a1542e2cd37df887c5d8ca30`](https://github.com/iherrick-mps/Super-Basic-Brick-Bounce-Game/commit/876816664f75c670a1542e2cd37df887c5d8ca30) under `legacy/`.
- Responsive pointer/touch input, keyboard and standard gamepad controls, fixed-step physics, and sub-stepped fast-ball collision checks.
- Falling connected polyomino obstacles with moving-surface ball bounces, level-scaled difficulty, and optional cosmetic-only impact effects.
- Perfect paddle hits and Tetris trick shots reward precision with bonus score and special energy; charge and activate Pulse, Overdrive, or Time Warp during modern gameplay.
- The Campaign finale features the Galactic Commander: a pixel-art boss with a phase-based projectile attack and a warning-led tractor beam that gently pulls balls toward its center. Its defeat awards a bonus and plays a non-colliding pixel-fragment animation. The commander also appears on alternating Boss Rush rounds and every 20th Endless level.
- Procedurally generated connected obstacle shapes, configurable Off/Low/Normal/High/Chaos density (3–5 active at Low and 5–8 at Normal), size and speed controls, and separate glow/particle preferences.
- Colorblind-friendly target markings, reduced motion, adjustable effects and audio, and automatic pause when the tab loses focus.
- Optional installable PWA shell. Crimson Arcade uses nearly black scenery, white interface text, red highlights and glow, color-coded bricks, and distinctive special-target/power-up colors.

## Screenshots

Genuine browser screenshots are not currently included. Add captures such as `screenshots/main-menu.png` and `screenshots/campaign-gameplay.png` when available; do not substitute mockups.

## Attribution and license

This repository is a modified fork of [iherrick-mps/Super-Basic-Brick-Bounce-Game](https://github.com/iherrick-mps/Super-Basic-Brick-Bounce-Game). The applicable GNU Affero General Public License v3.0 and its notices are retained in [LICENSE](./LICENSE). The game uses locally implemented canvas graphics and synthesized audio; no third-party art or audio assets are bundled.
