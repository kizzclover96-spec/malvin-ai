import React, { useEffect, useState } from "react";
import {
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    setDoc,
    doc,
    serverTimestamp
} from "firebase/firestore";
import { firestore } from "../firebase";
import { auth } from "../firebase";

interface Props {
    adminChatId: string;    // Dedicated internal admin support document ID
    brandName?: string;     // Optional clear-text label for headers
}

const AdminMessenger: React.FC<Props> = ({ adminChatId, brandName }) => {
    const [adminMessage, setAdminMessage] = useState("");
    const [sendingMsg, setSendingMsg] = useState(false);
    const [conversationMessages, setConversationMessages] = useState<any[]>([]);

    // 🔥 LIVE MESSAGE LISTENER
    useEffect(() => {
        if (!adminChatId) {
            setConversationMessages([]);
            return;
        }

        const messagesQuery = query(
            collection(firestore, "conversations", adminChatId, "messages"),
            orderBy("timestamp", "asc")
        );

        const unsubscribe = onSnapshot(
            messagesQuery,
            (snapshot) => {
                const msgs = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                setConversationMessages(msgs);
            },
            (error) => {
                console.error("CHAT_LISTENER_ERROR:", error);
            }
        );

        return () => unsubscribe();
    }, [adminChatId]);

    // 🔥 SEND MESSAGE
    const sendAdminMessageToFirestore = async () => {
        if (!adminMessage.trim()) return;
        if (!adminChatId) {
            console.error("NO_CHAT_ID_PROVIDED");
            return;
        }

        try {
            setSendingMsg(true);

            // ADD MESSAGE TO SUBCOLLECTION
            await addDoc(
                collection(firestore, "conversations", adminChatId, "messages"),
                {
                    text: adminMessage,
                    senderRole: "admin",
                    senderId: auth.currentUser?.uid || "admin",
                    timestamp: serverTimestamp()
                }
            );

            // UPDATE CONVERSATION META DOCUMENT
            await setDoc(
                doc(firestore, "conversations", adminChatId),
                {
                    lastMessage: adminMessage,
                    updatedAt: serverTimestamp(),
                    unread: true
                },
                { merge: true }
            );

            setAdminMessage("");
        } catch (error) {
            console.error("FIRESTORE_SEND_ERROR:", error);
        } finally {
            setSendingMsg(false);
        }
    };

    return (
        <div style={messengerContainer}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "12px" }}>
                <label style={labelStyle}>
                    SECURE_INTERCOM_DISPATCH
                </label>
                {/* 🌟 FIXED LINE 108: Uses the safe prop value instead of selectedUser */}
                <span style={{ fontSize: "10px", color: "#007fff", fontWeight: "bold" }}>
                    ({brandName || "SUPPORT_CHANNEL"})
                </span>
            </div>

            {/* MESSAGE FEED */}
            <div
                style={{
                    height: "220px",
                    overflowY: "auto",
                    background: "#000",
                    border: "1px solid #222",
                    borderRadius: "8px",
                    padding: "12px",
                    marginBottom: "12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px"
                }}
            >
                {conversationMessages.length === 0 ? (
                    <div style={{ textAlign: "center", opacity: 0.3, fontSize: "11px", marginTop: "80px" }}>
                        NO_MESSAGES
                    </div>
                ) : (
                    conversationMessages.map((msg) => {
                        const isAdmin = msg.senderRole === "admin";;
                        return (
                            <div
                                key={msg.id}
                                style={{
                                    alignSelf: isAdmin ? "flex-end" : "flex-start",
                                    background: isAdmin ? "rgba(0,127,255,0.15)" : "rgba(255,255,255,0.05)",
                                    border: isAdmin ? "1px solid #007fff" : "1px solid #333",
                                    padding: "8px 12px",
                                    borderRadius: "12px",
                                    maxWidth: "80%",
                                    fontSize: "12px",
                                    color: "#fff",
                                    wordBreak: "break-word"
                                }}
                            >
                                <div style={{ fontSize: "9px", opacity: 0.5, marginBottom: "2px", fontWeight: "bold" }}>
                                    {isAdmin ? "MALVIN_ADMIN" : "MERCHANT"}
                                </div>
                                {msg.text}
                            </div>
                        );
                    })
                )}
            </div>

            {/* INPUT CONTROLS */}
            <div style={{ display: "flex", gap: "8px" }}>
                <input
                    type="text"
                    placeholder="Type secure payload..."
                    value={adminMessage}
                    onChange={(e) => setAdminMessage(e.target.value)}
                    style={{ ...inputStyle, flex: 1 }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !sendingMsg) {
                            sendAdminMessageToFirestore();
                        }
                    }}
                />
                <button
                    onClick={sendAdminMessageToFirestore}
                    disabled={sendingMsg || !adminMessage.trim()}
                    style={{
                        ...approveBtn,
                        background: "#007fff",
                        color: "#fff",
                        padding: "0 16px",
                        opacity: sendingMsg || !adminMessage.trim() ? 0.4 : 1
                    }}
                >
                    {sendingMsg ? "..." : "SEND"}
                </button>
            </div>
        </div>
    );
};

export default AdminMessenger;

// STYLES
const inputStyle: React.CSSProperties = { width: "100%", background: "#000", border: "1px solid #333", padding: "12px", borderRadius: "8px", color: "#fff" };
const approveBtn: React.CSSProperties = { background: "#C5FF41", color: "#000", border: "none", padding: "12px", borderRadius: "8px", fontWeight: 700, cursor: "pointer" };
const labelStyle: React.CSSProperties = { fontSize: "10px", opacity: 0.5 };
const messengerContainer: React.CSSProperties = { marginTop: "10px", padding: "16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderRadius: "12px" };
