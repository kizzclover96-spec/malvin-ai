import React, { useEffect, useRef, useState } from 'react';
import { MODE as ANDROID_DISTRIBUTION_MODE, ANDROID_INSTALL_URL } from '../../config/appDistribution';

// Source of truth lives in src/config/appDistribution.ts — shared with
// AppOpenGate.tsx so both flip over together the day we move from the
// direct-APK beta onto the Play Store. Tapping "Install" on Android WITHOUT
// a capturable beforeinstallprompt (see below) navigates to
// ANDROID_INSTALL_URL — today that's our own hosted .apk, which the browser
// downloads directly; there's no way for a web page to silently drop an APK
// onto a device without at least this one navigation/tap.

// Don't re-show for a while after someone dismisses it — this is a toast
// that can appear on every page, so it needs to back off, not nag.
const DISMISS_KEY = 'malvinai_install_toast_dismissed_at';
const DISMISS_SNOOZE_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

type Platform = 'android' | 'ios' | 'chrome-installable' | 'safari-desktop' | null;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function detectMobilePlatform(): 'android' | 'ios' | null {
  const ua = navigator.userAgent || '';
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  // Restricted to Chrome (Android) and Safari (iOS) specifically, per the
  // ask — not "any mobile browser". Android's WebView-based browsers and
  // in-app browsers still match /Chrome/ in their UA in most cases, which
  // is fine here since they can still open the Play Store link.
  const isChrome = /Chrome/i.test(ua) && !/Edg|OPR|SamsungBrowser/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/i.test(ua);

  if (isAndroid && isChrome) return 'android';
  if (isIOS && isSafari) return 'ios';
  return null;
}

function isDesktopSafari(): boolean {
  const ua = navigator.userAgent || '';
  const isMobile = /Android|iPhone|iPad|iPod/i.test(ua);
  const isSafari = /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS|Edg/i.test(ua);
  return !isMobile && isSafari;
}

function isAlreadyInstalled(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true
  );
}

/**
 * GLOBAL INSTALL TOAST
 * ---------------------------------------------------------------------------
 * Mounted once in App.jsx, outside <Routes>, so it can appear over any page.
 * Never inside the native Capacitor app, never inside StoreFront's iframe
 * (checked via window.top === window.self so it doesn't double up in
 * there), and never once already installed/standalone.
 *
 * Two independent trigger paths:
 *  - Mobile (Android Chrome / iOS Safari): detected from the user agent,
 *    same as before. Android's "Install" hands off to the Play Store; iOS
 *    has no scriptable install at all, so it expands into manual
 *    Add-to-Home-Screen steps instead.
 *  - Desktop Chrome (and Chromium browsers that support it): the mobile
 *    check above deliberately excludes desktop — a bare user-agent sniff
 *    can't tell you whether a desktop page is ACTUALLY installable (a
 *    manifest issue, an unmet PWA criterion, or the browser already having
 *    silently declined would all make an "Install" button that does
 *    nothing). Chrome only ever fires `beforeinstallprompt` when the page
 *    genuinely qualifies, so listening for that instead of guessing off
 *    the UA is what lets desktop show a real, working Install button
 *    rather than a broken one.
 *  - Desktop Safari has no install-prompt API at all (same as iOS) — shown
 *    with brief Dock instructions instead of a broken button.
 */
