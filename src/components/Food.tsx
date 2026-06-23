import React, { useState, useEffect } from 'react';
import { firestore as db } from '../firebase'; // Adjust to your firebase configuration path
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
  deleteDoc,
} from 'firebase/firestore';
import QRCode from 'qrcode';
import RestaurantCatalogue from './OrderStoreCatalogue';
import { getDatabase, ref, onValue } from "firebase/database";

// --- Type Definitions ---
interface RestaurantData {
  brandName: string;
  brandBio: string;
  openingTime: string;
  closingTime: string;
  shareLink: string;
  onlineStatus: boolean;
  createdAt: Timestamp | null;
  updatedAt: Timestamp | null;
}
interface IncomingOrder {
  id: string;
  customerName: string;
  pickupTime: string;
  status: string;
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

  // Editable Form State
  const [formBrandName, setFormBrandName] = useState<string>('');
  const [formBrandBio, setFormBrandBio] = useState<string>('');
  const [formOpeningTime, setFormOpeningTime] = useState<string>('');
  const [formClosingTime, setFormClosingTime] = useState<string>('');

  const catalogueCount = ""; 
  const [catalogueOpen, setCatalogueOpen] = useState<boolean>(false);
  const [page, setPage] = useState<'dashboard' | 'catalogue'>('dashboard');

  const shareLink = `${window.location.origin}/food/${uid}`;
  const [incomingOrders, setIncomingOrders] = useState<IncomingOrder[]>([]);

  const [activeTab, setActiveTab] = useState<"orders" | "analytics">("orders");

  const handleLogout = async () => {
    try {
        const auth = getAuth();
        await signOut(auth);
        window.location.href = '/login'; // or your landing page
    } catch (err) {
        console.error("Logout failed:", err);
    }
  };
  const [isVerified, setIsVerified] = useState(false);
  const [analytics, setAnalytics] = useState({
    totalOrders: 0,
    acceptedOrders: 0,
    rejectedOrders: 0,
    mostOrderedItem: "",
    mostOrderedCount: 0,
  });
    const calculateAnalytics = (orders: IncomingOrder[]) => {
        let accepted = 0;
        let rejected = 0;

        const itemCountMap: Record<string, number> = {};

        orders.forEach((order) => {
            if (order.status === "accepted") accepted++;
            if (order.status === "rejected") rejected++;

            order.items.forEach((item) => {
            const key = item.name;
            itemCountMap[key] = (itemCountMap[key] || 0) + item.quantity;
            });
        });

        let mostOrderedItem = "";
        let mostOrderedCount = 0;

        Object.entries(itemCountMap).forEach(([item, count]) => {
            if (count > mostOrderedCount) {
            mostOrderedItem = item;
            mostOrderedCount = count;
            }
        });

        setAnalytics({
            totalOrders: orders.length,
            acceptedOrders: accepted,
            rejectedOrders: rejected,
            mostOrderedItem,
            mostOrderedCount,
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
            openingTime: '08:00',
            closingTime: '22:00',
            shareLink: `${window.location.origin}/food/${uid}`,
            onlineStatus: true,
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
        setFormOpeningTime(data.openingTime || '');
        setFormClosingTime(data.closingTime || '');

        const shareLink = `${window.location.origin}/food/${uid}`;
        QRCode.toDataURL(shareLink)
        .then(url => setQrCodeUrl(url));
      }
      setLoading(false);
    });

