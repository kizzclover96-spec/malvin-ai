import React, { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';

// TODO: swap this for your real Play Store listing once published
// (tracks the capacitor.config appId / Android applicationId).
const ANDROID_STORE_URL = 'https://play.google.com/store/apps/details?id=com.malvinaibeta.agent';
// TODO: replace with your real App Store numeric id once MalvinAI ships on iOS.
const IOS_STORE_URL = 'https://apps.apple.com/app/id0000000000';

interface AppOpenGateProps {
  kind: 'food' | 'salon';
  uid: string | undefined;
}

/**
 * VINMOMENT DEEP-LINK HANDOFF
 * ---------------------------------------------------------------------------
 * Sits in front of the public /food/:uid and /salon/:uid storefront pages —
 * exactly the links a shared VinMoment card points to. Renders nothing
 * visible itself; the real storefront underneath renders immediately and
 * normally the whole time, so nobody ever sees a blank "redirecting..." page.
 *
 * In the background, if this looks like a plain mobile browser (not the
 * native app itself just loading the same route), it:
 *  1. Tries to hand off to the installed app via the malvinai:// custom
 *     scheme (registered in AndroidManifest.xml / Info.plist).
 *  2. If the tab is still in the foreground ~1.2s later, assumes the app
 *     isn't installed and sends the person to the correct app store.
 *
 * Known, deliberate trade-off: this is the fast, dependency-free approach
 * (no Branch/AppsFlyer SDK, no extra network hop to resolve the link).
 * The cost is that a FRESH iOS install can't be handed the specific
 * business automatically after install — the person lands on Malvin's
 * normal entry screen and would tap the shared link again once installed.
 * Android can close this gap later via the Play Install Referrer API if
 * it's ever worth the extra native work.
 */
export const AppOpenGate: React.FC<AppOpenGateProps> = ({ kind, uid }) => {
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current || !uid) return;
    attempted.current = true;

    let timer: ReturnType<typeof setTimeout>;
    let redirected = false;

    const onVisibilityChange = () => {
      // Tab went to background shortly after our attempt — the OS almost
      // certainly switched over to the installed app. Cancel the fallback.
      if (document.hidden) redirected = true;
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

      document.addEventListener('visibilitychange', onVisibilityChange);

      // Silent handoff attempt — if Malvin is installed, the OS intercepts
      // this and switches apps; if not, nothing visible happens.
      window.location.href = `malvinai://${kind}/${uid}`;

      timer = setTimeout(() => {
        if (redirected || document.hidden) return;
        redirected = true;
        window.location.href = isAndroid ? ANDROID_STORE_URL : IOS_STORE_URL;
      }, 1200);
    })();

    return () => {
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [kind, uid]);

  return null;
};

// Thin, route-ready wrappers so App.jsx only has to drop these in next to the
// existing storefront elements — no prop wiring needed there.
export const FoodDeepLinkGate: React.FC = () => {
  const { Uid } = useParams();
  return <AppOpenGate kind="food" uid={Uid} />;
};

export const SalonDeepLinkGate: React.FC = () => {
  const { uid } = useParams();
  return <AppOpenGate kind="salon" uid={uid} />;
};