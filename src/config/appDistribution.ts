// ANDROID APP DISTRIBUTION CONFIG
// ---------------------------------------------------------------------------
// Single source of truth for where "Install" buttons/toasts send Android
// users. Used by InstallAppToast.tsx (general install nudge) and
// AppOpenGate.tsx (VinMoment deep-link handoff).
//
// Today: 'direct-apk' — we're not on the Play Store yet, so Android users
// download and sideload the beta .apk straight from our own domain.
//
// Once the Play Store listing is live: flip MODE to 'play-store' below.
// Every place that imports ANDROID_INSTALL_URL switches over automatically —
// no need to hunt through components.
export const MODE: 'direct-apk' | 'play-store' = 'direct-apk';

export const ANDROID_PACKAGE_ID = 'com.malvinaibeta.agent';

// Must match wherever the built app-release.apk actually gets uploaded on
// the hosting side (see firebase.json's "downloads/**" header block, which
// forces the right Content-Type/Content-Disposition so this downloads
// instead of trying to open as text/html).
export const ANDROID_APK_URL = '/downloads/malvinai-beta.apk';

export const ANDROID_PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE_ID}`;

export const ANDROID_INSTALL_URL =
  MODE === 'direct-apk' ? ANDROID_APK_URL : ANDROID_PLAY_STORE_URL;

// TODO: replace with the real App Store numeric id once MalvinAI ships on iOS.
export const IOS_STORE_URL = 'https://apps.apple.com/app/id0000000000';
