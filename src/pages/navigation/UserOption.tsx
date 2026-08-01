import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { createBusinessStripeAccount } from "../../stripe";
import { app } from "../../firebase";

type UserOptionProps = {
  onSelectCustomer: () => void; // 🟢 Trigger state shift for Front view
  onSelectWorker: () => void;   // Trigger state shift for Category view
};

export const UserOption: React.FC<UserOptionProps> = ({ onSelectCustomer, onSelectWorker }) => {

  useEffect(() => {
    const previousBg = document.body.style.backgroundColor;
    document.body.style.backgroundColor = '#F5F5F7';
    return () => {
      document.body.style.backgroundColor = previousBg || '#000000';
    };
  }, []);

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
    <div className="w-full min-h-screen min-h-[100dvh] bg-[#F5F5F7] flex flex-col items-center justify-center px-6 py-16 selection:bg-red-500/20 select-none font-sans overflow-hidden relative">

      {/* Soft ambient light behind the glass */}
      <div className="absolute top-[-10%] right-[-10%] w-[420px] h-[420px] bg-[#E53935]/[0.08] rounded-full filter blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[420px] h-[420px] bg-neutral-300/[0.45] rounded-full filter blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="text-center z-10 mb-12">
        <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/70 border border-white/90 backdrop-blur-2xl shadow-[0_4px_20px_rgba(0,0,0,0.04),inset_0_1px_1px_rgba(255,255,255,0.8)] mx-auto mb-6">
          <span className="text-neutral-900 font-bold text-[13px] tracking-tight">Malvin AI</span>
        </div>
        <h1 className="text-[26px] font-semibold text-neutral-900 tracking-tight">
          How would you like to continue?
        </h1>
        <p className="text-[13px] text-neutral-500 mt-2">
          You can always switch later.
        </p>
      </div>

      {/* Selection — Glass Card Pills */}
      <div className="w-full max-w-sm flex flex-col gap-5 z-10">

        {/* CUSTOMER GLASS PILL */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          whileHover={{ y: -3, scale: 1.01 }}
          onClick={onSelectCustomer}
          className="relative group w-full text-left bg-white/45 hover:bg-white/65 border border-white/80 rounded-3xl p-4 backdrop-blur-3xl flex items-center gap-4 transition-all duration-300 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.07),inset_0_1px_1px_rgba(255,255,255,0.9)] overflow-hidden"
        >
          {/* Glass highlight shimmer overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

          <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-b from-[#F2453F] to-[#D42F2A] flex items-center justify-center shrink-0 shadow-[0_6px_16px_rgba(229,57,53,0.35)] overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1/2 bg-white/25 rounded-t-2xl" />
            <svg className="relative w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>

          <div className="flex-1 min-w-0 z-10">
            <h2 className="text-[15px] font-semibold text-white tracking-tight">
              I'm a customer
            </h2>
            <p className="text-[12px] text-neutral-500 mt-0.5 leading-snug">
              Discover local businesses, book, and order.
            </p>
          </div>

          <div className="p-2 rounded-full bg-white/50 border border-white/60 text-neutral-400 group-hover:text-neutral-900 group-hover:bg-white group-hover:border-white transition-all shadow-sm shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </motion.button>

        {/* BUSINESS GLASS PILL */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          whileHover={{ y: -3, scale: 1.01 }}
          onClick={onSelectWorker}
          className="relative group w-full text-left bg-white/45 hover:bg-white/65 border border-white/80 rounded-3xl p-4 backdrop-blur-3xl flex items-center gap-4 transition-all duration-300 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.07),inset_0_1px_1px_rgba(255,255,255,0.9)] overflow-hidden"
        >
          {/* Glass highlight shimmer overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

          <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-b from-white to-neutral-100/80 border border-white/90 flex items-center justify-center shrink-0 shadow-[0_6px_16px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1/2 bg-white/60 rounded-t-2xl" />
            <svg className="relative w-5 h-5 text-[#E53935]" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 .621-.504 1.125-1.125 1.125H4.875A1.125 1.125 0 013.75 18.4V14.15m16.5 0c0-1.242-1.008-2.25-2.25-2.25H6c-1.242 0-2.25 1.008-2.25 2.25m16.5 0V9.33a2.25 2.25 0 00-1.377-2.071L12 4.732 4.877 7.258A2.25 2.25 0 003.5 9.33v4.82M12 9.75v-3m0 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
            </svg>
          </div>

          <div className="flex-1 min-w-0 z-10">
            <h2 className="text-[15px] font-semibold text-white tracking-tight">
              I'm a business
            </h2>
            <p className="text-[12px] text-neutral-500 mt-0.5 leading-snug">
              Manage your store, bookings, and team.
            </p>
          </div>

          <div className="p-2 rounded-full bg-white/50 border border-white/60 text-neutral-400 group-hover:text-neutral-900 group-hover:bg-white group-hover:border-white transition-all shadow-sm shrink-0">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </motion.button>

      </div>

      {/* Footer */}
      <div className="z-10 text-[11px] font-medium text-neutral-400 mt-14 tracking-wide">
        Malvin AI
      </div>
    </div>
  );
};