import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation  } from 'react-router-dom';
import { firestore as db, auth } from '../firebase';
import { doc, getDoc, collection, onSnapshot, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import styles from './salonStore.module.css';
import QRCode from 'qrcode';
import Report from "./report";                        // <--- Added
import { Star, AlertTriangle } from 'lucide-react';    // <--- Added
import { getDatabase, ref, onValue } from 'firebase/database';
import Banned from './Banned';
import Suspended from './Suspended';

// --- Types & Interfaces ---
interface SalonProfile {
  salonName: string;
  bio: string;
  address: string;
  openingTime: string; // HH:MM
  closingTime: string; // HH:MM
  offDays: string[];   // ['Sunday', 'Monday']
  isVerified?: boolean; 
}

interface Service {
  serviceId: string;
  serviceName: string;
  price: number;
  duration: number;
  description: string;
  category: string;
}

interface Worker {
  workerId: string;
  name: string;
  availability: string;
  pictureURL: string;
  catchyPhrase: string;
}

interface Appointment {
  workerId: string;
  date: string;
  time: string;
  duration: number;
}

interface SalonStoreProps {
  onExecuteWalletPayment: (amount: number, targetBusinessUid: string, userUid: string) => Promise<void>;
}

const VerifiedBadge = () => (
    <svg 
        width="14" 
        height="14" 
        viewBox="0 0 24 24" 
        fill="#007fff" 
        style={{ display: 'inline-block', marginLeft: '6px', verticalAlign: 'middle' }}
    >
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
);

export default function SalonStore() {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<SalonProfile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [existingBookings, setExistingBookings] = useState<Appointment[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 'success'>(1);
  const [receiptQrs, setReceiptQrs] = useState<Record<string, string>>({});
  const [customerUid, setCustomerUid] = useState<string | null>(null);

  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('any'); 
  const [selectedDate, setSelectedDate] = useState<string>(''); 
  const [selectedTime, setSelectedTime] = useState<string>(''); 
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedRefId, setGeneratedRefId] = useState('');


  const [isVerified, setIsVerified] = useState(false);

  // Ban / Suspension States
  const [isBanned, setIsBanned] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);
  const [brandStatusData, setBrandStatusData] = useState<any>(null);

  // --- Rating & Report States ---
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [totalRatingsCount, setTotalRatingsCount] = useState<number>(0);
  const [userRating, setUserRating] = useState<number>(0);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [hoveredStar, setHoveredStar] = useState<number>(0);
  const [showRateModal, setShowRateModal] = useState(false);
  const [currency, setCurrency] = useState<string>('€');

  const totalDuration = useMemo(() => 
    selectedServices.reduce((acc, s) => acc + Number(s.duration || 0), 0), 
    [selectedServices]
  );
  
  const totalPrice = useMemo(() => 
    selectedServices.reduce((acc, s) => acc + Number(s.price || 0), 0), 
    [selectedServices]
  );

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };
  
  useEffect(() => {
    console.log("SalonStore mounted");
  }, []);

  useEffect(() => {
    window.parent.postMessage({ type: "SALON_READY" }, "*");
  }, []);

  useEffect(() => {
    const receiveUserIdentity = (event: MessageEvent) => {
      if(event.data?.type === "MALVIN_USER"){
        setCustomerUid(event.data.uid);
      }
    };
    window.addEventListener("message", receiveUserIdentity);
    return () => window.removeEventListener("message", receiveUserIdentity);
  }, []);

  useEffect(() => {
    if (!uid) return;

    // Listen to parent document for salon currency
    const stationDocRef = doc(db, 'salonstation', uid);
    const unsubscribeCurrency = onSnapshot(stationDocRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().currency) {
        setCurrency(docSnap.data().currency);
      }
    });

    return () => unsubscribeCurrency();
  }, [uid]);

  useEffect(() => {
    if (!uid) return;

    const rtdb = getDatabase();
    const userRef = ref(rtdb, `users/${uid}`);

    const unsubscribe = onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const status = data.brandData?.status || data.status || "";
        const isBannedUser = status === "Banned" || data.banned === true || data.isBanned === true;
        const isSuspendedUser = status === "Suspended" || data.suspended === true || data.isSuspended === true;

        setIsVerified(data.profile?.isVerified || data.isVerified || false);
        setIsBanned(isBannedUser);
        setIsSuspended(isSuspendedUser);

        setBrandStatusData({
          id: uid,
          banReason: data.brandData?.banReason || data.banReason || "Violation of platform policies or suspicious activity detected.",
          suspensionReason: data.brandData?.suspensionReason || data.suspensionReason || "Temporary restriction due to policy violation.",
          suspensionEnds: data.brandData?.suspensionEnds || data.suspensionEnds || null,
          ...profile
        });
      }
    });

    return () => unsubscribe();
  }, [uid, profile]);

  // 1. Listen for store average rating
  useEffect(() => {
    if (!uid) return;
    const ratingDocRef = doc(db, 'store_ratings', uid);
    const unsub = onSnapshot(ratingDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAverageRating(data.average || 0);
        setTotalRatingsCount(data.count || 0);
      } else {
        setAverageRating(0);
        setTotalRatingsCount(0);
      }
    });
    return () => unsub();
  }, [uid]);

  // 2. Fetch current user's rating
  useEffect(() => {
    const currentUserId = auth.currentUser?.uid || customerUid || localStorage.getItem('guest_id');
    if (!uid || !currentUserId) return;
    const userRatingRef = doc(db, 'store_ratings', uid, 'user_ratings', currentUserId);
    getDoc(userRatingRef).then((docSnap) => {
      if (docSnap.exists()) {
        setUserRating(docSnap.data().stars || 0);
      }
    });
  }, [uid, customerUid]);

  // 3. Rating Submission
  const handleRateStore = async (stars: number) => {
    const currentUserId = auth.currentUser?.uid || customerUid || localStorage.getItem('guest_id');
    if (!currentUserId) {
      alert("Please log in or establish session to rate this store.");
      return;
    }
    if (!uid || isSubmittingRating) return;

    setIsSubmittingRating(true);
    try {
      const userRatingRef = doc(db, 'store_ratings', uid, 'user_ratings', currentUserId);
      const summaryRef = doc(db, 'store_ratings', uid);

      const oldRatingSnap = await getDoc(userRatingRef);
      const summarySnap = await getDoc(summaryRef);

      let currentSum = 0;
      let currentCount = 0;

      if (summarySnap.exists()) {
        currentSum = summarySnap.data().sum || 0;
        currentCount = summarySnap.data().count || 0;
      }

      if (oldRatingSnap.exists()) {
        const previousStars = oldRatingSnap.data().stars || 0;
        currentSum = currentSum - previousStars + stars;
      } else {
        currentSum += stars;
        currentCount += 1;
      }

      const newAverage = currentCount > 0 ? Number((currentSum / currentCount).toFixed(1)) : 0;

      await setDoc(userRatingRef, {
        stars,
        updatedAt: new Date().toISOString()
      });

      await setDoc(summaryRef, {
        average: newAverage,
        count: currentCount,
        sum: currentSum
      }, { merge: true });

      setUserRating(stars);
    } catch (err) {
      console.error("Error rating store:", err);
      alert("Failed to submit rating.");
    } finally {
      setIsSubmittingRating(false);
    }
  };

  // 1. STAGE UNPAID BOOKING & NAVIGATE TO CHECKOUT
  const handleProceedToCheckout = async () => {
    if (!customerUid) {
      triggerToast("Error: Identity verification has not loaded yet.");
      return;
    }

    const appointmentId = `app_${Date.now()}`;
    const referenceId = `SAL-${Math.floor(100000 + Math.random() * 900000)}`;

    const basePayload = {
      appointmentId: appointmentId,
      referenceId: referenceId,
      businessId: uid, // Crucial for collectionGroup queries to work safely
      customerName: customerName.trim(),
      customerUid: customerUid,
      customerPhone: customerPhone.trim(),
      note: customerNote.trim(),
      customerUid: customerUid,
      selectedServices: selectedServices.map(s => ({ 
        serviceId: s.serviceId, 
        serviceName: s.serviceName, 
        price: s.price 
      })),
      selectedWorker: selectedWorkerId,
      date: selectedDate,
      time: selectedTime,
      totalPrice: totalPrice,
      totalDuration: totalDuration,
      paymentStatus: false, // Default to FALSE. Enabled upon payment confirmation.
      createdAt: serverTimestamp()
    };

    try {
      // Securely save to user's private customer collection before executing payment
      await setDoc(doc(db, 'customers', customerUid, 'appointments', appointmentId), basePayload);

      const checkoutPayload = {
        appointmentId: appointmentId,
        targetBusinessUid: uid,
        totalPrice: totalPrice, 
        services: selectedServices,   
        stylist: selectedWorkerId,    
        duration: totalDuration,      
        date: selectedDate,           
        time: selectedTime,           
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerNote: customerNote.trim(),
        customerUid: customerUid,
        merchantType: "salon"
      };

      console.log("Unpaid appointment staged. Navigating to checkout:", checkoutPayload);
      navigate("/ticket-checkout", { state: checkoutPayload });
    } catch (err) {
      console.error("Failed staging booking payload document:", err);
      triggerToast("Could not prepare booking secure session.");
    }
  };

  // 🟢 2. STRIPE REDIRECT RETRIEVAL: Confirms payment & activates receipt
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const paymentConfirmed = location.state?.paymentConfirmed || queryParams.get("paymentConfirmed") === "true";
    const orderPayload = location.state?.orderPayload;

    if (paymentConfirmed && orderPayload) {
      const confirmStripeBooking = async () => {
        setIsSubmitting(true);
        try {
          const activeUid = orderPayload.customerUid || customerUid;
          const appointmentId = orderPayload.appointmentId; // Staged ID passed back from redirect

          if (!activeUid || !appointmentId) {
            triggerToast("Unable to verify user session context.");
            return;
          }

          // Reference to the staged document in their secure folder
          const appointmentRef = doc(db, 'customers', activeUid, 'appointments', appointmentId);
          
          // Set paymentStatus to TRUE
          await updateDoc(appointmentRef, {
            paymentStatus: true
          });

          // Fetch doc to retrieve reference ID for success page rendering
          const snap = await getDoc(appointmentRef);
          if (snap.exists()) {
            setGeneratedRefId(snap.data().referenceId);
          }

          setCustomerName(orderPayload.customerName);
          setSelectedDate(orderPayload.date);
          setSelectedTime(orderPayload.time);
          setSelectedServices(orderPayload.services);
          setSelectedWorkerId(orderPayload.stylist);

          setStep('success'); 
          navigate(location.pathname, { replace: true, state: {} });
        } catch (err) {
          console.error("Failed activating user receipt state:", err);
        } finally {
          setIsSubmitting(false);
        }
      };

      if (profile) {
        confirmStripeBooking();
      }
    }
  }, [location, uid, navigate, customerUid, profile]);

  // 🟢 3. WALLET PAYMENT handler
  const executeFinalBookingSubmit = async () => {
    if (!uid || !customerName.trim() || !selectedDate || !selectedTime || selectedServices.length === 0) {
      triggerToast("Missing required scheduling credentials.");
      return;
    }
    if (isDayInCooldown) {
      triggerToast("This day is locked under global cooldown limits.");
      return;
    }
    if (!customerUid) {
      alert("Waiting for Malvin identity...");
      return;
    }

    setIsSubmitting(true);
    try {
      // Phase A: Execute Instant Ledger Transfer (Wallet)
      triggerToast("Processing checkout ledger deduction...");
      // @ts-ignore
      await onExecuteWalletPayment(totalPrice, uid, customerUid);

      // Phase B: Save directly with paymentStatus = TRUE
      const referenceId = `SAL-${Math.floor(100000 + Math.random() * 900000)}`;
      const appointmentId = `app_${Date.now()}`;
      
      const payload = {
        appointmentId: appointmentId,
        referenceId: referenceId,
        businessId: uid,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerUid: customerUid,
        note: customerNote.trim(),
        selectedServices: selectedServices.map(s => ({ serviceId: s.serviceId, serviceName: s.serviceName, price: s.price })),
        selectedWorker: selectedWorkerId,
        date: selectedDate,
        time: selectedTime,
        totalPrice: totalPrice,
        totalDuration: totalDuration,
        paymentStatus: true, // Marked immediately as paid
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'customers', customerUid, 'appointments', appointmentId), payload);

      setGeneratedRefId(referenceId);
      setStep('success');
      
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || "Wallet payment failed. Booking aborted.");
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    const generateQrs = async () => {
      const qrMap: Record<string, string> = {};
      if (generatedRefId) {
        try {
          qrMap[generatedRefId] = await QRCode.toDataURL(
            JSON.stringify({
              referenceId: generatedRefId,
              customer: customerName,
              salonId: uid,
              stylist: selectedWorkerId,
              price: totalPrice
            })
          );
        } catch (err) {
          console.error("Failed generating appointment QR code:", err);
        }
      }
      setReceiptQrs(qrMap);
    };

    generateQrs();
  }, [generatedRefId, customerName, uid, selectedWorkerId, totalPrice]);

  useEffect(() => {
    if (!uid) return;

    const loadSalonProfile = async () => {
      try {
        const profileSnap = await getDoc(doc(db, 'salons', uid));
        if (profileSnap.exists()) {
          setProfile(profileSnap.data() as SalonProfile);
        } else {
          triggerToast("Salon configurations missing.");
          setLoading(false);
        }
      } catch (err) {
        triggerToast("Failed loading business configuration framework.");
        setLoading(false);
      }
    };

    loadSalonProfile();

    const unsubscribeWorkers = onSnapshot(
      collection(db, 'salonstation', uid, 'salonWorkers'),
      (snap) => setWorkers(snap.docs.map(d => d.data() as Worker)),
      () => triggerToast("Error loading workers feed.")
    );

    const unsubscribeServices = onSnapshot(
      collection(db, 'salonstation', uid, 'services'),
      (snap) => setServices(snap.docs.map(d => {
        const data = d.data();
        return {
          serviceId: d.id, 
          serviceName: data.serviceName || '',
          price: Number(data.price || 0),
          duration: Number(data.duration || 0),
          description: data.description || '',
          category: data.category || ''
        } as Service;
      })),
      () => triggerToast("Error loading premium services matrix.")
    );

    return () => {
      unsubscribeWorkers();
      unsubscribeServices();
    };
  }, [uid]);

  // Load existing paid appointments of this business to build our booking grid exclusions
  useEffect(() => {
    if (!uid) return;
    
    // We get this securely from custom merchant database collections/cloud structures or public slots query
    // In this secure build, existing bookings can only be calculated safely via non-identifiable schedules.
  }, [uid]);

  const isDayInCooldown = useMemo(() => {
    if (!selectedDate) return false;
    const appointmentsForDay = existingBookings.filter(b => b.date === selectedDate).length;
    return !profile?.isVerified && appointmentsForDay >= 10;
  }, [existingBookings, selectedDate, profile]);

  const parseTimeToMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const formatMinutesToTime = (min: number) => {
    const h = Math.floor(min / 60).toString().padStart(2, '0');
    const m = (min % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  const availableCalendarDays = useMemo(() => {
    const days = [];
    const options: Intl.DateTimeFormatOptions = { weekday: 'long' };
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const dayName = new Intl.DateTimeFormat('en-US', options).format(d);
      
      if (!profile?.offDays?.includes(dayName)) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        days.push({
          dateString: `${yyyy}-${mm}-${dd}`,
          label: d.getDate(),
          weekdayLabel: dayName.substring(0, 3)
        });
      }
    }
    return days;
  }, [profile]);

  const computedTimeSlots = useMemo(() => {
    if (!profile || !selectedDate || totalDuration === 0 || isDayInCooldown) return [];

    const slots = [];
    const startMin = parseTimeToMinutes(profile.openingTime);
    const endMin = parseTimeToMinutes(profile.closingTime);
    const stepSize = 30;

    for (let current = startMin; current + totalDuration <= endMin; current += stepSize) {
      const timeStr = formatMinutesToTime(current);
      
      const isBusy = existingBookings.some(booking => {
        if (booking.date !== selectedDate) return false;
        if (selectedWorkerId !== 'any' && booking.workerId !== 'any' && booking.workerId !== selectedWorkerId) {
          return false;
        }

        const bookingStart = parseTimeToMinutes(booking.time);
        const bookingEnd = bookingStart + booking.duration;
        const prospectiveStart = current;
        const prospectiveEnd = current + totalDuration;

        return prospectiveStart < bookingEnd && prospectiveEnd > bookingStart;
      });

      slots.push({
        time: timeStr,
        disabled: isBusy,
        isPopular: current === startMin + 120 || current === startMin + 240
      });
    }
    return slots;
  }, [profile, selectedDate, totalDuration, selectedWorkerId, existingBookings, isDayInCooldown]);

  const toggleService = (service: Service) => {
    setSelectedServices(prev => 
      prev.some(s => s.serviceId === service.serviceId)
        ? prev.filter(s => s.serviceId !== service.serviceId)
        : [...prev, service]
    );
  };

  if (step === 'success') {
    return (
      <div className={styles.storeContainer}>
        <div className={styles.successWrapper}>
          <div className={styles.successIcon}>✓</div>
          <h1 className={styles.successTitle}>Booking Confirmed</h1>
          <p className={styles.successSub}>Your payment has cleared and your appointment ticket is locked.</p>

          <div className={styles.summaryGlassCard}>
            <div className={styles.refBadge}>
              <span className={styles.refLabel}>TICKET REFERENCE ID</span>
              <strong className={styles.refCode}>{generatedRefId}</strong>
            </div>

            <div className={styles.qrPlaceholder}>
              <div className={styles.qrInner}>
                {receiptQrs[generatedRefId] ? (
                  <img 
                    src={receiptQrs[generatedRefId]} 
                    alt="Appointment QR" 
                    style={{
                      width: "140px",
                      height: "140px",
                      borderRadius: "12px",
                      border: "2px solid #fff",
                      padding: "6px",
                      background: "#fff"
                    }}
                  />
                ) : (
                  <div className={styles.qrBlock} />
                )}
                <span style={{ marginTop: "8px", fontSize: "12px", color: "#aaa" }}>Scan Ticket At Check-in</span>
              </div>
            </div>

            <div className={styles.receiptDetails}>
              <h3>{profile?.salonName} {(isVerified || profile?.isVerified) && <VerifiedBadge />}</h3>
              <p>👤 Client Name: <strong>{customerName}</strong></p>
              {customerPhone && <p>📞 Phone: {customerPhone}</p>}
              <p>📅 Schedule: {selectedDate} at <strong>{selectedTime}</strong></p>
              <p>⏱ Duration: {totalDuration} Mins</p>
              <p>💳 Paid: <strong>{currency}{totalPrice.toFixed(2)}</strong></p>
            </div>
          </div>

          <div className={styles.successActionStack}>
            <button className={styles.primaryActionBtn} onClick={() => triggerToast("Added to Device Calendar context.")}>Add to Calendar</button>
            <button className={styles.secondaryActionBtn} onClick={() => {
              navigator.clipboard.writeText(generatedRefId);
              triggerToast("Reference copied safely.");
            }}>Copy Reference</button>
            <button className={styles.clearDoneBtn} onClick={() => window.location.reload()}>Done</button>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className={styles.storeContainer}>
        <div className={styles.emptyPromptText}>
          <h2>Salon Not Found</h2>
          <p>The salon configuration could not be loaded. Please verify your link link parameters.</p>
        </div>
      </div>
    );
  }

 if (isBanned) {
    return <Banned userBrand={brandStatusData} />;
  }

  if (isSuspended) {
    return <Suspended userBrand={brandStatusData} />;
  }
  return (
    <div className={styles.storeContainer}>
      {toast && <div className={styles.toastNotification}>{toast}</div>}

      {step === 1 && profile && (
        <section className={styles.heroBanner}>
          <div className={styles.heroGlassDetails}>
            <h1>{profile.salonName } {(isVerified || profile?.isVerified) && <VerifiedBadge />}</h1>
            <p className={styles.salonBio}>{profile.bio}</p>
            <p className={styles.salonAddress}>📍 {profile.address}</p>
            <p className={styles.salonHours}>🕒 Open daily: {profile.openingTime} - {profile.closingTime}</p>
            {/* RATINGS & REPORT CONTROL ROW */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', marginTop: '10px', marginBottom: '12px' }}>
              <button
                type="button"
                onClick={() => setShowRateModal(!showRateModal)}
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '4px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                <Star size={12} fill="#eab308" color="#eab308" />
                <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                  {averageRating.toFixed(1)}
                </span>
                <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                  ({totalRatingsCount})
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const activeUser = auth.currentUser?.uid || customerUid || localStorage.getItem('guest_id');
                  if (!activeUser) {
                    alert("Initializing session... please try again in a moment.");
                    return;
                  }
                  setIsReportOpen(true);
                }}
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#ef4444',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  cursor: 'pointer'
                }}
              >
                <AlertTriangle size={11} />
                <span>Report</span>
              </button>
            </div>
            
            <div className={styles.trustBadgeRow}>
              <span>✓ Instant Wallet Pay</span>
              <span>✓ Secure Booking</span>
              <span>✓ Free Cancellation</span>
            </div>
          </div>
        </section>
      )}

      <nav className={styles.progressWizardHeader}>
        <div className={`${styles.wizardNode} ${step >= 1 ? styles.activeNode : ''}`}>Services</div>
        <div className={styles.wizardChevron}>&rarr;</div>
        <div className={`${styles.wizardNode} ${step >= 2 ? styles.activeNode : ''}`}>Worker</div>
        <div className={styles.wizardChevron}>&rarr;</div>
        <div className={`${styles.wizardNode} ${step >= 3 ? styles.activeNode : ''}`}>Time</div>
        <div className={styles.wizardChevron}>&rarr;</div>
        <div className={`${styles.wizardNode} ${step >= 4 ? styles.activeNode : ''}`}>Details</div>
        <div className={styles.wizardChevron}>&rarr;</div>
        <div className={`${styles.wizardNode} ${step >= 5 ? styles.activeNode : ''}`}>Confirm</div>
      </nav>

      <main className={styles.wizardStepViewports}>
        
        {/* STEP 1: SELECT SERVICES */}
        {step === 1 && (
          <div className={styles.stepViewport}>
            <h2 className={styles.stepTitleHeading}>Select Premium Services</h2>
            <div className={styles.cardsScrollStack}>
              {services.map(service => {
                const isSelected = selectedServices.some(s => s.serviceId === service.serviceId);
                return (
                  <div 
                    key={service.serviceId} 
                    className={`${styles.luxurySelectionCard} ${isSelected ? styles.cardIsSelectedState : ''}`}
                    onClick={() => toggleService(service)}
                  >
                    <div className={styles.serviceMainLine}>
                      <h3>{service.serviceName}</h3>
                      <strong className={styles.priceTagText}>{currency}{service.price.toFixed(2)}</strong>
                    </div>
                    <div className={styles.serviceDurationLine}>⏱ {service.duration} Mins</div>
                    {service.description && <p className={styles.serviceCardDescription}>{service.description}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: CHOOSE WORKER */}
        {step === 2 && (
          <div className={styles.stepViewport}>
            <h2 className={styles.stepTitleHeading}>Choose Stylist/Worker</h2>
            <div className={styles.cardsScrollStack}>
              <div 
                className={`${styles.luxurySelectionCard} ${selectedWorkerId === 'any' ? styles.cardIsSelectedState : ''}`}
                onClick={() => setSelectedWorkerId('any')}
              >
                <div className={styles.recommendedBadgeLine}>
                  <h3>⭐ Any Available Worker</h3>
                  <span className={styles.badgeTintRecommend}>Recommended</span>
                </div>
                <p className={styles.serviceCardDescription}>Select this path to pair your allocation automatically with the best matched professional framework slot.</p>
              </div>

              {workers.map(worker => {
                const isSelected = selectedWorkerId === worker.workerId;
                return (
                  <div 
                    key={worker.workerId} 
                    className={`${styles.luxurySelectionCard} ${isSelected ? styles.cardIsSelectedState : ''}`}
                    onClick={() => setSelectedWorkerId(worker.workerId)}
                  >
                    <div className={styles.staffCardFlexLayout}>
                      <img src={worker.pictureURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150'} alt={worker.name} className={styles.staffAvatarCircle} />
                      <div className={styles.staffTextMeta}>
                        <h3>{worker.name}</h3>
                        <span className={styles.staffAvailabilityBadge}>{worker.availability}</span>
                        {worker.catchyPhrase && <p className={styles.staffCatchphraseQuote}>&ldquo;{worker.catchyPhrase}&rdquo;</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: DATE & TIME */}
        {step === 3 && (
          <div className={styles.stepViewport}>
            <h2 className={styles.stepTitleHeading}>Select Date & Time Slot</h2>
            <div className={styles.calendarDaySliderRow}>
              {availableCalendarDays.map(day => (
                <button 
                  key={day.dateString}
                  type="button"
                  className={`${styles.calendarDayPillNode} ${selectedDate === day.dateString ? styles.pillSelected : ''}`}
                  onClick={() => { setSelectedDate(day.dateString); setSelectedTime(''); }}
                >
                  <span className={styles.weekdayLabelTxt}>{day.weekdayLabel}</span>
                  <strong className={styles.dayNumTxt}>{day.label}</strong>
                </button>
              ))}
            </div>

            {selectedDate ? (
              isDayInCooldown ? (
                <div style={{ padding: "24px", background: "rgba(229,57,53,0.1)", border: "1px solid #E53935", borderRadius: "16px", color: "#E53935", textAlign: "center", fontWeight: "bold", margin: "24px 0", fontSize: "14px" }}>
                  ⚠️ Store Currently in Cooldown for this selected day due to booking limits. Please choose a different date.
                </div>
              ) : (
                <div className={styles.timeSlotsAdaptiveGrid}>
                  {computedTimeSlots.map(slot => (
                    <button
                      key={slot.time}
                      type="button"
                      disabled={slot.disabled}
                      className={`${styles.timeSlotInteractiveButton} ${selectedTime === slot.time ? styles.timeSelected : ''} ${slot.isPopular ? styles.popularTimeHighlight : ''}`}
                      onClick={() => setSelectedTime(slot.time)}
                    >
                      {slot.time}
                      {slot.isPopular && <span className={styles.popularMiniTag}>Popular</span>}
                    </button>
                  ))}
                  {computedTimeSlots.length === 0 && (
                    <p className={styles.emptyPromptText}>No slots match the calculated criteria boundaries.</p>
                  )}
                </div>
              )
            ) : (
              <p className={styles.emptyPromptText}>Please select a date from the slider to see available time slots.</p>
            )}
          </div>
        )}

        {/* STEP 4: CUSTOMER DETAILS */}
        {step === 4 && (
          <div className={styles.stepViewport}>
            <h2 className={styles.stepTitleHeading}>Customer Details</h2>
            <div className={styles.touchFriendlyFormLayout}>
              <div className={styles.inputContainerBlock}>
                <label>Your Name *</label>
                <input 
                  type="text" 
                  value={customerName} 
                  onChange={(e) => setCustomerName(e.target.value)} 
                  placeholder="e.g., Jane Doe" 
                  className={styles.largeFormInputTarget}
                  required 
                />
              </div>

              <div className={styles.inputContainerBlock}>
                <label>Phone Number (For update tracking)</label>
                <input 
                  type="tel" 
                  value={customerPhone} 
                  onChange={(e) => setCustomerPhone(e.target.value)} 
                  placeholder="e.g., +33 6 1234 5678" 
                  className={styles.largeFormInputTarget}
                />
              </div>

              <div className={styles.inputContainerBlock}>
                <label>Optional Stylist Instructions</label>
                <textarea 
                  rows={3} 
                  value={customerNote} 
                  onChange={(e) => setCustomerNote(e.target.value)} 
                  placeholder="Fade on the sides, keep beard sharp." 
                  className={styles.largeFormTextAreaTarget}
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: CONFIRM & PAY */}
        {step === 5 && (
          <div className={styles.stepViewport}>
            <h2 className={styles.stepTitleHeading}>Confirm & Pay with Wallet</h2>
            <div className={styles.luxurySummaryDisplayCard}>
              <h3>{profile?.salonName} {(isVerified || profile?.isVerified) && <VerifiedBadge />}</h3>
              <p className={styles.summaryLocationText}>📍 {profile?.address}</p>
              
              <div className={styles.summaryDividerLine} />
              
              <div className={styles.summaryGroupSection}>
                <h4>Selected Services</h4>
                {selectedServices.map(s => (
                  <div key={s.serviceId} className={styles.summaryItemRowLine}>
                    <span>{s.serviceName}</span>
                    <strong>{currency}{s.price.toFixed(2)}</strong>
                  </div>
                ))}
              </div>

              <div className={styles.summaryDividerLine} />

              <div className={styles.summaryMetaGridBlock}>
                <div>
                  <h4>Assigned Stylist</h4>
                  <p>{selectedWorkerId === 'any' ? 'Any Available Professional' : workers.find(w => w.workerId === selectedWorkerId)?.name}</p>
                </div>
                <div>
                  <h4>Schedule Target</h4>
                  <p>{selectedDate} at <strong>{selectedTime}</strong></p>
                </div>
                <div>
                  <h4>Total Duration</h4>
                  <p>{totalDuration} Minutes</p>
                </div>
                <div>
                  <h4>Total Due</h4>
                  <p className={styles.finalTotalEmphasizedText}>{currency}{totalPrice.toFixed(2)}</p>
                </div>
              </div>

              {/* Secure wallet action call */}
              <button 
                type="button" 
                className={styles.primaryActionBtn} 
                style={{ width: '100%', marginTop: '20px' }}
                disabled={isSubmitting} 
                onClick={executeFinalBookingSubmit}
              >
                {isSubmitting ? "Processing Ledger..." : `Pay {currency}${totalPrice.toFixed(2)} instantly via Wallet`}
              </button>
            </div>
          </div>
        )}

      </main>

      <footer className={styles.stickyActionControlFooter}>
        <div className={styles.summaryOverlayLabelInfo}>
          <div>Selected: <strong>{selectedServices.length} items</strong></div>
          <div className={styles.footerPriceEmphasized}>{currency}{totalPrice.toFixed(2)} <small>({totalDuration}m)</small></div>
        </div>

        <div className={styles.footerActionButtonClusterRow}>
          {step > 1 && (
            <button 
              type="button" 
              className={styles.footerBackButton} 
              onClick={() => setStep(prev => (prev as number) - 1 as any)}
            >
              Back
            </button>
          )}

          {step < 5 ? (
            <button 
              type="button" 
              className={styles.footerContinueButton} 
              onClick={() => {
                if (step === 1 && selectedServices.length === 0) return triggerToast("Please select at least one service.");
                if (step === 3 && (!selectedDate || !selectedTime)) return triggerToast("Please specify calendar date and time targets.");
                if (step === 3 && isDayInCooldown) return triggerToast("This date is currently locked under limit cooldown.");
                if (step === 4 && !customerName.trim()) return triggerToast("Your client profile requires an assignment name identifier.");
                setStep(prev => (typeof prev === 'number' ? prev + 1 : 1) as any);
              }}
            >
              Continue
            </button>
          ) : (
            <button 
              type="button" 
              className={styles.footerSubmitBookingButton} 
              onClick={handleProceedToCheckout}
            >
              Proceed to Checkout
            </button>
          )}
        </div>
      </footer>
      {/* REPORT MODAL */}
      {isReportOpen && uid && (
        <Report
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          reportedUserUid={uid}
          currentUserUid={auth.currentUser?.uid || customerUid || localStorage.getItem('guest_id') || 'anonymous_guest'}
        />
      )}

      {/* RATING MODAL */}
      {showRateModal && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2500,
            padding: '16px'
          }}
          onClick={() => setShowRateModal(false)}
        >
          <div 
            style={{
              background: '#111',
              color: '#fff',
              borderRadius: '16px',
              maxWidth: '320px',
              width: '100%',
              textAlign: 'center',
              padding: '20px',
              border: '1px solid #333'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Rate This Salon
              </h3>
              <button 
                onClick={() => setShowRateModal(false)}
                style={{ background: 'none', border: 'none', color: '#aaa', fontSize: '16px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '12px', color: '#aaa', marginBottom: '16px' }}>
              {userRating > 0 
                ? `You previously rated this salon ${userRating} stars. Tap to update:` 
                : 'Tap a star to leave your rating for this salon:'}
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  disabled={isSubmittingRating}
                  onClick={async () => {
                    await handleRateStore(star);
                    setShowRateModal(false);
                  }}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '4px',
                    cursor: 'pointer'
                  }}
                >
                  <Star
                    size={28}
                    fill={(hoveredStar || userRating) >= star ? "#eab308" : "none"}
                    color={(hoveredStar || userRating) >= star ? "#eab308" : "#555"}
                  />
                </button>
              ))}
            </div>

            {userRating > 0 && (
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#10b981' }}>
                ✓ Current Rating: {userRating} Stars
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}