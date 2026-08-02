import React from 'react';
import { motion } from 'framer-motion';
import { getAuth } from 'firebase/auth';
import { createBusinessStripeAccount } from "../../stripe";
import { app } from "../../firebase";

type UserOptionProps = {
  onSelectCustomer: () => void; // 🟢 Trigger state shift for Front view
  onSelectWorker: () => void;   // Trigger state shift for Category view
};

// Soft elevation used by the two option cards — a wide, low-opacity shadow
// rather than a hard drop shadow, so the cards look like they're resting on
// the gradient rather than floating glass.
const CARD_SHADOW =
  '0 20px 40px -16px rgba(60,56,110,0.14), 0 2px 8px rgba(60,56,110,0.05)';

const CHIP_SHADOW =
  '0 6px 16px -6px rgba(60,56,110,0.10)';

export const UserOption: React.FC<UserOptionProps> = ({ onSelectCustomer, onSelectWorker }) => {

    const auth = getAuth(app);
    const userEmail = auth.currentUser?.email ?? "";

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
    <div style={styles.page}>

      {/* Header chip */}
      <div style={styles.headerGroup}>
        <div style={{ ...styles.chip, boxShadow: CHIP_SHADOW }}>
          <span style={styles.chipText}>
            MALVIN AI <span style={styles.chipBeta}>· beta</span>
          </span>
        </div>

        {/* Greeting block */}
        <div style={styles.greeting}>
          <h1 style={styles.hello}>Hello</h1>
          <p style={styles.email}>{userEmail}</p>
        </div>
      </div>

      {/* Account selection cards */}
      <div style={styles.optionsWrap}>
        <p style={styles.subtitle}>Select an account to continue</p>

        <div style={styles.optionsRow}>

          {/* CUSTOMER */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            whileHover={{ y: -3 }}
            onClick={onSelectCustomer}
            style={{ ...styles.optionCard, boxShadow: CARD_SHADOW }}
          >
            <svg style={styles.icon} fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            <span style={styles.optionLabel}>Be a<br />customer</span>
          </motion.button>

          {/* BUSINESS */}
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            whileHover={{ y: -3 }}
            onClick={onSelectWorker}
            style={{ ...styles.optionCard, boxShadow: CARD_SHADOW }}
          >
            <svg style={styles.icon} fill="none" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 .621-.504 1.125-1.125 1.125H4.875A1.125 1.125 0 013.75 18.4V14.15m16.5 0c0-1.242-1.008-2.25-2.25-2.25H6c-1.242 0-2.25 1.008-2.25 2.25m16.5 0V9.33a2.25 2.25 0 00-1.377-2.071L12 4.732 4.877 7.258A2.25 2.25 0 003.5 9.33v4.82M12 9.75v-3m0 3a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
            </svg>
            <span style={styles.optionLabel}>Be a<br />business</span>
          </motion.button>

        </div>

        <p style={styles.subtitleSmall}>You can always switch later.</p>
      </div>

      {/* Footer disclaimer */}
      <p style={styles.footerNote}>
        Malvin AI beta is still in development and may contain minor bugs or errors.
        For questions, contact our customer care.
      </p>
    </div>
  );
};

// Plain CSS-in-JS, no Tailwind. Grouped in the order they appear on screen.
const styles: { [key: string]: React.CSSProperties } = {
  page: {
    position: 'relative',
    width: '100%',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 56,
    padding: '48px 28px',
    userSelect: 'none',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    overflow: 'hidden',
    // Soft light-blue-to-white ambient gradient, like the reference screen —
    // cool and airy at the top, warming into a near-white at the bottom.
    background: 'linear-gradient(180deg, #E3E9FA 0%, #F1EFF6 42%, #FBFAF8 75%, #FEFDFC 100%)',
  },

  headerGroup: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
  },
  chip: {
    padding: '5px 14px',
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.55)',
    border: '1px solid rgba(255,255,255,0.6)',
  },
  chipText: {
    fontSize: 10,
    fontWeight: 500,
    letterSpacing: '0.03em',
    color: '#3C3C43',
  },
  chipBeta: {
    fontStyle: 'italic',
    color: '#8A8A8E',
  },

  greeting: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    marginTop: 28,
  },
  hello: {
    fontSize: 46,
    lineHeight: 1.1,
    fontWeight: 800,
    letterSpacing: '-0.03em',
    color: '#16161D',
    margin: 0,
  },
  email: {
    fontSize: 17,
    fontWeight: 700,
    letterSpacing: '-0.01em',
    color: 'rgba(22,22,29,0.55)',
    marginTop: 4,
    maxWidth: 280,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },

  optionsWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    maxWidth: 380,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: 500,
    color: '#48484E',
    marginBottom: 16,
  },
  optionsRow: {
    display: 'flex',
    flexDirection: 'row',
    gap: 14,
    width: '100%',
  },
  optionCard: {
    flex: 1,
    aspectRatio: '1 / 0.95',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: '20px 12px',
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.72)',
    border: '1px solid rgba(255,255,255,0.7)',
    cursor: 'pointer',
  },
  icon: {
    width: 26,
    height: 26,
    color: '#2E2E38',
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1.3,
    letterSpacing: '-0.01em',
    textAlign: 'center',
    color: '#1C1C1E',
  },
  subtitleSmall: {
    fontStyle: 'italic',
    fontSize: 11,
    color: '#9C9CA3',
    marginTop: 18,
  },

  footerNote: {
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 1.6,
    color: '#A6A6AC',
    maxWidth: 280,
    margin: 0,
  },
};