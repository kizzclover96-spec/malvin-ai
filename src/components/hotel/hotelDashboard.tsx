import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { shareContent, canOpenShareSheet } from '../../services/share';
import { publicOrigin } from '../../services/vinLink';
import { auth, firestore as db, storage } from '../../firebase';
import { getDatabase, ref, onValue } from 'firebase/database';
import { ref as storageRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  collection,
  collectionGroup,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import QRCode from 'qrcode';
import {
  BedDouble,
  Wifi,
  Coffee,
  Users,
  Plus,
  Pencil,
  Trash2,
  Copy,
  Share2,
  LogOut,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  ImagePlus,
  X,
  ScanLine,
  ExternalLink,
  Download,
} from 'lucide-react';
import Banned from '../addons/Banned';
import Suspended from '../addons/Suspended';
import ConfirmQRScanner from '../addons/ConfirmQRScanner';
import { releaseExpiredHotelHolds, HOLD_DURATION_OPTIONS } from '../../utils/hotelReservations';
import { geocodeAddress } from '../../utils/geocoding';
import { resolveVerifiedFlag } from '../../utils/verification';
import styles from './hotelDashboard.module.css';

/** Same blue check the salon and restaurant dashboards render. */
const VerifiedBadge = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="#007fff"
    style={{ display: 'inline-block', marginLeft: '6px', verticalAlign: 'middle' }}
  >
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
  </svg>
);

