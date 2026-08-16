/**
 * ORDER QR
 * ---------------------------------------------------------------------------
 * The QR a customer generates in BVinStore after building their cart from
 * the catalogue and choosing "that's all" instead of paying online. It's
 * fully self-contained (no Firestore round trip, no auth needed to
 * generate it) — the order itself is encoded straight into the QR content,
 * so any worker's scanner can read it back out with nothing but the string.
 *
 * This is deliberately a different code from the customer's own Malvin
 * card / store QR (the one used for payment / identity) — scanning THIS
 * one never charges anyone, it just hands the order to a worker to key in.
 *
 * Format: "MALVIN-ORDER:<base64 JSON>"
 * JSON shape: { businessId, items: [{ name, price, quantity }], total }
 */

export interface OrderQrItem {
  name: string;
  price: number;
  quantity: number;
}

export interface OrderQrPayload {
  businessId: string;
  items: OrderQrItem[];
  total: number;
}

export const ORDER_QR_PREFIX = 'MALVIN-ORDER:';

/** Builds the raw string that gets encoded into the QR image. */
export function encodeOrderQr(payload: OrderQrPayload): string {
  const json = JSON.stringify(payload);
  // btoa is UTF-8 unsafe for exotic characters (product names with emoji,
  // accented letters, etc.) — escape/unescape keeps it working for any text.
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return `${ORDER_QR_PREFIX}${b64}`;
}

/**
 * Parses a scanned string back into an order, or returns null if it isn't
 * one of ours (e.g. a customer card / store QR) — callers should fall back
 * to their existing scan handling in that case.
 */
export function decodeOrderQr(scannedText: string): OrderQrPayload | null {
  const text = scannedText.trim();
  if (!text.startsWith(ORDER_QR_PREFIX)) return null;

  try {
    const b64 = text.slice(ORDER_QR_PREFIX.length);
    const json = decodeURIComponent(escape(atob(b64)));
    const parsed = JSON.parse(json);
    if (!parsed || !Array.isArray(parsed.items)) return null;
    return {
      businessId: String(parsed.businessId || ''),
      items: parsed.items.map((i: any) => ({
        name: String(i?.name || 'Item'),
        price: Number(i?.price) || 0,
        quantity: Number(i?.quantity) || 1,
      })),
      total: Number(parsed.total) || 0,
    };
  } catch {
    return null;
  }
}
