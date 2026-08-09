import React, { useState, useEffect } from 'react';
import { shareContent, canOpenShareSheet, copyToClipboard } from '../../services/share';
import { buildVinLink, publicOrigin, storeOrigin } from '../../services/vinLink';
import { firestore as db, auth } from '../../firebase';
import { getAuth, onAuthStateChanged, signOut, deleteUser  } from 'firebase/auth';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  serverTimestamp, 
  Timestamp,
  collection,
  query,
  where,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import QRCode from 'qrcode';
import RestaurantCatalogue from './OrderStoreCatalogue';
import { getDatabase, ref, onValue } from "firebase/database";
import { useRef } from "react";
import { useBusinessWallet } from "../../hooks/useBusinessWallet";
import styles from '../appointment/salonDashboard.module.css';
import ConfirmQRScanner from '../addons/ConfirmQRScanner';
import {
  Download, Trash2, Loader2, MoreHorizontal, ShoppingBag,
  UtensilsCrossed, Package, ChevronDown, ChevronRight,
  Clock, X, Plus, Check, ScanLine
} from 'lucide-react';
import { geocodeAddress } from '../../utils/geocoding';
import Banned from "../addons/Banned";
import Suspended from "../addons/Suspended";
import IntakeLimitBanner from "../addons/IntakeLimitBanner";
import { TranslateControl } from "../addons/TranslateControl";
import { useAccountStanding } from "../../hooks/useAccountStanding";
import {
  evaluateIntakeLimit,
  syncIntakeLimitState,
  formatCooldownRemaining,
  FREE_TIER_INTAKE_LIMIT,
} from "../../utils/businessLimits";

// --- Design tokens for the light "momo" style shell ---
const C = {
  bg: '#F5F6F8',
  card: '#FFFFFF',
  border: '#ECEDF0',
  text: '#0F172A',
  textMuted: '#6B7280',
  green: '#16A34A',
  greenDark: '#0B3B22',
  greenLight: '#DCFCE7',
  greenPale: '#84CC16',
  orange: '#D97706',
  orangeLight: '#FEF3C7',
  blue: '#2563EB',
  blueLight: '#DBEAFE',
  gray: '#6B7280',
  grayLight: '#EEF0F2',
  red: '#DC2626',
  redLight: '#FEE2E2',
  shadow: '0 1px 2px rgba(16,24,40,0.04), 0 8px 24px rgba(16,24,40,0.05)',
};

