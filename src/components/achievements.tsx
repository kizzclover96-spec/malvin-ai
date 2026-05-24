import React, { useEffect, useMemo, useState, useRef } from 'react';
import { auth, db } from '../firebase';
import { ref, onValue } from 'firebase/database';

interface Tier {
  id: string;
  title: string;
  color: string;
  glow: string;
  icon: string;
  requirements: Requirement[];
}

interface Requirement {
  label: string;
  check: (data: any) => boolean;
}

const TIERS: Tier[] = [
  {
    id: 'steel',
    title: 'Steel Merchant',
    color: '#8A8A8A',
    glow: '0 0 12px rgba(255,255,255,0.08)',
    icon: '⚙️',
    requirements: [
      { label: 'Set Brand Name', check: (data) => !!data?.brandData?.name },
      { label: 'Write Brand Bio', check: (data) => !!data?.profile?.bio },
      { label: 'Upload 1 Product', check: (data) => Object.keys(data?.catalog || {}).length >= 1 }
    ]
  },
  {
    id: 'bronze',
    title: 'Bronze Merchant',
    color: '#CD7F32',
    glow: '0 0 16px rgba(205,127,50,0.35)',
    icon: '🏆',
    requirements: [
      { label: 'Upload 3 Products', check: (data) => Object.keys(data?.catalog || {}).length >= 3 },
      { label: 'Get 1 Active Customer', check: (data) => Object.keys(data?.bookings || {}).length >= 1 },
      { label: 'Fund Treasury', check: (data) => Number(data?.treasury?.balance || 0) > 0 }
    ]
  },
  {
    id: 'silver',
    title: 'Silver Merchant',
    color: '#C0C0C0',
    glow: '0 0 18px rgba(255,255,255,0.25)',
    icon: '🏆',
    requirements: [
      { label: 'Upload 5 Products', check: (data) => Object.keys(data?.catalog || {}).length >= 5 },
      { label: 'Launch First Ad Campaign', check: (data) => Object.keys(data?.campaigns || {}).length >= 1 },
      { label: 'Reach €100 Treasury', check: (data) => Number(data?.treasury?.balance || 0) >= 100 }
    ]
  },
  {
    id: 'gold',
    title: 'Gold Elite',
    color: '#FFD700',
    glow: '0 0 24px rgba(255,215,0,0.45)',
    icon: '👑',
    requirements: [
      { label: 'Upload 10 Products', check: (data) => Object.keys(data?.catalog || {}).length >= 10 },
      { label: 'Reach €500 Treasury', check: (data) => Number(data?.treasury?.balance || 0) >= 500 },
      { label: 'Receive 5 Orders', check: (data) => Object.keys(data?.bookings || {}).length >= 5 }
    ]
  },
  {
    id: 'platinum',
    title: 'Platinum Neural',
    color: '#E5E4E2',
    glow: '0 0 30px rgba(255,255,255,0.4)',
    icon: '💠',
    requirements: [
      { label: 'Become Verified', check: (data) => !!data?.profile?.isVerified },
      { label: 'Launch 3 Campaigns', check: (data) => Object.keys(data?.campaigns || {}).length >= 3 },
      { label: 'Reach €1000 Treasury', check: (data) => Number(data?.treasury?.balance || 0) >= 1000 }
    ]
  },
  {
    id: 'emerald',
    title: 'Emerald Syndicate',
    color: '#50C878',
    glow: '0 0 35px rgba(80,200,120,0.45)',
    icon: '💎',
    requirements: [
      { label: 'Upload 20 Products', check: (data) => Object.keys(data?.catalog || {}).length >= 20 },
      { label: 'Receive 20 Orders', check: (data) => Object.keys(data?.bookings || {}).length >= 20 },
      { label: 'Reach €5000 Treasury', check: (data) => Number(data?.treasury?.balance || 0) >= 5000 }
    ]
  }
];

