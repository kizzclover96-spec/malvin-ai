import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { QrCode, Tag, X } from 'lucide-react';
import VinBackTagCreate from './VinBackTagCreate';
import VinBackTagList from './VinBackTagList';

/**
 * VINBACK — GLOBAL BUSINESS DASHBOARD LAUNCHER
 * ---------------------------------------------------------------------------
 * VinBackTagCreate / VinBackTagList already exist as fully self-contained
 * modals (they only need `onClose`, and read/write Firestore off
 * `auth.currentUser.uid` directly) — they were previously only reachable
 * from the customer settings panel (Front.tsx). This wraps them in one
 * small floating launcher and is mounted ONCE, globally, in App.jsx next to
 * FloatingTeamHub, under the same "currently on a business dashboard"
 * condition — so every business dashboard (salon, hotel, mechanic, service,
 * food, and the generic merchant dashboard) gets Create Tag / All Tags
 * without needing its own copy wired in.
 */
export const VinBackLauncher: React.FC = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);

  return (
    <>
      <div style={{ position: 'fixed', left: '20px', bottom: '92px', zIndex: 3500 }}>
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              style={{
                position: 'absolute',
                bottom: '56px',
                left: 0,
                background: '#0f172a',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: '14px',
                padding: '6px',
                width: '190px',
                boxShadow: '0 12px 30px rgba(0,0,0,0.4)',
              }}
            >
              <button
                type="button"
                onClick={() => { setMenuOpen(false); setCreateOpen(true); }}
                style={menuItemStyle}
              >
                <QrCode size={14} /> Create VinBack Tag
              </button>
              <button
                type="button"
                onClick={() => { setMenuOpen(false); setListOpen(true); }}
                style={menuItemStyle}
              >
                <Tag size={14} /> All Tags
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="VinBack tags"
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: 'none',
            background: '#E53935',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 20px rgba(229,57,53,0.4)',
            cursor: 'pointer',
          }}
        >
          {menuOpen ? <X size={20} /> : <Tag size={20} />}
        </button>
      </div>

      <AnimatePresence>
        {createOpen && (
          <VinBackTagCreate onClose={() => setCreateOpen(false)} onCreated={() => setCreateOpen(false)} />
        )}
        {listOpen && <VinBackTagList onClose={() => setListOpen(false)} />}
      </AnimatePresence>
    </>
  );
};

const menuItemStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  textAlign: 'left',
  padding: '10px 12px',
  borderRadius: '8px',
  border: 'none',
  background: 'transparent',
  color: '#e2e8f0',
  fontSize: '12.5px',
  fontWeight: 700,
  cursor: 'pointer',
};

export default VinBackLauncher;
