import { dark } from './dark.js';
import { light } from './light.js';

export const defaultThemes = {
  dark,
  light,
};

export const defaultThemeList = [dark, light];

// Helper to get theme by id from defaults
export const getDefaultTheme = (id) => defaultThemes[id] || null;

// All CSS variable keys used by the app (without -- prefix)
export const THEME_KEYS = [
  'bg',
  'main',
  'text',
  'sub',
  'subalt',
  'highlight',
  'unhighlight',
  'danger',
  'success',
];

// The 6 editable keys exposed in the theme creator
// These 6 will overwrite the most visible parts of the UI.
// Remaining keys (unhighlight, danger, success) are derived/defaulted automatically.
export const CREATOR_KEYS = [
  'bg',
  'main',
  'text',
  'sub',
  'subalt',
  'highlight',
];

export const CREATOR_LABELS = {
  bg: 'Background',
  main: 'Main',
  text: 'Text',
  sub: 'Sub',
  subalt: 'Sub Alt',
  highlight: 'Highlight',
};

export const CREATOR_DESCRIPTIONS = {
  bg: 'Page background',
  main: 'Cards & panels',
  text: 'Primary text',
  sub: 'Secondary text',
  subalt: 'Muted / borders',
  highlight: 'Accent / highlight',
};

// Apply a theme's colors to document root as CSS variables
export const applyThemeColors = (colors) => {
  if (typeof document === 'undefined') return;
  THEME_KEYS.forEach((key) => {
    if (colors[key]) {
      document.documentElement.style.setProperty(`--${key}`, colors[key]);
    }
  });
};

// Derive missing keys for a custom theme created with 6 colors
// For 6-color creator: unhighlight defaults to subalt with slight transparency via hex mix,
// danger/success fallback to sensible defaults if not provided.
export const completeCustomColors = (sixColors) => {
  const base = { ...sixColors };
  // Derive unhighlight if not present: use subalt if available, otherwise main
  if (!base.unhighlight) {
    // For custom 6-color themes, reuse subalt for border (unhighlight) if not explicitly set
    // If you want distinct borders, you can edit the theme file directly.
    base.unhighlight = base.subalt || base.main || '#1f2335';
  }
  if (!base.danger) base.danger = '#f7768e';
  if (!base.success) base.success = '#9ece6a';
  // Ensure all 6 creator keys exist
  CREATOR_KEYS.forEach((k) => {
    if (!base[k]) base[k] = '#000000';
  });
  return base;
};
