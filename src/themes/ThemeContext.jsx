import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { defaultThemes, applyThemeColors, completeCustomColors } from './index.js';

const ThemeContext = createContext(null);

const STORAGE_THEME_KEY = 'themeId';
const STORAGE_CUSTOM_THEMES_KEY = 'customThemes';
const STORAGE_LEGACY_THEME_KEY = 'theme'; // old toggle stored 'dark'/'light'

export const ThemeProvider = ({ children }) => {
  const [activeThemeId, setActiveThemeId] = useState(() => {
    if (typeof window === 'undefined') return 'dark';
    const stored = localStorage.getItem(STORAGE_THEME_KEY);
    if (stored) return stored;
    // Migrate legacy 'theme' key if present
    const legacy = localStorage.getItem(STORAGE_LEGACY_THEME_KEY);
    if (legacy && defaultThemes[legacy]) return legacy;
    return 'dark';
  });

  const [customThemes, setCustomThemes] = useState(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem(STORAGE_CUSTOM_THEMES_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      // Validate shape
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
      return {};
    } catch {
      return {};
    }
  });

  // Combined themes map: defaults + custom
  const allThemes = useMemo(() => {
    return { ...defaultThemes, ...customThemes };
  }, [customThemes]);

  const activeTheme = useMemo(() => {
    return allThemes[activeThemeId] || defaultThemes.dark;
  }, [allThemes, activeThemeId]);

  // Persist custom themes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CUSTOM_THEMES_KEY, JSON.stringify(customThemes));
    } catch {
      // ignore quota errors
    }
  }, [customThemes]);

  // Persist active theme id and apply colors
  useEffect(() => {
    // Apply colors overwrites entire theme via CSS variables
    const colors = activeTheme?.colors || defaultThemes.dark.colors;
    applyThemeColors(colors);
    // Keep data-theme for fallback CSS (index.css :root[data-theme="..."])
    document.documentElement.dataset.theme = activeThemeId;
    // Also set a generic attribute so CSS can target custom themes if needed
    document.documentElement.dataset.themeId = activeThemeId;
    try {
      localStorage.setItem(STORAGE_THEME_KEY, activeThemeId);
      // Also keep legacy key in sync for backward compat
      localStorage.setItem(STORAGE_LEGACY_THEME_KEY, activeThemeId);
    } catch {
      // ignore
    }
  }, [activeThemeId, activeTheme]);

  const setTheme = useCallback((id) => {
    if (!id) return;
    setActiveThemeId(id);
  }, []);

  const createTheme = useCallback(({ name, colors }) => {
    const id = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const completed = completeCustomColors(colors);
    const theme = {
      id,
      name: name?.trim() ? name.trim() : 'Custom Theme',
      colors: completed,
      isCustom: true,
    };
    setCustomThemes((prev) => ({ ...prev, [id]: theme }));
    setActiveThemeId(id);
    return id;
  }, []);

  const updateTheme = useCallback((id, { name, colors }) => {
    setCustomThemes((prev) => {
      const existing = prev[id];
      if (!existing) return prev;
      const nextColors = colors ? completeCustomColors({ ...existing.colors, ...colors }) : existing.colors;
      return {
        ...prev,
        [id]: {
          ...existing,
          name: name !== undefined ? (name.trim() || existing.name) : existing.name,
          colors: nextColors,
        },
      };
    });
  }, []);

  const deleteTheme = useCallback(
    (id) => {
      // Prevent deleting default themes
      if (defaultThemes[id]) return;
      setCustomThemes((prev) => {
        const { [id]: _, ...rest } = prev;
        return rest;
      });
      if (activeThemeId === id) {
        setActiveThemeId('dark');
      }
    },
    [activeThemeId]
  );

  const value = useMemo(
    () => ({
      activeThemeId,
      activeTheme,
      allThemes,
      customThemes,
      defaultThemes,
      setTheme,
      createTheme,
      updateTheme,
      deleteTheme,
    }),
    [activeThemeId, activeTheme, allThemes, customThemes, setTheme, createTheme, updateTheme, deleteTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
};

export default ThemeContext;
