import { collection, getDocs, query, limit } from 'firebase/firestore';
import { firestore as db } from '../firebase';

export type NearbyBusinessType = 'restaurant' | 'salon' | 'hotel' | 'mechanic';

export interface NearbyBusiness {
  id: string;
  name: string;
  type: NearbyBusinessType;
  category: string;
  address: string;
  rating: number;
  verified: boolean;
  latitude: number;
  longitude: number;
  distanceKm: number;
  logo?: string;
  openingTime?: string;
  closingTime?: string;
  offDays?: string[];
  vinLink: string;
  isOpenNow: boolean;
}

const RADIUS_KM = 5;
// Bounds the WORST case read cost of a single fetch — instead of pulling
// every document in these collections (what VinScanner's Radar does today,
// fine for an occasional deliberate scan, too expensive to run every time
// someone opens the home tab), this caps it regardless of how large the
// collections grow.
const PER_COLLECTION_LIMIT = 40;

// Session cache — this is the main lever, not the per-query limit above.
// Re-opening the home tab, or Front.tsx re-rendering, within the same
// browser session and without the user having moved meaningfully, costs
// ZERO additional Firestore reads. Cleared automatically when the tab
// closes (sessionStorage), so it never goes stale across visits.
// v3: hotels were added to the scanned collections. The bump matters —
// a v2 entry written minutes ago holds a hotel-less result set that would
// otherwise keep hotels hidden for the rest of the TTL.
const CACHE_KEY = 'malvin_nearby_cache_v4';
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const CACHE_MOVE_THRESHOLD_KM = 1; // refetch if the user has moved ~1km+

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Best-effort open/closed read from a business's stored hours. Returns
// null (not just "closed") when hours data is missing or malformed — the
// card should show no badge at all rather than guess wrong.
export function getStatusLabel(
  openingTime?: string,
  closingTime?: string,
  offDays?: string[]
): { open: boolean; label: string } | null {
  if (!openingTime || !closingTime) return null;
  try {
    const now = new Date();

    if (offDays && offDays.length > 0) {
      const todayName = new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(now);
      if (offDays.includes(todayName)) {
        return { open: false, label: 'Closed today' };
      }
    }

    const [openH, openM] = openingTime.split(':').map(Number);
    const [closeH, closeM] = closingTime.split(':').map(Number);
    if ([openH, openM, closeH, closeM].some((n) => Number.isNaN(n))) return null;

    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;
    const isOpen = nowMinutes >= openMinutes && nowMinutes <= closeMinutes;

    return {
      open: isOpen,
      label: isOpen ? `Open till ${closingTime}` : `Closed · Opens ${openingTime}`,
    };
  } catch {
    return null;
  }
}

function isBusinessOpenNow(openingTime?: string, closingTime?: string, offDays?: string[]): boolean {
  const status = getStatusLabel(openingTime, closingTime, offDays);
  return status ? status.open : true; // default to "not flagged closed" if unknown
}

async function fetchNearbyBusinessesUncached(
  userLat: number,
  userLng: number
): Promise<NearbyBusiness[]> {
  const results: NearbyBusiness[] = [];
  const collections: Array<{ name: string; type: NearbyBusinessType; path: string }> = [
    { name: 'restaurantprofile', type: 'restaurant', path: 'food' },
    { name: 'salons', type: 'salon', path: 'salon' },
    // Hotels only surface here once their dashboard has geocoded an address
    // into latitude/longitude — same precondition the other two have.
    { name: 'hotels', type: 'hotel', path: 'hotel' },
    { name: 'mechanics', type: 'mechanic', path: 'mechanic' },
  ];

  // One failing collection (missing index, rules change, a collection that
  // doesn't exist yet in this project) shouldn't blank out the whole strip —
  // keep whatever the other collections returned.
  const snaps = await Promise.all(
    collections.map((col) =>
      getDocs(query(collection(db, col.name), limit(PER_COLLECTION_LIMIT))).catch((err) => {
        console.error(`nearbyBusinesses: failed to read "${col.name}":`, err);
        return null;
      })
    )
  );

  snaps.forEach((snap, i) => {
    if (!snap) return;
    const col = collections[i];

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (!data.latitude || !data.longitude) return;

      const distanceKm = calculateDistanceKm(userLat, userLng, data.latitude, data.longitude);
      if (distanceKm > RADIUS_KM) return;

      results.push({
        id: docSnap.id,
        name:
          data.brandName ||
          data.salonName ||
          data.hotelName ||
          data.garageName ||
          data.businessName ||
          'Unnamed Business',
        type: col.type,
        category: data.category || col.type,
        address: data.address || '',
        rating: typeof data.rating === 'number' ? data.rating : 5.0,
        verified: data.verified ?? data.isVerified ?? true,
        latitude: data.latitude,
        longitude: data.longitude,
        distanceKm,
        logo: data.logo,
        openingTime: data.openingTime,
        closingTime: data.closingTime,
        offDays: data.offDays,
        vinLink: data.vinLink || `/${col.path}/${docSnap.id}`,
        isOpenNow: isBusinessOpenNow(data.openingTime, data.closingTime, data.offDays),
      });
    });
  });

  return results.sort((a, b) => a.distanceKm - b.distanceKm);
}

export async function getNearbyBusinesses(userLat: number, userLng: number): Promise<NearbyBusiness[]> {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (raw) {
      const cached = JSON.parse(raw);
      const age = Date.now() - cached.timestamp;
      const moved = calculateDistanceKm(userLat, userLng, cached.lat, cached.lng);
      if (age < CACHE_TTL_MS && moved < CACHE_MOVE_THRESHOLD_KM) {
        return cached.results as NearbyBusiness[];
      }
    }
  } catch {
    // Corrupt/unavailable cache entry — fall through and just refetch.
  }

  const results = await fetchNearbyBusinessesUncached(userLat, userLng);

  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ timestamp: Date.now(), lat: userLat, lng: userLng, results })
    );
  } catch {
    // sessionStorage full or unavailable (e.g. private browsing) — not
    // fatal, just means this particular visit won't benefit from caching.
  }

  return results;
}