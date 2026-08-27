import React, { useState } from 'react';
import { Globe, Loader2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface TranslateControlProps {
  /** Short label above the control. Defaults to "App Language". */
  label?: string;
  /** Optional helper copy under the label. */
  description?: string;
  /** Pass a dark-panel style when the surrounding UI is on a light background. */
  variant?: 'dark' | 'light';
}

/**
 * Dropped into every business dashboard's settings screen and into the
 * customer settings panel. Selecting a language here calls the shared
 * LanguageContext, which live-translates the ENTIRE app — not just this
 * component — so this same control works no matter which dashboard it's
 * mounted in, with zero per-dashboard translation logic required.
 */
export const TranslateControl: React.FC<TranslateControlProps> = ({
  label = 'App Language',
  description = 'Translates the whole app — every screen, every dashboard.',
  variant = 'dark',
}) => {
  const { language, languages, isTranslating, setLanguage } = useLanguage();
  const [open, setOpen] = useState(false);
  const isDark = variant === 'dark';

  const current = languages.find((l) => l.code === language)?.name || 'English';

  return (
    <div data-no-translate style={{ position: 'relative' }}>
      {label && (
        <label
          style={{
            display: 'block',
            fontSize: '12px',
            fontWeight: 600,
            marginBottom: '4px',
            color: isDark ? '#e2e8f0' : '#111827',
          }}
        >
          {label}
        </label>
      )}
      {description && (
        <p style={{ fontSize: '11px', opacity: 0.6, margin: '0 0 8px', color: isDark ? '#cbd5e1' : '#4b5563' }}>
          {description}
        </p>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          background: isDark ? 'transparent' : '#ffffff',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.2)' : '#d1d5db'}`,
          borderRadius: '8px',
          padding: '12px',
          color: isDark ? '#ffffff' : '#111827',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 600,
          boxSizing: 'border-box',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Globe size={14} />
          {current}
        </span>
        {isTranslating ? <Loader2 size={14} className="animate-spin" /> : <span style={{ opacity: 0.5, fontSize: '11px' }}>{open ? '▲' : '▼'}</span>}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            zIndex: 30,
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            maxHeight: '260px',
            overflowY: 'auto',
            background: isDark ? '#0f172a' : '#ffffff',
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#d1d5db'}`,
            borderRadius: '10px',
            boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
            padding: '6px',
          }}
        >
          {languages.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => {
                setLanguage(l.code);
                setOpen(false);
              }}
              style={{
                width: '100%',
                textAlign: 'left',
                padding: '8px 10px',
                borderRadius: '6px',
                border: 'none',
                background: l.code === language ? (isDark ? 'rgba(255,255,255,0.08)' : '#f3f4f6') : 'transparent',
                color: isDark ? '#e2e8f0' : '#111827',
                fontSize: '12.5px',
                fontWeight: l.code === language ? 700 : 500,
                cursor: 'pointer',
              }}
            >
              {l.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TranslateControl;
