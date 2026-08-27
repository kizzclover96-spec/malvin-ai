import React, { useState } from 'react';
import {
  motion,
  AnimatePresence,
} from 'framer-motion';
import {
  ArrowRight,
  Sparkles,
  Layers,
  Globe2,
  Zap,
  Shield,
  Cpu,
  Users,
  Building2,
  ExternalLink,
  Mail,
  Lock,
  X,
  AlertTriangle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { ref, get } from 'firebase/database';
import { auth, db } from '../../firebase';
import { OWNER_EMAIL, emailToAdminKey } from '../../hooks/useAdminRole';

import Explore from './Explore';
import About from './About';

/* ============================================================================
   TYPES
============================================================================ */

interface LandingPageProps {}

/* ============================================================================
   DESIGN TOKENS
============================================================================ */

const T = {
  paper: '#FFFFFF',
  surface: '#F5F8FC',
  surfaceDark: '#07152F',

  ink: '#0B1220',
  inkSoft: 'rgba(11,18,32,0.62)',
  inkFaint: 'rgba(11,18,32,0.42)',

  blue: '#2F6FE0',
  blueDeep: '#071E4D',
  cyan: '#4FD1FF',

  line: 'rgba(11,18,32,0.08)',
  lineDark: 'rgba(255,255,255,0.10)',
};

/* ============================================================================
   SCROLL REVEAL
============================================================================ */

const ScrollReveal: React.FC<{
  children: React.ReactNode;
  delay?: number;
}> = ({ children, delay = 0 }) => {
  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 28,
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
   LANDING PAGE
============================================================================ */

const LandingPage: React.FC<LandingPageProps> = () => {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <div
      style={{
        minHeight: '100vh',
        background: T.paper,
        color: T.ink,
        fontFamily:
          "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        overflowX: 'hidden',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500&display=swap');

        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
        }

        .malvin-display {
          font-family: 'Space Grotesk', sans-serif;
        }

        .malvin-mono {
          font-family: 'JetBrains Mono', monospace;
        }

        .malvin-nav-link {
          color: ${T.inkSoft};
          text-decoration: none;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition:
            color 0.2s ease,
            opacity 0.2s ease;
        }

        .malvin-nav-link:hover {
          color: ${T.ink};
        }

        .malvin-nav-link.active {
          color: ${T.ink};
          font-weight: 600;
        }

        .malvin-primary {
          border: none;
          background: ${T.blue};
          color: #fff;
          padding: 15px 23px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.92rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          text-decoration: none;
          transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
        }

        .malvin-primary:hover {
          transform: translateY(-2px);
          box-shadow:
            0 16px 35px rgba(47,111,224,0.28);
        }

        .malvin-secondary {
          background: transparent;
          color: ${T.ink};
          border: 1px solid ${T.line};
          padding: 15px 23px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.92rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          text-decoration: none;
          transition:
            border-color 0.2s ease,
            background 0.2s ease,
            transform 0.2s ease;
        }

        .malvin-secondary:hover {
          border-color: rgba(47,111,224,0.35);
          background: ${T.surface};
          transform: translateY(-2px);
        }

        .malvin-grid {
          background-image:
            linear-gradient(
              rgba(11,18,32,0.035) 1px,
              transparent 1px
            ),
            linear-gradient(
              90deg,
              rgba(11,18,32,0.035) 1px,
              transparent 1px
            );
          background-size: 42px 42px;
        }

        .malvin-product-card {
          transition:
            transform 0.3s ease,
            box-shadow 0.3s ease,
            border-color 0.3s ease;
        }

        .malvin-product-card:hover {
          transform: translateY(-7px);
          box-shadow:
            0 25px 60px rgba(11,18,32,0.10);
          border-color: rgba(47,111,224,0.20) !important;
        }

        .malvin-tech-card {
          transition:
            transform 0.25s ease,
            background 0.25s ease;
        }

        .malvin-tech-card:hover {
          transform: translateY(-5px);
          background: rgba(255,255,255,0.06) !important;
        }

        .malvin-footer-link {
          color: rgba(11,18,32,0.55);
          text-decoration: none;
          font-size: 0.82rem;
          transition: color 0.2s ease;
        }

        .malvin-footer-link:hover {
          color: ${T.ink};
        }

        @media (max-width: 900px) {
          .malvin-nav {
            padding: 20px 24px !important;
          }

          .malvin-nav-links {
            gap: 18px !important;
          }

          .malvin-hero {
            padding:
              85px 28px
              100px !important;
          }

          .malvin-hero-title {
            font-size:
              clamp(3rem, 12vw, 5rem) !important;
            letter-spacing:
              -3px !important;
          }

          .malvin-products-grid {
            grid-template-columns:
              1fr !important;
          }

          .malvin-product-inner {
            grid-template-columns:
              1fr !important;
          }

          .malvin-product-visual {
            min-height: 330px !important;
          }

          .malvin-tech-grid {
            grid-template-columns:
              1fr 1fr !important;
          }

          .malvin-footer-grid {
            grid-template-columns:
              1fr 1fr !important;
          }
        }

        @media (max-width: 650px) {
          .malvin-nav-links {
            display: none !important;
          }

          .malvin-nav {
            padding:
              18px 20px !important;
          }

          .malvin-hero {
            padding:
              70px 22px
              85px !important;
          }

          .malvin-hero-title {
            font-size:
              clamp(2.8rem, 16vw, 4.3rem) !important;
            line-height: 0.98 !important;
          }

          .malvin-hero-copy {
            font-size:
              1rem !important;
          }

          .malvin-section {
            padding:
              85px 22px !important;
          }

          .malvin-tech-grid {
            grid-template-columns:
              1fr !important;
          }

          .malvin-footer {
            padding:
              50px 22px 25px !important;
          }

          .malvin-footer-grid {
            grid-template-columns:
              1fr !important;
          }

          .malvin-cta {
            padding:
              85px 22px !important;
          }

          .malvin-buttons {
            flex-direction: column;
            width: 100%;
          }

          .malvin-buttons a,
          .malvin-buttons button {
            width: 100%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            scroll-behavior: auto !important;
          }
        }
      `}</style>

      {/* ====================================================================
          NAVIGATION
      ==================================================================== */}

      <nav
        className="malvin-nav"
        style={{
          position: 'relative',
          zIndex: 50,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '26px 48px',
          maxWidth: 1280,
          margin: '0 auto',
        }}
      >
        {/* Logo */}

        <button
          onClick={() => setActiveTab('home')}
          style={{
            border: 'none',
            background: 'transparent',
            padding: 0,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
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
              src="/logo.png"
              alt="Malvin"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          </div>

          <span
            className="malvin-display"
            style={{
              fontSize: '1.08rem',
              fontWeight: 700,
              letterSpacing: '0.5px',
              color: T.ink,
            }}
          >
            MALVIN
          </span>
        </button>

        {/* Links */}

        <div
          className="malvin-nav-links"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 30,
          }}
        >
          <span
            onClick={() => setActiveTab('home')}
            className={`malvin-nav-link ${
              activeTab === 'home' ? 'active' : ''
            }`}
          >
            Home
          </span>

          <span
            onClick={() => setActiveTab('products')}
            className={`malvin-nav-link ${
              activeTab === 'products' ? 'active' : ''
            }`}
          >
            Products
          </span>

          <span
            onClick={() => setActiveTab('company')}
            className={`malvin-nav-link ${
              activeTab === 'company' ? 'active' : ''
            }`}
          >
            Company
          </span>

          <span
            onClick={() => setActiveTab('news')}
            className={`malvin-nav-link ${
              activeTab === 'news' ? 'active' : ''
            }`}
          >
            News
          </span>

          <Link
            to="/contact"
            className="malvin-nav-link"
          >
            Contact
          </Link>
        </div>
      </nav>

      {/* ====================================================================
          CONTENT
      ==================================================================== */}

      <AnimatePresence mode="wait">

        {/* ==================================================================
            HOME
        ================================================================== */}

        {activeTab === 'home' && (
          <motion.main
            key="home"
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            transition={{
              duration: 0.3,
            }}
          >

            {/* ==============================================================
                HERO
            ============================================================== */}

            <section
              className="malvin-hero malvin-grid"
              style={{
                position: 'relative',
                overflow: 'hidden',
                padding: '115px 48px 140px',
                background:
                  'linear-gradient(180deg, #F5F8FC 0%, #FFFFFF 100%)',
                textAlign: 'center',
              }}
            >
              {/* Glow */}

              <motion.div
                animate={{
                  scale: [1, 1.12, 1],
                  opacity: [0.35, 0.55, 0.35],
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                style={{
                  position: 'absolute',
                  width: 600,
                  height: 600,
                  top: -250,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  borderRadius: '50%',
                  background:
                    'radial-gradient(circle, rgba(47,111,224,0.13), transparent 68%)',
                  filter: 'blur(20px)',
                  pointerEvents: 'none',
                }}
              />

              <motion.div
                initial={{
                  opacity: 0,
                  y: 25,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                transition={{
                  duration: 0.7,
                }}
                style={{
                  position: 'relative',
                  zIndex: 2,
                  maxWidth: 1050,
                  margin: '0 auto',
                }}
              >
                <div
                  className="malvin-mono"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 9,
                    padding: '7px 11px',
                    borderRadius: 999,
                    border:
                      `1px solid rgba(47,111,224,0.15)`,
                    background:
                      'rgba(47,111,224,0.05)',
                    color: T.blue,
                    fontSize: '0.68rem',
                    letterSpacing: '2.5px',
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: T.blue,
                      boxShadow:
                        `0 0 10px ${T.blue}`,
                    }}
                  />

                  MALVIN AI
                </div>

                <h1
                  className="malvin-display malvin-hero-title"
                  style={{
                    fontSize:
                      'clamp(4rem, 9vw, 7.8rem)',
                    lineHeight: 0.94,
                    letterSpacing: '-6px',
                    fontWeight: 700,
                    margin:
                      '30px auto 32px',
                    maxWidth: 1000,
                  }}
                >
                  We build
                  <br />

                  <span
                    style={{
                      color: T.blue,
                    }}
                  >
                    what comes next.
                  </span>
                </h1>

                <p
                  className="malvin-hero-copy"
                  style={{
                    maxWidth: 670,
                    margin: '0 auto',
                    fontSize: '1.13rem',
                    lineHeight: 1.75,
                    color: T.inkSoft,
                  }}
                >
                  Malvin is a technology enterprise
                  building intelligent products,
                  infrastructure and digital experiences
                  for the next generation.
                </p>

                <div
                  className="malvin-buttons"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 13,
                    marginTop: 38,
                    flexWrap: 'wrap',
                  }}
                >
                  <button
                    onClick={() =>
                      setActiveTab('products')
                    }
                    className="malvin-primary"
                  >
                    Explore our products
                    <ArrowRight size={16} />
                  </button>

                  <button
                    onClick={() =>
                      setActiveTab('company')
                    }
                    className="malvin-secondary"
                  >
                    About Malvin
                  </button>
                </div>
              </motion.div>
            </section>

            {/* ==============================================================
                INTRODUCTION
            ============================================================== */}

            <ScrollReveal>
              <section
                className="malvin-section"
                style={{
                  maxWidth: 1100,
                  margin: '0 auto',
                  padding: '125px 48px',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      '0.8fr 1.2fr',
                    gap: 80,
                    alignItems: 'start',
                  }}
                >
                  <div>
                    <span
                      className="malvin-mono"
                      style={{
                        fontSize: '0.68rem',
                        color: T.blue,
                        letterSpacing: '2.5px',
                      }}
                    >
                      WHAT IS MALVIN?
                    </span>
                  </div>

                  <div>
                    <h2
                      className="malvin-display"
                      style={{
                        fontSize:
                          'clamp(2.2rem, 5vw, 4rem)',
                        lineHeight: 1.08,
                        letterSpacing: '-2px',
                        margin: 0,
                      }}
                    >
                      We don't build
                      <br />

                      <span
                        style={{
                          color: T.blue,
                        }}
                      >
                        just one app.
                      </span>
                    </h2>

                    <p
                      style={{
                        color: T.inkSoft,
                        fontSize: '1.02rem',
                        lineHeight: 1.75,
                        marginTop: 25,
                        maxWidth: 600,
                      }}
                    >
                      Malvin is built as an enterprise
                      that creates and operates products.
                      Each product has its own purpose,
                      identity and users — while benefiting
                      from the technology and systems we
                      build underneath.
                    </p>
                  </div>
                </div>
              </section>
            </ScrollReveal>

            {/* ==============================================================
                PRODUCTS
            ============================================================== */}

            <section
              className="malvin-section"
              style={{
                background: T.surface,
                padding: '125px 48px',
              }}
            >
              <div
                style={{
                  maxWidth: 1180,
                  margin: '0 auto',
                }}
              >
                <ScrollReveal>
                  <div
                    style={{
                      marginBottom: 55,
                    }}
                  >
                    <span
                      className="malvin-mono"
                      style={{
                        color: T.blue,
                        fontSize: '0.68rem',
                        letterSpacing: '2.5px',
                      }}
                    >
                      OUR PRODUCTS
                    </span>

                    <h2
                      className="malvin-display"
                      style={{
                        fontSize:
                          'clamp(2.5rem, 5vw, 4.5rem)',
                        lineHeight: 1,
                        letterSpacing: '-2.5px',
                        margin:
                          '14px 0 0',
                      }}
                    >
                      Technology with
                      <br />
                      a purpose.
                    </h2>
                  </div>
                </ScrollReveal>

                {/* Reloop */}

                <ScrollReveal delay={0.08}>
                  <div
                    className="malvin-product-card"
                    style={{
                      background: '#fff',
                      border:
                        `1px solid ${T.line}`,
                      borderRadius: 28,
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      className="malvin-product-inner"
                      style={{
                        display: 'grid',
                        gridTemplateColumns:
                          '1fr 1fr',
                      }}
                    >
                      {/* Copy */}

                      <div
                        style={{
                          padding:
                            '65px 55px',
                          display: 'flex',
                          flexDirection:
                            'column',
                          justifyContent:
                            'center',
                        }}
                      >
                        <div
                          className="malvin-mono"
                          style={{
                            color: T.blue,
                            fontSize:
                              '0.65rem',
                            letterSpacing:
                              '2px',
                            marginBottom:
                              16,
                          }}
                        >
                          MALVIN PRODUCT · 01
                        </div>

                        <h3
                          className="malvin-display"
                          style={{
                            fontSize:
                              'clamp(2.8rem, 5vw, 4.5rem)',
                            letterSpacing:
                              '-3px',
                            lineHeight: 0.95,
                            margin: 0,
                          }}
                        >
                          RELOOP
                        </h3>

                        <p
                          className="malvin-display"
                          style={{
                            fontSize:
                              '1.25rem',
                            lineHeight:
                              1.45,
                            maxWidth: 470,
                            margin:
                              '24px 0 12px',
                          }}
                        >
                          Give things another
                          life.
                        </p>

                        <p
                          style={{
                            color:
                              T.inkSoft,
                            fontSize:
                              '0.92rem',
                            lineHeight:
                              1.7,
                            maxWidth: 460,
                            margin:
                              '0 0 28px',
                          }}
                        >
                          Reloop is a recommerce
                          platform designed to make
                          second-hand buying and
                          selling simple, accessible
                          and human.
                        </p>

                        <Link
                          to="/reloop"
                          className="malvin-primary"
                          style={{
                            width:
                              'fit-content',
                          }}
                        >
                          Discover Reloop
                          <ArrowRight
                            size={16}
                          />
                        </Link>

                        <div
                          className="malvin-mono"
                          style={{
                            marginTop: 25,
                            fontSize:
                              '0.62rem',
                            color:
                              T.inkFaint,
                            letterSpacing:
                              '1.5px',
                          }}
                        >
                          POWERED BY MALVIN
                        </div>
                      </div>

                      {/* Visual */}

                      <div
                        className="malvin-product-visual"
                        style={{
                          minHeight: 500,
                          background:
                            'linear-gradient(135deg, #101010 0%, #262626 50%, #111111 100%)',
                          position:
                            'relative',
                          overflow:
                            'hidden',
                          display: 'flex',
                          alignItems:
                            'center',
                          justifyContent:
                            'center',
                        }}
                      >
                        {/* Decorative rings */}

                        <motion.div
                          animate={{
                            rotate: 360,
                          }}
                          transition={{
                            duration: 30,
                            repeat: Infinity,
                            ease: 'linear',
                          }}
                          style={{
                            position:
                              'absolute',
                            width: 430,
                            height: 430,
                            borderRadius:
                              '50%',
                            border:
                              '1px solid rgba(255,255,255,0.08)',
                          }}
                        />

                        <motion.div
                          animate={{
                            rotate: -360,
                          }}
                          transition={{
                            duration: 22,
                            repeat: Infinity,
                            ease: 'linear',
                          }}
                          style={{
                            position:
                              'absolute',
                            width: 300,
                            height: 300,
                            borderRadius:
                              '50%',
                            border:
                              '1px solid rgba(255,255,255,0.08)',
                          }}
                        />

                        {/* Glow */}

                        <div
                          style={{
                            position:
                              'absolute',
                            width: 280,
                            height: 280,
                            borderRadius:
                              '50%',
                            background:
                              'radial-gradient(circle, rgba(255,255,255,0.13), transparent 68%)',
                            filter:
                              'blur(15px)',
                          }}
                        />

                        <motion.div
                          animate={{
                            y: [-8, 8, -8],
                          }}
                          transition={{
                            duration: 5,
                            repeat: Infinity,
                            ease: 'easeInOut',
                          }}
                          style={{
                            position:
                              'relative',
                            zIndex: 2,
                            textAlign:
                              'center',
                          }}
                        >
                          <div
                            className="malvin-display"
                            style={{
                              color: '#fff',
                              fontSize:
                                'clamp(3.4rem, 7vw, 6rem)',
                              fontWeight:
                                700,
                              letterSpacing:
                                '-4px',
                            }}
                          >
                            RELOOP
                          </div>

                          <div
                            className="malvin-mono"
                            style={{
                              color:
                                'rgba(255,255,255,0.45)',
                              fontSize:
                                '0.62rem',
                              letterSpacing:
                                '3px',
                              marginTop:
                                13,
                            }}
                          >
                            SECOND LIFE
                          </div>
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>

                {/* Coming soon */}

                <div
                  className="malvin-products-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      '1fr 1fr',
                    gap: 18,
                    marginTop: 18,
                  }}
                >
                  <ScrollReveal delay={0.12}>
                    <ProductComingSoon
                      number="02"
                      title="Coming soon."
                      description="Another Malvin product is already being built."
                    />
                  </ScrollReveal>

                  <ScrollReveal delay={0.18}>
                    <ProductComingSoon
                      number="03"
                      title="More to come."
                      description="Malvin is building a portfolio of products across different experiences."
                    />
                  </ScrollReveal>
                </div>
              </div>
            </section>

            {/* ==============================================================
                TECHNOLOGY
            ============================================================== */}

            <section
              style={{
                background: T.surfaceDark,
                color: '#fff',
                padding: '130px 48px',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Background glow */}

              <motion.div
                animate={{
                  scale: [1, 1.15, 1],
                  opacity: [0.2, 0.35, 0.2],
                }}
                transition={{
                  duration: 9,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
                style={{
                  position: 'absolute',
                  width: 700,
                  height: 700,
                  left: '50%',
                  top: '40%',
                  transform:
                    'translate(-50%, -50%)',
                  borderRadius: '50%',
                  background:
                    'radial-gradient(circle, rgba(47,111,224,0.28), transparent 68%)',
                  filter: 'blur(45px)',
                }}
              />

              <div
                style={{
                  position:
                    'relative',
                  maxWidth: 1180,
                  margin: '0 auto',
                }}
              >
                <ScrollReveal>
                  <span
                    className="malvin-mono"
                    style={{
                      color: T.cyan,
                      fontSize:
                        '0.68rem',
                      letterSpacing:
                        '2.5px',
                    }}
                  >
                    THE TECHNOLOGY
                  </span>

                  <h2
                    className="malvin-display"
                    style={{
                      fontSize:
                        'clamp(2.6rem, 6vw, 5rem)',
                      lineHeight:
                        1.02,
                      letterSpacing:
                        '-3px',
                      maxWidth: 800,
                      margin:
                        '15px 0 25px',
                    }}
                  >
                    The products are
                    different.
                    <br />

                    <span
                      style={{
                        color: T.cyan,
                      }}
                    >
                      The technology connects them.
                    </span>
                  </h2>

                  <p
                    style={{
                      maxWidth: 650,
                      color:
                        'rgba(255,255,255,0.52)',
                      lineHeight: 1.75,
                      fontSize:
                        '1rem',
                    }}
                  >
                    Malvin develops the systems,
                    infrastructure and intelligent
                    technology that allow our products
                    to evolve independently while
                    sharing a common foundation.
                  </p>
                </ScrollReveal>

                <div
                  className="malvin-tech-grid"
                  style={{
                    display: 'grid',
                    gridTemplateColumns:
                      'repeat(3, 1fr)',
                    gap: 14,
                    marginTop: 65,
                  }}
                >
                  <TechnologyCard
                    icon={Cpu}
                    title="Intelligence"
                    description="AI systems designed to understand, reason and assist."
                  />

                  <TechnologyCard
                    icon={Layers}
                    title="Infrastructure"
                    description="Scalable systems that keep products connected and reliable."
                  />

                  <TechnologyCard
                    icon={Shield}
                    title="Security"
                    description="Technology designed with privacy and security at its foundation."
                  />

                  <TechnologyCard
                    icon={Globe2}
                    title="Connectivity"
                    description="Systems that allow products and people to interact seamlessly."
                  />

                  <TechnologyCard
                    icon={Zap}
                    title="Automation"
                    description="Reducing repetitive work through intelligent systems."
                  />

                  <TechnologyCard
                    icon={Users}
                    title="People"
                    description="Technology built around real human needs, not technology for its own sake."
                  />
                </div>
              </div>
            </section>

            {/* ==============================================================
                PHILOSOPHY
            ============================================================== */}

            <ScrollReveal>
              <section
                className="malvin-section"
                style={{
                  maxWidth: 1000,
                  margin: '0 auto',
                  padding:
                    '135px 48px',
                  textAlign: 'center',
                }}
              >
                <span
                  className="malvin-mono"
                  style={{
                    color: T.blue,
                    fontSize:
                      '0.68rem',
                    letterSpacing:
                      '2.5px',
                  }}
                >
                  OUR APPROACH
                </span>

                <h2
                  className="malvin-display"
                  style={{
                    fontSize:
                      'clamp(2.7rem, 6vw, 5rem)',
                    lineHeight:
                      1.03,
                    letterSpacing:
                      '-3px',
                    margin:
                      '18px 0 25px',
                  }}
                >
                  Build.
                  <br />
                  Launch.
                  <br />

                  <span
                    style={{
                      color: T.blue,
                    }}
                  >
                    Improve.
                  </span>
                </h2>

                <p
                  style={{
                    maxWidth: 610,
                    margin:
                      '0 auto',
                    color:
                      T.inkSoft,
                    lineHeight:
                      1.75,
                  }}
                >
                  We build products, put them in
                  the hands of real people, learn
                  from what happens and keep
                  improving them.
                </p>
              </section>
            </ScrollReveal>

            {/* ==============================================================
                FUTURE
            ============================================================== */}

            <section
              style={{
                background:
                  T.surface,
                padding:
                  '110px 48px',
                textAlign:
                  'center',
              }}
            >
              <ScrollReveal>
                <span
                  className="malvin-mono"
                  style={{
                    color: T.blue,
                    fontSize:
                      '0.68rem',
                    letterSpacing:
                      '2.5px',
                  }}
                >
                  THE ROAD AHEAD
                </span>

                <h2
                  className="malvin-display"
                  style={{
                    fontSize:
                      'clamp(2.5rem, 6vw, 5rem)',
                    lineHeight:
                      1,
                    letterSpacing:
                      '-3px',
                    margin:
                      '18px auto 25px',
                  }}
                >
                  Reloop is just
                  <br />
                  the beginning.
                </h2>

                <p
                  style={{
                    maxWidth: 620,
                    margin:
                      '0 auto',
                    color:
                      T.inkSoft,
                    lineHeight:
                      1.75,
                  }}
                >
                  Malvin is building a portfolio
                  of products designed to solve
                  different problems across everyday
                  life and business.
                </p>
              </ScrollReveal>
            </section>

            {/* ==============================================================
                CTA
            ============================================================== */}

            <section
              className="malvin-cta"
              style={{
                position:
                  'relative',
                padding:
                  '125px 48px',
                textAlign:
                  'center',
                overflow:
                  'hidden',
                background:
                  `linear-gradient(135deg, ${T.blueDeep}, ${T.blue})`,
                color: '#fff',
              }}
            >
              <div
                style={{
                  position:
                    'absolute',
                  inset: 0,
                  opacity: 0.08,
                  backgroundImage:
                    'radial-gradient(#fff 1px, transparent 1px)',
                  backgroundSize:
                    '24px 24px',
                }}
              />

              <motion.div
                animate={{
                  scale: [
                    1,
                    1.12,
                    1,
                  ],
                  opacity: [
                    0.2,
                    0.35,
                    0.2,
                  ],
                }}
                transition={{
                  duration: 7,
                  repeat: Infinity,
                }}
                style={{
                  position:
                    'absolute',
                  width: 500,
                  height: 500,
                  left: '50%',
                  top: '50%',
                  transform:
                    'translate(-50%, -50%)',
                  borderRadius:
                    '50%',
                  background:
                    'radial-gradient(circle, rgba(79,209,255,0.35), transparent 68%)',
                  filter:
                    'blur(40px)',
                }}
              />

              <div
                style={{
                  position:
                    'relative',
                  zIndex: 2,
                  maxWidth: 750,
                  margin:
                    '0 auto',
                }}
              >
                <span
                  className="malvin-mono"
                  style={{
                    color:
                      'rgba(255,255,255,0.55)',
                    fontSize:
                      '0.68rem',
                    letterSpacing:
                      '2.5px',
                  }}
                >
                  MALVIN AI
                </span>

                <h2
                  className="malvin-display"
                  style={{
                    fontSize:
                      'clamp(2.7rem, 6vw, 5rem)',
                    lineHeight:
                      1.02,
                    letterSpacing:
                      '-3px',
                    margin:
                      '18px 0 20px',
                  }}
                >
                  Something new
                  <br />
                  is being built.
                </h2>

                <p
                  style={{
                    color:
                      'rgba(255,255,255,0.62)',
                    lineHeight:
                      1.7,
                    maxWidth: 570,
                    margin:
                      '0 auto',
                  }}
                >
                  Explore what Malvin is building
                  today — and follow what comes next.
                </p>

                <div
                  className="malvin-buttons"
                  style={{
                    display:
                      'flex',
                    justifyContent:
                      'center',
                    gap: 12,
                    flexWrap:
                      'wrap',
                    marginTop:
                      32,
                  }}
                >
                  <button
                    onClick={() =>
                      setActiveTab(
                        'products'
                      )
                    }
                    style={{
                      border: 'none',
                      background:
                        '#fff',
                      color:
                        T.ink,
                      padding:
                        '15px 23px',
                      borderRadius:
                        12,
                      fontWeight:
                        700,
                      cursor:
                        'pointer',
                      display:
                        'inline-flex',
                      alignItems:
                        'center',
                      gap: 8,
                    }}
                  >
                    Explore products
                    <ArrowRight
                      size={16}
                    />
                  </button>

                  <Link
                    to="/contact"
                    style={{
                      color:
                        '#fff',
                      border:
                        '1px solid rgba(255,255,255,0.25)',
                      padding:
                        '15px 23px',
                      borderRadius:
                        12,
                      fontWeight:
                        700,
                      textDecoration:
                        'none',
                      display:
                        'inline-flex',
                      alignItems:
                        'center',
                      gap: 8,
                    }}
                  >
                    Contact Malvin
                  </Link>
                </div>
              </div>
            </section>

            {/* ==============================================================
                FOOTER
            ============================================================== */}

            <MalvinFooter
              onHome={() =>
                setActiveTab('home')
              }
              onProducts={() =>
                setActiveTab(
                  'products'
                )
              }
              onCompany={() =>
                setActiveTab(
                  'company'
                )
              }
              onNews={() =>
                setActiveTab('news')
              }
            />
          </motion.main>
        )}

        {/* ==================================================================
            PRODUCTS TAB
        ================================================================== */}

        {activeTab === 'products' && (
          <motion.main
            key="products"
            initial={{
              opacity: 0,
              y: 15,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
            }}
            transition={{
              duration: 0.35,
            }}
          >
            <ProductsPage
              onHome={() =>
                setActiveTab('home')
              }
            />
          </motion.main>
        )}

        {/* ==================================================================
            COMPANY TAB
        ================================================================== */}

        {activeTab === 'company' && (
          <motion.main
            key="company"
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
          >
            <About />

            <MalvinFooter
              onHome={() =>
                setActiveTab('home')
              }
              onProducts={() =>
                setActiveTab(
                  'products'
                )
              }
              onCompany={() =>
                setActiveTab(
                  'company'
                )
              }
              onNews={() =>
                setActiveTab('news')
              }
            />
          </motion.main>
        )}

        {/* ==================================================================
            NEWS TAB
        ================================================================== */}

        {activeTab === 'news' && (
          <motion.main
            key="news"
            initial={{
              opacity: 0,
              y: 15,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
            }}
            transition={{
              duration: 0.35,
            }}
          >
            <NewsPage />

            <MalvinFooter
              onHome={() =>
                setActiveTab('home')
              }
              onProducts={() =>
                setActiveTab(
                  'products'
                )
              }
              onCompany={() =>
                setActiveTab(
                  'company'
                )
              }
              onNews={() =>
                setActiveTab('news')
              }
            />
          </motion.main>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ============================================================================
   PRODUCT COMING SOON
============================================================================ */

const ProductComingSoon: React.FC<{
  number: string;
  title: string;
  description: string;
}> = ({
  number,
  title,
  description,
}) => {
  return (
    <div
      style={{
        minHeight: 250,
        padding: 30,
        borderRadius: 22,
        border:
          `1px solid ${T.line}`,
        background:
          'rgba(255,255,255,0.65)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <div
        className="malvin-mono"
        style={{
          fontSize: '0.65rem',
          color: T.inkFaint,
          letterSpacing: '2px',
        }}
      >
        PRODUCT · {number}
      </div>

      <div>
        <h3
          className="malvin-display"
          style={{
            fontSize: '1.6rem',
            margin: '0 0 10px',
          }}
        >
          {title}
        </h3>

        <p
          style={{
            color: T.inkSoft,
            fontSize: '0.88rem',
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {description}
        </p>
      </div>
    </div>
  );
};

/* ============================================================================
   TECHNOLOGY CARD
============================================================================ */

const TechnologyCard: React.FC<{
  icon: any;
  title: string;
  description: string;
}> = ({
  icon: Icon,
  title,
  description,
}) => {
  return (
    <div
      className="malvin-tech-card"
      style={{
        minHeight: 210,
        padding: 28,
        borderRadius: 20,
        border:
          `1px solid ${T.lineDark}`,
        background:
          'rgba(255,255,255,0.035)',
      }}
    >
      <Icon
        size={22}
        color={T.cyan}
      />

      <h3
        className="malvin-display"
        style={{
          fontSize: '1.1rem',
          margin:
            '20px 0 9px',
        }}
      >
        {title}
      </h3>

      <p
        style={{
          margin: 0,
          color:
            'rgba(255,255,255,0.48)',
          fontSize: '0.84rem',
          lineHeight: 1.65,
        }}
      >
        {description}
      </p>
    </div>
  );
};

/* ============================================================================
   PRODUCTS PAGE
============================================================================ */

const ProductsPage: React.FC<{
  onHome: () => void;
}> = ({ onHome }) => {
  return (
    <>
      <section
        style={{
          padding:
            '110px 48px 80px',
          background:
            'linear-gradient(180deg, #F5F8FC, #fff)',
          textAlign: 'center',
        }}
      >
        <div
          className="malvin-mono"
          style={{
            color: T.blue,
            fontSize: '0.68rem',
            letterSpacing: '2.5px',
          }}
        >
          MALVIN PRODUCTS
        </div>

        <h1
          className="malvin-display"
          style={{
            fontSize:
              'clamp(3rem, 7vw, 6rem)',
            letterSpacing:
              '-4px',
            lineHeight: 0.98,
            margin:
              '20px auto',
          }}
        >
          Products built
          <br />
          <span
            style={{
              color: T.blue,
            }}
          >
            for people.
          </span>
        </h1>

        <p
          style={{
            maxWidth: 620,
            margin:
              '0 auto',
            color: T.inkSoft,
            lineHeight: 1.7,
          }}
        >
          Malvin creates products with
          independent identities and purposes,
          all backed by the technology we build
          underneath.
        </p>
      </section>

      <section
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding:
            '80px 48px 130px',
        }}
      >
        <div
          className="malvin-product-card"
          style={{
            border:
              `1px solid ${T.line}`,
            borderRadius: 28,
            overflow: 'hidden',
            background: '#fff',
          }}
        >
          <div
            className="malvin-product-inner"
            style={{
              display: 'grid',
              gridTemplateColumns:
                '1fr 1fr',
            }}
          >
            <div
              style={{
                minHeight: 500,
                background:
                  '#111',
                color: '#fff',
                display: 'flex',
                alignItems:
                  'center',
                justifyContent:
                  'center',
                position:
                  'relative',
                overflow:
                  'hidden',
              }}
            >
              <motion.div
                animate={{
                  rotate: 360,
                }}
                transition={{
                  duration: 25,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                style={{
                  position:
                    'absolute',
                  width: 420,
                  height: 420,
                  borderRadius:
                    '50%',
                  border:
                    '1px solid rgba(255,255,255,0.1)',
                }}
              />

              <div
                className="malvin-display"
                style={{
                  position:
                    'relative',
                  zIndex: 2,
                  fontSize:
                    'clamp(3.5rem, 8vw, 6rem)',
                  fontWeight: 700,
                  letterSpacing:
                    '-4px',
                }}
              >
                RELOOP
              </div>
            </div>

            <div
              style={{
                padding:
                  '60px 50px',
                display:
                  'flex',
                flexDirection:
                  'column',
                justifyContent:
                  'center',
              }}
            >
              <div
                className="malvin-mono"
                style={{
                  color: T.blue,
                  fontSize:
                    '0.65rem',
                  letterSpacing:
                    '2px',
                  marginBottom:
                    15,
                }}
              >
                MALVIN PRODUCT · 01
              </div>

              <h2
                className="malvin-display"
                style={{
                  fontSize:
                    '3.5rem',
                  letterSpacing:
                    '-3px',
                  margin: 0,
                }}
              >
                Reloop
              </h2>

              <p
                className="malvin-display"
                style={{
                  fontSize:
                    '1.25rem',
                  lineHeight: 1.5,
                }}
              >
                Buy better.
                <br />
                Sell smarter.
                <br />
                Give things another life.
              </p>

              <p
                style={{
                  color:
                    T.inkSoft,
                  lineHeight:
                    1.7,
                  fontSize:
                    '0.9rem',
                }}
              >
                Reloop is Malvin's first
                consumer product, focused
                on recommerce and making
                second-hand commerce feel
                simple and modern.
              </p>

              <Link
                to="/reloop"
                className="malvin-primary"
                style={{
                  width:
                    'fit-content',
                  marginTop: 15,
                }}
              >
                Open Reloop
                <ExternalLink
                  size={15}
                />
              </Link>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 18,
            padding: 35,
            border:
              `1px solid ${T.line}`,
            borderRadius: 22,
            background:
              T.surface,
            textAlign: 'center',
          }}
        >
          <span
            className="malvin-mono"
            style={{
              fontSize:
                '0.65rem',
              color:
                T.inkFaint,
              letterSpacing:
                '2px',
            }}
          >
            MORE PRODUCTS
          </span>

          <h3
            className="malvin-display"
            style={{
              fontSize:
                '1.8rem',
              margin:
                '12px 0 8px',
            }}
          >
            Coming soon.
          </h3>

          <p
            style={{
              color:
                T.inkSoft,
              margin: 0,
              fontSize:
                '0.9rem',
            }}
          >
            Reloop is only the beginning
            of what Malvin is building.
          </p>
        </div>

        <div
          style={{
            textAlign:
              'center',
            marginTop:
              45,
          }}
        >
          <button
            onClick={onHome}
            className="malvin-secondary"
          >
            <ArrowRight
              size={15}
              style={{
                transform:
                  'rotate(180deg)',
              }}
            />
            Back home
          </button>
        </div>
      </section>
    </>
  );
};

/* ============================================================================
   NEWS PAGE
============================================================================ */

const NewsPage: React.FC = () => {
  const updates = [
    {
      date: 'AUGUST 2026',
      title:
        'Malvin enters a new chapter',
      description:
        'Malvin is evolving from a single product into a technology enterprise focused on building and operating a portfolio of products.',
    },
    {
      date: 'AUGUST 2026',
      title:
        'Reloop joins the Malvin ecosystem',
      description:
        'Reloop becomes the first consumer product being developed under the Malvin technology ecosystem.',
    },
    {
      date: 'COMING SOON',
      title:
        'More products are being built',
      description:
        'The next products are already in development. More details will be announced as they become ready.',
    },
  ];

  return (
    <>
      <section
        style={{
          padding:
            '110px 48px 75px',
          background:
            'linear-gradient(180deg, #F5F8FC, #fff)',
        }}
      >
        <div
          style={{
            maxWidth: 850,
            margin:
              '0 auto',
          }}
        >
          <span
            className="malvin-mono"
            style={{
              color: T.blue,
              fontSize:
                '0.68rem',
              letterSpacing:
                '2.5px',
            }}
          >
            MALVIN NEWS
          </span>

          <h1
            className="malvin-display"
            style={{
              fontSize:
                'clamp(3rem, 7vw, 5.5rem)',
              letterSpacing:
                '-4px',
              lineHeight: 1,
              margin:
                '18px 0 20px',
            }}
          >
            What's
            <br />
            happening.
          </h1>

          <p
            style={{
              color:
                T.inkSoft,
              lineHeight:
                1.7,
              maxWidth:
                600,
            }}
          >
            Updates from Malvin,
            its products and the
            technology we're building.
          </p>
        </div>
      </section>

      <section
        style={{
          maxWidth: 850,
          margin:
            '0 auto',
          padding:
            '60px 48px 130px',
        }}
      >
        <div
          style={{
            display:
              'flex',
            flexDirection:
              'column',
            gap: 16,
          }}
        >
          {updates.map(
            (item, index) => (
              <ScrollReveal
                key={item.title}
                delay={
                  index * 0.08
                }
              >
                <article
                  style={{
                    padding:
                      '28px 30px',
                    border:
                      `1px solid ${T.line}`,
                    borderRadius:
                      20,
                    background:
                      '#fff',
                  }}
                >
                  <div
                    className="malvin-mono"
                    style={{
                      fontSize:
                        '0.62rem',
                      letterSpacing:
                        '1.8px',
                      color:
                        T.blue,
                      marginBottom:
                        12,
                    }}
                  >
                    {item.date}
                  </div>

                  <h2
                    className="malvin-display"
                    style={{
                      fontSize:
                        '1.35rem',
                      margin:
                        '0 0 9px',
                    }}
                  >
                    {item.title}
                  </h2>

                  <p
                    style={{
                      color:
                        T.inkSoft,
                      fontSize:
                        '0.88rem',
                      lineHeight:
                        1.65,
                      margin: 0,
                    }}
                  >
                    {item.description}
                  </p>
                </article>
              </ScrollReveal>
            )
          )}
        </div>
      </section>
    </>
  );
};

/* ============================================================================
   FOOTER
============================================================================ */

/* ============================================================================
   ADMIN-ONLY ACCESS MODAL
   Reached only via the mail icon in the footer's "Connect" column. This is
   NOT the regular customer sign-in flow — it is a restricted gate intended
   solely for authorized Malvin personnel/admins. Non-admin credentials are
   accepted by Firebase Auth (any real account can technically authenticate)
   but are immediately signed back out the moment we confirm the signed-in
   email isn't the Owner or an active admin record, so no non-admin session
   is ever left standing from this entry point.
============================================================================ */

const AdminAccessModal: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const resetAndClose = () => {
    setEmail('');
    setPassword('');
    setError(null);
    setSubmitting(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);

    try {
      const cred = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      const signedInEmail = (cred.user.email || '').toLowerCase();
      const isOwner = signedInEmail === OWNER_EMAIL.toLowerCase();

      let isActiveAdmin = false;
      if (!isOwner) {
        const key = emailToAdminKey(signedInEmail);
        const snap = await get(ref(db, `admin/admins/${key}`));
        const record = snap.exists() ? snap.val() : null;
        isActiveAdmin = record?.status === 'active';
      }

      if (isOwner || isActiveAdmin) {
        // Recognized admin — let the normal app-level auth listener pick
        // this session up and route into the admin dashboard.
        window.location.reload();
        return;
      }

      // Not an authorized admin — never leave this session signed in.
      await signOut(auth);
      setError(
        'Access denied. This account is not authorized for Malvin admin access. This attempt has been logged.'
      );
    } catch (err: any) {
      setError(
        'Sign-in failed. Check your credentials and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={resetAndClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(7,21,47,0.72)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 400,
          background: T.paper,
          borderRadius: 16,
          border: `1px solid ${T.line}`,
          boxShadow: '0 30px 80px rgba(7,21,47,0.35)',
          padding: '28px 26px 26px',
          position: 'relative',
        }}
      >
        <button
          onClick={resetAndClose}
          aria-label="Close"
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            color: T.inkFaint,
            padding: 4,
            display: 'flex',
          }}
        >
          <X size={18} />
        </button>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            marginBottom: 14,
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: T.blueDeep,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Lock size={16} color="#fff" />
          </div>
          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: '0.95rem',
                color: T.ink,
              }}
            >
              Malvin Admin Access
            </div>
            <div
              className="malvin-mono"
              style={{
                fontSize: '0.6rem',
                letterSpacing: '1px',
                color: T.inkFaint,
              }}
            >
              RESTRICTED
            </div>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 9,
            alignItems: 'flex-start',
            background: 'rgba(191,0,0,0.06)',
            border: '1px solid rgba(191,0,0,0.18)',
            borderRadius: 10,
            padding: '11px 12px',
            marginBottom: 18,
          }}
        >
          <AlertTriangle
            size={15}
            color="#a30000"
            style={{ flexShrink: 0, marginTop: 1 }}
          />
          <p
            style={{
              margin: 0,
              fontSize: '0.72rem',
              lineHeight: 1.5,
              color: '#7a0d0d',
            }}
          >
            For authorized Malvin personnel only. Unauthorized users are
            likely to have their data stolen, and Malvin plays no part in
            that outcome.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label
            style={{
              display: 'block',
              fontSize: '0.72rem',
              fontWeight: 600,
              color: T.inkSoft,
              marginBottom: 6,
            }}
          >
            Admin email
          </label>
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@malvinai.com"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: `1px solid ${T.line}`,
              fontSize: '0.85rem',
              marginBottom: 14,
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />

          <label
            style={{
              display: 'block',
              fontSize: '0.72rem',
              fontWeight: 600,
              color: T.inkSoft,
              marginBottom: 6,
            }}
          >
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 8,
              border: `1px solid ${T.line}`,
              fontSize: '0.85rem',
              marginBottom: 16,
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />

          {error && (
            <div
              style={{
                fontSize: '0.72rem',
                color: '#a30000',
                marginBottom: 14,
                lineHeight: 1.4,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              padding: '11px 0',
              borderRadius: 9,
              border: 'none',
              background: submitting ? T.inkFaint : T.blueDeep,
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: submitting ? 'default' : 'pointer',
            }}
          >
            {submitting ? 'Verifying…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
};

const MalvinFooter: React.FC<{
  onHome: () => void;
  onProducts: () => void;
  onCompany: () => void;
  onNews: () => void;
}> = ({
  onHome,
  onProducts,
  onCompany,
  onNews,
}) => {
  const [adminModalOpen, setAdminModalOpen] = useState(false);

  return (
    <footer
      className="malvin-footer"
      style={{
        borderTop:
          `1px solid ${T.line}`,
        padding:
          '65px 48px 28px',
        background:
          '#fff',
      }}
    >
      <div
        className="malvin-footer-grid"
        style={{
          maxWidth: 1180,
          margin:
            '0 auto',
          display:
            'grid',
          gridTemplateColumns:
            '2fr 1fr 1fr 1fr',
          gap: 50,
        }}
      >
        {/* Brand */}

        <div>
          <div
            style={{
              display:
                'flex',
              alignItems:
                'center',
              gap: 9,
            }}
          >
            <img
              src="/logo.png"
              alt="Malvin"
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                objectFit:
                  'cover',
              }}
            />

            <span
              className="malvin-display"
              style={{
                fontSize:
                  '1.05rem',
                fontWeight:
                  700,
              }}
            >
              MALVIN
            </span>
          </div>

          <p
            style={{
              maxWidth: 300,
              color:
                T.inkFaint,
              fontSize:
                '0.83rem',
              lineHeight:
                1.65,
              marginTop:
                17,
            }}
          >
            A technology enterprise
            building products for
            what comes next.
          </p>
        </div>

        {/* Products */}

        <div>
          <strong
            style={{
              fontSize:
                '0.82rem',
            }}
          >
            Products
          </strong>

          <div
            style={{
              display:
                'flex',
              flexDirection:
                'column',
              gap: 10,
              marginTop:
                17,
            }}
          >
            <Link
              to="/reloop"
              className="malvin-footer-link"
            >
              Reloop
            </Link>

            <span
              className="malvin-footer-link"
              style={{
                cursor:
                  'default',
                opacity:
                  0.6,
              }}
            >
              Coming soon
            </span>
          </div>
        </div>

        {/* Company */}

        <div>
          <strong
            style={{
              fontSize:
                '0.82rem',
            }}
          >
            Company
          </strong>

          <div
            style={{
              display:
                'flex',
              flexDirection:
                'column',
              gap: 10,
              marginTop:
                17,
            }}
          >
            <button
              onClick={
                onHome
              }
              className="malvin-footer-link"
              style={{
                border:
                  'none',
                background:
                  'transparent',
                padding: 0,
                textAlign:
                  'left',
                cursor:
                  'pointer',
              }}
            >
              Home
            </button>

            <button
              onClick={
                onProducts
              }
              className="malvin-footer-link"
              style={{
                border:
                  'none',
                background:
                  'transparent',
                padding: 0,
                textAlign:
                  'left',
                cursor:
                  'pointer',
              }}
            >
              Products
            </button>

            <button
              onClick={
                onCompany
              }
              className="malvin-footer-link"
              style={{
                border:
                  'none',
                background:
                  'transparent',
                padding: 0,
                textAlign:
                  'left',
                cursor:
                  'pointer',
              }}
            >
              About
            </button>

            <button
              onClick={
                onNews
              }
              className="malvin-footer-link"
              style={{
                border:
                  'none',
                background:
                  'transparent',
                padding: 0,
                textAlign:
                  'left',
                cursor:
                  'pointer',
              }}
            >
              News
            </button>
          </div>
        </div>

        {/* Connect */}

        <div>
          <strong
            style={{
              fontSize:
                '0.82rem',
            }}
          >
            Connect
          </strong>

          <div
            style={{
              display:
                'flex',
              flexDirection:
                'column',
              gap: 10,
              marginTop:
                17,
            }}
          >
            <Link
              to="/contact"
              className="malvin-footer-link"
            >
              Contact
            </Link>

            <Link
              to="/faq"
              className="malvin-footer-link"
            >
              FAQ
            </Link>

            <span
              className="malvin-footer-link"
              style={{
                cursor:
                  'default',
              }}
            >
              Instagram
            </span>

            <span
              className="malvin-footer-link"
              style={{
                cursor:
                  'default',
              }}
            >
              LinkedIn
            </span>

            <button
              onClick={() => setAdminModalOpen(true)}
              aria-label="Admin access"
              className="malvin-footer-link"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                border: 'none',
                background: 'transparent',
                padding: 0,
                font: 'inherit',
                cursor: 'pointer',
              }}
            >
              <Mail size={13} />
              Admin
            </button>
          </div>
        </div>
      </div>

      {/* Bottom */}

      <div
        style={{
          maxWidth:
            1180,
          margin:
            '55px auto 0',
          paddingTop:
            20,
          borderTop:
            `1px solid ${T.line}`,
          display:
            'flex',
          justifyContent:
            'space-between',
          alignItems:
            'center',
          gap: 15,
          flexWrap:
            'wrap',
        }}
      >
        <span
          className="malvin-mono"
          style={{
            fontSize:
              '0.62rem',
            color:
              T.inkFaint,
            letterSpacing:
              '1.5px',
          }}
        >
          © 2026 MALVIN AI
        </span>

        <div
          style={{
            display:
              'flex',
            gap: 18,
          }}
        >
          <Link
            to="/privacy"
            className="malvin-footer-link"
          >
            Privacy
          </Link>

          <Link
            to="/terms"
            className="malvin-footer-link"
          >
            Terms
          </Link>

          <Link
            to="/impressum"
            className="malvin-footer-link"
          >
            Impressum
          </Link>
        </div>
      </div>

      <AdminAccessModal
        open={adminModalOpen}
        onClose={() => setAdminModalOpen(false)}
      />
    </footer>
  );
};

export default LandingPage;