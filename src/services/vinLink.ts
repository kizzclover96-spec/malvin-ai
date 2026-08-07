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
  // Strip a query string or hash fragment before splitting on '/', otherwise
  // a link copied with tracking params (?ref=share) or a trailing '#' ends
  // up with those characters glued onto the uid, which then can't match any
  // Firestore document and silently fails the lookup.
  clean = clean.split('?')[0].split('#')[0];
  if (clean.includes('/')) {
    const segments = clean.split('/');
    clean = segments.filter(Boolean).pop() || clean;
  }
  return clean;
}

export function buildVinLink(uid: string, category: string): string {
  const normalized = category.toLowerCase();
  const kind =
    normalized === 'salon' ? 'salon'
      : normalized === 'hotel' ? 'hotel'
      : normalized === 'mechanic' ? 'mechanic'
      : normalized === 'service' ? 'service'
      : 'food';
  return `${PUBLIC_ORIGIN}/${kind}/${uid}`;
}

export type BusinessKind = 'restaurant' | 'salon' | 'hotel' | 'mechanic' | 'service';

export interface ResolvedBusiness {
  uid: string;
  kind: BusinessKind;
  /** Absolute, shareable deep link pointing at the correct store type. */
  link: string;
  /** True when the uid actually matched a business document. */
  found: boolean;
  /** Display fields, normalized across the three profile shapes. */
  storeName: string;
  bio: string;
  address: string;
  logoUrl: string;
}

/**
 * Single lookup that answers both "what kind of business is this, so where
 * does its link point" and "what is it called", so a caller needing both
 * (logging a visit to recentBusinesses) doesn't read the same document
 * twice.
 *
 * The three profile collections spell their fields differently —
 * brandName/salonName/hotelName, brandBio/bio — so they're normalized here
 * rather than at every call site.
 */
export async function resolveBusiness(businessUid: string): Promise<ResolvedBusiness> {
  const uid = extractUid(businessUid);

  const shape = (kind: BusinessKind, data: any): ResolvedBusiness => ({
    uid,
    kind,
    link: buildVinLink(uid, kind),
    found: true,
    storeName:
      data.brandName || data.salonName || data.hotelName || data.garageName || data.businessName || 'Unnamed Store',
    bio: data.brandBio || data.bio || '',
    address: data.address || '',
    logoUrl: data.logo || data.logoUrl || '',
  });

  try {
    const restaurantSnap = await getDoc(doc(db, 'restaurantprofile', uid));
    if (restaurantSnap.exists()) return shape('restaurant', restaurantSnap.data());

    const salonSnap = await getDoc(doc(db, 'salons', uid));
    if (salonSnap.exists()) return shape('salon', salonSnap.data());

    const hotelSnap = await getDoc(doc(db, 'hotels', uid));
    if (hotelSnap.exists()) return shape('hotel', hotelSnap.data());

    const mechanicSnap = await getDoc(doc(db, 'mechanics', uid));
    if (mechanicSnap.exists()) return shape('mechanic', mechanicSnap.data());

    const serviceSnap = await getDoc(doc(db, 'serviceProviders', uid));
    if (serviceSnap.exists()) return shape('service', serviceSnap.data());
  } catch (err) {
    console.error('vinLink: failed to resolve business category:', err);
  }

  // Nothing matched. Fall back to the food path — a slightly wrong link
  // still beats no link at all — but flag it so callers can avoid writing a
  // junk row into someone's history.
  return {
    uid,
    kind: 'restaurant',
    link: buildVinLink(uid, 'restaurant'),
    found: false,
    storeName: '',
    bio: '',
    address: '',
    logoUrl: '',
  };
}

/**
 * Looks the business up to decide whether it's a salon, hotel, or food
 * store, then builds its link. Falls back to the food path if the lookup
 * fails, since a slightly wrong link still beats no link at all.
 */
export async function resolveVinLink(businessUid: string): Promise<string> {
  return (await resolveBusiness(businessUid)).link;
}
