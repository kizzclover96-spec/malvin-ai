import { collection, getDocs, query, limit } from 'firebase/firestore';
import { firestore as db } from '../firebase';

export interface NearbyBusiness {
  id: string;
  name: string;
  category: string;
  address: string;
  rating: number;
  verified: boolean;
  latitude: number;
  longitude: number;
  distanceKm: number;
  logo?: string;
  hours?: any;
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
const CACHE_KEY = 'malvin_nearby_cache_v1';
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

// Best-effort "open now" check from a business's stored hours. Defaults to
// true (don't show a closed badge) if hours data is missing or malformed —
// an absent badge is a lot less confusing than a wrong one.
function isBusinessOpenNow(hours: any): boolean {
  if (!hours) return true;
  try {
    const dayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const today = dayKeys[new Date().getDay()];
    const todayHours = hours[today];
    if (!todayHours?.open || !todayHours?.close) return true;

    const now = new Date();
    const [openH, openM] = todayHours.open.split(':').map(Number);
    const [closeH, closeM] = todayHours.close.split(':').map(Number);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    return nowMinutes >= openMinutes && nowMinutes <= closeMinutes;
  } catch {
    return true;
  }
}

async function fetchNearbyBusinessesUncached(
  userLat: number,
  userLng: number
): Promise<NearbyBusiness[]> {
  const results: NearbyBusiness[] = [];
  const collections: Array<{ name: string; type: string }> = [
    { name: 'restaurantprofile', type: 'restaurant' },
    { name: 'salons', type: 'salon' },
  ];

  for (const col of collections) {
    const snap = await getDocs(query(collection(db, col.name), limit(PER_COLLECTION_LIMIT)));

    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (!data.latitude || !data.longitude) return;

      const distanceKm = calculateDistanceKm(userLat, userLng, data.latitude, data.longitude);
      if (distanceKm > RADIUS_KM) return;

      results.push({
        id: docSnap.id,
        name: data.brandName || data.salonName || 'Unnamed Business',
        category: data.category || col.type,
        address: data.address || '',
        rating: typeof data.rating === 'number' ? data.rating : 5.0,
        verified: data.verified ?? true,
        latitude: data.latitude,
        longitude: data.longitude,
        distanceKm,
        logo: data.logo,
        hours: data.hours,
        vinLink: data.vinLink || (col.type === 'salon' ? `/salon/${docSnap.id}` : `/food/${docSnap.id}`),
        isOpenNow: isBusinessOpenNow(data.hours),
      });
    });
  }

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