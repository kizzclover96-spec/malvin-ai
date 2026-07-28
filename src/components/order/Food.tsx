import React, { useState, useEffect } from 'react';
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
import { CheckCircle, Download, Trash2, Loader2} from 'lucide-react';
import { geocodeAddress } from '../../utils/geocoding';
import Banned from "../addons/Banned";
import Suspended from "../addons/Suspended";

// --- Type Definitions ---
interface RestaurantData {
  brandName: string;
  brandBio: string;
  address?: string; 
  openingTime: string;
  closingTime: string;
  shareLink: string;
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
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [showAcceptedModal, setShowAcceptedModal] = useState<boolean>(false);
  
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

  const [activeTab, setActiveTab] = useState<"orders" | "analytics">("orders");

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
            shareLink: `${window.location.origin}/food/${uid}`,
            onlineStatus: true,
            walletBalance: 0, // Initialize balance structure
            createdAt: serverTimestamp() as unknown as Timestamp,
            updatedAt: serverTimestamp() as unknown as Timestamp,
          };
          await setDoc(docRef, defaultData);
        }
      } catch (error) {
        console.error("Error establishing initial profile:", error);
      }
    };

    initDoc();

    const unsubscribeDoc = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as RestaurantData;
        setProfile(data);
        
        setFormBrandName(data.brandName || '');
        setFormBrandBio(data.brandBio || '');
        setFormAddress(data.address || ''); 
        setFormOpeningTime(data.openingTime || '');
        setFormClosingTime(data.closingTime || '');

        const shareLink = `${window.location.origin}/food/${uid}`;
        QRCode.toDataURL(shareLink).then(url => setQrCodeUrl(url));
      }
      setLoading(false);
    });

    return () => unsubscribeDoc();
  }, [uid, authLoading]);

  // --- UI Action Handlers ---
  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/food/${uid}`);
  };

  const handleShareLink = async () => {
    if (navigator.share && profile?.shareLink) {
      try {
        await navigator.share({
          title: profile.brandName || "My Restaurant",
          text: profile.brandBio || "Check out our menu!",
          url: `${window.location.origin}/food/${uid}`,
        });
      } catch (err) {
        console.log("Error sharing:", err);
      }
    } else {
      handleCopyLink();
    }
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

            // 1. Determine if the unverified limit is reached
            const limitReached = !isVerified && orders.length >= 10;

            // 2. Manage cooldown timestamps
            let expiresAt = profile?.cooldownExpiresAt || null;
            const now = new Date();

            if (limitReached && !expiresAt) {
              // Newly reached limit: Set expiration to 24 hours from now
              const futureDate = new Date();
              futureDate.setHours(futureDate.getHours() + 24);
              expiresAt = futureDate.toISOString();
            } else if (expiresAt && now > new Date(expiresAt)) {
              // Timer has naturally expired: reset fields
              expiresAt = null;
            }

            // 🌟 SYNC COOLDOWN STATE TO THE PUBLIC RESTAURANT PROFILE
            try {
              const profileDocRef = doc(db, 'restaurantprofile', uid);
              await setDoc(profileDocRef, {
                orderLimitReached: expiresAt ? true : false,
                cooldownExpiresAt: expiresAt,
                isVerified: isVerified
              }, { merge: true });
            } catch (error) {
              console.error("Failed to sync limit state to Firestore:", error);
            }

            // If a valid cooldown is in place, cap the stream and alert the merchant
            if (expiresAt) {
              setIncomingOrders(orders.slice(0, 10));
              setShowPremiumPopup(true);
            } else {
              setIncomingOrders(orders);
            }
        });

        return () => unsubscribe();
  }, [uid, isVerified, profile?.cooldownExpiresAt]);

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
      <div className="min-h-screen bg-white text-black flex items-center justify-center font-sans">
        <p className="font-bold tracking-wider animate-pulse text-lg">LOADING DASHBOARD...</p>
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
  if (page === 'catalogue') { return <RestaurantCatalogue onBack={() => setPage('dashboard')} />;}
  
  return (
    <div className="min-h-screen bg-white text-black font-sans antialiased p-4 relative overflow-x-hidden select-none pb-24">
      
      {/* --- POPUP OVERLAY MODAL --- */}
      {/* --- POPUP OVERLAY MODAL --- */}
      {showPremiumPopup && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-[4px] border-black rounded-3xl p-6 max-w-sm w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center space-y-4 animate-fadeIn">
            <div className="w-16 h-16 bg-red-200 border-[3px] border-black rounded-full flex items-center justify-center text-2xl mx-auto">
              ⚠️
            </div>
            <h2 className="text-2xl font-black uppercase tracking-tight">Order Limit Reached</h2>
            <p className="text-sm font-bold text-gray-700">
              Unverified accounts are capped at <span className="underline">10 orders a day</span>. Go Premium to unlock infinite incoming streams!
            </p>

            {/* ⏳ RENDERS THE COOLDOWN TIMER FOR THE MERCHANT */}
            {cooldownCountdown && (
              <div className="bg-red-100 border-[2px] border-red-500 rounded-xl p-2 text-xs font-black text-red-700 uppercase tracking-wider">
                Reset Cooldown in: {cooldownCountdown}
              </div>
            )}

            <div className="bg-lime-200 border-[3px] border-black rounded-2xl p-3 font-black text-lg">
              €10 / month
            </div>
            <p className="text-xs font-semibold text-gray-500">
              Need assistance? Contact us at: <br/>
              <a href="mailto:malvinai.partnerships@gmail.com" className="font-bold underline text-black">
                malvinai.partnerships@gmail.com
              </a>
            </p>
            <button 
              onClick={() => setShowPremiumPopup(false)}
              className="w-full py-3 bg-black text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-neutral-800 transition-all active:translate-y-0.5"
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}

      {/* --- QR CODE SCANNER MODAL OVERLAY --- */}
      {/* --- INLINE SATELLITE SCANNER DROPDOWN PANEL --- */}
      {showScanner && (
        <ConfirmQRScanner 
          onClose={() => { 
            setShowScanner(false); 
            setScanResultMsg(null); 
          }} 
          onCrosscheck={(data) => {
            // Passes the text straight to your verification handler
            handleScanReceiptCode(data);
          }} 
        />
      )}

      {/* --- ALERT BANNER ALIGNMENT --- */}
      {scanResultMsg && (
        <div className={`w-full max-w-2xl mx-auto mt-2 border-[3px] border-black rounded-2xl p-4 text-center font-black text-sm uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] tracking-wide animate-fadeIn ${
          scanResultMsg.type === 'success' ? 'bg-lime-300 text-black' : 'bg-red-300 text-black'
        }`}>
          {scanResultMsg.text}
        </div>
      )}

      {/* --- ACCEPTED ORDERS OVERLAY MODAL --- */}
      {showAcceptedModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-[4px] border-black rounded-3xl p-6 max-w-xl w-full max-h-[80vh] overflow-y-auto shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] space-y-4">
            <div className="flex justify-between items-center border-b-[3px] border-black pb-2">
              <h2 className="text-2xl font-black uppercase tracking-tight">Accepted Orders</h2>
              <button 
                onClick={() => setShowAcceptedModal(false)}
                className="w-8 h-8 border-2 border-black rounded-xl bg-red-200 font-bold"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              {incomingOrders.filter(order => order.status === "accepted").length === 0 ? (
                <p className="text-center font-bold text-gray-500 py-6">No accepted orders yet.</p>
              ) : (
                incomingOrders
                  .filter(order => order.status === "accepted")
                  .map(order => (
                    <div key={order.id} className="border-[2px] border-black rounded-2xl bg-lime-50 p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-black text-md">{order.customerName}</h4>
                          <p className="text-xs text-gray-600">Pickup: {order.pickupTime}</p>
                        </div>
                        <span className="text-sm font-mono font-black text-lime-700">{order.fourDigitCode || "----"}</span>
                      </div>
                      <div className="mt-2 border-t border-black/10 pt-2 space-y-1">
                        {order.items.map((item, index) => (
                          <div key={index} className="flex justify-between text-xs">
                            <span>{item.quantity}x {item.name}</span>
                            <span>€{(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- TOP NAVIGATION SECTION --- */}
      <header className="w-full flex items-center justify-between gap-3 max-w-2xl mx-auto z-40 relative">
        <button 
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-12 h-12 flex items-center justify-center bg-lime-300 border-[3px] border-black rounded-2xl active:translate-y-0.5 active:bg-lime-400 transition-all duration-150"
        >
          <span className={`text-xs transform transition-transform duration-200 block ${dropdownOpen ? 'rotate-180' : ''}`}>▼</span>
        </button>

        <div className="flex-1 bg-white border-[3px] border-black rounded-full py-2.5 px-4 flex items-center justify-center text-center">
          <span className="font-extrabold text-sm tracking-tight truncate max-w-[180px] sm:max-w-xs">
            {profile?.brandName || "My Restaurant"} {isVerified && <VerifiedBadge />}
          </span>
        </div>

        {/* 🎛️ NEW: Added QR Scanner Trigger Icon button */}
        <button
            onClick={() => setShowScanner(true)}
            className="w-12 h-12 flex items-center justify-center border-[3px] border-black bg-cyan-200 rounded-2xl active:translate-y-0.5 transition-all text-lg font-black"
            title="Scan Receipt Code"
        >
          🔲
        </button>

        <button
            onClick={handleLogout}
            className="w-12 h-12 flex items-center justify-center border-[3px] border-black bg-red-200 rounded-2xl active:translate-y-0.5 transition-all"
        >
            ⎋
        </button>
        <button
            onClick={() => setSettingsOpen(!settingsOpen)}
            style={{ backgroundColor: "#bef264" }}
            className="w-12 h-12 flex items-center justify-center border-[3px] border-black rounded-2xl"
        >
          <svg className={`w-6 h-6 transition-transform duration-500 ${settingsOpen ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
          </svg>
        </button>
      </header>

      {/* --- DROPDOWN GLASS MENU --- */}
      {dropdownOpen && (
        <div className="absolute top-20 left-4 right-4 max-w-xs z-50 bg-white/70 backdrop-blur-md border-[3px] border-black rounded-2xl overflow-hidden transition-all duration-300 animate-fadeIn origin-top">
          <ul className="flex flex-col divide-y-[2.5px] divide-black font-bold">
            <li className="p-3 hover:bg-lime-300 cursor-pointer transition-colors" onClick={() => { setActiveTab("orders"); setDropdownOpen(false); }}>Orders ({incomingOrders.filter(o => o.status !== "accepted" && o.status !== "rejected").length})</li>
            <li className="p-3 hover:bg-lime-300 cursor-pointer transition-colors" onClick={() => { setActiveTab("analytics"); setDropdownOpen(false); }}>Analysis</li>
          </ul>
        </div>
      )}

      {/* --- MAIN INTERFACE PANELS --- */}
      <main className="max-w-2xl mx-auto mt-8 space-y-6">
        
        {!settingsOpen && activeTab !== "orders" && activeTab !== "analytics" && (
          <div className="text-center py-12 animate-fadeIn">
            <h1 className="text-4xl font-black uppercase tracking-tight mb-2">Welcome Back.</h1>
            <p className="text-sm font-medium text-gray-600 max-w-xs mx-auto">Tap the gear icon on the top right to deploy and manage your premium SaaS configurations.</p>
          </div>
        )}

        {settingsOpen && (
          <div className="space-y-6 animate-fadeIn origin-top">
            {/* CARD 1: SHARE STORE */}
            <section className="bg-white/75 backdrop-blur-md border-[3px] border-black rounded-3xl p-5 transition-transform hover:scale-[1.01]">
              <h2 className="text-lg font-black uppercase tracking-wider mb-4 border-b-[2.5px] border-black pb-2">Share Store</h2>
              <div className="flex flex-col sm:flex-row items-center gap-5">
                <div className="w-40 h-40 border-[3px] border-black bg-white rounded-2xl flex items-center justify-center p-2">
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="Store QR Code" className="w-full h-full object-contain bg-lime-300" />
                  ) : (
                    <div className="w-4 h-4 bg-black rounded-full animate-ping" />
                  )}
                </div>
                
                <div className="w-full flex-1 space-y-3">
                    <div className="bg-lime-300 border-[3px] border-black rounded-xl p-2.5 text-xs font-mono break-all font-bold text-black">
                        {profile?.shareLink}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={handleCopyLink} className="py-2 px-3 border-[2.5px] border-black bg-lime-300 text-black rounded-xl text-xs font-black uppercase active:translate-y-0.5 transition-all">
                          Copy Link
                        </button>
                        <a href={`${window.location.origin}/food/${uid}`} target="_blank" rel="noreferrer" className="py-2 px-3 border-[2.5px] border-black bg-lime-300 text-black rounded-xl text-xs font-black uppercase text-center active:translate-y-0.5 transition-all">
                          Open Store
                        </a>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={handleShareLink} className="w-full py-2.5 border-[2.5px] border-black bg-lime-300 text-black rounded-xl text-xs font-black uppercase active:translate-y-0.5 transition-all">
                          ⚡ Share Link
                        </button>
                        <button 
                          onClick={handleDownloadQR} 
                          disabled={!qrCodeUrl}
                          className="w-full py-2.5 border-[2.5px] border-black bg-white text-black rounded-xl text-xs font-black uppercase active:translate-y-0.5 transition-all disabled:opacity-50 disabled:pointer-events-none"
                        >
                          💾 Download QR
                        </button>
                    </div>
                </div>
              </div>
            </section>

            {/* CARD 2: RESTAURANT PROFILE */}
            <section className="bg-white/75 backdrop-blur-md border-[3px] border-black rounded-3xl p-5">
              <h2 className="text-lg font-black uppercase tracking-wider mb-4 border-b-[2.5px] border-black pb-2">Restaurant Profile</h2>
              <form onSubmit={handleSaveChanges} className="space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider mb-1">Brand Name {isVerified && <VerifiedBadge />}</label>
                  <input 
                    type="text" 
                    value={formBrandName} 
                    onChange={(e) => setFormBrandName(e.target.value)}
                    className="w-full bg-white border-[3px] border-black rounded-xl p-2.5 text-sm font-bold focus:bg-lime-300/10 focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider mb-1">Brand Bio</label>
                  <textarea 
                    value={formBrandBio}
                    onChange={(e) => setFormBrandBio(e.target.value)}
                    rows={2}
                    className="w-full bg-white border-[3px] border-black rounded-xl p-2.5 text-sm font-bold focus:bg-lime-300/10 focus:outline-none transition-colors resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider mb-1">Store Address</label>
                  <input 
                    type="text" 
                    value={formAddress} 
                    placeholder="e.g. 123 Foodie Street, Suite 4B"
                    onChange={(e) => setFormAddress(e.target.value)}
                    className="w-full bg-white border-[3px] border-black rounded-xl p-2.5 text-sm font-bold focus:bg-lime-300/10 focus:outline-none transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider mb-1">Opening Time</label>
                    <input 
                      type="time" 
                      value={formOpeningTime}
                      onChange={(e) => setFormOpeningTime(e.target.value)}
                      className="w-full bg-white border-[3px] border-black rounded-xl p-2.5 text-sm font-bold focus:outline-none focus:bg-lime-300/10"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider mb-1">Closing Time</label>
                    <input 
                      type="time" 
                      value={formClosingTime}
                      onChange={(e) => setFormClosingTime(e.target.value)}
                      className="w-full bg-white border-[3px] border-black rounded-xl p-2.5 text-sm font-bold focus:outline-none focus:bg-lime-300/10"
                    />
                  </div>
                </div>
                <button type="submit" className="w-full py-3 mt-2 border-[2.5px] border-black bg-lime-300 rounded-xl text-sm font-black uppercase active:translate-y-0.5 transition-all">
                  Save Changes
                </button>
              </form>
            </section>

            {/* CARD 3: ACCOUNT INFORMATION */}
            <section className="bg-white/75 backdrop-blur-md border-[3px] border-black rounded-3xl p-5">
              <h2 className="text-lg font-black uppercase tracking-wider mb-4 border-b-[2.5px] border-black pb-2">Account Information</h2>
              <div className="space-y-2.5">
                {[
                  { label: "User Email", value: email || "N/A" },
                  { label: "Online Status", value: profile?.onlineStatus ? "🟢 ONLINE" : "🔴 OFFLINE" },
                  { label: "Firebase UID", value: uid },
                  { label: "Store Address", value: profile?.address || "No address assigned" }, 
                  { label: "Created Date", value: profile?.createdAt ? profile.createdAt.toDate().toLocaleString() : "N/A" },
                  { label: "Last Updated Date", value: profile?.updatedAt ? profile.updatedAt.toDate().toLocaleString() : "N/A" }
                ].map((row, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:justify-between sm:items-center bg-white/50 p-2 border-[2.5px] border-black rounded-xl">
                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-wider">{row.label}</span>
                    <span className="text-xs font-bold font-mono truncate max-w-full sm:max-w-xs">{row.value}</span>
                  </div>
                ))}
              </div>
            </section>
            {/* CARD: DATA & ACCOUNT MANAGEMENT */}
            <section className="bg-white/75 backdrop-blur-md border-[3px] border-black rounded-3xl p-5">
              <h2 className="text-lg font-black uppercase tracking-wider mb-4 border-b-[2.5px] border-black pb-2">
                Data & Account Actions
              </h2>
              <p className="text-xs font-semibold text-gray-600 mb-4">
                Export your store parameters and order logs, or permanently delete your account data.
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleDownloadData}
                  disabled={isDownloading}
                  className="py-3 px-4 border-[2.5px] border-black bg-lime-300 hover:bg-lime-400 text-black rounded-2xl text-xs font-black uppercase flex items-center justify-center gap-2 active:translate-y-0.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50"
                >
                  {isDownloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                  <span>{isDownloading ? "Exporting..." : "Download My Data"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="py-3 px-4 border-[2.5px] border-black bg-red-100 hover:bg-red-200 text-red-700 rounded-2xl text-xs font-black uppercase flex items-center justify-center gap-2 active:translate-y-0.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all"
                >
                  <Trash2 className="w-4 h-4 text-red-600" />
                  <span>Delete Account & Data</span>
                </button>
              </div>
            </section>

            {/* CARD 4: VIN WALLET */}
            {/* CARD 4: STRIPE LIVE EARNINGS */}
            <section className="bg-white/75 backdrop-blur-md border-[3px] border-black rounded-3xl p-5">
              <div className={styles.glassCard}>
                <h3>Account & Ledger</h3>
                <div className={styles.metaRow}><strong>UID:</strong> <span className={styles.codeText}>{uid}</span></div>
                <div className={styles.metaRow}><strong>Status:</strong> <span>{profile?.status || 'Active'}</span></div>
                
                {/* Stripe Connector Sub-section */}
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

                        {/* VERIFY CONNECTION BUTTON FOR UNONBOARDED ACCOUNTS */}
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
                        {/* 1. Liquid Available Balance */}
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
            </section>

            {/* CARD 5: CATALOGUE */}
            <section className="bg-white/75 backdrop-blur-md border-[3px] border-black rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black uppercase tracking-wider">Catalogue</h2>
                  <div className="flex items-center gap-3 mt-1.5 text-xs font-bold">
                    <span style={{ backgroundColor: "#bef264" }} className="border-[1px] border-black px-2 py-0.5 rounded-md">
                      Status: Active
                    </span>
                    <span>•</span>
                    <span>{catalogueCount} Products Live</span>
                  </div>
                </div>
                <button
                    onClick={() => setPage('catalogue')}
                    style={{ backgroundColor: "#bef264" }}
                    className="py-2.5 px-4 border-[1px] border-black rounded-xl text-xs font-black uppercase active:translate-y-0.5 transition-all whitespace-nowrap self-stretch sm:self-center text-center"
                >
                  Manage Items →
                </button>
            </section>
          </div>
        )}

        {/* --- ORDERS STREAM CONTAINER --- */}
        {!settingsOpen && activeTab === "orders" && (
          <section className="space-y-4 max-w-2xl mx-auto mt-6 animate-fadeIn">
            <h2 className="text-xl font-black">
              Incoming Orders {!isVerified && <span className="text-xs font-normal text-gray-500">(Daily Cap: {incomingOrders.filter(o => o.status !== "accepted" && o.status !== "rejected").length}/10)</span>}
            </h2>

            {incomingOrders.filter(order => order.status !== "accepted" && order.status !== "rejected").length === 0 ? (
              <p className="text-center font-bold text-gray-500 py-6">No incoming orders right now.</p>
            ) : (
              incomingOrders
                .filter((order) => order.status !== "accepted" && order.status !== "rejected")
                .map((order) => (
                  <div
                      key={order.id}
                      className="border-[3px] border-black rounded-3xl p-4 bg-white dynamic-neubrutalism-card transition-all duration-300"
                  >
                      <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                              <h3 className="font-black text-lg">{order.customerName}</h3>
                              <p className="text-sm mt-1">Pickup: {order.pickupTime}</p>
                              <p className="text-sm mt-1">Status: {order.status}</p>
                              
                              {order.userMobilityStatus && (
                                <p className="text-xs font-black uppercase tracking-wide mt-1.5 px-2 py-0.5 rounded-md border border-black bg-amber-100 inline-block">
                                  Context: {order.userMobilityStatus} 
                                  {order.userMobilityStatus === 'in store' && order.tableNumber && ` (Table ${order.tableNumber})`}
                                </p>
                              )}
                          </div>

                          <div className="flex flex-col items-center mx-4 min-w-[90px]">
                              <p className="text-sm font-black text-lime-600 mb-1">
                                {order.fourDigitCode || "----"}
                              </p>
                              {orderQrCodes?.[order.id] && (
                                <img
                                    src={orderQrCodes[order.id]}
                                    alt="Order QR"
                                    className="w-16 h-16 border-2 border-black rounded-lg p-1 bg-white"
                                />
                              )}
                          </div>

                          <div className="flex gap-2">
                              <button
                                onClick={() => handleRejectOrder(order.id)}
                                className="w-10 h-10 border-2 border-black rounded-xl bg-red-200 font-bold hover:bg-red-300 transition-colors"
                              >
                                ✕
                              </button>
                              <button
                                onClick={() => handleAcceptOrder(order.id)}
                                className="w-10 h-10 border-2 border-black rounded-xl bg-lime-300 font-bold hover:bg-lime-400 transition-colors"
                              >
                                ✓
                              </button>
                          </div>
                      </div>

                      <div className="space-y-2 border-t border-black/10 pt-2">
                        {order.items.map((item, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span>{item.quantity}x {item.name}</span>
                              <span>€{(item.price * item.quantity).toFixed(2)}</span>
                            </div>
                        ))}
                      </div>
                  </div>
                ))
            )}
          </section>
        )}

        {/* --- ANALYTICS WORKSPACE --- */}
        {!settingsOpen && activeTab === "analytics" && (
            <section className="max-w-2xl mx-auto mt-6 bg-white border-[3px] border-black rounded-3xl p-5 space-y-3 animate-fadeIn">
                <h2 className="text-lg font-black uppercase">Analytics Workspace</h2>
                <div className="grid grid-cols-2 gap-3 text-sm font-bold">
                  <div className="p-3 border-[2px] border-black rounded-xl bg-gray-50">
                      Total Orders: {analytics?.totalOrders || 0}
                  </div>
                  <div className="p-3 border-[2px] border-black rounded-xl bg-lime-50 text-lime-700">
                      Accepted Total: {analytics?.acceptedOrders || 0}
                  </div>
                  <div className="p-3 border-[2px] border-black rounded-xl bg-red-50 text-red-700">
                      Rejected Total: {analytics?.rejectedOrders || 0}
                  </div>
                  
                  <div className="p-3 border-[2px] border-black rounded-xl col-span-2 bg-lime-100/50">
                      🔥 Most Accepted Item: <span className="font-black">{analytics?.mostAcceptedItem || "N/A"}</span> ({analytics?.mostAcceptedCount || 0} units)
                  </div>

                  <div className="p-3 border-[2px] border-black rounded-xl col-span-2 bg-red-100/50">
                      ⚠️ Most Rejected Item: <span className="font-black">{analytics?.mostRejectedItem || "N/A"}</span> ({analytics?.mostRejectedCount || 0} units)
                  </div>
                </div>
            </section>
        )}
      </main>

      {/* --- FLOATING BOTTOM RIGHT ACCEPTED ORDERS BUTTON --- */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setShowAcceptedModal(true)}
          className="bg-lime-400 text-black border-[3px] border-black font-black uppercase tracking-wider text-xs px-4 py-3 rounded-2xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-lime-300 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-all flex items-center gap-2"
        >
          <span>Accepted Orders</span>
          <span className="bg-black text-white rounded-full px-1.5 py-0.5 text-[10px]">
            {incomingOrders.filter(order => order.status === "accepted").length}
          </span>
        </button>
      </div>
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
              <button className={styles.glassButtonSecondary} onClick={() => setIsForgotPinOpen(false)} style={{ flex: 1 }}>Cancel</button>
              <button className={styles.glassButtonPrimary} onClick={handleConfirmNewPin} style={{ flex: 1 }}>Reset PIN</button>
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
      {/* --- DELETE ACCOUNT CONFIRMATION MODAL --- */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border-[4px] border-black rounded-3xl p-6 max-w-sm w-full shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center space-y-4 animate-fadeIn">
            <div className="w-14 h-14 bg-red-100 border-[3px] border-black rounded-full flex items-center justify-center mx-auto text-red-600">
              <Trash2 className="w-7 h-7" />
            </div>

            <h3 className="text-xl font-black uppercase tracking-tight">Delete Account?</h3>
            
            <p className="text-xs font-bold text-gray-700 leading-relaxed">
              Are you sure you want to delete your store profile and account? This action is <strong className="text-black underline">permanent</strong> and cannot be undone.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-3 border-[2.5px] border-black bg-gray-100 text-black rounded-xl text-xs font-black uppercase hover:bg-gray-200 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccountAndData}
                disabled={isDeleting}
                className="flex-1 py-3 border-[2.5px] border-black bg-red-500 text-white rounded-xl text-xs font-black uppercase hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{isDeleting ? "Deleting..." : "Confirm Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}