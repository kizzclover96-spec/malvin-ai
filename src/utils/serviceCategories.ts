/**
 * SERVICE CATEGORY CATALOG
 * ---------------------------------------------------------------------------
 * Single source of truth for the "Services" business type — one generic
 * workspace (see serviceDashboard.tsx) that a business brands by picking
 * which categories it offers, rather than a separate dashboard per trade.
 *
 * A provider can offer more than one category (a handyman doing both
 * Plumbing and Electrical, say), but the workspace still needs ONE color to
 * actually paint itself with. `primaryCategory` (the first category in this
 * list's order that the provider has selected — not selection order, so
 * reordering their picks doesn't make the theme flicker) decides that.
 *
 * This file intentionally has no Firebase imports — it's pure data/logic so
 * the dashboard, the scanner, and the customer storefront can all import it
 * without pulling in unrelated dependencies.
 */

export interface ServiceCategoryDef {
  key: string;
  label: string;
  emoji: string;
  /** Solid accent color — badges, buttons, the QR card border, etc. */
  color: string;
  /** Two-stop gradient built from `color` — headers, hero backgrounds. */
  gradient: string;
  /** Low-opacity wash of `color` — card backgrounds, chip fills. */
  tint: string;
}

export const SERVICE_CATEGORIES: ServiceCategoryDef[] = [
  { key: 'plumbing', label: 'Plumbing', emoji: '🔧', color: '#2563EB', gradient: 'linear-gradient(135deg, #3B82F6, #1D4ED8)', tint: 'rgba(37,99,235,0.12)' },
  { key: 'electrical', label: 'Electrical', emoji: '⚡', color: '#D97706', gradient: 'linear-gradient(135deg, #FBBF24, #B45309)', tint: 'rgba(217,119,6,0.12)' },
  { key: 'cleaning', label: 'Cleaning', emoji: '🧹', color: '#059669', gradient: 'linear-gradient(135deg, #34D399, #047857)', tint: 'rgba(5,150,105,0.12)' },
  { key: 'gardening', label: 'Gardening', emoji: '🌳', color: '#16A34A', gradient: 'linear-gradient(135deg, #4ADE80, #15803D)', tint: 'rgba(22,163,74,0.12)' },
  { key: 'painting', label: 'Painting', emoji: '🎨', color: '#DB2777', gradient: 'linear-gradient(135deg, #F472B6, #9D174D)', tint: 'rgba(219,39,119,0.12)' },
  { key: 'locksmith', label: 'Locksmith', emoji: '🔐', color: '#DC2626', gradient: 'linear-gradient(135deg, #F87171, #991B1B)', tint: 'rgba(220,38,38,0.12)' },
  { key: 'computer_repair', label: 'Computer Repair', emoji: '💻', color: '#7C3AED', gradient: 'linear-gradient(135deg, #A78BFA, #5B21B6)', tint: 'rgba(124,58,237,0.12)' },
  { key: 'appliance_repair', label: 'Appliance Repair', emoji: '🧰', color: '#0891B2', gradient: 'linear-gradient(135deg, #22D3EE, #0E7490)', tint: 'rgba(8,145,178,0.12)' },
  { key: 'handyman', label: 'Handyman', emoji: '🛠', color: '#475569', gradient: 'linear-gradient(135deg, #94A3B8, #334155)', tint: 'rgba(71,85,105,0.12)' },
  { key: 'moving', label: 'Moving & Hauling', emoji: '📦', color: '#EA580C', gradient: 'linear-gradient(135deg, #FB923C, #9A3412)', tint: 'rgba(234,88,12,0.12)' },
];

const FALLBACK: ServiceCategoryDef = {
  key: 'general',
  label: 'General Services',
  emoji: '🧰',
  color: '#0EA5E9',
  gradient: 'linear-gradient(135deg, #38BDF8, #0369A1)',
  tint: 'rgba(14,165,233,0.12)',
};

export function getServiceCategory(key: string | undefined | null): ServiceCategoryDef {
  return SERVICE_CATEGORIES.find((c) => c.key === key) || FALLBACK;
}

/**
 * Picks the theme for a provider offering possibly-several categories.
 * Deterministic on SERVICE_CATEGORIES' own order (not the order the
 * provider clicked them in, and not array-storage order either) so
 * re-saving the same set of categories in a different sequence never
 * changes the color a returning customer already associates with them.
 */
export function resolvePrimaryCategory(offeredKeys: string[] | undefined | null): ServiceCategoryDef {
  if (!offeredKeys || offeredKeys.length === 0) return FALLBACK;
  for (const cat of SERVICE_CATEGORIES) {
    if (offeredKeys.includes(cat.key)) return cat;
  }
  return FALLBACK;
}
