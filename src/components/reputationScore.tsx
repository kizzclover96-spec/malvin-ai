import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import { ref, onValue } from "firebase/database";

type Props = {
    userId: string;
};

const ReputationScore = ({ userId }: Props) => {
    const [score, setScore] = useState(50);
    const [status, setStatus] = useState<"green" | "yellow" | "red">("yellow");

    useEffect(() => {
        if (!userId) return;

        const trustRef = ref(db, `users/${userId}/profile/trust`);

        const unsubscribe = onValue(trustRef, (snap) => {
            const data = snap.val();

            if (!data) {
                setScore(50);
                setStatus("yellow");
                return;
            }

            setScore(data.score ?? 50);
            setStatus(data.status ?? "yellow");
        });

        return () => unsubscribe();
    }, [userId]);

    const color =
        status === "green"
            ? "#C5FF41"
            : status === "yellow"
            ? "#ffcc00"
            : "#ff3b3b";

    return (
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
                style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: color,
                    boxShadow: `0 0 6px ${color}`
                }}
            />
            <span style={{ fontSize: "11px", color }}>
                Trust {score}
            </span>
        </div>
    );
};

export default ReputationScore;