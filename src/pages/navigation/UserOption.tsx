import React from 'react';
import { motion } from 'framer-motion';
import { createBusinessStripeAccount } from "../../stripe";
import { app } from "../../firebase";

type UserOptionProps = {
  onSelectCustomer: () => void; // 🟢 Trigger state shift for Front view
  onSelectWorker: () => void;   // Trigger state shift for Category view
};

export const UserOption: React.FC<UserOptionProps> = ({ onSelectCustomer, onSelectWorker }) => {

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
    <div className="w-full min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center px-6 py-16 selection:bg-red-500/20 select-none font-sans overflow-hidden relative">

      {/* Soft ambient light behind the glass */}
      <div className="absolute top-[-10%] right-[-10%] w-[420px] h-[420px] bg-[#E53935]/[0.06] rounded-full filter blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[420px] h-[420px] bg-neutral-300/[0.35] rounded-full filter blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="text-center z-10 mb-14">
        <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-white/75 border border-white/80 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.08)] mx-auto mb-6">
          <span className="text-neutral-900 font-bold text-[13px] tracking-tight">Malvin AI</span>
        </div>
        <h1 className="text-[26px] font-semibold text-neutral-900 tracking-tight">
          How would you like to continue?
        </h1>
        <p className="text-[13px] text-neutral-500 mt-2">
          You can always switch later.
        </p>
      </div>

      {/* Selection — floating frosted pills */}
      <div className="w-full max-w-sm flex flex-col gap-5 z-10">

        {/* CUSTOMER */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          whileHover={{ y: -2 }}
          onClick={onSelectCustomer}
          className="w-full text-left bg-white/60 hover:bg-white/80 border border-white/80 rounded-full pl-4 pr-5 py-4 backdrop-blur-2xl flex items-center gap-4 transition-colors duration-200 shadow-[0_16px_40px_rgba(0,0,0,0.12)]"
        >
          <div className="relative w-11 h-11 rounded-full bg-gradient-to-b from-[#F2453F] to-[#D42F2A] flex items-center justify-center shrink-0 shadow-[0_4px_14px_rgba(229,57,53,0.3)] overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1/2 bg-white/20 rounded-t-full" />
            <svg className="relative w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-semibold text-neutral-900">
              I'm a customer
            </h2>
            <p className="text-[12.5px] text-neutral-500 mt-0.5 leading-snug">
              Discover local businesses, book, and order.
            </p>
          </div>

          <svg className="w-4 h-4 text-neutral-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </motion.button>

        {/* BUSINESS */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          whileHover={{ y: -2 }}
          onClick={onSelectWorker}
          className="w-full text-left bg-white/60 hover:bg-white/80 border border-white/80 rounded-full pl-4 pr-5 py-4 backdrop-blur-2xl flex items-center gap-4 transition-colors duration-200 shadow-[0_16px_40px_rgba(0,0,0,0.12)]"
        >
          <div className="relative w-11 h-11 rounded-full bg-gradient-to-b from-white/80 to-white/40 flex items-center justify-center shrink-0 shadow-[0_4px_14px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1/2 bg-white/40 rounded-t-full" />
            <svg className="relative w-5 h-5 text-[#E53935]" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 .621-.504 1.125-1.125 1.125H4.875A1.125 1.125 0 013.75 18.4V14.15m16.5 0c0-1.242-1.008-2.25-2.25-2.25H6c-1.242 0-2.25 1.008-2.25 2.25m16.5 0V9.33a2.25 2.25 0 00-1.377-2.071L12 4.732 4.877 7.258A2.25 2.25 0 003.5 9.33v4.82M12 9.75v-3m0 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
            </svg>
          </div>

          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-semibold text-neutral-900">
              I'm a business
            </h2>
            <p className="text-[12.5px] text-neutral-500 mt-0.5 leading-snug">
              Manage your store, bookings, and team.
            </p>
          </div>

          <svg className="w-4 h-4 text-neutral-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </motion.button>

      </div>

      {/* Footer */}
      <div className="z-10 text-[11px] font-medium text-neutral-400 mt-14">
        Malvin AI
      </div>
    </div>
  );
};