import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { firestore as db } from '../firebase';
import { doc, getDoc, collection, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import styles from './salonStore.module.css';

// --- Types & Interfaces ---
interface SalonProfile {
  salonName: string;
  bio: string;
  address: string;
  openingTime: string; // HH:MM
  closingTime: string; // HH:MM
  offDays: string[];   // ['Sunday', 'Monday']
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

export default function SalonStore() {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();

  // Loading & Hydration
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<SalonProfile | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [existingBookings, setExistingBookings] = useState<Appointment[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  // Wizard Framework State
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 'success'>(1);

  // Booking Selection State
  const [selectedServices, setSelectedServices] = useState<Service[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('any'); // 'any' or workerId
  const [selectedDate, setSelectedDate] = useState<string>(''); // YYYY-MM-DD
  const [selectedTime, setSelectedTime] = useState<string>(''); // HH:MM
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedRefId, setGeneratedRefId] = useState('');

  

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Data Aggregation & Real-time Synchronization Loop
  // 1. Data Aggregation & Real-time Synchronization Loop
    useEffect(() => {
        if (!uid) return;

        const loadSalonProfile = async () => {
        try {
            const profileSnap = await getDoc(doc(db, 'salons', uid));
            if (profileSnap.exists()) {
            setProfile(profileSnap.data() as SalonProfile);
            } else {
            triggerToast("Salon configurations missing.");
            setLoading(false); // Gatekeeper fallback if doc doesn't exist
            }
        } catch (err) {
            triggerToast("Failed loading business configuration framework.");
            setLoading(false);
        }
        };

        loadSalonProfile();

        // Stream workers list
        const unsubscribeWorkers = onSnapshot(
        collection(db, 'salonstation', uid, 'salonWorkers'),
        (snap) => setWorkers(snap.docs.map(d => d.data() as Worker)),
        () => triggerToast("Error loading workers feed.")
        );

        // Stream services list
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
        
        // 🟢 FIXED: Target the correct subcollection path ('appointments')
        const unsubscribeBookings = onSnapshot(
        collection(db, 'salonAppointments', uid, 'appointments'),
        (snap) => {
            const appointments = snap.docs.map(d => {
            const data = d.data();
            return {
                workerId: data.selectedWorker,
                date: data.date,
                time: data.time,
                duration: data.totalDuration
            } as Appointment;
            });
            setExistingBookings(appointments);
            setLoading(false);
        },
        () => setLoading(false)
        );

        return () => {
        unsubscribeWorkers();
        unsubscribeServices();
        unsubscribeBookings();
        };
    }, [uid]);

  // --- Computed Variables / State Aggregations ---
  // --- Computed Variables / State Aggregations ---
  const totalDuration = useMemo(() => 
    selectedServices.reduce((acc, s) => acc + Number(s.duration || 0), 0), 
    [selectedServices]
  );
  
  const totalPrice = useMemo(() => 
    selectedServices.reduce((acc, s) => acc + Number(s.price || 0), 0), 
    [selectedServices]
  );

  // Parse time helper (HH:MM -> absolute minutes from midnight)
  const parseTimeToMinutes = (t: string) => {

    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  // Render Time string back from absolute minutes
  const formatMinutesToTime = (min: number) => {
    const h = Math.floor(min / 60).toString().padStart(2, '0');
    const m = (min % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  // Build 7 calendar days starting today, filtering out offDays matching day name strings
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

  // Compute operational availability slot configurations dynamically
  const computedTimeSlots = useMemo(() => {
    if (!profile || !selectedDate || totalDuration === 0) return [];

    const slots = [];
    const startMin = parseTimeToMinutes(profile.openingTime);
    const endMin = parseTimeToMinutes(profile.closingTime);
    const stepSize = 30; // standard 30-min block steps

    for (let current = startMin; current + totalDuration <= endMin; current += stepSize) {
      const timeStr = formatMinutesToTime(current);
      
      // Verification rules against active bookings structural overlaps
      const isBusy = existingBookings.some(booking => {
        if (booking.date !== selectedDate) return false;
        
        // Match specific resource unless "any" worker was assigned
        if (selectedWorkerId !== 'any' && booking.workerId !== 'any' && booking.workerId !== selectedWorkerId) {
          return false;
        }

        const bookingStart = parseTimeToMinutes(booking.time);
        const bookingEnd = bookingStart + booking.duration;
        const prospectiveStart = current;
        const prospectiveEnd = current + totalDuration;

        // Check if interval overlaps
        return prospectiveStart < bookingEnd && prospectiveEnd > bookingStart;
      });

      slots.push({
        time: timeStr,
        disabled: isBusy,
        isPopular: current === startMin + 120 || current === startMin + 240 // Highlights example high traffic slots
      });
    }
    return slots;
  }, [profile, selectedDate, totalDuration, selectedWorkerId, existingBookings]);

  // --- Actions & Processing ---
  const toggleService = (service: Service) => {
    setSelectedServices(prev => 
      prev.some(s => s.serviceId === service.serviceId)
        ? prev.filter(s => s.serviceId !== service.serviceId)
        : [...prev, service]
    );
  };

  const executeFinalBookingSubmit = async () => {
    if (!uid || !customerName.trim() || !selectedDate || !selectedTime || selectedServices.length === 0) {
      triggerToast("Missing required scheduling credentials.");
      return;
    }

    setIsSubmitting(true);
    try {
      const referenceId = `SAL-${Math.floor(100000 + Math.random() * 900000)}`;
      const appointmentId = `app_${Date.now()}`;
      const docRef = doc(db, 'salonAppointments', uid, 'appointments', appointmentId);

      const payload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        note: customerNote.trim(),
        selectedServices: selectedServices.map(s => ({ serviceId: s.serviceId, serviceName: s.serviceName, price: s.price })),
        selectedWorker: selectedWorkerId,
        date: selectedDate,
        time: selectedTime,
        totalPrice: totalPrice,
        totalDuration: totalDuration,
        status: "pending",
        referenceId: referenceId,
        createdAt: serverTimestamp()
      };

      await setDoc(docRef, payload);
      setGeneratedRefId(referenceId);
      setStep('success');
    } catch (err) {
      triggerToast("Internal scheduling error. Slot matching failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.storeContainer}>
        <div className={styles.skeletonHero}></div>
        <div className={styles.skeletonCard}></div>
        <div className={styles.skeletonCard}></div>
      </div>
    );
  }

  // --- Success Screen Presentation ---
  if (step === 'success') {
    return (
      <div className={styles.storeContainer}>
        <div className={styles.successWrapper}>
          <div className={styles.successIcon}>✓</div>
          <h1 className={styles.successTitle}>Booking Confirmed</h1>
          <p className={styles.successSub}>Your appointment has been instantly processed into our ledger system.</p>

          <div className={styles.summaryGlassCard}>
            <div className={styles.refBadge}>
              <span className={styles.refLabel}>REFERENCE ID</span>
              <strong className={styles.refCode}>{generatedRefId}</strong>
            </div>

            <div className={styles.qrPlaceholder}>
              <div className={styles.qrInner}>
                {/* QR Code visual graphic representation */}
                <div className={styles.qrBlock} />
                <span>Scan At Check-in</span>
              </div>
            </div>

            <div className={styles.receiptDetails}>
              <h3>{profile?.salonName}</h3>
              <p>📅 {selectedDate} at <strong>{selectedTime}</strong></p>
              <p>⏱ Duration: {totalDuration} Mins</p>
              <p>💰 Total Bill: €{totalPrice.toFixed(2)}</p>
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
  if (loading) {
    return (
      <div className={styles.storeContainer}>
        <div className={styles.skeletonHero}></div>
        <div className={styles.skeletonCard}></div>
        <div className={styles.skeletonCard}></div>
      </div>
    );
  }

  // 🟢 NEW PROFILE FALLBACK CHECK
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

  return (
    <div className={styles.storeContainer}>
      {toast && <div className={styles.toastNotification}>{toast}</div>}

      {/* --- HERO PROFILE MATRIX BANNER --- */}
      {step === 1 && profile && (
        <section className={styles.heroBanner}>
          <div className={styles.heroGlassDetails}>
            <h1>{profile.salonName}</h1>
            <p className={styles.salonBio}>{profile.bio}</p>
            <p className={styles.salonAddress}>📍 {profile.address}</p>
            <p className={styles.salonHours}>🕒 Open daily: {profile.openingTime} - {profile.closingTime}</p>
            
            <div className={styles.trustBadgeRow}>
              <span>✓ Instant Confirmation</span>
              <span>✓ Secure Booking</span>
              <span>✓ Free Cancellation</span>
            </div>
          </div>
        </section>
      )}

      {/* --- STEP PROGRESS INDICATOR WIZARD BAR --- */}
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

      {/* --- STEP CARD LAYOUT VIEWPORTS --- */}
      <main className={styles.wizardStepViewports}>
        
        {/* STEP 1: SELECT PREMIUM SERVICES */}
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
                      <strong className={styles.priceTagText}>€{service.price.toFixed(2)}</strong>
                    </div>
                    <div className={styles.serviceDurationLine}>⏱ {service.duration} Mins</div>
                    {service.description && <p className={styles.serviceCardDescription}>{service.description}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: ASSIGN WORKER RESOURCE */}
        {step === 2 && (
          <div className={styles.stepViewport}>
            <h2 className={styles.stepTitleHeading}>Choose Stylist/Worker</h2>
            <div className={styles.cardsScrollStack}>
              
              {/* ANY AVAILABLE OPTION CARD */}
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

              {/* INDIVIDUAL STAFF CARDS */}
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

        {/* STEP 3: SCHEDULE DATE & AVAILABLE TIMES */}
        {step === 3 && (
          <div className={styles.stepViewport}>
            <h2 className={styles.stepTitleHeading}>Select Date & Time Slot</h2>
            
            {/* HORIZONTAL SCROLL CALENDAR BAR */}
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

            {/* TIME SLOTS GRID REPOSITORIES */}
            {selectedDate ? (
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
            ) : (
              <p className={styles.emptyPromptText}>Please select a date from the slider to see available time slots.</p>
            )}
          </div>
        )}

        {/* STEP 4: CUSTOMER CREDENTIAL INPUT DETAILS */}
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

        {/* STEP 5: FINAL VERIFICATION REVIEW SUMMARY */}
        {step === 5 && (
          <div className={styles.stepViewport}>
            <h2 className={styles.stepTitleHeading}>Confirm Your Appointment</h2>
            <div className={styles.luxurySummaryDisplayCard}>
              <h3>{profile?.salonName}</h3>
              <p className={styles.summaryLocationText}>📍 {profile?.address}</p>
              
              <div className={styles.summaryDividerLine} />
              
              <div className={styles.summaryGroupSection}>
                <h4>Selected Services</h4>
                {selectedServices.map(s => (
                  <div key={s.serviceId} className={styles.summaryItemRowLine}>
                    <span>{s.serviceName}</span>
                    <strong>€{s.price.toFixed(2)}</strong>
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
                  <h4>Total Aggregate Bill</h4>
                  <p className={styles.finalTotalEmphasizedText}>€{totalPrice.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* --- STICKY FOOTER NAVIGATION CONTROLS --- */}
      <footer className={styles.stickyActionControlFooter}>
        <div className={styles.summaryOverlayLabelInfo}>
          <div>Selected: <strong>{selectedServices.length} items</strong></div>
          <div className={styles.footerPriceEmphasized}>€{totalPrice.toFixed(2)} <small>({totalDuration}m)</small></div>
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
                if (step === 4 && !customerName.trim()) return triggerToast("Your client profile requires an assignment name identifier.");
                setStep(prev => (typeof prev === 'number' ? prev + 1 : 1) as 1 | 2 | 3 | 4 | 5 | 'success');
              }}
            >
              Continue
            </button>
          ) : (
            <button 
              type="button" 
              className={styles.footerSubmitBookingButton} 
              disabled={isSubmitting}
              onClick={executeFinalBookingSubmit}
            >
              {isSubmitting ? "Locking Your Slot..." : "Book Appointment"}
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}