import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface AuthRequiredPopupProps {
  /**
   * Kept for call-site compatibility (every store still passes its own
   * `/service/${uid}`-style path in) but no longer used to persist
   * anything — see the note above savePendingDeepLink's removal below for
   * why. Fine to drop from callers whenever they're next touched.
   */
  targetPath: string;
}

// Every legitimate handshake token StoreFront.tsx hands down starts with
// this. It's not a secret and isn't meant to be — it just lets us tell
// "this postMessage carries a real StoreFront handshake" apart from any
// other unrelated message that might land on the window (extensions,
// analytics, the browser itself), without caring about the message's
// exact envelope shape or origin.
export const HANDSHAKE_TOKEN_PREFIX = 'mv_';

// How long we wait for the parent's handshake token before concluding
// nobody sent one — i.e. this page was opened on its own (a bookmark, a
// shared raw link, someone typing the URL in), not through Malvin's
// StoreFront wrapper.
const HANDSHAKE_TIMEOUT_MS = 3000;

/**
 * SIGNED-OUT / NOT-EMBEDDED BACKSTOP
 * ---------------------------------------------------------------------------
 * Used to work by asking Firebase Auth directly ("is anyone signed in on
 * THIS page?"). That was fragile in exactly the place it mattered most —
 * inside StoreFront's iframe, a fresh browsing context that doesn't
 * automatically share the parent app's auth session, so the popup would
 * often fire even for a genuinely signed-in customer, or flash on/off as
 * auth state settled.
 *
 * Now it's purely a handshake check: StoreFront.tsx (the parent shell)
 * generates a unique one-off token every time it opens a store and posts
 * it down over `postMessage` the moment the child announces itself ready
 * (the existing "*_READY" / "MALVIN_USER" wire format every store already
 * speaks — see StoreFront.tsx). If that token never arrives within
 * HANDSHAKE_TIMEOUT_MS, this page wasn't opened through Malvin's app shell
 * at all, and THAT — not raw auth state — is what shows the popup.
 *
 * No auth listening happens here anymore. Real permission enforcement for
 * actually placing an order / booking / sending a request still lives
 * server-side in Firestore's isSignedIn() rules, same as before — this is
 * only about explaining *why* a plain, unwrapped visit needs the app.
 *
 * Does NOT call savePendingDeepLink() (used to, briefly — that caused a
 * redirect loop: this same route also renders standalone, outside
 * StoreFront, for direct/shared/QR links — see e.g. App.jsx's
 * `/service/:uid` route — so the handshake here ALWAYS times out on that
 * legitimate path too. Saving "resume this after login" from that timeout
 * meant the next app load auto-navigated right back into the same
 * unwrapped route, timed out again, and resaved — forever. That resume
 * mechanism stays exactly where it belongs, in AppOpenGate's own cold
 * mobile-deep-link flow, which is the only place that ever calls
 * savePendingDeepLink now.
 */
export const AuthRequiredPopup: React.FC<AuthRequiredPopupProps> = ({ targetPath }) => {
  const navigate = useNavigate();
  // null = still waiting to hear from a parent, true = handshake token
  // received (we're properly embedded — never show anything), false =
  // timed out with nothing received.
  const [handshakeOk, setHandshakeOk] = useState<boolean | null>(null);

  useEffect(() => {
    let settled = false;

    const onMessage = (event: MessageEvent) => {
      if (settled) return;
      const token = event.data?.token;
      if (typeof token === 'string' && token.startsWith(HANDSHAKE_TOKEN_PREFIX)) {
        settled = true;
        setHandshakeOk(true);
      }
    };

    window.addEventListener('message', onMessage);

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        setHandshakeOk(false);
      }
    }, HANDSHAKE_TIMEOUT_MS);

    return () => {
      window.removeEventListener('message', onMessage);
      clearTimeout(timer);
    };
  }, []);

  if (handshakeOk !== false) return null;

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