// --- Type Definitions ---
interface RestaurantData {
  brandName: string;
  brandBio: string;
  address?: string; 
  openingTime: string;
  closingTime: string;
  shareLink: string;
  vinLink?: string;
  walletBalance?: number;
  onlineStatus: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
  orderLimitReached?: boolean;
  cooldownExpiresAt?: string | null;
  hasPinConfigured?: boolean;
}
interface IncomingOrder {
  id: string;
  customerName: string;
  pickupTime: string;
  status: string;
  fourDigitCode?: string;
  userMobilityStatus?: string; 
  tableNumber?: string;        
  items: {
    name: string;
    quantity: number;
    price: number;
  }[];
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

// Simple, soft "open box" illustration for the empty state — mirrors the
// reference design's caught-up moment without needing an image asset.
const EmptyBoxIllustration = () => (
  <svg width="140" height="120" viewBox="0 0 140 120" fill="none">
    <g opacity="0.7">
      <path d="M62 24 L60 36" stroke="#86EFAC" strokeWidth="3" strokeLinecap="round" />
      <path d="M70 20 L70 34" stroke="#86EFAC" strokeWidth="3" strokeLinecap="round" />
      <path d="M78 24 L80 36" stroke="#86EFAC" strokeWidth="3" strokeLinecap="round" />
    </g>
    <path d="M25 58 L70 42 L115 58 L115 60 L70 76 L25 60 Z" fill="#EAF6EC" stroke="#DCEFDF" strokeWidth="1.5" />
    <path d="M25 58 L70 76 L70 108 L25 92 Z" fill="#F4F9F4" stroke="#E4EFE5" strokeWidth="1.5" />
    <path d="M115 58 L70 76 L70 108 L115 92 Z" fill="#DCEFDF" stroke="#CFE6D3" strokeWidth="1.5" />
    <path d="M40 52 L70 63 L70 42 L52 36 Z" fill="#FFFFFF" stroke="#E4EFE5" strokeWidth="1.5" />
    <path d="M100 52 L70 63 L70 42 L88 36 Z" fill="#FBFDFB" stroke="#E4EFE5" strokeWidth="1.5" />
  </svg>
);

export default function FoodDashboard() {
  // --- Auth State ---
  const [uid, setUid] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // --- Core Profile State ---
  const [loading, setLoading] = useState<boolean>(true);
  const [profile, setProfile] = useState<RestaurantData | null>(null);
  const rtdb = getDatabase();
  
  // UI States
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [showAcceptedModal, setShowAcceptedModal] = useState<boolean>(false);
  // Which bucket of the segmented control is showing under "Orders"
  const [orderSubTab, setOrderSubTab] = useState<'incoming' | 'accepted' | 'completed'>('incoming');
  
  // --- New Premium Modal State ---
  const [showPremiumPopup, setShowPremiumPopup] = useState<boolean>(false);
  // Find this line in Food.tsx and update it:
  const { balance, currency, stripeBalance } = useBusinessWallet({ merchantType: "food" });


  const [isBanned, setIsBanned] = useState<boolean>(false);
  const [isSuspended, setIsSuspended] = useState<boolean>(false);
  const [suspendedReason, setSuspendedReason] = useState<string>('');
  // Editable Form State
  const [formBrandName, setFormBrandName] = useState<string>('');
  const [formBrandBio, setFormBrandBio] = useState<string>('');
  const [formAddress, setFormAddress] = useState<string>(''); 
  const [formOpeningTime, setFormOpeningTime] = useState<string>('');
  const [formClosingTime, setFormClosingTime] = useState<string>('');

  const catalogueCount = ""; 
  const [page, setPage] = useState<'dashboard' | 'catalogue'>('dashboard');

  const [cooldownCountdown, setCooldownCountdown] = useState<string | null>(null);

  const [incomingOrders, setIncomingOrders] = useState<IncomingOrder[]>([]);
  const [orderQrCodes, setOrderQrCodes] = useState<Record<string, string>>({});
  const previousOrderCount = useRef(0);

  const showToast = (msg: string) => console.log(`[Toast Notification]: ${msg}`);

  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [isProcessingPayout, setIsProcessingPayout] = useState(false);
  const [isPinSetupModalOpen, setIsPinSetupModalOpen] = useState(false);
  const [isForgotPinOpen, setIsForgotPinOpen] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [newPin, setNewPin] = useState('');


  // --- Data Management & Account Erasure States ---
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [brandStatusData, setBrandStatusData] = useState<any>(null);

  // First-Time Pin Setup States
  const [setupPin, setSetupPin] = useState('');
  const [confirmSetupPin, setConfirmSetupPin] = useState('');
  const [isRegisteringPin, setIsRegisteringPin] = useState(false);
  const handleForgotPinRequest = async () => {
    try {
      // 🟢 Cleaned up inline imports to use the global functions import
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

  // --- Download Restaurant Data ---
  const handleDownloadData = async () => {
    if (!uid) return;
    setIsDownloading(true);
    try {
      const docRef = doc(db, 'restaurantprofile', uid);
      const docSnap = await getDoc(docRef);
      const profileData = docSnap.exists() ? docSnap.data() : {};

      const exportPayload = {
        account: {
          uid,
          email,
          ...profileData
        },
        incomingOrders,
        exportedAt: new Date().toISOString()
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `restaurant-data-${uid}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      showToast("Data exported successfully!");
    } catch (err) {
      console.error("Download failed:", err);
      alert("Failed to export store data.");
    } finally {
      setIsDownloading(false);
    }
  };

  

  // --- Delete Account & Store Data ---
  const handleDeleteAccountAndData = async () => {
    if (!uid) return;
    setIsDeleting(true);
    try {
      // 1. Delete Stripe Connect Account if one exists
      if ((profile as any)?.stripeAccountId) {
        try {
          const functions = getFunctions();
          const deleteStripeAcc = httpsCallable(functions, 'deleteStripeAccount');
          await deleteStripeAcc({ stripeAccountId: (profile as any).stripeAccountId });
        } catch (stripeErr) {
          console.error("Failed to delete Stripe account:", stripeErr);
        }
      }

      // 2. Delete Firestore Document
      await deleteDoc(doc(db, 'restaurantprofile', uid));

      // 3. Delete Auth Account
      const auth = getAuth();
      if (auth.currentUser) {
        await deleteUser(auth.currentUser);
      }

      alert("Account and store data permanently deleted.");
      window.location.href = '/login';
    } catch (err: any) {
      console.error("Delete failed:", err);
      if (err?.code === 'auth/requires-recent-login') {
        alert("Re-authentication required. Please log out and log back in to delete your account.");
      } else {
        alert("Failed to delete store data completely.");
      }
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  // 🛠️ Verifies email code and overwrites with the new PIN
  const handleConfirmNewPin = async () => {
    if (newPin.length !== 4 || resetCode.length !== 6) {
      alert("Please enter a 6-digit email code and a new 4-digit PIN.");
      return;
    }

    try {
      // 🟢 Cleaned up inline imports to use the global functions import
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
    alert("Registering your secure PIN...");

    try {
      // 🟢 Cleaned up inline imports to use the global functions import
      const setupPinFn = httpsCallable(getFunctions(), 'initializeMerchantPin');

      await setupPinFn({
        pin: setupPin,
        merchantType: "food"
      });

      alert("🎉 Security PIN successfully established! You can now withdraw funds securely.");
      
      if (profile) setProfile({ ...profile, hasPinConfigured: true });
      
      setIsPinSetupModalOpen(false);
    } catch (error: any) {
      alert(`Setup Failed: ${error.message}`);
    } finally {
      setIsRegisteringPin(false);
      setSetupPin('');
      setConfirmSetupPin('');
    }
  };

  const handleWithdrawProfit = () => {
    // 🟢 Fix: Validate against the actual available liquid balance tracking value
    if (stripeBalance && typeof stripeBalance.available === 'number' && stripeBalance.available <= 0) {
      alert("You do not have any liquid funds ready to withdraw yet. Check your 'Pending Clearance' balance.");
      return;
    }
    
    // Fallback: If stripeBalance fields aren't active yet but total balance is tracked, prevent accidental 0 calls
    if (!balance || balance <= 0) {
      alert("No profits available to withdraw.");
      return;
    }
    
    if (profile?.hasPinConfigured === false) {
      setSetupPin('');
      setConfirmSetupPin('');
      setIsPinSetupModalOpen(true);
      return;
    }

    setPinInput(''); 
    setIsPinModalOpen(true);
  };

  const handleConfirmPayout = async () => {
    // 🟢 Use the live available liquid balance if it exists, otherwise use the verified balance block
    const withdrawalAmount = (stripeBalance && stripeBalance.available > 0) ? stripeBalance.available : balance;

    if (!withdrawalAmount || withdrawalAmount <= 0) {
      alert("No balance available to withdraw.");
      setIsPinModalOpen(false);
      return;
    }

    if (pinInput.length !== 4 || isNaN(Number(pinInput))) {
      alert("Invalid PIN format. Must be a 4-digit number.");
      return;
    }

    setIsProcessingPayout(true);
    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions();
      const requestPayout = httpsCallable(functions, 'requestPayout');

      const response: any = await requestPayout({
        amount: withdrawalAmount, // 🟢 Send the calculated active amount value context
        pin: pinInput,
        merchantType: "food" 
      });

      if (response.data?.success) {
        alert(`🎉 Success! ${response.data.message}`);
        setIsPinModalOpen(false);
      }
    } catch (error: any) {
      alert(`❌ Withdrawal Failed:\n${error.message || "Internal server settlement error."}`);
    } finally {
      setIsProcessingPayout(false);
      setPinInput(''); 
    }
  };

  const [isSettingUpStripe, setIsSettingUpStripe] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);

  const handleConnectStripe = async () => {
    setIsSettingUpStripe(true);
    try {
      const functions = getFunctions();
      
      // 1. Correctly initialize the callable Cloud Function:
      const createAccount = httpsCallable(functions, 'createBusinessStripeAccount');
      
      const accountRes: any = await createAccount({ 
        email: auth.currentUser?.email || "", 
        businessId: uid,
        merchantType: "food"
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
    if (!(profile as any)?.stripeAccountId) return;
    setStripeLoading(true);
    try {
      const functions = getFunctions();
      const checkStatus = httpsCallable(functions, 'checkStripeAccount');
      await checkStatus({
        stripeAccountId: (profile as any).stripeAccountId,
        businessId: uid,
        merchantType: "food"
      });
      alert("Stripe account status updated successfully!");
    } catch (err: any) {
      console.error(err);
      alert(`Failed to check status: ${err.message}`);
    } finally {
      setStripeLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
        const auth = getAuth();
        await signOut(auth);
        window.location.href = '/login'; 
    } catch (err) {
        console.error("Logout failed:", err);
    }
  };

  const [isVerified, setIsVerified] = useState(false);
  // Premium half of the exemption. isVerified above is still read from this
  // component's own RTDB listener (it also drives the name badge); this adds
  // the paid-tier half, which the cap now requires as well.
  const { isPremium } = useAccountStanding(uid);
  const [cooldownLabel, setCooldownLabel] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState({
        totalOrders: 0,
        acceptedOrders: 0,
        rejectedOrders: 0,
        mostAcceptedItem: "N/A",
        mostAcceptedCount: 0,
        mostRejectedItem: "N/A",
        mostRejectedCount: 0,
  });

  const handleDownloadQR = () => {
    if (!qrCodeUrl) return;
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `${profile?.brandName?.replace(/\s+/g, '-').toLowerCase() || 'store'}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const calculateAnalytics = (orders: IncomingOrder[]) => {
        let accepted = 0;
        let rejected = 0;

        const acceptedItemsMap: Record<string, number> = {};
        const rejectedItemsMap: Record<string, number> = {};

        orders.forEach((order) => {
            if (order.status === "accepted") {
            accepted++;
            order.items.forEach((item) => {
                acceptedItemsMap[item.name] = (acceptedItemsMap[item.name] || 0) + item.quantity;
            });
            }
            
            if (order.status === "rejected") {
            rejected++;
            order.items.forEach((item) => {
                rejectedItemsMap[item.name] = (rejectedItemsMap[item.name] || 0) + item.quantity;
            });
            }
        });

        let mostAcceptedItem = "N/A";
        let mostAcceptedCount = 0;
        Object.entries(acceptedItemsMap).forEach(([item, count]) => {
            if (count > mostAcceptedCount) {
            mostAcceptedItem = item;
            mostAcceptedCount = count;
            }
        });

        let mostRejectedItem = "N/A";
        let mostRejectedCount = 0;
        Object.entries(rejectedItemsMap).forEach(([item, count]) => {
            if (count > mostRejectedCount) {
            mostRejectedItem = item;
            mostRejectedCount = count;
            }
        });

        setAnalytics({
            totalOrders: orders.length,
            acceptedOrders: accepted,
            rejectedOrders: rejected,
            mostAcceptedItem,
            mostAcceptedCount,
            mostRejectedItem,
            mostRejectedCount,
        });
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
          ...profile
        });
      }
    });

    return () => unsubscribe();
  }, [uid, profile]);