export const InstallAppToast: React.FC = () => {
  const [platform, setPlatform] = useState<Platform>(null);
  const [expanded, setExpanded] = useState(false);
  const deferredPromptRef = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    let cancelled = false;

    const dismissedRecently = () => {
      try {
        const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
        return !!dismissedAt && Date.now() - dismissedAt < DISMISS_SNOOZE_MS;
      } catch {
        return false; // storage unavailable — worst case shown slightly more than intended
      }
    };

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      if (cancelled || dismissedRecently()) return;
      deferredPromptRef.current = e as BeforeInstallPromptEvent;
      setPlatform((current) => current ?? 'chrome-installable');
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);

    (async () => {
      try {
        const { Capacitor } = await import('@capacitor/core');
        if (Capacitor.isNativePlatform()) return;
      } catch {
        // @capacitor/core not resolvable — plain web build, proceed.
      }

      if (cancelled) return;
      if (window.top !== window.self) return; // inside StoreFront's iframe
      if (isAlreadyInstalled()) return;
      if (dismissedRecently()) return;

      const mobile = detectMobilePlatform();
      if (mobile) {
        setPlatform(mobile);
      } else if (isDesktopSafari()) {
        setPlatform('safari-desktop');
      }
      // Otherwise: wait and see if beforeinstallprompt fires (desktop
      // Chrome) — nothing to set yet, that listener above handles it.
    })();

    return () => {
      cancelled = true;
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* soft failure — see savePendingDeepLink in AppOpenGate.tsx for the same reasoning */
    }
    setPlatform(null);
  };

  const handleInstallClick = async () => {
    if (platform === 'chrome-installable' && deferredPromptRef.current) {
      const promptEvent = deferredPromptRef.current;
      deferredPromptRef.current = null;
      try {
        await promptEvent.prompt();
        await promptEvent.userChoice;
      } catch (err) {
        console.warn('Install prompt failed or was dismissed:', err);
      }
      dismiss();
      return;
    }
    if (platform === 'android') {
      window.location.href = ANDROID_INSTALL_URL;
      // Direct-APK beta downloads happen as a background navigation/download
      // rather than a full page leave, so the toast should walk into the
      // "what to do next" state instead of just vanishing — leaving someone
      // staring at the same page with no idea the download started.
      if (ANDROID_DISTRIBUTION_MODE === 'direct-apk') {
        setExpanded(true);
        return;
      }
      dismiss();
      return;
    }
    // iOS Safari / desktop Safari: no scriptable install — expand into
    // manual steps instead of navigating anywhere.
    setExpanded(true);
  };

  if (!platform) return null;

  const isSafariVariant = platform === 'ios' || platform === 'safari-desktop';

  return (
    <div style={toastWrapStyle}>
      <div style={toastStyle}>
        <button style={closeButtonStyle} onClick={dismiss} aria-label="Dismiss">×</button>
        {!expanded ? (
          <>
            <p style={toastTitleStyle}>
              {platform === 'android' && ANDROID_DISTRIBUTION_MODE === 'direct-apk'
                ? 'Get the MalvinAI Beta App'
                : 'Install MalvinAI App'}
            </p>
            <p style={toastBodyStyle}>
              {platform === 'android' && ANDROID_DISTRIBUTION_MODE === 'direct-apk'
                ? 'Try the early Android beta — faster loading and push notifications, straight from us (not the Play Store yet).'
                : isSafariVariant
                ? 'Add MalvinAI to your Home Screen for the full app experience.'
                : 'Get the full app experience with faster loading and push notifications.'}
            </p>
            <button style={installButtonStyle} onClick={handleInstallClick}>
              {platform === 'android' && ANDROID_DISTRIBUTION_MODE === 'direct-apk' ? 'Download Beta' : 'Install'}
            </button>
          </>
        ) : platform === 'android' ? (
          <>
            <p style={toastTitleStyle}>Downloading the Beta…</p>
            <p style={toastBodyStyle}>
              Once it's downloaded, open the file from your notification shade or Downloads folder.
              Since this isn't from the Play Store yet, Android will ask you to
              <span style={{ fontWeight: 800 }}> "Allow from this source"</span> the first time — that's expected,
              tap through to install.
            </p>
          </>
        ) : platform === 'safari-desktop' ? (
          <>
            <p style={toastTitleStyle}>Add MalvinAI to your Dock</p>
            <p style={toastBodyStyle}>
              In Safari's menu bar, choose <span style={{ fontWeight: 800 }}>File → Add to Dock</span>.
            </p>
          </>
        ) : (
          <>
            <p style={toastTitleStyle}>Add MalvinAI to your Home Screen</p>
            <p style={toastBodyStyle}>
              Tap the Share icon <span style={{ fontWeight: 800 }}>⬆️</span> in Safari, then choose
              <span style={{ fontWeight: 800 }}> "Add to Home Screen"</span>.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

const toastWrapStyle: React.CSSProperties = {
  position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 9998,
  display: 'flex', justifyContent: 'center', padding: '14px',
  pointerEvents: 'none',
};
const toastStyle: React.CSSProperties = {
  position: 'relative', pointerEvents: 'auto',
  width: '100%', maxWidth: '420px', background: '#0f172a', color: '#ffffff',
  borderRadius: '16px', padding: '16px 40px 16px 18px', boxShadow: '0 -10px 30px rgba(0,0,0,0.35)',
};
const toastTitleStyle: React.CSSProperties = { margin: '0 0 4px', fontSize: '13.5px', fontWeight: 900 };
const toastBodyStyle: React.CSSProperties = { margin: '0 0 12px', fontSize: '12px', color: '#cbd5e1', lineHeight: 1.5 };
const installButtonStyle: React.CSSProperties = {
  width: '100%', padding: '11px', borderRadius: '10px', border: 'none',
  background: '#22c55e', color: '#0f172a', fontWeight: 900, fontSize: '13px',
  cursor: 'pointer',
};
const closeButtonStyle: React.CSSProperties = {
  position: 'absolute', top: '8px', right: '10px', background: 'transparent',
  border: 'none', color: '#94a3b8', fontSize: '18px', lineHeight: 1, cursor: 'pointer',
  padding: '4px',
};