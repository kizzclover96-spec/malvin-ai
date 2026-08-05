import React from 'react';
import { Lock, Sparkles } from 'lucide-react';
import {
  FREE_TIER_INTAKE_LIMIT,
  MERCHANT_INTAKE_NOUN,
  MerchantType,
  IntakeLimitState,
} from '../../utils/businessLimits';

interface IntakeLimitBannerProps {
  merchantType: MerchantType;
  state: IntakeLimitState;
  /** Live "6h 12m 30s" string from formatCooldownRemaining. */
  cooldownLabel: string | null;
  isPremium: boolean;
  isVerified: boolean;
  /** Opens the premium screen. Omit to render no call to action. */
  onUpgrade?: () => void;
}

/**
 * The one place the free-tier cap is explained to a merchant, shared by every
 * category so restaurants, salons, hotels and garages all say the same thing.
 *
 * Renders nothing for an account that isn't capped — an unlimited business
 * shouldn't carry a permanent banner about a limit that doesn't apply.
 */
export const IntakeLimitBanner: React.FC<IntakeLimitBannerProps> = ({
  merchantType,
  state,
  cooldownLabel,
  isPremium,
  isVerified,
  onUpgrade,
}) => {
  if (state.unlimited) return null;

  const noun = MERCHANT_INTAKE_NOUN[merchantType];
  const frozen = state.limitReached;

  // Premium alone doesn't lift the cap — being explicit about which half is
  // missing is the difference between a useful nudge and a paywall that
  // looks broken to someone who has already paid.
  const missingStep = isPremium && !isVerified
    ? 'Request your verification mark to unlock unlimited intake.'
    : !isPremium && isVerified
      ? 'Go Premium to unlock unlimited intake.'
      : 'Go Premium and get verified to unlock unlimited intake.';

  return (
    <div
      style={{
        borderRadius: '16px',
        padding: '14px 16px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: frozen ? 'rgba(229, 57, 53, 0.10)' : 'rgba(255, 215, 0, 0.08)',
        border: `1px solid ${frozen ? 'rgba(229,57,53,0.35)' : 'rgba(255,215,0,0.3)'}`,
        color: frozen ? '#ff9a9a' : '#e7c158',
      }}
    >
      <span style={{ flexShrink: 0, display: 'flex' }}>
        {frozen ? <Lock size={18} /> : <Sparkles size={18} />}
      </span>

      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ margin: 0, fontSize: '13px', fontWeight: 800 }}>
          {frozen
            ? `Free plan limit reached — ${FREE_TIER_INTAKE_LIMIT} ${noun} this cycle`
            : `${state.remaining} of ${FREE_TIER_INTAKE_LIMIT} ${noun} left on the free plan`}
        </p>
        <p style={{ margin: '3px 0 0', fontSize: '11.5px', fontWeight: 500, opacity: 0.85, lineHeight: 1.45 }}>
          {frozen
            ? `New ${noun} are paused${cooldownLabel ? ` — resumes in ${cooldownLabel}` : ''}. ${missingStep}`
            : missingStep}
        </p>
      </div>

      {onUpgrade && (
        <button
          onClick={onUpgrade}
          style={{
            flexShrink: 0,
            border: 'none',
            borderRadius: '10px',
            padding: '8px 14px',
            fontSize: '12px',
            fontWeight: 800,
            cursor: 'pointer',
            background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)',
            color: '#020617',
          }}
        >
          Upgrade
        </button>
      )}
    </div>
  );
};

export default IntakeLimitBanner;
