import { useEffect, useRef, useState, useCallback } from 'react';
import './ColorPicker.css';

function normalizeHex(hex) {
  if (!hex || typeof hex !== 'string') return null;
  let h = hex.trim();
  if (!h.startsWith('#')) h = `#${h}`;
  if (/^#([0-9a-fA-F]{3})$/.test(h)) {
    h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
  }
  if (/^#([0-9a-fA-F]{6})$/.test(h)) return h.toLowerCase();
  return null;
}

function hexToRgb(hex) {
  const n = normalizeHex(hex);
  if (!n) return null;
  const r = parseInt(n.slice(1, 3), 16);
  const g = parseInt(n.slice(3, 5), 16);
  const b = parseInt(n.slice(5, 7), 16);
  return { r, g, b };
}

function rgbToHsv({ r, g, b }) {
  const rN = r / 255;
  const gN = g / 255;
  const bN = b / 255;
  const max = Math.max(rN, gN, bN);
  const min = Math.min(rN, gN, bN);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rN) h = ((gN - bN) / d) % 6;
    else if (max === gN) h = (bN - rN) / d + 2;
    else h = (rN - gN) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : (d / max) * 100;
  const v = max * 100;
  return { h, s, v };
}

function hsvToRgb({ h, s, v }) {
  const sN = s / 100;
  const vN = v / 100;
  const c = vN * sN;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = vN - c;
  let r1 = 0, g1 = 0, b1 = 0;
  if (0 <= h && h < 60) { r1 = c; g1 = x; b1 = 0; }
  else if (60 <= h && h < 120) { r1 = x; g1 = c; b1 = 0; }
  else if (120 <= h && h < 180) { r1 = 0; g1 = c; b1 = x; }
  else if (180 <= h && h < 240) { r1 = 0; g1 = x; b1 = c; }
  else if (240 <= h && h < 300) { r1 = x; g1 = 0; b1 = c; }
  else { r1 = c; g1 = 0; b1 = x; }
  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

function hsvToHex(hsv) {
  const { r, g, b } = hsvToRgb(hsv);
  const toHex = (n) => n.toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToHsv(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return { h: 0, s: 0, v: 0 };
  return rgbToHsv(rgb);
}

export default function ColorPicker({ value, onChange, label, id }) {
  const [open, setOpen] = useState(false);
  const [hsv, setHsv] = useState(() => hexToHsv(value));
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });

  const wrapperRef = useRef(null);
  const svRef = useRef(null);
  const hueRef = useRef(null);

  // Sync when external value changes and picker is closed OR value is valid
  useEffect(() => {
    const norm = normalizeHex(value);
    if (norm) {
      const nextHsv = hexToHsv(norm);
      // Avoid overwriting hue when saturation is 0 (hue is lost) — preserve current hue
      setHsv((prev) => {
        // if external s==0, keep prev h
        if (nextHsv.s === 0) return { h: prev.h, s: nextHsv.s, v: nextHsv.v };
        // if external v==0, keep prev h/s
        if (nextHsv.v === 0) return { h: prev.h, s: prev.s, v: 0 };
        return nextHsv;
      });
    }
  }, [value]);

  const emit = useCallback((nextHsv) => {
    setHsv(nextHsv);
    const hex = hsvToHex(nextHsv);
    onChange(hex);
  }, [onChange]);

  // Compute popover position (fixed to avoid clipping inside modal with overflow)
  const updatePos = useCallback(() => {
    if (!wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const popW = 220;
    const popH = 220;
    const gap = 10;
    let top = rect.bottom + gap;
    let left = rect.left;
    // flip upward if not enough space below
    if (top + popH > window.innerHeight - 8) {
      top = rect.top - popH - gap;
      if (top < 8) top = Math.max(8, window.innerHeight - popH - 8);
    }
    // keep inside horizontal viewport
    if (left + popW > window.innerWidth - 8) {
      left = window.innerWidth - popW - 8;
    }
    if (left < 8) left = 8;
    setPopoverPos({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePos();
    const onResize = () => updatePos();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [open, updatePos]);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        // also check if click is inside popover when using fixed portal (still inside wrapper DOM, so already handled)
        // but popover is child of wrapper, so contains covers it — this check is for clicks outside
        setOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown, { passive: true });
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const handleSvPointer = useCallback((e) => {
    if (!svRef.current) return;
    const rect = svRef.current.getBoundingClientRect();
    const isTouch = e.touches && e.touches[0];
    const clientX = isTouch ? e.touches[0].clientX : e.clientX;
    const clientY = isTouch ? e.touches[0].clientY : e.clientY;
    let x = clientX - rect.left;
    let y = clientY - rect.top;
    x = Math.max(0, Math.min(rect.width, x));
    y = Math.max(0, Math.min(rect.height, y));
    const s = (x / rect.width) * 100;
    const v = 100 - (y / rect.height) * 100;
    const next = { ...hsv, s, v };
    emit(next);
  }, [hsv, emit]);

  const handleHuePointer = useCallback((e) => {
    if (!hueRef.current) return;
    const rect = hueRef.current.getBoundingClientRect();
    const isTouch = e.touches && e.touches[0];
    const clientX = isTouch ? e.touches[0].clientX : e.clientX;
    let x = clientX - rect.left;
    x = Math.max(0, Math.min(rect.width, x));
    const h = (x / rect.width) * 360;
    const next = { ...hsv, h };
    emit(next);
  }, [hsv, emit]);

  const bindDrag = (handler) => {
    const onMove = (ev) => handler(ev);
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onUp);
  };

  const onSvDown = (e) => {
    e.preventDefault();
    handleSvPointer(e);
    bindDrag(handleSvPointer);
  };

  const onHueDown = (e) => {
    e.preventDefault();
    handleHuePointer(e);
    bindDrag(handleHuePointer);
  };

  const normalized = normalizeHex(value);
  const displayHex = normalized || value || '#000000';
  // For invalid hex, show checker or fallback; swatch uses normalized or fallback
  const swatchBg = normalized || '#000000';

  // SV background hue color (full saturation/value)
  const hueColor = `hsl(${Math.round(hsv.h)}, 100%, 50%)`;

  return (
    <div className="cp-wrapper" ref={wrapperRef}>
      <button
        type="button"
        className="cp-swatch"
        style={{ background: swatchBg }}
        onClick={() => setOpen((o) => !o)}
        aria-label={label ? `${label} color, ${displayHex}. Click to open color picker` : `Pick color ${displayHex}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        id={id ? `${id}-swatch` : undefined}
      >
        <span className="cp-swatch-inner" aria-hidden />
      </button>

      {open && (
        <div className="cp-popover" role="dialog" aria-modal="false" aria-label={label ? `${label} color picker` : 'Color picker'} style={{ top: popoverPos.top, left: popoverPos.left }}>
          <div
            ref={svRef}
            className="cp-sv"
            style={{ background: hueColor }}
            onMouseDown={onSvDown}
            onTouchStart={onSvDown}
          >
            <div className="cp-sv-white" />
            <div className="cp-sv-black" />
            <div
              className="cp-cursor"
              style={{
                left: `${hsv.s}%`,
                top: `${100 - hsv.v}%`,
                background: hsvToHex(hsv),
              }}
            />
          </div>

          <div className="cp-hue-wrap">
            <div
              ref={hueRef}
              className="cp-hue"
              onMouseDown={onHueDown}
              onTouchStart={onHueDown}
              role="slider"
              aria-label="Hue"
              aria-valuemin={0}
              aria-valuemax={360}
              aria-valuenow={Math.round(hsv.h)}
              tabIndex={0}
              onKeyDown={(e) => {
                let nh = hsv.h;
                if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') nh = Math.max(0, hsv.h - 3);
                else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') nh = Math.min(360, hsv.h + 3);
                else if (e.key === 'Home') nh = 0;
                else if (e.key === 'End') nh = 360;
                else return;
                e.preventDefault();
                emit({ ...hsv, h: nh });
              }}
            >
              <div className="cp-hue-thumb" style={{ left: `${(hsv.h / 360) * 100}%` }} />
            </div>
          </div>

          <div className="cp-footer">
            <div className="cp-preview" style={{ background: hsvToHex(hsv) }} aria-hidden />
            <span className="cp-hex">{hsvToHex(hsv)}</span>
            {'EyeDropper' in window && (
              <button
                type="button"
                className="cp-eyedropper"
                title="Pick from screen"
                aria-label="Pick color from screen"
                onClick={async () => {
                  try {
                    // @ts-ignore
                    const ed = new window.EyeDropper();
                    const result = await ed.open();
                    if (result && result.sRGBHex) {
                      const hex = normalizeHex(result.sRGBHex);
                      if (hex) {
                        const nh = hexToHsv(hex);
                        emit(nh);
                      }
                    }
                  } catch {
                    // user cancelled
                  }
                }}
              >
                {/* simple pipette icon using unicode */}
                <span aria-hidden>⌖</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
