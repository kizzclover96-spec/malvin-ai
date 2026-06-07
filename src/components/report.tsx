import React, { useState } from "react";
import { db } from "../firebase";
import { push, ref, set } from "firebase/database";

type Props = {
    reportedUserId: string;
    reporterId: string;
};

const Report = ({ reportedUserId, reporterId, onBack  }: Props) => {
    const [reason, setReason] = useState("");
    const [details, setDetails] = useState("");
    const [sent, setSent] = useState(false);

    const submitReport = async () => {
        if (!reason) return;

        const reportRef = push(ref(db, "reports"));

        await set(reportRef, {
            reporterId,
            reportedUserId,
            reason,
            details,
            timestamp: Date.now(),
            status: "open"
        });

        setSent(true);
    };

    if (sent) {
        return <div style={{ color: "#C5FF41", fontSize: "12px" }}>Report submitted ✔</div>;
    }

    return (
        <div style={{ padding: "10px", background: "#111", borderRadius: "12px" }}>
            <h4 style={{ color: "white", marginBottom: "8px" }}>Report User</h4>
            <button
                onClick={onBack}
                style={{
                    position: "absolute",
                    top: 15,
                    left: 15,
                    background: "#C5FF41",
                    border: "none",
                    padding: "8px 12px",
                    borderRadius: "10px",
                    fontWeight: 700,
                    cursor: "pointer",
                    zIndex: 1000
                }}
            >
                ← Back
            </button>

            <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{ width: "100%", marginBottom: "8px" }}
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
                style={{ width: "100%", marginBottom: "8px" }}
            />

            <button
                onClick={submitReport}
                style={{
                    width: "100%",
                    background: "#ff3b3b",
                    color: "white",
                    padding: "10px",
                    border: "none",
                    borderRadius: "8px"
                }}
            >
                Submit Report
            </button>
        </div>
    );
};

export default Report;