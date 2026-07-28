import React, { useEffect, useState } from "react";

type Props = {
    userBrand?: any;
};

const Suspended: React.FC<Props> = ({ userBrand }) => {
    const suspensionEnds = userBrand?.suspensionEnds;

    const calculateTimeLeft = () => {
        if (!suspensionEnds) return 0;
        return Math.max(suspensionEnds - Date.now(), 0);
    };

    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    useEffect(() => {
        const interval = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(interval);
    }, [suspensionEnds]);

    // format time
    const formatTime = (ms: number) => {
        const totalSeconds = Math.floor(ms / 1000);

        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        return `${hours}h ${minutes}m ${seconds}s`;
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                width: "100%",
                background: "#000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px",
                color: "#fff",
                fontFamily: "Inter, sans-serif"
            }}
        >
            <div
                style={{
                    width: "100%",
                    maxWidth: "650px",
                    background: "#0A0A0A",
                    border: "1px solid #1A1A1A",
                    borderRadius: "28px",
                    padding: "40px",
                    textAlign: "center",
                    boxShadow: "0 20px 80px rgba(0,0,0,0.6)"
                }}
            >
                <div
                    style={{
                        fontSize: "42px",
                        marginBottom: "10px"
                    }}
                >
                    ⏳
                </div>

                <div
                    style={{
                        fontSize: "12px",
                        color: "#ffcc00",
                        letterSpacing: "2px",
                        fontWeight: 700,
                        marginBottom: "12px"
                    }}
                >
                    TEMPORARY SUSPENSION
                </div>

                <h1
                    style={{
                        fontSize: "34px",
                        margin: "0 0 16px 0",
                        fontWeight: 800
                    }}
                >
                    Account Suspended
                </h1>

                <p
                    style={{
                        color: "#999",
                        lineHeight: 1.7,
                        fontSize: "15px",
                        marginBottom: "24px"
                    }}
                >
                    Your account has been temporarily restricted.
                    You will regain access automatically when the timer ends.
                </p>

                {/* TIMER */}
                <div
                    style={{
                        background: "#050505",
                        border: "1px solid #1A1A1A",
                        borderRadius: "18px",
                        padding: "20px",
                        marginBottom: "24px"
                    }}
                >
                    <div style={{ fontSize: "11px", color: "#666", marginBottom: "8px" }}>
                        TIME REMAINING
                    </div>

                    <div
                        style={{
                            fontSize: "28px",
                            fontWeight: 800,
                            color: "#ffcc00",
                            letterSpacing: "2px"
                        }}
                    >
                        {timeLeft > 0 ? formatTime(timeLeft) : "00h 00m 00s"}
                    </div>
                </div>

                {/* REASON */}
                <div
                    style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid #1A1A1A",
                        borderRadius: "16px",
                        padding: "14px",
                        marginBottom: "24px",
                        textAlign: "left"
                    }}
                >
                    <div style={{ color: "#fff", fontWeight: 700, marginBottom: "10px" }}>
                        Reason
                    </div>

                    <div style={{ color: "#777", fontSize: "14px", lineHeight: 1.6 }}>
                        {userBrand?.suspensionReason ||
                            "Temporary restriction due to policy violation or suspicious activity."}
                    </div>
                </div>

                <div style={{ color: "#555", fontSize: "12px" }}>
                    Reference ID: {userBrand?.id?.slice(0, 8) || "N/A"}
                </div>
            </div>
        </div>
    );
};

export default Suspended;