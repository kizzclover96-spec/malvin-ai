import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createBusinessStripeAccount } from "../../stripe";
import { app } from "../../firebase";

type PremiumStatus = "checking" | "premium" | "free";

type UserOptionProps = {
  onSelectCustomer: () => void; // 🟢 Trigger state shift for Front view
  onSelectWorker: () => void;   // Trigger state shift for Category view
  // 🟢 Driven entirely by App.jsx — this component does no auth or network
  // work of its own. "checking": App.jsx hasn't confirmed status yet, so a
  // small neutral pill fills that gap. "premium": the signed claim came
  // back true, pill turns gold. "free": nothing renders here at all.
  premiumStatus?: PremiumStatus;
};

export const UserOption: React.FC<UserOptionProps> = ({ onSelectCustomer, onSelectWorker, premiumStatus = "free" }) => {

    const testStripeConnection = async () => {
        try {
            const result = await createBusinessStripeAccount({
                email: "test@malvinai.com",
            });

            console.log("Stripe response:", result.data);

        } catch (error) {
            console.error("Stripe error:", error);
        }
    };

  return (
    <div className="w-full min-h-screen bg-neutral-950 flex flex-col justify-between items-center px-6 py-12 selection:bg-red-500/30 select-none font-sans overflow-hidden relative">
      
      {/* Structural Ambient Glow Backdrop */}
      <div className="absolute -top-20 -right-20 w-96 h-96 bg-red-600/10 rounded-full filter blur-[100px] pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-neutral-800/40 rounded-full filter blur-[100px] pointer-events-none" />

      {/* Status pill — top right corner. Same slot morphs from a quiet
          "checking" dot into a gold "Premium" badge, or disappears
          entirely if the user isn't premium. */}
      <AnimatePresence>
        {premiumStatus === "checking" && (
          <motion.div
            key="checking"
            layoutId="statusPill"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-5 right-5 z-20 w-6 h-6 rounded-full border border-neutral-700/60 bg-neutral-900/60 backdrop-blur-md flex items-center justify-center"
          >
            <motion.span
              className="w-1.5 h-1.5 rounded-full bg-neutral-400"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>
        )}

        {premiumStatus === "premium" && (
          <motion.div
            key="premium"
            layoutId="statusPill"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-5 right-5 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-yellow-300/40 backdrop-blur-md"
            style={{
              background: 'linear-gradient(135deg, rgba(255,215,0,0.16), rgba(184,134,11,0.16))',
              boxShadow: '0 0 14px rgba(255,215,0,0.22)',
            }}
          >
            <svg className="w-3 h-3 text-yellow-300" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10 1.5l2.39 4.84 5.34.78-3.87 3.77.91 5.32L10 13.77l-4.77 2.44.91-5.32-3.87-3.77 5.34-.78L10 1.5z" />
            </svg>
            <span className="text-[9px] font-black uppercase tracking-wider text-yellow-300">
              Premium
            </span>
          </motion.div>
        )}
        {/* premiumStatus === "free": nothing renders — not hidden via CSS, just absent from the DOM */}
      </AnimatePresence>

      {/* Header Section */}
      <div className="text-center mt-8 z-10">
        <span className="text-[10px] font-black text-red-500 tracking-widest uppercase bg-red-500/10 px-3 py-1 rounded-full border border-red-500/20">
          Malvin AI (BETA)
        </span>
        <h1 className="text-xl font-black text-white tracking-tight uppercase mt-4">
          How would you like to continue?
        </h1>
        <p className="text-xs font-medium text-neutral-400 mt-2 max-w-[240px] mx-auto">
          You can always switch later.
        </p>
      </div>

      {/* Main Glassmorphic Selection Area */}
      <div className="w-full max-w-sm flex flex-col gap-4 my-auto z-10">
        
        {/* CARD 1: CUSTOMER VIEW INTERACTION */}
        <motion.div
          whileTap={{ scale: 0.97 }}
          onClick={onSelectCustomer} // 🟢 Calls prop directly to change state flow step
          className="w-full bg-neutral-900/40 border border-neutral-800/60 rounded-[1.75rem] p-5 shadow-2xl backdrop-blur-xl flex items-center text-left gap-4 cursor-pointer hover:border-red-500/30 transition-all group"
        >
          <div className="w-14 h-14 rounded-2xl bg-[#E53935] flex items-center justify-center shadow-[0_8px_20px_rgba(229,57,53,0.2)] shrink-0 group-hover:scale-105 transition-transform">
            {/* Customer Profile Icon SVG */}
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
          
          <div className="flex flex-col">
            <h2 className="text-sm font-black text-white uppercase tracking-wide">
              I'm a customer
            </h2>
            <p className="text-[11px] font-medium text-neutral-400 mt-0.5 leading-normal pr-2">
              Discover local businesses, book, order and interact.
            </p>
          </div>
        </motion.div>

        {/* CARD 2: BUSINESS / WORKER INTERACTION */}
        <motion.div
          whileTap={{ scale: 0.97 }}
          onClick={onSelectWorker}
          className="w-full bg-neutral-900/40 border border-neutral-800/60 rounded-[1.75rem] p-5 shadow-2xl backdrop-blur-xl flex items-center text-left gap-4 cursor-pointer hover:border-red-500/30 transition-all group"
        >
          <div className="w-14 h-14 rounded-2xl bg-neutral-800 border border-neutral-700 flex items-center justify-center shadow-md shrink-0 group-hover:scale-105 transition-transform">
            {/* Worker Icon SVG with Crimson color accent */}
            <svg className="w-6 h-6 text-[#E53935]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 .621-.504 1.125-1.125 1.125H4.875A1.125 1.125 0 013.75 18.4V14.15m16.5 0c0-1.242-1.008-2.25-2.25-2.25H6c-1.242 0-2.25 1.008-2.25 2.25m16.5 0V9.33a2.25 2.25 0 00-1.377-2.071L12 4.732 4.877 7.258A2.25 2.25 0 003.5 9.33v4.82M12 9.75v-3m0 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
            </svg>
          </div>
          
          <div className="flex flex-col">
            <h2 className="text-sm font-black text-white uppercase tracking-wide">
              I'm a business
            </h2>
            <p className="text-[11px] font-medium text-neutral-400 mt-0.5 leading-normal pr-2">
              Manage your store, bookings and team.
            </p>
          </div>
        </motion.div>

      </div>

      {/* Footer Branding Label */}
      <div className="z-10 text-[10px] font-bold text-neutral-600 tracking-widest uppercase">
        Malvin Automation System v2.4
      </div>
    </div>
  );
};