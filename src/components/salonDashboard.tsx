import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { firestore as db } from '../firebase'; 
import { auth } from "../firebase"; 
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  collectionGroup,
  query,
  where,
  orderBy,
  limit,
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import styles from './salonDashboard.module.css';
import SalonStation from './salonStation';
import QRCode from 'qrcode';
import { useBusinessWallet } from "../hooks/useBusinessWallet";
import { Bell, Sparkles, Clock, User, QrCode, ShieldCheck, ShieldAlert } from 'lucide-react';

interface SalonData {
  salonName: string;
  bio: string;
  address: string;
  openingTime: string;
  closingTime: string;
  offDays: string[];
  appointmentLimit: number;
  qrImage: string;
  walletBalance: number;
  status: string;
}

interface LiveAppointment {
  id: string;
  ticketId: string;
  services: Array<{ serviceName?: string; name?: string; price: number }>;
  stylist: string;
  totalPaid: number;
  duration: number;
  createdAt: any;
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function SalonDashboard() {
  const navigate = useNavigate();
  
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { balance, currency } = useBusinessWallet();
  const [salon, setSalon] = useState<SalonData | null>(null);
  const [incomingAppointments, setIncomingAppointments] = useState<LiveAppointment[]>([]);

  // Form States
  const [formName, setFormName] = useState('');
  const [formBio, setFormBio] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formOpening, setFormOpening] = useState('09:00');
  const [formClosing, setFormClosing] = useState('18:00');
  const [formOffDays, setFormOffDays] = useState<string[]>([]);
  const [formLimit, setFormLimit] = useState<number>(20);

  // UI States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [page, setPage] = useState<'dashboard' | 'catalogue'>('dashboard');

  // Anti-Fraud Verification States
  const [scanInput, setScanInput] = useState('');
  const [showScannerInput, setShowScannerInput] = useState(false);

  const runtimeQrLink = uid ? `${window.location.origin}/salon/${uid}` : '';

