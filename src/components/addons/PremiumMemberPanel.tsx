import React, { useState } from 'react';
import { BadgeCheck, X, Infinity as InfinityIcon, Zap, Crown, ShieldCheck, Mail } from 'lucide-react';

interface PremiumMemberPanelProps {
  onClose: () => void;
  isVerified: boolean;
  /** Opens the verification request flow (only meaningful when unverified). */
  onRequestVerification?: () => void;
}

/** Where LemonSqueezy customers manage or cancel their subscription. */
const BILLING_PORTAL_URL = 'https://malvin.lemonsqueezy.com/billing';
const SUPPORT_EMAIL = 'malvinsupportteam@gmail.com';

/**
 * What an existing subscriber sees instead of the sales page.
 *
 * The upsell screen (addons/Premium.tsx) exists to convert a free account —
 * showing it to someone who already pays is just asking them to buy what
 * they own. This panel is the member-side counterpart: blue rather than
 * gold, benefits stated as active rather than promised, and the only action
 * that matters to a subscriber (managing the subscription) actually present.
 */
export const PremiumMemberPanel: React.FC<PremiumMemberPanelProps> = ({
  onClose,
  isVerified,
  onRequestVerification,
}) => {
  // Cancellation is deliberately a three-step walk rather than one button:
  // confirm intent, offer support as an alternative to leaving, then hand
  // off to the billing portal.
  const [cancelStep, setCancelStep] = useState<0 | 1 | 2 | 3>(0);

  const perks = [
    { Icon: InfinityIcon, title: 'Unlimited intake', desc: 'No 10-job cap while your account stays verified.' },
    { Icon: Zap, title: 'Priority queue', desc: 'Instant campaign approval by Malvin Admin.' },
    { Icon: Crown, title: 'Malvin recognition', desc: 'Exclusive placement and brand visibility.' },
    { Icon: ShieldCheck, title: 'Verified pulse', desc: 'A glowing blue badge on your customer chat.' },
  ];

  const goToBilling = () => {
    window.open(BILLING_PORTAL_URL, '_blank', 'noopener,noreferrer');
    setCancelStep(0);
    onClose();
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={panel} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={closeBtn} aria-label="Close">
          <X size={16} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <span style={crownBadge}><BadgeCheck size={20} color="#00f2ff" /></span>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 900, color: '#e6f9ff' }}>Premiumed</h2>
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#7fd7e8', fontWeight: 600 }}>
              Your subscription is active
            </p>
          </div>
        </div>

        {/* Premium alone doesn't lift the intake cap — verification is the
            other half, so an unverified subscriber gets told exactly that
            rather than wondering why they're still capped. */}
        {!isVerified && (
          <div style={noticeBox}>
            <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#ffd479' }}>
              One step left
            </p>
            <p style={{ margin: '4px 0 8px', fontSize: '11.5px', color: '#cbd5e1', lineHeight: 1.5 }}>
              Your intake limit lifts once your account is verified as well.
            </p>
            {onRequestVerification && (
              <button onClick={onRequestVerification} style={smallGoldBtn}>
                Request verification mark
              </button>
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '18px 0' }}>
          {perks.map(({ Icon, title, desc }) => (
            <div key={title} style={perkRow}>
              <span style={perkIcon}><Icon size={15} color="#00f2ff" /></span>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#e6f9ff' }}>{title}</p>
                <p style={{ margin: '1px 0 0', fontSize: '11.5px', color: '#8fa9b8', lineHeight: 1.45 }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <button onClick={goToBilling} style={manageBtn}>Manage subscription</button>
        <button onClick={() => setCancelStep(1)} style={cancelLink}>Cancel premium</button>
      </div>

      {/* --- STEP 1: confirm they mean it --- */}
      {cancelStep === 1 && (
        <div style={dialogOverlay} onClick={(e) => e.stopPropagation()}>
          <div style={dialog}>
            <h3 style={dialogTitle}>Leave Premium?</h3>
            <p style={dialogBody}>
              Are you sure you want to leave Premium? You'll go back to the free plan, and the
              10-job intake limit will apply to your business again.
            </p>
            <div style={dialogActions}>
              <button onClick={() => setCancelStep(0)} style={dialogPrimary}>Stay Premium</button>
              <button onClick={() => setCancelStep(2)} style={dialogGhost}>Yes, continue</button>
            </div>
          </div>
        </div>
      )}

      {/* --- STEP 2: offer support instead of losing them --- */}
      {cancelStep === 2 && (
        <div style={dialogOverlay} onClick={(e) => e.stopPropagation()}>
          <div style={dialog}>
            <h3 style={dialogTitle}>Are you dissatisfied with our service?</h3>
            <p style={dialogBody}>
              If something isn't working, you can make a report instead — we'd rather fix it than
              lose you.
            </p>
            <a href={`mailto:${SUPPORT_EMAIL}`} style={supportRow}>
              <Mail size={14} color="#00f2ff" />
              {SUPPORT_EMAIL}
            </a>
            <div style={dialogActions}>
              <button onClick={() => setCancelStep(0)} style={dialogPrimary}>Make a report</button>
              <button onClick={() => setCancelStep(3)} style={dialogGhost}>Continue anyway</button>
            </div>
          </div>
        </div>
      )}

      {/* --- STEP 3: hand off to the billing portal --- */}
      {cancelStep === 3 && (
        <div style={dialogOverlay} onClick={(e) => e.stopPropagation()}>
          <div style={dialog}>
            <h3 style={dialogTitle}>Unsubscribe</h3>
            <p style={dialogBody}>
              You can subscribe again at any time — your business keeps its profile, catalogue and
              history either way.
            </p>
            <p style={{ ...dialogBody, fontSize: '11px', opacity: 0.75, marginTop: '-4px' }}>
              We'll open your billing portal, where the cancellation is finalised.
            </p>
            <div style={dialogActions}>
              <button onClick={() => setCancelStep(0)} style={dialogPrimary}>Never mind</button>
              <button onClick={goToBilling} style={dialogDanger}>Unsubscribe</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PremiumMemberPanel;

/* --- styles --- */
const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 10050, display: 'flex', alignItems: 'center',
  justifyContent: 'center', padding: '20px',
  background: 'rgba(2, 6, 23, 0.78)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
};

const panel: React.CSSProperties = {
  position: 'relative', width: '100%', maxWidth: '380px', maxHeight: '86vh', overflowY: 'auto',
  borderRadius: '26px', padding: '26px 22px 20px',
  background: 'linear-gradient(160deg, #06283d 0%, #041c2c 55%, #020617 100%)',
  border: '1px solid rgba(0, 242, 255, 0.28)',
  boxShadow: '0 24px 70px rgba(0, 242, 255, 0.16), inset 0 1px 0 rgba(255,255,255,0.06)',
  boxSizing: 'border-box',
};

const closeBtn: React.CSSProperties = {
  position: 'absolute', top: '14px', right: '14px', width: '30px', height: '30px',
  borderRadius: '50%', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)',
  color: '#9fd8e8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const crownBadge: React.CSSProperties = {
  width: '40px', height: '40px', borderRadius: '14px', flexShrink: 0,
  background: 'rgba(0, 242, 255, 0.12)', border: '1px solid rgba(0,242,255,0.3)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const noticeBox: React.CSSProperties = {
  marginTop: '16px', padding: '12px 14px', borderRadius: '14px',
  background: 'rgba(255, 212, 121, 0.07)', border: '1px solid rgba(255, 212, 121, 0.25)',
};

const smallGoldBtn: React.CSSProperties = {
  border: 'none', borderRadius: '9px', padding: '7px 12px', fontSize: '11.5px', fontWeight: 800,
  cursor: 'pointer', background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)', color: '#020617',
};

const perkRow: React.CSSProperties = { display: 'flex', gap: '11px', alignItems: 'flex-start' };

const perkIcon: React.CSSProperties = {
  width: '28px', height: '28px', borderRadius: '9px', flexShrink: 0, marginTop: '1px',
  background: 'rgba(0, 242, 255, 0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center',
};

const manageBtn: React.CSSProperties = {
  width: '100%', border: 'none', borderRadius: '13px', padding: '13px', fontSize: '13.5px',
  fontWeight: 800, cursor: 'pointer', color: '#021018',
  background: 'linear-gradient(135deg, #00f2ff 0%, #4f7cff 100%)',
  boxShadow: '0 8px 22px rgba(0, 160, 255, 0.28)',
};

const cancelLink: React.CSSProperties = {
  width: '100%', marginTop: '10px', background: 'none', border: 'none', cursor: 'pointer',
  color: '#7f95a3', fontSize: '11.5px', fontWeight: 700, textDecoration: 'underline', padding: '6px',
};

const dialogOverlay: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 10060, display: 'flex', alignItems: 'center',
  justifyContent: 'center', padding: '22px', background: 'rgba(2, 6, 23, 0.8)',
  backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
};

const dialog: React.CSSProperties = {
  width: '100%', maxWidth: '330px', borderRadius: '22px', padding: '22px',
  background: '#0b1a26', border: '1px solid rgba(0,242,255,0.22)',
  boxShadow: '0 20px 55px rgba(0,0,0,0.55)', boxSizing: 'border-box',
};

const dialogTitle: React.CSSProperties = {
  margin: '0 0 8px', fontSize: '16px', fontWeight: 900, color: '#e6f9ff',
};

const dialogBody: React.CSSProperties = {
  margin: '0 0 14px', fontSize: '12.5px', lineHeight: 1.55, color: '#a8c0cc',
};

const supportRow: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '14px', padding: '9px 11px',
  borderRadius: '10px', background: 'rgba(0,242,255,0.07)', border: '1px solid rgba(0,242,255,0.2)',
  color: '#9fe8f5', fontSize: '12px', fontWeight: 700, textDecoration: 'none',
};

const dialogActions: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '8px' };

const dialogPrimary: React.CSSProperties = {
  width: '100%', border: 'none', borderRadius: '11px', padding: '11px', fontSize: '12.5px',
  fontWeight: 800, cursor: 'pointer', color: '#021018',
  background: 'linear-gradient(135deg, #00f2ff 0%, #4f7cff 100%)',
};

const dialogGhost: React.CSSProperties = {
  width: '100%', borderRadius: '11px', padding: '11px', fontSize: '12.5px', fontWeight: 700,
  cursor: 'pointer', color: '#8fa9b8', background: 'transparent',
  border: '1px solid rgba(255,255,255,0.12)',
};

const dialogDanger: React.CSSProperties = {
  width: '100%', borderRadius: '11px', padding: '11px', fontSize: '12.5px', fontWeight: 800,
  cursor: 'pointer', color: '#ff9a9a', background: 'rgba(229,57,53,0.12)',
  border: '1px solid rgba(229,57,53,0.4)',
};
