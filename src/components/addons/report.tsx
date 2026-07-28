import React, { useState } from "react";
import { db } from "../../firebase";
import { push, ref, set } from "firebase/database";
import { useNavigate } from "react-router-dom";

type Props = {
    isOpen?: boolean;
    onClose?: () => void;
    onBack?: () => void;
    reportedUserUid?: string;
    reportedUserId?: string;
    currentUserUid?: string;
    reporterId?: string;
};

const Report = ({ 
    isOpen, 
    onClose, 
    onBack, 
    reportedUserUid, 
    reportedUserId, 
    currentUserUid, 
    reporterId 
}: Props) => {
    const [reason, setReason] = useState("");
    const [details, setDetails] = useState("");
    const [sent, setSent] = useState(false);

    let navigate: ReturnType<typeof useNavigate> | null = null;
    try {
        navigate = useNavigate();
    } catch (e) {
        // Fallback if outside React Router
    }

    // Handlers
    const closeHandler = onClose || onBack;

    const handleBack = () => {
        if (typeof closeHandler === "function") {
            closeHandler(); // 🟢 Correctly closes the modal by setting isReportOpen to false!
        } else if (navigate) {
            navigate(-1);
        } else {
            window.history.back();
        }
    };

    const submitReport = async () => {
        if (!reason) return;

        const safeReporterId = currentUserUid || reporterId || localStorage.getItem("guest_id") || "anonymous_reporter";
        const safeReportedUserId = reportedUserUid || reportedUserId || "unknown_user";

        const reportRef = push(ref(db, "reports"));

        await set(reportRef, {
            reporterId: safeReporterId,
            reportedUserId: safeReportedUserId,
            reason: reason || "",
            details: details || "",
            timestamp: Date.now(),
            status: "open"
        });

        setSent(true);
    };

    // --- SUCCESS SCREEN ---
    if (sent) {
        return (
            <div style={{ padding: "16px", background: "#121212", borderRadius: "12px", border: "1px solid #333" }}>
                <div style={{ color: "#C5FF41", fontSize: "14px", fontWeight: "bold", marginBottom: "16px" }}>
                    Report submitted ✔
                </div>
                <button
                    type="button"
                    onClick={handleBack}
                    style={{
                        width: "100%",
                        background: "#222",
                        color: "white",
                        padding: "10px",
                        border: "1px solid #444",
                        borderRadius: "8px",
                        fontWeight: "bold",
                        cursor: "pointer"
                    }}
                >
                    Done
                </button>
            </div>
        );
    }

    // --- REPORT FORM ---
    return (
        <div style={{ padding: "16px", background: "#121212", borderRadius: "12px", border: "1px solid #333" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <button
                    type="button"
                    onClick={handleBack}
                    style={{
                        background: "transparent",
                        border: "none",
                        color: "#aaa",
                        fontSize: "14px",
                        cursor: "pointer",
                        padding: "0"
                    }}
                >
                    ← Back
                </button>
                <span style={{ color: "white", fontSize: "14px", fontWeight: "bold" }}>Report User</span>
                <div style={{ width: "30px" }} />
            </div>

            <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{
                    width: "100%",
                    marginBottom: "8px",
                    padding: "8px",
                    borderRadius: "6px",
                    background: "#222",
                    color: "white",
                    border: "1px solid #333"
                }}
            >
                <option value="">Select reason</option>
                <option value="scam">Scam / Fraud</option>
                <option value="spam">Spam</option>
                <option value="abuse">Abusive behavior</option>
                <option value="fake_product">Fake product</option>
                <option value="non_delivery">Did not deliver</option>
            </select>

            <textarea
                placeholder="Extra details (optional)"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                style={{
                    width: "100%",
                    marginBottom: "8px",
                    padding: "8px",
                    borderRadius: "6px",
                    background: "#222",
                    color: "white",
                    border: "1px solid #333",
                    minHeight: "60px"
                }}
            />

            <button
                type="button"
                onClick={submitReport}
                style={{
                    width: "100%",
                    background: "#ff3b3b",
                    color: "white",
                    padding: "10px",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: "bold",
                    cursor: "pointer"
                }}
            >
                Submit Report
            </button>
        </div>
    );
};

export default Report;