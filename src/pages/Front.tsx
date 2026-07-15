import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, Settings, Search, Home, Wallet as WalletIcon, QrCode, X, 
  User, Save, Mail, Loader2, CheckCircle2, AlertCircle,
  Clock, Heart, Bell, Moon, Globe, LogOut, ChevronRight, Ticket, ChevronDown, ChevronUp
} from 'lucide-react';
import { doc, getDoc, setDoc, collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { firestore as db } from '../firebase'; 
import { auth } from "../firebase"; 
import { QRCodeSVG } from 'qrcode.react';

// --- MODULAR FLOW COMPONENT IMPORTS ---\
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

  // Active tickets state
  const [tickets, setTickets] = useState<any[]>([]);
  const [isTicketsOpen, setIsTicketsOpen] = useState(false);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);

  // App & Settings states
  const [vin, setVin] = useState('');
  const [profileName, setProfileName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [notif, setNotif] = useState<{show: boolean, msg: string, type: 'success' | 'error'}>({show: false, msg: '', type: 'success'});

  // Load User Configuration Data
  useEffect(() => {
    if (!user) return;
    const docRef = doc(db, "users", user.uid);
    getDoc(docRef).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setProfileName(data.profileName || '');
        setVin(data.vin || '');
      }
    });
  }, [user]);

  // 🟢 Live-listen to user's tickets/receipts
  useEffect(() => {
    if (!user) return;
    
    const ticketsRef = collection(db, "users", user.uid, "tickets");
    const q = query(ticketsRef, orderBy("createdAt", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ticketsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setTickets(ticketsList);
    }, (error) => {
      console.error("Error listening to tickets:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const triggerNotif = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotif({ show: true, msg, type });
    setTimeout(() => setNotif(prev => ({ ...prev, show: false })), 4000);
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, "users", user.uid), {
        profileName,
        vin,
        updatedAt: new Date()
      }, { merge: true });
      triggerNotif("Profile parameters updated successfully!");
    } catch(err: any) {
      triggerNotif(err.message || "Failed saving profile details.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch(err: any) {
      triggerNotif("Error signing out.", "error");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white p-4">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold">Access Denied</h1>
          <p className="text-neutral-400 text-sm mt-1">Please sign in to access your profile.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-neutral-900 font-sans pb-24 selection:bg-neutral-900 selection:text-white">
      
      {/* 🟢 NOTIFICATION TOAST */}
      <AnimatePresence>
        {notif.show && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm"
          >
            <div className={`p-4 rounded-2xl shadow-xl flex items-center gap-3 border ${
              notif.type === 'success' 
                ? 'bg-neutral-900/95 text-white border-neutral-800' 
                : 'bg-red-950/95 text-red-200 border-red-900/50'
            }`}>
              {notif.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />}
              <span className="text-xs font-semibold leading-relaxed">{notif.msg}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* HEADER SECTION */}
      <header className="sticky top-0 z-40 bg-[#050505]/80 backdrop-blur-md px-5 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-neutral-900 flex items-center justify-center text-white font-black text-xs border border-neutral-800">
            {profileName ? profileName.slice(0, 2).toUpperCase() : "M"}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-neutral-500 tracking-wider">Active Shell</p>
            <h1 className="text-sm font-black text-white">{profileName || "Anonymous User"}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="w-10 h-10 rounded-full bg-neutral-900 flex items-center justify-center border border-neutral-800 hover:bg-neutral-850 active:scale-95 transition-all text-neutral-400 hover:text-white"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* MAIN ROUTER SCREEN PANEL LAYOUT */}
      <main className="px-5 mt-2">
        <AnimatePresence mode="wait">
          {activeStoreUid ? (
            <motion.div 
              key="storefront"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="relative"
            >
              <button 
                onClick={() => setActiveStoreUid(null)}
                className="absolute -top-12 right-0 bg-neutral-900 text-neutral-400 p-2 rounded-full border border-neutral-800 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
              <StoreFront storeUid={activeStoreUid} />
            </motion.div>
          ) : activeTab === 'home' ? (
            <motion.div 
              key="home"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* BRAND SEARCH ENGINE BAR */}
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input 
                  type="text" 
                  placeholder="Scan QR code to locate store" 
                  disabled
                  className="w-full bg-neutral-900/60 border border-neutral-900 text-neutral-400 rounded-2xl pl-11 pr-4 py-3.5 text-xs font-semibold focus:outline-none placeholder-neutral-600"
                />
              </div>

              {/* 🟢 MY TICKETS & RECEIPTS ACCORDION */}
              {tickets.length > 0 && (
                <div className="bg-neutral-950 border border-neutral-900 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setIsTicketsOpen(!isTicketsOpen)}
                    className="w-full px-4 py-3.5 flex items-center justify-between text-white font-bold text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-emerald-400" />
                      <span>My Tickets & Receipts ({tickets.length})</span>
                    </div>
                    {isTicketsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  <AnimatePresence>
                    {isTicketsOpen && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: "auto" }}
                        exit={{ height: 0 }}
                        className="overflow-hidden border-t border-neutral-900 bg-black/40"
                      >
                        <div className="p-3 space-y-2">
                          {tickets.map((t) => {
                            const isExpanded = expandedTicketId === t.id;
                            return (
                              <div key={t.id} className="border border-neutral-900 rounded-xl bg-neutral-950 overflow-hidden">
                                <div 
                                  onClick={() => setExpandedTicketId(isExpanded ? null : t.id)}
                                  className="p-3 flex items-center justify-between cursor-pointer hover:bg-neutral-900/40 transition-colors"
                                >
                                  <div>
                                    <p className="text-[10px] font-black uppercase text-emerald-400">{t.salonName || "Appointment Receipt"}</p>
                                    <p className="text-neutral-400 text-xs mt-0.5">{t.stylist ? `Stylist: ${t.stylist}` : "No stylist preference"}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-white font-black text-xs">€{t.totalPrice}</p>
                                    <p className="text-[9px] text-neutral-500 mt-0.5">{t.date} @ {t.time}</p>
                                  </div>
                                </div>

                                {isExpanded && (
                                  <div className="p-4 border-t border-neutral-900 bg-black/60 flex flex-col items-center gap-3">
                                    {/* Dynamic QR Code Render */}
                                    <div className="p-3 bg-white rounded-xl">
                                      <QRCodeSVG 
                                        value={JSON.stringify({ ticketId: t.ticketId, businessUid: t.targetBusinessUid })} 
                                        size={120}
                                        level={"M"}
                                      />
                                    </div>
                                    <p className="text-[10px] text-neutral-400 text-center font-bold tracking-wider uppercase">
                                      Scan at front desk to check-in
                                    </p>
                                    
                                    <div className="w-full text-xs text-neutral-400 space-y-1.5 pt-2 border-t border-neutral-900">
                                      <div className="flex justify-between"><span>Ticket ID:</span> <span className="font-mono text-[10px] text-white">{t.ticketId}</span></div>
                                      <div className="flex justify-between"><span>Duration:</span> <span className="text-white">{t.duration} mins</span></div>
                                      <div className="flex justify-between"><span>Services:</span> 
                                        <span className="text-white text-right">
                                          {t.services?.map((s: any) => s.serviceName || s.name).join(", ")}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
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

              {/* RECENT BUSINESS HISTORY COLLECTION */}
              <RecentBusinesses 
                onSelectStore={(uid) => setActiveStoreUid(uid)}
                onItemsLoaded={(hasItems) => setHasRecentItems(hasItems)}
              />

              {!hasRecentItems && (
                <div className="rounded-2xl border border-dashed border-neutral-900 p-8 text-center bg-neutral-950/20">
                  <p className="text-xs font-bold text-neutral-400">No active sessions located nearby.</p>
                  <p className="text-[10px] text-neutral-600 mt-1">Activate the scanner in the navigation hub to establish terminal pairing.</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="wallet"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <Wallet />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* SYSTEM BOTTOM NAVIGATION HUB BAR */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-sm bg-neutral-950/90 backdrop-blur-md rounded-2xl py-3 px-4 border border-neutral-900 shadow-2xl flex items-center justify-around">
        <button 
          onClick={() => { setActiveTab('home'); setActiveStoreUid(null); }}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'home' ? 'text-white scale-110' : 'text-neutral-500'}`}
        >
          <Home className="w-4 h-4" />
          <span className="text-[8px] font-black uppercase tracking-widest">HQ</span>
        </button>

        {/* FLOATING ACTION CENTER TERMINAL BUTTON */}
        <button 
          onClick={() => setIsScannerOpen(true)}
          className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center -translate-y-4 shadow-lg shadow-white/10 active:scale-95 transition-transform"
        >
          <QrCode className="w-5 h-5" />
        </button>

        <button 
          onClick={() => { setActiveTab('wallet'); setActiveStoreUid(null); }}
          className={`flex flex-col items-center gap-1 transition-all ${activeTab === 'wallet' ? 'text-white scale-110' : 'text-neutral-500'}`}
        >
          <WalletIcon className="w-4 h-4" />
          <span className="text-[8px] font-black uppercase tracking-widest">Vault</span>
        </button>
      </nav>

      {/* SCANNER DRAWER CONTROLLER MODAL */}
      <AnimatePresence>
        {isScannerOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50 flex flex-col justify-between"
          >
            <div className="px-5 py-4 flex items-center justify-between border-b border-neutral-900">
              <span className="text-xs font-black uppercase tracking-widest text-neutral-400">Pairing Device...</span>
              <button 
                onClick={() => setIsScannerOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-900 text-neutral-400 flex items-center justify-center border border-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 flex items-center justify-center">
              <QRScannerView 
                onScanSuccess={(decodedText) => {
                  setActiveStoreUid(decodedText);
                  setIsScannerOpen(false);
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SETTINGS PARAMETERIZATION CONTROL DRAWER */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div 
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-x-0 bottom-0 top-12 bg-[#050505] border-t border-neutral-900 rounded-t-[32px] z-50 flex flex-col overflow-hidden shadow-2xl"
          >
            <div className="px-6 py-5 flex items-center justify-between border-b border-neutral-900">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-neutral-500" />
                <span className="text-xs font-black uppercase tracking-widest text-white">Shell Parameters</span>
              </div>
              <button 
                onClick={() => setIsSettingsOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-900 text-neutral-400 flex items-center justify-center border border-neutral-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 pb-24">
              <form onSubmit={handleProfileUpdate} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1.5 ml-1">Profile Assignment Identifier</label>
                  <input 
                    type="text" required placeholder="User Name" value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-900 rounded-xl px-3.5 py-3 text-xs font-semibold text-white focus:outline-none focus:border-neutral-800 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-neutral-400 mb-1.5 ml-1">Car Registration Key (Optional VIN)</label>
                  <input 
                    type="text" placeholder="VIN-123X-XYZ" value={vin}
                    onChange={(e) => setVin(e.target.value)}
                    className="w-full bg-neutral-950 border border-neutral-900 rounded-xl px-3.5 py-3 text-xs font-semibold text-white focus:outline-none focus:border-neutral-800 transition-all"
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

              <hr className="border-neutral-900 my-2" />

              <div className="space-y-1">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl bg-red-950/10 text-red-400 border border-red-900/20 hover:bg-red-950/20 active:scale-95 transition-all text-xs font-black uppercase"
                >
                  <span className="flex items-center gap-2"><LogOut className="w-4 h-4" /> De-authorize Shell Session</span>
                  <ChevronRight className="w-4 h-4 opacity-55" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};