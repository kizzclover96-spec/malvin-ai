import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { firestore as db } from '../../firebase'; 
import { auth } from "../../firebase"; 
import { getDatabase, ref, onValue } from 'firebase/database';
import Banned from '../addons/Banned';
import Suspended from '../addons/Suspended';
import { getFunctions, httpsCallable } from 'firebase/functions';
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
import { useBusinessWallet } from "../../hooks/useBusinessWallet";
import ConfirmQRScanner from '../addons/ConfirmQRScanner'; // Imported custom validation scanner
import { signOut, deleteUser } from 'firebase/auth'; // <--- Added deleteUser
import { Bell, Sparkles, Clock, User, QrCode, CheckCircle, Download, Trash2, Loader2, LogOut } from 'lucide-react';

import { geocodeAddress } from '../../utils/geocoding';

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
  hasPinConfigured?: boolean;
  stripeOnboarded?: boolean;
  stripeAccountId?: string;
  latitude?: number; 
  longitude?: number;
}

interface LiveAppointment {
  id: string;
  path: string; // 🔒 Store the absolute database document path for precise deletion
  ticketId: string;
  services: Array<{ serviceName?: string; name?: string; price: number }>;
  stylist: string;
  totalPaid: number;
  duration: number;
  createdAt: any;
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
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function SalonDashboard() {
  const navigate = useNavigate();
  
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { balance, currency } = useBusinessWallet({ merchantType: "salon" });
  const [salon, setSalon] = useState<SalonData | null>(null);
  const [incomingAppointments, setIncomingAppointments] = useState<LiveAppointment[]>([]);

  // Verification Details Modal State
  const [scannedResult, setScannedResult] = useState<LiveAppointment | null>(null);

  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [isProcessingPayout, setIsProcessingPayout] = useState(false);
  const [isPinSetupModalOpen, setIsPinSetupModalOpen] = useState(false);
  const [isForgotPinOpen, setIsForgotPinOpen] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [newPin, setNewPin] = useState('');

  const [isBanned, setIsBanned] = useState<boolean>(false);
  const [isSuspended, setIsSuspended] = useState<boolean>(false);
  const [suspendedReason, setSuspendedReason] = useState<string>('');
  // First-Time Pin Setup States
  const [setupPin, setSetupPin] = useState('');
  const [confirmSetupPin, setConfirmSetupPin] = useState('');
  const [isRegisteringPin, setIsRegisteringPin] = useState(false);
  const [stripeBalance, setStripeBalance] = useState({ available: 0, pending: 0, total: 0 });
  const [isFetchingBalance, setIsFetchingBalance] = useState(false);
  
  const handleForgotPinRequest = async () => {
    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const requestReset = httpsCallable(getFunctions(), 'requestPinReset');
      
      showToast("Sending verification email...");
      await requestReset();
      
      setIsPinModalOpen(false); // Close payout modal
      setIsForgotPinOpen(true); // Open reset verification form
      showToast("Check your email for the recovery code!");
    } catch (error: any) {
      alert(`Failed to send code: ${error.message}`);
    }
  };

