
import React from 'react';
import { Helmet } from 'react-helmet-async';

const About = () => {
    const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        name: 'Malvin AI',
        url: 'https://malvinai.com',
        description:
            'Malvin AI is a QR technology platform for businesses and individuals. It provides VINQR for business connections, a business dashboard, VINBACK for property recovery, and tools for saving QR codes and links.',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        brand: {
            '@type': 'Brand',
            name: 'Malvin AI'
        }
    };

    const products = [
        {
            number: '01',
            name: 'VINQR',
            title: 'Connect customers with your business.',
            description:
                'VINQR is Malvin AI’s QR technology for businesses. Place a Malvin QR code where customers can see it. When they scan it, they can open your business experience and interact with your business directly.',
            points: [
                'Create a digital connection between your physical business and customers.',
                'Customers scan instead of searching for your business manually.',
                'Use your QR code across physical locations and printed materials.'
            ]
        },
        {
            number: '02',
            name: 'Business Dashboard',
            title: 'Your business. Your tools.',
            description:
                'Malvin AI gives businesses a central dashboard where they can enable the tools that fit their needs. Businesses do not have to use every feature. They can build their workspace around how they operate.',
            points: [
                'Manage your Malvin business experience from one place.',
                'Enable the tools your business actually needs.',
                'Keep your digital business presence organized.'
            ]
        },
        {
            number: '03',
            name: 'VINBACK',
            title: 'Give lost property a way home.',
            description:
                'VINBACK is Malvin AI’s QR-powered property recovery system. Owners place a VINBACK tag on their property. If something goes missing, the owner can mark it as missing so a finder can scan the tag and contact the owner.',
            points: [
                'Attach a QR-powered VINBACK tag to your property.',
                'Mark property as missing when it is lost.',
                'Receive a notification when the tag is scanned and see where it was scanned.'
            ]
        },
        {
            number: '04',
            name: 'Save QR & Links',
            title: 'Keep important digital information in one place.',
            description:
                'Malvin AI makes it easier to keep useful QR codes and website links accessible. Save important links and QR codes instead of losing them in screenshots, messages, notes, or browser history.',
            points: [
                'Save important QR codes.',
                'Save useful website links.',
                'Keep your important digital information accessible.'
            ]
        }
    ];

    return (
        <>
            <Helmet>
                <title>
                    About Malvin AI | QR Technology for Businesses & Property
                </title>

                <meta
                    name="description"
                    content="Malvin AI is a QR technology platform for businesses and individuals. Use VINQR to connect customers with businesses, VINBACK to help recover lost property, and Save QR & Links to keep important digital information accessible."
                />

                <link
                    rel="canonical"
                    href="https://malvinai.com/about"
                />

                <meta
                    property="og:title"
                    content="About Malvin AI | QR Technology"
                />

                <meta
                    property="og:description"
                    content="Malvin AI uses QR technology to connect customers with businesses, help recover lost property, and keep important QR codes and links accessible."
                />

                <meta
                    property="og:url"
                    content="https://malvinai.com/about"
                />

                <meta
                    property="og:type"
                    content="website"
                />

                <script type="application/ld+json">
                    {JSON.stringify(structuredData)}
                </script>
            </Helmet>

            <main
                style={{
                    minHeight: '100vh',
                    width: '100%',
                    background: '#ffffff',
                    color: '#0f172a',
                    overflow: 'hidden'
                }}
            >
                {/* =====================================================
                    HERO
                ===================================================== */}
                <section
                    aria-labelledby="about-title"
                    style={{
                        position: 'relative',
                        padding: '90px 24px 80px',
                        borderBottom: '1px solid #e2e8f0',
                        overflow: 'hidden'
                    }}
                >
                    {/* Blue background glow */}
                    <div
                        aria-hidden="true"
                        style={{
                            position: 'absolute',
                            top: '-250px',
                            right: '-180px',
                            width: '600px',
                            height: '600px',
                            borderRadius: '50%',
                            background:
                                'radial-gradient(circle, rgba(37,99,235,0.12), transparent 68%)',
                            pointerEvents: 'none'
                        }}
                    />

                    <div
                        style={{
                            position: 'relative',
                            zIndex: 2,
                            maxWidth: '1000px',
                            margin: '0 auto'
                        }}
                    >
                        <div
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 14px',
                                borderRadius: '999px',
                                background: '#eff6ff',
                                border: '1px solid #dbeafe',
                                color: '#2563eb',
                                fontSize: '0.72rem',
                                fontWeight: '800',
                                letterSpacing: '1.5px',
                                textTransform: 'uppercase',
                                marginBottom: '24px'
                            }}
                        >
                            <span
                                style={{
                                    width: '7px',
                                    height: '7px',
                                    borderRadius: '50%',
                                    background: '#2563eb'
                                }}
                            />
                            About Malvin AI
                        </div>

                        <h1
                            id="about-title"
                            style={{
                                maxWidth: '900px',
                                margin: '0 0 24px',
                                fontSize:
                                    'clamp(3rem, 7vw, 6.2rem)',
                                lineHeight: '0.98',
                                letterSpacing: '-4px',
                                fontWeight: '850',
                                color: '#0f172a'
                            }}
                        >
                            QR technology for{' '}
                            <span style={{ color: '#2563eb' }}>
                                real-world connections.
                            </span>
                        </h1>

                        <p
                            style={{
                                maxWidth: '760px',
                                margin: 0,
                                fontSize: '1.2rem',
                                lineHeight: '1.75',
                                color: '#475569'
                            }}
                        >
                            Malvin AI is a QR technology platform that makes
                            it easier for people, businesses, and physical
                            property to connect with digital information.
                        </p>
                    </div>
                </section>

                {/* =====================================================
                    WHAT IS MALVIN
                ===================================================== */}
                <section
                    aria-labelledby="what-is-malvin"
                    style={{
                        padding: '90px 24px'
                    }}
                >
                    <div
                        style={{
                            maxWidth: '1000px',
                            margin: '0 auto',
                            display: 'grid',
                            gridTemplateColumns:
                                'minmax(240px, 0.7fr) minmax(0, 1.3fr)',
                            gap: '70px',
                            alignItems: 'start'
                        }}
                    >
                        <div>
                            <p
                                style={{
                                    color: '#2563eb',
                                    fontSize: '0.72rem',
                                    fontWeight: '800',
                                    letterSpacing: '1.5px',
                                    textTransform: 'uppercase',
                                    margin: '0 0 10px'
                                }}
                            >
                                The idea
                            </p>

                            <h2
                                id="what-is-malvin"
                                style={{
                                    fontSize: 'clamp(2rem, 4vw, 3rem)',
                                    lineHeight: '1.08',
                                    letterSpacing: '-1.5px',
                                    margin: 0,
                                    fontWeight: '800'
                                }}
                            >
                                What is Malvin AI?
                            </h2>
                        </div>

                        <div>
                            <p
                                style={{
                                    fontSize: '1.12rem',
                                    lineHeight: '1.8',
                                    color: '#334155',
                                    margin: '0 0 22px'
                                }}
                            >
                                Malvin AI uses QR technology to create simple
                                connections between the physical and digital
                                world.
                            </p>

                            <p
                                style={{
                                    fontSize: '1rem',
                                    lineHeight: '1.8',
                                    color: '#64748b',
                                    margin: 0
                                }}
                            >
                                A QR code can connect a customer to a
                                business, connect a finder to the owner of
                                lost property, or give someone quick access
                                to important digital information. Malvin AI
                                brings these experiences together in one
                                platform.
                            </p>
                        </div>
                    </div>
                </section>

                {/* =====================================================
                    CORE PRODUCTS
                ===================================================== */}
                <section
                    aria-labelledby="malvin-products"
                    style={{
                        padding: '90px 24px',
                        background: '#f8fafc',
                        borderTop: '1px solid #e2e8f0',
                        borderBottom: '1px solid #e2e8f0'
                    }}
                >
                    <div
                        style={{
                            maxWidth: '1000px',
                            margin: '0 auto'
                        }}
                    >
                        <div
                            style={{
                                maxWidth: '700px',
                                marginBottom: '50px'
                            }}
                        >
                            <p
                                style={{
                                    color: '#2563eb',
                                    fontSize: '0.72rem',
                                    fontWeight: '800',
                                    letterSpacing: '1.5px',
                                    textTransform: 'uppercase',
                                    margin: '0 0 10px'
                                }}
                            >
                                What we build
                            </p>

                            <h2
                                id="malvin-products"
                                style={{
                                    fontSize: 'clamp(2rem, 4vw, 3rem)',
                                    lineHeight: '1.08',
                                    letterSpacing: '-1.5px',
                                    margin: '0 0 16px',
                                    fontWeight: '800'
                                }}
                            >
                                Four simple products.
                            </h2>

                            <p
                                style={{
                                    fontSize: '1.05rem',
                                    lineHeight: '1.75',
                                    color: '#64748b',
                                    margin: 0
                                }}
                            >
                                Each part of Malvin AI is designed around a
                                specific real-world problem.
                            </p>
                        </div>

                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '20px'
                            }}
                        >
                            {products.map((product) => (
                                <article
                                    key={product.name}
                                    style={{
                                        background: '#ffffff',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '26px',
                                        padding:
                                            '32px clamp(22px, 4vw, 42px)',
                                        boxShadow:
                                            '0 12px 40px rgba(15,23,42,0.045)'
                                    }}
                                >
                                    <div
                                        style={{
                                            display: 'flex',
                                            gap: '22px',
                                            alignItems: 'flex-start'
                                        }}
                                    >
                                        <div
                                            style={{
                                                flex: '0 0 auto',
                                                width: '48px',
                                                height: '48px',
                                                borderRadius: '15px',
                                                background: '#eff6ff',
                                                border:
                                                    '1px solid #dbeafe',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#2563eb',
                                                fontSize: '0.78rem',
                                                fontWeight: '900'
                                            }}
                                        >
                                            {product.number}
                                        </div>

                                        <div style={{ flex: 1 }}>
                                            <p
                                                style={{
                                                    color: '#2563eb',
                                                    fontSize: '0.72rem',
                                                    fontWeight: '800',
                                                    letterSpacing: '1.2px',
                                                    textTransform:
                                                        'uppercase',
                                                    margin:
                                                        '0 0 7px'
                                                }}
                                            >
                                                {product.name}
                                            </p>

                                            <h3
                                                style={{
                                                    fontSize:
                                                        'clamp(1.35rem, 3vw, 1.9rem)',
                                                    lineHeight: '1.2',
                                                    letterSpacing:
                                                        '-0.6px',
                                                    margin:
                                                        '0 0 13px',
                                                    fontWeight: '800',
                                                    color: '#0f172a'
                                                }}
                                            >
                                                {product.title}
                                            </h3>

                                            <p
                                                style={{
                                                    fontSize:
                                                        '0.98rem',
                                                    lineHeight: '1.75',
                                                    color: '#64748b',
                                                    maxWidth:
                                                        '760px',
                                                    margin:
                                                        '0 0 20px'
                                                }}
                                            >
                                                {product.description}
                                            </p>

                                            <ul
                                                style={{
                                                    margin: 0,
                                                    padding: 0,
                                                    listStyle:
                                                        'none',
                                                    display: 'flex',
                                                    flexDirection:
                                                        'column',
                                                    gap: '9px'
                                                }}
                                            >
                                                {product.points.map(
                                                    (point) => (
                                                        <li
                                                            key={point}
                                                            style={{
                                                                display:
                                                                    'flex',
                                                                gap: '10px',
                                                                alignItems:
                                                                    'flex-start',
                                                                fontSize:
                                                                    '0.9rem',
                                                                lineHeight:
                                                                    '1.55',
                                                                color: '#475569'
                                                            }}
                                                        >
                                                            <span
                                                                aria-hidden="true"
                                                                style={{
                                                                    width: '7px',
                                                                    height: '7px',
                                                                    minWidth:
                                                                        '7px',
                                                                    marginTop:
                                                                        '7px',
                                                                    borderRadius:
                                                                        '50%',
                                                                    background:
                                                                        '#2563eb'
                                                                }}
                                                            />
                                                            {point}
                                                        </li>
                                                    )
                                                )}
                                            </ul>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                </section>

                {/* =====================================================
                    HOW IT WORKS
                ===================================================== */}
                <section
                    aria-labelledby="how-malvin-works"
                    style={{
                        padding: '100px 24px'
                    }}
                >
                    <div
                        style={{
                            maxWidth: '1000px',
                            margin: '0 auto'
                        }}
                    >
                        <div
                            style={{
                                textAlign: 'center',
                                maxWidth: '700px',
                                margin: '0 auto 55px'
                            }}
                        >
                            <p
                                style={{
                                    color: '#2563eb',
                                    fontSize: '0.72rem',
                                    fontWeight: '800',
                                    letterSpacing: '1.5px',
                                    textTransform: 'uppercase',
                                    marginBottom: '10px'
                                }}
                            >
                                How it works
                            </p>

                            <h2
                                id="how-malvin-works"
                                style={{
                                    fontSize:
                                        'clamp(2rem, 4vw, 3rem)',
                                    lineHeight: '1.08',
                                    letterSpacing: '-1.5px',
                                    margin: '0 0 15px',
                                    fontWeight: '800'
                                }}
                            >
                                It starts with a scan.
                            </h2>

                            <p
                                style={{
                                    fontSize: '1.05rem',
                                    lineHeight: '1.75',
                                    color: '#64748b',
                                    margin: 0
                                }}
                            >
                                Malvin AI is designed around one of the
                                simplest interactions people already know:
                                scanning a QR code.
                            </p>
                        </div>

                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns:
                                    'repeat(3, 1fr)',
                                gap: '18px'
                            }}
                        >
                            {[
                                {
                                    number: '01',
                                    title: 'Scan',
                                    text: 'Scan a Malvin QR code using a phone camera.'
                                },
                                {
                                    number: '02',
                                    title: 'Connect',
                                    text: 'Open the relevant business, property, or digital experience.'
                                },
                                {
                                    number: '03',
                                    title: 'Act',
                                    text: 'Interact, contact, recover, or save the information you need.'
                                }
                            ].map((step) => (
                                <div
                                    key={step.number}
                                    style={{
                                        padding: '30px 25px',
                                        borderRadius: '22px',
                                        border:
                                            '1px solid #e2e8f0',
                                        background: '#ffffff'
                                    }}
                                >
                                    <div
                                        style={{
                                            color: '#2563eb',
                                            fontSize: '0.72rem',
                                            fontWeight: '900',
                                            letterSpacing: '1px',
                                            marginBottom: '22px'
                                        }}
                                    >
                                        {step.number}
                                    </div>

                                    <h3
                                        style={{
                                            fontSize: '1.35rem',
                                            fontWeight: '800',
                                            margin:
                                                '0 0 10px',
                                            color: '#0f172a'
                                        }}
                                    >
                                        {step.title}
                                    </h3>

                                    <p
                                        style={{
                                            fontSize: '0.92rem',
                                            lineHeight: '1.65',
                                            color: '#64748b',
                                            margin: 0
                                        }}
                                    >
                                        {step.text}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* =====================================================
                    WHY
                ===================================================== */}
                <section
                    aria-labelledby="why-malvin"
                    style={{
                        padding: '90px 24px',
                        background: '#0f172a',
                        color: '#ffffff'
                    }}
                >
                    <div
                        style={{
                            maxWidth: '1000px',
                            margin: '0 auto',
                            display: 'grid',
                            gridTemplateColumns:
                                'minmax(240px, 0.8fr) minmax(0, 1.2fr)',
                            gap: '70px',
                            alignItems: 'center'
                        }}
                    >
                        <div>
                            <p
                                style={{
                                    color: '#60a5fa',
                                    fontSize: '0.72rem',
                                    fontWeight: '800',
                                    letterSpacing: '1.5px',
                                    textTransform: 'uppercase',
                                    margin: '0 0 10px'
                                }}
                            >
                                Why Malvin
                            </p>

                            <h2
                                id="why-malvin"
                                style={{
                                    fontSize:
                                        'clamp(2rem, 4vw, 3rem)',
                                    lineHeight: '1.08',
                                    letterSpacing: '-1.5px',
                                    margin: 0,
                                    fontWeight: '800'
                                }}
                            >
                                Making the physical world easier to
                                connect.
                            </h2>
                        </div>

                        <div>
                            <p
                                style={{
                                    fontSize: '1.05rem',
                                    lineHeight: '1.8',
                                    color: '#cbd5e1',
                                    margin: '0 0 22px'
                                }}
                            >
                                Digital information is everywhere, but
                                getting from a physical object or location
                                to the right digital experience is not
                                always simple.
                            </p>

                            <p
                                style={{
                                    fontSize: '1.05rem',
                                    lineHeight: '1.8',
                                    color: '#94a3b8',
                                    margin: 0
                                }}
                            >
                                Malvin AI uses QR technology to shorten
                                that distance. A business can connect with
                                a customer. A lost item can connect with
                                its owner. A QR code can connect someone
                                with information they want to keep.
                            </p>
                        </div>
                    </div>
                </section>

                {/* =====================================================
                    VISION
                ===================================================== */}
                <section
                    aria-labelledby="malvin-vision"
                    style={{
                        padding: '100px 24px'
                    }}
                >
                    <div
                        style={{
                            maxWidth: '820px',
                            margin: '0 auto',
                            textAlign: 'center'
                        }}
                    >
                        <p
                            style={{
                                color: '#2563eb',
                                fontSize: '0.72rem',
                                fontWeight: '800',
                                letterSpacing: '1.5px',
                                textTransform: 'uppercase',
                                marginBottom: '12px'
                            }}
                        >
                            Our vision
                        </p>

                        <h2
                            id="malvin-vision"
                            style={{
                                fontSize:
                                    'clamp(2.3rem, 5vw, 4rem)',
                                lineHeight: '1.05',
                                letterSpacing: '-2px',
                                margin: '0 0 22px',
                                fontWeight: '850',
                                color: '#0f172a'
                            }}
                        >
                            Make every useful connection
                            <span style={{ color: '#2563eb' }}>
                                {' '}easier.
                            </span>
                        </h2>

                        <p
                            style={{
                                fontSize: '1.1rem',
                                lineHeight: '1.8',
                                color: '#64748b',
                                margin: 0
                            }}
                        >
                            Malvin AI is building a simpler way to connect
                            businesses, people, property, and digital
                            information using QR technology.
                        </p>
                    </div>
                </section>

                {/* =====================================================
                    FOUNDER / FINAL
                ===================================================== */}
                <section
                    style={{
                        padding: '0 24px 90px'
                    }}
                >
                    <div
                        style={{
                            maxWidth: '1000px',
                            margin: '0 auto',
                            padding: '35px',
                            borderRadius: '26px',
                            background: '#eff6ff',
                            border: '1px solid #dbeafe',
                            textAlign: 'center'
                        }}
                    >
                        <p
                            style={{
                                fontSize: '0.9rem',
                                lineHeight: '1.7',
                                color: '#475569',
                                maxWidth: '680px',
                                margin: '0 auto 15px'
                            }}
                        >
                            Malvin AI was founded with a simple idea:
                            technology should make real-world connections
                            easier, not more complicated.
                        </p>

                        <p
                            style={{
                                fontSize: '1rem',
                                fontWeight: '800',
                                color: '#2563eb',
                                margin: 0
                            }}
                        >
                            Malvin AI · Scan. Connect. Save. Recover.
                        </p>
                    </div>
                </section>

                {/* =====================================================
                    RESPONSIVE
                ===================================================== */}
                <style>
                    {`
                        @media (max-width: 800px) {
                            section > div {
                                grid-template-columns: 1fr !important;
                            }

                            section[aria-labelledby="how-malvin-works"] > div > div:last-child {
                                grid-template-columns: 1fr !important;
                            }
                        }

                        @media (max-width: 600px) {
                            section {
                                padding-left: 20px !important;
                                padding-right: 20px !important;
                            }

                            h1 {
                                letter-spacing: -2px !important;
                            }
                        }
                    `}
                </style>
            </main>
        </>
    );
};

export default About;
