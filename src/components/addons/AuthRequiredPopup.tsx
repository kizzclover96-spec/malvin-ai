import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase';

interface AuthRequiredPopupProps {
  /**
   * Kept for call-site compatibility (every store still passes its own
   * `/service/${uid}`-style path in) — currently unused, see the removed-
   * savePendingDeepLink note in git history for why that's deliberate.
   * Fine to drop from callers whenever they're next touched.
   */
  targetPath: string;
}

/**
 * SIGNED-OUT / NOT-EMBEDDED BACKSTOP
 * ---------------------------------------------------------------------------
 * Went through two designs before this one, both of which raced a fixed
 * timeout against something async and lost in production:
 *
 *   1. Raw Firebase Auth state — fragile because StoreFront's iframe is a
 *      fresh browsing context that doesn't share the parent app's session.
 *   2. A one-off "handshake token" StoreFront.tsx posted down over
 *      postMessage, with a few-second timeout before giving up — fragile
 *      because ANYTHING that delayed that postMessage past the timeout
 *      (a slow Cloud Functions cold start minting the auth custom token,
 *      in the version that actually shipped) made the popup show even for
 *      a customer genuinely inside the app, and once the timeout fired it
 *      was final — a token arriving a moment later didn't un-show it.
 *
 * This version doesn't race anything. `window.top === window.self` is a
 * synchronous, instant, purely structural check — either this document IS
 * the top-level browsing context or it ISN'T, and nothing about network
 * timing can change the answer. The only thing that can ever put this page
 * inside a frame at all is StoreFront.tsx's <iframe> (stores.malvinai.com's
 * own CSP frame-ancestors only allows the app shell's origin to frame it —
 * see firebase.json), so "inside a frame" and "properly embedded" are the
 * same fact here. Embedded → never show anything, full stop, no waiting on
 * anything to arrive. Standalone (a direct link, a QR scan, a bookmark) →
 * show it unless this origin's own Firebase Auth already has a real,
 * signed-in user — checked via onAuthStateChanged, which reflects actual
 * auth state as it resolves rather than guessing off a timer.
 *
 * Real permission enforcement for actually placing an order / booking /
 * sending a request still lives server-side in Firestore's isSignedIn()
 * rules regardless of any of this — this is only about explaining *why* a
 * plain, unwrapped visit needs the app.
 */
export const AuthRequiredPopup: React.FC<AuthRequiredPopupProps> = () => {
  const navigate = useNavigate();
  // Structural check, not state — this can't change after mount (a page
  // doesn't move in or out of an iframe), so it's fine to read once here
  // rather than via useState/useEffect.
  const isEmbedded = typeof window !== 'undefined' && window.top !== window.self;

  // null = still waiting on Firebase Auth's initial state, true = a real
  // signed-in user exists on THIS origin, false = confirmed signed out.
  const [hasUser, setHasUser] = useState<boolean | null>(null);

  useEffect(() => {
    if (isEmbedded) return; // never needed — nothing to gate
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setHasUser(!!user);
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (isEmbedded) return null;
  if (hasUser !== false) return null; // still resolving, or genuinely signed in

  return (
    <div style={overlayStyle}>
      <div style={cardStyle}>
        <p style={titleStyle}>Log in to MalvinAI to continue</p>
        <p style={bodyStyle}>
          You'll need a MalvinAI account to place an order, book, or send a request. It only takes a moment.
        </p>
        <button style={primaryButtonStyle} onClick={() => navigate('/')}>
          Log in to MalvinAI
        </button>
      </div>
    </div>
  );
};

// Same plain-inline-style reasoning as everywhere else this pattern
// appears: this popup is what a not-yet-onboarded visitor sees, so it
// can't be left depending on a Tailwind build that may or may not apply.
const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.72)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  zIndex: 9999, padding: '20px',
};
const cardStyle: React.CSSProperties = {
  background: '#ffffff', borderRadius: '18px', padding: '26px 22px',
  width: '100%', maxWidth: '320px', textAlign: 'center',
  boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
};
const titleStyle: React.CSSProperties = {
  margin: '4px 0 6px', fontSize: '15px', fontWeight: 900, color: '#0f172a',
};
const bodyStyle: React.CSSProperties = {
  margin: '0 0 18px', fontSize: '12.5px', color: '#64748b', lineHeight: 1.5,
};
const primaryButtonStyle: React.CSSProperties = {
  width: '100%', padding: '12px', borderRadius: '12px', border: 'none',
  background: '#4f46e5', color: '#ffffff', fontWeight: 800, fontSize: '13px',
  cursor: 'pointer',
};