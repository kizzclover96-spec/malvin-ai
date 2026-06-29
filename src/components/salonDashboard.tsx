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
  serverTimestamp 
} from 'firebase/firestore';
import styles from './salonDashboard.module.css';
import SalonStation from './salonStation';
import QRCode from 'qrcode';

// --- Interfaces ---
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

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function SalonDashboard() {
  const navigate = useNavigate();
  
  // Auth & Loading States
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Salon Data State
  const [salon, setSalon] = useState<SalonData | null>(null);
  
  // Form/Edit States (for settings modal)
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

  // 🌟 DYNAMIC LINK COMPUTATION (Zero storage dependency)
  const runtimeQrLink = uid ? `${window.location.origin}/salon/${uid}` : '';

  // 1. Authenticate & Sync User UID
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

  // 2. Real-time Firestore Sync & Auto-Initialization
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
          // 🟢 REMOVED qrLink field entirely from saving to the DB here
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

  }, [uid]);

  // 3. Prevent accidental loss of unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasChanges]);

  useEffect(() => {
    if (isDrawerOpen || isModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isDrawerOpen, isModalOpen]);

  // --- Helper Action Functions ---
  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3000);
  };

  const handleCopyLink = async () => {
    if (!runtimeQrLink) return;
    try {
      await navigator.clipboard.writeText(runtimeQrLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast("Link copied to clipboard!");
    } catch (err) {
      showToast("Failed to copy link.");
    }
  };

  const handleShareLink = async () => {
    if (!salon || !runtimeQrLink) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: salon.salonName,
          text: salon.bio,
          url: runtimeQrLink,
        });
      } catch (err) {
        // Fallback or cancelled share
      }
    } else {
      handleCopyLink();
    }
  };

  const toggleOffDay = (day: string) => {
    setHasChanges(true);
    setFormOffDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const handleWithdrawProfit = () => {
    if (!salon || salon.walletBalance <= 0) {
      alert("No profits available to withdraw.");
      return;
    }
    const confirmWithdraw = window.confirm(`Are you sure you want to withdraw your current balance of $${salon.walletBalance}?`);
    if (confirmWithdraw) {
      showToast("Withdrawal request initiated successfully!");
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) return;

    if (!formName.trim() || !formAddress.trim() || !formOpening || !formClosing) {
      showToast("All required fields must be filled out!");
      return;
    }
    if (formLimit <= 0) {
      showToast("Appointment limit must be greater than 0!");
      return;
    }

    setIsSaving(true);
    try {
      const docRef = doc(db, "salons", uid);
      await updateDoc(docRef, {
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
    } catch (error) {
      showToast("Error updating settings.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !salon) {
    return (
      <div className={styles.dashboardContainer}>
        <div className={styles.skeletonHeader}></div>
        <div className={styles.skeletonMain}>
          <div className={styles.skeletonTextLine} style={{ width: '60%', height: '40px' }}></div>
          <div className={styles.skeletonTextLine} style={{ width: '40%', height: '20px' }}></div>
          <div className={styles.skeletonTextLine} style={{ width: '80%', height: '24px' }}></div>
        </div>
      </div>
    );
  }
  if (page === 'catalogue') { return <SalonStation onBack={() => setPage('dashboard')}/>;}

  // 🟢 UPDATED: Reads directly from local calculated runtime variable instead of salon field
  const activeQrSrc = salon.qrImage || `https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${encodeURIComponent(runtimeQrLink)}`;

  return (
    <div className={styles.dashboardContainer}>
      {toast && <div className={styles.toast}>{toast}</div>}

      <header className={styles.header}>
        <button className={styles.iconButton} onClick={() => setIsDrawerOpen(true)} aria-label="Open Menu">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>

        <button className={styles.iconButton} onClick={() => setIsModalOpen(true)} aria-label="Open Settings">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
        </button>
      </header>

      <main className={styles.mainContent}>
        <div className={styles.heroGlassCard}>
          <h1 className={styles.salonTitle}>{salon.salonName || "Set Your Salon Name"}</h1>
          <p className={styles.salonBio}>{salon.bio || "No description provided yet."}</p>
          <div className={styles.salonAddressBlock}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px', flexShrink: 0 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            <span>{salon.address || "No address listed"}</span>
          </div>
        </div>
      </main>

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
                  <img src={activeQrSrc} alt="Salon QR Code" className={styles.qrImage} />
                  {/* 🟢 RENDERING LOGATION DYNAMICALLY */}
                  <p className={styles.qrLinkText}>{runtimeQrLink}</p>
                  <div className={styles.buttonGroupRow}>
                    <button type="button" className={styles.glassButtonSecondary} onClick={handleShareLink}>Share Link</button>
                    <button type="button" className={styles.glassButtonSecondary} onClick={handleCopyLink}>
                      {copied ? "Copied!" : "Copy Link"}
                    </button>
                    {/* 🟢 SOURCE TARGET PATH SET TO RUNTIME VALUE */}
                    <a href={runtimeQrLink} target="_blank" rel="noreferrer" className={styles.glassButtonSecondaryLink}>Open Link</a>
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
                        <button
                          type="button"
                          key={day}
                          className={`${styles.chip} ${isSelected ? styles.chipActive : ''}`}
                          onClick={() => toggleOffDay(day)}
                        >
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
                <div className={styles.metaRow}><strong>VIN Wallet Balance:</strong> <span>${salon.walletBalance.toFixed(2)}</span></div>
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
    </div>
  );
}