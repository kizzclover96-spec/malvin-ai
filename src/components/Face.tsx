import React from "react";

const Face = () => {
    return (
        <div style={styles.wrapper}>
            <style>{`
                @keyframes floatOrb {
                    0% {
                        transform: translateY(0px) scale(1);
                    }
                    50% {
                        transform: translateY(-10px) scale(1.03);
                    }
                    100% {
                        transform: translateY(0px) scale(1);
                    }
                }

                @keyframes slowRotate {
                    from {
                        transform: rotate(0deg);
                    }
                    to {
                        transform: rotate(360deg);
                    }
                }

                @keyframes glowPulse {
                    0%, 100% {
                        opacity: 0.6;
                        filter: blur(40px);
                    }
                    50% {
                        opacity: 1;
                        filter: blur(65px);
                    }
                }

                @keyframes highlightMove {
                    0% {
                        transform: translate(-30px, -20px);
                        opacity: 0.4;
                    }
                    50% {
                        transform: translate(20px, 10px);
                        opacity: 0.8;
                    }
                    100% {
                        transform: translate(-30px, -20px);
                        opacity: 0.4;
                    }
                }
            `}</style>

            {/* GLOW AURA */}
            <div style={styles.glow} />

            {/* ORB */}
            <div style={styles.orb}>
                {/* INNER LIGHT */}
                <div style={styles.innerLight} />

                {/* REFLECTION HIGHLIGHT */}
                <div style={styles.highlight} />
            </div>
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
        background: "transparent", // ❌ no background
    },

    glow: {
        position: "absolute",
        width: "320px",
        height: "320px",
        borderRadius: "50%",
        background: `radial-gradient(circle,
            rgba(168,85,247,0.35),
            rgba(59,130,246,0.25),
            transparent 70%)`,
        animation: "glowPulse 5s ease-in-out infinite",
        filter: "blur(20px)",
    },

    orb: {
        position: "relative",
        width: "180px",
        height: "180px",
        borderRadius: "50%",

        background: `
            radial-gradient(circle at 30% 30%,
                rgba(255,255,255,0.9),
                rgba(168,85,247,0.25),
                rgba(0,0,0,0.6)
            )
        `,

        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: `
            inset -10px -10px 30px rgba(0,0,0,0.5),
            inset 10px 10px 25px rgba(255,255,255,0.05),
            0 0 60px rgba(168,85,247,0.25),
            0 0 120px rgba(59,130,246,0.15)
        `,

        animation: "floatOrb 6s ease-in-out infinite",
        overflow: "hidden",
    },

    innerLight: {
        position: "absolute",
        width: "80px",
        height: "80px",
        borderRadius: "50%",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        background: `radial-gradient(circle,
            rgba(255,255,255,0.9),
            rgba(168,85,247,0.4),
            transparent 70%)`,
        filter: "blur(10px)",
        opacity: 0.8,
    },

    highlight: {
        position: "absolute",
        width: "120%",
        height: "120%",
        borderRadius: "50%",
        background: `radial-gradient(circle,
            rgba(255,255,255,0.25),
            transparent 60%)`,
        animation: "highlightMove 4s ease-in-out infinite",
    },
};

export default Face;