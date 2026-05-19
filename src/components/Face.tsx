import React from "react";

const Face = () => {
    return (
        <div style={styles.wrapper}>
            <style>{`
                @keyframes coreFloat {
                    0% {
                        transform: translateY(0px) scale(1);
                    }
                    50% {
                        transform: translateY(-12px) scale(1.015);
                    }
                    100% {
                        transform: translateY(0px) scale(1);
                    }
                }

                @keyframes rotateRing {
                    from {
                        transform: rotate(0deg);
                    }
                    to {
                        transform: rotate(360deg);
                    }
                }

                @keyframes rotateRingReverse {
                    from {
                        transform: rotate(360deg);
                    }
                    to {
                        transform: rotate(0deg);
                    }
                }

                @keyframes pulseGlow {
                    0%,100% {
                        opacity: 0.55;
                        filter: blur(70px);
                    }
                    50% {
                        opacity: 1;
                        filter: blur(100px);
                    }
                }

                @keyframes scanning {
                    0% {
                        transform: translateY(-180px);
                        opacity: 0;
                    }
                    30% {
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(180px);
                        opacity: 0;
                    }
                }

                @keyframes eyePulse {
                    0%,100% {
                        opacity: 0.8;
                        box-shadow:
                            0 0 18px rgba(255,255,255,0.9),
                            0 0 45px rgba(168,85,247,0.8);
                    }

                    50% {
                        opacity: 1;
                        box-shadow:
                            0 0 25px rgba(255,255,255,1),
                            0 0 70px rgba(59,130,246,1);
                    }
                }

                @keyframes particleFloat {
                    0% {
                        transform: translateY(0px) scale(1);
                        opacity: 0;
                    }

                    50% {
                        opacity: 1;
                    }

                    100% {
                        transform: translateY(-100px) scale(0);
                        opacity: 0;
                    }
                }

                @keyframes gridMove {
                    0% {
                        transform: translateY(0px);
                    }
                    100% {
                        transform: translateY(60px);
                    }
                }
            `}</style>

            {/* GRID */}
            <div style={styles.grid} />

            {/* AMBIENT GLOW */}
            <div style={styles.massiveGlow} />

            {/* PARTICLES */}
            {[...Array(18)].map((_, i) => (
                <span
                    key={i}
                    style={{
                        ...styles.particle,
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 4}s`,
                        animationDuration: `${5 + Math.random() * 4}s`,
                    }}
                />
            ))}

            {/* OUTER RINGS */}
            <div style={styles.outerRing} />
            <div style={styles.outerRing2} />
            <div style={styles.outerRing3} />

            {/* MAIN CORE */}
            <div style={styles.core}>
                {/* GLASS SHINE */}
                <div style={styles.glassHighlight} />

                {/* SCAN LINE */}
                <div style={styles.scanLine} />

                {/* CENTER CORE */}
                <div style={styles.innerCore}>
                    <div style={styles.energyCore} />

                    {/* EYES */}
                    <div style={styles.eyesWrapper}>
                        <div style={styles.eye} />
                        <div style={styles.eye} />
                    </div>

                    {/* CENTER DOT */}
                    <div style={styles.centerDot} />
                </div>
            </div>

            {/* SIDE LIGHTS */}
            <div style={styles.sideGlowLeft} />
            <div style={styles.sideGlowRight} />
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    wrapper: {
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: `
            radial-gradient(circle at center,
            rgba(18,18,30,0.95) 0%,
            rgba(5,5,10,1) 70%)
        `,
    },

    grid: {
        position: "absolute",
        inset: "-20%",
        backgroundImage: `
            linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: "60px 60px",
        transform: "perspective(1000px) rotateX(80deg)",
        animation: "gridMove 8s linear infinite",
        opacity: 0.25,
    },

    massiveGlow: {
        position: "absolute",
        width: "700px",
        height: "700px",
        borderRadius: "50%",
        background: `
            radial-gradient(circle,
            rgba(168,85,247,0.28),
            rgba(59,130,246,0.18),
            transparent 70%)
        `,
        animation: "pulseGlow 6s ease-in-out infinite",
    },

    outerRing: {
        position: "absolute",
        width: "420px",
        height: "420px",
        borderRadius: "50%",
        border: "1px solid rgba(255,255,255,0.06)",
        animation: "rotateRing 18s linear infinite",
        boxShadow: `
            0 0 60px rgba(168,85,247,0.08),
            inset 0 0 40px rgba(255,255,255,0.02)
        `,
    },

    outerRing2: {
        position: "absolute",
        width: "520px",
        height: "520px",
        borderRadius: "50%",
        border: "1px dashed rgba(255,255,255,0.05)",
        animation: "rotateRingReverse 30s linear infinite",
    },

    outerRing3: {
        position: "absolute",
        width: "620px",
        height: "620px",
        borderRadius: "50%",
        border: "1px solid rgba(168,85,247,0.05)",
        animation: "rotateRing 40s linear infinite",
    },

    core: {
        position: "relative",
        width: "260px",
        height: "260px",
        borderRadius: "50%",
        background: `
            linear-gradient(
                145deg,
                rgba(255,255,255,0.08),
                rgba(255,255,255,0.02)
            )
        `,
        border: "1px solid rgba(255,255,255,0.12)",
        backdropFilter: "blur(30px)",
        WebkitBackdropFilter: "blur(30px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        animation: "coreFloat 6s ease-in-out infinite",
        overflow: "hidden",
        boxShadow: `
            inset 0 0 40px rgba(255,255,255,0.03),
            0 0 100px rgba(168,85,247,0.18),
            0 0 180px rgba(59,130,246,0.12)
        `,
        zIndex: 5,
    },

    glassHighlight: {
        position: "absolute",
        top: "-20%",
        left: "-10%",
        width: "120%",
        height: "50%",
        background: `
            linear-gradient(
                to bottom,
                rgba(255,255,255,0.16),
                transparent
            )
        `,
        transform: "rotate(-8deg)",
        filter: "blur(12px)",
    },

    scanLine: {
        position: "absolute",
        width: "100%",
        height: "80px",
        background: `
            linear-gradient(
                to bottom,
                transparent,
                rgba(168,85,247,0.18),
                transparent
            )
        `,
        animation: "scanning 4s linear infinite",
    },

    innerCore: {
        position: "relative",
        width: "170px",
        height: "170px",
        borderRadius: "50%",
        border: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `
            radial-gradient(circle,
            rgba(255,255,255,0.05),
            rgba(168,85,247,0.08),
            rgba(0,0,0,0.4))
        `,
        boxShadow: `
            inset 0 0 30px rgba(255,255,255,0.04),
            0 0 40px rgba(168,85,247,0.12)
        `,
    },

    energyCore: {
        position: "absolute",
        width: "90px",
        height: "90px",
        borderRadius: "50%",
        background: `
            radial-gradient(circle,
            rgba(255,255,255,0.95),
            rgba(168,85,247,0.8),
            rgba(59,130,246,0.25),
            transparent 75%)
        `,
        filter: "blur(12px)",
        opacity: 0.8,
    },

    eyesWrapper: {
        position: "relative",
        display: "flex",
        gap: "40px",
        zIndex: 5,
    },

    eye: {
        width: "14px",
        height: "14px",
        borderRadius: "50%",
        background: "#ffffff",
        animation: "eyePulse 3s ease-in-out infinite",
    },

    centerDot: {
        position: "absolute",
        width: "6px",
        height: "6px",
        borderRadius: "50%",
        background: "rgba(255,255,255,0.9)",
        bottom: "48px",
        boxShadow: "0 0 18px rgba(255,255,255,0.8)",
    },

    sideGlowLeft: {
        position: "absolute",
        left: "-120px",
        width: "300px",
        height: "600px",
        background:
            "linear-gradient(to right, rgba(168,85,247,0.18), transparent)",
        filter: "blur(80px)",
        transform: "rotate(-12deg)",
    },

    sideGlowRight: {
        position: "absolute",
        right: "-120px",
        width: "300px",
        height: "600px",
        background:
            "linear-gradient(to left, rgba(59,130,246,0.18), transparent)",
        filter: "blur(80px)",
        transform: "rotate(12deg)",
    },

    particle: {
        position: "absolute",
        width: "4px",
        height: "4px",
        borderRadius: "50%",
        background: "rgba(255,255,255,0.9)",
        boxShadow: "0 0 15px rgba(168,85,247,0.8)",
        animation: "particleFloat linear infinite",
    },
};

export default Face;