  // 🛠️ Verifies email code and overwrites with the new PIN
  const handleConfirmNewPin = async () => {
    if (newPin.length !== 4 || resetCode.length !== 6) {
      alert("Please enter a 6-digit email code and a new 4-digit PIN.");
      return;
    }

    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const confirmReset = httpsCallable(getFunctions(), 'confirmPinReset');

      showToast("Applying security modifications...");
      await confirmReset({
        resetToken: resetCode,
        newPin: newPin
      });

      alert("🎉 Security PIN successfully reset! You can now resume payouts.");
      setIsForgotPinOpen(false);
      setResetCode('');
      setNewPin('');
    } catch (error: any) {
      alert(`Reset Failed: ${error.message}`);
    }
  };

  // INITIAL SETUP: Generates a new merchant PIN on the backend
  const handleRegisterSetupPin = async () => {
    if (setupPin.length !== 4 || confirmSetupPin.length !== 4) {
      alert("PIN must be exactly 4 digits.");
      return;
    }

    if (setupPin !== confirmSetupPin) {
      alert("PINs do not match. Please verify.");
      return;
    }

    setIsRegisteringPin(true);
    showToast("Registering your secure PIN...");

    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const setupPinFn = httpsCallable(getFunctions(), 'initializeMerchantPin'); 

      await setupPinFn({
        pin: setupPin,
        merchantType: "salon"
      });

      alert("🎉 Security PIN successfully established! You can now withdraw funds securely.");
      
      if (salon) setSalon({ ...salon, hasPinConfigured: true });
      
      setIsPinSetupModalOpen(false);
    } catch (error: any) {
      alert(`Setup Failed: ${error.message}`);
    } finally {
      setIsRegisteringPin(false);
      setSetupPin('');
      setConfirmSetupPin('');
    }
  };




  useEffect(() => {
    if (!uid) return;

    // Listen directly to the user's root node in Realtime Database
    const userRef = ref(rtdb, `users/${uid}`);

    const unsubscribe = onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Check status from either brandData, status string, or boolean flags
        const status = data.brandData?.status || data.status || "";
        const isBannedUser = status === "Banned" || data.banned === true || data.isBanned === true;
        const isSuspendedUser = status === "Suspended" || data.suspended === true || data.isSuspended === true;
        
        setIsVerified(data.profile?.isVerified || data.isVerified || false);
        setIsBanned(isBannedUser);
        setIsSuspended(isSuspendedUser);

        // Save complete status data for Banned/Suspended screen props
        setBrandStatusData({
          id: uid,
          banReason: data.brandData?.banReason || data.banReason || "Violation of platform policies or suspicious activity detected.",
          suspensionReason: data.brandData?.suspensionReason || data.suspensionReason || "Temporary restriction due to policy violation.",
          suspensionEnds: data.brandData?.suspensionEnds || data.suspensionEnds || null,
          ...salon
        });
      }
    });

    return () => unsubscribe();
  }, [uid, salon]);
  // Form States
  const [formName, setFormName] = useState('');
  const [formBio, setFormBio] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formOpening, setFormOpening] = useState('09:00');
  const [formClosing, setFormClosing] = useState('18:00');
  const [formOffDays, setFormOffDays] = useState<string[]>([]);
  const [formLimit, setFormLimit] = useState<number>(20);
  const rtdb = getDatabase();

  // State variables to hold full brand status context
  const [brandStatusData, setBrandStatusData] = useState<any>(null);

  const [isVerified, setIsVerified] = useState(false);

  // UI States
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [page, setPage] = useState<'dashboard' | 'catalogue'>('dashboard');
  const [showScannerInput, setShowScannerInput] = useState(false);


  // Data Export & Account Erasure States
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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


  // --- Download Salon Data ---
  const handleDownloadData = async () => {
    if (!uid) return;
    setIsDownloading(true);
    try {
      const docRef = doc(db, 'salons', uid);
      const docSnap = await getDoc(docRef);
      const profileData = docSnap.exists() ? docSnap.data() : {};

      const exportPayload = {
        account: {
          uid,
          email: auth.currentUser?.email || '',
          ...profileData
        },
        appointments: incomingAppointments,
        exportedAt: new Date().toISOString()
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `salon-data-${uid}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      showToast("Salon data exported successfully!");
    } catch (err) {
      console.error("Download failed:", err);
      alert("Failed to export salon data.");
    } finally {
      setIsDownloading(false);
    }
  };

  // --- Delete Account & Salon Data ---
  const handleDeleteAccountAndData = async () => {
    if (!uid) return;
    setIsDeleting(true);
    try {
      // 1. Delete Stripe Connect Account if one exists
      if (salon?.stripeAccountId) {
        try {
          const functions = getFunctions();
          const deleteStripeAcc = httpsCallable(functions, 'deleteStripeAccount');
          await deleteStripeAcc({ stripeAccountId: salon.stripeAccountId });
        } catch (stripeErr) {
          console.error("Failed to delete Stripe account:", stripeErr);
        }
      }

      // 2. Delete Salon document in Firestore
      await deleteDoc(doc(db, 'salons', uid));

      // 3. Delete Firebase Auth User
      if (auth.currentUser) {
        await deleteUser(auth.currentUser);
      }

      alert("Account and salon profile permanently deleted.");
      navigate('/login');
    } catch (err: any) {
      console.error("Delete failed:", err);
      if (err?.code === 'auth/requires-recent-login') {
        alert("Re-authentication required. Please log out and log back in to delete your account.");
      } else {
        alert("Failed to delete account. Please try again.");
      }
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

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
      limit(100)
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

        // 🛡️ 1. SCREEN OUT FOOD ORDERS FROM SALON WORKSPACE
        if (
          data.orderType === 'food' || 
          data.category === 'food' || 
          data.type === 'food' || 
          data.isFoodOrder || 
          (data.items && !data.services)
        ) {
          return; 
        }

        bookings.push({
          id: doc.id,
          path: doc.ref.path, // 🔒 Save the exact Firestore database path
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

  // Anti-Fraud Core Process Engine (Immediate Removal Strategy)
  const handleVerifyTicketId = async (idToVerify: string) => {
    let cleanedId = idToVerify.trim().toLowerCase();
    
    // Automatically parse URLs to support scanning from phone cameras
    if (cleanedId.includes('/') || cleanedId.startsWith('http://') || cleanedId.startsWith('https://')) {
      try {
        const urlSegments = cleanedId.split('/').filter(Boolean);
        if (urlSegments.length > 0) {
          cleanedId = urlSegments[urlSegments.length - 1]; 
        }
      } catch (err) {
        console.error("URL parsing fallback failed:", err);
      }
    }
    
    const matchedAppointment = incomingAppointments.find(
      app => app.ticketId.toLowerCase() === cleanedId || app.id.toLowerCase() === cleanedId
    );

    if (matchedAppointment) {
      // Open the validation popup containing details of the appointment
      setScannedResult(matchedAppointment);
      setShowScannerInput(false);
    } else {
      alert(`❌ FRAUD DETECTED:\nNo appointment registered for: "${cleanedId}"`);
    }
  };

  // Triggers the deletion of the verified appointment once reviewed
  const handleCompleteVerifiedAppointment = async (appointment: LiveAppointment) => {
    // 1. Instantly drop item from local UI array state
    setIncomingAppointments(prev => prev.filter(item => item.id !== appointment.id));
    setScannedResult(null); // Close detail modal
    showToast("Cleared! Appointment processed and verified.");

    // 2. Perform backend targeted database removal using the exact path
    try {
      await deleteDoc(doc(db, appointment.path));
      alert(`🔒 CONFIRMED:\nTicket ID "${appointment.ticketId}" has been verified. Record successfully cleared from the database.`);
    } catch (err) {
      console.error("Error deleting document:", err);
      alert("⚠️ Local view cleared, but failed to remove from database. Please verify connections.");
    }
  };

  // Day Categorizer Engine
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
      const dateMillis = booking.createdAt.seconds 
        ? booking.createdAt.seconds * 1000 
        : new Date(booking.createdAt).getTime();
      
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

    // 🌟 Sort each category so that the newest appointments appear at the top
    Object.keys(categories).forEach(key => {
      categories[key].sort((a, b) => {
        const timeA = a.createdAt?.seconds 
          ? a.createdAt.seconds * 1000 
          : a.createdAt 
            ? new Date(a.createdAt).getTime() 
            : Date.now(); 

        const timeB = b.createdAt?.seconds 
          ? b.createdAt.seconds * 1000 
          : b.createdAt 
            ? new Date(b.createdAt).getTime() 
            : Date.now();

        return timeB - timeA; 
      });
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
  
  const [isSettingUpStripe, setIsSettingUpStripe] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);

  const handleConnectStripe = async () => {
    setIsSettingUpStripe(true);
    try {
      const functions = getFunctions();
      
      // 1. Create the Stripe Connect Account
      const createAccount = httpsCallable(functions, 'createBusinessStripeAccount');
      const accountRes: any = await createAccount({ 
        email: auth.currentUser?.email || "", 
        businessId: uid, 
        merchantType: "salon" 
      });
      
      const { stripeAccountId } = accountRes.data;

      // 2. Generate the Onboarding Link
      const createLink = httpsCallable(functions, 'createStripeOnboardingLink');
      const linkRes: any = await createLink({ stripeAccountId });
      
      if (linkRes.data?.url) {
        window.location.href = linkRes.data.url;
      } else {
        alert("Failed to get onboarding link.");
      }
    } catch (err: any) {
      console.error(err);
      alert(`Stripe Connection Error: ${err.message}`);
    } finally {
      setIsSettingUpStripe(false);
    }
  };

  const handleCheckStripeStatus = async () => {
    if (!salon?.stripeAccountId) return;
    setStripeLoading(true);
    try {
      const functions = getFunctions();
      const checkStatus = httpsCallable(functions, 'checkStripeAccount');
      await checkStatus({
        stripeAccountId: salon.stripeAccountId,
        businessId: uid,
        merchantType: "salon"
      });
      alert("Stripe account status updated successfully!");
    } catch (err: any) {
      console.error(err);
      alert(`Failed to check status: ${err.message}`);
    } finally {
      setStripeLoading(false);
    }
  };

  const handleWithdrawProfit = () => {
    // 🟢 Require that they have liquid available funds to trigger the payout flow
    if (!stripeBalance || stripeBalance.available <= 0) {
      alert("You do not have any liquid funds ready to withdraw yet. Check your 'Pending Clearance' balance.");
      return;
    }
    
    if (salon.hasPinConfigured === false) { // For Food.tsx use: restaurant.hasPinConfigured
      setSetupPin('');
      setConfirmSetupPin('');
      setIsPinSetupModalOpen(true);
      return;
    }

    setPinInput(''); 
    setIsPinModalOpen(true);
  };

  const handleConfirmPayout = async () => {
    // 🟢 Fix 1: Check against the live custom hook balance
    if (!balance || balance <= 0) {
      alert("No balance available to withdraw.");
      setIsPinModalOpen(false);
      return;
    }

    if (pinInput.length !== 4 || isNaN(Number(pinInput))) {
      alert("Invalid PIN format. Must be a 4-digit number.");
      return;
    }

    setIsProcessingPayout(true);
    showToast("Processing security clearing... Please wait.");

    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions();
      const requestPayout = httpsCallable(functions, 'requestPayout');

      const response: any = await requestPayout({
        amount: balance, // 🟢 Fix 2: Send the real live balance to the backend!
        pin: pinInput,
        merchantType: "salon" 
      });

      if (response.data?.success) {
        alert(`🎉 Success! ${response.data.message}`);
        setIsPinModalOpen(false);
        // Resetting balance locally
        setStripeBalance(prev => ({ ...prev, available: 0, total: prev.pending }));
      }
    } catch (error: any) {
      console.error("Payout initiation failed:", error);
      
      if (error.message?.includes("incomplete") || error.message?.includes("not found")) {
        setIsPinModalOpen(false);
        setSetupPin('');
        setConfirmSetupPin('');
        setIsPinSetupModalOpen(true);
      } else {
        alert(`❌ Withdrawal Failed:\n${error.message || "Internal server settlement error."}`);
      }
    } finally {
      setIsProcessingPayout(false);
      setPinInput(''); 
    }
  };
  
  useEffect(() => {
    const fetchBalance = async () => {
      if (!auth.currentUser) return;
      setIsFetchingBalance(true);
      try {
        const functions = getFunctions();
        const getStripeAccountBalance = httpsCallable(functions, 'getStripeAccountBalance');
        const response = await getStripeAccountBalance({ merchantType: 'salon' });
        const data = response.data as any;
        setStripeBalance({
          available: data.availableBalance || 0,
          pending: data.pendingBalance || 0,
          total: data.totalBalance || 0
        });
      } catch (error) {
        console.error("Failed to retrieve live balance from Stripe:", error);
      } finally {
        setIsFetchingBalance(false);
      }
    };

    fetchBalance();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) return;
    setIsSaving(true);
    try {
      // 1. Get GPS coordinates automatically from the address typed in
      const coords = await geocodeAddress(formAddress);

      // 2. Save settings and auto-populated coordinates to Firestore
      await setDoc(doc(db, "salons", uid), {
        salonName: formName,
        bio: formBio,
        address: formAddress,
        openingTime: formOpening,
        closingTime: formClosing,
        offDays: formOffDays,
        appointmentLimit: formLimit,
        latitude: coords ? coords.latitude : 0,   // Auto-populated GPS Latitude!
        longitude: coords ? coords.longitude : 0, // Auto-populated GPS Longitude!
        updatedAt: serverTimestamp()
      }, { merge: true });

      showToast("Settings updated successfully!");
      setHasChanges(false);
      setIsModalOpen(false);
    } catch (error) { 
      console.error("Error updating settings:", error);
      showToast("Error updating settings."); 
    }
    finally { 
      setIsSaving(false); 
    }
  };

  if (loading || !salon) {
    return (
      <div className={styles.dashboardContainer} style={{ background: "#050505", minHeight: "100vh", width: "100vw" }}>
        <div style={{ height: "60px", background: "#0c0c0c" }}></div>
        <div style={{ padding: "40px" }}></div>
      </div>
    );
  }

  // AFTER:
  if (isBanned) {
    return <Banned userBrand={brandStatusData} />;
  }

  if (isSuspended) {
    return <Suspended userBrand={brandStatusData} />;
  }
  
  if (page === 'catalogue') { 
    return <SalonStation onBack={() => setPage('dashboard')}/>;
  }

  return (
    <div className={styles.dashboardContainer} style={{ background: "#050505", minHeight: "100%", color: "#fff", fontFamily: "sans-serif", width: "100%", display: "flex", flexDirection: "column", boxSizing: "border-box", overflowX: "hidden" }}>
      {toast && <div className={styles.toast}>{toast}</div>}

      {/* HEADER */}
      <header className={styles.header} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 32px", background: "#0c0c0c", borderBottom: "1px solid #1a1a1a", width: "100%", boxSizing: "border-box" }}>
        <button className={styles.iconButton} onClick={() => setIsDrawerOpen(true)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <button 
            title="Scan Verification Ticket"
            onClick={() => setShowScannerInput(!showScannerInput)} 
            style={{ background: "none", border: "none", color: showScannerInput ? "#E53935" : "#aaa", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}
          >
            <QrCode size={22} />
          </button>
          
          <button className={styles.iconButton} onClick={() => setIsModalOpen(true)} style={{ background: "none", border: "none", color: "#aaa", cursor: "pointer", padding: 0 }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          </button>
        </div>
      </header>

      {/* SCANNER PANEL */}
      {showScannerInput && (
        <ConfirmQRScanner 
          onCrosscheck={handleVerifyTicketId} 
          onClose={() => setShowScannerInput(false)} 
        />
      )}

      {/* LAYOUT CONTENT WRAPPER */}
      <main className={styles.mainContent} style={{ padding: "32px", width: "100%", boxSizing: "border-box", flex: 1 }}>
        
        {/* HERO BANNER BLOCK */}
        <div className={styles.heroGlassCard} style={{ background: "#0c0c0c", border: "1px solid #1a1a1a", padding: "32px", borderRadius: "24px", marginBottom: "32px", width: "100%", boxSizing: "border-box" }}>
          <h1 className={styles.salonTitle} style={{ margin: "0 0 8px 0", fontSize: "32px", fontWeight: 900 }}>{salon.salonName}{isVerified && <VerifiedBadge />}</h1>
          <p className={styles.salonBio} style={{ color: "#888", margin: "0 0 16px 0", fontSize: "14px", lineHeight: "1.5" }}>{salon.bio}</p>
          <div className={styles.salonAddressBlock} style={{ color: "#aaa", fontSize: "13px", display: "flex", alignItems: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px', flexShrink: 0 }}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            <span>{salon.address}</span>
          </div>
        </div>

        {/* CHRONOLOGICAL GROUPS RENDER PANEL */}
        <div style={{ marginTop: "32px", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "24px" }}>
            <Bell size={18} color="#E53935" style={{ animation: "pulse 2s infinite", flexShrink: 0 }} />
            <h2 style={{ fontSize: "13px", fontWeight: 900, textTransform: "uppercase", letterSpacing: "1.5px", color: "#aaa", margin: 0 }}>Live Active Queue</h2>
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
                <div key={groupName} style={{ marginBottom: "32px", width: "100%" }}>
                  <h3 style={{ fontSize: "12px", color: "#E53935", background: "rgba(229,57,53,0.08)", display: "inline-block", padding: "6px 14px", borderRadius: "8px", marginBottom: "16px", fontWeight: "bold", letterSpacing: "0.5px", textTransform: "uppercase" }}>
                    {groupName} — {items.length} {items.length === 1 ? 'Order' : 'Orders'}
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
                          padding: "18px 24px", 
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

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "28px", flexWrap: "wrap", width: "auto", marginLeft: "auto" }}>
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

      {/* APPOINTMENT DETAILS OVERLAY */}
      {scannedResult && (
        <div className={styles.modalOverlay} style={{ zIndex: 4000, padding: '20px', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.85)' }}>
          <div className={styles.modalContent} style={{ width: '100%', maxWidth: '420px', borderRadius: '24px', padding: '28px', border: '1px solid #333', textAlign: 'left', background: '#0e0e0e', boxSizing: 'border-box' }}>
            
            <div style={{ display: 'flex', flexWrap: 'nowrap', alignItems: 'center', gap: '10px', marginBottom: '18px', borderBottom: '1px solid #222', paddingBottom: '16px' }}>
              <CheckCircle size={26} color="#4BB543" style={{ flexShrink: 0 }} />
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#fff' }}>Ticket Verified Successfully</h3>
                <span style={{ fontSize: '12px', color: '#888' }}>Authentication & payment checked safely</span>
              </div>
            </div>

            <div style={{ background: '#141414', padding: '16px', borderRadius: '16px', border: '1px solid #1e1e1e', display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#666', display: 'block', fontWeight: 'bold' }}>Ticket Reference</span>
                <span style={{ fontSize: '16px', color: '#fff', fontWeight: 900 }}>{scannedResult.ticketId}</span>
              </div>

              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#666', display: 'block', fontWeight: 'bold' }}>Assigned Stylist</span>
                <span style={{ fontSize: '14px', color: '#ddd', fontWeight: 'bold' }}>{scannedResult.stylist}</span>
              </div>

              <div>
                <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#666', display: 'block', fontWeight: 'bold', marginBottom: '6px' }}>Selected Treatment Services</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {scannedResult.services.map((svc, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#aaa' }}>• {svc.serviceName || svc.name}</span>
                      <span style={{ color: '#4BB543', fontWeight: 'bold' }}>{currency}{svc.price}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #222', paddingTop: '12px', marginTop: '6px' }}>
                <div>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#666', display: 'block' }}>Total Paid</span>
                  <span style={{ fontSize: '18px', color: '#4BB543', fontWeight: 900 }}>{currency}{scannedResult.totalPaid.toFixed(2)}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '11px', textTransform: 'uppercase', color: '#666', display: 'block' }}>Est. Duration</span>
                  <span style={{ fontSize: '16px', color: '#fff', fontWeight: 'bold' }}>{scannedResult.duration} mins</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                className={styles.glassButtonSecondary} 
                onClick={() => setScannedResult(null)} 
                style={{ flex: 1, padding: '12px', borderRadius: '12px', fontSize: '13px', cursor: 'pointer', background: 'transparent', border: '1px solid #333', color: '#fff' }}
              >
                Keep in Queue
              </button>
              <button 
                className={styles.glassButtonPrimary} 
                onClick={() => handleCompleteVerifiedAppointment(scannedResult)} 
                style={{ flex: 2, padding: '12px', borderRadius: '12px', background: '#E53935', color: '#fff', border: 'none', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}
              >
                Accept & Dismiss Row
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DRAWER */}
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

      {/* SETTINGS MODAL */}
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
                
                {/* Stripe Connector Sub-section */}
                <div className={styles.card} style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #222' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#fff' }}>Direct Credit Card Payments</h4>

                  {!((salon as any)?.stripeOnboarded) ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <p style={{ fontSize: '12px', fontWeight: '600', color: '#666', lineHeight: '1.5' }}>
                        Connect your Stripe Account to receive card payments directly from clients and view your live balance.
                      </p>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <button 
                          type="button" 
                          onClick={handleConnectStripe} 
                          disabled={isSettingUpStripe} 
                          style={{
                            width: '100%',
                            padding: '12px',
                            backgroundColor: '#635BFF',
                            color: 'white',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '900',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          {isSettingUpStripe ? "Connecting..." : "Link Stripe Account"}
                        </button>

                        {/* VERIFY CONNECTION BUTTON FOR UNONBOARDED ACCOUNTS */}
                        {(salon as any)?.stripeAccountId && (
                          <button 
                            type="button" 
                            onClick={handleCheckStripeStatus} 
                            disabled={stripeLoading} 
                            style={{
                              width: '100%',
                              padding: '10px',
                              border: '2.5px solid black',
                              backgroundColor: 'white',
                              color: 'black',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '900',
                              textTransform: 'uppercase',
                              cursor: 'pointer'
                            }}
                          >
                            {stripeLoading ? "Verifying Setup..." : "Verify Connection Status"}
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* Total Sales Balance Metric Block */}
                      <div 
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          backgroundColor: '#111', 
                          padding: '14px 16px',
                          border: '1px solid #222',
                          borderRadius: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', color: '#aaa', letterSpacing: '0.05em' }}>
                            Total Wallet Balance
                          </span>
                        </div>
                        <span style={{ fontFamily: 'monospace', fontWeight: '900', fontSize: '18px', color: '#fff' }}>
                          {balance !== null ? `${currency.toUpperCase()} ${balance.toFixed(2)}` : "Loading..."}
                        </span>
                      </div>

                      {/* Liquid and Pending Breakdown Section */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '12px', border: '1px solid #1a1a1a' }}>
                        {/* 1. Liquid Liquid Available Balance */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#22c55e', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '6px', height: '6px', background: '#22c55e', borderRadius: '50%' }}></span>
                            Available to Withdraw:
                          </span>
                          <span style={{ fontWeight: '700', color: '#22c55e', fontSize: '13px', fontFamily: 'monospace' }}>
                            {currency.toUpperCase()} {(stripeBalance?.available || 0).toFixed(2)}
                          </span>
                        </div>

                        {/* 2. Pending Clearance Settlement Pool */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '4px', borderTop: '1px solid #222' }}>
                          <span style={{ color: '#eab308', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '6px', height: '6px', background: '#eab308', borderRadius: '50%' }}></span>
                            Pending Clearance:
                          </span>
                          <span style={{ fontWeight: '700', color: '#eab308', fontSize: '13px', fontFamily: 'monospace' }}>
                            {currency.toUpperCase()} {(stripeBalance?.pending || 0).toFixed(2)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Footnote explanation text container regarding clearance windows */}
                      <p style={{ fontSize: '11px', color: '#555', lineHeight: '1.4', margin: '4px 0 0 0', textAlign: 'left' }}>
                        ℹ️ Standard card clearing requires 1–3 business days. Pending funds automatically transfer into your available balance pool upon verification settlement.
                      </p>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                  <button 
                    type="button" 
                    className={styles.glassButtonPrimary} 
                    onClick={handleWithdrawProfit}
                    style={{ width: '100%' }}
                  >
                    Withdraw Available Profit
                  </button>
                </div>
              </div>
              {/* ACCOUNT, DATA & SECURITY ACTIONS */}
              <div className={styles.glassCard}>
                <h3>Account & Security Actions</h3>
                <p style={{ color: '#888', fontSize: '12px', marginBottom: '16px', lineHeight: '1.4' }}>
                  Manage session security, export salon data logs, or permanently delete your account.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* LOGOUT BUTTON */}
                  <button
                    type="button"
                    onClick={() => {
                      signOut(auth);
                      navigate('/login');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px',
                      borderRadius: '12px',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      background: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <LogOut size={16} />
                    <span>Log Out of Session</span>
                  </button>

                  {/* DOWNLOAD DATA BUTTON */}
                  <button
                    type="button"
                    onClick={handleDownloadData}
                    disabled={isDownloading}
                    className={styles.glassButtonSecondary}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px',
                      borderRadius: '12px',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    {isDownloading ? (
                      <Loader2 size={16} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
                    ) : (
                      <Download size={16} />
                    )}
                    <span>{isDownloading ? "Exporting Data..." : "Download My Data (JSON)"}</span>
                  </button>

                  {/* DELETE ACCOUNT BUTTON */}
                  <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      padding: '12px',
                      borderRadius: '12px',
                      fontSize: '13px',
                      fontWeight: 'bold',
                      background: 'rgba(229, 57, 53, 0.12)',
                      border: '1px solid rgba(229, 57, 53, 0.4)',
                      color: '#E53935',
                      cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={16} />
                    <span>Delete Account & Data</span>
                  </button>
                </div>
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

      {/* RESET PIN */}
      {isForgotPinOpen && (
        <div className={styles.modalOverlay} style={{ zIndex: 3000 }}>
          <div className={styles.modalContent} style={{ maxWidth: '380px', textAlign: 'center' }}>
            <h3>Reset Security PIN</h3>
            <p style={{ color: '#aaa', fontSize: '13px' }}>We sent a secure validation token to your registered merchant email. Enter it below to wipe and replace your current PIN.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: '20px 0' }}>
              <div>
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: '#666', display: 'block', marginBottom: '6px' }}>6-Digit Email Code</label>
                <input 
                  type="text" 
                  maxLength={6}
                  placeholder="000000"
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value.replace(/\D/g, ''))}
                  style={{ background: '#111', color: '#fff', border: '1px solid #222', padding: '10px', borderRadius: '8px', width: '140px', fontSize: '18px', textAlign: 'center', letterSpacing: '2px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: '#666', display: 'block', marginBottom: '6px' }}>Define New 4-Digit PIN</label>
                <input 
                  type="password" 
                  maxLength={4}
                  placeholder="••••"
                  value={newPin}
                  onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                  style={{ background: '#111', color: '#fff', border: '1px solid #222', padding: '10px', borderRadius: '8px', width: '110px', fontSize: '18px', textAlign: 'center', letterSpacing: '4px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className={styles.glassButtonSecondary} onClick={() => setIsForgotPinOpen(false)} style={{ flex: 1 }}>Cancel</button>
              <button className={styles.glassButtonPrimary} onClick={handleConfirmNewPin} style={{ flex: 1 }}>Reset PIN</button>
            </div>
          </div>
        </div>
      )}

      {/* WITHDRAW PIN AUTH */}
      {/* WITHDRAW PIN AUTH */}
      {isPinModalOpen && (
        <div className={styles.modalOverlay} style={{ zIndex: 2000 }}>
          <div className={styles.modalContent} style={{ maxWidth: '360px', textAlign: 'center' }}>
            <h3>Authorize Payout</h3>
            <p style={{ color: '#aaa', fontSize: '14px' }}>
              {/* 🟢 Inform them exactly how much liquid available money is moving */}
              Enter your 4-digit security PIN to withdraw {currency}{(stripeBalance?.available || 0).toFixed(2)}
            </p>
            <input 
              type="password" 
              maxLength={4}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ''))}
              style={{ background: '#111', color: '#fff', border: '1px solid #222', padding: '12px', borderRadius: '8px', width: '100px', fontSize: '20px', letterSpacing: '6px', textAlign: 'center', margin: '16px 0' }}
              disabled={isProcessingPayout}
            />

            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
              <button 
                className={styles.glassButtonSecondary} 
                onClick={() => setIsPinModalOpen(false)}
                disabled={isProcessingPayout}
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button 
                className={styles.glassButtonPrimary} 
                onClick={handleConfirmPayout}
                disabled={isProcessingPayout || pinInput.length !== 4}
                style={{ flex: 1 }}
              >
                {isProcessingPayout ? "Verifying..." : "Confirm"}
              </button>
              <button 
                type="button" 
                onClick={handleForgotPinRequest}
                style={{ background: 'none', border: 'none', color: '#E53935', fontSize: '11px', cursor: 'pointer', marginTop: '8px', textDecoration: 'underline' }}
              >
                Forgot PIN?
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIN SETUP OVERLAY */}
      {isPinSetupModalOpen && (
        <div className={styles.modalOverlay} style={{ zIndex: 2700 }}>
          <div className={styles.modalContent} style={{ maxWidth: '380px', textAlign: 'center' }}>
            <h3>Initialize Security PIN</h3>
            <p style={{ color: '#aaa', fontSize: '13px' }}>You haven't configured a secure PIN yet. Setup a numeric 4-digit PIN to secure future withdrawals.</p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', margin: '20px 0', alignItems: 'center' }}>
              <div>
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: '#666', display: 'block', marginBottom: '6px' }}>Choose PIN</label>
                <input 
                  type="password" 
                  maxLength={4}
                  placeholder="••••"
                  value={setupPin}
                  disabled={isRegisteringPin}
                  onChange={(e) => setSetupPin(e.target.value.replace(/\D/g, ''))}
                  style={{ background: '#111', color: '#fff', border: '1px solid #222', padding: '10px', borderRadius: '8px', width: '110px', fontSize: '18px', textAlign: 'center', letterSpacing: '4px' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '11px', textTransform: 'uppercase', color: '#666', display: 'block', marginBottom: '6px' }}>Confirm PIN</label>
                <input 
                  type="password" 
                  maxLength={4}
                  placeholder="••••"
                  value={confirmSetupPin}
                  disabled={isRegisteringPin}
                  onChange={(e) => setConfirmSetupPin(e.target.value.replace(/\D/g, ''))}
                  style={{ background: '#111', color: '#fff', border: '1px solid #222', padding: '10px', borderRadius: '8px', width: '110px', fontSize: '18px', textAlign: 'center', letterSpacing: '4px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button className={styles.glassButtonSecondary} disabled={isRegisteringPin} onClick={() => setIsPinSetupModalOpen(false)} style={{ flex: 1 }}>Cancel</button>
              <button 
                className={styles.glassButtonPrimary} 
                disabled={isRegisteringPin || setupPin.length !== 4 || setupPin !== confirmSetupPin} 
                onClick={handleRegisterSetupPin} 
                style={{ flex: 1 }}
              >
                {isRegisteringPin ? "Saving..." : "Set PIN"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>

      {/* DELETE ACCOUNT CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <div className={styles.modalOverlay} style={{ zIndex: 3500, background: 'rgba(0,0,0,0.85)' }}>
          <div className={styles.modalContent} style={{ maxWidth: '380px', textAlign: 'center', background: '#0e0e0e', border: '1px solid #333', borderRadius: '24px', padding: '24px' }}>
            <div style={{ width: '48px', height: '48px', background: 'rgba(229,57,53,0.15)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#E53935' }}>
              <Trash2 size={24} />
            </div>

            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 900, color: '#fff' }}>Delete Account?</h3>
            <p style={{ color: '#aaa', fontSize: '12px', lineHeight: '1.5', marginBottom: '20px' }}>
              Are you sure you want to permanently delete your salon account and data? This action is <strong style={{ color: '#fff' }}>irreversible</strong>.
            </p>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                className={styles.glassButtonSecondary}
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                style={{ flex: 1, padding: '12px', borderRadius: '12px', fontSize: '13px' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccountAndData}
                disabled={isDeleting}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  background: '#E53935',
                  color: '#fff',
                  border: 'none',
                  fontWeight: 'bold',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                {isDeleting && <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />}
                <span>{isDeleting ? "Deleting..." : "Confirm Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}