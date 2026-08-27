import React, { useEffect, useRef, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';

import { MODE as ANDROID_DISTRIBUTION_MODE, ANDROID_INSTALL_URL, IOS_STORE_URL } from '../../config/appDistribution';
// Android/iOS destinations now live in src/config/appDistribution.ts, shared
// with InstallAppToast.tsx so both switch together once the Play Store
// listing goes live.

// The key App.jsx checks right after a successful login to resume whatever
// scanned link brought this person here in the first place.
const PENDING_LINK_KEY = 'malvinai_pending_deep_link';
// Stale links older than this are ignored rather than replayed — a
// half-remembered scan from days ago shouldn't hijack an unrelated login.
const PENDING_LINK_TTL_MS = 30 * 60 * 1000;

export function savePendingDeepLink(path: string) {
  try {
    localStorage.setItem(PENDING_LINK_KEY, JSON.stringify({ path, ts: Date.now() }));
  } catch {
    // Storage unavailable (private browsing, quota) — the person can just
    // scan again once they're set up, so this is a soft failure.
  }
}

export function consumePendingDeepLink(): string | null {
  try {
    const raw = localStorage.getItem(PENDING_LINK_KEY);
    if (!raw) return null;
    localStorage.removeItem(PENDING_LINK_KEY);
    const { path, ts } = JSON.parse(raw);
    if (!path || Date.now() - ts > PENDING_LINK_TTL_MS) return null;
    return path;
  } catch {
    return null;
  }
}

interface AppOpenGateProps {
  kind: 'store';
  uid: string | undefined;
  /** True when this render IS the post-login resumption of a scan the
   *  person already saw the login/install flow for (see App.jsx) — skips
   *  the whole gate so it doesn't repeat itself right after they log in. */
  skipGate?: boolean;
}

type GateState =
  | 'idle'          // nothing to show — desktop, or inside the native app already
  | 'rerouting'     // handoff to the installed app is in flight
  | 'installPrompt'; // handoff timed out — showing the install/add-to-home-screen toast

/**
 * VINMOMENT DEEP-LINK HANDOFF
 * ---------------------------------------------------------------------------
 * Sits in front of the public /food/:uid, /salon/:uid, etc storefront pages
 * — exactly the links a shared VinMoment card or a printed/QR-code link
 * points to. Renders on top of the real storefront, which mounts underneath
 * and immediately regardless, so the business details (name, photos, menu…)
 * are visible right away no matter which branch below plays out.
 *
 * Two paths, depending on whether Malvin is already installed:
 *
 *   ALREADY INSTALLED — a malvinai://<kind>/<uid> handoff is attempted
 *   immediately. If the OS switches over to the app (this tab goes to the
 *   background within ~1.2s), that's the "Unsecure route… rerouting via
 *   secure MalvinAI platform" flash the person briefly sees before control
 *   passes to the native app.
 *
 *   NOT INSTALLED — the handoff attempt above times out with the tab still
 *   in the foreground, so this concludes Malvin isn't installed and shows
 *   a platform-aware install toast directly — Android gets an "Install Now"
 *   button straight to the Play listing; iOS gets Share ▸ Add to Home
 *   Screen instructions, since Safari has no scriptable install prompt.
 *   Either way, the intended path is saved to localStorage first
 *   (savePendingDeepLink) so App.jsx can resume it the moment login
 *   succeeds — see consumePendingDeepLink there.
 *
 * Known, deliberate trade-off: no Branch/AppsFlyer-style deep-linking SDK
 * and no Play Install Referrer wiring here, so a genuinely FRESH Android
 * install (not "already had it") can't be handed the specific business
 * automatically post-install — only a same-browser return trip (iOS Add to
 * Home Screen, or revisiting this same mobile browser after installing)
 * can. Closing that last gap for a brand-new Android install needs the
 * Play Install Referrer API wired natively (or a 3rd-party SDK) — Firebase
 * Dynamic Links, which used to make this trivial, was shut down in 2025.
 */
export const AppOpenGate: React.FC<AppOpenGateProps> = ({ kind, uid, skipGate }) => {
  const attempted = useRef(false);
  const [state, setState] = useState<GateState>('idle');
  const [platform, setPlatform] = useState<'android' | 'ios' | null>(null);

  useEffect(() => {
    if (attempted.current || !uid || skipGate) return;
    // Embedded inside StoreFront's <iframe> — there's no native app to hand
    // off TO, we're already inside the Malvin experience. Without this
    // check, this whole flow (attempt a malvinai:// handoff, wait ~1.2s,
    // then fall back to an install toast) ran on every single store visit
    // from inside the app too, since a fresh top-level navigation inside
    // an iframe starts with empty router state — `skipGate` above can
    // never be true there, only App.jsx's own client-side navigate()
    // calls ever set it. Checking the frame boundary directly, like
    // StoreFront.tsx's own isAllowedDomain check does,
    // is what actually distinguishes "embedded" from "standalone" here —
    // reliably, synchronously, with nothing to race.
    if (typeof window !== 'undefined' && window.top !== window.self) return;
    attempted.current = true;

    let timer: ReturnType<typeof setTimeout>;
    let handedOff = false;

    const onVisibilityChange = () => {
      // Tab went to background shortly after our attempt — the OS almost
      // certainly switched over to the installed app. Cancel the fallback.
      if (document.hidden) handedOff = true;
    };

    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        // Already running inside the native app — this page IS the app.
        // Don't try to relaunch what's already open.
        if (Capacitor.isNativePlatform()) return;
      } catch {
        // @capacitor/core not resolvable (plain web build) — proceed as web.
      }

      const ua = navigator.userAgent || '';
      const isAndroid = /Android/i.test(ua);
      const isIOS = /iPhone|iPad|iPod/i.test(ua);
      if (!isAndroid && !isIOS) return; // desktop just gets the normal web storefront

      setPlatform(isAndroid ? 'android' : 'ios');
      const targetPath = `/${kind}/${uid}`;
      savePendingDeepLink(targetPath);

      document.addEventListener('visibilitychange', onVisibilityChange);

      // Optimistic UI: assume Malvin is installed and about to take over.
      setState('rerouting');
      window.location.href = `malvinai://${kind}/${uid}`;

      timer = setTimeout(() => {
        if (handedOff || document.hidden) return;
        // Still here 1.2s later — the OS never intercepted the scheme, so
        // Malvin isn't installed. Straight to the install toast — no
        // separate "log in to continue" interstitial in front of it.
        setState('installPrompt');
      }, 1200);
    })();

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [kind, uid]);

  if (state === 'idle') return null;

  const handleInstallClick = () => {
    if (platform !== 'android') {
      window.location.href = IOS_STORE_URL;
      return;
    }
    // The &referrer= param is Play Store's install-referrer tracking —
    // meaningful (and safe to append) only against a real Play Store URL.
    // The direct-APK beta download has no such mechanism, so skip it there
    // rather than tack a dead query param onto a plain file URL.
    window.location.href = ANDROID_DISTRIBUTION_MODE === 'play-store'
      ? `${ANDROID_INSTALL_URL}&referrer=${encodeURIComponent(`kind=${kind}&uid=${uid}`)}`
      : ANDROID_INSTALL_URL;
  };

  return (
    <>
      {/* REROUTING FLASH — shown while we still think the app might grab
          this. Usually invisible in practice: if Malvin IS installed, the
          OS switches apps within a couple hundred ms and this tab is gone
          before anyone reads it. */}
      {state === 'rerouting' && (
        <div style={overlayStyle}>
          <div style={cardStyle}>
            <div style={spinnerStyle} />
            <p style={titleStyle}>Unsecure route detected</p>
            <p style={bodyStyle}>Rerouting via the secure MalvinAI platform…</p>
          </div>
        </div>
      )}

      {/* INSTALL TOAST — platform-aware call to action, bottom of screen so
          the business details stay visible above it. Shown directly once
          the handoff attempt times out — no separate "log in to continue"
          interstitial in front of it anymore. */}
      {state === 'installPrompt' && (
        <div style={toastWrapStyle}>
          <div style={toastStyle}>
            {platform === 'android' ? (
              <>
                <p style={toastTitleStyle}>Get the MalvinAI app</p>
                <p style={toastBodyStyle}>Install it to log in and continue securely.</p>
                <button style={installButtonStyle} onClick={handleInstallClick}>
                  Install Now
                </button>
              </>
            ) : (
              <>
                <p style={toastTitleStyle}>Add MalvinAI to your Home Screen</p>
                <p style={toastBodyStyle}>
                  Tap the Share icon <span style={{ fontWeight: 800 }}>⬆️</span> in Safari, then choose
                  <span style={{ fontWeight: 800 }}> "Add to Home Screen"</span> — then open it from
                  there and log in to continue.
                </p>
              </>
            )}
            <button style={dismissButtonStyle} onClick={() => setState('idle')}>
              Not now
            </button>
          </div>
        </div>
      )}
    </>
  );
};

