import React from "react";

const icons = [
    "💰", "🏪", "📈", "💬", "🤝", "🛒", "📊", "💎"
];

const Face = () => {
    return (
        <div style={styles.wrapper}>
            <style>{`
                @keyframes rotateSphere {
                    0% { transform: rotateY(0deg) rotateX(10deg) scale(1); }
                    50% { transform: rotateY(180deg) rotateX(12deg) scale(1.02); }
                    100% { transform: rotateY(360deg) rotateX(10deg) scale(1); }
                }

                @keyframes pulseCore {
                    0%, 100% {
                        box-shadow:
                            0 0 25px rgba(191,0,255,0.35),
                            0 0 80px rgba(59,130,246,0.15),
                            inset 0 0 20px rgba(255,255,255,0.05);
                    }
                    50% {
                        box-shadow:
                            0 0 60px rgba(191,0,255,0.65),
                            0 0 140px rgba(59,130,246,0.35),
                            inset 0 0 30px rgba(255,255,255,0.08);
                    }
                }

                @keyframes orbit1 {
                    from { transform: rotate(0deg) translateX(170px) rotate(0deg); }
                    to { transform: rotate(360deg) translateX(170px) rotate(-360deg); }
                }

                @keyframes orbit2 {
                    from { transform: rotate(360deg) translateX(210px) rotate(360deg); }
                    to { transform: rotate(0deg) translateX(210px) rotate(0deg); }
                }

                @keyframes orbit3 {
                    from { transform: rotate(0deg) translateX(130px) rotate(0deg); }
                    to { transform: rotate(-360deg) translateX(130px) rotate(360deg); }
                }

                @keyframes blink {
                    0%, 92%, 100% { transform: scaleY(1); }
                    94%, 96% { transform: scaleY(0.05); }
                }

                @keyframes dataGrid {
                    0% { opacity: 0.05; transform: translateY(0px); }
                    50% { opacity: 0.12; }
                    100% { opacity: 0.05; transform: translateY(-10px); }
                }
            `}</style>

            {/* DATA GRID BACKGROUND */}
            <div style={styles.grid} />

            {/* ORBITS */}
            <div style={styles.orbitLayer}>
                {icons.slice(0, 3).map((icon, i) => (
                    <div key={i} style={{ ...styles.orbitIcon, animation: "orbit1 14s linear infinite" }}>
                        {icon}
                    </div>
                ))}
            </div>

            <div style={styles.orbitLayer}>
                {icons.slice(3, 6).map((icon, i) => (
                    <div key={i} style={{ ...styles.orbitIcon, animation: "orbit2 18s linear infinite" }}>
                        {icon}
                    </div>
                ))}
            </div>

            <div style={styles.orbitLayer}>
                {icons.slice(6).map((icon, i) => (
                    <div key={i} style={{ ...styles.orbitIcon, animation: "orbit3 22s linear infinite" }}>
                        {icon}
                    </div>
                ))}
            </div>

            {/* CORE SPHERE */}
            <div style={styles.sphere}>
                <div style={styles.glow} />

                <div style={styles.face}>
                    <div style={styles.eye} />
                    <div style={styles.eye} />
                </div>

                {/* inner energy ring */}
                <div style={styles.innerRing} />
            </div>
        </div>
    );
};

const styles: { [key: string]: React.CSSProperties } = {
    wrapper: {
        position: "relative",
        width: "520px",
        height: "520px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        perspective: "1200px",
    },

    grid: {
        position: "absolute",
        inset: 0,
        backgroundImage:
            "radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)",
        backgroundSize: "30px 30px",
        opacity: 0.2,
        animation: "dataGrid 6s ease-in-out infinite",
    },

    sphere: {
        width: "240px",
        height: "240px",
        borderRadius: "50%",
        position: "relative",
        background: `
            radial-gradient(circle at 30% 30%,
            rgba(255,255,255,0.18),
            rgba(168,85,247,0.25),
            rgba(0,0,0,0.9))
        `,
        backdropFilter: "blur(35px)",
        border: "1px solid rgba(255,255,255,0.15)",
        animation: "rotateSphere 14s linear infinite, pulseCore 4s ease-in-out infinite",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transformStyle: "preserve-3d",
        zIndex: 2,
    },

    glow: {
        position: "absolute",
        inset: "-30px",
        borderRadius: "50%",
        background:
            "radial-gradient(circle, rgba(168,85,247,0.3), transparent 70%)",
        filter: "blur(50px)",
        zIndex: 0,
    },

    innerRing: {
        position: "absolute",
        width: "160px",
        height: "160px",
        borderRadius: "50%",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "inset 0 0 30px rgba(191,0,255,0.2)",
    },

    face: {
        display: "flex",
        gap: "35px",
        zIndex: 3,
    },

    eye: {
        width: "20px",
        height: "20px",
        borderRadius: "50%",
        background: "#ffffff",
        animation: "blink 4s infinite",
        boxShadow: "0 0 18px rgba(255,255,255,0.9)",
    },

    orbitLayer: {
        position: "absolute",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },

    orbitIcon: {
        position: "absolute",
        fontSize: "26px",
        filter: "drop-shadow(0 0 12px rgba(255,255,255,0.25))",
    },
};

export default Face;