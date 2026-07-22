import React, { useState } from "react";
import { db } from "../firebase";
import { push, ref, set } from "firebase/database";

type Props = {
    reportedUserId?: string;
    reporterId?: string;
    onBack: () => void;
};

const Report = ({ reportedUserId, reporterId, onBack }: Props) => {
    const [reason, setReason] = useState("");
    const [details, setDetails] = useState("");
    const [sent, setSent] = useState(false);

    const submitReport = async () => {
        if (!reason) return;

        // Fallbacks prevent Firebase from crashing with 'undefined' error
        const safeReporterId = reporterId || localStorage.getItem('guest_id') || "anonymous_reporter";
        const safeReportedUserId = reportedUserId || "unknown_user";

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

    if (sent) {
        return <div style={{ color: "#C5FF41", fontSize: "12px", padding: "10px" }}>Report submitted ✔</div>;
    }

    return (
        <div style={{ padding: "10px", background: "#111", borderRadius: "12px", position: "relative" }}>
            <h4 style={{ color: "white", marginBottom: "8px" }}>Report User</h4>
            
            <button
                onClick={onBack}
                style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    background: "#333",
                    color: "white",
                    border: "none",
                    padding: "6px 10px",
                    borderRadius: "8px",
                    fontWeight: 700,
                    cursor: "pointer",
                    fontSize: "12px"
                }}
            >
                ← Back
            </button>

            <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{ width: "100%", marginBottom: "8px", padding: "8px", borderRadius: "6px", background: "#222", color: "white", border: "1px solid #333" }}
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
                style={{ width: "100%", marginBottom: "8px", padding: "8px", borderRadius: "6px", background: "#222", color: "white", border: "1px solid #333", minHeight: "60px" }}
            />

            <button
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