    return () => unsubscribeDoc();
  }, [uid, authLoading]);

  // --- UI Action Handlers ---
  const handleCopyLink = () => {
    navigator.clipboard.writeText(
        `${window.location.origin}/food/${uid}`
    );
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
        if (!uid) return;

        const q = query(
            collection(db, "orders"),
            where("restaurantUid", "==", uid)
        );

        let firstLoad = true;

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const orders: IncomingOrder[] = [];

            snapshot.forEach((doc) => {
            orders.push({
                id: doc.id,
                ...doc.data(),
            } as IncomingOrder);
            });

            if (!firstLoad && orders.length > incomingOrders.length) {
            const audio = new Audio("/notification.mp3");
            audio.play().catch(() => {});
            }

            firstLoad = false;
            calculateAnalytics(orders); 
            setIncomingOrders(orders);
        });

        return () => unsubscribe();
    }, [uid]);

    const handleAcceptOrder = async (orderId: string) => {
        try {
            await updateDoc(
            doc(db, "orders", orderId),
            {
                status: "accepted",
            }
            );
        } catch (err) {
            console.error(err);
        }
    };
    const handleRejectOrder = async (orderId: string) => {
        try {
            await deleteDoc(
            doc(db, "orders", orderId)
            );
        } catch (err) {
            console.error(err);
        }
    };

    const handleSaveChanges = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!uid || !profile) return; // Ensure profile exists

        try {
            const { doc, setDoc, serverTimestamp } = await import('firebase/firestore');
            const docRef = doc(db, 'restaurantprofile', uid);
            
            await setDoc(docRef, {
            brandName: formBrandName,
            brandBio: formBrandBio,
            openingTime: formOpeningTime,
            closingTime: formClosingTime,
            shareLink: profile.shareLink, // 🔥 Keep the existing shareLink safe!
            updatedAt: serverTimestamp(),
            }, { merge: true });

            alert("Changes saved successfully!");
        } catch (error) {
            console.error("Error updating profile:", error);
            alert("Failed to save changes.");
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
    <div className="min-h-screen bg-white text-black font-sans antialiased p-4 relative overflow-x-hidden select-none pb-12">
      
      {/* --- TOP NAVIGATION SECTION --- */}
      <header className="w-full flex items-center justify-between gap-3 max-w-2xl mx-auto z-40 relative">
        {/* Dropdown Button */}
        <button 
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-12 h-12 flex items-center justify-center bg-lime-300 border-[3px] border-black rounded-2xl active:translate-y-0.5 active:bg-lime-400 transition-all duration-150"
        >
          <span className={`text-xs transform transition-transform duration-200 block ${dropdownOpen ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {/* Central Brand Pill */}
        <div className="flex-1 bg-white border-[3px] border-black rounded-full py-2.5 px-4 flex items-center justify-center text-center">
          <span className="font-extrabold text-sm tracking-tight truncate max-w-[180px] sm:max-w-xs">
            {profile?.brandName || "My Restaurant"} {isVerified && <VerifiedBadge />}
          </span>
        </div>

        {/* Settings Gear Icon */}
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
            <li className="p-3 hover:bg-lime-300 cursor-pointer transition-colors"  onClick={() => {  setActiveTab("orders"); setDropdownOpen(false); }}>Orders ({incomingOrders.length})</li>
            <li className="p-3 hover:bg-lime-300 cursor-pointer transition-colors"  onClick={() => { setActiveTab("analytics"); setDropdownOpen(false); }}>Analysis</li>
          </ul>
        </div>
      )}

      {/* --- PREMIUM DASHBOARD & SETTINGS PANEL --- */}
      <main className="max-w-2xl mx-auto mt-8 space-y-6">
        
        {!settingsOpen && (
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
                {/* QR Generation Area */}
                <div className="w-40 h-40 border-[3px] border-black bg-white rounded-2xl flex items-center justify-center p-2">
                  {qrCodeUrl ? (
                    <img src={qrCodeUrl} alt="Store QR Code" className="w-full h-full object-contain bg-lime-300" />
                  ) : (
                    <div className="w-4 h-4 bg-black rounded-full animate-ping" />
                  )}
                </div>
                
                {/* Links and Controls */}
                <div className="w-full flex-1 space-y-3">
                    <div className="bg-lime-300 border-[3px] border-black rounded-xl p-2.5 text-xs font-mono break-all font-bold text-black">
                        {profile?.shareLink}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={handleCopyLink} className="py-2 px-3 border-[2.5px] border-black bg-lime-300 text-black rounded-xl text-xs font-black uppercase active:translate-y-0.5 transition-all">
                          Copy Link
                        </button>
                        <a  href={`${window.location.origin}/food/${uid}`} target="_blank" rel="noreferrer" className="py-2 px-3 border-[2.5px] border-black bg-lime-300 text-black rounded-xl text-xs font-black uppercase text-center active:translate-y-0.5 transition-all">
                          Open Store
                        </a>
                    </div>
                    <button onClick={handleShareLink} className="w-full py-2.5 border-[2.5px] border-black bg-lime-300 text-black rounded-xl text-xs font-black uppercase active:translate-y-0.5 transition-all">
                      ⚡ Share Link
                    </button>
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

            {/* CARD 4: CATALOGUE */}
            <section className="bg-white/75 backdrop-blur-md border-[3px] border-black rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-black uppercase tracking-wider">Catalogue</h2>
                    <div className="flex items-center gap-3 mt-1.5 text-xs font-bold">
                    {/* Updated status badge to match the custom hex and a 1px border */}
                    <span 
                        style={{ backgroundColor: "#bef264" }} 
                        className="border-[1px] border-black px-2 py-0.5 rounded-md"
                    >
                        Status: Active
                    </span>
                    <span>•</span>
                    <span>{catalogueCount} Products Live</span>
                    </div>
                </div>
                
                {/* Updated Manage Items button with custom hex and a 1px border */}
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
        {activeTab === "orders" && incomingOrders.length > 0 && (
            <section className="space-y-4 max-w-2xl mx-auto mt-6">
                <h2 className="text-xl font-black">Incoming Orders</h2>

                {incomingOrders.map((order) => (
                <div
                    key={order.id}
                    className="border-[3px] border-black rounded-3xl bg-white p-4"
                >
                    <div className="flex justify-between items-center mb-3">
                    <div>
                        <h3 className="font-black">{order.customerName}</h3>
                        <p className="text-sm">Pickup: {order.pickupTime}</p>
                        <p className="text-sm">Status: {order.status}</p>
                    </div>

                    <div className="flex gap-2">
                        <button
                        onClick={() => handleRejectOrder(order.id)}
                        className="w-10 h-10 border-2 border-black rounded-xl bg-red-200"
                        >
                        ✕
                        </button>

                        <button
                        onClick={() => handleAcceptOrder(order.id)}
                        className="w-10 h-10 border-2 border-black rounded-xl bg-lime-300"
                        >
                        ✓
                        </button>
                    </div>
                    </div>

                    <div className="space-y-2">
                    {order.items.map((item, index) => (
                        <div key={index} className="flex justify-between">
                        <span>
                            {item.quantity}x {item.name}
                        </span>
                        <span>€{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                    ))}
                    </div>
                </div>
                ))}
            </section>
        )}
        {activeTab === "analytics" && (
            <section className="max-w-2xl mx-auto mt-6 bg-white border-[3px] border-black rounded-3xl p-5 space-y-3">
                <h2 className="text-lg font-black uppercase">Analytics</h2>

                <div className="grid grid-cols-2 gap-3 text-sm font-bold">
                <div className="p-3 border-[2px] border-black rounded-xl">
                    Total Orders: {analytics.totalOrders}
                </div>

                <div className="p-3 border-[2px] border-black rounded-xl">
                    Accepted: {analytics.acceptedOrders}
                </div>

                <div className="p-3 border-[2px] border-black rounded-xl">
                    Rejected: {analytics.rejectedOrders}
                </div>

                <div className="p-3 border-[2px] border-black rounded-xl col-span-2">
                    Most Ordered: {analytics.mostOrderedItem || "N/A"} (
                    {analytics.mostOrderedCount})
                </div>
                </div>
            </section>
        )}
      </main>
    </div>
  );
}