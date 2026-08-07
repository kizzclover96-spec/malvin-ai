import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { firestore as db } from '../firebase';

/**
 * SERVICE REQUEST RECEIPTS
 * ---------------------------------------------------------------------------
 * The operational record lives where the customer's request landed —
 * serviceProviders/{businessUid}/serviceRequests/{id}, written directly by
 * the customer (same pattern mechanics/{uid}/repair_requests already uses).
 *
 * Unlike mechanics (no Stripe — acceptance alone is the receipt), Services
 * takes payment, so there's a real state machine:
 *
 *   requested → quoted → (negotiating)* → paid → completed
 *                                       ↘ cancelled
 *                                       ↘ expired
 *
 * QUOTING is what creates the customer's own visible copy (customers/{uid}/
 * serviceReceipts/{id}) — same reasoning as mechanic's "acceptance issues
 * the receipt": nothing worth showing the customer exists before that.
 *
 * HISTORY: per the plan, nothing is ever hard-deleted. "Cancel" and
 * "complete" just set status to 'cancelled' / 'completed' on both copies —
 * the active views (dashboard job board, receipt drawer) filter those OUT
 * client-side, and a History view filters for exactly those statuses. This
 * is deliberately simpler than physically moving documents to a separate
 * history collection: one status field, one field to filter on, no risk of
 * a copy existing in the active collection on one side and history on the
 * other after a failed write.
 */

export interface QuoteLineItem {
  label: string;
  amount: number;
}

export interface ServiceQuote {
  items: QuoteLineItem[];
  total: number;
}

/** "SRV-482913" — same shape as MEC-/SAL-/HTL- reference codes elsewhere. */
export function buildServiceReferenceId(): string {
  return `SRV-${Math.floor(100000 + Math.random() * 900000)}`;
}

export interface ServiceReceiptInput {
  requestId: string;
  customerUid: string;
  businessUid: string;
  businessName: string;
  categoryKey: string; // resolvePrimaryCategory's key, so the receipt can theme itself
  problem: string;
  photoUrl?: string;
  address: string;
  quote: ServiceQuote;
  allowNegotiation: boolean;
  referenceId: string;
}

/**
 * Writes (or refreshes) the customer's copy of a quoted service request.
 * Idempotent — keyed on requestId, so re-quoting can't create duplicates.
 */
export async function writeServiceReceipt(input: ServiceReceiptInput): Promise<void> {
  const { customerUid, requestId } = input;
  if (!customerUid) {
    console.warn('Service quote has no customerUid — skipping receipt.');
    return;
  }
  await setDoc(
    doc(db, 'customers', customerUid, 'serviceReceipts', requestId),
    {
      requestId,
      referenceId: input.referenceId,
      businessId: input.businessUid,
      businessName: input.businessName,
      customerUid,
      categoryKey: input.categoryKey,
      problem: input.problem,
      photoUrl: input.photoUrl || '',
      address: input.address,
      quote: input.quote,
      allowNegotiation: input.allowNegotiation,
      negotiationOffer: null,
      status: 'quoted',
      quotedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Mirrors a status/quote change onto BOTH copies at once (the customer's
 * receipt and the business's job-board record), so the two trees can never
 * drift onto different statuses for the same request. Used for negotiation
 * responses, cancellation, and completion — anything after the initial
 * quote.
 */
export async function syncServiceRequestStatus(
  businessUid: string,
  customerUid: string,
  requestId: string,
  patch: Record<string, any>
): Promise<void> {
  await Promise.all([
    updateDoc(doc(db, 'serviceProviders', businessUid, 'serviceRequests', requestId), patch).catch((err) =>
      console.error('Failed to update business-side service request:', err)
    ),
    updateDoc(doc(db, 'customers', customerUid, 'serviceReceipts', requestId), patch).catch((err) =>
      console.error('Failed to update customer-side service receipt:', err)
    ),
  ]);
}