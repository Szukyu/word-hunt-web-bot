import { useMemo, useState } from 'react';
import { IoAdd, IoTrashOutline, IoPencil, IoTimeOutline, IoCheckmarkCircle, IoArrowBack, IoRefresh, IoClose } from 'react-icons/io5';
import { useTheme } from '../../themes/ThemeContext.jsx';
import { CREATOR_KEYS, CREATOR_LABELS, CREATOR_DESCRIPTIONS } from '../../themes/index.js';
import './ThemePage.css';

const DEFAULT_SIX = {
  bg: '#080a18',
  main: '#0f1221',
  text: '#c0caf5',
  sub: '#7aa2f7',
  subalt: '#565f89',
  highlight: '#7dcfff',
};

// Small preview board - 4x4 with sample letters
const PREVIEW_LETTERS = ['W','O','R','D','H','U','N','T','G','A','M','E','P','L','A','Y'];
// highlight a contiguous path like W-O-R-D (0-1-2-3) to demo selected tiles
const PREVIEW_HIGHLIGHT = [0, 1, 2, 3];

const BoardPreview = ({ colors }) => {
  const style = {
    '--bg': colors.bg,
    '--main': colors.main,
    '--text': colors.text,
    '--sub': colors.sub,
    '--subalt': colors.subalt,
    '--highlight': colors.highlight,
    '--unhighlight': colors.unhighlight || colors.subalt || colors.main,
    '--danger': colors.danger || '#f7768e',
    '--success': colors.success || '#9ece6a',
  };

  return (
    <div className="board-preview-wrap" style={style}>
      <div className="board-preview-header">
        <span className="bp-icon-btn" aria-hidden><IoArrowBack /></span>
        <span className="bp-stats">
          <span className="bp-stat"><IoTimeOutline className="bp-stat-icon" /> 1:24</span>
          <span className="bp-stat"><IoCheckmarkCircle className="bp-stat-icon" /> 12 pts</span>
        </span>
        <span className="bp-icon-btn" aria-hidden><IoRefresh /></span>
      </div>
      <div className="board-preview-board">
        <div className="bp-current-word">WORD</div>
        <div className="bp-grid">
          {PREVIEW_LETTERS.map((letter, idx) => {
            const isHighlighted = PREVIEW_HIGHLIGHT.includes(idx);
            return (
              <div key={idx} className={`bp-tile ${isHighlighted ? 'highlight' : ''}`}>
                {letter}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const ThemePage = ({ onBack }) => {
  const { activeThemeId, allThemes, setTheme, createTheme, updateTheme, deleteTheme } = useTheme();

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [colors, setColors] = useState(DEFAULT_SIX);
  const [filter, setFilter] = useState('');

  const themesList = useMemo(() => {
    const all = Object.values(allThemes);
    if (!filter.trim()) return all;
    const q = filter.toLowerCase();
    return all.filter(t => t.name.toLowerCase().includes(q) || t.id.toLowerCase().includes(q));
  }, [allThemes, filter]);

  const defaultThemesList = useMemo(() => themesList.filter(t => !t.isCustom), [themesList]);
  const customThemesList = useMemo(() => themesList.filter(t => t.isCustom), [themesList]);

  const isEditing = editingId !== null;
  const currentEditTheme = isEditing ? allThemes[editingId] : null;

  const leftKeys = CREATOR_KEYS.slice(0, 3); // bg, main, text
  const rightKeys = CREATOR_KEYS.slice(3, 6); // sub, subalt, highlight

  const startCreate = () => {
    const active = allThemes[activeThemeId];
    if (active) {
      const next = {};
      CREATOR_KEYS.forEach((k) => {
        next[k] = active.colors[k] || DEFAULT_SIX[k];
      });
      setColors(next);
    } else {
      setColors(DEFAULT_SIX);
    }
    setName('');
    setEditingId(null);
    setIsCreating(true);
  };

  const startEdit = (theme) => {
    const next = {};
    CREATOR_KEYS.forEach((k) => {
      next[k] = theme.colors[k] || DEFAULT_SIX[k];
    });
    setColors(next);
    setName(theme.name);
    setEditingId(theme.id);
    setIsCreating(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleColorChange = (key, value) => {
    let v = value.trim();
    if (!v.startsWith('#')) v = `#${v}`;
    setColors((prev) => ({ ...prev, [key]: v }));
  };

  const handleHexInput = (key, value) => {
    setColors((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validated = {};
    for (const k of CREATOR_KEYS) {
      let v = colors[k];
      if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) {
        alert(`Invalid color for ${CREATOR_LABELS[k]}: ${v}. Use hex like #ff00ff`);
        return;
      }
      // normalize 3-char to 6-char?
      if (v.length === 4) {
        v = '#' + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
      }
      validated[k] = v.toLowerCase();
    }
    if (isEditing) {
      updateTheme(editingId, { name, colors: validated });
      setIsCreating(false);
      setEditingId(null);
    } else {
      createTheme({ name: name || 'Custom Theme', colors: validated });
      setIsCreating(false);
    }
    setName('');
  };

  const handleCancel = () => {
    setIsCreating(false);
    setEditingId(null);
    setName('');
    setColors(DEFAULT_SIX);
  };

  const previewColors = useMemo(() => {
    return {
      bg: colors.bg,
      main: colors.main,
      text: colors.text,
      sub: colors.sub,
      subalt: colors.subalt,
      highlight: colors.highlight,
      unhighlight: colors.subalt || colors.main,
      danger: colors.highlight || '#f7768e',
      success: colors.highlight || '#9ece6a',
    };
  }, [colors]);

  return (
    <div className="theme-page">
      <div className="theme-page-header">
        <div className="theme-page-header-left">
          <button className="theme-back-btn" onClick={onBack} aria-label="Back">
            Back
          </button>
          <div className="theme-page-title-wrap">
            <p className="theme-eyebrow">Customize</p>
            <h1 className="theme-page-title">Themes</h1>
          </div>
        </div>
        <div className="theme-page-search">
          <input
            type="text"
            placeholder="Search themes..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="theme-search-input"
            aria-label="Search themes"
          />
        </div>
      </div>

      {/* Creator - Monkeytype style: 3 left, board center, 3 right */}
      <section className="monkey-creator-section">
        <div className="monkey-creator-header">
          {isCreating ? (
            <h2 className="theme-section-title">{isEditing ? `Editing: ${currentEditTheme?.name}` : 'Create Custom Theme'}</h2>
          ) : (
            <button className="monkey-new-btn create-theme-btn" onClick={startCreate}>
              <IoAdd /> Create Theme
            </button>
          )}
        </div>

        {isCreating ? (
          <form className="monkey-creator" onSubmit={handleSubmit}>
            <div className="monkey-creator-top">
              <input
                id="theme-name"
                className="monkey-name-input"
                type="text"
                placeholder="Theme Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={30}
                aria-label="Theme name"
              />
            </div>

            <div className="monkey-creator-body">
              {/* Left side - 3 colors */}
              <div className="monkey-side left">
                {leftKeys.map((key) => (
                  <div key={key} className="monkey-color-field">
                    <div className="monkey-color-label">
                      <span className="monkey-label">{CREATOR_LABELS[key]}</span>
                      <span className="monkey-desc">{CREATOR_DESCRIPTIONS[key]}</span>
                    </div>
                    <div className="monkey-color-input-wrap">
                      <input
                        type="color"
                        className="monkey-color-picker"
                        value={/^#([0-9a-fA-F]{6})$/.test(colors[key]) ? colors[key] : '#000000'}
                        onChange={(e) => handleColorChange(key, e.target.value)}
                        aria-label={`${CREATOR_LABELS[key]} picker`}
                      />
                      <input
                        type="text"
                        className="monkey-hex-input"
                        value={colors[key]}
                        onChange={(e) => handleHexInput(key, e.target.value)}
                        placeholder="#000000"
                        maxLength={7}
                        aria-label={`${CREATOR_LABELS[key]} hex`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Center - Board preview */}
              <div className="monkey-center">
                <BoardPreview colors={previewColors} />
                <div className="monkey-preview-caption">Live board preview</div>
              </div>

              {/* Right side - 3 colors */}
              <div className="monkey-side right">
                {rightKeys.map((key) => (
                  <div key={key} className="monkey-color-field">
                    <div className="monkey-color-label">
                      <span className="monkey-label">{CREATOR_LABELS[key]}</span>
                      <span className="monkey-desc">{CREATOR_DESCRIPTIONS[key]}</span>
                    </div>
                    <div className="monkey-color-input-wrap">
                      <input
                        type="color"
                        className="monkey-color-picker"
                        value={/^#([0-9a-fA-F]{6})$/.test(colors[key]) ? colors[key] : '#000000'}
                        onChange={(e) => handleColorChange(key, e.target.value)}
                        aria-label={`${CREATOR_LABELS[key]} picker`}
                      />
                      <input
                        type="text"
                        className="monkey-hex-input"
                        value={colors[key]}
                        onChange={(e) => handleHexInput(key, e.target.value)}
                        placeholder="#000000"
                        maxLength={7}
                        aria-label={`${CREATOR_LABELS[key]} hex`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="monkey-actions">
              <button type="button" className="monkey-btn secondary" onClick={handleCancel}>Cancel</button>
              <button type="submit" className="monkey-btn primary">{isEditing ? 'Save Changes' : 'Create Theme'}</button>
            </div>
          </form>
        ) : null}
      </section>

      {/* Theme lists - monkeytype style rows */}
      <section className="theme-list-section">
        <h2 className="theme-section-title">Default Themes</h2>
        <div className="monkey-theme-list">
          {defaultThemesList.length === 0 ? (
            <p className="theme-empty">No themes match “{filter}”</p>
          ) : (
            defaultThemesList.map((theme) => {
              const isActive = theme.id === activeThemeId;
              const rowStyle = {
                '--bg': theme.colors.bg,
                '--main': theme.colors.main,
                '--text': theme.colors.text,
                '--sub': theme.colors.sub,
                '--subalt': theme.colors.subalt,
                '--highlight': theme.colors.highlight,
                '--unhighlight': theme.colors.unhighlight,
                '--danger': theme.colors.danger,
                '--success': theme.colors.success,
              };
              return (
                <button
                  key={theme.id}
                  className={`monkey-theme-row ${isActive ? 'active' : ''}`}
                  onClick={() => setTheme(theme.id)}
                  style={rowStyle}
                >
                  <span className="monkey-theme-name">{theme.name}</span>
                  <span className="monkey-theme-dots">
                    {CREATOR_KEYS.map((k) => (
                      <span key={k} className="monkey-dot" style={{ background: theme.colors[k] }} title={`${k}: ${theme.colors[k]}`} />
                    ))}
                  </span>
                  {isActive ? (
                    <span className="monkey-theme-actions" onClick={(e) => e.stopPropagation()}>
                      <span className="monkey-active-badge">active</span>
                    </span>
                  ) : null}
                </button>
              );
            })
          )}
        </div>
      </section>

      <section className="theme-list-section">
        <div className="theme-section-header-row">
          <h2 className="theme-section-title">Your Custom Themes</h2>
          <span className="theme-count">{customThemesList.length} saved</span>
        </div>
        {customThemesList.length === 0 ? null : (
          <div className="monkey-theme-list">
            {customThemesList.map((theme) => {
              const isActive = theme.id === activeThemeId;
              const rowStyle = {
                '--bg': theme.colors.bg,
                '--main': theme.colors.main,
                '--text': theme.colors.text,
                '--sub': theme.colors.sub,
                '--subalt': theme.colors.subalt,
                '--highlight': theme.colors.highlight,
                '--unhighlight': theme.colors.unhighlight,
                '--danger': theme.colors.danger,
                '--success': theme.colors.success,
              };
              return (
                <div key={theme.id} className={`monkey-theme-row custom ${isActive ? 'active' : ''}`} style={rowStyle}>
                  <button className="monkey-theme-row-main" onClick={() => setTheme(theme.id)}>
                    <span className="monkey-theme-name">{theme.name}</span>
                    <span className="monkey-theme-dots">
                      {CREATOR_KEYS.map((k) => (
                        <span key={k} className="monkey-dot" style={{ background: theme.colors[k] }} title={`${k}: ${theme.colors[k]}`} />
                      ))}
                    </span>
                    {isActive && <span className="monkey-active-badge">active</span>}
                  </button>
                  <span className="monkey-theme-actions">
                    <button className="monkey-row-action" onClick={() => startEdit(theme)} title="Edit"><IoPencil /></button>
                    <button className="monkey-row-action danger" onClick={() => deleteTheme(theme.id)} title="Delete"><IoTrashOutline /></button>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};

export default ThemePage;
