import React, { useEffect, useState, useRef } from "react";
import {
  collection,
  query,
  onSnapshot,
  updateDoc,
  doc,
  where,
  orderBy,
  setDoc,
  serverTimestamp,
  increment,
  collectionGroup,
} from "firebase/firestore";
import { getAuth, signOut } from "firebase/auth";
import { firestore, db } from "../../firebase";
import { ref as dbRef, onValue } from "firebase/database";


type Conversation = {
  id: string;
  brandId?: string;
  lastMessage?: string;
  orderCount?: number;
  isOrderBlue?: boolean;
  orderStatus?: string;
};

export default function MobileView({ brandId }: { brandId: string }) {
    const [orders, setOrders] = useState<any[]>([]);
    const [bookings, setBookings] = useState<any[]>([]);
    const [menuOpen, setMenuOpen] = useState(false);
    const [activeMenuTab, setActiveMenuTab] = useState<"reservations" | "orders">("reservations");
    const [popupMessage, setPopupMessage] = useState<string | null>(null);

    const prevOrdersCount = useRef<number | null>(null);
    const prevReservationsCount = useRef<number | null>(null);
    const auth = getAuth();

    // 🔊 sound + vibration
    const notify = (title: string, body: string) => {
        const audio = new Audio("/notification.mp3");
        audio.play().catch((err) => console.log("Audio waiting for interaction:", err));

        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);

        if (Notification.permission === "granted") {
            new Notification(title, { body, icon: "/favicon.ico" });
        }
    };

    const handleLogout = async () => {
        try { await signOut(auth); } catch (error) { console.error(error); }
    };

    const updateStatus = async (chatId: string, status: string) => {
        if (!chatId) return console.error("Missing chatId evaluation target");
        try {
            await updateDoc(doc(firestore, "conversations", chatId), {
                orderStatus: status,
                isOrderBlue: false,
            });
        } catch (err) {
            console.error("Status update error:", err);
        }
    };

    // Request permissions
    useEffect(() => {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    }, []);

    // 1. Live Orders Subscription
    // 1. Live Orders Subscription
    useEffect(() => {
        if (!brandId) return;

        // Use collectionGroup to find order messages
        const q = query(
            collectionGroup(firestore, "messages"),
            where("isOrder", "==", true),
            orderBy("timestamp", "desc")
        );

        const unsub = onSnapshot(q, (snap) => {
            // 1. Map and Filter the orders immediately so we only handle this brand's orders
            const fetchedOrders = snap.docs
                .map((d) => ({
                    id: d.id,
                    chatId: d.ref.parent.parent?.id,
                    ...d.data(),
                }))
                // 🌟 CRITICAL FILTER: Ensure the message belongs to this specific brandId
                // (Adjust d.brandId to match whatever field name holds your brand identifier on the message)
                .filter((order: any) => order.brandId === brandId);

            // 2. Process changes only for items passing our brand filter
            snap.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const newOrderData = change.doc.data();

                    // Double check that this specific added document belongs to our brand
                    if (newOrderData.brandId === brandId) {
                        
                        // Only trigger sounds/popups if it's a fresh order coming in after mounting
                        if (prevOrdersCount.current !== null) {
                            const msg = `🛒 New Order: ${
                                newOrderData.orderData?.name || "Product"
                            } x${newOrderData.orderData?.quantity || 1}`;

                            notify("New Order", msg);
                            setPopupMessage(msg);
                        }
                    }
                }
            });

            // Sync our counter reference and state with the filtered list
            prevOrdersCount.current = fetchedOrders.length;
            setOrders(fetchedOrders);
        });

        return () => unsub();
    }, [brandId]);
    

    // 2. Live Bookings (RTDB) Subscription
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

            const list = Object.entries(data).map(([id, value]: any) => ({ id, ...value }));
            const sortedList = list.sort((a: any, b: any) => (b.timestamp || 0) - (a.timestamp || 0));

            if (prevReservationsCount.current !== null && sortedList.length > prevReservationsCount.current) {
                const latest = sortedList[0];
                const msg = `📅 New Reservation: ${latest.clientName || latest.name || "Client"}`;
                notify("New Reservation", msg);
                setPopupMessage(msg);
            }

            prevReservationsCount.current = sortedList.length;
            setBookings(sortedList);
        });

        return () => unsubscribe();
    }, [brandId]);

    // Popup alert timeout
    useEffect(() => {
        if (!popupMessage) return;
        const t = setTimeout(() => setPopupMessage(null), 4000);
        return () => clearTimeout(t);
    }, [popupMessage]);

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
                <button onClick={() => setMenuOpen(!menuOpen)} style={styles.menuToggleBtn}>☰</button>
                <h2 style={styles.title}>Secondary Support</h2>
                <button onClick={handleLogout} style={styles.logoutBtn}>Logout</button>
            </div>

            {/* BACKDROP */}
            {menuOpen && <div onClick={() => setMenuOpen(false)} style={styles.backdrop} />}

            {/* SLIDING PANEL */}
            <div
                style={{
                    ...styles.slidingPanel,
                    maxHeight: menuOpen ? "450px" : "0px",
                    borderBottom: menuOpen ? "1px solid #222" : "none",
                    padding: menuOpen ? "15px" : "0px 15px"
                }}
            >
                <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
                    <button
                        onClick={() => setActiveMenuTab("reservations")}
                        style={{
                            ...styles.tabBtn,
                            background: activeMenuTab === "reservations" ? "#C5FF41" : "#222",
                            color: activeMenuTab === "reservations" ? "#000" : "#fff",
                        }}
                    >
                        Reservations ({bookings.length})
                    </button>

                    <button
                        onClick={() => setActiveMenuTab("orders")}
                        style={{
                            ...styles.tabBtn,
                            background: activeMenuTab === "orders" ? "#C5FF41" : "#222",
                            color: activeMenuTab === "orders" ? "#000" : "#fff",
                        }}
                    >
                        Orders ({orders.length})
                    </button>
                </div>

                {activeMenuTab === "reservations" && (
                    <div style={{ maxHeight: "320px", overflowY: "auto" }}>
                        {bookings.length === 0 ? (
                            <div style={styles.emptyNav}>No reservations yet</div>
                        ) : (
                            bookings.map((b: any) => (
                                <div key={b.id} style={styles.dropdownCard}>
                                    <div style={{ fontWeight: 700, marginBottom: 4 }}>{b.clientName || b.name || "Client"}</div>
                                    <div style={{ fontSize: 12, color: "#aaa" }}>📅 {b.date}</div>
                                    <div style={{ fontSize: 12, color: "#aaa" }}>🕒 {b.time}</div>
                                    <div style={{ marginTop: 6, fontSize: 11, color: b.status === "approved" ? "#00ff88" : "#ffaa00" }}>
                                        {b.status || "pending"}
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
                {orders.length === 0 ? (
                    <p style={styles.empty}>No orders available</p>
                ) : (
                    orders.map((order) => (
                        <div key={order.id} style={styles.card}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

                                {order.orderData?.image && (
                                    <img
                                        src={order.orderData.image}
                                        alt=""
                                        style={styles.cardImg}
                                    />
                                )}

                                <div>
                                    <div style={{ fontSize: 13, fontWeight: "bold" }}>
                                        {order.orderData?.name || "Unknown Product"}
                                        {" × "}
                                        {order.orderData?.quantity || 1}
                                    </div>

                                    <div style={{ fontSize: 11, color: "#aaa" }}>
                                        🕒 {order.timestamp?.toDate
                                            ? new Date(order.timestamp.toDate()).toLocaleString()
                                            : "Just now"}
                                    </div>
                                </div>
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
        </div>
    );
}

/* STYLES */
const styles: any = {
    wrapper: { height: "100vh", background: "#0b0b0b", color: "#fff", fontFamily: "sans-serif", position: "relative" },
    popupAlert: { position: "fixed", top: "12px", left: "5%", width: "90%", background: "#C5FF41", color: "#000", padding: "14px 16px", borderRadius: "12px", zIndex: 100, boxShadow: "0px 8px 24px rgba(0,0,0,0.4)", display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: "bold", fontSize: "14px" },
    popupCloseBtn: { background: "transparent", border: "none", fontSize: "16px", cursor: "pointer", color: "#000", padding: "0 4px" },
    header: { padding: "15px", height: "52px", display: "flex", alignItems: "center", justifyContent: "center", borderBottom: "1px solid #222", position: "relative", background: "#0b0b0b" },
    menuToggleBtn: { position: "absolute", left: "15px", background: "transparent", border: "1px solid #222", color: "#fff", padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "16px" },
    logoutBtn: { position: "absolute", right: "15px", background: "transparent", border: "1px solid #493939", color: "#ff3b3b", padding: "6px 12px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" },
    backdrop: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 20 },
    slidingPanel: { position: "fixed", top: "53px", left: 0, width: "100%", overflowY: "auto", background: "#111", zIndex: 30, transition: "all 0.3s ease" },
    tabBtn: { flex: 1, padding: "10px", fontWeight: "bold", border: "none", borderRadius: "8px", cursor: "pointer" },
    dropdownCard: { padding: "12px", border: "1px solid #222", borderRadius: "10px", marginBottom: "8px", background: "#151515" },
    dropdownCardRow: { padding: "12px", background: "#1a1a1a", border: "1px solid #222", borderRadius: "10px", marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" },
    title: { fontSize: "15px", fontWeight: "bold", margin: 0 },
    content: { padding: "20px 12px", overflowY: "auto" },
    empty: { textAlign: "center", marginTop: 50, color: "#777" },
    emptyNav: { color: "#666", fontSize: 13, textAlign: "center", padding: "20px 0" },
    card: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#151515", borderRadius: 12, padding: 12, marginBottom: 10, border: "1px solid #2a2a2a" },
    cardImg: { width: 35, height: 35, borderRadius: 6, objectFit: "cover", marginRight: 8 },
    actions: { display: "flex", gap: 8 },
    circle: { width: 18, height: 18, borderRadius: "50%", border: "none", cursor: "pointer" },
};