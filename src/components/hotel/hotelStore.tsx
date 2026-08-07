import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { firestore as db, auth } from '../../firebase';
import { doc, getDoc, collection, onSnapshot, runTransaction } from 'firebase/firestore';
import { getDatabase, ref, onValue } from 'firebase/database';
import {
  Wifi,
  Coffee,
  Users,
  BedDouble,
  MapPin,
  Clock,
  CheckCircle2,
  Minus,
  Plus,
  ShieldCheck,
  X,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Lock,
} from 'lucide-react';
import Banned from '../addons/Banned';
import Suspended from '../addons/Suspended';
import { resolveVerifiedFlag } from '../../utils/verification';
import { useAccountStanding } from '../../hooks/useAccountStanding';
import { evaluateIntakeLimit, formatCooldownRemaining } from '../../utils/businessLimits';
import IntakeLimitBanner from '../addons/IntakeLimitBanner';
import { AuthRequiredPopup } from '../addons/AuthRequiredPopup';
import styles from './hotelStore.module.css';

// --- Types ---
interface HotelProfile {
  hotelName: string;
  bio: string;
  address: string;
  holdDurationMinutes: number;
  currency: string;
  isVerified?: boolean;
  openingTime?: string;
  closingTime?: string;
  cooldownExpiresAt?: string | null;
}

interface Room {
  roomId: string;
  category: string;
  price: number;
  maxGuests: number;
  bedType: string;
  wifi: boolean;
  breakfastIncluded: boolean;
  totalUnits: number;
  availableUnits: number;
  photos: string[];
  description: string;
}

interface ActiveReservation {
  referenceId: string;
  roomCategory: string;
  checkIn: string;
  checkOut: string;
  totalPrice: number;
  holdExpiresAt: number;
}

const VerifiedBadge = () => (
  <span className={styles.verifiedPill}>
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
    </svg>
    Verified
  </span>
);

