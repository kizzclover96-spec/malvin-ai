import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';

export type PaymentResultStatus = 'success' | 'failed';

export interface PaymentResult {
  status: PaymentResultStatus;
  /** Optional override for the sub-line. Falls back to a sensible default. */
  message?: string;
}

interface PaymentResultScreenProps {
  result: PaymentResult | null;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 4000;

const COPY: Record<PaymentResultStatus, { title: string; message: string }> = {
  success: {
    title: 'Payment successful',
    message: 'Your receipt is ready in Receipts & Passes.',
  },
  failed: {
    title: 'Payment failed',
    message: 'Nothing was charged. Please try again.',
  },
};

/**
 * Full-screen confirmation shown after any customer payment — Stripe
 * redirect or wallet transfer — for four seconds, then it dismisses itself.
 *
 * Every payment route in the app funnels through App.jsx, so this is mounted
 * once there rather than duplicated into each storefront. Note it renders
 * inside whichever document triggered it: a payment made in a store opened
 * through the StoreFront shell shows this within that iframe, which is the
 * right place — that's where the customer is looking.
 */
export const PaymentResultScreen: React.FC<PaymentResultScreenProps> = ({ result, onDismiss }) => {
  // Keyed on status+message so a second payment re-arms the timer instead of
  // inheriting the first one's remaining time.
  const resultKey = result ? `${result.status}:${result.message ?? ''}` : null;

  useEffect(() => {
    if (!result) return;
    const timer = setTimeout(onDismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [resultKey, result, onDismiss]);

  const isSuccess = result?.status === 'success';
  const accent = isSuccess ? '#16A34A' : '#E53935';

  return (
    <AnimatePresence>
      {result && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onDismiss}
          role="alertdialog"
          aria-live="assertive"
          aria-label={COPY[result.status].title}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            backgroundColor: 'rgba(9, 9, 11, 0.55)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
          }}
        >
          <motion.div
            initial={{ scale: 0.9, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 8, opacity: 0 }}
            transition={{ type: 'spring', damping: 22, stiffness: 260 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '320px',
              backgroundColor: '#fff',
              borderRadius: '28px',
              padding: '32px 24px 26px',
              textAlign: 'center',
              boxShadow: '0 24px 64px rgba(0,0,0,0.28)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 14, stiffness: 320, delay: 0.08 }}
              style={{
                width: '68px',
                height: '68px',
                borderRadius: '50%',
                backgroundColor: isSuccess ? 'rgba(22,163,74,0.12)' : 'rgba(229,57,53,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px',
              }}
            >
              {isSuccess ? (
                <Check size={34} color={accent} strokeWidth={3} />
              ) : (
                <X size={34} color={accent} strokeWidth={3} />
              )}
            </motion.div>

            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 900, color: '#18181B', letterSpacing: '-0.01em' }}>
              {COPY[result.status].title}
            </h3>

            <p style={{ margin: 0, fontSize: '12.5px', fontWeight: 500, color: '#71717A', lineHeight: 1.5 }}>
              {result.message || COPY[result.status].message}
            </p>

            {/* Drains over the dismiss window so the wait is visible rather
                than the screen vanishing without warning. */}
            <div
              style={{
                width: '100%',
                height: '3px',
                borderRadius: '999px',
                backgroundColor: '#F4F4F5',
                overflow: 'hidden',
                marginTop: '18px',
              }}
            >
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: AUTO_DISMISS_MS / 1000, ease: 'linear' }}
                style={{ height: '100%', backgroundColor: accent }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PaymentResultScreen;
