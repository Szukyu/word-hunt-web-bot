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

// Determine if Theme is "Dark"
export const isDarkColor = (hex) => {
  if (!hex || typeof hex !== 'string') return true;
  let h = hex.replace('#', '').trim();
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6) return true;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  // relative luminance (sRGB)
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum < 0.5;
};

// Apply a theme's colors to document root as CSS variables
export const applyThemeColors = (colors) => {
  if (typeof document === 'undefined') return;
  THEME_KEYS.forEach((key) => {
    if (colors[key]) {
      document.documentElement.style.setProperty(`--${key}`, colors[key]);
    }
  });

  // Keep browser UI (scrollbar, form controls) in sync with bg brightness
  if (colors.bg) {
    const scheme = isDarkColor(colors.bg) ? 'dark' : 'light';
    document.documentElement.style.setProperty('color-scheme', scheme);
		// Fallback
    document.documentElement.dataset.appliedScheme = scheme;
  }
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
