import { doc, getDoc } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { firestore as db } from '../firebase';

/** The real, publicly reachable site. */
export const PUBLIC_ORIGIN = 'https://malvinai.com';

/**
 * Use this instead of window.location.origin for anything that leaves the
 * device — links, QR codes, share payloads.
 *
 * Inside the native WebView the page is served from https://localhost, so
 * window.location.origin produces links and QR codes that resolve to the
 * phone itself and are useless to whoever receives or scans them.
 */
export function publicOrigin(): string {
  return Capacitor.isNativePlatform() ? PUBLIC_ORIGIN : window.location.origin;
}

/**
 * VIN LINKS
 * ---------------------------------------------------------------------------
 * A store's shareable deep link. The path segment depends on what kind of
 * business it is (/food/:uid vs /salon/:uid), and that isn't stored on the
 * lightweight recentBusinesses row — so resolving a link means looking the
 * business up.
 */

/** Accepts a bare uid or an already-built link and returns just the uid. */
export function extractUid(rawInput: string): string {
  let clean = rawInput.trim();
  if (clean.includes('/')) {
    const segments = clean.split('/');
    clean = segments.filter(Boolean).pop() || clean;
  }
  return clean;
}

export function buildVinLink(uid: string, category: string): string {
  const kind = category.toLowerCase() === 'salon' ? 'salon' : 'food';
  return `${PUBLIC_ORIGIN}/${kind}/${uid}`;
}

/**
 * Looks the business up to decide whether it's a salon or a food store, then
 * builds its link. Falls back to the food path if the lookup fails, since a
 * slightly wrong link still beats no link at all.
 */
export async function resolveVinLink(businessUid: string): Promise<string> {
  const uid = extractUid(businessUid);

  try {
    const restaurantSnap = await getDoc(doc(db, 'restaurantprofile', uid));
    if (restaurantSnap.exists()) {
      return buildVinLink(uid, restaurantSnap.data().category || 'restaurant');
    }

    const salonSnap = await getDoc(doc(db, 'salons', uid));
    if (salonSnap.exists()) return buildVinLink(uid, 'salon');
  } catch (err) {
    console.error('vinLink: failed to resolve business category:', err);
  }

  return buildVinLink(uid, 'restaurant');
}