  // --- Listen for Auth Changes ---
  useEffect(() => {
    const auth = getAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUid(user.uid);
        setEmail(user.email || '');
      } else {
        setUid('');
        setEmail('');
        // 🟢 If there is no user, stop loading and redirect to login
        setLoading(false); 
        window.location.href = '/login'; 
      }
      setAuthLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // Current cap state, recomputed on every render from the live flags so an
  // unsubscribe or a revoked verification mark re-applies it immediately.
  const intakeState = evaluateIntakeLimit(
    incomingOrders.length,
    { isPremium, isVerified },
    profile?.cooldownExpiresAt
  );

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

  // ⏳ Live countdown timer for the merchant cooldown popup
  useEffect(() => {
    if (!profile?.cooldownExpiresAt) {
      setCooldownCountdown(null);
      return;
    }

    const interval = setInterval(() => {
      const expiryTime = new Date(profile.cooldownExpiresAt!).getTime();
      const now = new Date().getTime();
      const distance = expiryTime - now;

      if (distance <= 0) {
        setCooldownCountdown(null);
        clearInterval(interval);
      } else {
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        setCooldownCountdown(`${hours}h ${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [profile?.cooldownExpiresAt]);

  // --- Firestore Initialization & Real-Time Sync ---
  useEffect(() => {
    if (authLoading || !uid) return;

    const docRef = doc(db, 'restaurantprofile', uid);

    const initDoc = async () => {
      try {
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          const defaultData: RestaurantData = {
            brandName: 'My Restaurant',
            brandBio: '',
            address: '', 
            openingTime: '08:00',
            closingTime: '22:00',
            shareLink: `${storeOrigin()}/food/${uid}`,
            vinLink: `/food/${uid}`, // relative VinLink, read directly by the customer scanner
            onlineStatus: true,
            walletBalance: 0, // Initialize balance structure
            createdAt: serverTimestamp() as unknown as Timestamp,
            updatedAt: serverTimestamp() as unknown as Timestamp,
          };
          await setDoc(docRef, defaultData);
        } else if (!docSnap.data()?.vinLink) {
          // Backfill: doc existed before the vinLink field was introduced
          await updateDoc(docRef, { vinLink: `/food/${uid}` });
        }
      } catch (error) {
        console.error("Error establishing initial profile:", error);
      }
    };

    initDoc();

    const unsubscribeDoc = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as RestaurantData;
        const shareLink = `${storeOrigin()}/food/${uid}`;

        // Always derive the share link rather than trusting the stored field.
        // Docs written before this fix hold a https://localhost/... link that
        // was captured from window.location.origin inside the native WebView,
        // and that value is useless to anyone it's sent to. Overwriting it
        // here means the displayed link, the copy button, the QR code and the
        // next profile save all pick up the corrected one.
        setProfile({ ...data, shareLink });

        setFormBrandName(data.brandName || '');
        setFormBrandBio(data.brandBio || '');
        setFormAddress(data.address || '');
        setFormOpeningTime(data.openingTime || '');
        setFormClosingTime(data.closingTime || '');

        QRCode.toDataURL(shareLink).then(url => setQrCodeUrl(url));
      }
      setLoading(false);
    });

    return () => unsubscribeDoc();
  }, [uid, authLoading]);

  // --- UI Action Handlers ---
  // window.location.origin is https://localhost inside the native WebView, so
  // building the link from it produces something nobody else can open.
  const shareUrl = () => buildVinLink(uid, 'food');

  const handleCopyLink = () => {
    copyToClipboard(shareUrl());
  };

  const handleShareLink = async () => {
    if (!canOpenShareSheet()) { handleCopyLink(); return; }

    const result = await shareContent({
      title: profile?.brandName || "My Restaurant",
      text: profile?.brandBio || "Check out our menu!",
      url: shareUrl(),
    });

    if (result === 'failed' || result === 'unsupported') handleCopyLink();
  };

  useEffect(() => {
        const generateQRCodes = async () => {
            const qrMap: Record<string, string> = {};
            for (const order of incomingOrders) {
              qrMap[order.id] = await QRCode.toDataURL(
                  JSON.stringify({
                    id: order.id,
                    code: order.fourDigitCode,
                    customer: order.customerName,
                  })
              );
            }
            setOrderQrCodes(qrMap);
        };

        if (incomingOrders.length) {
            generateQRCodes();
        }
  }, [incomingOrders]);

  // --- Order Snapshot listener with Daily Limit Logic & Firestore Sync ---
  useEffect(() => {
        if (!uid) return;

        const q = query(
            collection(db, "orders"),
            where("restaurantUid", "==", uid)
        );

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const orders: IncomingOrder[] = [];
            snapshot.forEach((doc) => {
                orders.push({
                  id: doc.id,
                  ...doc.data(),
                } as IncomingOrder);
            });

            if (
                previousOrderCount.current > 0 &&
                orders.length > previousOrderCount.current
            ) {
                const audio = new Audio("/notification.mp3");
                audio.play().catch((err) => {
                  console.log("Audio blocked:", err);
                });
            }

            previousOrderCount.current = orders.length;
            calculateAnalytics(orders);

            // The free-tier intake cap. This used to be decided inline here
            // and keyed on isVerified alone, which meant a verified but
            // non-paying restaurant was already exempt, and no other business
            // category was capped at all. Both now come from the one shared
            // rule — the cap lifts only while premium AND verified.
            const limitState = evaluateIntakeLimit(
              orders.length,
              { isPremium, isVerified },
              profile?.cooldownExpiresAt
            );

            await syncIntakeLimitState('food', uid, limitState, { isPremium, isVerified });

            // If a valid cooldown is in place, cap the stream and alert the merchant
            if (limitState.limitReached) {
              setIncomingOrders(orders.slice(0, FREE_TIER_INTAKE_LIMIT));
              setShowPremiumPopup(true);
            } else {
              setIncomingOrders(orders);
            }
        });

        return () => unsubscribe();
  }, [uid, isPremium, isVerified, profile?.cooldownExpiresAt]);

  const handleAcceptOrder = async (orderId: string) => {
        try {
            await updateDoc(doc(db, "orders", orderId), { status: "accepted" });
        } catch (err) {
            console.error(err);
        }
  };

  const handleRejectOrder = async (orderId: string) => {
        try {
            await updateDoc(doc(db, "orders", orderId), { status: "rejected" });
        } catch (err) {
            console.error(err);
        }
  };

  // 🟢 Moves an accepted order into the Completed bucket
  const handleCompleteOrder = async (orderId: string) => {
        try {
            await updateDoc(doc(db, "orders", orderId), { status: "completed" });
        } catch (err) {
            console.error(err);
        }
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uid || !profile) return;

        try {
            const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
            const docRef = doc(db, 'restaurantprofile', uid);
            const coords = await geocodeAddress(formAddress);
            
            await setDoc(docRef, {
              brandName: formBrandName,
              brandBio: formBrandBio,
              address: formAddress, 
              openingTime: formOpeningTime,
              closingTime: formClosingTime,
              shareLink: profile.shareLink, 
              latitude: coords ? coords.latitude : 0, // Auto-populated!
              longitude: coords ? coords.longitude : 0, // Auto-populated!
              updatedAt: serverTimestamp(),
            }, { merge: true });

            alert("Changes saved successfully!");
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Failed to save changes.");
        }
  };

  // Place these state hooks near your other state hooks at the top of the component:
  const [showScanner, setShowScanner] = useState(false);
  const [scanResultMsg, setScanResultMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Handler to verify and delete processed receipts 
  const handleScanReceiptCode = async (scannedOutput: string) => {
    if (!scannedOutput) return;
    
    let targetIdOrCode = scannedOutput.trim();

    // 1. Safe parsing: If a different route gives a full URL link path, extract just the end ID
    if (targetIdOrCode.includes('/')) {
      targetIdOrCode = targetIdOrCode.split('/').pop() || targetIdOrCode;
    }

    let parsedOrderId: string | null = null;
    let parsedFourDigitCode: string | null = null;

    // 2. Safe parsing: If scanned from a JSON QR object, extract the properties
    try {
      const parsed = JSON.parse(targetIdOrCode);
      parsedOrderId = parsed.orderId || parsed.ticketId || null;
      parsedFourDigitCode = parsed.code || parsed.referenceId || null;
    } catch (e) {
      // scannedOutput is a plain text string (e.g. typed "1234" or typed/scanned orderId)
    }

    try {
      // 3. Robust lookup: Match by Order ID OR by the unique 4-digit code (case-insensitive)
      const matchedOrder = incomingOrders.find(o => {
        const orderId = o.id;
        const fourDigitCode = o.fourDigitCode ? String(o.fourDigitCode).trim().toLowerCase() : null;
        const searchToken = targetIdOrCode.toLowerCase();

        return (
          orderId === targetIdOrCode || // exact ID match (typed/scanned)
          orderId === parsedOrderId ||   // JSON-extracted ID match
          fourDigitCode === searchToken || // exact 4-digit code match (typed/scanned)
          (parsedFourDigitCode && fourDigitCode === parsedFourDigitCode.toLowerCase()) // JSON-extracted code match
        );
      });
      
      if (matchedOrder) {
        const orderDocRef = doc(db, 'orders', matchedOrder.id);
        await deleteDoc(orderDocRef);
        
        setScanResultMsg({ 
          type: 'success', 
          text: `Order verified for ${matchedOrder.customerName} (#${matchedOrder.fourDigitCode})! Ticket removed.` 
        });
      } else {
        setScanResultMsg({ 
          type: 'error', 
          text: "Ticket/Code doesn't exist or was already cleared." 
        });
      }
    } catch (err) {
      console.error("Firestore database update dropped:", err);
      setScanResultMsg({ type: 'error', text: 'Server connection sync error.' });
    }
  };

  if (authLoading || loading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 style={{ width: '22px', height: '22px', color: C.green }} className="animate-spin" />
      </div>
    );
  }

  if (isBanned) {
    return <Banned userBrand={brandStatusData} />;
  }

  if (isSuspended) {
    return <Suspended userBrand={brandStatusData} />;
  }
  if (page === 'catalogue') { return <RestaurantCatalogue onBack={() => setPage('dashboard')} />;}

  // --- Derived order buckets for the segmented control + overview card ---
  const pendingOrders = incomingOrders.filter(o => o.status !== 'accepted' && o.status !== 'rejected' && o.status !== 'completed');
  const acceptedOrdersList = incomingOrders.filter(o => o.status === 'accepted');
  const completedOrdersList = incomingOrders.filter(o => o.status === 'completed');
  const recentActivity = incomingOrders
    .filter(o => o.status === 'accepted' || o.status === 'rejected' || o.status === 'completed')
    .slice(-3)
    .reverse();

  const orderTotal = (o: IncomingOrder) => o.items.reduce((sum, i) => sum + i.price * i.quantity, 0).toFixed(2);
  const orderNumber = (o: IncomingOrder) => (o.fourDigitCode || o.id).toString().slice(-3);

  const activityVisual = (status: string) => {
    if (status === 'completed') return { bg: C.greenLight, color: C.green, Icon: Check, label: 'completed' };
    if (status === 'accepted') return { bg: C.orangeLight, color: C.orange, Icon: Clock, label: 'accepted' };
    return { bg: C.grayLight, color: C.gray, Icon: X, label: 'cancelled' };
  };

  const tabList: { key: 'incoming' | 'accepted' | 'completed'; label: string; count: number }[] = [
    { key: 'incoming', label: 'Incoming', count: pendingOrders.length },
    { key: 'accepted', label: 'Accepted', count: acceptedOrdersList.length },
    { key: 'completed', label: 'Completed', count: completedOrdersList.length },
  ];

  const activeOrderList =
    orderSubTab === 'incoming' ? pendingOrders :
    orderSubTab === 'accepted' ? acceptedOrdersList :
    completedOrdersList;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: C.bg, color: C.text, fontFamily: 'inherit', paddingBottom: '110px', position: 'relative' }}>

