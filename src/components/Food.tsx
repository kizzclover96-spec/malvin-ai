import React, { useState, useEffect } from 'react';
import { firestore as db } from '../firebase'; 
import { getAuth, onAuthStateChanged, signOut  } from 'firebase/auth';
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
import { useBusinessWallet } from "../hooks/useBusinessWallet";
import styles from './salonDashboard.module.css';
import ConfirmQRScanner from './ConfirmQRScanner';

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
  const { balance, currency } = useBusinessWallet();

  // Editable Form State
  const [formBrandName, setFormBrandName] = useState<string>('');
  const [formBrandBio, setFormBrandBio] = useState<string>('');
  const [formAddress, setFormAddress] = useState<string>(''); 
  const [formOpeningTime, setFormOpeningTime] = useState<string>('');
  const [formClosingTime, setFormClosingTime] = useState<string>('');

  const catalogueCount = ""; 
  const [page, setPage] = useState<'dashboard' | 'catalogue'>('dashboard');

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
  // First-Time Pin Setup States
  const [setupPin, setSetupPin] = useState('');
  const [confirmSetupPin, setConfirmSetupPin] = useState('');
  const [isRegisteringPin, setIsRegisteringPin] = useState(false);
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
    alert("Registering your secure PIN..."); // Replaced showToast with alert for now

    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const setupPinFn = httpsCallable(getFunctions(), 'initializeMerchantPin');

      await setupPinFn({
        pin: setupPin,
        merchantType: "food"
      });

      alert("🎉 Security PIN successfully established! You can now withdraw funds securely.");
      
      // FIX: Update local profile state instead of non-existent "food"
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
    const currentBalance = profile?.walletBalance || 0;

    if (currentBalance <= 0) {
      alert("No profits available to withdraw.");
      return;
    }
    
    // FIX: Read from profile instead of food
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
    // FIX: Read from profile instead of food
    if (!profile || (profile?.walletBalance || 0) <= 0) {
      alert("No balance available to withdraw.");
      setIsPinModalOpen(false);
      return;
    }

    if (pinInput.length !== 4 || isNaN(Number(pinInput))) {
      alert("Invalid PIN format. Must be a 4-digit number.");
      return;
    }

    setIsProcessingPayout(true);
    alert("Processing security clearing... Please wait.");

    try {
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions();
      const requestPayout = httpsCallable(functions, 'requestPayout');

      const response: any = await requestPayout({
        amount: profile.walletBalance,
        pin: pinInput,
        merchantType: "food" 
      });

      if (response.data?.success) {
        alert(`🎉 Success! ${response.data.message}`);
        setIsPinModalOpen(false);
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
        businessId: uid, // Make sure 'uid' is defined as the restaurant's document ID
        merchantType: "food" // 👈 Set to "food"
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

        const profileRef = ref(rtdb, `users/${uid}/profile`);

        const unsubscribe = onValue(profileRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
              setIsVerified(data.isVerified || false);
            }
        });

        return () => unsubscribe();
  }, [uid]);

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
      }
      setAuthLoading(false);
    });

    return () => unsubscribeAuth();
  }, []);

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

            // Determine if the limit is reached
            const limitReached = !isVerified && orders.length >= 10;

            // 🌟 SYNC COOLDOWN STATE TO THE PUBLIC RESTAURANT PROFILE
            try {
              const profileDocRef = doc(db, 'restaurantprofile', uid);
              await updateDoc(profileDocRef, {
                orderLimitReached: limitReached,
                isVerified: isVerified
              });
            } catch (error) {
              console.error("Failed to sync limit state to Firestore:", error);
            }

            if (limitReached) {
              setIncomingOrders(orders.slice(0, 10));
              setShowPremiumPopup(true);
            } else {
              setIncomingOrders(orders);
            }
        });

        return () => unsubscribe();
  }, [uid, isVerified]);

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
            
            await setDoc(docRef, {
              brandName: formBrandName,
              brandBio: formBrandBio,
              address: formAddress, 
              openingTime: formOpeningTime,
              closingTime: formClosingTime,
              shareLink: profile.shareLink, 
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
    
    let targetOrderId = scannedOutput.trim();

    // 1. Safe parsing: If a different route gives a full URL link path, extract just the end ID
    if (targetOrderId.includes('/')) {
      targetOrderId = targetOrderId.split('/').pop() || targetOrderId;
    }

    // 2. Safe parsing: If a different template formats it as an object
    try {
      const parsed = JSON.parse(targetOrderId);
      if (parsed.orderId) targetOrderId = parsed.orderId;
    } catch (e) {
      // Keep targetOrderId unchanged if it's a plain text token
    }

    try {
      const matchedOrder = incomingOrders.find(o => o.id === targetOrderId);
      
      if (matchedOrder) {
        const orderDocRef = doc(db, 'orders', targetOrderId);
        await deleteDoc(orderDocRef);
        
        setScanResultMsg({ 
          type: 'success', 
          text: `Order verified for ${matchedOrder.customerName}! Ticket removed.` 
        });
      } else {
        setScanResultMsg({ 
          type: 'error', 
          text: "Order doesn't exist or was already cleared." 
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
  if (page === 'catalogue') { return <RestaurantCatalogue onBack={() => setPage('dashboard')} />;}
  
  return (
    <div className="min-h-screen bg-white text-black font-sans antialiased p-4 relative overflow-x-hidden select-none pb-24">
      
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

            {/* CARD 4: VIN WALLET */}
            <section className="bg-white/75 backdrop-blur-md border-[3px] border-black rounded-3xl p-5">
              <div className={styles.metaRow}>
                <strong>VIN Wallet Balance:</strong> 
                <span> € {(profile?.walletBalance || 0).toFixed(2)}</span>
              </div>
              {/* Stripe Connector Sub-section */}
              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #222' }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '14px', color: '#fff' }}>Direct Credit Card Payments</h4>
                
                {!((profile as any)?.stripeOnboarded) ? (
                  <div>
                    <p style={{ color: '#888', fontSize: '12px', margin: '0 0 12px 0' }}>
                      Connect your Stripe Account to receive card payments directly from customers.
                    </p>
                    <button 
                      type="button" 
                      className={styles.glassButtonPrimary} 
                      onClick={handleConnectStripe}
                      disabled={isSettingUpStripe}
                      style={{ background: '#635BFF', color: '#fff', border: 'none' }}
                    >
                      {isSettingUpStripe ? "Connecting..." : "Link Stripe Account"}
                    </button>
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4BB543', fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>
                      <CheckCircle size={16} /> Direct Payments Enabled
                    </div>
                    <button
                      type="button"
                      className={styles.glassButtonSecondary}
                      onClick={handleCheckStripeStatus}
                      disabled={stripeLoading}
                    >
                      {stripeLoading ? "Checking..." : "Refresh Status"}
                    </button>
                  </div>
                )}
              </div>
              <button type="button" className={styles.glassButtonPrimary} style={{ marginTop: '12px' }} onClick={handleWithdrawProfit}>
                Withdraw Profit
              </button>
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
    </div>
  );
}