// Plain inline styles — same reasoning as the receipts drawer buttons: this
// gate is what a person sees on their very first, unauthenticated contact
// with Malvin, straight out of their phone's camera app, so it can't be
// left depending on a Tailwind build that may or may not be present.
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
const spinnerStyle: React.CSSProperties = {
  width: '30px', height: '30px', margin: '0 auto 12px',
  border: '3px solid #e0e7ff', borderTopColor: '#4f46e5', borderRadius: '50%',
  animation: 'malvinGateSpin 0.8s linear infinite',
};
const toastWrapStyle: React.CSSProperties = {
  position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 9999,
  display: 'flex', justifyContent: 'center', padding: '14px',
};
const toastStyle: React.CSSProperties = {
  width: '100%', maxWidth: '420px', background: '#0f172a', color: '#ffffff',
  borderRadius: '16px', padding: '16px 18px', boxShadow: '0 -10px 30px rgba(0,0,0,0.35)',
};
const toastTitleStyle: React.CSSProperties = { margin: '0 0 4px', fontSize: '13.5px', fontWeight: 900 };
const toastBodyStyle: React.CSSProperties = { margin: '0 0 12px', fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5 };
const installButtonStyle: React.CSSProperties = {
  width: '100%', padding: '11px', borderRadius: '10px', border: 'none',
  background: '#22c55e', color: '#0f172a', fontWeight: 900, fontSize: '13px',
  cursor: 'pointer', marginBottom: '8px',
};
const dismissButtonStyle: React.CSSProperties = {
  width: '100%', padding: '9px', borderRadius: '10px', border: 'none',
  background: 'transparent', color: '#94a3b8', fontWeight: 700, fontSize: '12px',
  cursor: 'pointer',
};

// Injected once so the spinner's @keyframes exists without a separate CSS
// file — this component can be dropped in anywhere without a build step.
if (typeof document !== 'undefined' && !document.getElementById('malvin-gate-keyframes')) {
  const style = document.createElement('style');
  style.id = 'malvin-gate-keyframes';
  style.textContent = '@keyframes malvinGateSpin { to { transform: rotate(360deg); } }';
  document.head.appendChild(style);
}

// Thin, route-ready wrappers so App.jsx only has to drop these in next to the
// existing storefront elements — no prop wiring needed there.
export const BVinDeepLinkGate: React.FC = () => {
  const { uid } = useParams();
  const location = useLocation();
  return <AppOpenGate kind="store" uid={uid} skipGate={!!location.state?.skipGate} />;
};