interface HotelProfile {
  hotelName: string;
  bio: string;
  address: string;
  currency: string;
  holdDurationMinutes: number;
  status: string;
  vinLink: string;
  openingTime: string;
  closingTime: string;
  isVerified?: boolean;
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

interface Reservation {
  id: string;
  path: string;
  reservationId: string;
  referenceId: string;
  roomId: string;
  roomCategory: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guestCount: number;
  totalPrice: number;
  guestName: string;
  guestPhone: string;
  guestEmail?: string;
  status: 'held' | 'confirmed' | 'expired' | 'cancelled';
  holdExpiresAt: number;
  createdAt: any;
  customerUid: string;
}

const ROOM_PRESETS = ['Economy', 'Standard', 'Business Suite', 'Deluxe Suite'];

export default function HotelDashboard() {
  const navigate = useNavigate();
  const rtdb = getDatabase();

  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hotel, setHotel] = useState<HotelProfile | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tab, setTab] = useState<'reservations' | 'rooms' | 'settings'>('reservations');
  const [toast, setToast] = useState<string | null>(null);
  const [nowTick, setNowTick] = useState(Date.now());

  const [isBanned, setIsBanned] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);
  const [brandStatusData, setBrandStatusData] = useState<any>(null);
  // Raw RTDB user node — kept in state so the verified mark can be
  // recomputed when either it or the Firestore hotel profile changes.
  const [rtdbUser, setRtdbUser] = useState<any>(null);

  // Receipt scanner (same anti-fraud panel the restaurant dashboard uses)
  const [showScanner, setShowScanner] = useState(false);
  const [scanResultMsg, setScanResultMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Settings form
  const [formName, setFormName] = useState('');
  const [formBio, setFormBio] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCurrency, setFormCurrency] = useState('€');
  const [formHold, setFormHold] = useState(60);
  const [formOpening, setFormOpening] = useState('09:00');
  const [formClosing, setFormClosing] = useState('21:00');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // Room modal
  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [rCategory, setRCategory] = useState('Standard');
  const [rCustomCategory, setRCustomCategory] = useState('');
  const [rPrice, setRPrice] = useState('');
  const [rGuests, setRGuests] = useState('2');
  const [rBedType, setRBedType] = useState('');
  const [rWifi, setRWifi] = useState(true);
  const [rBreakfast, setRBreakfast] = useState(false);
  const [rTotalUnits, setRTotalUnits] = useState('1');
  const [rDescription, setRDescription] = useState('');
  const [rPhotos, setRPhotos] = useState<string[]>([]);
  const [rUploading, setRUploading] = useState(false);
  const [isSavingRoom, setIsSavingRoom] = useState(false);

  // publicOrigin(), not window.location.origin — inside the native WebView
  // the latter is https://localhost, which bakes an unscannable link into
  // the VINQR. See services/vinLink.ts.
  const runtimeQrLink = uid ? `${publicOrigin()}/hotel/${uid}` : '';
  const isVerified = resolveVerifiedFlag(rtdbUser, hotel);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // --- Auth ---
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) setUid(user.uid);
      else {
        setLoading(false);
        navigate('/login');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // --- Ban / suspension ---
  useEffect(() => {
    if (!uid) return;
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
          ...hotel,
        });
      }
    });
    return () => unsubscribe();
  }, [uid, rtdb]);

  // --- Profile doc (create default on first visit) ---
  useEffect(() => {
    if (!uid) return;
    const docRef = doc(db, 'hotels', uid);

    const checkAndInitDoc = async () => {
      const snap = await getDoc(docRef);
      if (!snap.exists()) {
        const defaultDoc: HotelProfile & { createdAt: any; updatedAt: any } = {
          hotelName: 'My Hotel',
          bio: 'Welcome to our hotel — edit this from Settings.',
          address: '1 Harbor Street',
          currency: '€',
          holdDurationMinutes: 60,
          status: 'Active',
          vinLink: `/hotel/${uid}`,
          openingTime: '09:00',
          closingTime: '21:00',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        await setDoc(docRef, defaultDoc);
      }
    };

    checkAndInitDoc().then(() => {
      const unsub = onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data() as HotelProfile;
          setHotel(data);
          setFormName(data.hotelName || '');
          setFormBio(data.bio || '');
          setFormAddress(data.address || '');
          setFormCurrency(data.currency || '€');
          setFormHold(data.holdDurationMinutes || 60);
          setFormOpening(data.openingTime || '09:00');
          setFormClosing(data.closingTime || '21:00');
        }
        setLoading(false);
      });
      return unsub;
    });

    // Ensure the operational "hotelstation" marker doc exists too, so
    // collection listeners below have somewhere real to attach to.
    setDoc(doc(db, 'hotelstation', uid), { updatedAt: serverTimestamp() }, { merge: true }).catch(() => {});

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
      },
      (err) => {
        console.error('Error loading room categories:', err);
        showToast('Error loading room categories.');
      }
    );

    const reservationsQuery = query(
      collectionGroup(db, 'hotelReservations'),
      where('businessId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(100)
    );
    const unsubReservations = onSnapshot(
      reservationsQuery,
      (snap) => {
        setReservations(
          snap.docs.map((d) => ({ id: d.id, path: d.ref.path, ...(d.data() as any) } as Reservation))
        );
      },
      (err) => {
        console.error('Error loading reservations feed:', err);
        showToast('Error loading reservations feed.');
      }
    );

    // Sweep expired holds regularly while the dashboard is open.
    releaseExpiredHotelHolds(uid);
    const sweepInterval = setInterval(() => releaseExpiredHotelHolds(uid), 20000);
    const tickInterval = setInterval(() => setNowTick(Date.now()), 1000);

    return () => {
      unsubRooms();
      unsubReservations();
      clearInterval(sweepInterval);
      clearInterval(tickInterval);
    };
  }, [uid]);

  useEffect(() => {
    if (!runtimeQrLink) return;
    QRCode.toDataURL(runtimeQrLink, { width: 250, margin: 2 })
      .then((url) => setQrCodeUrl(url))
      .catch((err) => console.error('Error generating hotel QR code:', err));
  }, [runtimeQrLink]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(runtimeQrLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast('Link copied to clipboard!');
    } catch {
      showToast('Failed to copy link.');
    }
  };

  const handleShareLink = async () => {
    if (!canOpenShareSheet()) {
      handleCopyLink();
      return;
    }
    const result = await shareContent({ title: hotel?.hotelName, text: hotel?.bio, url: runtimeQrLink });
    if (result === 'failed' || result === 'unsupported') handleCopyLink();
  };

  const handleSaveSettings = async () => {
    if (!uid || !formName.trim()) {
      showToast('Hotel name is required.');
      return;
    }
    setIsSavingSettings(true);
    try {
      // Geocode the typed address into coordinates, same as the salon and
      // restaurant dashboards do. Without these the hotel can never show up
      // in the customer's "Nearby" strip, which filters on lat/lng.
      const coords = await geocodeAddress(formAddress.trim());
      if (!coords && formAddress.trim()) {
        console.warn('Could not geocode hotel address — it will not appear under Nearby until this resolves.');
      }

      await updateDoc(doc(db, 'hotels', uid), {
        hotelName: formName.trim(),
        bio: formBio.trim(),
        address: formAddress.trim(),
        currency: formCurrency.trim() || '€',
        holdDurationMinutes: formHold,
        openingTime: formOpening,
        closingTime: formClosing,
        // Only overwrite coordinates when the lookup actually succeeded —
        // writing 0/0 on a transient Nominatim failure would drop a hotel
        // that was previously locatable off the map entirely.
        ...(coords ? { latitude: coords.latitude, longitude: coords.longitude } : {}),
        updatedAt: serverTimestamp(),
      });
      showToast(coords || !formAddress.trim() ? 'Settings saved.' : 'Saved — but that address could not be located.');
    } catch (err) {
      console.error(err);
      showToast('Failed to save settings.');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/');
  };

  // --- Room CRUD ---
  const openAddRoom = () => {
    setEditingRoomId(null);
    setRCategory('Standard');
    setRCustomCategory('');
    setRPrice('');
    setRGuests('2');
    setRBedType('');
    setRWifi(true);
    setRBreakfast(false);
    setRTotalUnits('1');
    setRDescription('');
    setRPhotos([]);
    setRoomModalOpen(true);
  };

  const openEditRoom = (room: Room) => {
    setEditingRoomId(room.roomId);
    const isPreset = ROOM_PRESETS.includes(room.category);
    setRCategory(isPreset ? room.category : 'Custom');
    setRCustomCategory(isPreset ? '' : room.category);
    setRPrice(String(room.price));
    setRGuests(String(room.maxGuests));
    setRBedType(room.bedType);
    setRWifi(room.wifi);
    setRBreakfast(room.breakfastIncluded);
    setRTotalUnits(String(room.totalUnits));
    setRDescription(room.description);
    setRPhotos(room.photos);
    setRoomModalOpen(true);
  };

  const handleRoomPhotoUpload = async (files: FileList | null) => {
    const currentUser = auth.currentUser;

    console.log("Storage upload user:", currentUser);

    if (!currentUser || !files || files.length === 0) {
        showToast("You must be logged in to upload photos.");
        return;
    }

    const uid = currentUser.uid;
    setRUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files).slice(0, 4 - rPhotos.length)) {
        const path = `hotels/${uid}/rooms/${Date.now()}_${file.name}`;
        const fileRef = storageRef(storage, path);
        const snap = await uploadBytes(fileRef, file);
        uploaded.push(await getDownloadURL(snap.ref));
      }
      setRPhotos((prev) => [...prev, ...uploaded]);
    } catch (err) {
      console.error(err);
      showToast('Photo upload failed.');
    } finally {
      setRUploading(false);
    }
  };

  const removePhoto = async (url: string) => {
    setRPhotos((prev) => prev.filter((p) => p !== url));
    if (url.includes('firebasestorage.googleapis.com')) {
      try {
        await deleteObject(storageRef(storage, url));
      } catch (err) {
        console.warn('Could not delete storage object (already gone?):', err);
      }
    }
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) return;

    const category = rCategory === 'Custom' ? rCustomCategory.trim() : rCategory;
    const price = parseFloat(rPrice);
    const maxGuests = parseInt(rGuests, 10);
    const totalUnits = parseInt(rTotalUnits, 10);

    if (!category || isNaN(price) || price <= 0 || isNaN(maxGuests) || maxGuests <= 0 || isNaN(totalUnits) || totalUnits < 0) {
      showToast('Please fill in a valid category, price, guests, and unit count.');
      return;
    }

    setIsSavingRoom(true);
    try {
      const targetId = editingRoomId || `room_${Date.now()}`;
      const roomRef = doc(db, 'hotelstation', uid, 'rooms', targetId);

      if (editingRoomId) {
        // Preserve availableUnits, but shift it by however much totalUnits changed
        // so currently-held rooms aren't silently lost or duplicated.
        const existing = rooms.find((r) => r.roomId === editingRoomId);
        const prevTotal = existing?.totalUnits ?? totalUnits;
        const prevAvailable = existing?.availableUnits ?? totalUnits;
        const delta = totalUnits - prevTotal;
        const nextAvailable = Math.max(0, Math.min(totalUnits, prevAvailable + delta));

        await setDoc(
          roomRef,
          {
            category,
            price,
            maxGuests,
            bedType: rBedType.trim(),
            wifi: rWifi,
            breakfastIncluded: rBreakfast,
            totalUnits,
            availableUnits: nextAvailable,
            description: rDescription.trim(),
            photos: rPhotos,
          },
          { merge: true }
        );
      } else {
        await setDoc(roomRef, {
          category,
          price,
          maxGuests,
          bedType: rBedType.trim(),
          wifi: rWifi,
          breakfastIncluded: rBreakfast,
          totalUnits,
          availableUnits: totalUnits,
          description: rDescription.trim(),
          photos: rPhotos,
          createdAt: serverTimestamp(),
        });
      }

      await setDoc(doc(db, 'hotelstation', uid), { updatedAt: serverTimestamp() }, { merge: true });
      showToast(editingRoomId ? 'Room category updated.' : 'Room category added.');
      setRoomModalOpen(false);
    } catch (err) {
      console.error(err);
      showToast('Failed to save room category.');
    } finally {
      setIsSavingRoom(false);
    }
  };

  const handleDeleteRoom = async (roomId: string) => {
    if (!uid || !window.confirm('Permanently remove this room category?')) return;
    try {
      await deleteDoc(doc(db, 'hotelstation', uid, 'rooms', roomId));
      showToast('Room category removed.');
    } catch (err) {
      console.error(err);
      showToast('Failed to remove room category.');
    }
  };

  // --- Reservation actions ---
  const handleConfirmReservation = async (r: Reservation) => {
    try {
      await updateDoc(doc(db, r.path), { status: 'confirmed' });
      showToast(`${r.referenceId} confirmed.`);
    } catch (err) {
      console.error(err);
      showToast('Failed to confirm reservation.');
    }
  };

  const handleCancelReservation = async (r: Reservation) => {
    if (!uid) return;
    if (!window.confirm(`Cancel ${r.referenceId} and release the room?`)) return;
    try {
      await runTransaction(db, async (tx) => {
        const roomRef = doc(db, 'hotelstation', uid, 'rooms', r.roomId);
        const resRef = doc(db, r.path);
        const roomSnap = await tx.get(roomRef);
        const resSnap = await tx.get(resRef);
        if (!resSnap.exists()) return;
        const currentStatus = resSnap.data().status;
        if (currentStatus === 'cancelled' || currentStatus === 'expired') return;

        if (roomSnap.exists()) {
          const total = Number(roomSnap.data().totalUnits || 0);
          const available = Number(roomSnap.data().availableUnits || 0);
          tx.update(roomRef, { availableUnits: Math.min(total, available + 1) });
        }
        tx.update(resRef, { status: 'cancelled' });
      });
      showToast(`${r.referenceId} cancelled — room released.`);
    } catch (err) {
      console.error(err);
      showToast('Failed to cancel reservation.');
    }
  };

  /**
   * Front-desk receipt verification — the restaurant dashboard's scanner
   * flow, adapted for reservations.
   *
   * One deliberate difference from Food.tsx: that handler *deletes* the
   * matched order once verified, because a collected takeaway order has no
   * life left. A reservation does — the desk still needs the record for the
   * length of the stay, and deleting it would also strand the room unit that
   * was decremented at hold time. The security rules agree: delete is
   * unconditionally denied on hotelReservations. So a verified scan promotes
   * the reservation to "confirmed" rather than removing anything.
   */
  const handleScanReceiptCode = async (scannedOutput: string) => {
    if (!scannedOutput) return;

    let targetIdOrCode = scannedOutput.trim();

    // The QR may carry a full deep link (…/hotel/<uid>) — keep only the tail.
    if (targetIdOrCode.includes('/')) {
      targetIdOrCode = targetIdOrCode.split('/').pop() || targetIdOrCode;
    }

    // …or a JSON payload, which is what Front.tsx encodes into customer QRs.
    let parsedTicketId: string | null = null;
    let parsedReferenceId: string | null = null;
    try {
      const parsed = JSON.parse(targetIdOrCode);
      parsedTicketId = parsed.ticketId || parsed.reservationId || null;
      parsedReferenceId = parsed.referenceId || parsed.code || null;
    } catch {
      // Plain text — a typed reference like "HTL-123456" or a raw doc id.
    }

    try {
      const searchToken = targetIdOrCode.toLowerCase();
      const norm = (v?: string | null) => (v ? String(v).trim().toLowerCase() : null);

      const matched = reservations.find((r) => {
        const candidates = [norm(r.referenceId), norm(r.reservationId), norm(r.id)];
        return (
          candidates.includes(searchToken) ||
          (parsedTicketId && candidates.includes(norm(parsedTicketId)!)) ||
          (parsedReferenceId && candidates.includes(norm(parsedReferenceId)!))
        );
      });

      if (!matched) {
        setScanResultMsg({ type: 'error', text: "Reference doesn't match any reservation on this desk." });
        return;
      }

      if (matched.status === 'cancelled' || matched.status === 'expired') {
        setScanResultMsg({
          type: 'error',
          text: `${matched.referenceId} is ${matched.status} — this pass is no longer valid.`,
        });
        return;
      }

      if (matched.status === 'confirmed') {
        setScanResultMsg({
          type: 'success',
          text: `Verified — ${matched.guestName}, ${matched.roomCategory} (${matched.referenceId}). Already confirmed.`,
        });
        return;
      }

      // Status and nothing else. The security rule on hotelReservations
      // constrains a business's update to hasOnly(['status']), so adding a
      // checkedInAt stamp here would make the whole write permission-denied.
      await updateDoc(doc(db, matched.path), { status: 'confirmed' });

      setScanResultMsg({
        type: 'success',
        text: `Verified — ${matched.guestName}, ${matched.roomCategory} (${matched.referenceId}). Reservation confirmed.`,
      });
    } catch (err) {
      console.error('Reservation verification failed:', err);
      setScanResultMsg({ type: 'error', text: 'Server connection sync error.' });
    }
  };

  if (isBanned) return <Banned userBrand={brandStatusData} />;
  if (isSuspended) return <Suspended userBrand={brandStatusData} />;

  if (loading) {
    return <div className={styles.dashboardContainer}><Loader2 className={styles.spin} size={28} /></div>;
  }

  const heldCount = reservations.filter((r) => r.status === 'held').length;

  return (
    <div className={styles.dashboardContainer}>
      {toast && <div className={styles.toast}>{toast}</div>}

      <div className={styles.header}>
        <div>
          <h1 className={styles.hotelTitle}>
            {hotel?.hotelName || 'My Hotel'}
            {isVerified && <VerifiedBadge />}
          </h1>
          <p className={styles.headerSub}>{heldCount} active hold{heldCount === 1 ? '' : 's'}</p>
        </div>
        <div className={styles.headerActions}>
          <button
            className={styles.iconButton}
            onClick={() => setShowScanner((v) => !v)}
            title="Scan reservation pass"
          >
            <ScanLine size={18} />
          </button>
          <button className={styles.iconButton} onClick={handleSignOut} title="Sign out">
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {showScanner && (
        <div className={styles.scannerSlot}>
          <ConfirmQRScanner
            onClose={() => {
              setShowScanner(false);
              setScanResultMsg(null);
            }}
            onCrosscheck={(data) => handleScanReceiptCode(data)}
          />
        </div>
      )}

      {scanResultMsg && (
        <div
          className={scanResultMsg.type === 'success' ? styles.scanBannerSuccess : styles.scanBannerError}
          onClick={() => setScanResultMsg(null)}
        >
          {scanResultMsg.text}
        </div>
      )}

      <div className={styles.mainContent}>
        {/* --- QR / share card --- */}
        <div className={styles.heroGlassCard}>
          {qrCodeUrl && <img src={qrCodeUrl} alt="Hotel VINQR" className={styles.qrImage} />}
          <span className={styles.qrLinkText}>{runtimeQrLink}</span>
          {/* Full VinLink strip, matching the salon dashboard's:
              share / copy / open / download-QR. */}
          <div className={styles.qrLinkRow}>
            <button className={styles.iconButtonSmall} onClick={handleShareLink}>
              <Share2 size={14} /> Share
            </button>
            <button className={styles.iconButtonSmall} onClick={handleCopyLink}>
              <Copy size={14} /> {copied ? 'Copied' : 'Copy'}
            </button>
            <a
              className={styles.iconButtonSmall}
              href={runtimeQrLink}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink size={14} /> Open
            </a>
            {qrCodeUrl && (
              <a
                className={styles.iconButtonSmall}
                href={qrCodeUrl}
                download={`${(hotel?.hotelName || 'hotel').replace(/\s+/g, '_')}_QRCode.png`}
              >
                <Download size={14} /> QR
              </a>
            )}
          </div>
        </div>

        {/* --- Tabs --- */}
        <div className={styles.tabRow}>
          <button className={tab === 'reservations' ? styles.tabActive : styles.tab} onClick={() => setTab('reservations')}>
            Reservations
          </button>
          <button className={tab === 'rooms' ? styles.tabActive : styles.tab} onClick={() => setTab('rooms')}>
            Room categories
          </button>
          <button className={tab === 'settings' ? styles.tabActive : styles.tab} onClick={() => setTab('settings')}>
            Settings
          </button>
        </div>

        {/* --- Reservations tab --- */}
        {tab === 'reservations' && (
          <div className={styles.listStack}>
            {reservations.length === 0 && <div className={styles.emptyState}>No reservations yet.</div>}
            {reservations.map((r) => {
              const msLeft = r.holdExpiresAt - nowTick;
              return (
                <div key={r.id} className={styles.reservationCard}>
                  <div className={styles.reservationTopLine}>
                    <div>
                      <strong>{r.roomCategory}</strong>
                      <div className={styles.reservationMeta}>{r.checkIn} → {r.checkOut} · {r.guestCount} guest(s)</div>
                    </div>
                    <span className={`${styles.statusPill} ${styles['status_' + r.status]}`}>{r.status}</span>
                  </div>
                  <div className={styles.reservationMeta}>{r.guestName} · {r.guestPhone}</div>
                  <div className={styles.reservationMeta}>Ref: {r.referenceId} · {hotel?.currency || '€'}{r.totalPrice}</div>
                  {r.status === 'held' && (
                    <div className={styles.holdCountdownRow}>
                      <Clock size={13} />
                      {msLeft > 0 ? `Releases in ${Math.floor(msLeft / 60000)}m ${Math.floor((msLeft % 60000) / 1000)}s` : 'Expiring…'}
                    </div>
                  )}
                  {(r.status === 'held' || r.status === 'confirmed') && (
                    <div className={styles.reservationActions}>
                      {r.status === 'held' && (
                        <button className={styles.confirmBtn} onClick={() => handleConfirmReservation(r)}>
                          <CheckCircle2 size={14} /> Confirm
                        </button>
                      )}
                      <button className={styles.cancelBtn} onClick={() => handleCancelReservation(r)}>
                        <XCircle size={14} /> Cancel
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* --- Rooms tab --- */}
        {tab === 'rooms' && (
          <div className={styles.listStack}>
            <button className={styles.addRoomBtn} onClick={openAddRoom}>
              <Plus size={16} /> Add room category
            </button>
            {rooms.length === 0 && <div className={styles.emptyState}>No room categories yet.</div>}
            {rooms.map((room) => (
              <div key={room.roomId} className={styles.roomManageCard}>
                <div className={styles.roomManageThumb}>
                  {room.photos[0] ? <img src={room.photos[0]} alt={room.category} /> : <BedDouble size={22} />}
                </div>
                <div className={styles.roomManageBody}>
                  <div className={styles.reservationTopLine}>
                    <strong>{room.category}</strong>
                    <span>{hotel?.currency || '€'}{room.price}/night</span>
                  </div>
                  <div className={styles.roomIconRow}>
                    <span><Users size={12} /> {room.maxGuests}</span>
                    {room.bedType && <span><BedDouble size={12} /> {room.bedType}</span>}
                    {room.wifi && <span><Wifi size={12} /> Wi-Fi</span>}
                    {room.breakfastIncluded && <span><Coffee size={12} /> Breakfast</span>}
                  </div>
                  <div className={styles.reservationMeta}>{room.availableUnits} / {room.totalUnits} available</div>
                </div>
                <div className={styles.roomManageActions}>
                  <button className={styles.iconButtonSmall} onClick={() => openEditRoom(room)}><Pencil size={14} /></button>
                  <button className={styles.iconButtonSmall} onClick={() => handleDeleteRoom(room.roomId)}><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* --- Settings tab --- */}
        {tab === 'settings' && (
          <div className={styles.settingsForm}>
            <div className={styles.inputBlock}>
              <label>Hotel name</label>
              <input className={styles.input} value={formName} onChange={(e) => setFormName(e.target.value)} />
            </div>
            <div className={styles.inputBlock}>
              <label>Bio</label>
              <textarea className={styles.textarea} value={formBio} onChange={(e) => setFormBio(e.target.value)} />
            </div>
            <div className={styles.inputBlock}>
              <label>Address</label>
              <input className={styles.input} value={formAddress} onChange={(e) => setFormAddress(e.target.value)} />
            </div>
            <div className={styles.inputBlock}>
              <label>Currency symbol</label>
              <input className={styles.input} value={formCurrency} onChange={(e) => setFormCurrency(e.target.value)} maxLength={3} />
            </div>
            <div className={styles.formRow}>
              <div className={styles.inputBlock}>
                <label>Opens</label>
                <input className={styles.input} type="time" value={formOpening} onChange={(e) => setFormOpening(e.target.value)} />
              </div>
              <div className={styles.inputBlock}>
                <label>Closes</label>
                <input className={styles.input} type="time" value={formClosing} onChange={(e) => setFormClosing(e.target.value)} />
              </div>
            </div>
            <div className={styles.inputBlock}>
              <label>Unpaid reservation hold length</label>
              <div className={styles.holdOptionRow}>
                {HOLD_DURATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    className={formHold === opt.value ? styles.holdOptionActive : styles.holdOption}
                    onClick={() => setFormHold(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className={styles.hint}>
                When a customer reserves a room, it's held (unpaid) for this long before it's automatically released.
              </p>
            </div>
            <button className={styles.saveBtn} disabled={isSavingSettings} onClick={handleSaveSettings}>
              {isSavingSettings ? 'Saving…' : 'Save settings'}
            </button>
          </div>
        )}
      </div>

      {/* --- Room modal --- */}
      {roomModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setRoomModalOpen(false)}>
          <form className={styles.modalCard} onClick={(e) => e.stopPropagation()} onSubmit={handleSaveRoom}>
            <div className={styles.modalHeader}>
              <h3>{editingRoomId ? 'Edit room category' : 'Add room category'}</h3>
              <button type="button" className={styles.iconButtonSmall} onClick={() => setRoomModalOpen(false)}><X size={16} /></button>
            </div>

            <div className={styles.inputBlock}>
              <label>Category</label>
              <select className={styles.input} value={rCategory} onChange={(e) => setRCategory(e.target.value)}>
                {ROOM_PRESETS.map((p) => <option key={p} value={p}>{p}</option>)}
                <option value="Custom">Custom…</option>
              </select>
              {rCategory === 'Custom' && (
                <input
                  className={styles.input}
                  placeholder="Category name"
                  value={rCustomCategory}
                  onChange={(e) => setRCustomCategory(e.target.value)}
                  style={{ marginTop: 8 }}
                />
              )}
            </div>

            <div className={styles.formRow}>
              <div className={styles.inputBlock}>
                <label>Price / night</label>
                <input className={styles.input} type="number" min="0" step="0.01" value={rPrice} onChange={(e) => setRPrice(e.target.value)} />
              </div>
              <div className={styles.inputBlock}>
                <label>Max guests</label>
                <input className={styles.input} type="number" min="1" value={rGuests} onChange={(e) => setRGuests(e.target.value)} />
              </div>
            </div>

            <div className={styles.formRow}>
              <div className={styles.inputBlock}>
                <label>Bed type</label>
                <input className={styles.input} placeholder="e.g., King bed" value={rBedType} onChange={(e) => setRBedType(e.target.value)} />
              </div>
              <div className={styles.inputBlock}>
                <label>Total units</label>
                <input className={styles.input} type="number" min="0" value={rTotalUnits} onChange={(e) => setRTotalUnits(e.target.value)} />
              </div>
            </div>

            <div className={styles.checkboxRow}>
              <label><input type="checkbox" checked={rWifi} onChange={(e) => setRWifi(e.target.checked)} /> Wi-Fi included</label>
              <label><input type="checkbox" checked={rBreakfast} onChange={(e) => setRBreakfast(e.target.checked)} /> Breakfast included</label>
            </div>

            <div className={styles.inputBlock}>
              <label>Description</label>
              <textarea className={styles.textarea} value={rDescription} onChange={(e) => setRDescription(e.target.value)} />
            </div>

            <div className={styles.inputBlock}>
              <label>Photos ({rPhotos.length}/4)</label>
              <div className={styles.photoGrid}>
                {rPhotos.map((url) => (
                  <div key={url} className={styles.photoThumb}>
                    <img src={url} alt="Room" />
                    <button type="button" className={styles.photoRemoveBtn} onClick={() => removePhoto(url)}><X size={12} /></button>
                  </div>
                ))}
                {rPhotos.length < 4 && (
                  <label className={styles.photoUploadTile}>
                    {rUploading ? <Loader2 size={18} className={styles.spin} /> : <ImagePlus size={18} />}
                    <input type="file" accept="image/*" multiple hidden onChange={(e) => handleRoomPhotoUpload(e.target.files)} />
                  </label>
                )}
              </div>
            </div>

            <button className={styles.saveBtn} disabled={isSavingRoom} type="submit">
              {isSavingRoom ? 'Saving…' : editingRoomId ? 'Save changes' : 'Add room category'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}