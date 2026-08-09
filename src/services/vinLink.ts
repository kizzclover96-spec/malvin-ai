import { doc, getDoc } from 'firebase/firestore';
import { Capacitor } from '@capacitor/core';
import { firestore as db } from '../firebase';

/** The real, publicly reachable site — the main app shell (login, dashboards). */
export const PUBLIC_ORIGIN = 'https://malvinai.com';

/**
 * The dedicated, separate origin merchant storefronts / QR destinations are
 * served from — deliberately NOT the same origin as PUBLIC_ORIGIN. This is
 * what lets StoreFront.tsx's <iframe> sandbox drop allow-same-origin: a
 * genuinely cross-origin child can be denied same-origin DOM access to the
 * parent shell by the browser's own Same-Origin Policy, which a sandbox
 * attribute alone can never provide when parent and child share one origin
 * (see the long comment in StoreFront.tsx for why that mattered).
 *
 * Configurable via VITE_STORE_ORIGIN so local dev / preview channels can
 * point this at whatever they're actually testing against; defaults to the
 * production stores subdomain.
 */
export const STORE_ORIGIN = import.meta.env.VITE_STORE_ORIGIN || 'https://stores.malvinai.com';

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
 * Use this instead of publicOrigin() specifically for merchant storefront /
 * QR-destination links (food/salon/hotel/mechanic/service/chat) — anything
 * that ends up either scanned directly or opened inside StoreFront's
 * <iframe>. Always resolves to STORE_ORIGIN regardless of platform: unlike
 * publicOrigin(), which falls back to window.location.origin on web because
 * the shell's own domain used to double as the public one, the whole point
 * here is that store links point at a DIFFERENT domain than whatever page
 * generated them, on every platform.
 */
export function storeOrigin(): string {
  return STORE_ORIGIN;
}

/**
 * VIN LINKS
 * ---------------------------------------------------------------------------
 * A store's shareable deep link. The path segment depends on what kind of
 * business it is (/food/:uid vs /salon/:uid), and that isn't stored on the
 * lightweight recentBusinesses row — so resolving a link means looking the
 * business up.
 */

export type BusinessKind = 'restaurant' | 'salon' | 'hotel' | 'mechanic' | 'service';

/** URL path slug -> internal business kind. */
const PATH_SLUG_TO_KIND: Record<string, BusinessKind> = {
  food: 'restaurant',
  restaurant: 'restaurant',
  salon: 'salon',
  hotel: 'hotel',
  mechanic: 'mechanic',
  service: 'service',
};

/** Internal business kind -> the Firestore collection its profile lives in. */
const KIND_TO_COLLECTION: Record<BusinessKind, string> = {
  restaurant: 'restaurantprofile',
  salon: 'salons',
  hotel: 'hotels',
  mechanic: 'mechanics',
  service: 'serviceProviders',
};

/**
 * Pulls the uid AND, when the input is a full `/category/:uid` link, the
 * category encoded in the path segment right before it.
 *
 * This matters because the SAME uid can run several completely separate
 * business accounts side by side — e.g. a food account at
 * malvinai.com/food/<uid> and a salon account at malvinai.com/salon/<uid>.
 * Without the category hint there'd be no way to tell those two apart once
 * you've stripped the path down to the bare uid, and one would silently
 * shadow the other. A bare uid typed with no path (no '/') carries no hint,
 * which callers use as their signal to fall back to a best-guess lookup.
 */
export function extractCategoryAndUid(rawInput: string): { uid: string; categoryHint: BusinessKind | null } {
  // Strip a query string or hash fragment before splitting on '/', otherwise
  // a link copied with tracking params (?ref=share) or a trailing '#' ends
  // up with those characters glued onto the uid, which then can't match any
  // Firestore document and silently fails the lookup.
  const clean = rawInput.trim().split('?')[0].split('#')[0];

  if (!clean.includes('/')) {
    return { uid: clean, categoryHint: null };
  }

  const segments = clean.split('/').filter(Boolean);
  const uid = segments.pop() || clean;
  // Whatever precedes the uid — for a normal https://malvinai.com/<slug>/<uid>
  // link that's the category slug, wherever the scheme/host segments land
  // in front of it.
  const slug = segments.pop()?.toLowerCase();
  const categoryHint = (slug && PATH_SLUG_TO_KIND[slug]) || null;

  return { uid, categoryHint };
}

/** Accepts a bare uid or an already-built link and returns just the uid. */
export function extractUid(rawInput: string): string {
  return extractCategoryAndUid(rawInput).uid;
}

export function buildVinLink(uid: string, category: string): string {
  const normalized = category.toLowerCase();
  const kind =
    normalized === 'salon' ? 'salon'
      : normalized === 'hotel' ? 'hotel'
      : normalized === 'mechanic' ? 'mechanic'
      : normalized === 'service' ? 'service'
      : 'food';
  return `${STORE_ORIGIN}/${kind}/${uid}`;
}

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
 *
 * `businessUid` may be a bare uid or a full `/category/:uid` link/path — if
 * it's the latter (or `categoryHint` is passed explicitly), resolution goes
 * straight at THAT category's collection and stops there. This is what lets
 * the same uid run entirely separate businesses per category —
 * malvinai.com/food/<uid> and malvinai.com/salon/<uid> are two distinct
 * accounts, and a link naming one must never resolve into the other just
 * because a document happens to exist there too.
 */
export async function resolveBusiness(
  businessUid: string,
  categoryHint?: BusinessKind | null
): Promise<ResolvedBusiness> {
  const { uid, categoryHint: hintFromInput } = extractCategoryAndUid(businessUid);
  const hint = categoryHint ?? hintFromInput;

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

  const notFound = (kind: BusinessKind): ResolvedBusiness => ({
    uid,
    kind,
    link: buildVinLink(uid, kind),
    found: false,
    storeName: '',
    bio: '',
    address: '',
    logoUrl: '',
  });

  try {
    // A link that names its category is resolved ONLY against that
    // category's collection — no falling through to a different business
    // type under the same uid, even if one exists there.
    if (hint) {
      const snap = await getDoc(doc(db, KIND_TO_COLLECTION[hint], uid));
      if (snap.exists()) return shape(hint, snap.data());
      return notFound(hint);
    }

    // No category in the input (a bare uid was typed/pasted with no path) —
    // fall back to a best-guess priority search across every collection.
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
  return notFound('restaurant');
}

/**
 * Looks the business up to decide whether it's a salon, hotel, or food
 * store, then builds its link. Falls back to the food path if the lookup
 * fails, since a slightly wrong link still beats no link at all.
 */
export async function resolveVinLink(businessUid: string): Promise<string> {
  return (await resolveBusiness(businessUid)).link;
}