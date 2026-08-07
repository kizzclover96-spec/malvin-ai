import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../firebase';
import { savePendingDeepLink } from './AppOpenGate';

interface AuthRequiredPopupProps {
  /** The route to resume once they've logged in — e.g. `/service/${uid}`. */
  targetPath: string;
}

/**
 * SIGNED-OUT BACKSTOP
 * ---------------------------------------------------------------------------
 * AppOpenGate (see AppOpenGate.tsx) handles the mobile "you don't have the
 * app yet" flow, but it deliberately skips desktop entirely — a desktop
 * visitor just gets the normal web storefront. That's fine right up until
 * they try to actually DO something (submit a request, place an order):
 * every write into a business's tree requires isSignedIn() in Firestore
 * rules, so an actually signed-out visitor's submit just fails with a raw
 * "Missing or insufficient permissions" error and no explanation.
 *
 * This is the platform-agnostic version of AppOpenGate's "Log in to
 * MalvinAI to continue" popup — same message, same pending-link handoff
 * (App.jsx resumes targetPath the moment login succeeds), but triggered
 * purely by actual auth state rather than a mobile/desktop heuristic. Drop
 * it into any storefront or chat screen; it renders nothing until it's
 * actually confirmed nobody is signed in.
 */
export const AuthRequiredPopup: React.FC<AuthRequiredPopupProps> = ({ targetPath }) => {
  const navigate = useNavigate();
  // null = still checking, true/false = resolved. Starting at null (rather
  // than assuming signed-out) is what stops this flashing on screen for
  // every visitor while Firebase Auth's very first callback is still in
  // flight — it only ever shows once we're SURE there's no session.
  const [isSignedIn, setIsSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      setIsSignedIn(!!user);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (isSignedIn === false) {
      savePendingDeepLink(targetPath);
    }
  }, [isSignedIn, targetPath]);

  if (isSignedIn !== false) return null;

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
