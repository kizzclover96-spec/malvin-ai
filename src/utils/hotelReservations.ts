import {
  collectionGroup,
  collection,
  query,
  where,
  getDocs,
  doc,
  runTransaction,
} from 'firebase/firestore';
import { firestore as db } from '../firebase';

/**
 * HOTEL RESERVATION HOLD LIFECYCLE
 * ---------------------------------------------------------------------------
 * A reservation is created with status "held" and a holdExpiresAt timestamp
 * (now + the hotel's configured hold duration). Nothing is charged at this
 * point — it's just a soft lock on one unit of that room category.
 *
 * There's no scheduled Cloud Function in this build to sweep expired holds
 * server-side, so instead this client-side sweep runs opportunistically from
 * hotelDashboard.tsx while a manager has the desk open. Each release is
 * wrapped in its own transaction and re-checks status === 'held' before
 * touching anything, so it's safe if two manager tabs race to release the
 * same hold.
 *
 * Only callable by the hotel's own owner (or an admin) — the Firestore rules
 * only grant permission to mark a reservation "expired" or increment a
 * room's availableUnits back up to request.auth.uid == businessId / isAdmin.
 * A guest's browser calling this will just get permission-denied per
 * document, which is intentional: nobody but the hotel itself should be able
 * to release or reclaim a held room.
 *
 * TODO(production): move this sweep into a scheduled Cloud Function
 * (e.g. every 1 min) so holds still expire even when the dashboard is closed.
 */

export interface HotelReservation {
  id: string;
  path: string;
  reservationId: string;
  referenceId: string;
  businessId: string;
  roomId: string;
  roomCategory: string;
  price: number;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalPrice: number;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  status: 'held' | 'confirmed' | 'expired' | 'cancelled';
  holdDurationMinutes: number;
  holdExpiresAt: number;
  createdAt: any;
  customerUid: string;
}

/**
 * Scans every "held" reservation for one hotel and releases any that have
 * passed their hold window — bumping the room's availableUnits back up and
 * marking the reservation "expired". Safe to call frequently / redundantly.
 */
export async function releaseExpiredHotelHolds(businessUid: string): Promise<void> {
  if (!businessUid) return;

  try {
    const heldQuery = query(
      collectionGroup(db, 'hotelReservations'),
      where('businessId', '==', businessUid),
      where('status', '==', 'held')
    );

    const snap = await getDocs(heldQuery);
    const now = Date.now();

    const expired = snap.docs.filter((d) => {
      const data = d.data();
      return typeof data.holdExpiresAt === 'number' && data.holdExpiresAt <= now;
    });

    for (const reservationDoc of expired) {
      const data = reservationDoc.data();
      const roomRef = doc(db, 'hotelstation', businessUid, 'rooms', data.roomId);

      try {
        await runTransaction(db, async (tx) => {
          const freshReservationSnap = await tx.get(reservationDoc.ref);
          if (!freshReservationSnap.exists() || freshReservationSnap.data().status !== 'held') {
            return; // Already released by another tab/session.
          }

          const roomSnap = await tx.get(roomRef);
          if (roomSnap.exists()) {
            const roomData = roomSnap.data();
            const totalUnits = Number(roomData.totalUnits || 0);
            const availableUnits = Number(roomData.availableUnits || 0);
            tx.update(roomRef, {
              availableUnits: Math.min(totalUnits, availableUnits + 1),
            });
          }

          tx.update(reservationDoc.ref, { status: 'expired' });
        });
      } catch (err) {
        console.error('Failed releasing expired hotel hold:', reservationDoc.id, err);
      }
    }
  } catch (err) {
    console.error('releaseExpiredHotelHolds sweep failed:', err);
  }
}

/** Convenience: the manager-side rooms subcollection reference for a hotel. */
export function hotelRoomsCollection(businessUid: string) {
  return collection(db, 'hotelstation', businessUid, 'rooms');
}

export const HOLD_DURATION_OPTIONS = [
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '1 hour', value: 60 },
  { label: '2 hours', value: 120 },
];
