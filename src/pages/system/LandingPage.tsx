
import React, { useState, useRef, useMemo } from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  useTransform,
  useScroll,
} from 'framer-motion';
import {
  MessageCircle,
  ShoppingBag,
  UserPlus,
  Star,
  CreditCard,
  ArrowRight,
  Layers,
  Radio,
  Zap,
  Activity,
  Sparkles,
  Globe2,
  Bell,
} from 'lucide-react';
import Explore from './Explore';
import About from './About';
import { Link } from 'react-router-dom';

interface LandingPageProps {
  onLoginClick: () => void;
}

/* ============================================================================
   DESIGN TOKENS
============================================================================ */

const T = {
  paper: '#FFFFFF',
  surface: '#F5F9FF',
  ink: '#0B1220',
  inkSoft: 'rgba(11,18,32,0.6)',
  inkFaint: 'rgba(11,18,32,0.4)',
  blue: '#2F6FE0',
  blueDeep: '#071E4D',
  cyan: '#4FD1FF',
  line: 'rgba(11,18,32,0.08)',
};

/* ============================================================================
   QR
============================================================================ */

const QR_ROWS = 11;
const QR_COLS = 11;

const QR_PATTERN: number[][] = [
  [1,1,1,1,1,1,1,0,1,1,1],
  [1,0,0,0,0,0,1,0,0,1,0],
  [1,0,1,1,1,0,1,0,1,0,1],
  [1,0,1,1,1,0,1,0,1,1,0],
  [1,0,1,1,1,0,1,0,0,0,1],
  [1,0,0,0,0,0,1,0,1,1,0],
  [1,1,1,1,1,1,1,0,0,1,1],
  [0,0,0,1,0,0,0,0,1,0,0],
  [1,1,0,0,1,1,0,1,0,1,1],
  [0,0,1,1,0,1,1,0,1,0,0],
  [1,0,1,0,1,0,0,1,1,0,1],
];

const ICON_CELLS: Record<
  string,
  { Icon: any; tint: string; label: string }
> = {
  '3,3': { Icon: MessageCircle, tint: '#2F6FE0', label: 'Chat' },
  '4,10': { Icon: ShoppingBag, tint: '#4FD1FF', label: 'Orders' },
  '8,1': { Icon: UserPlus, tint: '#2F6FE0', label: 'Staff' },
  '9,3': { Icon: Star, tint: '#4FD1FF', label: 'Reviews' },
  '10,7': { Icon: CreditCard, tint: '#2F6FE0', label: 'Payments' },
};

/* ============================================================================
   MAGNETIC BUTTON
============================================================================ */

const MagneticButton: React.FC<{
  onClick: () => void;
  className: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ onClick, className, style, children }) => {
  const ref = useRef<HTMLButtonElement>(null);

  const x = useSpring(0, { stiffness: 200, damping: 14 });
  const y = useSpring(0, { stiffness: 200, damping: 14 });

  const handleMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;

    x.set((e.clientX - rect.left - rect.width / 2) * 0.35);
    y.set((e.clientY - rect.top - rect.height / 2) * 0.35);
  };

  const handleLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      ref={ref}
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={className}
      style={{ ...style, x, y }}
    >
      {children}
    </motion.button>
  );
};

/* ============================================================================
   WORD REVEAL
============================================================================ */

const WordReveal: React.FC<{
  text: string;
  delay?: number;
  style?: React.CSSProperties;
}> = ({ text, delay = 0, style }) => {
  const words = text.split(' ');

  return (
    <span style={style}>
      {words.map((w, i) => (
        <motion.span
          key={i}
          initial={{
            opacity: 0,
            y: 18,
            filter: 'blur(6px)',
          }}
          animate={{
            opacity: 1,
            y: 0,
            filter: 'blur(0px)',
          }}
          transition={{
            delay: delay + i * 0.055,
            duration: 0.5,
            ease: 'easeOut',
          }}
          style={{
            display: 'inline-block',
            marginRight: '0.28em',
          }}
        >
          {w}
        </motion.span>
      ))}
    </span>
  );
};

/* ============================================================================
   NETWORK DATA
============================================================================ */

const NETWORK_NODES = [
  {
    Icon: MessageCircle,
    label: 'Chat',
    desc: 'Every message, one thread.',
    tint: T.blue,
    angle: -90,
  },
  {
    Icon: ShoppingBag,
    label: 'Orders',
    desc: 'Catalogue and checkout.',
    tint: T.cyan,
    angle: -18,
  },
  {
    Icon: UserPlus,
    label: 'Staff',
    desc: 'Requests reach your team.',
    tint: T.blue,
    angle: 54,
  },
  {
    Icon: Star,
    label: 'Reviews',
    desc: 'Feedback after every visit.',
    tint: T.cyan,
    angle: 126,
  },
  {
    Icon: CreditCard,
    label: 'Payments',
    desc: 'Pay where you scanned.',
    tint: T.blue,
    angle: 198,
  },
];

const NET_SIZE = 680;
const NET_CENTER = NET_SIZE / 2;
const NET_RADIUS = 245;

const nodePoint = (angleDeg: number) => {
  const rad = (angleDeg * Math.PI) / 180;

  return {
    x: NET_CENTER + NET_RADIUS * Math.cos(rad),
    y: NET_CENTER + NET_RADIUS * Math.sin(rad),
  };
};

/* ============================================================================
   FLOWING NETWORK PARTICLE
============================================================================ */

const NetworkParticle: React.FC<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  delay: number;
  color: string;
}> = ({ x1, y1, x2, y2, delay, color }) => {
  return (
    <motion.circle
      r="3"
      fill={color}
      filter="url(#networkGlow)"
      initial={{
        cx: x1,
        cy: y1,
        opacity: 0,
      }}
      animate={{
        cx: [x1, x2],
        cy: [y1, y2],
        opacity: [0, 1, 1, 0],
      }}
      transition={{
        duration: 2.6,
        delay,
        repeat: Infinity,
        ease: 'linear',
      }}
    />
  );
};

/* ============================================================================
   NETWORK LINE
============================================================================ */

