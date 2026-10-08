const THEME_PRESETS = Object.freeze({
  crimson: {
    id: "crimson",
    name: "Crimson Arcade",
    description: "Premium black-and-red arcade aesthetic.",
    background: "#090A0E",
    surface: "#1A1B23",
    accent: "#E63946",
    accentSecondary: "#FF777C",
    accentTertiary: "#FFB2B7",
    text: "#F8FAFC",
    paddle: "#F8FAFC",
    ball: "#F8FAFC",
    brick: "#E63946",
    enemy: "#F8FAFC",
    projectile: "#FF777C"
  },
  cyber: {
    id: "cyber",
    name: "Neon Cyber",
    description: "Futuristic cyan and purple sci-fi interface.",
    background: "#080C1B",
    surface: "#15213A",
    accent: "#22D3EE",
    accentSecondary: "#A78BFA",
    accentTertiary: "#F472B6",
    text: "#F8FAFC",
    paddle: "#F8FAFC",
    ball: "#F8FAFC",
    brick: "#22D3EE",
    enemy: "#A78BFA",
    projectile: "#F472B6"
  },
  sunset: {
    id: "sunset",
    name: "Retro Sunset",
    description: "A vibrant arcade glow in pink, amber, and blue.",
    background: "#14091F",
    surface: "#35214A",
    accent: "#FF4D9D",
    accentSecondary: "#FFA552",
    accentTertiary: "#42C6FF",
    text: "#F8FAFC",
    paddle: "#F8FAFC",
    ball: "#F8FAFC",
    brick: "#FF4D9D",
    enemy: "#FFA552",
    projectile: "#42C6FF"
  },
  mint: {
    id: "mint",
    name: "Mint Circuit",
    description: "A clean digital environment with mint highlights.",
    background: "#101820",
    surface: "#1A2930",
    accent: "#64FFDA",
    accentSecondary: "#FFE66D",
    accentTertiary: "#FF6B6B",
    text: "#F8FAFC",
    paddle: "#F8FAFC",
    ball: "#F8FAFC",
    brick: "#64FFDA",
    enemy: "#FFE66D",
    projectile: "#FF6B6B"
  }
});

const CUSTOM_THEME_FIELDS = [
  { key: "background", label: "Background Color" },
  { key: "surface", label: "Interface Color" },
  { key: "paddle", label: "Paddle Color" },
  { key: "ball", label: "Ball Color" },
  { key: "brick", label: "Brick Color" },
  { key: "enemy", label: "Enemy Color" },
  { key: "projectile", label: "Projectile Color" },
  { key: "accent", label: "Primary Accent Color" },
  { key: "accentSecondary", label: "Secondary Accent Color" },
  { key: "text", label: "Text Color" }
];

let gameTheme = { ...THEME_PRESETS.crimson };

function isValidThemeColor(value) {
  return typeof value === "string" && /^#[\da-f]{6}$/i.test(value);
}

function getThemeContrast(first, second) {
  const luminance = (color) => {
    const channels = color.slice(1).match(/../g).map((channel) => parseInt(channel, 16) / 255)
      .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function isReadableTheme(theme) {
  return isValidThemeColor(theme.text) &&
    isValidThemeColor(theme.background) &&
    isValidThemeColor(theme.surface) &&
    getThemeContrast(theme.text, theme.background) >= 4.5 &&
    getThemeContrast(theme.text, theme.surface) >= 4.5;
}

function setGameTheme(theme) {
  gameTheme = { ...theme };
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const variables = {
    "--background": gameTheme.background,
    "--surface": gameTheme.surface,
    "--interface-color": gameTheme.surface,
    "--panel": gameTheme.surface,
    "--accent": gameTheme.accent,
    "--accent-warm": gameTheme.accentSecondary,
    "--accent-secondary": gameTheme.accentSecondary,
    "--accent-tertiary": gameTheme.accentTertiary,
    "--text-color": gameTheme.text,
    "--ball-color": gameTheme.ball,
    "--paddle-color": gameTheme.paddle,
    "--brick-color": gameTheme.brick,
    "--enemy-color": gameTheme.enemy,
    "--projectile-color": gameTheme.projectile
  };
  for (const [name, value] of Object.entries(variables)) {
    root.style.setProperty(name, value);
  }
  document.body.dataset.theme = gameTheme.id;
}
