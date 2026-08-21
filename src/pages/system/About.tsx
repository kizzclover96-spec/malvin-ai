import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  ArrowRight,
  Boxes,
  Code2,
  Globe2,
  Layers3,
  Sparkles,
  Zap,
} from 'lucide-react';

/* ============================================================================
   DESIGN TOKENS
============================================================================ */

const T = {
  paper: '#FFFFFF',
  surface: '#F5F9FF',
  ink: '#0B1220',
  inkSoft: 'rgba(11,18,32,0.60)',
  inkFaint: 'rgba(11,18,32,0.40)',
  blue: '#2F6FE0',
  blueDeep: '#071E4D',
  cyan: '#4FD1FF',
  line: 'rgba(11,18,32,0.08)',
};

/* ============================================================================
   TYPES
============================================================================ */

interface AboutProps {
  onExploreProduct?: (product?: string) => void;
}

/* ============================================================================
   REVEAL
============================================================================ */

const Reveal: React.FC<{
  children: React.ReactNode;
  delay?: number;
  y?: number;
}> = ({ children, delay = 0, y = 24 }) => {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{
        once: true,
        margin: '-70px',
      }}
      transition={{
        duration: 0.65,
        delay,
        ease: 'easeOut',
      }}
    >
      {children}
    </motion.div>
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
  return (
    <span style={style}>
      {text.split(' ').map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
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
            delay: delay + index * 0.055,
            duration: 0.5,
            ease: 'easeOut',
          }}
          style={{
            display: 'inline-block',
            marginRight: '0.28em',
          }}
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
};

/* ============================================================================
   PRODUCT CARD
============================================================================ */

