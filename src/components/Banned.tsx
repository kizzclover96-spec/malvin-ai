import React from "react";

type Props = {
    userBrand?: any;
};

const Banned: React.FC<Props> = ({ userBrand }) => {
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
                        width: "72px",
                        height: "72px",
                        margin: "0 auto 20px",
                        borderRadius: "50%",
                        background: "rgba(255,59,59,0.08)",
                        border: "1px solid rgba(255,59,59,0.3)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "32px"
                    }}
                >
                    🚫
                </div>

                <div
                    style={{
                        fontSize: "12px",
                        color: "#666",
                        letterSpacing: "2px",
                        fontWeight: 700,
                        marginBottom: "12px"
                    }}
                >
                    ACCOUNT ENFORCEMENT
                </div>

                <h1
                    style={{
                        fontSize: "34px",
                        margin: "0 0 16px 0",
                        fontWeight: 800
                    }}
                >
                    Account Banned
                </h1>

                <p
                    style={{
                        color: "#999",
                        lineHeight: 1.7,
                        fontSize: "15px",
                        marginBottom: "24px"
                    }}
                >
                    Your account has been permanently restricted from accessing Malvin services.
                </p>

                <div
                    style={{
                        background: "#050505",
                        border: "1px solid #1A1A1A",
                        borderRadius: "18px",
                        padding: "18px",
                        marginBottom: "24px",
                        textAlign: "left"
                    }}
                >
                    <div style={{ color: "#fff", fontWeight: 700, marginBottom: "10px" }}>
                        Reason
                    </div>

                    <div style={{ color: "#777", fontSize: "14px", lineHeight: 1.6 }}>
                        {userBrand?.banReason ||
                            "Violation of platform policies or suspicious activity detected."}
                    </div>
                </div>

                <div
                    style={{
                        background: "rgba(255,255,255,0.03)",
                        border: "1px solid #1A1A1A",
                        borderRadius: "16px",
                        padding: "14px",
                        marginBottom: "24px"
                    }}
                >
                    <div style={{ fontSize: "11px", color: "#666", marginBottom: "6px" }}>
                        SUPPORT EMAIL
                    </div>

                    <div style={{ color: "#fff", fontWeight: 600 }}>
                        verify.malvin@gmail.com
                    </div>
                </div>

                <div style={{ color: "#555", fontSize: "12px" }}>
                    Reference ID: {userBrand?.id?.slice(0, 8) || "N/A"}
                </div>
            </div>
        </div>
    );
};

export default Banned;