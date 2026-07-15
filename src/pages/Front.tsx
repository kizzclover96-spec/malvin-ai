import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, Settings, Search, Home, Wallet as WalletIcon, QrCode, X, 
  User, Save, Mail, Loader2, CheckCircle2, AlertCircle,
  Clock, Heart, Bell, Moon, Globe, LogOut, ChevronRight, ChevronDown, Calendar, DollarSign
} from 'lucide-react';
import { doc, getDoc, setDoc, collection, collectionGroup, query, where, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { firestore as db } from '../firebase'; 
import { auth } from "../firebase"; 
import QRCode from 'qrcode'; // Add QRCode to render the scan-ready ticket receipts

// --- MODULAR FLOW COMPONENT IMPORTS ---
import { Wallet } from '../components/Wallet';
import { QRScannerView } from '../components/QRScannerView';
import { StoreFront } from '../components/StoreFront';
import { RecentBusinesses } from '../components/RecentBusinesses';

export const Front: React.FC = () => {
  const user = auth.currentUser;
  
  // Layout Router View Layer Configurations
  const [activeTab, setActiveTab] = useState<'home' | 'wallet'>('home');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [activeStoreUid, setActiveStoreUid] = useState<string | null>(null);
  
  // State tracking whether historical list has rendering records
  const [hasRecentItems, setHasRecentItems] = useState(false);

  // App & Settings states
  const [vinQuery, setVinQuery] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPersonalDetailsModalOpen, setIsPersonalDetailsModalOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Active booking receipts state
  const [activeReceipts, setActiveReceipts] = useState<any[]>([]);
  const [receiptQrs, setReceiptQrs] = useState<Record<string, string>>({});
  const [isReceiptsDropdownOpen, setIsReceiptsDropdownOpen] = useState(false);

  // Toast State
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const handleBusinessVisit = async (inputUidOrUrl: string) => {
    if (!user?.uid) return;

    const rawInput = inputUidOrUrl.trim();
    let cleanUid = rawInput;

    if (cleanUid.includes('/')) {
        const segments = cleanUid.split('/');
        cleanUid = segments.filter(Boolean).pop() || cleanUid;
    }

    const storefrontTarget = rawInput.includes('http') 
        ? rawInput 
        : `https://malvinai.com/salon/${rawInput}`;

    setActiveStoreUid(storefrontTarget);

    try {
        const recentDocRef = doc(db, 'customers', user.uid, 'recentBusinesses', cleanUid);
        const docSnap = await getDoc(recentDocRef);
        
        // 🟢 Save cleanly without blocking prompt modals
        await setDoc(recentDocRef, {
        businessUid: storefrontTarget,
        lastVisited: new Date().toISOString(),
        // Keep existing customName if it's already there, otherwise default to 'Saved Store'
        customName: docSnap.exists() ? (docSnap.data().customName || 'Saved Store') : 'Saved Store'
        }, { merge: true });

    } catch (err) {
        console.error("Failed to log business visit history item:", err);
    }
  };

  // Profile data synchronization
  useEffect(() => {
    if (!user?.uid) return;
    const fetchUserProfile = async () => {
      try {
        const docRef = doc(db, 'customers', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFullName(data.fullName || '');
          setPhone(data.phone || '');
          setAddress(data.address || '');
        }
      } catch (err) {
        console.error('Error reading profile ledger data node:', err);
      }
    };
    fetchUserProfile();
  }, [user]);

  // Sync user active receipts / booking tickets in real-time
  useEffect(() => {
    if (!user?.uid) return;

    // We query all subcollections named 'appointments' where customerUid matches the user's uid
    const ticketsQuery = query(
      collectionGroup(db, 'appointments'),
      where('customerUid', '==', user.uid)
    );

    const unsubscribe = onSnapshot(ticketsQuery, async (snapshot) => {
      const appointments: any[] = [];
      snapshot.forEach((doc) => {
        appointments.push({ id: doc.id, ...doc.data() });
      });
      
      // 🟢 Filter appointments where paymentStatus is true OR status is 'paid'
      const activeOnly = appointments.filter(app => app.paymentStatus === true || app.status === 'paid');
      setActiveReceipts(activeOnly);

      // Generate local QR codes for the active receipts
      const qrMap: Record<string, string> = {};
      for (const app of activeOnly) {
        const refId = app.referenceId || app.id;
        if (refId) {
          try {
            // Generate QR containing key scan details
            qrMap[refId] = await QRCode.toDataURL(
              JSON.stringify({ 
                ticketId: app.id,
                referenceId: refId, 
                businessUid: app.targetBusinessUid || ""
              })
            );
          } catch (err) {
            console.error("Failed to generate ticket QR:", err);
          }
        }
      }
      setReceiptQrs(qrMap);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'customers', user.uid), {
        fullName, phone, address, email: user.email,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      showToast('success', 'Profile assets safely committed to internal storage.');
      setIsPersonalDetailsModalOpen(false); 
    } catch (err) {
      showToast('error', 'Failed to push configuration properties to database index.');
    } finally {
      setIsSaving(false);
    }
  };

  // Handles manual link submissions identically to the QR Camera scan pipeline
  const handleQueryLaunch = () => {
    const cleanQuery = vinQuery.trim();
    if (!cleanQuery) return;

    showToast('success', `Opening linked context page...`);
    handleBusinessVisit(cleanQuery); // 🟢 Changed from setActiveStoreUid
    setVinQuery('');
  };

  const handleLogout = async () => {
    try { await signOut(auth); } catch (err) {
      showToast('error', 'An operational fault interrupted the checkout pipeline.');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-sans">
        <Loader2 className="w-6 h-6 text-[#E53935] animate-spin" />
      </div>
    );
  }

  // 🟢 SWAP ENTIRE LAYOUT IF BUSINESS IS SCANNED / VISITED
  if (activeStoreUid) {
    return (
      <StoreFront
        businessUid={activeStoreUid}
        userUid={user.uid}
        userWalletBalance={0}
        onExecutePayment={async () => {}}
        onExit={() => setActiveStoreUid(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900 font-sans relative flex flex-col justify-between p-6 pb-28">
      
      {/* TOAST NOTIFICATION CONTAINER */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 left-6 right-6 z-50 mx-auto max-w-sm p-4 rounded-2xl border flex items-center gap-3 backdrop-blur-xl shadow-2xl ${
              toast.type === 'success' ? 'bg-emerald-50/90 border-emerald-500/20 text-emerald-900' : 'bg-rose-50/90 border-rose-500/20 text-rose-900'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />}
            <span className="text-xs font-semibold tracking-wide leading-tight">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP BAR */}
      <motion.header 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full flex items-center justify-between z-10"
      >
        <motion.button 
          whileTap={{ scale: 0.92 }}
          className="icon-button p-3 hover:bg-neutral-100 rounded-full transition-colors text-[#E53935]"
        >
          <Menu className="w-6 h-6" />
        </motion.button>

        <div className="text-center max-w-[60%] truncate">
          <h2 className="text-sm font-black text-neutral-900 tracking-tight truncate">Hi, {fullName || user.email}</h2>
          <p className="text-[11px] font-bold text-neutral-400 uppercase tracking-widest mt-0.5">Welcome back</p>
        </div>

        <motion.button 
          whileTap={{ scale: 0.92 }}
          onClick={() => setIsSettingsOpen(true)}
          className="icon-button p-3 hover:bg-neutral-100 rounded-full transition-colors text-[#E53935]"
        >
          <Settings className="w-6 h-6" />
        </motion.button>
      </motion.header>

      {/* BODY WORKSPACE CONTAINER */}
      <div className="flex-grow flex flex-col justify-start pt-12 w-full">
        {activeTab === 'home' ? (
          <motion.div
            key="home-view"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full flex flex-col items-center"
          >
            <motion.main 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md mx-auto flex flex-col items-center text-center px-4"
            >
              {/* 🟢 HIDES SCAN BANNER ELEMENT IF ITEMS EXIST IN HISTORICAL LAYER */}
              {!hasRecentItems && (
                <h1 className="text-2xl font-black text-neutral-900 tracking-tight leading-snug mb-8">
                  Scan a VINQR or input <br />
                  <span className="text-[#E53935]">VINLIKE</span> to continue.
                </h1>
              )}

              <div className="w-full relative shadow-[0_16px_40px_rgba(0,0,0,0.02)] group mb-6">
                <input
                  type="text"
                  placeholder="Enter VINLIKE..."
                  value={vinQuery}
                  onChange={(e) => setVinQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleQueryLaunch()}
                  className="w-full bg-neutral-50 border border-neutral-200 rounded-[2rem] pl-6 pr-14 py-4.5 text-sm font-medium text-neutral-900 placeholder-neutral-400 focus:outline-none focus:border-[#E53935] focus:bg-white focus:ring-4 focus:ring-[#E53935]/5 transition-all"
                />
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleQueryLaunch}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-3 bg-neutral-100 hover:bg-[#E53935] text-neutral-500 hover:text-white rounded-full transition-all"
                >
                  <Search className="w-4 h-4" />
                </motion.button>
              </div>

              {/* 🟢 ACTIVE TICKETS / RECEIPTS DROPDOWN ACCORDION */}
              {activeReceipts.length > 0 && (
                <div className="w-full max-w-md bg-neutral-50 border border-neutral-200/80 rounded-[1.75rem] overflow-hidden mb-6 shadow-sm transition-all">
                  <button
                    onClick={() => setIsReceiptsDropdownOpen(!isReceiptsDropdownOpen)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-neutral-100/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center text-[#E53935]">
                        <QrCode className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-neutral-800 tracking-tight">
                        Active Booking Receipts ({activeReceipts.length})
                      </span>
                    </div>
                    <motion.div
                      animate={{ rotate: isReceiptsDropdownOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-4 h-4 text-neutral-400" />
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {isReceiptsDropdownOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: 'easeInOut' }}
                        className="border-t border-neutral-200 overflow-hidden"
                      >
                        <div className="p-4 space-y-4 max-h-[420px] overflow-y-auto">
                          {activeReceipts.map((receipt) => {
                            const refId = receipt.referenceId || receipt.id;
                            const qrData = receiptQrs[refId];
                            return (
                              <div 
                                key={receipt.id} 
                                className="bg-white border border-neutral-100 rounded-2xl p-4 flex flex-col items-center sm:flex-row sm:items-start justify-between gap-4 shadow-sm"
                              >
                                <div className="text-left space-y-1.5 flex-1 w-full">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-rose-500 bg-rose-50 px-2 py-0.5 rounded">
                                      Active Ticket
                                    </span>
                                    <span className="text-xs font-bold text-neutral-800 flex items-center gap-0.5">
                                      €{receipt.totalPrice}
                                    </span>
                                  </div>
                                  <h5 className="text-xs font-bold text-neutral-900 truncate">
                                    Client: {receipt.customerName || 'Anonymous'}
                                  </h5>
                                  <p className="text-[10px] text-neutral-400 font-medium">
                                    Ref ID: <code className="text-neutral-600 font-mono">{refId}</code>
                                  </p>

                                  {/* List Selected Services dynamically inside receipt card */}
                                  <h5 className="text-xs font-bold text-neutral-900 truncate">
                                    Client: {receipt.customerName || 'Anonymous'}
                                  </h5>
                                  <p className="text-[10px] text-neutral-400 font-medium">
                                    Ref ID: <code className="text-neutral-600 font-mono">{refId}</code>
                                  </p>

                                  {/* 🟢 PLACE THE NEW COMPATIBLE SERVICES RENDERER RIGHT HERE: */}
                                  {((receipt.selectedServices || receipt.services) && (receipt.selectedServices || receipt.services).length > 0) && (
                                    <div className="mt-2 space-y-1">
                                      <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">Services Selected:</span>
                                      {(receipt.selectedServices || receipt.services).map((service: any, sIdx: number) => (
                                        <div key={sIdx} className="flex justify-between items-center text-[11px] text-neutral-600 bg-neutral-50 px-2 py-1 rounded">
                                          <span className="truncate max-w-[120px]">{service.serviceName || service.name}</span>
                                          <span className="font-bold flex-shrink-0">€{service.price}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {(receipt.date || receipt.time) && (
                                    <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 font-semibold mt-2.5">
                                      <Calendar className="w-3 h-3 text-neutral-400" />
                                      <span>{receipt.date} at {receipt.time}</span>
                                    </div>
                                  )}
                                </div>
                                {qrData ? (
                                  <div className="flex-shrink-0 bg-neutral-50 p-2 rounded-xl border border-neutral-100 flex flex-col items-center">
                                    <img 
                                      src={qrData} 
                                      alt="Booking Ticket QR" 
                                      className="w-20 h-20"
                                    />
                                    <span className="text-[8px] font-black uppercase tracking-widest text-neutral-400 mt-1">Scan At Desk</span>
                                  </div>
                                ) : (
                                  <div className="w-20 h-20 bg-neutral-100 animate-pulse rounded-xl" />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.main>

            {/* HISTORICAL COMPONENT RENDERING ROW */}
            <RecentBusinesses 
              onSelectBusiness={(uid) => handleBusinessVisit(uid)} // 🟢 Changed from setActiveStoreUid
              setHasRecentItems={setHasRecentItems}
            />
          </motion.div>
        ) : (
          <motion.div
            key="wallet-view"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full"
          >
            <Wallet onNavigateToHome={() => setActiveTab('home')} />
          </motion.div>
        )}
      </div>

      {/* NAVIGATION PILL */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-5">
        {/* PILL CONTAINER (SCALED UP) */}
        <div className="bg-neutral-50/70 border border-neutral-200/50 backdrop-blur-xl px-4 py-3 rounded-[2.5rem] flex items-center gap-3 shadow-[0_16px_36px_rgba(0,0,0,0.06)] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent pointer-events-none" />
          
          <button
            onClick={() => setActiveTab('home')}
            className={`icon-button p-4 rounded-full transition-all flex items-center justify-center ${
              activeTab === 'home' 
                ? 'bg-white shadow-md text-[#E53935]' 
                : 'text-neutral-400 hover:text-neutral-600'
            }`}
          >
            <Home className="w-6 h-6" />
          </button>
          
          <button
            onClick={() => setActiveTab('wallet')}
            className={`icon-button p-4 rounded-full transition-all flex items-center justify-center ${
              activeTab === 'wallet' 
                ? 'bg-white shadow-md text-[#E53935]' 
                : 'text-neutral-400 hover:text-neutral-600'
            }`}
          >
            <WalletIcon className="w-6 h-6" />
          </button>
        </div>

        {/* SCANNER BUTTON (SCALED UP) */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsScannerOpen(true)}
          className="icon-button w-16 h-16 bg-[#E53935] hover:bg-[#d32f2f] rounded-full flex items-center justify-center text-white shadow-[0_14px_32px_rgba(229,57,53,0.35)] hover:shadow-[0_18px_36px_rgba(229,57,53,0.45)] transition-all"
        >
          <QrCode className="w-7 h-7" />
        </motion.button>
      </div>

      {/* SCANNER MODAL WRAPPER LAYER */}
      <AnimatePresence>
        {isScannerOpen && (
          <QRScannerView 
            onClose={() => setIsScannerOpen(false)} 
            onScanSuccess={(businessUid) => {
              setIsScannerOpen(false);
              handleBusinessVisit(businessUid);
            }} 
          />
        )}
      </AnimatePresence>

      {/* SETTINGS DRAWER OVERLAY PANEL */}
      <AnimatePresence>
        {isSettingsOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.2 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="fixed inset-0 bg-neutral-400 z-40"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-neutral-50 shadow-[-10px_0_40px_rgba(0,0,0,0.03)] border-l border-neutral-200/50 z-50 flex flex-col overflow-y-auto p-6"
            >
              <div className="flex items-center justify-between pb-6 border-b border-neutral-200">
                <div>
                  <h3 className="text-xl font-black text-neutral-900 tracking-tight">Settings</h3>
                  <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mt-0.5">Control Panel Matrix</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsSettingsOpen(false)}
                  className="icon-button p-2.5 bg-white border border-neutral-200 hover:bg-neutral-100 rounded-full text-neutral-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              <div className="mt-6 bg-white border border-neutral-200/80 rounded-[1.75rem] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.01)]">
                <button 
                  onClick={() => setIsPersonalDetailsModalOpen(true)}
                  className="icon-button w-full flex items-center justify-between text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-[#E53935]">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="icon-buttontext-xs font-black uppercase tracking-wider text-neutral-800">Personal Details</h4>
                      <p className="text-[10px] text-neutral-400 font-medium mt-0.5">Manage identity, locations, contact assets</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              {/* SETTINGS OPTIONS GRID LAYOUT */}
              <div className="mt-4 bg-white border border-neutral-200/80 rounded-[1.75rem] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.01)]">
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="w-4 h-4 text-[#E53935]" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-neutral-500">Useful Features</h4>
                </div>

                <div className="divide-y divide-neutral-100 text-xs font-bold text-neutral-700">
                  <div className="flex items-center justify-between py-3 cursor-pointer hover:text-neutral-900">
                    <div className="flex items-center gap-2.5"><Clock className="w-4 h-4 text-neutral-400" /><span>Recent Businesses</span></div>
                  </div>
                  <div className="flex items-center justify-between py-3 cursor-pointer hover:text-neutral-900">
                    <div className="flex items-center gap-2.5"><Heart className="w-4 h-4 text-neutral-400" /><span>Favorite Stores</span></div>
                  </div>
                  <div className="flex items-center justify-between py-3 cursor-pointer hover:text-neutral-900">
                    <div className="flex items-center gap-2.5"><Bell className="w-4 h-4 text-neutral-400" /><span>Notifications</span></div>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-2.5"><Moon className="w-4 h-4 text-neutral-400" /><span>Dark Mode</span></div>
                    <input 
                      type="checkbox" checked={isDarkMode} onChange={() => setIsDarkMode(!isDarkMode)}
                      className="w-9 h-5 bg-neutral-200 checked:bg-[#E53935] rounded-full appearance-none transition-colors relative cursor-pointer before:content-[''] before:w-4 before:h-4 before:bg-white before:rounded-full before:absolute before:top-0.5 before:left-0.5 checked:before:translate-x-4 before:transition-transform before:shadow-sm"
                    />
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-2.5"><Globe className="w-4 h-4 text-neutral-400" /><span>Language</span></div>
                    <span className="text-neutral-400 font-semibold">English (US)</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 mb-6 bg-white border border-neutral-200/80 rounded-[1.75rem] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.01)]">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleLogout}
                  className="icon-button w-full bg-[#E53935]/5 border border-[#E53935]/10 hover:bg-[#E53935] text-[#E53935] hover:text-white rounded-xl py-3.5 font-bold transition-all flex items-center justify-center gap-2 group"
                >
                  <LogOut className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  <span>Log Out of Session</span>
                </motion.button>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* DETAIL MODAL METRICS PROFILE FORM LAYER */}
      <AnimatePresence>
        {isPersonalDetailsModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPersonalDetailsModalOpen(false)}
              className="fixed inset-0 bg-neutral-400 backdrop-blur-sm z-[60]"
            />
            <div className="fixed inset-0 flex items-center justify-center z-[70] p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: 'spring', damping: 24, stiffness: 240 }}
                className="w-full max-w-sm bg-white border border-neutral-200 rounded-[2rem] p-6 shadow-2xl flex flex-col pointer-events-auto"
              >
                <div className="flex items-center justify-between pb-4 border-b border-neutral-100 mb-5">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-[#E53935]" />
                    <h3 className="text-sm font-black text-neutral-900 tracking-tight uppercase">Personal Details</h3>
                  </div>
                  <button 
                    onClick={() => setIsPersonalDetailsModalOpen(false)}
                    className="icon-button p-1.5 bg-neutral-50 hover:bg-neutral-100 rounded-full border border-neutral-200 text-neutral-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1.5 ml-1">Full Name</label>
                    <input 
                      type="text" placeholder="John Doe" value={fullName} 
                      onChange={e => setFullName(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-3 text-neutral-900 font-medium focus:outline-none focus:border-[#E53935] focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1.5 ml-1">Phone Number</label>
                    <input 
                      type="tel" placeholder="+1 (555) 000-0000" value={phone} 
                      onChange={e => setPhone(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-3 text-neutral-900 font-medium focus:outline-none focus:border-[#E53935] focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1.5 ml-1">Physical Address</label>
                    <input 
                      type="text" placeholder="123 Main St, City" value={address} 
                      onChange={e => setAddress(e.target.value)}
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-3 text-neutral-900 font-medium focus:outline-none focus:border-[#E53935] focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1.5 ml-1">Email Account (Locked)</label>
                    <div className="relative opacity-70">
                      <div className="absolute right-4 top-1/2 -translate-y-1/2"><Mail className="w-3.5 h-3.5 text-neutral-400" /></div>
                      <input 
                        type="email" disabled value={user.email || ''} 
                        className="w-full bg-neutral-100 border border-neutral-200 rounded-xl px-3.5 py-3 text-neutral-500 font-medium cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isSaving}
                    className="w-full bg-neutral-900 text-white rounded-xl py-3.5 font-bold hover:bg-neutral-950 transition-colors flex items-center justify-center gap-2 mt-2 shadow-lg shadow-neutral-900/5"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    <span>Save Parameters</span>
                  </motion.button>
                </form>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
};