const NetworkLine: React.FC<{
  scrollYProgress: any;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  range: [number, number];
  color: string;
  thin?: boolean;
  particles?: boolean;
  particleCount?: number;
}> = ({
  scrollYProgress,
  x1,
  y1,
  x2,
  y2,
  range,
  color,
  thin,
  particles = false,
  particleCount = 2,
}) => {
  const pathLength = useTransform(
    scrollYProgress,
    range,
    [0, 1]
  );

  const opacity = useTransform(
    scrollYProgress,
    [range[0], range[0] + 0.025],
    [0, 1]
  );

  return (
    <>
      <motion.line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={color}
        strokeWidth={thin ? 0.8 : 1.5}
        strokeLinecap="round"
        strokeDasharray={thin ? undefined : '6 8'}
        style={{
          pathLength,
          opacity,
        }}
      />

      {particles &&
        Array.from({ length: particleCount }).map((_, i) => (
          <NetworkParticle
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            delay={i * 1.15}
            color={color}
          />
        ))}
    </>
  );
};

/* ============================================================================
   NETWORK NODE
============================================================================ */

const NetworkNode: React.FC<{
  scrollYProgress: any;
  Icon: any;
  label: string;
  desc: string;
  tint: string;
  x: number;
  y: number;
  appearAt: number;
}> = ({
  scrollYProgress,
  Icon,
  label,
  desc,
  tint,
  x,
  y,
  appearAt,
}) => {
  const scale = useTransform(
    scrollYProgress,
    [appearAt, appearAt + 0.055],
    [0.35, 1]
  );

  const opacity = useTransform(
    scrollYProgress,
    [appearAt, appearAt + 0.055],
    [0, 1]
  );

  const yMotion = useTransform(
    scrollYProgress,
    [appearAt, appearAt + 0.055],
    [15, 0]
  );

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: 'translate(-50%,-50%)',
        width: 155,
      }}
    >
      <motion.div
        className="lp-decode-icon"
        style={{
          scale,
          opacity,
          y: yMotion,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <motion.div
          animate={{
            boxShadow: [
              `0 0 0 0 ${tint}00`,
              `0 0 0 9px ${tint}12`,
              `0 0 0 0 ${tint}00`,
            ],
          }}
          transition={{
            duration: 2.8,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          style={{
            width: 58,
            height: 58,
            borderRadius: 17,
            background: `${tint}13`,
            border: `1px solid ${tint}90`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Icon size={23} color={tint} />
        </motion.div>

        <span
          className="lp-display"
          style={{
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.92rem',
          }}
        >
          {label}
        </span>

        <span
          style={{
            color: 'rgba(255,255,255,0.48)',
            fontSize: '0.7rem',
            textAlign: 'center',
            lineHeight: 1.4,
            maxWidth: 135,
          }}
        >
          {desc}
        </span>
      </motion.div>
    </div>
  );
};

/* ============================================================================
   NETWORK FLOATING LABEL
============================================================================ */

const NetworkBadge: React.FC<{
  icon: any;
  label: string;
  x: string;
  y: string;
  delay: number;
}> = ({ icon: Icon, label, x, y, delay }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{
        opacity: [0.3, 0.7, 0.3],
        y: [-5, 5, -5],
      }}
      transition={{
        duration: 4,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '7px 10px',
        borderRadius: 999,
        background: 'rgba(255,255,255,0.035)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: 'rgba(255,255,255,0.45)',
        fontSize: '0.65rem',
        letterSpacing: '0.6px',
        backdropFilter: 'blur(8px)',
        pointerEvents: 'none',
      }}
    >
      <Icon size={12} />
      {label}
    </motion.div>
  );
};

/* ============================================================================
   DECODE / NETWORK SECTION
============================================================================ */

const DecodeSection: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);

  const {
    scrollYProgress,
  } = useScroll({
    target: ref,
    offset: ['start start', 'end end'],
  });

  const titleOpacity = useTransform(
    scrollYProgress,
    [0, 0.08],
    [1, 0]
  );

  const sceneOpacity = useTransform(
    scrollYProgress,
    [0, 0.06],
    [0.35, 1]
  );

  const sceneScale = useTransform(
    scrollYProgress,
    [0, 0.25, 0.8],
    [0.82, 1, 1]
  );

  const captionOpacity = useTransform(
    scrollYProgress,
    [0.72, 0.86],
    [0, 1]
  );

  const nodePoints = useMemo(
    () => NETWORK_NODES.map(n => nodePoint(n.angle)),
    []
  );

  return (
    <section
      ref={ref}
      className="lp-network-section"
      style={{
        position: 'relative',
        height: '155vh',
        background: `
          radial-gradient(
            circle at 50% 45%,
            rgba(47,111,224,0.20),
            transparent 38%
          ),
          linear-gradient(
            180deg,
            #07152F 0%,
            #06162F 48%,
            #071E42 100%
          )
        `,
        overflow: 'hidden',
      }}
    >
      {/* Ambient grid */}

      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.34,
          backgroundImage: `
            linear-gradient(
              rgba(255,255,255,0.035) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(255,255,255,0.035) 1px,
              transparent 1px
            )
          `,
          backgroundSize: '48px 48px',
          maskImage:
            'radial-gradient(ellipse 75% 70% at 50% 50%, black, transparent 95%)',
        }}
      />

      {/* Tiny star/data field */}

      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(rgba(79,209,255,0.35) 1px, transparent 1px)',
          backgroundSize: '92px 92px',
          opacity: 0.18,
        }}
      />

      {/* Large atmospheric glow */}

      <motion.div
        animate={{
          scale: [1, 1.12, 1],
          opacity: [0.28, 0.42, 0.28],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          position: 'absolute',
          width: 700,
          height: 700,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%,-50%)',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(47,111,224,0.35), transparent 68%)',
          filter: 'blur(50px)',
        }}
      />

      {/* Header */}

      <motion.div
        style={{
          opacity: titleOpacity,
          position: 'absolute',
          top: '8%',
          left: 0,
          right: 0,
          textAlign: 'center',
          zIndex: 10,
          padding: '0 24px',
        }}
      >
        <span
          className="lp-mono"
          style={{
            color: T.cyan,
            fontSize: '0.68rem',
            letterSpacing: '2.5px',
          }}
        >
          SCROLL TO CONNECT
        </span>

        <h2
          className="lp-display"
          style={{
            color: '#fff',
            fontSize: 'clamp(1.8rem, 4vw, 3rem)',
            fontWeight: 700,
            marginTop: 10,
            letterSpacing: '-1.5px',
            marginBottom: 8,
          }}
        >
          One code. A whole network.
        </h2>

        <p
          style={{
            color: 'rgba(255,255,255,0.42)',
            fontSize: '0.85rem',
            margin: 0,
          }}
        >
          Every interaction becomes part of the same system.
        </p>
      </motion.div>

      {/* Network scene */}

      <div
        className="lp-network-scene"
        style={{
          perspective: 1400,
          width: NET_SIZE,
          height: NET_SIZE,
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      >
        <motion.div
          style={{
            opacity: sceneOpacity,
            scale: sceneScale,
            transformStyle: 'preserve-3d',
            width: '100%',
            height: '100%',
            position: 'relative',
          }}
        >
          <svg
            width={NET_SIZE}
            height={NET_SIZE}
            viewBox={`0 0 ${NET_SIZE} ${NET_SIZE}`}
            style={{
              position: 'absolute',
              inset: 0,
              overflow: 'visible',
            }}
          >
            <defs>
              <filter
                id="networkGlow"
                x="-200%"
                y="-200%"
                width="400%"
                height="400%"
              >
                <feGaussianBlur
                  stdDeviation="3"
                  result="blur"
                />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              <radialGradient id="hubGlow">
                <stop
                  offset="0%"
                  stopColor="#4FD1FF"
                  stopOpacity="0.8"
                />
                <stop
                  offset="100%"
                  stopColor="#4FD1FF"
                  stopOpacity="0"
                />
              </radialGradient>
            </defs>

            {/* Main hub-to-node network */}

            {NETWORK_NODES.map((n, i) => {
              const p = nodePoints[i];

              return (
                <NetworkLine
                  key={`spoke-${n.label}`}
                  scrollYProgress={scrollYProgress}
                  x1={NET_CENTER}
                  y1={NET_CENTER}
                  x2={p.x}
                  y2={p.y}
                  range={[0.04 + i * 0.075, 0.22 + i * 0.075]}
                  color={n.tint}
                  particles
                  particleCount={2}
                />
              );
            })}

            {/* Outer network ring */}

            {NETWORK_NODES.map((n, i) => {
              const next =
                NETWORK_NODES[(i + 1) % NETWORK_NODES.length];

              const p1 = nodePoints[i];
              const p2 =
                nodePoints[(i + 1) % NETWORK_NODES.length];

              return (
                <NetworkLine
                  key={`ring-${n.label}`}
                  scrollYProgress={scrollYProgress}
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  range={[0.28 + i * 0.055, 0.38 + i * 0.055]}
                  color="rgba(79,209,255,0.30)"
                  thin
                  particles
                  particleCount={1}
                />
              );
            })}

            {/* Cross connections — makes it feel like a real network */}

            <NetworkLine
              scrollYProgress={scrollYProgress}
              x1={nodePoints[0].x}
              y1={nodePoints[0].y}
              x2={nodePoints[2].x}
              y2={nodePoints[2].y}
              range={[0.52, 0.65]}
              color="rgba(255,255,255,0.12)"
              thin
              particles
              particleCount={1}
            />

            <NetworkLine
              scrollYProgress={scrollYProgress}
              x1={nodePoints[1].x}
              y1={nodePoints[1].y}
              x2={nodePoints[3].x}
              y2={nodePoints[3].y}
              range={[0.57, 0.7]}
              color="rgba(255,255,255,0.12)"
              thin
              particles
              particleCount={1}
            />

            <NetworkLine
              scrollYProgress={scrollYProgress}
              x1={nodePoints[2].x}
              y1={nodePoints[2].y}
              x2={nodePoints[4].x}
              y2={nodePoints[4].y}
              range={[0.62, 0.75]}
              color="rgba(255,255,255,0.12)"
              thin
              particles
              particleCount={1}
            />

            {/* Hub glow */}

            <circle
              cx={NET_CENTER}
              cy={NET_CENTER}
              r="100"
              fill="url(#hubGlow)"
              opacity="0.22"
            />
          </svg>

          {/* Floating system badges */}

          <NetworkBadge
            icon={Activity}
            label="LIVE SYNC"
            x="8%"
            y="26%"
            delay={0}
          />

          <NetworkBadge
            icon={Globe2}
            label="CONNECTED"
            x="73%"
            y="23%"
            delay={1}
          />

          <NetworkBadge
            icon={Bell}
            label="REAL-TIME"
            x="78%"
            y="70%"
            delay={2}
          />

          <NetworkBadge
            icon={Sparkles}
            label="MALVIN NETWORK"
            x="8%"
            y="72%"
            delay={3}
          />

          {/* Central QR */}

          <div
            style={{
              position: 'absolute',
              left: NET_CENTER,
              top: NET_CENTER,
              transform: 'translate(-50%,-50%)',
              width: 104,
              height: 104,
              zIndex: 5,
            }}
          >
            <motion.div
              animate={{
                rotateY: [-12, 12, -12],
              }}
              transition={{
                duration: 7,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              style={{
                width: '100%',
                height: '100%',
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Outer energy rings */}

              <motion.div
                animate={{
                  scale: [0.9, 1.25, 0.9],
                  opacity: [0.4, 0, 0.4],
                }}
                transition={{
                  duration: 2.8,
                  repeat: Infinity,
                  ease: 'easeOut',
                }}
                style={{
                  position: 'absolute',
                  inset: -30,
                  borderRadius: '50%',
                  border: `1px solid ${T.cyan}70`,
                }}
              />

              <motion.div
                animate={{
                  scale: [0.9, 1.18, 0.9],
                  opacity: [0.45, 0, 0.45],
                }}
                transition={{
                  duration: 2.8,
                  repeat: Infinity,
                  delay: 1,
                  ease: 'easeOut',
                }}
                style={{
                  position: 'absolute',
                  inset: -17,
                  borderRadius: '50%',
                  border: `1px solid ${T.blue}60`,
                }}
              />

              {/* QR glow */}

              <div
                style={{
                  position: 'absolute',
                  inset: -40,
                  background:
                    'radial-gradient(circle, rgba(79,209,255,0.42), transparent 70%)',
                  filter: 'blur(25px)',
                }}
              />

              {/* QR */}

              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  borderRadius: 26,
                  background:
                    'linear-gradient(135deg, #2F6FE0, #4FD1FF)',
                  boxShadow:
                    '0 25px 70px rgba(47,111,224,0.55)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(255,255,255,0.35)',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(4,1fr)',
                    gap: 3,
                    width: 48,
                    height: 48,
                  }}
                >
                  {[
                    1,1,0,1,
                    1,0,1,1,
                    0,1,1,1,
                    1,0,1,0,
                  ].map((v, i) => (
                    <div
                      key={i}
                      style={{
                        background: v ? '#fff' : 'transparent',
                        borderRadius: 1,
                      }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          {/* Feature nodes */}

          {NETWORK_NODES.map((n, i) => {
            const p = nodePoints[i];

            return (
              <NetworkNode
                key={n.label}
                {...n}
                x={p.x}
                y={p.y}
                scrollYProgress={scrollYProgress}
                appearAt={0.17 + i * 0.075}
              />
            );
          })}
        </motion.div>
      </div>

      {/* Bottom caption */}

      <motion.div
        style={{
          opacity: captionOpacity,
          position: 'absolute',
          bottom: 45,
          left: 0,
          right: 0,
          textAlign: 'center',
          zIndex: 20,
        }}
      >
        <div
          className="lp-mono"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            color: 'rgba(255,255,255,0.42)',
            fontSize: '0.68rem',
            letterSpacing: '1.8px',
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: T.cyan,
              boxShadow: `0 0 10px ${T.cyan}`,
            }}
          />
          NETWORK ACTIVE
        </div>
      </motion.div>
    </section>
  );
};

/* ============================================================================
   VIEWFINDER
============================================================================ */

const ViewfinderCorners: React.FC<{
  color?: string;
  size?: number;
  inset?: number;
}> = ({
  color = T.blue,
  size = 22,
  inset = -10,
}) => {
  const corner = (
    rotate: number,
    top?: number,
    bottom?: number,
    left?: number,
    right?: number
  ) => (
    <div
      style={{
        position: 'absolute',
        top,
        bottom,
        left,
        right,
        width: size,
        height: size,
        transform: `rotate(${rotate}deg)`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: size,
          height: 3,
          background: color,
          borderRadius: 2,
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 3,
          height: size,
          background: color,
          borderRadius: 2,
        }}
      />
    </div>
  );

  return (
    <>
      {corner(0, inset, undefined, inset, undefined)}
      {corner(90, inset, undefined, undefined, inset)}
      {corner(-90, undefined, inset, inset, undefined)}
      {corner(180, undefined, inset, undefined, inset)}
    </>
  );
};

/* ============================================================================
   LANDING PAGE
============================================================================ */

const LandingPage: React.FC<LandingPageProps> = ({
  onLoginClick,
}) => {
  const yourLogoUrl = '/logo.png';

  const [activeTab, setActiveTab] = useState('home');

  const heroRef = useRef<HTMLDivElement>(null);

  const {
    scrollYProgress: heroProgress,
  } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const heroOpacity = useTransform(
    heroProgress,
    [0, 0.7, 1],
    [1, 1, 0]
  );

  const heroScale = useTransform(
    heroProgress,
    [0, 1],
    [1, 0.92]
  );

  const heroY = useTransform(
    heroProgress,
    [0, 1],
    [0, -50]
  );

  const partners = [
    {
      name: 'google',
      icon: 'https://www.vectorlogo.zone/logos/google/google-icon.svg',
    },
    {
      name: 'firebase',
      icon: 'https://www.vectorlogo.zone/logos/firebase/firebase-icon.svg',
    },
    {
      name: 'openai',
      icon: 'https://static.cdnlogo.com/logos/o/38/openai.svg',
    },
    {
      name: 'gemini',
      icon: 'https://www.gstatic.com/lamda/images/gemini_sparkle_v002.svg',
    },
    {
      name: 'lemonsqueezy',
      icon: 'https://www.vectorlogo.zone/logos/lemonsqueezy/lemonsqueezy-icon.svg',
    },
  ];

  const features = [
    {
      icon: Layers,
      title: 'One link for everything',
      desc: 'Catalogue, bookings, chat, and payments all live behind the single code you hand out.',
    },
    {
      icon: Radio,
      title: 'Synced across every device',
      desc: 'Update it once from any device your team uses — every scan sees the same thing, instantly.',
    },
    {
      icon: Zap,
      title: 'Real-time requests',
      desc: 'Staff calls, to-go orders, and messages land the moment a customer taps — no refreshing, no missed pings.',
    },
    {
      icon: CreditCard,
      title: 'Built-in payments',
      desc: 'Customers pay right where they scanned. No separate terminal, no separate app to install.',
    },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: T.paper,
        color: T.ink,
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        position: 'relative',
        overflowX: 'hidden',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap');

        * {
          box-sizing: border-box;
        }

        .lp-display {
          font-family: 'Space Grotesk', sans-serif;
        }

        .lp-mono {
          font-family: 'JetBrains Mono', monospace;
        }

        .lp-bg-dots {
          position: absolute;
          inset: 0;
          z-index: 0;
          pointer-events: none;
          background-image: radial-gradient(${T.line} 1px, transparent 1px);
          background-size: 28px 28px;
          mask-image: radial-gradient(
            ellipse 70% 60% at 50% 20%,
            black 40%,
            transparent 90%
          );
        }

        @keyframes lpDrift {
          0%, 100% {
            transform: translate(0,0) scale(1);
          }

          50% {
            transform: translate(3%,4%) scale(1.08);
          }
        }

        .lp-glow {
          animation: lpDrift 16s ease-in-out infinite;
        }

        .lp-nav-link {
          color: ${T.inkSoft};
          text-decoration: none;
          font-size: 0.92rem;
          font-weight: 500;
          cursor: pointer;
          transition: color 0.2s ease;
        }

        .lp-nav-link:hover,
        .lp-nav-link.active {
          color: ${T.ink};
        }

        .lp-btn-primary {
          background: ${T.blue};
          color: #fff;
          border: none;
          padding: 15px 26px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .lp-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow:
            0 14px 30px rgba(47,111,224,0.32);
        }

        .lp-btn-ghost {
          background: transparent;
          color: ${T.ink};
          border: 1.5px solid ${T.line};
          padding: 15px 24px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          transition:
            border-color 0.2s ease,
            background 0.2s ease;
        }

        .lp-btn-ghost:hover {
          border-color: ${T.blue};
          background: ${T.surface};
        }

        .lp-feature-card {
          transition:
            transform 0.25s ease,
            box-shadow 0.25s ease;
        }

        .lp-feature-card:hover {
          transform: translateY(-4px);
          box-shadow:
            0 20px 40px rgba(11,18,32,0.08);
        }

        .lp-partner-logo {
          filter: grayscale(1) opacity(0.5);
          transition:
            opacity 0.25s ease,
            filter 0.25s ease;
        }

        .lp-partner-logo:hover {
          filter: grayscale(0) opacity(1);
        }

        @media (max-width: 900px) {
          .lp-hero-grid {
            grid-template-columns: 1fr !important;
            text-align: center;
          }

          .lp-hero-grid > div:first-child {
            order: 2;
          }

          .lp-hero-copy {
            align-items: center !important;
          }

          .lp-headline {
            font-size: 2.3rem !important;
          }

          .lp-hero-buttons {
            justify-content: center !important;
          }

          .lp-nav-links {
            display: none !important;
          }

          .lp-ghost-word {
            display: none !important;
          }

          .lp-network-scene {
            width: 580px !important;
            height: 580px !important;
          }

          .lp-network-scene > div {
            transform-origin: center center;
          }

          .lp-decode-icon span {
            font-size: 0.68rem !important;
          }
        }

        @media (max-width: 600px) {
          .lp-network-section {
            height: 135vh !important;
          }

          .lp-network-scene {
            width: 500px !important;
            height: 500px !important;
          }

          .lp-network-scene > div {
            transform: scale(0.73);
          }

          .lp-network-section h2 {
            font-size: 1.65rem !important;
          }

          .lp-network-section p {
            font-size: 0.76rem;
          }

          .lp-network-section .lp-mono {
            font-size: 0.58rem;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .lp-glow,
          .lp-qr-cell {
            animation: none !important;
          }
        }
      `}</style>

      {/* Ambient glows */}

      <div
        className="lp-glow"
        style={{
          position: 'absolute',
          top: '-8%',
          right: '-6%',
          width: '46vw',
          height: '46vw',
          background:
            'radial-gradient(circle, rgba(47,111,224,0.10) 0%, transparent 70%)',
          filter: 'blur(70px)',
          zIndex: 0,
        }}
      />

      <div
        className="lp-glow"
        style={{
          position: 'absolute',
          top: '38%',
          left: '-10%',
          width: '38vw',
          height: '38vw',
          background:
            'radial-gradient(circle, rgba(79,209,255,0.10) 0%, transparent 70%)',
          filter: 'blur(70px)',
          zIndex: 0,
          animationDelay: '4s',
        }}
      />

      {/* NAV */}

      <nav
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '26px 48px',
          maxWidth: 1280,
          margin: '0 auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              overflow: 'hidden',
              border: `1px solid ${T.line}`,
              background: T.surface,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <img
              src={yourLogoUrl}
              alt=""
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </div>

          <span
            className="lp-display"
            style={{
              fontSize: '1.1rem',
              fontWeight: 700,
              letterSpacing: '0.5px',
            }}
          >
            MALVIN
          </span>
        </div>

        <div
          className="lp-nav-links"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 30,
          }}
        >
          <span
            onClick={() => setActiveTab('home')}
            className={`lp-nav-link ${
              activeTab === 'home' ? 'active' : ''
            }`}
          >
            Home
          </span>

          <span
            onClick={() => setActiveTab('explore')}
            className={`lp-nav-link ${
              activeTab === 'explore' ? 'active' : ''
            }`}
          >
            Explore
          </span>

          <span
            onClick={() => setActiveTab('about')}
            className={`lp-nav-link ${
              activeTab === 'about' ? 'active' : ''
            }`}
          >
            About
          </span>

          <Link to="/faq" className="lp-nav-link">
            FAQ
          </Link>

          <span
            onClick={() => setActiveTab('news')}
            className={`lp-nav-link ${
              activeTab === 'news' ? 'active' : ''
            }`}
          >
            News
          </span>

          <span
            onClick={onLoginClick}
            className="lp-nav-link"
            style={{
              fontWeight: 700,
              color: T.blue,
            }}
          >
            Sign in
          </span>
        </div>
      </nav>

      <AnimatePresence mode="wait">
        {activeTab === 'home' && (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            {/* HERO */}

            <div
              ref={heroRef}
              style={{
                position: 'relative',
                background:
                  `linear-gradient(180deg, ${T.surface} 0%, #ffffff 100%)`,
                clipPath:
                  'polygon(0 0, 100% 0, 100% 96%, 0 100%)',
                paddingBottom: 90,
              }}
            >
              <div
                className="lp-bg-dots"
                style={{ opacity: 1.4 }}
              />

              <div
                aria-hidden="true"
                className="lp-ghost-word"
                style={{
                  position: 'absolute',
                  top: '4%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 1,
                  fontSize: 'clamp(6rem, 16vw, 13rem)',
                  fontWeight: 700,
                  letterSpacing: '-4px',
                  whiteSpace: 'nowrap',
                  color: 'transparent',
                  WebkitTextStroke:
                    `1.5px ${T.line}`,
                  userSelect: 'none',
                  pointerEvents: 'none',
                }}
              >
                SCAN & SYNC
              </div>

              <motion.section
                className="lp-hero-grid"
                style={{
                  opacity: heroOpacity,
                  scale: heroScale,
                  y: heroY,
                  position: 'relative',
                  zIndex: 2,
                  maxWidth: 1280,
                  margin: '0 auto',
                  padding: '56px 48px 40px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 0.9fr',
                  gap: 60,
                  alignItems: 'center',
                }}
              >
                <div
                  className="lp-hero-copy"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                  }}
                >
                  <span
                    className="lp-mono"
                    style={{
                      fontSize: '0.78rem',
                      color: T.blue,
                      letterSpacing: '2px',
                      fontWeight: 500,
                      marginBottom: 18,
                    }}
                  >
                    ONE CODE. EVERYTHING SYNCED.
                  </span>

                  <h1
                    className="lp-display lp-headline"
                    style={{
                      fontSize: '3.8rem',
                      fontWeight: 700,
                      lineHeight: 1.04,
                      letterSpacing: '-2px',
                      marginBottom: 22,
                    }}
                  >
                    <WordReveal text="Give your customers" />
                    <br />

                    <WordReveal
                      text="one thing to scan."
                      delay={0.4}
                    />

                    <br />

                    <WordReveal
                      text="Run your whole business behind it."
                      delay={0.8}
                      style={{ color: T.blue }}
                    />
                  </h1>

                  <p
                    style={{
                      fontSize: '1.05rem',
                      color: T.inkSoft,
                      lineHeight: 1.65,
                      maxWidth: 460,
                      marginBottom: 32,
                    }}
                  >
                    Chat, orders, staff requests, reviews,
                    payments — every customer interaction,
                    synced across every device, behind one QR
                    code you generate in seconds.
                  </p>

                  <div
                    className="lp-hero-buttons"
                    style={{
                      display: 'flex',
                      gap: 14,
                      flexWrap: 'wrap',
                      marginBottom: 40,
                    }}
                  >
                    <MagneticButton
                      onClick={onLoginClick}
                      className="lp-btn-primary"
                    >
                      Generate your code
                      <ArrowRight size={16} />
                    </MagneticButton>

                    <button
                      onClick={onLoginClick}
                      className="lp-btn-ghost"
                    >
                      For businesses
                    </button>
                  </div>

                  <div
                    className="lp-mono"
                    style={{
                      display: 'flex',
                      gap: 24,
                      fontSize: '0.75rem',
                      color: T.inkFaint,
                      letterSpacing: '0.5px',
                    }}
                  >
                    <span>1 CODE</span>
                    <span style={{ color: T.line }}>/</span>
                    <span>EVERY STOREFRONT</span>
                    <span style={{ color: T.line }}>/</span>
                    <span>INSTANT SYNC</span>
                  </div>
                </div>

                <QrHero />
              </motion.section>
            </div>

            {/* NETWORK */}

            <DecodeSection />

            {/* FEATURES */}

            <section
              style={{
                position: 'relative',
                zIndex: 2,
                maxWidth: 1280,
                margin: '0 auto',
                padding: '90px 48px 130px',
              }}
            >
              <div
                style={{
                  maxWidth: 620,
                  marginBottom: 45,
                }}
              >
                <span
                  className="lp-mono"
                  style={{
                    fontSize: '0.7rem',
                    letterSpacing: '2px',
                    color: T.blue,
                  }}
                >
                  EVERYTHING CONNECTED
                </span>

                <h2
                  className="lp-display"
                  style={{
                    fontSize: 'clamp(2rem, 4vw, 3rem)',
                    letterSpacing: '-1.5px',
                    margin: '10px 0 0',
                  }}
                >
                  Your business isn't a collection
                  of separate tools.
                </h2>
              </div>

              <div
                className="lp-features-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    'repeat(4, 1fr)',
                  gap: 18,
                }}
              >
                {features.map((f, i) => (
                  <ScrollReveal
                    key={f.title}
                    delay={i * 0.08}
                  >
                    <div
                      className="lp-feature-card"
                      style={{
                        background: T.surface,
                        border: `1px solid ${T.line}`,
                        borderRadius: 20,
                        padding: '28px 24px',
                        height: '100%',
                        marginTop:
                          i % 2 === 1 ? 30 : 0,
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 11,
                          background: '#fff',
                          border: `1px solid ${T.line}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: 16,
                        }}
                      >
                        <f.icon
                          size={18}
                          color={T.blue}
                        />
                      </div>

                      <h3
                        className="lp-display"
                        style={{
                          fontSize: '1.02rem',
                          fontWeight: 700,
                          marginBottom: 8,
                        }}
                      >
                        {f.title}
                      </h3>

                      <p
                        style={{
                          fontSize: '0.86rem',
                          color: T.inkSoft,
                          lineHeight: 1.55,
                          margin: 0,
                        }}
                      >
                        {f.desc}
                      </p>
                    </div>
                  </ScrollReveal>
                ))}
              </div>
            </section>

            {/* QUOTE */}

            <ScrollReveal>
              <section
                style={{
                  position: 'relative',
                  zIndex: 2,
                  background:
                    `linear-gradient(135deg, ${T.blueDeep}, ${T.blue})`,
                  padding: '90px 48px',
                  overflow: 'hidden',
                }}
              >
                <div
                  className="lp-glow"
                  style={{
                    position: 'absolute',
                    top: '10%',
                    right: '8%',
                    width: 300,
                    height: 300,
                    background:
                      'radial-gradient(circle, rgba(79,209,255,0.25) 0%, transparent 70%)',
                    filter: 'blur(50px)',
                  }}
                />

                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: 0.06,
                    backgroundImage:
                      'radial-gradient(#fff 1.5px, transparent 1.5px)',
                    backgroundSize: '18px 18px',
                  }}
                />

                <div
                  style={{
                    position: 'relative',
                    maxWidth: 780,
                    margin: '0 auto',
                  }}
                >
                  <div
                    style={{
                      position: 'relative',
                      padding: '10px 30px',
                    }}
                  >
                    <ViewfinderCorners
                      color="rgba(255,255,255,0.5)"
                      size={20}
                      inset={-4}
                    />

                    <p
                      className="lp-display"
                      style={{
                        textAlign: 'center',
                        fontSize: '2rem',
                        fontStyle: 'italic',
                        fontWeight: 500,
                        color: '#fff',
                        lineHeight: 1.4,
                        margin: 0,
                      }}
                    >
                      "It's a kill-two-birds-with-one-stone
                      kind of situation."
                    </p>
                  </div>

                  <p
                    className="lp-mono"
                    style={{
                      textAlign: 'center',
                      marginTop: 26,
                      fontSize: '0.75rem',
                      letterSpacing: '2px',
                      color: 'rgba(255,255,255,0.6)',
                    }}
                  >
                    ON RUNNING A BUSINESS WITH ONE CODE
                  </p>
                </div>
              </section>
            </ScrollReveal>

            {/* STATEMENT */}

            <ScrollReveal>
              <section
                style={{
                  position: 'relative',
                  zIndex: 2,
                  textAlign: 'center',
                  padding: '60px 48px 20px',
                }}
              >
                <h2
                  className="lp-display"
                  style={{
                    fontSize:
                      'clamp(2.2rem, 6vw, 4.2rem)',
                    fontWeight: 700,
                    letterSpacing: '-2px',
                    lineHeight: 1.05,
                  }}
                >
                  This is how you run
                  <br />
                  a business{' '}
                  <span style={{ color: T.blue }}>
                    now.
                  </span>
                </h2>
              </section>
            </ScrollReveal>

            {/* CTA */}

            <section
              style={{
                position: 'relative',
                zIndex: 2,
                maxWidth: 700,
                margin: '0 auto',
                padding: '100px 48px',
                textAlign: 'center',
              }}
            >
              <h2
                className="lp-display"
                style={{
                  fontSize: '2.2rem',
                  fontWeight: 700,
                  letterSpacing: '-1px',
                  marginBottom: 16,
                }}
              >
                Your business, one scan away.
              </h2>

              <p
                style={{
                  fontSize: '1rem',
                  color: T.inkSoft,
                  marginBottom: 32,
                }}
              >
                Generate your code and see it live in under
                two minutes.
              </p>

              <button
                onClick={onLoginClick}
                className="lp-btn-primary"
                style={{
                  padding: '17px 34px',
                  fontSize: '1rem',
                }}
              >
                Generate your code
                <ArrowRight size={17} />
              </button>
            </section>

            {/* FOOTER */}

            <footer
              style={{
                position: 'relative',
                zIndex: 2,
                borderTop: `1px solid ${T.line}`,
                padding: '28px 48px',
              }}
            >
              <div
                style={{
                  maxWidth: 1280,
                  margin: '0 auto',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                }}
              >
                <span
                  className="lp-mono"
                  style={{
                    fontSize: '0.68rem',
                    color: T.inkFaint,
                    letterSpacing: '1.5px',
                  }}
                >
                  INTEGRATED PLATFORMS
                </span>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: 22,
                  }}
                >
                  {partners.map(p => (
                    <div
                      key={p.name}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <img
                        className="lp-partner-logo"
                        src={p.icon}
                        alt={p.name}
                        style={{
                          width: 15,
                          height: 15,
                          objectFit: 'contain',
                        }}
                      />

                      <span
                        style={{
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          color: T.inkFaint,
                        }}
                      >
                        {p.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </footer>
          </motion.div>
        )}

        {activeTab === 'explore' && (
          <motion.div
            key="explore"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'relative',
              zIndex: 2,
            }}
          >
            <Explore />
          </motion.div>
        )}

        {activeTab === 'about' && (
          <motion.div
            key="about"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'relative',
              zIndex: 2,
            }}
          >
            <About />
          </motion.div>
        )}

        {activeTab === 'news' && (
          <motion.div
            key="news"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'relative',
              zIndex: 2,
              maxWidth: 800,
              margin: '0 auto',
              padding: '20px 48px 100px',
            }}
          >
            <h2
              className="lp-display"
              style={{
                fontSize: '2.2rem',
                fontWeight: 700,
                marginBottom: 8,
              }}
            >
              What's New
            </h2>

            <p
              style={{
                color: T.inkFaint,
                fontSize: '1rem',
                lineHeight: 1.6,
                marginBottom: 32,
              }}
            >
              Recent updates to the Malvin AI platform.
            </p>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
              }}
            >
              {[
                {
                  title:
                    'Push notifications now work on iPhone — no App Store required',
                  desc:
                    'Add Malvin to your iPhone Home Screen from Safari and get real push notifications, the same as a native app — no Apple Developer account or App Store listing needed on our end.',
                },
                {
                  title:
                    'Emergency, Today, This Week, or Schedule — urgency on every service request',
                  desc:
                    "Requesting a Mechanic or Service job now asks how urgent it is. Emergency requests jump straight to the top of the business's job board, ahead of everything else.",
                },
                {
                  title:
                    'Preferred time on service requests',
                  desc:
                    'Let the business know roughly when you want the job done — "tomorrow morning," "Sat after 2pm," whatever works for you — right when you submit the request.',
                },
                {
                  title:
                    'Smarter QR handoff',
                  desc:
                    "Scan a Malvin code with your phone's regular camera and it now recognizes whether you already have the app installed — handing you straight into it if so, or walking you through getting set up if not.",
                },
                {
                  title:
                    'One uid, multiple businesses',
                  desc:
                    'The same business owner can now run a Food account and a Salon account side-by-side, each fully independent — separate pages, separate ratings, separate entries in your Recent Businesses.',
                },
                {
                  title:
                    'Independent ratings per business',
                  desc:
                    "A business's star rating no longer mixes with a different category business run by the same owner — each is scored entirely on its own.",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    background: T.surface,
                    border: `1px solid ${T.line}`,
                    borderRadius: 16,
                    padding: '20px 24px',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '1.05rem',
                      fontWeight: 700,
                      marginBottom: 6,
                    }}
                  >
                    {item.title}
                  </h3>

                  <p
                    style={{
                      fontSize: '0.9rem',
                      color: T.inkSoft,
                      lineHeight: 1.6,
                      margin: 0,
                    }}
                  >
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ============================================================================
   QR HERO
============================================================================ */

const QrHero: React.FC = () => {
  const cellSize = 30;

  const gridPx =
    QR_COLS * cellSize +
    (QR_COLS - 1) * 3;

  const [hovered, setHovered] =
    useState<string | null>(null);

  const tiltWrapRef =
    useRef<HTMLDivElement>(null);

  const tiltX = useSpring(0, {
    stiffness: 150,
    damping: 20,
  });

  const tiltY = useSpring(0, {
    stiffness: 150,
    damping: 20,
  });

  const rotateX = useTransform(
    tiltY,
    [-0.5, 0.5],
    [10, -10]
  );

  const rotateY = useTransform(
    tiltX,
    [-0.5, 0.5],
    [-10, 10]
  );

  const glareX = useTransform(
    tiltX,
    [-0.5, 0.5],
    ['0%', '100%']
  );

  const glareY = useTransform(
    tiltY,
    [-0.5, 0.5],
    ['0%', '100%']
  );

  const handleTiltMove = (
    e: React.MouseEvent<HTMLDivElement>
  ) => {
    const rect =
      tiltWrapRef.current?.getBoundingClientRect();

    if (!rect) return;

    tiltX.set(
      (e.clientX - rect.left) /
        rect.width -
        0.5
    );

    tiltY.set(
      (e.clientY - rect.top) /
        rect.height -
        0.5
    );
  };

  const handleTiltLeave = () => {
    tiltX.set(0);
    tiltY.set(0);
  };

  return (
    <motion.div
      initial={{
        opacity: 0,
        scale: 0.9,
      }}
      animate={{
        opacity: 1,
        scale: 1,
      }}
      transition={{
        duration: 0.6,
      }}
      style={{
        display: 'flex',
        justifyContent: 'center',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: '110%',
          height: '110%',
          background:
            'radial-gradient(circle, rgba(47,111,224,0.14) 0%, transparent 70%)',
          filter: 'blur(40px)',
        }}
      />

      <div
        ref={tiltWrapRef}
        onMouseMove={handleTiltMove}
        onMouseLeave={handleTiltLeave}
        style={{
          position: 'relative',
          perspective: 900,
        }}
      >
        <ViewfinderCorners
          color={T.blue}
          size={26}
          inset={-16}
        />

        <motion.div
          style={{
            position: 'relative',
            background: '#fff',
            borderRadius: 28,
            padding: 26,
            border: `1px solid ${T.line}`,
            boxShadow:
              '0 30px 70px rgba(11,18,32,0.12)',
            overflow: 'hidden',
            rotateX,
            rotateY,
            transformStyle: 'preserve-3d',
          }}
        >
          <motion.div
            style={{
              position: 'absolute',
              inset: -40,
              zIndex: 4,
              pointerEvents: 'none',
              background: useTransform(
                [glareX, glareY],
                ([gx, gy]: any) =>
                  `radial-gradient(circle at ${gx} ${gy}, rgba(255,255,255,0.5), transparent 45%)`
              ),
            }}
          />

          <motion.div
            initial={{ y: -20 }}
            animate={{ y: gridPx + 20 }}
            transition={{
              duration: 2.6,
              repeat: Infinity,
              repeatDelay: 1.2,
              ease: 'easeInOut',
            }}
            style={{
              position: 'absolute',
              left: 26,
              right: 26,
              height: 3,
              borderRadius: 2,
              background:
                `linear-gradient(90deg, transparent, ${T.cyan}, transparent)`,
              boxShadow:
                `0 0 16px 3px ${T.cyan}`,
              zIndex: 3,
              pointerEvents: 'none',
            }}
          />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns:
                `repeat(${QR_COLS}, ${cellSize}px)`,
              gridTemplateRows:
                `repeat(${QR_ROWS}, ${cellSize}px)`,
              gap: 3,
              position: 'relative',
            }}
          >
            {QR_PATTERN.map((row, r) =>
              row.map((on, c) => {
                const key = `${r},${c}`;

                const iconCell =
                  ICON_CELLS[key];

                const delay =
                  (r + c) * 0.015;

                if (iconCell) {
                  const {
                    Icon,
                    tint,
                    label,
                  } = iconCell;

                  return (
                    <motion.div
                      key={key}
                      initial={{
                        opacity: 0,
                        scale: 0,
                      }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                      }}
                      transition={{
                        delay: delay + 0.3,
                        type: 'spring',
                        stiffness: 260,
                        damping: 16,
                      }}
                      onMouseEnter={() =>
                        setHovered(key)
                      }
                      onMouseLeave={() =>
                        setHovered(null)
                      }
                      whileHover={{
                        scale: 1.15,
                      }}
                      style={{
                        position: 'relative',
                        width: cellSize,
                        height: cellSize,
                        borderRadius: 8,
                        background: `${tint}14`,
                        border:
                          `1.5px solid ${tint}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        zIndex: 2,
                      }}
                    >
                      <Icon
                        size={14}
                        color={tint}
                      />

                      <AnimatePresence>
                        {hovered === key && (
                          <motion.div
                            initial={{
                              opacity: 0,
                              y: 4,
                              scale: 0.9,
                            }}
                            animate={{
                              opacity: 1,
                              y: 0,
                              scale: 1,
                            }}
                            exit={{
                              opacity: 0,
                              y: 4,
                              scale: 0.9,
                            }}
                            className="lp-mono"
                            style={{
                              position:
                                'absolute',
                              bottom: '120%',
                              left: '50%',
                              transform:
                                'translateX(-50%)',
                              background: T.ink,
                              color: '#fff',
                              fontSize:
                                '0.65rem',
                              padding:
                                '4px 9px',
                              borderRadius: 6,
                              whiteSpace:
                                'nowrap',
                              letterSpacing:
                                '0.5px',
                              zIndex: 10,
                            }}
                          >
                            {label}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                }

                if (!on) {
                  return (
                    <div
                      key={key}
                      style={{
                        width: cellSize,
                        height: cellSize,
                      }}
                    />
                  );
                }

                return (
                  <motion.div
                    key={key}
                    className="lp-qr-cell"
                    initial={{
                      opacity: 0,
                      scale: 0.2,
                      x:
                        (Math.random() - 0.5) *
                        60,
                      y:
                        (Math.random() - 0.5) *
                        60,
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1,
                      x: 0,
                      y: 0,
                    }}
                    transition={{
                      delay,
                      duration: 0.45,
                      ease: 'easeOut',
                    }}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      borderRadius: 6,
                      background: T.ink,
                    }}
                  />
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

/* ============================================================================
   SCROLL REVEAL
============================================================================ */

const ScrollReveal: React.FC<{
  children: React.ReactNode;
  delay?: number;
}> = ({
  children,
  delay = 0,
}) => (
  <motion.div
    initial={{
      opacity: 0,
      y: 24,
    }}
    whileInView={{
      opacity: 1,
      y: 0,
    }}
    viewport={{
      once: true,
      margin: '-60px',
    }}
    transition={{
      duration: 0.55,
      delay,
      ease: 'easeOut',
    }}
  >
    {children}
  </motion.div>
);

export default LandingPage;