const ProductCard: React.FC<{
  name: string;
  type: string;
  description: string;
  status: string;
  icon: React.ElementType;
  accent?: string;
  onClick?: () => void;
}> = ({
  name,
  type,
  description,
  status,
  icon: Icon,
  accent = T.blue,
  onClick,
}) => {
  return (
    <motion.div
      whileHover={{
        y: -6,
      }}
      transition={{
        duration: 0.25,
      }}
      onClick={onClick}
      style={{
        position: 'relative',
        background: '#fff',
        border: `1px solid ${T.line}`,
        borderRadius: 24,
        padding: 28,
        minHeight: 280,
        cursor: onClick ? 'pointer' : 'default',
        overflow: 'hidden',
        boxShadow: '0 12px 35px rgba(11,18,32,0.035)',
      }}
    >
      {/* Background glow */}

      <div
        style={{
          position: 'absolute',
          width: 180,
          height: 180,
          right: -80,
          top: -80,
          borderRadius: '50%',
          background: `radial-gradient(
            circle,
            ${accent}18 0%,
            transparent 70%
          )`,
          filter: 'blur(15px)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 34,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: `${accent}10`,
              border: `1px solid ${accent}35`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon
              size={21}
              color={accent}
              strokeWidth={1.8}
            />
          </div>

          <span
            className="malvin-mono"
            style={{
              fontSize: '0.62rem',
              letterSpacing: '1.4px',
              color: T.inkFaint,
            }}
          >
            {status}
          </span>
        </div>

        <span
          className="malvin-mono"
          style={{
            fontSize: '0.62rem',
            color: accent,
            letterSpacing: '1.7px',
            marginBottom: 8,
          }}
        >
          {type}
        </span>

        <h3
          className="malvin-display"
          style={{
            margin: 0,
            fontSize: '1.55rem',
            letterSpacing: '-0.8px',
          }}
        >
          {name}
        </h3>

        <p
          style={{
            color: T.inkSoft,
            fontSize: '0.88rem',
            lineHeight: 1.65,
            marginTop: 12,
            maxWidth: 410,
          }}
        >
          {description}
        </p>

        <div
          style={{
            marginTop: 'auto',
            paddingTop: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            color: accent,
            fontSize: '0.8rem',
            fontWeight: 700,
          }}
        >
          Explore
          <ArrowRight size={14} />
        </div>
      </div>
    </motion.div>
  );
};

/* ============================================================================
   SYSTEM VISUAL
============================================================================ */

const SystemVisual: React.FC = () => {
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 650,
        aspectRatio: '1 / 0.82',
        margin: '0 auto',
      }}
    >
      {/* Ambient glow */}

      <motion.div
        animate={{
          scale: [1, 1.12, 1],
          opacity: [0.22, 0.36, 0.22],
        }}
        transition={{
          duration: 7,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          position: 'absolute',
          width: 360,
          height: 360,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%,-50%)',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(47,111,224,0.28), transparent 68%)',
          filter: 'blur(45px)',
        }}
      />

      {/* Connection lines */}

      <svg
        viewBox="0 0 650 530"
        width="100%"
        height="100%"
        style={{
          position: 'absolute',
          inset: 0,
        }}
      >
        <defs>
          <filter
            id="malvinAboutGlow"
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
        </defs>

        <line
          x1="325"
          y1="265"
          x2="130"
          y2="120"
          stroke="rgba(47,111,224,0.25)"
          strokeWidth="1.2"
          strokeDasharray="5 8"
        />

        <line
          x1="325"
          y1="265"
          x2="520"
          y2="120"
          stroke="rgba(79,209,255,0.25)"
          strokeWidth="1.2"
          strokeDasharray="5 8"
        />

        <line
          x1="325"
          y1="265"
          x2="125"
          y2="410"
          stroke="rgba(79,209,255,0.20)"
          strokeWidth="1.2"
          strokeDasharray="5 8"
        />

        <line
          x1="325"
          y1="265"
          x2="525"
          y2="410"
          stroke="rgba(47,111,224,0.20)"
          strokeWidth="1.2"
          strokeDasharray="5 8"
        />

        <motion.circle
          r="3"
          fill={T.cyan}
          filter="url(#malvinAboutGlow)"
          animate={{
            cx: [325, 130],
            cy: [265, 120],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: 'linear',
          }}
        />

        <motion.circle
          r="3"
          fill={T.blue}
          filter="url(#malvinAboutGlow)"
          animate={{
            cx: [325, 520],
            cy: [265, 120],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 2.7,
            delay: 0.7,
            repeat: Infinity,
            ease: 'linear',
          }}
        />

        <motion.circle
          r="3"
          fill={T.cyan}
          filter="url(#malvinAboutGlow)"
          animate={{
            cx: [325, 125],
            cy: [265, 410],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 2.8,
            delay: 1.2,
            repeat: Infinity,
            ease: 'linear',
          }}
        />

        <motion.circle
          r="3"
          fill={T.blue}
          filter="url(#malvinAboutGlow)"
          animate={{
            cx: [325, 525],
            cy: [265, 410],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 2.6,
            delay: 1.7,
            repeat: Infinity,
            ease: 'linear',
          }}
        />
      </svg>

      {/* Product nodes */}

      {[
        {
          name: 'RELOOP',
          label: 'PRODUCT',
          x: '20%',
          y: '22%',
          color: T.blue,
        },
        {
          name: 'FUTURE',
          label: 'PRODUCT',
          x: '80%',
          y: '22%',
          color: T.cyan,
        },
        {
          name: 'APPS',
          label: 'EXPERIENCES',
          x: '19%',
          y: '78%',
          color: T.cyan,
        },
        {
          name: 'PLATFORM',
          label: 'TECHNOLOGY',
          x: '81%',
          y: '78%',
          color: T.blue,
        },
      ].map(item => (
        <motion.div
          key={item.name}
          animate={{
            y: [-4, 4, -4],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: Math.random(),
          }}
          style={{
            position: 'absolute',
            left: item.x,
            top: item.y,
            transform: 'translate(-50%,-50%)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: 70,
              height: 70,
              borderRadius: 20,
              background: '#fff',
              border: `1px solid ${item.color}55`,
              boxShadow: `0 15px 40px ${item.color}18`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 8px',
            }}
          >
            <Layers3
              size={23}
              color={item.color}
            />
          </div>

          <span
            className="malvin-mono"
            style={{
              fontSize: '0.57rem',
              letterSpacing: '1.5px',
              color: T.inkFaint,
            }}
          >
            {item.label}
          </span>

          <div
            className="malvin-display"
            style={{
              fontWeight: 700,
              fontSize: '0.78rem',
              marginTop: 3,
            }}
          >
            {item.name}
          </div>
        </motion.div>
      ))}

      {/* Central Malvin node */}

      <motion.div
        animate={{
          boxShadow: [
            `0 0 0 0 ${T.blue}00`,
            `0 0 0 18px ${T.blue}10`,
            `0 0 0 0 ${T.blue}00`,
          ],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%,-50%)',
          width: 150,
          height: 150,
          borderRadius: 42,
          background:
            'linear-gradient(135deg, #071E4D, #2F6FE0)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          color: '#fff',
          boxShadow:
            '0 30px 80px rgba(47,111,224,0.30)',
          zIndex: 5,
        }}
      >
        <Sparkles
          size={25}
          strokeWidth={1.7}
        />

        <span
          className="malvin-display"
          style={{
            fontSize: '1.15rem',
            fontWeight: 700,
            marginTop: 8,
            letterSpacing: '0.5px',
          }}
        >
          MALVIN
        </span>

        <span
          className="malvin-mono"
          style={{
            fontSize: '0.5rem',
            letterSpacing: '1.5px',
            color: 'rgba(255,255,255,0.55)',
            marginTop: 4,
          }}
        >
          ENTERPRISE
        </span>
      </motion.div>
    </div>
  );
};