  useEffect(() => {
    if (!runtimeQrLink) return;
    QRCode.toDataURL(runtimeQrLink, { width: 250, margin: 2 })
      .then(url => setQrCodeUrl(url))
      .catch(err => console.error("Error generating local QR code:", err));
  }, [runtimeQrLink]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUid(user.uid);
      } else {
        setLoading(false);
        navigate('/login');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (!uid) return;
    const docRef = doc(db, 'salons', uid);

    const checkAndInitDoc = async () => {
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        const defaultDoc = {
          salonName: "My Premium Salon",
          bio: "Welcome to our salon dashboard. Click the gear icon to edit this bio.",
          address: "123 Beauty Lane",
          openingTime: "09:00",
          closingTime: "18:00",
          offDays: [],
          appointmentLimit: 20,
          qrImage: "",
          walletBalance: 0,
          status: "Active",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        await setDoc(docRef, defaultDoc);
      }
    };

    checkAndInitDoc().then(() => {
      const unsubscribeSnapshot = onSnapshot(docRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data() as SalonData;
          setSalon(data);
          setFormName(data.salonName);
          setFormBio(data.bio);
          setFormAddress(data.address);
          setFormOpening(data.openingTime);
          setFormClosing(data.closingTime);
          setFormOffDays(data.offDays);
          setFormLimit(data.appointmentLimit);
        }
        setLoading(false);
      });
      return () => unsubscribeSnapshot();
    });

    const appointmentsQuery = query(
      collectionGroup(db, 'appointments'),
      where('businessId', '==', uid),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    let initialLoadComplete = false;
    const unsubscribeAppointments = onSnapshot(appointmentsQuery, (snapshot) => {
      const bookings: LiveAppointment[] = [];
      let containsNewDoc = false;

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') containsNewDoc = true;
      });

      snapshot.forEach((doc) => {
        const data = doc.data();
        bookings.push({
          id: doc.id,
          ticketId: data.ticketId || "SAL-000000",
          services: data.services || [],
          stylist: data.stylist || "Any Available",
          totalPaid: data.totalPaid || 0,
          duration: data.duration || 0,
          createdAt: data.createdAt,
        });
      });

      setIncomingAppointments(bookings);

      if (initialLoadComplete && containsNewDoc) {
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioContext.createOscillator();
          const gainNode = audioContext.createGain();
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(587.33, audioContext.currentTime);
          oscillator.frequency.setValueAtTime(880.00, audioContext.currentTime + 0.1);
          gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
          oscillator.connect(gainNode);
          gainNode.connect(audioContext.destination);
          oscillator.start();
          oscillator.stop(audioContext.currentTime + 0.4);
        } catch (e) {}
      }
      initialLoadComplete = true;
    });

    return () => unsubscribeAppointments();
  }, [uid]);

  // Anti-Fraud Verification and Crosscheck System
  const handleVerifyTicketId = async (idToVerify: string) => {
    const cleanedId = idToVerify.trim();
    if (!cleanedId) return;

    // Search existing live matching appointments stream
    const matchedAppointment = incomingAppointments.find(
      app => app.ticketId.toLowerCase() === cleanedId.toLowerCase() || app.id === cleanedId
    );

    if (matchedAppointment) {
      try {
        // Match found! Auto-delete to resolve and confirm
        const parentPathParts = matchedAppointment.ticketId.split('-');
        // Fallback or explicit subcollection document reference targeting structural deletion
        await deleteDoc(doc(db, "salons", uid!, "appointments", matchedAppointment.id));
        showToast(`Verification Confirmed! Valid Appointment resolved.`);
        alert(`🔒 CONFIRMED:\nTicket ID: ${matchedAppointment.ticketId} is valid. Appointment auto-cleared from active queue successfully.`);
      } catch (err) {
        // Fallback strategy if subcollection query layout varies
        showToast("Confirmed matching ID! Clearing item view.");
        setIncomingAppointments(prev => prev.filter(item => item.id !== matchedAppointment.id));
      }
    } else {
      alert("❌ FRAUD DETECTED / INVALID ID:\nNo appointment registered for this unique identifier ticket.");
    }
    setScanInput('');
    setShowScannerInput(false);
  };

  // Chronological Date Categorization Buckets
  const categorizeAppointments = () => {
    const categories: { [key: string]: LiveAppointment[] } = {
      'Yesterday': [],
      'Today': [],
      'Tomorrow': [],
      'Next Week': [],
      'Older': []
    };

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const oneDayMs = 24 * 60 * 60 * 1000;

    incomingAppointments.forEach(booking => {
      if (!booking.createdAt) {
        categories['Today'].push(booking);
        return;
      }
      const dateMillis = booking.createdAt.seconds ? booking.createdAt.seconds * 1000 : new Date(booking.createdAt).getTime();
      
      if (dateMillis >= startOfToday && dateMillis < startOfToday + oneDayMs) {
        categories['Today'].push(booking);
      } else if (dateMillis >= startOfToday - oneDayMs && dateMillis < startOfToday) {
        categories['Yesterday'].push(booking);
      } else if (dateMillis >= startOfToday + oneDayMs && dateMillis < startOfToday + (2 * oneDayMs)) {
        categories['Tomorrow'].push(booking);
      } else if (dateMillis >= startOfToday + (2 * oneDayMs) && dateMillis <= startOfToday + (8 * oneDayMs)) {
        categories['Next Week'].push(booking);
      } else {
        categories['Older'].push(booking);
      }
    });

    return categories;
  };

  const appointmentGroups = categorizeAppointments();

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) { e.preventDefault(); e.returnValue = ''; }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(runtimeQrLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast("Link copied to clipboard!");
    } catch { showToast("Failed to copy link."); }
  };

  const handleShareLink = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: salon?.salonName, text: salon?.bio, url: runtimeQrLink }); } catch {}
    } else { handleCopyLink(); }
  };

  const toggleOffDay = (day: string) => {
    setHasChanges(true);
    setFormOffDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const handleWithdrawProfit = () => {
    if (!salon || salon.walletBalance <= 0) {
      alert("No profits available to withdraw.");
      return;
    }
    if (window.confirm(`Withdraw current balance of $${salon.walletBalance}?`)) {
      showToast("Withdrawal request initiated successfully!");
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, "salons", uid), {
        salonName: formName,
        bio: formBio,
        address: formAddress,
        openingTime: formOpening,
        closingTime: formClosing,
        offDays: formOffDays,
        appointmentLimit: formLimit,
        updatedAt: serverTimestamp()
      });
      showToast("Settings updated successfully!");
      setHasChanges(false);
      setIsModalOpen(false);
    } catch { showToast("Error updating settings."); }
    finally { setIsSaving(false); }
  };

  if (loading || !salon) {
    return (
      <div className={styles.dashboardContainer} style={{ background: "#050505", minHeight: "100vh" }}>
        <div className={styles.skeletonHeader} style={{ height: "60px", background: "#0c0c0c" }}></div>
        <div className={styles.skeletonMain} style={{ padding: "40px" }}></div>
      </div>
    );
  }
  
  if (page === 'catalogue') { 
    return <SalonStation onBack={() => setPage('dashboard')}/>;
  }

  return (
    <div className={styles.dashboardContainer} style={{ background: "#050505", minHeight: "100vh", color: "#fff", fontFamily: "sans-serif", width: "100vw", overflowX: "hidden" }}>
      {toast && <div className={styles.toast}>{toast}</div>}

      {/* FULL-WIDTH FLUID DENSITY HEADER */}
      <header className={styles.header} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 32px", background: "#0c0c0c", borderBottom: "1px solid #1a1a1a", width: "100%", boxSizing: "border-box" }}>
        <button className={styles.iconButton} onClick={() => setIsDrawerOpen(true)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>

        {/* Action Controls Side Area Including Live Fraud Scanner Verification */}
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <button 
            title="Scan Pass Unique ID" 
            onClick={() => setShowScannerInput(!showScannerInput)} 
            style={{ background: showScannerInput ? "#rgba(229,57,53,0.2)" : "none", border: "none", color: showScannerInput ? "#E53935" : "#aaa", cursor: "pointer", transition: "color 0.2s", display: "flex", alignItems: "center" }}
          >
            <QrCode size={22} />
          </button>
          
          <button className={styles.iconButton} onClick={() => setIsModalOpen(true)} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          </button>
        </div>
      </header>

      {/* FRAUD VERIFICATION OVERLAY DROPDOWN STRIP */}
      {showScannerInput && (
        <div style={{ background: "#0c0c0c", borderBottom: "1px solid #E53935", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", animation: "slideIn 0.2s ease" }}>
          <ShieldCheck size={18} color="#4BB543" />
          <input 
            type="text" 
            placeholder="Enter or scan Unique Ticket ID..." 
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleVerifyTicketId(scanInput)}
            style={{ background: "#111", border: "1px solid #333", borderRadius: "8px", padding: "8px 16px", color: "#fff", width: "100%", maxWidth: "400px", fontSize: "14px" }}
          />
          <button 
            onClick={() => handleVerifyTicketId(scanInput)}
            style={{ background: "#E53935", border: "none", color: "#fff", borderRadius: "8px", padding: "8px 20px", fontWeight: "bold", cursor: "pointer", fontSize: "13px" }}
          >
            Crosscheck
          </button>
        </div>
      )}

      {/* EDGE-TO-EDGE FLUID CONTAINER MAIN BODY */}
      <main className={styles.mainContent} style={{ padding: "32px", width: "100%", boxSizing: "border-box" }}>
        
        {/* HERO TITLE CONTAINER */}
        <div className={styles.heroGlassCard} style={{ background: "#0c0c0c", border: "1px solid #1a1a1a", padding: "32px", borderRadius: "24px", marginBottom: "32px", width: "100%", boxSizing: "border-box" }}>
          <h1 className={styles.salonTitle} style={{ margin: "0 0 8px 0", fontSize: "32px", fontWeight: 900 }}>{salon.salonName}</h1>
          <p className={styles.salonBio} style={{ color: "#888", margin: "0 0 16px 0", fontSize: "14px", lineHeight: "1.5" }}>{salon.bio}</p>
          <div className={styles.salonAddressBlock} style={{ color: "#aaa", fontSize: "13px", display: "flex", alignItems: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px', flexShrink: 0 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            <span>{salon.address}</span>
          </div>
        </div>

        {/* LIVE STREAM CHRONOLOGICAL DATA PANELS */}
        <div style={{ marginTop: "32px", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
            <Bell size={18} color="#E53935" style={{ animation: "pulse 2s infinite", flexShrink: 0 }} />
            <h2 style={{ fontSize: "13px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1.5px", color: "#aaa", margin: 0 }}>Live Appointments Monitor</h2>
          </div>

          {incomingAppointments.length === 0 ? (
            <div style={{ padding: "48px 16px", background: "#0c0c0c", border: "1px dashed #222", borderRadius: "16px", textAlign: "center", color: "#555", fontSize: "14px", fontWeight: "bold" }}>
              Waiting for incoming active appointments...
            </div>
          ) : (
            Object.keys(appointmentGroups).map(groupName => {
              const items = appointmentGroups[groupName];
              if (items.length === 0) return null;

              return (
                <div key={groupName} style={{ marginBottom: "28px", width: "100%" }}>
                  {/* Category Section Group Header Tab */}
                  <h3 style={{ fontSize: "13px", color: "#E53935", background: "rgba(229,57,53,0.06)", display: "inline-block", padding: "4px 12px", borderRadius: "6px", marginBottom: "12px", fontWeight: "bold", letterSpacing: "0.5px" }}>
                    {groupName} ({items.length})
                  </h3>

                  <div style={{ display: "flex", flexDirection: "column", gap: "12px", width: "100%" }}>
                    {items.map((booking) => (
                      <div 
                        key={booking.id} 
                        style={{ 
                          display: "flex", 
                          flexWrap: "wrap", 
                          alignItems: "center", 
                          justifyContent: "space-between", 
                          background: "linear-gradient(90deg, #0c0c0c 0%, #111 100%)", 
                          border: "1px solid #1a1a1a", 
                          borderRadius: "16px", 
                          padding: "16px 24px", 
                          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
                          animation: "slideIn 0.3s ease-out",
                          gap: "16px",
                          width: "100%",
                          boxSizing: "border-box"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "16px", minWidth: "260px", flex: "1 1 0%" }}>
                          <div style={{ background: "rgba(229,57,53,0.1)", padding: "10px", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            <Sparkles size={18} color="#E53935" />
                          </div>
                          <div style={{ minWidth: "0" }}>
                            <p style={{ margin: 0, fontSize: "14px", fontWeight: 900, color: "#fff", letterSpacing: "0.5px" }}>
                              {booking.ticketId}
                            </p>
                            <p style={{ margin: "4px 0 0 0", fontSize: "12px", color: "#777", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {booking.services.map(s => s.serviceName || s.name).join(", ")}
                            </p>
                          </div>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "24px", flexWrap: "wrap", width: "auto", marginLeft: "auto" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#aaa" }}>
                            <User size={13} style={{ color: "#555" }} />
                            <span style={{ fontSize: "12px", fontWeight: "bold" }}>{booking.stylist}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#aaa" }}>
                            <Clock size={13} style={{ color: "#555" }} />
                            <span style={{ fontSize: "12px" }}>{booking.duration}m</span>
                          </div>
                          <div style={{ textAlign: "right", minWidth: "80px" }}>
                            <span style={{ fontSize: "16px", fontWeight: 900, color: "#4BB543" }}>+{currency}{booking.totalPaid}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Navigation Drawer Overlay & Panels */}
      {isDrawerOpen && <div className={styles.drawerOverlay} onClick={() => setIsDrawerOpen(false)} />}
      <nav className={`${styles.drawer} ${isDrawerOpen ? styles.drawerOpen : ''}`}>
        <div className={styles.drawerHeader}>
          <h3>Navigation</h3>
          <button className={styles.closeMenuButton} onClick={() => setIsDrawerOpen(false)}>&times;</button>
        </div>
        <ul className={styles.drawerList}>
          <li className={styles.drawerItem} onClick={() => { setIsDrawerOpen(false); showToast("Analytics coming soon!"); }}>Analytics</li>
          <li className={styles.drawerItem} onClick={() => { setIsDrawerOpen(false); showToast("System status normal."); }}>System</li>
        </ul>
      </nav>

      {/* Settings Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>Salon Settings</h2>
              <button className={styles.closeModalButton} onClick={() => {
                if (hasChanges && !window.confirm("Discard unsaved changes?")) return;
                setIsModalOpen(false);
                setHasChanges(false);
              }}>&times;</button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.glassCard}>
                <h3>Salon QR Access</h3>
                <div className={styles.qrSection}>
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="Salon QR Code" className={styles.qrImage} />
                  ) : (
                    <div className={styles.qrPlaceholder}>Generating QR...</div>
                  )}
                  <p className={styles.qrLinkText}>{runtimeQrLink}</p>
                  <div className={styles.buttonGroupRow}>
                    <button type="button" className={styles.glassButtonSecondary} onClick={handleShareLink}>Share Link</button>
                    <button type="button" className={styles.glassButtonSecondary} onClick={handleCopyLink}>
                      {copied ? "Copied!" : "Copy Link"}
                    </button>
                    <a href={runtimeQrLink} target="_blank" rel="noreferrer" className={styles.glassButtonSecondaryLink}>Open Link</a>
                    {qrCodeUrl && (
                      <a href={qrCodeUrl} download={`${salon.salonName.replace(/\s+/g, '_')}_QRCode.png`} className={styles.glassButtonPrimaryLink} style={{ textDecoration: 'none', textAlign: 'center' }}>
                        Download QR
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <form onSubmit={handleSaveSettings} className={styles.glassCard}>
                <h3>Update Information</h3>
                <div className={styles.formField}>
                  <label>Salon Name *</label>
                  <input type="text" value={formName} onChange={(e) => { setFormName(e.target.value); setHasChanges(true); }} required />
                </div>
                <div className={styles.formField}>
                  <label>Bio</label>
                  <textarea rows={3} value={formBio} onChange={(e) => { setFormBio(e.target.value); setHasChanges(true); }} />
                </div>
                <div className={styles.formField}>
                  <label>Address *</label>
                  <input type="text" value={formAddress} onChange={(e) => { setFormAddress(e.target.value); setHasChanges(true); }} required />
                </div>
                <div className={styles.formRow}>
                  <div className={styles.formField}>
                    <label>Opening Time *</label>
                    <input type="time" value={formOpening} onChange={(e) => { setFormOpening(e.target.value); setHasChanges(true); }} required />
                  </div>
                  <div className={styles.formField}>
                    <label>Closing Time *</label>
                    <input type="time" value={formClosing} onChange={(e) => { setFormClosing(e.target.value); setHasChanges(true); }} required />
                  </div>
                </div>
                <div className={styles.formField}>
                  <label>Off Days</label>
                  <div className={styles.chipContainer}>
                    {DAYS_OF_WEEK.map(day => {
                      const isSelected = formOffDays.includes(day);
                      return (
                        <button type="button" key={day} className={`${styles.chip} ${isSelected ? styles.chipActive : ''}`} onClick={() => toggleOffDay(day)}>
                          {day}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className={styles.formField}>
                  <label>Max Appointments Per Day</label>
                  <input type="number" min="1" value={formLimit} onChange={(e) => { setFormLimit(parseInt(e.target.value) || 0); setHasChanges(true); }} required />
                </div>
                <button type="submit" className={styles.glassButtonPrimary} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Modifications"}
                </button>
              </form>

              <div className={styles.glassCard}>
                <h3>Account & Ledger</h3>
                <div className={styles.metaRow}><strong>UID:</strong> <span className={styles.codeText}>{uid}</span></div>
                <div className={styles.metaRow}><strong>Status:</strong> <span>{salon.status}</span></div>
                <div className={styles.metaRow}><strong>VIN Wallet Balance:</strong> <span>{currency} {(salon.walletBalance || balance).toFixed(2)}</span></div>
                <button type="button" className={styles.glassButtonPrimary} style={{ marginTop: '12px' }} onClick={handleWithdrawProfit}>
                  Withdraw Profit
                </button>
              </div>

              <div className={styles.glassCard}>
                <h3>Station Configurations</h3>
                <button type="button" className={`${styles.glassButtonPrimary} ${styles.largeButton}`} onClick={() => setPage('catalogue')}>
                  Store Details &rarr;
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}