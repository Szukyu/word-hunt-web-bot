import { dark } from './dark.js';
import { light } from './light.js';

export const midnight = {
  id: 'midnight',
  name: 'Midnight',
  colors: {
    bg: '#0a0e1a',
    main: '#141b2d',
    text: '#cbd5e1',
    sub: '#60a5fa',
    subalt: '#334155',
    highlight: '#3b82f6',
    unhighlight: '#1e293b',
    danger: '#f43f5e',
    success: '#22c55e',
  },
};

export const nord = {
  id: 'nord',
  name: 'Nord',
  colors: {
    bg: '#2e3440',
    main: '#3b4252',
    text: '#eceff4',
    sub: '#88c0d0',
    subalt: '#4c566a',
    highlight: '#81a1c1',
    unhighlight: '#434c5e',
    danger: '#bf616a',
    success: '#a3be8c',
  },
};

export const dracula = {
  id: 'dracula',
  name: 'Dracula',
  colors: {
    bg: '#282a36',
    main: '#383a59',
    text: '#f8f8f2',
    sub: '#bd93f9',
    subalt: '#6272a4',
    highlight: '#ff79c6',
    unhighlight: '#44475a',
    danger: '#ff5555',
    success: '#50fa7b',
  },
};

export const solarizedDark = {
  id: 'solarized-dark',
  name: 'Solarized Dark',
  colors: {
    bg: '#002b36',
    main: '#073642',
    text: '#839496',
    sub: '#268bd2',
    subalt: '#586e75',
    highlight: '#2aa198',
    unhighlight: '#0a3a4a',
    danger: '#dc322f',
    success: '#859900',
  },
};

export const solarizedLight = {
  id: 'solarized-light',
  name: 'Solarized Light',
  colors: {
    bg: '#fdf6e3',
    main: '#eee8d5',
    text: '#657b83',
    sub: '#268bd2',
    subalt: '#93a1a1',
    highlight: '#cb4b16',
    unhighlight: '#d9d0bb',
    danger: '#dc322f',
    success: '#859900',
  },
};

export const catppuccinMocha = {
  id: 'catppuccin-mocha',
  name: 'Catppuccin Mocha',
  colors: {
    bg: '#1e1e2e',
    main: '#313244',
    text: '#cdd6f4',
    sub: '#cba6f7',
    subalt: '#585b70',
    highlight: '#f5c2e7',
    unhighlight: '#45475a',
    danger: '#f38ba8',
    success: '#a6e3a1',
  },
};

export const gruvbox = {
  id: 'gruvbox',
  name: 'Gruvbox',
  colors: {
    bg: '#282828',
    main: '#3c3836',
    text: '#ebdbb2',
    sub: '#fe8019',
    subalt: '#928374',
    highlight: '#fabd2f',
    unhighlight: '#504945',
    danger: '#fb4934',
    success: '#b8bb26',
  },
};

export const tokyoNight = {
  id: 'tokyo-night',
  name: 'Tokyo Night',
  colors: {
    bg: '#1a1b26',
    main: '#24283b',
    text: '#c0caf5',
    sub: '#7aa2f7',
    subalt: '#565f89',
    highlight: '#7dcfff',
    unhighlight: '#414868',
    danger: '#f7768e',
    success: '#9ece6a',
  },
};

export const oledBlack = {
  id: 'oled-black',
  name: 'OLED Black',
  colors: {
    bg: '#000000',
    main: '#121212',
    text: '#e5e5e5',
    sub: '#a3a3a3',
    subalt: '#52525b',
    highlight: '#ffffff',
    unhighlight: '#27272a',
    danger: '#ef4444',
    success: '#22c55e',
  },
};

export const pastel = {
  id: 'pastel',
  name: 'Pastel',
  colors: {
    bg: '#fdf2f8',
    main: '#fce7f3',
    text: '#831843',
    sub: '#ec4899',
    subalt: '#f9a8d4',
    highlight: '#db2777',
    unhighlight: '#fbcfe8',
    danger: '#e11d48',
    success: '#10b981',
  },
};

export const defaultThemes = {
  dark,
  light,
  midnight,
  nord,
  dracula,
  'solarized-dark': solarizedDark,
  'solarized-light': solarizedLight,
  'catppuccin-mocha': catppuccinMocha,
  gruvbox,
  'tokyo-night': tokyoNight,
  'oled-black': oledBlack,
  pastel,
};

export const defaultThemeList = [
  dark,
  light,
  midnight,
  nord,
  dracula,
  solarizedDark,
  solarizedLight,
  catppuccinMocha,
  gruvbox,
  tokyoNight,
  oledBlack,
  pastel,
];

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

export const completeCustomColors = (sixColors) => {
  const base = { ...sixColors };
  if (!base.unhighlight) {
    base.unhighlight = base.subalt || base.main || '#1f2335';
  }
  if (!base.danger) base.danger = '#f7768e';
  if (!base.success) base.success = base.highlight ? base.highlight : '#9ece6a';
  CREATOR_KEYS.forEach((k) => {
    if (!base[k]) base[k] = '#000000';
  });
  return base;
};