/* ============================================================================
   ABOUT PAGE
============================================================================ */

const About: React.FC<AboutProps> = ({
  onExploreProduct,
}) => {
  const heroRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const heroOpacity = useTransform(
    scrollYProgress,
    [0, 0.7, 1],
    [1, 1, 0]
  );

  const heroY = useTransform(
    scrollYProgress,
    [0, 1],
    [0, -50]
  );

  const products = [
    {
      name: 'Reloop',
      type: 'CONSUMER PRODUCT',
      description:
        'A simple marketplace experience designed around making buying and selling pre-owned items easier, more accessible, and more social.',
      status: 'LIVE',
      icon: Globe2,
      accent: T.blue,
    },
    {
      name: 'More to come',
      type: 'MALVIN LABS',
      description:
        'Malvin is building a growing family of products across different problems, audiences, and experiences.',
      status: 'BUILDING',
      icon: Sparkles,
      accent: T.cyan,
    },
  ];

  const principles = [
    {
      icon: Boxes,
      title: 'Products first',
      desc:
        'We build products around real problems rather than building technology for its own sake.',
    },
    {
      icon: Code2,
      title: 'Technology underneath',
      desc:
        'Shared technology lets each product move faster without forcing every experience to look or work the same.',
    },
    {
      icon: Globe2,
      title: 'Built for people',
      desc:
        'Every product should feel simple on the surface, even when a lot is happening underneath.',
    },
    {
      icon: Zap,
      title: 'Move quickly',
      desc:
        'We experiment, launch, learn, and improve instead of waiting for everything to be perfect.',
    },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        background: T.paper,
        color: T.ink,
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        position: 'relative',
        overflowX: 'hidden',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap');

        * {
          box-sizing: border-box;
        }

        .malvin-display {
          font-family: 'Space Grotesk', sans-serif;
        }

        .malvin-mono {
          font-family: 'JetBrains Mono', monospace;
        }

        .about-dots {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background-image:
            radial-gradient(
              rgba(11,18,32,0.09) 1px,
              transparent 1px
            );
          background-size: 28px 28px;
          mask-image:
            radial-gradient(
              ellipse 70% 55% at 50% 20%,
              black 30%,
              transparent 85%
            );
        }

        .about-link {
          text-decoration: none;
          color: inherit;
        }

        .about-stat {
          transition:
            transform 0.25s ease,
            border-color 0.25s ease;
        }

        .about-stat:hover {
          transform: translateY(-4px);
          border-color: rgba(47,111,224,0.22) !important;
        }

        @media (max-width: 900px) {
          .about-hero-grid {
            grid-template-columns: 1fr !important;
            text-align: center;
          }

          .about-hero-copy {
            align-items: center !important;
          }

          .about-hero-visual {
            margin-top: 20px;
          }

          .about-principles {
            grid-template-columns: repeat(2, 1fr) !important;
          }

          .about-product-grid {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 600px) {
          .about-hero-grid {
            padding-left: 24px !important;
            padding-right: 24px !important;
          }

          .about-section {
            padding-left: 24px !important;
            padding-right: 24px !important;
          }

          .about-principles {
            grid-template-columns: 1fr !important;
          }

          .about-stat-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      {/* ================================================================
          AMBIENT BACKGROUND
      ================================================================ */}

      <div
        style={{
          position: 'absolute',
          width: '55vw',
          height: '55vw',
          right: '-15%',
          top: '-10%',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(47,111,224,0.10), transparent 68%)',
          filter: 'blur(70px)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'absolute',
          width: '45vw',
          height: '45vw',
          left: '-15%',
          top: '40%',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(79,209,255,0.08), transparent 68%)',
          filter: 'blur(70px)',
          pointerEvents: 'none',
        }}
      />

      {/* ================================================================
          HERO
      ================================================================ */}

      <section
        ref={heroRef}
        style={{
          position: 'relative',
          minHeight: '82vh',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          background:
            'linear-gradient(180deg, #F5F9FF 0%, #FFFFFF 100%)',
        }}
      >
        <div className="about-dots" />

        <motion.div
          style={{
            opacity: heroOpacity,
            y: heroY,
            position: 'relative',
            zIndex: 2,
            width: '100%',
            maxWidth: 1280,
            margin: '0 auto',
            padding: '90px 48px 100px',
          }}
        >
          <div
            className="about-hero-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 70,
              alignItems: 'center',
            }}
          >
            {/* Hero copy */}

            <div
              className="about-hero-copy"
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
              }}
            >
              <span
                className="malvin-mono"
                style={{
                  color: T.blue,
                  fontSize: '0.7rem',
                  letterSpacing: '2.4px',
                  marginBottom: 18,
                }}
              >
                ABOUT MALVIN
              </span>

              <h1
                className="malvin-display"
                style={{
                  fontSize: 'clamp(3rem, 6vw, 5.5rem)',
                  lineHeight: 0.98,
                  letterSpacing: '-3px',
                  margin: 0,
                  fontWeight: 700,
                }}
              >
                <WordReveal text="We build" />

                <br />

                <WordReveal
                  text="the products."
                  delay={0.35}
                  style={{
                    color: T.blue,
                  }}
                />
              </h1>

              <p
                style={{
                  maxWidth: 540,
                  color: T.inkSoft,
                  fontSize: '1.05rem',
                  lineHeight: 1.75,
                  marginTop: 28,
                  marginBottom: 0,
                }}
              >
                Malvin is a technology enterprise building
                and powering digital products. Each product
                has its own purpose, audience, and identity —
                while sharing the technology and thinking
                behind it.
              </p>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  marginTop: 30,
                }}
              >
                <div
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: T.cyan,
                    boxShadow: `0 0 12px ${T.cyan}`,
                  }}
                />

                <span
                  className="malvin-mono"
                  style={{
                    fontSize: '0.64rem',
                    color: T.inkFaint,
                    letterSpacing: '1.3px',
                  }}
                >
                  ONE ENTERPRISE / MANY PRODUCTS
                </span>
              </div>
            </div>

            {/* Hero visual */}

            <div className="about-hero-visual">
              <SystemVisual />
            </div>
          </div>
        </motion.div>
      </section>

      {/* ================================================================
          STATEMENT
      ================================================================ */}

      <Reveal>
        <section
          className="about-section"
          style={{
            maxWidth: 980,
            margin: '0 auto',
            padding: '130px 48px 120px',
            textAlign: 'center',
          }}
        >
          <span
            className="malvin-mono"
            style={{
              fontSize: '0.67rem',
              color: T.blue,
              letterSpacing: '2px',
            }}
          >
            WHAT WE DO
          </span>

          <h2
            className="malvin-display"
            style={{
              fontSize: 'clamp(2.2rem, 5vw, 4rem)',
              lineHeight: 1.08,
              letterSpacing: '-2px',
              margin: '16px 0 24px',
            }}
          >
            Malvin turns ideas into
            <br />
            <span style={{ color: T.blue }}>
              products people can use.
            </span>
          </h2>

          <p
            style={{
              maxWidth: 680,
              margin: '0 auto',
              color: T.inkSoft,
              fontSize: '1rem',
              lineHeight: 1.75,
            }}
          >
            From the first idea to the technology underneath
            it, we create digital experiences that solve
            specific problems. Some become standalone
            products. Others become part of a larger
            ecosystem.
          </p>
        </section>
      </Reveal>

      {/* ================================================================
          PRODUCTS
      ================================================================ */}

      <section
        className="about-section"
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '20px 48px 130px',
        }}
      >
        <Reveal>
          <div
            style={{
              maxWidth: 650,
              marginBottom: 45,
            }}
          >
            <span
              className="malvin-mono"
              style={{
                fontSize: '0.68rem',
                letterSpacing: '2px',
                color: T.blue,
              }}
            >
              THE MALVIN ECOSYSTEM
            </span>

            <h2
              className="malvin-display"
              style={{
                fontSize: 'clamp(2rem, 4vw, 3.2rem)',
                lineHeight: 1.08,
                letterSpacing: '-1.5px',
                margin: '12px 0 0',
              }}
            >
              Different products.
              <br />
              One company behind them.
            </h2>
          </div>
        </Reveal>

        <div
          className="about-product-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 18,
          }}
        >
          {products.map((product, index) => (
            <Reveal
              key={product.name}
              delay={index * 0.08}
            >
              <ProductCard
                {...product}
                onClick={() =>
                  onExploreProduct?.(product.name)
                }
              />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ================================================================
          PRINCIPLES
      ================================================================ */}

      <section
        style={{
          position: 'relative',
          overflow: 'hidden',
          background:
            'linear-gradient(180deg, #07152F 0%, #071E42 100%)',
          color: '#fff',
          padding: '120px 0 130px',
        }}
      >
        {/* Grid */}

        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.3,
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
              'radial-gradient(ellipse 75% 70% at 50% 50%, black, transparent 90%)',
          }}
        />

        <div
          className="about-section"
          style={{
            position: 'relative',
            zIndex: 2,
            maxWidth: 1280,
            margin: '0 auto',
            padding: '0 48px',
          }}
        >
          <Reveal>
            <div
              style={{
                maxWidth: 650,
                marginBottom: 55,
              }}
            >
              <span
                className="malvin-mono"
                style={{
                  fontSize: '0.68rem',
                  letterSpacing: '2px',
                  color: T.cyan,
                }}
              >
                HOW WE BUILD
              </span>

              <h2
                className="malvin-display"
                style={{
                  fontSize: 'clamp(2rem, 4vw, 3.2rem)',
                  lineHeight: 1.08,
                  letterSpacing: '-1.5px',
                  margin: '12px 0 0',
                }}
              >
                The technology changes.
                <br />
                The principles don't.
              </h2>
            </div>
          </Reveal>

          <div
            className="about-principles"
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(4, 1fr)',
              gap: 18,
            }}
          >
            {principles.map((item, index) => {
              const Icon = item.icon;

              return (
                <Reveal
                  key={item.title}
                  delay={index * 0.07}
                >
                  <div
                    style={{
                      height: '100%',
                      padding: 26,
                      borderRadius: 20,
                      background:
                        'rgba(255,255,255,0.035)',
                      border:
                        '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        background:
                          'rgba(79,209,255,0.08)',
                        border:
                          '1px solid rgba(79,209,255,0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 22,
                      }}
                    >
                      <Icon
                        size={19}
                        color={T.cyan}
                        strokeWidth={1.7}
                      />
                    </div>

                    <h3
                      className="malvin-display"
                      style={{
                        fontSize: '1.05rem',
                        margin: '0 0 9px',
                      }}
                    >
                      {item.title}
                    </h3>

                    <p
                      style={{
                        margin: 0,
                        color:
                          'rgba(255,255,255,0.48)',
                        fontSize: '0.82rem',
                        lineHeight: 1.65,
                      }}
                    >
                      {item.desc}
                    </p>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ================================================================
          NUMBERS / STRUCTURE
      ================================================================ */}

      <Reveal>
        <section
          className="about-section"
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            padding: '120px 48px 80px',
          }}
        >
          <div
            className="about-stat-grid"
            style={{
              display: 'grid',
              gridTemplateColumns:
                'repeat(3, 1fr)',
              gap: 18,
            }}
          >
            {[
              {
                number: '01',
                title: 'Enterprise',
                desc:
                  'Malvin is the company building the ecosystem.',
              },
              {
                number: '02',
                title: 'Products',
                desc:
                  'Each product exists to solve a specific problem.',
              },
              {
                number: '03',
                title: 'Technology',
                desc:
                  'Shared infrastructure helps products move faster.',
              },
            ].map(item => (
              <div
                key={item.number}
                className="about-stat"
                style={{
                  border: `1px solid ${T.line}`,
                  borderRadius: 20,
                  padding: '28px 26px',
                  background: T.surface,
                }}
              >
                <span
                  className="malvin-mono"
                  style={{
                    color: T.blue,
                    fontSize: '0.62rem',
                    letterSpacing: '1.5px',
                  }}
                >
                  {item.number}
                </span>

                <h3
                  className="malvin-display"
                  style={{
                    fontSize: '1.3rem',
                    margin:
                      '18px 0 8px',
                  }}
                >
                  {item.title}
                </h3>

                <p
                  style={{
                    margin: 0,
                    color: T.inkSoft,
                    fontSize: '0.84rem',
                    lineHeight: 1.6,
                  }}
                >
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </section>
      </Reveal>

      {/* ================================================================
          FINAL STATEMENT
      ================================================================ */}

      <Reveal>
        <section
          className="about-section"
          style={{
            maxWidth: 900,
            margin: '0 auto',
            padding: '90px 48px 140px',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              position: 'relative',
              padding: '50px 30px',
            }}
          >
            {/* Corners */}

            {[
              {
                top: 0,
                left: 0,
                borderTop: `2px solid ${T.blue}`,
                borderLeft: `2px solid ${T.blue}`,
              },
              {
                top: 0,
                right: 0,
                borderTop: `2px solid ${T.blue}`,
                borderRight: `2px solid ${T.blue}`,
              },
              {
                bottom: 0,
                left: 0,
                borderBottom: `2px solid ${T.blue}`,
                borderLeft: `2px solid ${T.blue}`,
              },
              {
                bottom: 0,
                right: 0,
                borderBottom: `2px solid ${T.blue}`,
                borderRight: `2px solid ${T.blue}`,
              },
            ].map((style, index) => (
              <div
                key={index}
                style={{
                  position: 'absolute',
                  width: 22,
                  height: 22,
                  ...style,
                }}
              />
            ))}

            <span
              className="malvin-mono"
              style={{
                fontSize: '0.65rem',
                color: T.blue,
                letterSpacing: '2px',
              }}
            >
              THE VISION
            </span>

            <h2
              className="malvin-display"
              style={{
                fontSize:
                  'clamp(2.2rem, 5vw, 4rem)',
                lineHeight: 1.08,
                letterSpacing: '-2px',
                margin:
                  '16px 0 20px',
              }}
            >
              Build useful things.
              <br />
              <span style={{ color: T.blue }}>
                Then build the next one.
              </span>
            </h2>

            <p
              style={{
                maxWidth: 600,
                margin: '0 auto',
                color: T.inkSoft,
                lineHeight: 1.7,
                fontSize: '0.95rem',
              }}
            >
              Malvin is designed to grow with every product
              we create. Reloop is one beginning. The
              ecosystem will continue to evolve.
            </p>
          </div>
        </section>
      </Reveal>

      {/* ================================================================
          FOOTER MARK
      ================================================================ */}

      <footer
        style={{
          borderTop: `1px solid ${T.line}`,
          padding: '28px 48px',
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 15,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
            }}
          >
            <div
              style={{
                width: 27,
                height: 27,
                borderRadius: 8,
                background:
                  'linear-gradient(135deg, #071E4D, #2F6FE0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles
                size={13}
                color="#fff"
              />
            </div>

            <span
              className="malvin-display"
              style={{
                fontWeight: 700,
                fontSize: '0.9rem',
              }}
            >
              MALVIN
            </span>
          </div>

          <span
            className="malvin-mono"
            style={{
              fontSize: '0.61rem',
              letterSpacing: '1.4px',
              color: T.inkFaint,
            }}
          >
            BUILDING THE PRODUCTS BEHIND THE PRODUCTS
          </span>
        </div>
      </footer>
    </div>
  );
};

export default About;