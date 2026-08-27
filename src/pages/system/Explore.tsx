import React from 'react';

const Explore = () => {
  const aiWomanUrl = "/mockupmm.png";

  const features = [
    {
      eyebrow: "01 · VINQR",
      title: "Scan a business. Connect instantly.",
      desc: "VINQR is Malvin AI's QR technology for businesses. Customers scan a Malvin VINQR code to open a business page, view available information, and interact directly with that business. There is no need to search for the business manually.",
      img: "/aiqr.png",
      alt: "Malvin AI VINQR technology for connecting customers with businesses"
    },
    {
      eyebrow: "02 · BUSINESS DASHBOARD",
      title: "One dashboard. Only the tools you need.",
      desc: "Businesses get a central Malvin AI dashboard where they can enable the tools that fit their business. Instead of forcing every business to use the same features, Malvin lets owners build a workspace around their own needs.",
      img: "/dashboard.png",
      alt: "Malvin AI business dashboard for managing business tools"
    },
    {
      eyebrow: "03 · VINBACK",
      title: "Give lost property a way home.",
      desc: "VINBACK tags are QR-powered property recovery tags. An owner places a VINBACK tag on an important item or property. If it is lost, the owner can mark it as missing. Anyone who finds it can scan the tag and contact the owner, while the owner receives a notification showing where the tag was scanned.",
      img: "/verify.png",
      alt: "Malvin AI VINBACK QR property recovery tag"
    },
    {
      eyebrow: "04 · SAVE QR & LINKS",
      title: "Keep your important links and QR codes in one place.",
      desc: "Malvin AI also gives users a simple way to save important QR codes and website links. Instead of losing useful links or forgetting where a QR code leads, users can keep them organized and accessible in one place.",
      img: "/settings.png",
      alt: "Malvin AI Save QR and Links feature"
    }
  ];

  const businessTools = [
    {
      title: "Business Profile",
      desc: "Create a clear digital presence that customers can access through your Malvin QR code."
    },
    {
      title: "Customer Interaction",
      desc: "Give customers a direct way to interact with your business after scanning your VINQR."
    },
    {
      title: "Business Tools",
      desc: "Enable the tools your business actually needs from one central dashboard."
    },
    {
      title: "QR Technology",
      desc: "Use Malvin's QR technology to create simple physical-to-digital connections."
    }
  ];

  return (
    <main
      style={{
        width: '100%',
        minHeight: '100%',
        background: '#ffffff',
        color: '#0f172a',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Subtle blue background accents */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '0',
          right: '-180px',
          width: '520px',
          height: '520px',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(37,99,235,0.10) 0%, rgba(37,99,235,0.035) 40%, transparent 72%)',
          pointerEvents: 'none'
        }}
      />

      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: '42%',
          left: '-220px',
          width: '480px',
          height: '480px',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(14,165,233,0.07) 0%, transparent 70%)',
          pointerEvents: 'none'
        }}
      />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.15fr) minmax(320px, 0.85fr)',
          width: '100%',
          height: '100%',
          gap: '56px',
          position: 'relative',
          zIndex: 2
        }}
      >
        {/* =========================================================
            LEFT — EXPLORE CONTENT
        ========================================================= */}
        <div
          className="explore-scroll-container"
          style={{
            height: '100%',
            overflowY: 'auto',
            padding: '54px 12px 100px 0',
            boxSizing: 'border-box',
            scrollbarWidth: 'thin'
          }}
        >
          {/* Header */}
          <header
            className="animate-reveal"
            style={{
              maxWidth: '760px',
              marginBottom: '58px'
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 13px',
                borderRadius: '999px',
                background: '#eff6ff',
                border: '1px solid #dbeafe',
                color: '#2563eb',
                fontSize: '0.75rem',
                fontWeight: '800',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                marginBottom: '20px'
              }}
            >
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: '#2563eb',
                  display: 'inline-block'
                }}
              />
              Malvin AI · QR Technology
            </div>

            <h1
              style={{
                fontSize: 'clamp(2.4rem, 4vw, 4.5rem)',
                lineHeight: '1.02',
                letterSpacing: '-2.5px',
                fontWeight: '850',
                margin: '0 0 22px',
                color: '#0f172a'
              }}
            >
              Simple QR technology.
              <br />
              <span style={{ color: '#2563eb' }}>
                Useful connections.
              </span>
            </h1>

            <p
              style={{
                fontSize: '1.12rem',
                lineHeight: '1.75',
                color: '#475569',
                maxWidth: '680px',
                margin: 0
              }}
            >
              Malvin AI is a QR technology platform that connects people,
              businesses, property, QR codes, and important links through
              simple scan-based experiences.
            </p>
          </header>

          {/* Core Products */}
          <section
            aria-labelledby="malvin-products-heading"
            style={{ marginBottom: '72px' }}
          >
            <div style={{ marginBottom: '28px' }}>
              <p
                style={{
                  color: '#2563eb',
                  fontSize: '0.75rem',
                  fontWeight: '800',
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  margin: '0 0 8px'
                }}
              >
                What Malvin AI does
              </p>

              <h2
                id="malvin-products-heading"
                style={{
                  fontSize: '2rem',
                  lineHeight: '1.15',
                  letterSpacing: '-0.8px',
                  color: '#0f172a',
                  margin: 0,
                  fontWeight: '800'
                }}
              >
                Four simple ways to use Malvin
              </h2>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '22px'
              }}
            >
              {features.map((item, index) => {
                const isEven = index % 2 === 0;

                return (
                  <article
                    key={item.title}
                    className="animate-reveal"
                    style={{
                      display: 'flex',
                      flexDirection: isEven ? 'row' : 'row-reverse',
                      alignItems: 'center',
                      gap: '34px',
                      background: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '26px',
                      padding: '22px',
                      boxShadow:
                        '0 10px 35px rgba(15, 23, 42, 0.055)',
                      transition:
                        'transform 0.25s ease, box-shadow 0.25s ease'
                    }}
                  >
                    {/* Image */}
                    <div
                      style={{
                        flex: '0 0 45%',
                        borderRadius: '18px',
                        border: '1px solid #dbeafe',
                        overflow: 'hidden',
                        background: '#f8fafc',
                        aspectRatio: '16 / 10',
                        position: 'relative'
                      }}
                    >
                      <img
                        src={item.img}
                        alt={item.alt}
                        loading={index === 0 ? 'eager' : 'lazy'}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block'
                        }}
                        onError={(
                          e: React.SyntheticEvent<HTMLImageElement>
                        ) => {
                          const img = e.currentTarget;

                          img.style.display = 'none';

                          if (img.parentElement) {
                            img.parentElement.innerHTML = `
                              <div style="
                                height:100%;
                                width:100%;
                                display:flex;
                                align-items:center;
                                justify-content:center;
                                background:linear-gradient(135deg,#eff6ff,#f8fafc);
                                color:#94a3b8;
                                font-size:0.8rem;
                                font-weight:600;
                              ">
                                Malvin AI
                              </div>
                            `;
                          }
                        }}
                      />
                    </div>

                    {/* Content */}
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        textAlign: 'left'
                      }}
                    >
                      <div
                        style={{
                          color: '#2563eb',
                          fontSize: '0.72rem',
                          fontWeight: '800',
                          letterSpacing: '1.3px',
                          marginBottom: '9px'
                        }}
                      >
                        {item.eyebrow}
                      </div>

                      <h3
                        style={{
                          fontSize: 'clamp(1.25rem, 2vw, 1.55rem)',
                          lineHeight: '1.2',
                          fontWeight: '800',
                          color: '#0f172a',
                          letterSpacing: '-0.5px',
                          margin: '0 0 12px'
                        }}
                      >
                        {item.title}
                      </h3>

                      <p
                        style={{
                          fontSize: '0.94rem',
                          lineHeight: '1.7',
                          color: '#64748b',
                          margin: 0
                        }}
                      >
                        {item.desc}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          {/* =====================================================
              BUSINESS DASHBOARD
          ===================================================== */}
          <section
            aria-labelledby="business-dashboard-heading"
            className="animate-reveal"
            style={{
              background:
                'linear-gradient(135deg, #eff6ff 0%, #ffffff 65%)',
              border: '1px solid #dbeafe',
              borderRadius: '28px',
              padding: '38px',
              marginBottom: '72px'
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                padding: '7px 11px',
                borderRadius: '8px',
                background: '#ffffff',
                border: '1px solid #dbeafe',
                color: '#2563eb',
                fontSize: '0.7rem',
                fontWeight: '800',
                letterSpacing: '1px',
                marginBottom: '18px'
              }}
            >
              FOR BUSINESSES
            </div>

            <h2
              id="business-dashboard-heading"
              style={{
                fontSize: '2rem',
                lineHeight: '1.15',
                letterSpacing: '-0.8px',
                color: '#0f172a',
                margin: '0 0 14px',
                fontWeight: '800'
              }}
            >
              A business dashboard that adapts to you.
            </h2>

            <p
              style={{
                color: '#475569',
                lineHeight: '1.7',
                fontSize: '1rem',
                maxWidth: '680px',
                margin: '0 0 30px'
              }}
            >
              Malvin AI gives businesses one central dashboard for their
              digital tools. Business owners can enable the tools they want
              instead of being forced into a fixed set of features.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  'repeat(auto-fit, minmax(190px, 1fr))',
                gap: '12px'
              }}
            >
              {businessTools.map((tool) => (
                <div
                  key={tool.title}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '18px'
                  }}
                >
                  <h3
                    style={{
                      fontSize: '0.95rem',
                      fontWeight: '800',
                      color: '#0f172a',
                      margin: '0 0 7px'
                    }}
                  >
                    {tool.title}
                  </h3>

                  <p
                    style={{
                      fontSize: '0.82rem',
                      lineHeight: '1.55',
                      color: '#64748b',
                      margin: 0
                    }}
                  >
                    {tool.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* =====================================================
              VINBACK EXPLANATION
          ===================================================== */}
          <section
            aria-labelledby="vinback-heading"
            className="animate-reveal"
            style={{
              padding: '0 0 72px',
              borderBottom: '1px solid #e2e8f0',
              marginBottom: '55px'
            }}
          >
            <p
              style={{
                color: '#2563eb',
                fontSize: '0.75rem',
                fontWeight: '800',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                marginBottom: '10px'
              }}
            >
              Property Recovery
            </p>

            <h2
              id="vinback-heading"
              style={{
                fontSize: '2rem',
                lineHeight: '1.15',
                letterSpacing: '-0.8px',
                color: '#0f172a',
                margin: '0 0 16px',
                fontWeight: '800'
              }}
            >
              VINBACK turns a lost item into a possible connection.
            </h2>

            <p
              style={{
                fontSize: '1rem',
                lineHeight: '1.75',
                color: '#64748b',
                maxWidth: '720px',
                margin: 0
              }}
            >
              A VINBACK tag is placed on an owner's property. When the
              property goes missing, the owner can mark it as missing.
              A finder can then scan the QR tag and message the owner.
              Malvin AI also notifies the owner when the tag is scanned
              and provides the scan location so the owner knows where
              the property was found.
            </p>
          </section>

          {/* =====================================================
              SAVE QR & LINKS
          ===================================================== */}
          <section
            aria-labelledby="save-links-heading"
            className="animate-reveal"
            style={{
              paddingBottom: '80px'
            }}
          >
            <div
              style={{
                background: '#0f172a',
                borderRadius: '28px',
                padding: '38px',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  right: '-80px',
                  top: '-100px',
                  width: '280px',
                  height: '280px',
                  borderRadius: '50%',
                  background:
                    'radial-gradient(circle, rgba(59,130,246,0.25), transparent 70%)'
                }}
              />

              <div style={{ position: 'relative', zIndex: 2 }}>
                <p
                  style={{
                    color: '#60a5fa',
                    fontSize: '0.75rem',
                    fontWeight: '800',
                    letterSpacing: '1.5px',
                    textTransform: 'uppercase',
                    marginBottom: '10px'
                  }}
                >
                  Your digital collection
                </p>

                <h2
                  id="save-links-heading"
                  style={{
                    fontSize: '2rem',
                    lineHeight: '1.15',
                    letterSpacing: '-0.8px',
                    color: '#ffffff',
                    margin: '0 0 15px',
                    fontWeight: '800'
                  }}
                >
                  Save the QR codes and links you actually need.
                </h2>

                <p
                  style={{
                    fontSize: '1rem',
                    lineHeight: '1.7',
                    color: '#cbd5e1',
                    maxWidth: '680px',
                    margin: 0
                  }}
                >
                  Save important QR codes and website links in Malvin AI
                  so useful information stays accessible instead of being
                  lost in screenshots, browser history, or messages.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* =========================================================
            RIGHT — VISUAL
        ========================================================= */}
        <aside
          aria-label="Malvin AI QR technology illustration"
          style={{
            position: 'relative',
            height: '100%',
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            padding: '30px 10px 30px 0',
            boxSizing: 'border-box'
          }}
        >
          {/* Soft blue glow */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              width: '75%',
              height: '65%',
              background:
                'radial-gradient(circle, rgba(37,99,235,0.13) 0%, rgba(59,130,246,0.045) 42%, transparent 70%)',
              filter: 'blur(35px)',
              zIndex: 1
            }}
          />

          {/* Decorative QR-inspired cards */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '18%',
              right: '7%',
              width: '92px',
              height: '92px',
              borderRadius: '20px',
              background: 'rgba(255,255,255,0.85)',
              border: '1px solid #dbeafe',
              boxShadow: '0 20px 50px rgba(37,99,235,0.12)',
              transform: 'rotate(8deg)',
              zIndex: 3
            }}
          >
            <div
              style={{
                width: '45px',
                height: '45px',
                margin: '23px auto',
                background:
                  'linear-gradient(90deg, #2563eb 20%, transparent 20%, transparent 40%, #2563eb 40%, #2563eb 60%, transparent 60%, transparent 80%, #2563eb 80%)',
                opacity: 0.85
              }}
            />
          </div>

          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              bottom: '19%',
              left: '5%',
              padding: '13px 17px',
              borderRadius: '16px',
              background: 'rgba(255,255,255,0.92)',
              border: '1px solid #e2e8f0',
              boxShadow: '0 20px 50px rgba(15,23,42,0.08)',
              color: '#2563eb',
              fontSize: '0.75rem',
              fontWeight: '800',
              zIndex: 4
            }}
          >
            SCAN · CONNECT · SAVE
          </div>

          <img
            src={aiWomanUrl}
            alt="Malvin AI QR technology assistant illustration"
            className="animate"
            style={{
              maxHeight: '82%',
              maxWidth: '100%',
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              zIndex: 5,
              position: 'relative',
              filter:
                'drop-shadow(0 25px 45px rgba(15, 23, 42, 0.12))'
            }}
          />
        </aside>
      </div>

      {/* ===========================================================
          RESPONSIVE STYLES
      =========================================================== */}
      <style>
        {`
          .explore-scroll-container::-webkit-scrollbar {
            width: 5px;
          }

          .explore-scroll-container::-webkit-scrollbar-track {
            background: transparent;
          }

          .explore-scroll-container::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 999px;
          }

          @media (max-width: 1000px) {
            main > div {
              grid-template-columns: 1fr !important;
            }

            aside {
              display: none !important;
            }

            .explore-scroll-container {
              padding-right: 0 !important;
            }
          }

          @media (max-width: 700px) {
            .explore-scroll-container {
              padding: 30px 0 70px !important;
            }

            article {
              flex-direction: column !important;
              align-items: stretch !important;
              padding: 16px !important;
            }

            article > div:first-child {
              flex: none !important;
              width: 100% !important;
            }

            section[aria-labelledby="business-dashboard-heading"] {
              padding: 25px !important;
            }

            section[aria-labelledby="save-links-heading"] {
              padding-bottom: 40px !important;
            }
          }

          @media (max-width: 480px) {
            h1 {
              letter-spacing: -1.5px !important;
            }

            article {
              border-radius: 20px !important;
            }
          }
        `}
      </style>
    </main>
  );
};

export default Explore;