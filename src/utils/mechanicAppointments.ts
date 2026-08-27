import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { firestore as db } from '../firebase';

/**
 * MECHANIC APPOINTMENT RECEIPTS
 * ---------------------------------------------------------------------------
 * Mechanics don't take payment through Stripe — the customer submits a repair
 * request and it sits as "Received" until the garage accepts it. Acceptance,
 * not payment, is what turns it into a receipt.
 *
 * The operational record stays where mechanicStore/mechanicDashboard already
 * put it (mechanics/{businessUid}/repair_requests/{id}). What acceptance adds
 * is a customer-side copy at customers/{customerUid}/mechanicAppointments/{id},
 * because Front.tsx's receipt drawer only reads collections under the
 * customer's own tree — same shape as hotelReservations. Writing the copy
 * rather than moving the original keeps the garage's workbench untouched.
 *
 * Firestore rules must let the accepting mechanic write into the customer's
 * tree; the guard is `request.auth.uid == request.resource.data.businessId`.
 */

export interface MechanicReceiptInput {
  requestId: string;
  customerUid: string;
  businessUid: string;
  businessName?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: string;
  problemCategory?: string;
  urgency?: string;
  preferredDate?: string;
  suggestedTime?: string;
  description?: string;
  /** Reference the customer quotes at the counter. */
  referenceId: string;
}

/** "MEC-482913" — same shape as the salon (SAL-) and hotel (HTL-) refs. */
export function buildMechanicReferenceId(): string {
  return `MEC-${Math.floor(100000 + Math.random() * 900000)}`;
}

/**
 * Writes (or refreshes) the customer's copy of an accepted repair booking.
 * Idempotent — keyed on requestId, so re-accepting can't create duplicates.
 */
export async function writeMechanicReceipt(input: MechanicReceiptInput): Promise<void> {
  const { customerUid, requestId } = input;
  if (!customerUid || customerUid === 'guest_user') {
    // A request submitted before the identity handshake completed has no
    // customer tree to write into. The garage still has the job; there's
    // just nobody to hand a receipt to.
    console.warn('Mechanic acceptance has no customerUid — skipping receipt.');
    return;
  }

  await setDoc(
    doc(db, 'customers', customerUid, 'mechanicAppointments', requestId),
    {
      requestId,
      referenceId: input.referenceId,
      // businessId is what the security rule authorises this cross-tree
      // write against, and what the garage's own reads filter on.
      businessId: input.businessUid,
      businessName: input.businessName || 'Mechanic',
      customerUid,
      vehicleMake: input.vehicleMake || '',
      vehicleModel: input.vehicleModel || '',
      vehicleYear: input.vehicleYear || '',
      problemCategory: input.problemCategory || '',
      urgency: input.urgency || '',
      preferredDate: input.preferredDate || '',
      suggestedTime: input.suggestedTime || '',
      description: input.description || '',
      status: 'accepted',
      acceptedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}
