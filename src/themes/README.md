# Themes

This folder holds all theme definitions and the theme provider.

## Structure

- `dark.js` – Dark default theme
- `light.js` – Light default theme
- `index.js` – Aggregates defaults, exports helpers & 6-color creator config
- `ThemeContext.jsx` – React context that applies themes via CSS variables and persists to localStorage

## Adding a new default theme

1. Create a new file `src/themes/<name>.js`, e.g. `ocean.js`:

```js
export const ocean = {
  id: 'ocean',
  name: 'Ocean',
  colors: {
    bg: '#0a1620',
    main: '#112233',
    text: '#c5e3ff',
    sub: '#6aa8ff',
    subalt: '#4a6a88',
    highlight: '#4dd0e1',
    unhighlight: '#1c2e42',
    danger: '#ff6467',
    success: '#7acc8a',
  },
};
```

2. Import and add it to `index.js`:

```js
import { ocean } from './ocean.js';
export const defaultThemes = { dark, light, ocean };
```

The new theme will automatically appear in the Theme page grid. No other changes required.

## 6-Color Creator

Custom themes are created from 6 colors (Background, Main, Text, Sub, Sub Alt, Highlight). 
The creator UI (`src/components/ThemePage/ThemePage.jsx`) collects those 6 and `completeCustomColors()` in `index.js` derives the remaining variables:

- `unhighlight` → falls back to `subalt` (border color)
- `danger` / `success` → default red/green if not supplied

This keeps custom themes minimal while still overwriting the *entire* page theme via `applyThemeColors()` which sets all `var(--*)` inline on `document.documentElement`.

All themes (including customs) are stored in localStorage under `customThemes` and `themeId` and re-applied on reload.
