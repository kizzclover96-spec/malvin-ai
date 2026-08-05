import { doc, setDoc } from 'firebase/firestore';
import { firestore as db } from '../firebase';

/**
 * UNIVERSAL FREE-TIER INTAKE LIMIT
 * ---------------------------------------------------------------------------
 * A business on the free tier can take FREE_TIER_INTAKE_LIMIT jobs per cycle —
 * orders for a restaurant, appointments for a salon, reservations for a hotel,
 * repair requests for a mechanic. Hitting the cap starts a 24h cooldown, after
 * which the counter resets on its own.
 *
 * This used to live inline in Food.tsx and applied to restaurants only, keyed
 * on `isVerified` alone. Two consequences: a salon, hotel, or mechanic had no
 * cap at all, and a merely-verified free account was already exempt. Both are
 * fixed by routing every category through here.
 *
 * THE EXEMPTION RULE: the cap lifts only while an account is BOTH premium and
 * verified, and it comes straight back the moment either drops away — an
 * unsubscribe, or an admin clearing the verification mark. Nothing is
 * "permanently unlocked"; `unlimited` is recomputed from live flags every
 * time, never persisted as an earned entitlement.
 */

export type MerchantType = 'food' | 'salon' | 'hotel' | 'mechanic';

/** Where each category's public profile document lives. */
export const MERCHANT_PROFILE_COLLECTION: Record<MerchantType, string> = {
  food: 'restaurantprofile',
  salon: 'salons',
  hotel: 'hotels',
  mechanic: 'mechanics',
};

/** Human label for the thing being counted, used in merchant-facing copy. */
export const MERCHANT_INTAKE_NOUN: Record<MerchantType, string> = {
  food: 'orders',
  salon: 'appointments',
  hotel: 'reservations',
  mechanic: 'repair requests',
};

export const FREE_TIER_INTAKE_LIMIT = 10;
export const COOLDOWN_HOURS = 24;

export interface IntakeLimitFlags {
  isPremium: boolean;
  isVerified: boolean;
}

export interface IntakeLimitState {
  /** True when the cap doesn't apply at all (premium AND verified). */
  unlimited: boolean;
  /** True when intake is currently frozen. */
  limitReached: boolean;
  /** ISO timestamp the freeze lifts, or null when not frozen. */
  cooldownExpiresAt: string | null;
  /** Jobs still accepted this cycle. Infinity when unlimited. */
  remaining: number;
}

/**
 * Pure decision function — no I/O, so the same rule can be applied from a
 * dashboard's live feed, a storefront's gate, or a test.
 *
 * `activeCount` is however many live jobs the caller counts for this cycle.
 * `cooldownExpiresAt` is whatever is already stored on the profile, so an
 * in-flight cooldown survives a page reload rather than restarting.
 */
export function evaluateIntakeLimit(
  activeCount: number,
  flags: IntakeLimitFlags,
  storedCooldownExpiresAt?: string | null,
  now: number = Date.now()
): IntakeLimitState {
  const unlimited = flags.isPremium && flags.isVerified;

  if (unlimited) {
    // Clears any cooldown left over from before the account was upgraded,
    // rather than making them sit out a freeze they've since paid to escape.
    return { unlimited: true, limitReached: false, cooldownExpiresAt: null, remaining: Infinity };
  }

  let cooldownExpiresAt = storedCooldownExpiresAt || null;

  // An elapsed cooldown clears itself — this is what makes the cycle
  // self-resetting without a scheduled job.
  if (cooldownExpiresAt && now > new Date(cooldownExpiresAt).getTime()) {
    cooldownExpiresAt = null;
  }

  if (!cooldownExpiresAt && activeCount >= FREE_TIER_INTAKE_LIMIT) {
    cooldownExpiresAt = new Date(now + COOLDOWN_HOURS * 60 * 60 * 1000).toISOString();
  }

  return {
    unlimited: false,
    limitReached: !!cooldownExpiresAt,
    cooldownExpiresAt,
    remaining: Math.max(0, FREE_TIER_INTAKE_LIMIT - activeCount),
  };
}

/**
 * Mirrors the computed state onto the business's public profile so the
 * customer-facing storefront can refuse new jobs without recomputing
 * anything. Best-effort: a failed sync must never block the dashboard.
 */
export async function syncIntakeLimitState(
  merchantType: MerchantType,
  businessUid: string,
  state: IntakeLimitState,
  flags: IntakeLimitFlags
): Promise<void> {
  if (!businessUid) return;
  try {
    await setDoc(
      doc(db, MERCHANT_PROFILE_COLLECTION[merchantType], businessUid),
      {
        // Both names are written because the storefronts were already split
        // on this: Store.tsx gates on orderLimitReached, the salon UI on
        // appointmentLimitReached. Keeping both in sync avoids a rename
        // that would silently un-gate one of them.
        orderLimitReached: state.limitReached,
        appointmentLimitReached: state.limitReached,
        intakeLimitReached: state.limitReached,
        cooldownExpiresAt: state.cooldownExpiresAt,
        isPremium: flags.isPremium,
        isVerified: flags.isVerified,
      },
      { merge: true }
    );
  } catch (err) {
    console.error(`Failed to sync ${merchantType} intake limit state:`, err);
  }
}

/** "6h 12m 30s" until the cooldown lifts, or null once it has. */
export function formatCooldownRemaining(
  cooldownExpiresAt?: string | null,
  now: number = Date.now()
): string | null {
  if (!cooldownExpiresAt) return null;
  const distance = new Date(cooldownExpiresAt).getTime() - now;
  if (distance <= 0) return null;

  const hours = Math.floor(distance / (1000 * 60 * 60));
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);
  return `${hours}h ${minutes}m ${seconds}s`;
}