function todayISO(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function nightsBetween(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  const inMs = new Date(checkIn).getTime();
  const outMs = new Date(checkOut).getTime();
  const diff = Math.round((outMs - inMs) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

/** Reads "HH:MM" opening/closing strings against the current local time.
 * Handles the overnight case (closing time earlier than opening time,
 * e.g. opens 09:00 / closes 02:00) by treating "now before closing OR
 * after opening" as open. */
function computeOpenStatus(openingTime?: string, closingTime?: string): { isOpen: boolean; label: string } {
  if (!openingTime || !closingTime) return { isOpen: true, label: 'Open 24 hours' };
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = openingTime.split(':').map(Number);
  const [ch, cm] = closingTime.split(':').map(Number);
  const openMinutes = oh * 60 + om;
  const closeMinutes = ch * 60 + cm;

  let isOpen: boolean;
  if (closeMinutes > openMinutes) {
    isOpen = nowMinutes >= openMinutes && nowMinutes < closeMinutes;
  } else {
    // overnight range
    isOpen = nowMinutes >= openMinutes || nowMinutes < closeMinutes;
  }
  return { isOpen, label: `${openingTime} – ${closingTime}` };
}

export default function HotelStore() {
  const { uid } = useParams<{ uid: string }>();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<HotelProfile | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [customerUid, setCustomerUid] = useState<string | null>(null);

  // Booking sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetStep, setSheetStep] = useState<'detail' | 'dates' | 'review'>('detail');
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  const [checkIn, setCheckIn] = useState(todayISO(0));
  const [checkOut, setCheckOut] = useState(todayISO(1));
  const [guestCount, setGuestCount] = useState(1);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestEmail, setGuestEmail] = useState('');

  const [isSubmitting, setIsSubmitting] = useState<'hold' | 'pay' | null>(null);
  const [activeReservation, setActiveReservation] = useState<ActiveReservation | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());

  const [isBanned, setIsBanned] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);
  const [brandStatusData, setBrandStatusData] = useState<any>(null);
  // The hotel's own RTDB user node, already being read below for ban status.
  // The verification mark lives there too (that's where admin tooling writes
  // it) — the hotels Firestore doc declares an isVerified field but nothing
  // ever populates it, which is why the badge never appeared.
  const [rtdbUser, setRtdbUser] = useState<any>(null);

  const carouselRef = useRef<HTMLDivElement>(null);

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  // Accepts the RTDB flag or the profile doc's, so the badge shows whichever
  // source this hotel happens to have set.
  const isVerified = resolveVerifiedFlag(rtdbUser, profile);
  const { isPremium } = useAccountStanding(uid);
  const [cooldownLabel, setCooldownLabel] = useState<string | null>(null);

  // Cooldown/limit state is precomputed by hotelDashboard.tsx and synced
  // onto this same profile doc — the store just reflects it, never starts
  // a fresh cooldown itself (hence activeCount fixed at 0 here).
  const intakeState = evaluateIntakeLimit(0, { isPremium, isVerified }, profile?.cooldownExpiresAt);

  useEffect(() => {
    if (!intakeState.cooldownExpiresAt) {
      setCooldownLabel(null);
      return;
    }
    const tick = () => setCooldownLabel(formatCooldownRemaining(intakeState.cooldownExpiresAt));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [intakeState.cooldownExpiresAt]);

  // --- Handshake with parent StoreFront iframe (VINQR scan flow) ---
  useEffect(() => {
    window.parent.postMessage({ type: 'HOTEL_READY' }, '*');
  }, []);

  useEffect(() => {
    const receiveFromShell = (event: MessageEvent) => {
      if (event.data?.type === 'MALVIN_USER') setCustomerUid(event.data.uid);

      // The shell couldn't open a Stripe session. Without this the pay button
      // would stay stuck in its submitting state, since the redirect it was
      // waiting for never happens. Reporting the reason to the customer is
      // App.jsx's job — it raises the payment result screen for this same
      // message, so showing a toast here too would just double up.
      if (event.data?.type === 'DIRECT_PAYMENT_FAILURE') {
        setIsSubmitting(null);
      }
    };
    window.addEventListener('message', receiveFromShell);
    return () => window.removeEventListener('message', receiveFromShell);
  }, []);

  useEffect(() => {
    if (!customerUid && auth.currentUser) setCustomerUid(auth.currentUser.uid);
  }, [customerUid]);

  // --- Ban / suspension status ---
  useEffect(() => {
    if (!uid) return;
    const rtdb = getDatabase();
    const userRef = ref(rtdb, `users/${uid}`);
    const unsubscribe = onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setRtdbUser(data);
        const status = data.brandData?.status || data.status || '';
        setIsBanned(status === 'Banned' || data.banned === true || data.isBanned === true);
        setIsSuspended(status === 'Suspended' || data.suspended === true || data.isSuspended === true);
        setBrandStatusData({
          id: uid,
          banReason: data.brandData?.banReason || data.banReason || 'Violation of platform policies or suspicious activity detected.',
          suspensionReason: data.brandData?.suspensionReason || data.suspensionReason || 'Temporary restriction due to policy violation.',
          suspensionEnds: data.brandData?.suspensionEnds || data.suspensionEnds || null,
        });
      }
    });
    return () => unsubscribe();
  }, [uid]);

  // --- Profile + rooms feed ---
  useEffect(() => {
    if (!uid) return;

    const loadProfile = async () => {
      try {
        const snap = await getDoc(doc(db, 'hotels', uid));
        if (snap.exists()) {
          setProfile(snap.data() as HotelProfile);
        } else {
          triggerToast('Hotel configuration missing.');
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        triggerToast('Failed loading hotel configuration.');
        setLoading(false);
      }
    };

    loadProfile();

    const unsubRooms = onSnapshot(
      collection(db, 'hotelstation', uid, 'rooms'),
      (snap) => {
        const list = snap.docs.map((d) => {
          const data = d.data();
          return {
            roomId: d.id,
            category: data.category || 'Room',
            price: Number(data.price || 0),
            maxGuests: Number(data.maxGuests || 1),
            bedType: data.bedType || '',
            wifi: !!data.wifi,
            breakfastIncluded: !!data.breakfastIncluded,
            totalUnits: Number(data.totalUnits || 0),
            availableUnits: Number(data.availableUnits ?? data.totalUnits ?? 0),
            photos: Array.isArray(data.photos) ? data.photos : [],
            description: data.description || '',
          } as Room;
        });
        list.sort((a, b) => a.price - b.price);
        setRooms(list);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        triggerToast('Error loading room categories.');
        setLoading(false);
      }
    );

    return () => unsubRooms();
  }, [uid]);

  // --- Live countdown for an active unpaid hold ---
  useEffect(() => {
    if (!activeReservation) return;
    const interval = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [activeReservation]);

  const holdMsRemaining = activeReservation ? activeReservation.holdExpiresAt - nowTick : 0;
  const holdExpired = !!activeReservation && holdMsRemaining <= 0;

  const nights = useMemo(() => nightsBetween(checkIn, checkOut), [checkIn, checkOut]);
  const totalPrice = useMemo(
    () => (selectedRoom ? selectedRoom.price * Math.max(nights, 1) : 0),
    [selectedRoom, nights]
  );

  const currencySymbol = profile?.currency || '€';
  const openStatus = useMemo(
    () => computeOpenStatus(profile?.openingTime, profile?.closingTime),
    [profile?.openingTime, profile?.closingTime]
  );

  const openRoomDetail = (room: Room) => {
    setSelectedRoom(room);
    setPhotoIndex(0);
    setGuestCount(1);
    setSheetStep('detail');
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
  };

  const goToDates = () => setSheetStep('dates');

  const goToReview = () => {
    if (nights < 1) {
      triggerToast('Check-out must be after check-in.');
      return;
    }
    if (!guestName.trim() || !guestPhone.trim()) {
      triggerToast('Please add a name and phone number.');
      return;
    }
    setSheetStep('review');
  };

  /** Stages the hold (decrements availableUnits, writes the reservation doc
   * as status "held"). Shared by both the free-hold and pay-now paths — the
   * only difference is what happens right after. */
  const stageReservation = async (): Promise<{ reservationId: string; referenceId: string } | null> => {
    if (!uid || !selectedRoom || !customerUid) {
      triggerToast('Still connecting your account — try again in a moment.');
      return null;
    }
    const holdMinutes = profile?.holdDurationMinutes || 60;
    const holdExpiresAt = Date.now() + holdMinutes * 60000;
    const reservationId = `res_${Date.now()}`;
    const referenceId = `HTL-${Math.floor(100000 + Math.random() * 900000)}`;
    const roomRef = doc(db, 'hotelstation', uid, 'rooms', selectedRoom.roomId);
    const reservationRef = doc(db, 'customers', customerUid, 'hotelReservations', reservationId);

    await runTransaction(db, async (tx) => {
      const roomSnap = await tx.get(roomRef);
      if (!roomSnap.exists()) throw new Error('This room type is no longer available.');
      const available = Number(roomSnap.data().availableUnits ?? 0);
      if (available <= 0) throw new Error('This room type just sold out — please pick another.');

      tx.update(roomRef, { availableUnits: available - 1 });

      tx.set(reservationRef, {
        reservationId,
        referenceId,
        businessId: uid,
        customerUid,
        roomId: selectedRoom.roomId,
        roomCategory: selectedRoom.category,
        price: selectedRoom.price,
        checkIn,
        checkOut,
        nights,
        guestCount,
        totalPrice,
        guestName: guestName.trim(),
        guestPhone: guestPhone.trim(),
        guestEmail: guestEmail.trim(),
        status: 'held',
        paymentStatus: false,
        holdDurationMinutes: holdMinutes,
        holdExpiresAt,
        createdAt: new Date(),
      });
    });

    return { reservationId, referenceId };
  };

  const handleReserveWithoutPaying = async () => {
    if (isSubmitting) return;
    setIsSubmitting('hold');
    try {
      const staged = await stageReservation();
      if (!staged) return;
      const holdMinutes = profile?.holdDurationMinutes || 60;
      setActiveReservation({
        referenceId: staged.referenceId,
        roomCategory: selectedRoom!.category,
        checkIn,
        checkOut,
        totalPrice,
        holdExpiresAt: Date.now() + holdMinutes * 60000,
      });
      setNowTick(Date.now());
      setSheetOpen(false);
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || 'Could not place this hold. Please try again.');
    } finally {
      setIsSubmitting(null);
    }
  };

  /**
   * Opens Stripe checkout for a reservation that's already been staged.
   *
   * Hotel checkout builds its own payment request rather than handing off to
   * the shared /ticket-checkout screen, because that screen only knows how to
   * label a payment "food" or "salon". A hotel booking sent through it reached
   * the webhook labelled "salon", so the webhook took the salon branch and
   * never confirmed the reservation — the guest paid and the hold sweep then
   * released their room anyway. What the webhook actually needs is
   * merchantType "hotel" plus the reservationId identifying which held
   * document to confirm (see malvinbackend/src/index.ts).
   */
  const requestHotelPayment = async (staged: { reservationId: string; referenceId: string }) => {
    const paymentRequest = {
      amount: totalPrice,
      targetBusinessUid: uid,
      merchantType: 'hotel',
      appointmentDetails: {
        reservationId: staged.reservationId,
        referenceId: staged.referenceId,
        roomCategory: selectedRoom!.category,
        checkIn,
        checkOut,
        nights,
        guestCount,
        customerName: guestName.trim(),
        customerPhone: guestPhone.trim(),
      },
    };

    // Scanned via VINQR: we're inside the StoreFront shell, which owns the
    // authenticated session and performs the top-level Stripe redirect.
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'REQUEST_DIRECT_PAYMENT', payload: paymentRequest }, '*');
      return;
    }

    // Opened directly (a shared /hotel/:uid link in a normal tab) — there's no
    // parent shell to delegate to, so create the session here.
    const { getFunctions, httpsCallable } = await import('firebase/functions');
    const createDirectPaymentSession = httpsCallable(getFunctions(), 'createDirectPaymentSession');
    const response: any = await createDirectPaymentSession(paymentRequest);

    if (!response?.data?.url) throw new Error('Invalid checkout response.');
    window.location.href = response.data.url;
  };

  const handlePayAndConfirm = async () => {
    if (isSubmitting) return;
    setIsSubmitting('pay');
    try {
      const staged = await stageReservation();
      if (!staged) {
        setIsSubmitting(null);
        return;
      }

      await requestHotelPayment(staged);
      // Deliberately leaves isSubmitting set — a redirect to Stripe is about
      // to take over the page, and re-enabling the button first would let an
      // impatient second tap stage a duplicate hold.
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || 'Could not start checkout. Please try again.');
      setIsSubmitting(null);
    }
  };

  const startNewSearch = () => {
    setActiveReservation(null);
    setSelectedRoom(null);
    setGuestName('');
    setGuestPhone('');
    setGuestEmail('');
  };

  const scrollCarousel = (dir: 'left' | 'right') => {
    const el = carouselRef.current;
    if (!el) return;
    el.scrollBy({ left: dir === 'left' ? -260 : 260, behavior: 'smooth' });
  };

  if (isBanned) return <Banned userBrand={brandStatusData} />;
  if (isSuspended) return <Suspended userBrand={brandStatusData} />;

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeletonHero} />
        <div className={styles.skeletonRow}>
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={styles.page}>
        <div className={styles.emptyState}>This hotel isn't available right now.</div>
      </div>
    );
  }

  // Full-screen "hold placed" confirmation takes over the whole page
  if (activeReservation) {
    return (
      <div className={styles.page}>
        {!holdExpired ? (
          <div className={styles.successScreen}>
            <div className={styles.successBadge}><CheckCircle2 size={36} /></div>
            <h1 className={styles.successTitle}>Room held</h1>
            <p className={styles.successSub}>
              {activeReservation.roomCategory} · {activeReservation.checkIn} → {activeReservation.checkOut}
            </p>
            <div className={styles.countdownRing}>
              <span className={styles.countdownLabel}>Hold expires in</span>
              <span className={styles.countdownTimer}>{formatCountdown(holdMsRemaining)}</span>
            </div>
            <div className={styles.referenceChip}>{activeReservation.referenceId}</div>
            <p className={styles.smallPrint}>Give this code at the front desk to confirm before the hold expires.</p>
            <button className={styles.ghostButton} onClick={startNewSearch}>Browse other rooms</button>
          </div>
        ) : (
          <div className={styles.successScreen}>
            <h1 className={styles.successTitle}>Hold expired</h1>
            <p className={styles.successSub}>This room was automatically released. Please make a new reservation.</p>
            <button className={styles.primaryButton} onClick={startNewSearch}>Browse rooms again</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Signed-out backstop — catches anyone with zero Firebase session
          before they hit a raw Firestore permission error trying to
          reserve. Page still renders underneath — this only blocks
          interaction. */}
      {uid && <AuthRequiredPopup targetPath={`/hotel/${uid}`} />}

      {toast && <div className={styles.toast}>{toast}</div>}

      {/* --- Identity hero --- */}
      <div className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroContent}>
          <div className={styles.heroTopRow}>
            <h1 className={styles.hotelName}>{profile.hotelName}</h1>
            {isVerified && <VerifiedBadge />}
          </div>
          {profile.bio && <p className={styles.motto}>“{profile.bio}”</p>}
          {profile.address && (
            <div className={styles.addressRow}>
              <MapPin size={14} />
              <span>{profile.address}</span>
            </div>
          )}
          <div className={styles.hoursRow}>
            <span className={`${styles.hoursDot} ${openStatus.isOpen ? styles.dotOpen : styles.dotClosed}`} />
            <Clock size={13} />
            <span>{openStatus.isOpen ? 'Open now' : 'Closed now'} · {openStatus.label}</span>
          </div>

          <div style={{ marginTop: '14px' }}>
            <IntakeLimitBanner
              merchantType="hotel"
              state={intakeState}
              cooldownLabel={cooldownLabel}
              isPremium={isPremium}
              isVerified={isVerified}
            />
          </div>
        </div>
      </div>

      {/* --- Room carousel --- */}
      <div className={styles.roomsSection}>
        <div className={styles.roomsSectionHeader}>
          <h2>Rooms</h2>
          {rooms.length > 1 && (
            <div className={styles.carouselNav}>
              <button onClick={() => scrollCarousel('left')}><ChevronLeft size={16} /></button>
              <button onClick={() => scrollCarousel('right')}><ChevronRight size={16} /></button>
            </div>
          )}
        </div>

        {rooms.length === 0 && <div className={styles.emptyState}>No room types published yet — check back soon.</div>}

        <div className={styles.carousel} ref={carouselRef}>
          {rooms.map((room) => {
            const soldOut = room.availableUnits <= 0;
            return (
              <div
                key={room.roomId}
                className={`${styles.roomTile} ${soldOut ? styles.roomTileDisabled : ''}`}
                onClick={() => !soldOut && openRoomDetail(room)}
              >
                <div className={styles.roomTileImage}>
                  {room.photos[0] ? (
                    <img src={room.photos[0]} alt={room.category} />
                  ) : (
                    <div className={styles.roomTilePlaceholder}><BedDouble size={28} /></div>
                  )}
                  <span className={soldOut ? styles.tileBadgeSoldOut : styles.tileBadgeAvailable}>
                    {soldOut ? 'Sold out' : `${room.availableUnits} left`}
                  </span>
                </div>
                <div className={styles.roomTileBody}>
                  <h3>{room.category}</h3>
                  <div className={styles.roomTileMeta}>
                    <span><Users size={12} /> {room.maxGuests}</span>
                    {room.wifi && <span><Wifi size={12} /></span>}
                    {room.breakfastIncluded && <span><Coffee size={12} /></span>}
                  </div>
                  <div className={styles.roomTilePrice}>
                    {currencySymbol}{room.price}<span>/night</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- Booking bottom sheet --- */}
      {sheetOpen && selectedRoom && (
        <div className={styles.sheetOverlay} onClick={closeSheet}>
          <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <button className={styles.sheetCloseBtn} onClick={closeSheet}><X size={18} /></button>

            {sheetStep === 'detail' && (
              <div className={styles.sheetScroll}>
                <div className={styles.sheetGallery}>
                  {selectedRoom.photos.length > 0 ? (
                    <img src={selectedRoom.photos[photoIndex]} alt={selectedRoom.category} />
                  ) : (
                    <div className={styles.galleryPlaceholder}><BedDouble size={32} /></div>
                  )}
                  {selectedRoom.photos.length > 1 && (
                    <div className={styles.galleryDots}>
                      {selectedRoom.photos.map((_, i) => (
                        <span
                          key={i}
                          className={i === photoIndex ? styles.dotActive : styles.dot}
                          onClick={() => setPhotoIndex(i)}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <h2 className={styles.sheetTitle}>{selectedRoom.category}</h2>
                <div className={styles.sheetPrice}>{currencySymbol}{selectedRoom.price} <span>/ night</span></div>
                {selectedRoom.description && <p className={styles.sheetDescription}>{selectedRoom.description}</p>}
                <div className={styles.amenityGrid}>
                  <div className={styles.amenityChip}><Users size={15} /> Up to {selectedRoom.maxGuests} guests</div>
                  {selectedRoom.bedType && <div className={styles.amenityChip}><BedDouble size={15} /> {selectedRoom.bedType}</div>}
                  <div className={styles.amenityChip}><Wifi size={15} /> {selectedRoom.wifi ? 'Free Wi-Fi' : 'No Wi-Fi'}</div>
                  <div className={styles.amenityChip}><Coffee size={15} /> {selectedRoom.breakfastIncluded ? 'Breakfast included' : 'No breakfast'}</div>
                </div>
                <button className={styles.primaryButton} onClick={goToDates}>Select dates</button>
              </div>
            )}

            {sheetStep === 'dates' && (
              <div className={styles.sheetScroll}>
                <h2 className={styles.sheetTitle}>Your stay</h2>
                <div className={styles.dateRow}>
                  <div className={styles.inputBlock}>
                    <label>Check-in</label>
                    <input
                      type="date"
                      className={styles.input}
                      value={checkIn}
                      min={todayISO(0)}
                      onChange={(e) => {
                        setCheckIn(e.target.value);
                        if (nightsBetween(e.target.value, checkOut) < 1) setCheckOut(todayISO(1));
                      }}
                    />
                  </div>
                  <div className={styles.inputBlock}>
                    <label>Check-out</label>
                    <input type="date" className={styles.input} value={checkOut} min={checkIn} onChange={(e) => setCheckOut(e.target.value)} />
                  </div>
                </div>

                <div className={styles.inputBlock}>
                  <label>Guests</label>
                  <div className={styles.stepperRow}>
                    <button type="button" className={styles.stepperBtn} onClick={() => setGuestCount((g) => Math.max(1, g - 1))}><Minus size={14} /></button>
                    <span className={styles.stepperValue}>{guestCount}</span>
                    <button type="button" className={styles.stepperBtn} onClick={() => setGuestCount((g) => Math.min(selectedRoom.maxGuests, g + 1))}><Plus size={14} /></button>
                  </div>
                </div>

                <div className={styles.inputBlock}>
                  <label>Full name</label>
                  <input className={styles.input} placeholder="e.g., Jane Doe" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
                </div>
                <div className={styles.inputBlock}>
                  <label>Phone</label>
                  <input className={styles.input} placeholder="e.g., +33 6 1234 5678" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} />
                </div>
                <div className={styles.inputBlock}>
                  <label>Email (optional)</label>
                  <input className={styles.input} placeholder="jane@example.com" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} />
                </div>

                {nights > 0 && (
                  <div className={styles.nightsSummary}>
                    {nights} night{nights > 1 ? 's' : ''} × {currencySymbol}{selectedRoom.price} = <strong>{currencySymbol}{totalPrice}</strong>
                  </div>
                )}

                <button className={styles.primaryButton} onClick={goToReview}>Continue</button>
              </div>
            )}

            {sheetStep === 'review' && (
              <div className={styles.sheetScroll}>
                <h2 className={styles.sheetTitle}>Confirm your stay</h2>
                <div className={styles.summaryCard}>
                  <div className={styles.summaryRow}><span>Room</span><strong>{selectedRoom.category}</strong></div>
                  <div className={styles.summaryRow}><span>Check-in</span><strong>{checkIn}</strong></div>
                  <div className={styles.summaryRow}><span>Check-out</span><strong>{checkOut}</strong></div>
                  <div className={styles.summaryRow}><span>Guests</span><strong>{guestCount}</strong></div>
                  <div className={styles.summaryDivider} />
                  <div className={styles.summaryRow}><span>Total</span><strong>{currencySymbol}{totalPrice}</strong></div>
                </div>

                <div className={styles.paymentChoiceStack}>
                  <button className={styles.payNowButton} disabled={!!isSubmitting} onClick={handlePayAndConfirm}>
                    <CreditCard size={16} />
                    <span>{isSubmitting === 'pay' ? 'Starting checkout…' : `Pay & confirm now — ${currencySymbol}${totalPrice}`}</span>
                  </button>
                  <div className={styles.securePaymentNote}><Lock size={11} /> Secure payment via Stripe</div>

                  <div className={styles.orDivider}><span>or</span></div>

                  <button className={styles.holdButton} disabled={!!isSubmitting} onClick={handleReserveWithoutPaying}>
                    <ShieldCheck size={16} />
                    <span>{isSubmitting === 'hold' ? 'Placing hold…' : `Hold without paying (${profile.holdDurationMinutes || 60} min)`}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}