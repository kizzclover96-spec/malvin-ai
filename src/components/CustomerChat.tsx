import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { 
  doc, setDoc, addDoc, collection, serverTimestamp, 
  query, orderBy, onSnapshot 
} from "firebase/firestore";
import { ref as dbRef, onValue } from "firebase/database";
import { db, firestore } from "../firebase"; 
import { ProductCard } from './ProductView';
import PhotoMessage from "./PhotoMessage";
import SendPhoto from "./SendPhoto";

interface CustomerChatProps {
    pendingOrder?: any;
    quantity?: number;
}

const CustomerChat = ({ pendingOrder: propOrder, quantity: propQuantity }: CustomerChatProps) => {
    const { brandId } = useParams<{ brandId: string }>();
    
    const [chatId, setChatId] = useState<string>('');
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState<any[]>([]);
    const [brandData, setBrandData] = useState<any>(null);
    const [catalogItems, setCatalogItems] = useState<any[]>([]);
    const [showCatalog, setShowCatalog] = useState(false);
    const [orderModal, setOrderModal] = useState<any>(null);
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    

    const pendingOrderRef = useRef<any>(null);
    const lastAcceptedOrderId = useRef<string | null>(null);
    const [showShipmentDetails, setShowShipmentDetails] = useState(false);
    
    const [shipments, setShipments] = useState<any[]>([]);

    const [orderStatus, setOrderStatus] = useState<string | null>(null);
    const [showAcceptedPopup, setShowAcceptedPopup] = useState(false);
    const [confetti, setConfetti] = useState<any[]>([]);

    // Use a ref to ensure an order is only processed and fired once per mount cycle
    const orderProcessed = useRef(false);
    useEffect(() => {
        const saved = localStorage.getItem('pendingOrder');
        if (!saved) return;
        localStorage.removeItem('pendingOrder');
        pendingOrderRef.current = JSON.parse(saved);

        
    }, []);

    useEffect(() => {
        if (!pendingOrderRef.current) return;
        if (!chatId || !brandData) return;
        if (orderProcessed.current) return;

        orderProcessed.current = true;

        const order = pendingOrderRef.current;

        // Small delay ensures the Firestore onSnapshot listener
        // is attached before we write — so the message appears live
        setTimeout(() => {
            handleSend(
                undefined,
                `I'd like to order ${order.quantity || 1}x ${order.name}`,
                true,
                {
                    name: order.name,
                    quantity: order.quantity || 1,
                    image: order.image,
                    price: order.price
                }
            );
        }, 500);
    }, [chatId, brandData]);
    
    
    const scrollRef = useRef<HTMLDivElement>(null);

    // 1. Initial Setup: Brand Data & Persistent Session
    useEffect(() => {
        if (!brandId) return;

        // Persistent Chat ID per Brand
        let id = localStorage.getItem(`malvin_chat_${brandId}`);
        if (!id) {
            id = uuidv4();
            localStorage.setItem(`malvin_chat_${brandId}`, id);
        }
        setChatId(id);

        // Fetch Brand Info (Realtime DB)
        const brandInfoRef = dbRef(db, `users/${brandId}/brandData`);
        const unsubBrand = onValue(brandInfoRef, (snapshot) => {
            if (snapshot.exists()) {
                setBrandData(snapshot.val());
            } else {
                console.error("Brand not found at path:", brandId);
            }
            setLoading(false);
        }, (err) => {
            console.error("Firebase Auth Error - Check Rules:", err);
            setLoading(false);
        });

        // Fetch Catalog
        const catalogRef = dbRef(db, `users/${brandId}/catalog`);
        const unsubCatalog = onValue(catalogRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setCatalogItems(Object.keys(data).map(k => ({ id: k, ...data[k] })));
            }
        });

        return () => { unsubBrand(); unsubCatalog(); };
    }, [brandId]);

    // 2. Chat Listener
    useEffect(() => {
        if (!chatId) return;
        const q = query(
            collection(firestore, "conversations", chatId, "messages"), 
            orderBy("timestamp", "asc")
        );
        return onSnapshot(q, (snapshot) => {
            setChatHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
    }, [chatId]);

    // 3. Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chatHistory]);
    useEffect(() => {
        if (!chatId) return;

        const shipmentsRef = collection(
            firestore,
            "conversations",
            chatId,
            "shipments"
        );

        const unsub = onSnapshot(shipmentsRef, (snap) => {
            const data = snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setShipments(data);
        });

        return () => unsub();
    }, [chatId]);

    // Handlers
    const handleSend = async (e?: React.FormEvent, customMsg?: string, isOrder = false, orderData?: any) => {
        if (e) e.preventDefault();
        const textToSend = customMsg || message;
        if (!textToSend.trim() || !chatId || !brandId) return;
        

        try {
            const convoRef = doc(firestore, "conversations", chatId);
            await setDoc(convoRef, {
                brandId,
                brandName: brandData?.name || "Customer",
                lastMessage: textToSend,
                updatedAt: serverTimestamp(),
                status: 'active',
                viewedByManager: false 
            }, { merge: true });

            await addDoc(collection(firestore, "conversations", chatId, "messages"), {
                text: textToSend,
                sender: 'customer',
                timestamp: serverTimestamp(),
                isOrder,
                orderData: orderData || null,
                brandId, // 🔥 ADD THIS
            });

            if (!customMsg) setMessage('');
        } catch (error) { console.error("Send failed:", error); }
    };

    const confirmOrder = () => {
        if (!orderModal) return;
        const orderText = `I'd like to order ${quantity}x ${orderModal.name}`;
        handleSend(undefined, orderText, true, {
            name: orderModal.name,
            quantity,
            image: orderModal.image,
            price: orderModal.price
        });
        setOrderModal(null);
        setQuantity(1);
        setShowCatalog(false);
    };
    const triggerOrderAccepted = () => {
        launchConfetti();

        setShowAcceptedPopup(true);

        setTimeout(() => {
            setShowAcceptedPopup(false);
        }, 4000);
    };
    const launchConfetti = () => {
        const particles = Array.from({ length: 35 }, (_, i) => ({
            id: i,
            x: Math.random() * 400 - 200,
            y: Math.random() * 200,
            size: Math.random() * 10 + 5
        }));

        setConfetti(particles);

        setTimeout(() => setConfetti([]), 1800);
    };
    const previousStatus = useRef<string | null>(null);
    const scrollToBottom = () => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: "smooth"
            });
        }
    };

    

    useEffect(() => {
        if (!chatId) return;

        const convoRef = doc(firestore, "conversations", chatId);

        const unsub = onSnapshot(convoRef, (snap) => {
            const data = snap.data();
            if (!data) return;

            const newStatus = data.orderStatus;
            const lastAcceptedAt = data.lastOrderAt;
            const orderId = data.orderId; // or shipment/order reference

            const acceptedKey = `accepted_${chatId}_${lastAcceptedAt?.seconds}`;

            if (
                newStatus === "accepted" &&
                lastAcceptedAt &&
                !localStorage.getItem(acceptedKey)
            ) {
                localStorage.setItem(acceptedKey, "1");
                triggerOrderAccepted();
            }

            previousStatus.current = newStatus;
            setOrderStatus(newStatus);
        });

        return () => unsub();
    }, [chatId]);

    useEffect(() => {
        const handleVisibility = () => {
            document
                .querySelectorAll(".protected-photo")
                .forEach((img) => {
                    (img as HTMLElement).style.filter =
                        document.hidden ? "blur(40px)" : "none";
                });
        };

        window.addEventListener("blur", handleVisibility);
        window.addEventListener("focus", handleVisibility);
        document.addEventListener("visibilitychange", handleVisibility);

        return () => {
            window.removeEventListener("blur", handleVisibility);
            window.removeEventListener("focus", handleVisibility);
            document.removeEventListener(
                "visibilitychange",
                handleVisibility
            );
        };
    }, []);
    useEffect(() => {
        const imgs = document.querySelectorAll("img");

        imgs.forEach((img) => {
            img.addEventListener("load", scrollToBottom);
        });

        return () => {
            imgs.forEach((img) => {
                img.removeEventListener(
                    "load",
                    scrollToBottom
                );
            });
        };
    }, [chatHistory]);
    
    if (loading) return <div style={{background: '#000', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666'}}>Authenticating Shop...</div>;


    return (
        <>
            <style>{`
                @keyframes rotatePulse {
                    0% {
                        transform: rotate(0deg) scale(1);
                    }
                    50% {
                        transform: rotate(180deg) scale(1.08);
                    }
                    100% {
                        transform: rotate(360deg) scale(1);
                    }
                }

                @keyframes pulseRing {
                    0% {
                        transform: translate(-50%, -50%) scale(0.6);
                        opacity: 0.8;
                    }
                    100% {
                        transform: translate(-50%, -50%) scale(1.4);
                        opacity: 0;
                    }
                }
                @keyframes confettiFly {
                    0% {
                        opacity: 1;
                        transform: translate(0,0) scale(1);
                    }

                    100% {
                        opacity: 0;
                        transform: translate(var(--x), 250px) rotate(720deg);
                    }
                }
            `}</style>
            {confetti.map((particle) => (
                <div
                    key={particle.id}
                    style={{
                        position: "fixed",
                        left: "50%",
                        "--x": `${particle.x}px`,
                        top: "70px",
                        width: particle.size,
                        height: particle.size,
                        background:
                            ["#38d777", "#C5FF41", "#007aff", "#ffd60a"][
                                particle.id % 4
                            ],
                        borderRadius: "50%",
                        animation: "confettiFly 1.8s ease-out forwards",
                        pointerEvents: "none",
                        zIndex: 99998
                    } as React.CSSProperties}
                />
            ))}
            {showAcceptedPopup && (
                <div style={{
                    position: "fixed",
                    top: "30px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "rgba(0,0,0,0.85)",
                    padding: "18px 22px",
                    borderRadius: "16px",
                    border: "1px solid #38d777",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    zIndex: 99999,
                    animation: "slideIn 0.3s ease"
                }}>
                    <div style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        background: "#38d777",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "20px"
                    }}>
                        ✔
                    </div>

                    <div>
                        <div style={{ fontWeight: 700 }}>Order Accepted</div>
                        <div style={{ fontSize: "12px", opacity: 0.7 }}>
                            Your order has been verified by the store
                        </div>
                    </div>
                </div>
            )}
            <div style={containerStyle}>
                <style>{`
                    @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
                    @media (max-width: 768px) {
                        .catalog-sidebar { position: absolute !important; right: 0; top: 0; height: 100%; width: 85% !important; z-index: 50; box-shadow: -10px 0 30px rgba(0,0,0,0.5); }
                        .message-bubble { max-width: 85% !important; }
                    }
                `}</style>

                <div style={headerStyle}>
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '16px' }}>{brandData?.name || "Malvin Partner"}</div>
                        <div style={{ fontSize: '11px', color: '#C5FF41' }}>● Online</div>
                    </div>
                    <button onClick={() => setShowCatalog(!showCatalog)} style={catalogToggleBtn}>
                        {showCatalog ? '✕' : 'Catalog 📦'}
                    </button>
                </div>

                <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
                    <div ref={scrollRef} style={messageAreaStyle}>
                        <div style={{...messageBubbleStyle, alignSelf: 'flex-start', background: '#1A1A1A', color: 'white'}}>
                            Hello! Welcome to <b>{brandData?.name}</b>. How can I help you today?
                        </div>

                        {chatHistory.map((msg) => {

                            if (msg.type === "photo") {

                                return (
                                <div
                                    key={msg.id}
                                    style={{
                                    alignSelf:
                                        msg.sender === "customer"
                                        ? "flex-end"
                                        : "flex-start"
                                    }}
                                >
                                    <PhotoMessage msg={msg} />
                                </div>
                                );
                            }

                            return (
                                <div
                                key={msg.id}
                                className="message-bubble"
                                style={{
                                    ...messageBubbleStyle,
                                    alignSelf:
                                    msg.sender === "customer"
                                        ? "flex-end"
                                        : "flex-start",

                                    background: msg.isOrder
                                    ? "rgba(197,255,65,.1)"
                                    : (
                                        msg.sender === "customer"
                                            ? "#C5FF41"
                                            : "#1A1A1A"
                                        ),

                                    color:
                                    msg.sender === "customer"
                                        ? "black"
                                        : "white",

                                    border: msg.isOrder
                                    ? "1px solid #C5FF41"
                                    : "none"
                                }}
                                >

                                    {msg.isOrder && msg.orderData && (
                                        <div
                                            style={{
                                                marginBottom: 8,
                                                display: "flex",
                                                gap: 10
                                            }}
                                        >
                                            {msg.orderData?.image && (
                                                <img
                                                    src={msg.orderData.image}
                                                    className="protected-photo"
                                                    style={{
                                                    width: 45,
                                                    height: 45,
                                                    borderRadius: 8,
                                                    objectFit: "cover" 
                                                }} />
                                            )}

                                            <div
                                                style={{
                                                fontSize: 12
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        fontWeight: "bold"
                                                    }}
                                                >
                                                Order Request
                                                </div>

                                                <div>
                                                    {msg.orderData.quantity}x{" "}
                                                    {msg.orderData.name}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div
                                        style={{
                                        fontSize: 14,
                                        lineHeight: 1.4
                                        }}
                                    >
                                        {msg.text}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: 10,
                                            opacity: 0.5,
                                            marginTop: 4
                                        }}
                                    >
                                        {msg.timestamp?.toDate?.()
                                            ?.toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit"
                                            })}
                                    </div>
                                </div>

                            );
                        })}
                    </div>

                    {showCatalog && (
                        <div className="catalog-sidebar" style={sidebarStyle}>
                            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                                <h4 style={{fontSize: '10px', opacity: 0.5, letterSpacing: '1px', margin: 0}}>STORE_CATALOG</h4>
                                <button onClick={() => setShowCatalog(false)} style={{background: 'none', border: 'none', color: '#666', fontSize: '18px'}}>✕</button>
                            </div>
                            {catalogItems.map(item => (
                                <ProductCard key={item.id} item={item} onAddToCart={(it: any) => setOrderModal(it)} />
                            ))}
                        </div>
                    )}
                </div>

                {orderModal && (
                    <div style={modalOverlay}>
                        <div style={glassModal}>
                            <h3 style={{marginTop: 0, fontSize: '18px'}}>Order Quantity</h3>
                            <p style={{opacity: 0.7, fontSize: '14px'}}>{orderModal.name}</p>
                            <input 
                                type="number" 
                                min="1"
                                value={quantity} 
                                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                style={quantityInput}
                            />
                            <div style={{display: 'flex', gap: '10px'}}>
                                <button onClick={confirmOrder} style={primaryBtn}>Confirm</button>
                                <button onClick={() => setOrderModal(null)} style={secondaryBtn}>Cancel</button>
                            </div>
                        </div>
                    </div>
                )}
                {shipments.length > 0 && (
                    <div style={{ position: "absolute", bottom: "85px", right: "25px", zIndex: 9999 }}>

                        <div
                            onClick={() => {
                                console.log("shipment clicked");
                                setShowShipmentDetails(prev => !prev);
                            }}
                            style={{
                                width: "42px",
                                height: "42px",
                                borderRadius: "50%",
                                background: "rgba(34, 197, 94, 0.15)",
                                border: "1px solid rgba(34, 197, 94, 0.6)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                cursor: "pointer",
                                position: "relative",
                                animation: "rotatePulse 2.5s linear infinite",
                                zIndex: 9999,
                                pointerEvents: "auto"
                            }}
                        >
                            🚚
                        </div>

                        <div
                            style={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                width: "70px",
                                height: "70px",
                                transform: "translate(-50%, -50%)",
                                borderRadius: "50%",
                                border: "2px solid rgba(34, 197, 94, 0.4)",
                                animation: "pulseRing 1.8s ease-out infinite"
                            }}
                        />
                    </div>
                )}
                <form onSubmit={handleSend} style={inputContainerStyle}>

                    {chatId && (
                        <SendPhoto
                            chatId={chatId}
                            sender="customer"
                            brandName={brandData?.name || "Malvin"}
                        />
                    )}

                    <input
                        value={message}
                        onChange={(e) =>
                        setMessage(e.target.value)
                        }
                        placeholder="Ask us anything..."
                        style={inputStyle}
                    />

                    <button
                        type="submit"
                        disabled={uploading}
                        style={sendBtnStyle}
                    >
                        →
                    </button>

                </form>
                {showShipmentDetails && (
                    <div
                        style={{
                            position: "absolute",
                            bottom: "140px",
                            right: "20px",
                            width: "300px",
                            background: "rgba(10,10,10,0.95)",
                            border: "1px solid rgba(34,197,94,0.3)",
                            borderRadius: "16px",
                            padding: "14px",
                            zIndex: 60,
                            backdropFilter: "blur(10px)"
                        }}
                    >
                        <div style={{ fontWeight: 700, marginBottom: "10px" }}>
                            🚚 Shipment Updates
                        </div>

                        {shipments.length === 0 ? (
                            <div style={{ fontSize: "12px", opacity: 0.6 }}>
                                No active shipments
                            </div>
                        ) : (
                            shipments.map((s) => (
                                <div
                                    key={s.id}
                                    style={{
                                        padding: "10px",
                                        borderRadius: "10px",
                                        background: "#111",
                                        marginBottom: "8px",
                                        border: "1px solid #222"
                                    }}
                                >
                                    {/* PRODUCT */}
                                    <div style={{ fontSize: "13px", fontWeight: 600 }}>
                                        📦 {s.product}
                                    </div>

                                    {/* QUANTITY */}
                                    <div style={{ fontSize: "11px", opacity: 0.7 }}>
                                        Qty: {s.quantity}
                                    </div>

                                    {/* DELIVERY DATE */}
                                    <div style={{ fontSize: "11px", opacity: 0.7 }}>
                                        📅 Dispatch: {s.deliveryDate}
                                    </div>

                                    {/* ARRIVAL DATE */}
                                    <div style={{ fontSize: "11px", opacity: 0.7 }}>
                                        🚚 Arrival: {s.expectedArrival}
                                    </div>

                                    {/* ADDRESS */}
                                    <div style={{ fontSize: "11px", opacity: 0.7 }}>
                                        📍 Address: {s.address}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </>
    );
};

// ... Styles (Container, Header, etc. remain the same as your previous snippet)
const containerStyle: React.CSSProperties = { backgroundColor: '#000', height: '100dvh', display: 'flex', flexDirection: 'column', color: 'white', position: 'fixed', width: '100%', top: 0, left: 0 };
const headerStyle: React.CSSProperties = { padding: '15px 20px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#000', zIndex: 10 };
const catalogToggleBtn: React.CSSProperties = { background: '#1A1A1A', color: 'white', border: '1px solid #333', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer' };
const messageAreaStyle: React.CSSProperties = { flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '30px' };
const messageBubbleStyle: React.CSSProperties = { padding: '12px 16px', borderRadius: '20px', maxWidth: '75%', wordWrap: 'break-word' };
const sidebarStyle: React.CSSProperties = { width: '280px', background: '#080808', borderLeft: '1px solid #222', padding: '15px', overflowY: 'auto', animation: 'slideIn 0.3s ease' };
const inputContainerStyle: React.CSSProperties = { padding: '15px', paddingBottom: 'env(safe-area-inset-bottom, 15px)', display: 'flex', gap: '8px', background: '#000', borderTop: '1px solid #111' };
const inputStyle: React.CSSProperties = { flex: 1, background: '#111', border: '1px solid #333', color: 'white', padding: '12px 20px', borderRadius: '25px', outline: 'none', fontSize: '16px' }; 
const sendBtnStyle: React.CSSProperties = { background: '#C5FF41', border: 'none', width: '45px', height: '45px', borderRadius: '50%', cursor: 'pointer', flexShrink: 0, fontSize: '20px' };
const modalOverlay: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' };
const glassModal: React.CSSProperties = { background: '#111', border: '1px solid #333', padding: '25px', borderRadius: '24px', width: '100%', maxWidth: '320px', textAlign: 'center' };
const quantityInput: React.CSSProperties = { width: '100%', backgroundColor: '#000', border: '1px solid #333', borderRadius: '12px', padding: '12px', color: 'white', marginBottom: '20px', textAlign: 'center', fontSize: '24px' };
const primaryBtn: React.CSSProperties = { background: '#C5FF41', color: 'black', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', flex: 1 };
const secondaryBtn: React.CSSProperties = { background: 'transparent', color: 'white', border: '1px solid #333', padding: '14px', borderRadius: '12px', cursor: 'pointer', flex: 1 };

export default CustomerChat;