const Achievements = () => {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const userRef = ref(db, `users/${uid}`);
    const unsubscribe = onValue(userRef, (snapshot) => {
      setUserData(snapshot.val() || {});
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const achievementState = useMemo(() => {
    if (!userData) return null;

    let currentTier = TIERS[0];
    let nextTier = TIERS[1] || null;

    for (let i = 0; i < TIERS.length; i++) {
      const tier = TIERS[i];
      const completed = tier.requirements.filter(req => req.check(userData)).length;

      if (completed === tier.requirements.length) {
        currentTier = tier;
        nextTier = TIERS[i + 1] || null;
      } else {
        break;
      }
    }

    const activeTier = nextTier || currentTier;
    const completedRequirements = activeTier.requirements.filter(req => req.check(userData)).length;
    const progress = Math.min(100, Math.round((completedRequirements / activeTier.requirements.length) * 100));

    return { currentTier, nextTier, progress, activeTier, completedRequirements };
  }, [userData]);

  if (loading || !achievementState) {
    return <div style={loadingPill}>•••</div>;
  }

  const { currentTier, nextTier, progress } = achievementState;

  return (
    <div ref={containerRef} style={container}>
      {/* Symmetric Pill Layout */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          ...pillCard,
          boxShadow: currentTier.glow,
          border: `1px solid ${currentTier.color}25`
        }}
        className="prestige-pill"
      >
        <div style={pillRow}>
          <div style={trophyWrapper}>
            <span className={`trophy-spin tier-${currentTier.id}`}>{currentTier.icon}</span>
          </div>
          
          <div style={metaWrapper}>
            <div style={{ ...tierTitle, color: currentTier.color }}>{currentTier.title}</div>
            <div style={progressContainer}>
              <div
                style={{
                  ...progressFill,
                  width: `${progress}%`,
                  background: currentTier.color,
                  boxShadow: currentTier.glow
                }}
                className="liquid-shimmer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Floating Checkbox Menu */}
      {isExpanded && nextTier && (
        <div style={dropdownDrawer}>
          <div style={nextEvolutionHeader}>
            NEXT: <span style={{ color: nextTier.color, marginLeft: '4px', fontWeight: 700 }}>{nextTier.title.toUpperCase()}</span>
            <span style={{ marginLeft: 'auto', opacity: 0.6 }}>{progress}%</span>
          </div>

          <div style={requirementsContainer}>
            {nextTier.requirements.map((req, index) => {
              const completed = req.check(userData);
              return (
                <div key={index} style={requirementRow}>
                  <div
                    style={{
                      ...requirementDot,
                      background: completed ? '#C5FF41' : '#444',
                      boxShadow: completed ? '0 0 8px #C5FF41' : 'none'
                    }}
                  />
                  <span style={{ color: completed ? '#C5FF41' : 'rgba(255,255,255,0.45)' }}>
                    {req.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>
        {`
          .prestige-pill {
            cursor: pointer;
            transition: all 0.2s ease-in-out;
          }
          .prestige-pill:hover {
            background: rgba(255,255,255,0.06) !important;
            transform: scale(1.02);
          }
          
          .liquid-shimmer {
            position: relative;
            overflow: hidden;
          }
          .liquid-shimmer::after {
            content: '';
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent);
            animation: moveShimmer 2.2s infinite linear;
          }

          .trophy-spin {
            display: inline-block;
            transition: transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          }
          .prestige-pill:hover .trophy-spin {
            transform: scale(1.1) rotate(5deg);
          }

          .tier-gold, .tier-platinum, .tier-emerald {
            animation: pulseGlow 2.5s infinite ease-in-out;
          }

          @keyframes moveShimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          @keyframes pulseGlow {
            0%, 100% { filter: brightness(1) drop-shadow(0 0 1px currentColor); }
            50% { filter: brightness(1.25) drop-shadow(0 0 6px currentColor); }
          }
        `}
      </style>
    </div>
  );
};

/* --- Unified System Styles Architecture --- */
const container: React.CSSProperties = {
  position: 'relative',
  userSelect: 'none'
};

const pillCard: React.CSSProperties = {
  background: 'rgba(255,255,255,0.02)',
  borderRadius: '999px', // Infinite border radius creates exact pill layout
  padding: '6px 16px 6px 8px', // Tailored asymmetric internal clearance
  backdropFilter: 'blur(20px)',
  width: '185px',
  boxSizing: 'border-box'
};

const pillRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px'
};

const trophyWrapper: React.CSSProperties = {
  width: '28px',
  height: '28px',
  borderRadius: '50%', // Round internal casing matching pill radius
  background: 'rgba(0,0,0,0.25)',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  fontSize: '14px',
  flexShrink: 0
};

const metaWrapper: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  gap: '3px',
  minWidth: 0
};

const tierTitle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '-0.1px',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  paddingLeft: '1px'
};

const progressContainer: React.CSSProperties = {
  width: '100%',
  height: '3px',
  background: 'rgba(255,255,255,0.08)',
  borderRadius: '999px',
  overflow: 'hidden'
};

const progressFill: React.CSSProperties = {
  height: '100%',
  borderRadius: '999px',
  transition: 'width 0.6s cubic-bezier(0.1, 0.8, 0.2, 1)'
};

/* Menu Panel Dropdown Popover Overlay */
const dropdownDrawer: React.CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 10px)',
  right: 0,
  width: '210px',
  background: '#111111',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '16px',
  padding: '14px',
  boxShadow: '0 12px 36px rgba(0,0,0,0.65)',
  zIndex: 1000,
  display: 'flex',
  flexDirection: 'column',
  gap: '10px'
};

const nextEvolutionHeader: React.CSSProperties = {
  fontSize: '10px',
  letterSpacing: '0.5px',
  color: 'rgba(255,255,255,0.4)',
  display: 'flex',
  alignItems: 'center'
};

const requirementsContainer: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '7px'
};

const requirementRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  fontSize: '11px',
  fontWeight: 500
};

const requirementDot: React.CSSProperties = {
  width: '5px',
  height: '5px',
  borderRadius: '50%',
  flexShrink: 0
};

const loadingPill: React.CSSProperties = {
  width: '185px',
  height: '40px',
  background: 'rgba(255,255,255,0.02)',
  borderRadius: '999px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'rgba(255,255,255,0.15)',
  fontSize: '12px',
  letterSpacing: '2px'
};

export default Achievements;
