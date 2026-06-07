import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { ref, onValue, update } from "firebase/database";

const AdminReports = () => {
    const [reports, setReports] = useState<any[]>([]);

    useEffect(() => {
        const reportsRef = ref(db, "reports");

        return onValue(reportsRef, (snap) => {
            const data = snap.val();

            if (!data) {
                setReports([]);
                return;
            }

            const list = Object.keys(data).map((key) => ({
                id: key,
                ...data[key]
            }));

            setReports(list.reverse());
        });
    }, []);

    const markReviewed = async (id: string) => {
        await update(ref(db, `reports/${id}`), {
            status: "reviewed"
        });
    };

    return (
        <div style={{ padding: 20, background: "#000", color: "#fff" }}>
            <h2>🚨 Safety Reports</h2>

            {reports.length === 0 && <p>No reports yet.</p>}

            {reports.map((r) => (
                <div
                    key={r.id}
                    style={{
                        background: "#111",
                        padding: 12,
                        marginBottom: 10,
                        borderRadius: 10,
                        border: "1px solid #222"
                    }}
                >
                    <p><b>Reason:</b> {r.reason}</p>
                    <p><b>From:</b> {r.reporterId}</p>
                    <p><b>Against:</b> {r.reportedUserId}</p>
                    <p style={{ color: "#888" }}>{r.details}</p>

                    <button
                        onClick={() => markReviewed(r.id)}
                        style={{
                            marginTop: 8,
                            padding: "8px 12px",
                            background: "#C5FF41",
                            border: "none",
                            borderRadius: 6
                        }}
                    >
                        Mark Reviewed
                    </button>
                </div>
            ))}
        </div>
    );
};

export default AdminReports;