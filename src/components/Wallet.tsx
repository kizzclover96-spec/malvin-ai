import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Wallet as WalletIcon, Plus, ArrowUpRight, ArrowDownLeft, 
  Clock, ShieldCheck, Loader2, AlertCircle, CheckCircle2 
} from 'lucide-react';
import { doc, collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { firestore as db } from '../firebase'; 
import { auth } from "../firebase"; 

interface Transaction {
  id: string;
  storeName: string;
  timestamp: any;
  amount: number;
  type: 'received' | 'spent';
}

interface WalletProps {
  onNavigateToHome?: () => void;
}

export const Wallet: React.FC<WalletProps> = () => {
 const user = auth.currentUser;
  
  // Real-time Ledger States
  const [balance, setBalance] = useState<number>(0.00);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Action Feedback States
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!user?.uid) return;

    // 1. Realtime balance synchronization pipeline
    const balanceDocRef = doc(db, 'wallets', user.uid);
    const unsubscribeBalance = onSnapshot(balanceDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setBalance(docSnap.data().balance || 0.00);
      } else {
        setBalance(0.00);
      }
    }, (error) => {
      console.error("Error reading live wallet balance layer:", error);
    });

    // 2. Realtime transactional timeline compilation ledger (Limited to 3 for clean layout fit)
    const transactionsRef = collection(db, 'wallets', user.uid, 'transactions');
    const transactionsQuery = query(transactionsRef, orderBy('timestamp', 'desc'), limit(3));
    
    const unsubscribeTransactions = onSnapshot(transactionsQuery, (querySnapshot) => {
      const items: Transaction[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        items.push({
          id: doc.id,
          storeName: data.storeName || 'Unknown Counterparty',
          timestamp: data.timestamp,
          amount: data.amount || 0,
          type: data.type || 'spent'
        });
      });
      setTransactions(items);
      setLoading(false);
    }, (error) => {
      console.error("Error polling transactional matrix nodes:", error);
      setLoading(false);
    });

    return () => {
      unsubscribeBalance();
      unsubscribeTransactions();
    };
  }, [user]);

  // Utility to cleanly parse operational timestamps 
  const formatTime = (timestamp: any) => {
    if (!timestamp) return 'Processing...';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (!user) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-[#E53935] animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto h-full overflow-hidden flex flex-col box-border select-none">
      
      {/* TOAST SYSTEM ACCENT */}
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
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />}
            <span className="text-xs font-semibold tracking-wide text-left">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* VIEW HEADER */}
      <motion.div 
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full pb-4 flex items-center justify-between"
      >
        <h1 className="text-2xl font-black text-neutral-900 tracking-tight">Wallet</h1>
        <div className="flex items-center gap-1 bg-neutral-50 px-3 py-1.5 rounded-full border border-neutral-100">
          <ShieldCheck className="w-3.5 h-3.5 text-[#E53935]" />
          <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400">Encrypted</span>
        </div>
      </motion.div>

      {/* MID-SECTION MAIN CANVAS (STABILIZED HEIGHT/NO-SCROLL LAYOUT) */}
      <div className="w-full flex-grow flex flex-col gap-4 overflow-hidden justify-start">
        
        {/* CARD 1: CURRENT BALANCE VIEW */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="w-full bg-neutral-50/70 border border-neutral-200/50 rounded-[2rem] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.02)] backdrop-blur-xl relative overflow-hidden flex flex-col justify-between shrink-0"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent pointer-events-none" />
          
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-neutral-400 block mb-1">Available Balance</span>
            <h2 className="text-4xl font-black text-neutral-900 tracking-tight">
              €{balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h2>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => showToast('success', 'Launching premium secure fiat top-up infrastructure portal...')}
            className="w-full mt-6 bg-[#E53935] hover:bg-[#d32f2f] text-white text-xs font-black rounded-xl py-3.5 transition-all shadow-[0_8px_20px_rgba(229,57,53,0.15)] flex items-center justify-center gap-2 outline-none"
          >
            <Plus className="w-4 h-4" />
            <span>Add Money</span>
          </motion.button>
        </motion.div>

        {/* CARD 2: TRANSACTION HISTORY */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="w-full flex-grow bg-neutral-50/70 border border-neutral-200/50 rounded-[2rem] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.02)] backdrop-blur-xl flex flex-col overflow-hidden"
        >
          <div className="flex items-center gap-2 mb-3 border-b border-neutral-200/50 pb-3 shrink-0">
            <Clock className="w-4 h-4 text-neutral-400" />
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-400">Transaction History</h3>
          </div>

          <div className="flex-grow flex flex-col justify-start space-y-2.5 overflow-hidden">
            {loading ? (
              <div className="flex-grow flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-neutral-300 animate-spin" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="flex-grow flex flex-col items-center justify-center text-center py-8 px-4">
                <div className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center mb-2">
                  <WalletIcon className="w-4 h-4 text-neutral-400" />
                </div>
                <p className="text-xs font-bold text-neutral-400">No transactions posted to database ledger yet.</p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {transactions.map((tx, idx) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="bg-white border border-neutral-200/60 rounded-2xl p-3 flex items-center justify-between shadow-[0_2px_8px_rgba(0,0,0,0.01)] shrink-0"
                  >
                    <div className="flex items-center gap-3 min-w-[60%] truncate">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        tx.type === 'received' ? 'bg-emerald-50 text-emerald-600' : 'bg-neutral-50 text-neutral-700'
                      }`}>
                        {tx.type === 'received' ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-black text-neutral-900 truncate leading-tight">{tx.storeName}</p>
                        <p className="text-[10px] font-medium text-neutral-400 mt-0.5">{formatTime(tx.timestamp)}</p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 pl-2">
                      <span className={`text-xs font-black tracking-tight ${
                        tx.type === 'received' ? 'text-emerald-600' : 'text-neutral-900'
                      }`}>
                        {tx.type === 'received' ? '+' : '-'}€{tx.amount.toFixed(2)}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </motion.div>

      </div>
    </div>
  );
};