import React, { useEffect, useState, useRef } from "react";
import {
  collection,
  query,
  onSnapshot,
  updateDoc,
  doc,
  where,
  orderBy,
} from "firebase/firestore";
// Import getAuth and signOut
import { getAuth, signOut } from "firebase/auth";
import { firestore } from "../firebase";
import { db } from "../firebase";
import { ref as dbRef, onValue } from "firebase/database";

type Conversation = {
  id: string;
  brandId?: string;
  lastMessage?: string;
  orderCount?: number;
  isOrderBlue?: boolean;
  orderStatus?: string;
};

type ChatMessage = {
    id: string;
    text?: string;
    sender?: string;
    timestamp?: any;
    isOrder?: boolean;
    orderData?: {
        name: string;
        quantity: number;
        image?: string;
        price?: number;
    };
};

export default function MobileView({ brandId }: { brandId: string }) {
    const [chats, setChats] = useState<Conversation[]>([]);
    const [newOrderId, setNewOrderId] = useState<string | null>(null);
    const prevCount = useRef(0);
    
    // Tracking reservations count reference
    const prevReservationsCount = useRef<number | null>(null);
    const [popupMessage, setPopupMessage] = useState<string | null>(null);

    const [menuOpen, setMenuOpen] = useState(false);
    const [activeMenuTab, setActiveMenuTab] = useState<"reservations" | "orders">("reservations");
    const [bookings, setBookings] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);

    const auth = getAuth(); // Initialize auth instance

    // 🔊 sound + vibration
    const notify = (title: string, body: string) => {
        const audio = new Audio("/notification.mp3");
        audio.play().catch((err) => console.log("Audio playback waiting for user interaction:", err));

        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200]); 
        }

        if (Notification.permission === "granted") {
            new Notification(title, {
                body: body,
                icon: "/favicon.ico",
            });
        }
    };

    // Logout Handler
    const handleLogout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out: ", error);
        }
    };

    useEffect(() => {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    }, []);

    const prevOrdersCount = useRef<number | null>(null);

    useEffect(() => {
        if (!brandId) return;

        const q = query(
            collection(firestore, "orders"),
            where("brandId", "==", brandId),
            orderBy("timestamp", "desc")
        );

        const unsub = onSnapshot(q, (snap) => {
            const fetchedOrders = snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as any[];

            if (prevOrdersCount.current !== null && fetchedOrders.length > prevOrdersCount.current) {
                const latestOrder = fetchedOrders[0];
                notify("New Order!", `📦 New order: ${latestOrder.name || "Item"} x${latestOrder.quantity || 1}`);
                setPopupMessage(`📦 New Order: ${latestOrder.name || "Item"} x${latestOrder.quantity || 1}`);
            }

            prevOrdersCount.current = fetchedOrders.length;
            setOrders(fetchedOrders);
        });

        return () => unsub();
    }, [brandId]);

    useEffect(() => {
        if (!brandId) return;

        const bookingsRef = dbRef(db, `users/${brandId}/bookings`);

        const unsubscribe = onValue(bookingsRef, (snap) => {
            const data = snap.val();

            if (!data) {
                setBookings([]);
                prevReservationsCount.current = 0;
                return;
            }

            const list = Object.entries(data).map(([id, value]: any) => ({
                id,
                ...value,
            }));

            const sortedList = list.sort(
                (a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0)
            );

            if (prevReservationsCount.current !== null && sortedList.length > prevReservationsCount.current) {
                const latestReservation = sortedList[0];
                notify("New Reservation", `${latestReservation.clientName || latestReservation.name || "Client"} has booked`);
                setPopupMessage(`📅 New Reservation: ${latestReservation.clientName || latestReservation.name || "Client"}`);
            }

            prevReservationsCount.current = sortedList.length;
            setBookings(sortedList);
        });

        return () => unsubscribe();
    }, [brandId]);

    useEffect(() => {
        if (!newOrderId && !popupMessage) return;
        const t = setTimeout(() => {
            setNewOrderId(null);
            setPopupMessage(null);
        }, 4000);
        return () => clearTimeout(t);
    }, [newOrderId, popupMessage]);

    const updateStatus = async (id: string, status: string) => {
        await updateDoc(doc(firestore, "conversations", id), {
            orderStatus: status,
            isOrderBlue: false,
        });
    };

    const activeOrders = orders;

    return (
        <div style={styles.wrapper}>
            {popupMessage && (
                <div style={styles.popupAlert}>
                    <span>{popupMessage}</span>
                    <button onClick={() => setPopupMessage(null)} style={styles.popupCloseBtn}>✕</button>
                </div>
            )}

            {/* HEADER */}
            <div style={styles.header}>
                <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    style={{
                        position: "absolute",
                        left: "15px",
                        background: "transparent",
                        border: "1px solid #222",
                        color: "#fff",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "16px"
                    }}
                >
                    ☰
                </button>

                <h2 style={styles.title}>Secondary Support</h2>

                {/* LOGOUT BUTTON */}
                <button
                    onClick={handleLogout}
                    style={{
                        position: "absolute",
                        right: "15px",
                        background: "transparent",
                        border: "1px solid #ff3b3b",
                        color: "#ff3b3b",
                        padding: "6px 12px",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "bold"
                    }}
                >
                    Logout
                </button>
            </div>

            {/* BACKDROP */}
            {menuOpen && (
                <div
                    onClick={() => setMenuOpen(false)}
                    style={{
                        position: "fixed",
                        inset: 0,
                        background: "rgba(0,0,0,0.6)",
                        zIndex: 20
                    }}
                />
            )}

            {/* CONSOLIDATED SLIDING MENU PANEL */}
            <div
                style={{
                    position: "fixed",
                    top: "53px",
                    left: 0,
                    width: "100%",
                    maxHeight: menuOpen ? "450px" : "0px",
                    overflowY: "auto",
                    background: "#111",
                    borderBottom: menuOpen ? "1px solid #222" : "none",
                    zIndex: 30,
                    transition: "all 0.3s ease",
                    padding: menuOpen ? "15px" : "0px 15px"
                }}
            >
                <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
                    <button
                        onClick={() => setActiveMenuTab("reservations")}
                        style={{
                            flex: 1,
                            padding: "10px",
                            background: activeMenuTab === "reservations" ? "#C5FF41" : "#222",
                            color: activeMenuTab === "reservations" ? "#000" : "#fff",
                            fontWeight: "bold",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer"
                        }}
                    >
                        Reservations ({bookings.length})
                    </button>

                    <button
                        onClick={() => setActiveMenuTab("orders")}
                        style={{
                            flex: 1,
                            padding: "10px",
                            background: activeMenuTab === "orders" ? "#C5FF41" : "#222",
                            color: activeMenuTab === "orders" ? "#000" : "#fff",
                            fontWeight: "bold",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer"
                        }}
                    >
                        Orders ({activeOrders.length})
                    </button>
                </div>

                {activeMenuTab === "reservations" && (
                    <div style={{ maxHeight: "320px", overflowY: "auto" }}>
                        {bookings.length === 0 ? (
                            <div style={{ color: "#666", fontSize: 12, textAlign: "center", padding: "15px" }}>
                                No reservations yet
                            </div>
                        ) : (
                            bookings.map((b: any) => (
                                <div
                                    key={b.id}
                                    style={{
                                        padding: "12px",
                                        border: "1px solid #222",
                                        borderRadius: "10px",
                                        marginBottom: "8px",
                                        background: "#151515"
                                    }}
                                >
                                    <div style={{ fontWeight: 700, marginBottom: 4 }}>
                                        {b.clientName || b.name || "Client"}
                                    </div>
                                    <div style={{ fontSize: 12, color: "#aaa" }}>📅 {b.date}</div>
                                    <div style={{ fontSize: 12, color: "#aaa" }}>🕒 {b.time}</div>
                                    <div
                                        style={{
                                            marginTop: 6,
                                            fontSize: 11,
                                            color: b.status === "approved" ? "#00ff88" : "#ffaa00"
                                        }}
                                    >
                                        {b.status || "pending"}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {activeMenuTab === "orders" && (
                    <div style={{ maxHeight: "320px", overflowY: "auto" }}>
                        {activeOrders.length === 0 ? (
                            <div style={{ color: "#666", fontSize: 13, textAlign: "center", padding: "20px 0" }}>
                                No active orders inside dropdown
                            </div>
                        ) : (
                            activeOrders.map((order) => (
                                <div 
                                    key={order.id} 
                                    style={{ 
                                        padding: "12px", 
                                        background: "#1a1a1a",
                                        border: "1px solid #222",
                                        borderRadius: "10px", 
                                        marginBottom: "8px",
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center"
                                    }}
                                >
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: "bold" }}> {order.orderData?.name} x{order.orderData?.quantity} </div>
                                        <div style={{ fontSize: 11, color: "#aaa" }}>  Chat: {order.chatId?.slice(0, 6)}...</div>
                                        <div style={{ fontSize: 11, color: "#aaa" }}>{order.lastMessage || "No messages"}</div>
                                    </div>
                                    <div style={styles.actions}>
                                        <button
                                            onClick={() => updateStatus(order.chatId, "accepted")}
                                            style={{ ...styles.circle, background: "#00ff88" }}
                                        />
                                        <button
                                            onClick={() => updateStatus(order.chatId, "rejected")}
                                            style={{ ...styles.circle, background: "#ff3b3b" }}
                                        />
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* MAIN BACKGROUND APP CONTENT */}
            <div style={styles.content}>
                <div style={{ paddingBottom: "10px", color: "#666", fontSize: "12px" }}>Main Workflow Queue:</div>
                {activeOrders.length === 0 ? (
                    <p style={styles.empty}>No orders available</p>
                ) : (
                    activeOrders.map((order) => (
                        <div
                            key={order.id}
                            style={{
                                ...styles.card,
                                border: order.id === newOrderId ? "1px solid #00ff88" : "1px solid #2a2a2a",
                            }}
                        >  
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}> 
                                {order.image && (
                                    <img
                                        src={order.image}
                                        style={{
                                            width: 35,
                                            height: 35,
                                            borderRadius: 6,
                                            objectFit: "cover",
                                            marginRight: 8
                                        }}
                                    />
                                )}
                            </div>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: "bold" }}>
                                    {order.name} × {order.quantity}
                                </div>
                                <div style={{ fontSize: 11, color: "#aaa" }}>
                                    🕒{" "}
                                    {order.timestamp?.toDate?.()
                                        ? new Date(order.timestamp.toDate()).toLocaleString()
                                        : "Just now"}
                                </div>
                            </div>

                            <div style={styles.actions}>
                                <button
                                    onClick={() => updateStatus(order.chatId, "accepted")}
                                    style={{ ...styles.circle, background: "#00ff88" }}
                                />
                                <button
                                    onClick={() => updateStatus(order.id, "rejected")}
                                    style={{ ...styles.circle, background: "#ff3b3b" }}
                                />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

/* STYLES */
const styles: any = {
    wrapper: {
        height: "100vh",
        background: "#0b0b0b",
        color: "#fff",
        fontFamily: "sans-serif",
        position: "relative"
    },
    popupAlert: {
        position: "fixed",
        top: "12px",
        left: "5%",
        width: "90%",
        background: "#C5FF41",
        color: "#000",
        padding: "14px 16px",
        borderRadius: "12px",
        zIndex: 100,
        boxShadow: "0px 8px 24px rgba(0,0,0,0.4)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontWeight: "bold",
        fontSize: "14px",
    },
    popupCloseBtn: {
        background: "transparent",
        border: "none",
        fontSize: "16px",
        cursor: "pointer",
        color: "#000",
        padding: "0 4px"
    },
    header: {
        padding: "15px",
        height: "52px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderBottom: "1px solid #222",
        position: "relative",
        background: "#0b0b0b",
    },
    title: {
        fontSize: "15px",
        fontWeight: "bold",
        margin: 0,
    },
    content: {
        padding: "20px 12px",
        overflowY: "auto",
    },
    empty: {
        textAlign: "center",
        marginTop: 50,
        color: "#777",
    },
    card: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        background: "#151515",
        borderRadius: 12,
        padding: 12,
        marginBottom: 10,
    },
    actions: {
        display: "flex",
        gap: 8,
    },
    circle: {
        width: 18,
        height: 18,
        borderRadius: "50%",
        border: "none",
        cursor: "pointer",
    },
};