      {/* --- POPUP OVERLAY MODAL --- */}
      {showPremiumPopup && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: C.card, borderRadius: '28px', padding: '24px', maxWidth: '380px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', backgroundColor: C.redLight, borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', margin: '0 auto 16px' }}>
              ⚠️
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.01em', margin: '0 0 8px' }}>Order Limit Reached</h2>
            <p style={{ fontSize: '13px', fontWeight: 600, color: C.textMuted, margin: '0 0 16px', lineHeight: 1.5 }}>
              Unverified accounts are capped at <span style={{ textDecoration: 'underline' }}>10 orders a day</span>. Go Premium to unlock infinite incoming streams!
            </p>

            {cooldownCountdown && (
              <div style={{ backgroundColor: C.redLight, borderRadius: '14px', padding: '10px', fontSize: '11px', fontWeight: 800, color: C.red, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>
                Reset Cooldown in: {cooldownCountdown}
              </div>
            )}

            <div style={{ backgroundColor: C.greenLight, borderRadius: '18px', padding: '14px', fontWeight: 800, fontSize: '17px', color: C.greenDark, marginBottom: '14px' }}>
              €10 / month
            </div>
            <p style={{ fontSize: '11px', fontWeight: 600, color: C.textMuted, marginBottom: '18px' }}>
              Need assistance? Contact us at: <br/>
              <a href="mailto:malvinai.partnerships@gmail.com" style={{ fontWeight: 700, textDecoration: 'underline', color: C.text }}>
                malvinai.partnerships@gmail.com
              </a>
            </p>
            <button 
              onClick={() => setShowPremiumPopup(false)}
              style={{
                width: '100%', padding: '13px', backgroundColor: C.green, color: '#FFFFFF', borderRadius: '14px',
                fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
                border: 'none', outline: 'none', cursor: 'pointer',
              }}
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}

      {showScanner && (
        <ConfirmQRScanner 
          onClose={() => { 
            setShowScanner(false); 
            setScanResultMsg(null); 
          }} 
          onCrosscheck={(data) => {
            handleScanReceiptCode(data);
          }} 
        />
      )}

      {/* --- ALERT BANNER --- */}
      {scanResultMsg && (
        <div style={{
          maxWidth: '640px', margin: '8px auto 0', borderRadius: '18px', padding: '14px', textAlign: 'center',
          fontWeight: 800, fontSize: '13px', letterSpacing: '0.01em',
          backgroundColor: scanResultMsg.type === 'success' ? C.greenLight : C.redLight,
          color: scanResultMsg.type === 'success' ? C.greenDark : C.red,
        }}>
          {scanResultMsg.text}
        </div>
      )}

      <div style={{ maxWidth: '640px', margin: '12px auto 0' }}>
        <IntakeLimitBanner
          merchantType="food"
          state={intakeState}
          cooldownLabel={cooldownLabel}
          isPremium={isPremium}
          isVerified={isVerified}
        />
      </div>

      {/* --- ORDER HISTORY MODAL ("See All") --- */}
      {showAcceptedModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: C.card, borderRadius: '28px', padding: '22px', maxWidth: '460px', width: '100%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: `1px solid ${C.border}`, paddingBottom: '12px', marginBottom: '14px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0 }}>Order History</h2>
              <button 
                onClick={() => setShowAcceptedModal(false)}
                style={{ width: '32px', height: '32px', borderRadius: '9999px', backgroundColor: C.grayLight, border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X style={{ width: '16px', height: '16px' }} />
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[...acceptedOrdersList, ...completedOrdersList].length === 0 ? (
                <p style={{ textAlign: 'center', fontWeight: 700, color: C.textMuted, padding: '24px 0' }}>No order history yet.</p>
              ) : (
                [...completedOrdersList, ...acceptedOrdersList].map(order => {
                  const v = activityVisual(order.status);
                  return (
                    <div key={order.id} style={{ borderRadius: '18px', backgroundColor: C.bg, padding: '14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <h4 style={{ fontWeight: 800, fontSize: '14px', margin: 0 }}>{order.customerName}</h4>
                          <p style={{ fontSize: '11px', color: C.textMuted, margin: '2px 0 0' }}>Pickup: {order.pickupTime}</p>
                        </div>
                        <span style={{ fontSize: '12px', fontFamily: 'monospace', fontWeight: 800, color: v.color }}>{order.fourDigitCode || "----"}</span>
                      </div>
                      <div style={{ marginTop: '8px', borderTop: `1px solid ${C.border}`, paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {order.items.map((item, index) => (
                          <div key={index} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                            <span>{item.quantity}x {item.name}</span>
                            <span>€{(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- TOP HEADER --- */}
      <header style={{ maxWidth: '640px', margin: '0 auto', padding: '20px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
          <div style={{
            position: 'relative', width: '52px', height: '52px', borderRadius: '16px', backgroundColor: C.greenDark,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{ color: C.greenPale, fontWeight: 900, fontSize: '20px' }}>
              {(profile?.brandName || 'R').trim().charAt(0).toUpperCase()}
            </span>
            {/* Small restaurant badge so the tile reads as a store logo, not just an initial */}
            <div style={{
              position: 'absolute', bottom: '-4px', right: '-4px', width: '22px', height: '22px', borderRadius: '9999px',
              backgroundColor: C.greenPale, border: `2px solid ${C.bg}`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <UtensilsCrossed style={{ width: '11px', height: '11px', color: C.greenDark }} />
            </div>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', fontSize: '17px', fontWeight: 800, letterSpacing: '-0.01em' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                {profile?.brandName || "My Restaurant"}
              </span>
              {isVerified && <VerifiedBadge />}
            </div>
            <p style={{ fontSize: '13px', color: C.textMuted, margin: '2px 0 0', fontWeight: 500 }}>
              {profile?.brandBio || 'Restaurant'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <button
            onClick={() => setShowScanner(true)}
            title="Scan Receipt Code"
            style={{
              width: '44px', height: '44px', borderRadius: '14px', backgroundColor: C.card,
              border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: C.shadow,
            }}
          >
            <ScanLine style={{ width: '18px', height: '18px', color: C.text }} />
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            title="More"
            style={{
              width: '44px', height: '44px', borderRadius: '14px', backgroundColor: C.card,
              border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: C.shadow,
            }}
          >
            <MoreHorizontal style={{ width: '18px', height: '18px', color: C.text }} />
          </button>
        </div>
      </header>

      {!settingsOpen ? (
        <main style={{ maxWidth: '640px', margin: '0 auto', padding: '0 16px' }}>
          {/* --- TITLE + SEGMENTED CONTROL --- */}
          <h1 style={{ fontSize: '30px', fontWeight: 900, letterSpacing: '-0.02em', margin: '22px 0 14px' }}>Orders</h1>

          <div style={{ display: 'flex', backgroundColor: '#E9EBEE', borderRadius: '9999px', padding: '4px', gap: '2px' }}>
            {tabList.map(tab => {
              const active = orderSubTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setOrderSubTab(tab.key)}
                  style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    padding: '10px 6px', borderRadius: '9999px', border: 'none', cursor: 'pointer',
                    backgroundColor: active ? '#FFFFFF' : 'transparent',
                    boxShadow: active ? '0 1px 3px rgba(16,24,40,0.12)' : 'none',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: '13px', fontWeight: 800, color: active ? C.text : C.textMuted, whiteSpace: 'nowrap' }}>{tab.label}</span>
                  <span style={{
                    backgroundColor: C.green, color: '#FFFFFF', fontSize: '11px', fontWeight: 800, borderRadius: '9999px',
                    minWidth: '20px', height: '20px', padding: '0 5px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* --- LIST OR EMPTY STATE --- */}
          {activeOrderList.length === 0 ? (
            <div style={{ backgroundColor: C.card, borderRadius: '28px', padding: '36px 20px', marginTop: '16px', textAlign: 'center', boxShadow: C.shadow }}>
              <EmptyBoxIllustration />
              <h3 style={{ fontSize: '19px', fontWeight: 800, margin: '4px 0 6px' }}>
                {orderSubTab === 'incoming' ? "You're all caught up" : orderSubTab === 'accepted' ? 'No accepted orders' : 'No completed orders yet'}
              </h3>
              <p style={{ fontSize: '13px', color: C.textMuted, margin: 0, fontWeight: 500 }}>
                {orderSubTab === 'incoming' ? 'New orders will appear here instantly.' : orderSubTab === 'accepted' ? 'Accepted orders will show up here.' : 'Completed orders will show up here.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
              {activeOrderList.map(order => (
                <div key={order.id} style={{ backgroundColor: C.card, borderRadius: '24px', padding: '16px', boxShadow: C.shadow }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontWeight: 800, fontSize: '15px', margin: 0 }}>{order.customerName}</h3>
                      <p style={{ fontSize: '12px', color: C.textMuted, margin: '4px 0 0' }}>Pickup: {order.pickupTime}</p>
                      {order.userMobilityStatus && (
                        <p style={{
                          fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.03em', marginTop: '6px',
                          padding: '3px 8px', borderRadius: '8px', backgroundColor: C.orangeLight, color: C.orange, display: 'inline-block',
                        }}>
                          {order.userMobilityStatus}{order.userMobilityStatus === 'in store' && order.tableNumber && ` (Table ${order.tableNumber})`}
                        </p>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: '76px' }}>
                      <p style={{ fontSize: '13px', fontWeight: 800, color: C.green, margin: '0 0 4px' }}>{order.fourDigitCode || "----"}</p>
                      {orderQrCodes?.[order.id] && (
                        <img src={orderQrCodes[order.id]} alt="Order QR" style={{ width: '56px', height: '56px', borderRadius: '10px', border: `1px solid ${C.border}`, padding: '3px', backgroundColor: '#FFF' }} />
                      )}
                    </div>
                  </div>

                  <div style={{ marginTop: '10px', borderTop: `1px solid ${C.border}`, paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {order.items.map((item, index) => (
                      <div key={index} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                        <span>{item.quantity}x {item.name}</span>
                        <span>€{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {orderSubTab === 'incoming' && (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                      <button
                        onClick={() => handleRejectOrder(order.id)}
                        style={{ flex: 1, padding: '10px', borderRadius: '14px', border: 'none', backgroundColor: C.redLight, color: C.red, fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', cursor: 'pointer' }}
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleAcceptOrder(order.id)}
                        style={{ flex: 1, padding: '10px', borderRadius: '14px', border: 'none', backgroundColor: C.green, color: '#FFFFFF', fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', cursor: 'pointer' }}
                      >
                        Accept
                      </button>
                    </div>
                  )}

                  {orderSubTab === 'accepted' && (
                    <button
                      onClick={() => handleCompleteOrder(order.id)}
                      style={{ width: '100%', marginTop: '12px', padding: '10px', borderRadius: '14px', border: 'none', backgroundColor: C.greenLight, color: C.greenDark, fontWeight: 800, fontSize: '12px', textTransform: 'uppercase', cursor: 'pointer' }}
                    >
                      Mark Completed
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* --- TODAY'S OVERVIEW --- */}
          <div style={{ backgroundColor: C.card, borderRadius: '26px', padding: '20px', marginTop: '18px', boxShadow: C.shadow }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>Today's Overview</h3>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '13px', color: C.textMuted, fontWeight: 600 }}>
                Today <ChevronDown style={{ width: '14px', height: '14px' }} />
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', marginTop: '16px' }}>
              {[
                { label: 'Incoming', value: pendingOrders.length, bg: C.greenLight, color: C.green, Icon: ShoppingBag },
                { label: 'Accepted', value: acceptedOrdersList.length, bg: C.orangeLight, color: C.orange, Icon: Clock },
                { label: 'Completed', value: completedOrdersList.length, bg: C.blueLight, color: C.blue, Icon: Check },
              ].map((stat, i) => (
                <React.Fragment key={stat.label}>
                  {i !== 0 && <div style={{ width: '1px', height: '48px', backgroundColor: C.border }} />}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '9999px', backgroundColor: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <stat.Icon style={{ width: '16px', height: '16px', color: stat.color }} />
                    </div>
                    <span style={{ fontSize: '22px', fontWeight: 900 }}>{stat.value}</span>
                    <span style={{ fontSize: '12px', color: C.textMuted, fontWeight: 600 }}>{stat.label}</span>
                  </div>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* --- RECENT ACTIVITY --- */}
          <div style={{ marginTop: '22px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, margin: 0 }}>Recent Activity</h3>
              <button
                onClick={() => setShowAcceptedModal(true)}
                style={{ background: 'none', border: 'none', color: C.green, fontSize: '13px', fontWeight: 700, cursor: 'pointer', padding: 0 }}
              >
                See All
              </button>
            </div>

            <div style={{ backgroundColor: C.card, borderRadius: '22px', boxShadow: C.shadow, overflow: 'hidden' }}>
              {recentActivity.length === 0 ? (
                <p style={{ textAlign: 'center', fontWeight: 600, color: C.textMuted, padding: '20px', margin: 0, fontSize: '13px' }}>No activity yet today.</p>
              ) : (
                recentActivity.map((order, idx) => {
                  const v = activityVisual(order.status);
                  return (
                    <div
                      key={order.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                        borderTop: idx === 0 ? 'none' : `1px solid ${C.border}`,
                      }}
                    >
                      <div style={{ width: '36px', height: '36px', borderRadius: '9999px', backgroundColor: v.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <v.Icon style={{ width: '16px', height: '16px', color: v.color }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: '14px', fontWeight: 700, margin: 0 }}>Order #{orderNumber(order)} {v.label}</p>
                        <p style={{ fontSize: '12px', color: C.textMuted, margin: '2px 0 0' }}>{order.pickupTime}</p>
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: 800 }}>€{orderTotal(order)}</span>
                      <ChevronRight style={{ width: '16px', height: '16px', color: C.textMuted }} />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </main>
      ) : (
        <main style={{ maxWidth: '640px', margin: '0 auto', padding: '0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '22px 0 16px' }}>
            <button
              onClick={() => setSettingsOpen(false)}
              style={{ width: '36px', height: '36px', borderRadius: '12px', backgroundColor: C.card, border: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            >
              <ChevronRight style={{ width: '16px', height: '16px', transform: 'rotate(180deg)' }} />
            </button>
            <h1 style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '-0.01em', margin: 0 }}>More</h1>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* CARD 1: SHARE STORE */}
            <section style={{ backgroundColor: C.card, borderRadius: '24px', padding: '20px', boxShadow: C.shadow }}>
              <h2 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 14px' }}>Share Store</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ width: '140px', height: '140px', borderRadius: '18px', backgroundColor: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', margin: '0 auto' }}>
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="Store QR Code" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  ) : (
                    <div style={{ width: '16px', height: '16px', backgroundColor: C.green, borderRadius: '9999px' }} className="animate-ping" />
                  )}
                </div>
                
                <div style={{ backgroundColor: C.bg, borderRadius: '14px', padding: '10px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 700, wordBreak: 'break-all' }}>
                  {profile?.shareLink}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button onClick={handleCopyLink} style={{ padding: '10px', borderRadius: '14px', border: 'none', backgroundColor: C.greenLight, color: C.greenDark, fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}>
                    Copy Link
                  </button>
                  <a href={`${storeOrigin()}/food/${uid}`} target="_blank" rel="noreferrer" style={{ padding: '10px', borderRadius: '14px', backgroundColor: C.greenLight, color: C.greenDark, fontSize: '12px', fontWeight: 800, textAlign: 'center', textDecoration: 'none' }}>
                    Open Store
                  </a>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <button onClick={handleShareLink} style={{ padding: '11px', borderRadius: '14px', border: 'none', backgroundColor: C.green, color: '#FFFFFF', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}>
                    Share Link
                  </button>
                  <button
                    onClick={handleDownloadQR}
                    disabled={!qrCodeUrl}
                    style={{ padding: '11px', borderRadius: '14px', border: `1px solid ${C.border}`, backgroundColor: '#FFFFFF', color: C.text, fontSize: '12px', fontWeight: 800, cursor: qrCodeUrl ? 'pointer' : 'default', opacity: qrCodeUrl ? 1 : 0.5 }}
                  >
                    Download QR
                  </button>
                </div>
              </div>
            </section>

            {/* CARD 2: RESTAURANT PROFILE */}
            <section style={{ backgroundColor: C.card, borderRadius: '24px', padding: '20px', boxShadow: C.shadow }}>
              <h2 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 14px' }}>Restaurant Profile</h2>
              <form onSubmit={handleSaveChanges} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'flex', alignItems: 'center', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: C.textMuted, marginBottom: '6px' }}>
                    Brand Name {isVerified && <VerifiedBadge />}
                  </label>
                  <input 
                    type="text" 
                    value={formBrandName} 
                    onChange={(e) => setFormBrandName(e.target.value)}
                    style={{ width: '100%', backgroundColor: C.bg, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '11px', fontSize: '14px', fontWeight: 600, outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: C.textMuted, marginBottom: '6px' }}>Brand Bio</label>
                  <textarea 
                    value={formBrandBio}
                    onChange={(e) => setFormBrandBio(e.target.value)}
                    rows={2}
                    style={{ width: '100%', backgroundColor: C.bg, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '11px', fontSize: '14px', fontWeight: 600, outline: 'none', resize: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: C.textMuted, marginBottom: '6px' }}>Store Address</label>
                  <input 
                    type="text" 
                    value={formAddress} 
                    placeholder="e.g. 123 Foodie Street, Suite 4B"
                    onChange={(e) => setFormAddress(e.target.value)}
                    style={{ width: '100%', backgroundColor: C.bg, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '11px', fontSize: '14px', fontWeight: 600, outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: C.textMuted, marginBottom: '6px' }}>Opening Time</label>
                    <input 
                      type="time" 
                      value={formOpeningTime}
                      onChange={(e) => setFormOpeningTime(e.target.value)}
                      style={{ width: '100%', backgroundColor: C.bg, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '11px', fontSize: '14px', fontWeight: 600, outline: 'none' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: C.textMuted, marginBottom: '6px' }}>Closing Time</label>
                    <input 
                      type="time" 
                      value={formClosingTime}
                      onChange={(e) => setFormClosingTime(e.target.value)}
                      style={{ width: '100%', backgroundColor: C.bg, border: `1px solid ${C.border}`, borderRadius: '14px', padding: '11px', fontSize: '14px', fontWeight: 600, outline: 'none' }}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  style={{ width: '100%', padding: '13px', marginTop: '4px', borderRadius: '14px', border: 'none', backgroundColor: C.green, color: '#FFFFFF', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}
                >
                  Save Changes
                </button>
              </form>
            </section>

            {/* CARD: LANGUAGE — live-translates the entire app */}
            <section style={{ backgroundColor: C.card, borderRadius: '24px', padding: '20px', boxShadow: C.shadow }}>
              <h2 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 14px' }}>Language</h2>
              <TranslateControl label="" description="" variant="light" />
            </section>

            {/* CARD 3: ACCOUNT INFORMATION */}
            <section style={{ backgroundColor: C.card, borderRadius: '24px', padding: '20px', boxShadow: C.shadow }}>
              <h2 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 14px' }}>Account Information</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[
                  { label: "User Email", value: email || "N/A" },
                  { label: "Online Status", value: profile?.onlineStatus ? "🟢 ONLINE" : "🔴 OFFLINE" },
                  { label: "Firebase UID", value: uid },
                  { label: "Store Address", value: profile?.address || "No address assigned" }, 
                  { label: "Created Date", value: profile?.createdAt ? profile.createdAt.toDate().toLocaleString() : "N/A" },
                  { label: "Last Updated Date", value: profile?.updatedAt ? profile.updatedAt.toDate().toLocaleString() : "N/A" }
                ].map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.bg, padding: '10px 12px', borderRadius: '14px', gap: '10px' }}>
                    <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: C.textMuted, letterSpacing: '0.04em' }}>{row.label}</span>
                    <span style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* CARD: ANALYTICS (folded in from the old dedicated tab) */}
            <section style={{ backgroundColor: C.card, borderRadius: '24px', padding: '20px', boxShadow: C.shadow }}>
              <h2 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 14px' }}>Analytics</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '13px', fontWeight: 700 }}>
                <div style={{ padding: '12px', borderRadius: '14px', backgroundColor: C.bg }}>Total Orders: {analytics.totalOrders}</div>
                <div style={{ padding: '12px', borderRadius: '14px', backgroundColor: C.greenLight, color: C.greenDark }}>Accepted: {analytics.acceptedOrders}</div>
                <div style={{ padding: '12px', borderRadius: '14px', backgroundColor: C.redLight, color: C.red, gridColumn: '1 / -1' }}>Rejected: {analytics.rejectedOrders}</div>
                <div style={{ padding: '12px', borderRadius: '14px', backgroundColor: C.bg, gridColumn: '1 / -1' }}>
                  🔥 Most Accepted: <strong>{analytics.mostAcceptedItem}</strong> ({analytics.mostAcceptedCount} units)
                </div>
                <div style={{ padding: '12px', borderRadius: '14px', backgroundColor: C.bg, gridColumn: '1 / -1' }}>
                  ⚠️ Most Rejected: <strong>{analytics.mostRejectedItem}</strong> ({analytics.mostRejectedCount} units)
                </div>
              </div>
            </section>

            {/* CARD: DATA & ACCOUNT MANAGEMENT */}
            <section style={{ backgroundColor: C.card, borderRadius: '24px', padding: '20px', boxShadow: C.shadow }}>
              <h2 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 6px' }}>Data & Account Actions</h2>
              <p style={{ fontSize: '12px', fontWeight: 600, color: C.textMuted, margin: '0 0 14px' }}>
                Export your store parameters and order logs, or permanently delete your account data.
              </p>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={handleDownloadData}
                  disabled={isDownloading}
                  style={{ padding: '12px', borderRadius: '16px', border: 'none', backgroundColor: C.greenLight, color: C.greenDark, fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: isDownloading ? 'default' : 'pointer', opacity: isDownloading ? 0.6 : 1 }}
                >
                  {isDownloading ? <Loader2 style={{ width: '16px', height: '16px' }} className="animate-spin" /> : <Download style={{ width: '16px', height: '16px' }} />}
                  <span>{isDownloading ? "Exporting..." : "Download Data"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  style={{ padding: '12px', borderRadius: '16px', border: 'none', backgroundColor: C.redLight, color: C.red, fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer' }}
                >
                  <Trash2 style={{ width: '16px', height: '16px' }} />
                  <span>Delete Account</span>
                </button>
              </div>
            </section>

            {/* CARD: STRIPE LIVE EARNINGS */}
            <section style={{ backgroundColor: C.card, borderRadius: '24px', padding: '20px', boxShadow: C.shadow }}>
              <div className={styles.glassCard}>
                <h3>Account & Ledger</h3>
                <div className={styles.metaRow}><strong>UID:</strong> <span className={styles.codeText}>{uid}</span></div>
                <div className={styles.metaRow}><strong>Status:</strong> <span>{profile?.status || 'Active'}</span></div>
                
                <div className={styles.card} style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #222' }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#fff' }}>Direct Credit Card Payments</h4>

                  {!((profile as any)?.stripeOnboarded) ? (
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

                        {(profile as any)?.stripeAccountId && (
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

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '12px', border: '1px solid #1a1a1a' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#22c55e', fontSize: '12px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '6px', height: '6px', background: '#22c55e', borderRadius: '50%' }}></span>
                            Available to Withdraw:
                          </span>
                          <span style={{ fontWeight: '700', color: '#22c55e', fontSize: '13px', fontFamily: 'monospace' }}>
                            {currency.toUpperCase()} {(stripeBalance?.available || 0).toFixed(2)}
                          </span>
                        </div>

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
            </section>

            {/* CARD: CATALOGUE */}
            <section style={{ backgroundColor: C.card, borderRadius: '24px', padding: '20px', boxShadow: C.shadow, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px' }}>
                <div>
                  <h2 style={{ fontSize: '15px', fontWeight: 800, margin: '0 0 4px' }}>Catalogue</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', fontWeight: 700, color: C.textMuted }}>
                    <span style={{ backgroundColor: C.greenLight, color: C.greenDark, padding: '2px 8px', borderRadius: '8px' }}>Active</span>
                    <span>{catalogueCount} Products Live</span>
                  </div>
                </div>
                <button
                    onClick={() => setPage('catalogue')}
                    style={{ backgroundColor: C.green, color: '#FFFFFF', padding: '11px 16px', borderRadius: '14px', border: 'none', fontSize: '12px', fontWeight: 800, whiteSpace: 'nowrap', cursor: 'pointer' }}
                >
                  Manage →
                </button>
            </section>

            {/* LOGOUT */}
            <button
              onClick={handleLogout}
              style={{ width: '100%', padding: '14px', borderRadius: '18px', border: `1px solid ${C.border}`, backgroundColor: C.card, color: C.text, fontSize: '13px', fontWeight: 800, cursor: 'pointer', boxShadow: C.shadow }}
            >
              Log Out
            </button>
          </div>
        </main>
      )}

      

      {/* --- BOTTOM NAVIGATION --- */}
      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, backgroundColor: C.card, borderTop: `1px solid ${C.border}`,
        display: 'flex', justifyContent: 'space-around', alignItems: 'center', padding: '10px 8px calc(env(safe-area-inset-bottom, 0px) + 8px)', zIndex: 30,
      }}>
        {[
          { key: 'orders', label: 'Orders', Icon: ShoppingBag, active: page === 'dashboard' && !settingsOpen, onClick: () => { setPage('dashboard'); setSettingsOpen(false); } },
          { key: 'products', label: 'Products', Icon: Package, active: false, onClick: () => setPage('catalogue') },
        ].map(item => (
          <button
            key={item.key}
            onClick={item.onClick}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
              background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px',
              color: item.active ? C.green : '#9CA3AF',
            }}
          >
            <item.Icon style={{ width: '22px', height: '22px' }} />
            <span style={{ fontSize: '10px', fontWeight: 700 }}>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* FORGOT PIN & RESET OVERLAY */}
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
              <button
                onClick={() => setIsForgotPinOpen(false)}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #333', backgroundColor: 'transparent', color: '#ffffff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', outline: 'none' }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmNewPin}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', backgroundColor: C.green, color: '#ffffff', fontSize: '13px', fontWeight: 700, cursor: 'pointer', outline: 'none' }}
              >
                Reset PIN
              </button>
            </div>
          </div>
        </div>
      )}
      {isPinModalOpen && (
        <div className={styles.modalOverlay} style={{ zIndex: 2000 }}>
          <div className={styles.modalContent} style={{ maxWidth: '360px', textAlign: 'center' }}>
            <h3>Authorize Payout</h3>
            <p style={{ color: '#aaa', fontSize: '14px' }}>Enter your 4-digit security PIN to withdraw {currency}{profile.walletBalance.toFixed(2)}</p>
            
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
                onClick={() => setIsPinModalOpen(false)}
                disabled={isProcessingPayout}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #333', backgroundColor: 'transparent', color: '#ffffff', fontSize: '13px', fontWeight: 700, cursor: isProcessingPayout ? 'default' : 'pointer', outline: 'none', opacity: isProcessingPayout ? 0.5 : 1 }}
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirmPayout}
                disabled={isProcessingPayout || pinInput.length !== 4}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', backgroundColor: C.green, color: '#ffffff', fontSize: '13px', fontWeight: 700, cursor: (isProcessingPayout || pinInput.length !== 4) ? 'default' : 'pointer', outline: 'none', opacity: (isProcessingPayout || pinInput.length !== 4) ? 0.5 : 1 }}
              >
                {isProcessingPayout ? "Verifying..." : "Confirm"}
              </button>
              <button 
                type="button" 
                onClick={handleForgotPinRequest}
                style={{ background: 'none', border: 'none', color: C.red, fontSize: '11px', cursor: 'pointer', marginTop: '8px', textDecoration: 'underline', outline: 'none' }}
              >
                Forgot PIN?
              </button>
            </div>
          </div>
        </div>
      )}
      {/* FIRST-TIME PIN SETUP OVERLAY */}
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
              <button
                disabled={isRegisteringPin}
                onClick={() => setIsPinSetupModalOpen(false)}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #333', backgroundColor: 'transparent', color: '#ffffff', fontSize: '13px', fontWeight: 700, cursor: isRegisteringPin ? 'default' : 'pointer', outline: 'none', opacity: isRegisteringPin ? 0.5 : 1 }}
              >
                Cancel
              </button>
              <button 
                disabled={isRegisteringPin || setupPin.length !== 4 || setupPin !== confirmSetupPin} 
                onClick={handleRegisterSetupPin} 
                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: 'none', backgroundColor: C.green, color: '#ffffff', fontSize: '13px', fontWeight: 700, cursor: (isRegisteringPin || setupPin.length !== 4 || setupPin !== confirmSetupPin) ? 'default' : 'pointer', outline: 'none', opacity: (isRegisteringPin || setupPin.length !== 4 || setupPin !== confirmSetupPin) ? 0.5 : 1 }}
              >
                {isRegisteringPin ? "Saving..." : "Set PIN"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* --- DELETE ACCOUNT CONFIRMATION MODAL --- */}
      {isDeleteModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
          <div style={{ backgroundColor: C.card, borderRadius: '28px', padding: '24px', maxWidth: '380px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)', textAlign: 'center' }}>
            <div style={{ width: '56px', height: '56px', backgroundColor: C.redLight, borderRadius: '9999px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: C.red }}>
              <Trash2 style={{ width: '26px', height: '26px' }} />
            </div>

            <h3 style={{ fontSize: '19px', fontWeight: 800, margin: '0 0 10px' }}>Delete Account?</h3>
            
            <p style={{ fontSize: '13px', fontWeight: 600, color: C.textMuted, lineHeight: 1.5, margin: '0 0 18px' }}>
              Are you sure you want to delete your store profile and account? This action is <strong style={{ color: C.text }}>permanent</strong> and cannot be undone.
            </p>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                style={{ flex: 1, padding: '13px', border: 'none', backgroundColor: C.grayLight, color: C.text, borderRadius: '14px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccountAndData}
                disabled={isDeleting}
                style={{ flex: 1, padding: '13px', border: 'none', backgroundColor: C.red, color: '#ffffff', borderRadius: '14px', fontSize: '12px', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: isDeleting ? 'default' : 'pointer', opacity: isDeleting ? 0.6 : 1 }}
              >
                {isDeleting && <Loader2 style={{ width: '14px', height: '14px' }} className="animate-spin" />}
                <span>{isDeleting ? "Deleting..." : "Confirm Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}