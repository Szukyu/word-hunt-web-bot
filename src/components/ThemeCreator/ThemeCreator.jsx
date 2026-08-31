import { useEffect, useMemo, useState } from 'react';
import { IoClose, IoBrushOutline, IoAdd, IoTrashOutline, IoPencil, IoTimeOutline, IoCheckmarkCircle, IoArrowBack, IoRefresh } from 'react-icons/io5';
import { useTheme } from '../../themes/ThemeContext.jsx';
import { CREATOR_KEYS, CREATOR_LABELS, CREATOR_DESCRIPTIONS } from '../../themes/index.js';
import './ThemeCreator.css';

const DEFAULT_SIX = {
  bg: '#080a18',
  main: '#0f1221',
  text: '#c0caf5',
  sub: '#7aa2f7',
  subalt: '#565f89',
  highlight: '#7dcfff',
};

const ThemeCreator = ({ isOpen, onClose }) => {
  const { activeThemeId, allThemes, setTheme, createTheme, updateTheme, deleteTheme } = useTheme();

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [colors, setColors] = useState(DEFAULT_SIX);

  // Reset form when opening/closing
  useEffect(() => {
    if (!isOpen) {
      setIsCreating(false);
      setEditingId(null);
      setName('');
      setColors(DEFAULT_SIX);
    }
  }, [isOpen]);

  const themesList = useMemo(() => Object.values(allThemes), [allThemes]);
  const isEditing = editingId !== null;
  const currentEditTheme = isEditing ? allThemes[editingId] : null;

  const startCreate = () => {
    // Prefill with active theme's 6 colors for easier tweaking
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
  };

  const handleColorChange = (key, value) => {
    // Allow any hex, normalize to include #
    let v = value.trim();
    if (!v.startsWith('#')) v = `#${v}`;
    // Keep raw if invalid, but store
    setColors((prev) => ({ ...prev, [key]: v }));
  };

  const handleHexInput = (key, value) => {
    setColors((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Validate hex
    const validated = {};
    for (const k of CREATOR_KEYS) {
      let v = colors[k];
      if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) {
        // Try to fallback to default
        alert(`Invalid color for ${CREATOR_LABELS[k]}: ${v}. Use hex like #ff00ff`);
        return;
      }
      validated[k] = v;
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

  const PREVIEW_LETTERS = ['W','O','R','D','H','U','N','T','G','A','M','E','P','L','A','Y'];
  const PREVIEW_HIGHLIGHT = [0, 1, 2, 3];

  const previewStyle = useMemo(() => {
    return {
      '--bg': colors.bg,
      '--main': colors.main,
      '--text': colors.text,
      '--sub': colors.sub,
      '--subalt': colors.subalt,
      '--highlight': colors.highlight,
      '--unhighlight': colors.subalt || colors.main,
      '--danger': colors.highlight || '#f7768e',
      '--success': colors.highlight || '#9ece6a',
    };
  }, [colors]);

  if (!isOpen) return null;

  return (
    <div className="theme-modal-overlay" onClick={onClose} role="presentation">
      <div className="theme-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Theme creator">
        <div className="theme-modal-header">
          <div className="theme-modal-title">
            <IoBrushOutline /> Theme
          </div>
          <button className="theme-modal-close" onClick={onClose} aria-label="Close theme modal">
            <IoClose />
          </button>
        </div>

        <div className="theme-modal-body">
          {/* Theme grid */}
          <section>
            <h3 className="theme-section-title">Select Theme</h3>
            <div className="theme-grid">
              {themesList.map((theme) => {
                const isActive = theme.id === activeThemeId;
                const isDefault = !theme.isCustom;
                return (
                  <div
                    key={theme.id}
                    className={`theme-card ${isActive ? 'active' : ''}`}
                    onClick={() => setTheme(theme.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setTheme(theme.id)}
                  >
                    <div className="theme-card-name">
                      <span>{theme.name}</span>
                      <span className={`theme-card-badge ${isActive ? 'active-badge' : ''}`}>
                        {isActive ? 'Active' : isDefault ? 'Default' : 'Custom'}
                      </span>
                    </div>
                    <div className="theme-swatches">
                      {CREATOR_KEYS.map((k) => (
                        <span
                          key={k}
                          className="theme-swatch"
                          style={{ background: theme.colors[k] }}
                          title={`${k}: ${theme.colors[k]}`}
                        />
                      ))}
                    </div>
                    {!isDefault && (
                      <div className="theme-card-actions" onClick={(e) => e.stopPropagation()}>
                        <button className="theme-card-action" onClick={() => startEdit(theme)} aria-label={`Edit ${theme.name}`}>
                          <IoPencil /> Edit
                        </button>
                        <button className="theme-card-action danger" onClick={() => deleteTheme(theme.id)} aria-label={`Delete ${theme.name}`}>
                          <IoTrashOutline />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <div className="theme-divider" />

          {/* Creator */}
          <section className="theme-creator-panel">
            <div className="theme-creator-header">
              <h3 className="theme-creator-title">{isEditing ? `Edit "${currentEditTheme?.name}"` : isCreating ? 'Create New Theme' : 'Create Theme from 6 Colors'}</h3>
              {!isCreating && (
                <button className="theme-creator-toggle" onClick={startCreate}>
                  <IoAdd /> New Theme
                </button>
              )}
            </div>

            {isCreating ? (
              <form className="theme-form" onSubmit={handleSubmit}>
                <div className="theme-name-row">
                  <label className="theme-label" htmlFor="theme-name">Theme Name</label>
                  <input
                    id="theme-name"
                    className="theme-name-input"
                    type="text"
                    placeholder="e.g. Midnight Purple"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={30}
                  />
                </div>

                <div className="theme-colors-grid">
                  {CREATOR_KEYS.map((key) => (
                    <div key={key} className="theme-color-field">
                      <div className="theme-color-label">
                        <span>{CREATOR_LABELS[key]}</span>
                      </div>
                      <span className="theme-color-desc">{CREATOR_DESCRIPTIONS[key]}</span>
                      <div className="theme-color-input-wrap">
                        <input
                          type="color"
                          className="theme-color-picker"
                          value={/^#([0-9a-fA-F]{6})$/.test(colors[key]) ? colors[key] : '#000000'}
                          onChange={(e) => handleColorChange(key, e.target.value)}
                          aria-label={`${CREATOR_LABELS[key]} color picker`}
                        />
                        <input
                          type="text"
                          className="theme-color-hex"
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

                {/* Accurate play-screen replica — mirrors Play.jsx */}
                <div className="theme-preview-board" style={previewStyle}>
                  <div className="board-preview-wrap">
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
                        {PREVIEW_LETTERS.map((letter, idx) => (
                          <div key={idx} className={`bp-tile ${PREVIEW_HIGHLIGHT.includes(idx) ? 'highlight' : ''}`}>{letter}</div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="theme-form-actions">
                  <button type="button" className="theme-btn secondary" onClick={handleCancel}>Cancel</button>
                  <button type="submit" className="theme-btn primary">{isEditing ? 'Save Changes' : 'Create Theme'}</button>
                </div>
              </form>
            ) : (
              <p className="theme-empty">
                Choose from default Light/Dark or create your own with 6 colors. Custom themes overwrite the entire page via CSS variables and are saved locally.
                Click “New Theme” to start.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default ThemeCreator;
