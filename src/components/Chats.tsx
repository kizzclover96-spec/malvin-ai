import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, doc, setDoc, updateDoc, getDocs } from "firebase/firestore";
import { firestore, auth } from "../firebase";
import { increment } from "firebase/firestore";

const ChatCard = ({ children, style }: any) => (
    <div style={{
        background: '#000000',
        borderRadius: '0px', 
        borderRight: '1px solid #1c1c1e',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        height: '100%',
        boxSizing: 'border-box',
        ...style
    }}>{children}</div>
);

const Chats = ({ brandId, userBrand }: any) => {
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [activeMessages, setActiveMessages] = useState<any[]>([]);
    const [chats, setChats] = useState<any[]>([]); 
    const [inputValue, setInputValue] = useState('');
    const [isInternalOpen, setIsInternalOpen] = useState(false);
    const [hasNewInternalMsg, setHasNewInternalMsg] = useState(false);
    const [showTrustMsg, setShowTrustMsg] = useState(false); 
    const adminChatRoomId = "global_system_coordination"; 

    // Order Tracking Feature State Mechanics
    const [orderInput, setOrderInput] = useState<string>('1');
    const [showOrderModal, setShowOrderModal] = useState(false);
    const [isOrderActive, setIsOrderActive] = useState<boolean>(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [confettiParticles, setConfettiParticles] = useState<any[]>([]);

    //shipment
    const [showShipmentModal, setShowShipmentModal] = useState(false);
    const [shipmentDate, setShipmentDate] = useState("");
    const [shipmentProduct, setShipmentProduct] = useState("");
    const [shipmentQuantity, setShipmentQuantity] = useState("1");

    const [showShippingAnimation, setShowShippingAnimation] = useState(false);
    const [shippingMessage, setShippingMessage] = useState(false);

    const [showLogisticsPanel, setShowLogisticsPanel] = useState(false);
    const timeout1 = useRef<any>(null);
    const timeout2 = useRef<any>(null);
    const [activeShipments, setActiveShipments] = useState<any[]>([]);

    const getShipmentProgress = (shipment:any) => {

        if (!shipment.createdAt) return "0%";

        const start =
            shipment.createdAt.toDate().getTime();

        const end =
            new Date(shipment.deliveryDate).getTime();

        const now = Date.now();

        const total = end - start;

        if (total <= 0) return "100%";

        const elapsed = now - start;

        const percent =
            Math.min(
                100,
                Math.max(
                    0,
                    (elapsed / total) * 100
                )
            );

        return `${Math.round(percent)}%`;
    };
    const getDaysRemaining = (shipment:any) => {

        const end =
            new Date(shipment.deliveryDate).getTime();

        const diff =
            end - Date.now();

        const days =
            Math.ceil(
                diff / (1000*60*60*24)
            );

        return days <= 0
            ? "Delivered"
            : `${days} day(s) left`;
    };
    // Grab selected conversation data real-time to track custom blue state backgrounds
    const currentSelectedChat = useMemo(() => {
        return chats.find(c => c.id === selectedChatId) || null;
    }, [chats, selectedChatId]);

    // 1. Sort chats: Unread ones first safely
    const sortedChats = useMemo(() => {
        return [...chats].sort((a, b) => {
            if (a.viewedByManager !== b.viewedByManager) {
                return a.viewedByManager ? 1 : -1;
            }
            const timeA = a.updatedAt?.seconds || a.updatedAt?.toMillis?.() || 0;
            const timeB = b.updatedAt?.seconds || b.updatedAt?.toMillis?.() || 0;
            return timeB - timeA; 
        });
    }, [chats]);

    // 2. Real-time Listener for the Manager Chat List
    useEffect(() => {
        const validBrandId = typeof brandId === 'object' ? brandId?.id : brandId;
        if (!validBrandId) return;

        const conversationsRef = collection(firestore, "conversations");
        const q = query(
            conversationsRef,
            where("brandId", "==", String(validBrandId)),
            orderBy("updatedAt", "desc")
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const activeChats = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...(doc.data() as any),
                }));
                setChats(activeChats);
            },
            (error) => {
                if (error.message.includes("requires an index")) {
                    const fallbackQuery = query(conversationsRef, where("brandId", "==", String(validBrandId)));
                    getDocs(fallbackQuery).then(snap => {
                        const fallbackChats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                        setChats(fallbackChats);
                    }).catch(err => console.error("Fallback failed:", err));
                }
            }
        );

        return () => unsubscribe();
    }, [brandId]);

    // 3. Listener for Messages in Selected Chat
    useEffect(() => {
        if (!selectedChatId) return;

        const q = query(
            collection(firestore, "conversations", selectedChatId, "messages"),
            orderBy("timestamp")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...(doc.data() as any),
                }));
            setActiveMessages(msgs);
        });

        return () => unsubscribe();
    }, [selectedChatId]);

    // 4. Dynamic Real-time Listener for the Gold Admin Notification Badge
    useEffect(() => {
        const docRef = doc(firestore, "admin_support", adminChatRoomId);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setHasNewInternalMsg(docSnap.data().unread === true);
            }
        });
        return () => unsubscribe();
    }, []);

    // Sync button layout state based on if current chat row is blue
    useEffect(() => {
        if (currentSelectedChat) {
            setIsOrderActive(!!currentSelectedChat.isOrderBlue);
        } else {
            setIsOrderActive(false);
        }
    }, [selectedChatId, currentSelectedChat]);

    const handleSelectChat = async (chatId: string) => {
        setSelectedChatId(chatId);
        setIsInternalOpen(false); 
        try {
            const chatRef = doc(firestore, "conversations", chatId);
            await updateDoc(chatRef, { viewedByManager: true });
        } catch (e) {
            console.error("Error marking as read:", e);
        }
    };

   
    const confettiAnimation = `
    @keyframes confettiFly {
        0%{
            opacity:1;
            transform:translate(0,0) scale(1);
        }

        100%{
            opacity:0;
            transform:translate(var(--x),180px) rotate(720deg);
        }
    }
    @keyframes glassExit {
        to{
            opacity:0;
            transform:translate(-50%,-10px);
        }
    }
    `;
    const handleManagerSend = async (text: string) => {
        if (!text.trim() || !selectedChatId) return;
        try {
            await addDoc(collection(firestore, "conversations", selectedChatId, "messages"), {
                text: text,
                sender: 'manager',
                timestamp: serverTimestamp()
            });

            await setDoc(doc(firestore, "conversations", selectedChatId), {
                lastMessage: text,
                updatedAt: serverTimestamp(),
                viewedByManager: true 
            }, { merge: true });

            setInputValue('');
        } catch (e) {
            console.error("Error sending:", e);
        }
    };
    const launchConfetti = () => {
        const particles = Array.from({ length: 25 }, (_, i) => ({
            id: i,
            x: Math.random() * 300 - 150,
            y: Math.random() * 120,
            rotate: Math.random() * 720,
            size: Math.random() * 8 + 6
        }));
        
        setConfettiParticles(particles);

        setTimeout(() => {
            setConfettiParticles([]);
        }, 1800);
    };
    
    // Action Handlers for Custom Order Flow
    const handleOrderPlaced = async () => {
        if (!selectedChatId) return;
        const countToRegister = parseInt(orderInput) || 1;

        try {
            const chatRef = doc(firestore, "conversations", selectedChatId);
            await updateDoc(chatRef, {
                isOrderBlue: true,
                orderCount: increment(countToRegister),
                lastOrderAt: serverTimestamp(),
                orderStatus: "accepted"
            });

            // Fire Celebration Mechanics
            launchConfetti();
            const messages = [
                `${countToRegister} new order${countToRegister > 1 ? "s" : ""} successfully recorded. At this pace your business is gaining momentum.`,

                `${countToRegister} order${countToRegister > 1 ? "s" : ""} added to your growth pipeline. Keep pushing forward.`,

                `Another successful step. ${countToRegister} order${countToRegister > 1 ? "s" : ""} secured and tracked.`,

                `${countToRegister} order${countToRegister > 1 ? "s" : ""} registered. Your client activity is moving in the right direction.`
            ];

            setToastMessage(
                messages[Math.floor(Math.random() * messages.length)]
            );
            setIsOrderActive(true);

            setTimeout(() => setToastMessage(null), 5000);
        } catch (err) {
            console.error("Error tracking new order inside firebase: ", err);
        }
    };
    
    const handleSetShipment = async () => {

        if(!selectedChatId) return;

        const chatRef = doc(
            firestore,
            "conversations",
            selectedChatId
        );

        await updateDoc(chatRef,{
            shipmentStatus:"in_progress",
            shipmentCompleted:false
        });

        await addDoc(
            collection(
                firestore,
                "conversations",
                selectedChatId,
                "shipments"
            ),
            {
                product: shipmentProduct,
                quantity: Number(shipmentQuantity),
                deliveryDate: shipmentDate,
                createdAt: serverTimestamp(),
                completed:false
            }
        );

        setShowShipmentModal(false);
        setShipmentDate("");
        setShipmentProduct("");
        setShipmentQuantity("1");

        setShowShippingAnimation(true);

        setTimeout(()=>{
            setShowShippingAnimation(false);
            setShippingMessage(true);
        },3000);

        setTimeout(()=>{
            setShippingMessage(false);
        },6000);
    };

    const handleOrderSettled = async () => {
        if (!selectedChatId) return;

        try {
            const settledCount = Number(currentSelectedChat?.orderCount || 0);

            const chatRef = doc(firestore, "conversations", selectedChatId);

            const salesRef = doc(
                firestore,
                "brands",
                String(brandId),
                "stats",
                "sales"
            );

            // 1. Update chat FIRST (safe order)
            await updateDoc(chatRef, {
                orderCount: 0,
                isOrderBlue: false,
                orderStatus: "settled"
            });

            // 2. Update global stats ONCE
            await setDoc(
                salesRef,
                {
                    totalSettledOrders: increment(settledCount),
                    lastUpdated: serverTimestamp()
                },
                { merge: true }
            );

            setIsOrderActive(false);

        } catch (err) {
            console.error("Error settling orders:", err);
        }
    };


    const handleCancelOrder = async () => {
        if (!selectedChatId) return;
        try {
            const chatRef = doc(firestore, "conversations", selectedChatId);
            // Revert counts back or remove blue row indicators safely
            await updateDoc(chatRef, {
                isOrderBlue: false,
                orderCount: 0,
                lastOrderAt:null,
                orderStatus: "cancelled"
            });
            setIsOrderActive(false);
            setToastMessage("Orders cancelled successfully.");
            setTimeout(() => setToastMessage(null), 3000);
        } catch (err) {
            console.error("Error cancelling order system wide: ", err);
        }
    };
    useEffect(() => {
        return () => {
            clearTimeout(timeout1.current);
            clearTimeout(timeout2.current);
        };
    }, []);

    // 5. Auto-scroll to bottom
    useEffect(() => {
        const messageContainer = document.getElementById('message-feed');
        if (messageContainer) {
            messageContainer.scrollTop = messageContainer.scrollHeight;
        }
    }, [activeMessages]);
    useEffect(() => {
        const unsubscribers:any[] = [];

        chats.forEach(chat => {
            const q = collection(
                firestore,
                "conversations",
                chat.id,
                "shipments"
            );

            const unsub = onSnapshot(q, snap => {
                const shipments = snap.docs.map(doc => ({
                    id: doc.id,
                    chatId: chat.id,
                    ...doc.data()
                }));

                setActiveShipments(prev => {
                    const filtered =
                        prev.filter(
                            s => s.chatId !== chat.id
                        );

                    return [...filtered, ...shipments];
                });
            });

            unsubscribers.push(unsub);
        });

        return () => {
            unsubscribers.forEach(u => u());
        };
    }, [chats]);

    

    return (
        <>
            <style>{`
            @keyframes glassDrop {
                0%{
                    opacity:0;
                    transform:translate(-50%,-40px);
                }

                100%{
                    opacity:1;
                    transform:translate(-50%,0);
                }
            }
            @keyframes truckDrive {
                0% {
                    transform: translateX(-300px);
                }

                100% {
                    transform: translateX(100vw);
                }
            }
            `}</style>
            <style>{confettiAnimation}</style>
            {showOrderModal && (
                <div
                    style={{
                        position:'fixed',
                        inset:0,
                        background:'rgba(0,0,0,0.65)',
                        display:'flex',
                        alignItems:'center',
                        justifyContent:'center',
                        zIndex:99999
                    }}
                >
                    <div
                        style={{
                            background:'#121214',
                            border:'1px solid #262626',
                            borderRadius:'18px',
                            padding:'24px',
                            width:'320px'
                        }}
                    >
                        <h3 style={{
                            marginTop:0,
                            color:'#fff'
                        }}>
                            Record New Order
                        </h3>

                        <p style={{
                            color:'#9ca3af',
                            fontSize:'13px'
                        }}>
                            How many orders were placed?
                        </p>

                        <input
                            type="number"
                            min="1"
                            value={orderInput}
                            onChange={(e)=>setOrderInput(e.target.value)}
                            style={{
                                width:'100%',
                                padding:'12px',
                                background:'#000',
                                color:'#fff',
                                border:'1px solid #262626',
                                borderRadius:'10px',
                                marginBottom:'16px'
                            }}
                        />

                        <div style={{
                            display:'flex',
                            gap:'10px'
                        }}>
                            <button
                                onClick={() => setShowOrderModal(false)}
                                style={{
                                    flex:1,
                                    background:'#262626',
                                    color:'#fff',
                                    border:'none',
                                    padding:'10px',
                                    borderRadius:'10px'
                                }}
                            >
                                Cancel
                            </button>

                            <button
                                onClick={() => {
                                    setShowOrderModal(false);
                                    handleOrderPlaced();
                                }}
                                style={{
                                    flex:1,
                                    background:'#007aff',
                                    color:'#fff',
                                    border:'none',
                                    padding:'10px',
                                    borderRadius:'10px'
                                }}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <div style={{ 
                width: '100%', 
                height: 'calc(100vh - 80px)', 
                background: '#000000',
                color: '#fff',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                boxSizing: 'border-box',
                overflow: 'hidden',
                position: 'relative'
            }}>
                
                {/* Custom Interactive Celebration Popup Overlay */}
                {toastMessage && (
                    <div
                        style={{
                            position: "fixed",
                            top: "30px",
                            left: "50%",
                            transform: "translateX(-50%)",
                            width: "420px",
                            maxWidth: "90vw",
                            zIndex: 99999,

                            background: "rgba(15,15,20,0.75)",
                            backdropFilter: "blur(18px)",
                            WebkitBackdropFilter: "blur(18px)",

                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: "20px",

                            padding: "18px",

                            boxShadow:
                                "0 10px 40px rgba(0,0,0,0.45), 0 0 30px rgba(0,122,255,0.15)",

                            animation: "glassDrop 0.45s cubic-bezier(.22,1,.36,1), glassExit 0.35s ease forwards 4.6s"
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "14px"
                            }}
                        >
                            <div
                                style={{
                                    width: "52px",
                                    height: "52px",
                                    borderRadius: "16px",
                                    background:
                                        "linear-gradient(135deg,#007aff,#4da3ff)",

                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",

                                    fontSize: "24px",

                                    boxShadow:
                                        "0 0 25px rgba(0,122,255,0.35)"
                                }}
                            >
                                📦
                            </div>

                            <div style={{ flex: 1 }}>
                                <div
                                    style={{
                                        color: "#fff",
                                        fontWeight: 700,
                                        fontSize: "15px",
                                        marginBottom: "4px"
                                    }}
                                >
                                    Client Order Added
                                </div>

                                <div
                                    style={{
                                        color: "rgba(255,255,255,0.75)",
                                        fontSize: "13px",
                                        lineHeight: "1.5"
                                    }}
                                >
                                    {toastMessage}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: '350px 1fr', 
                    height: '100%',
                    width: '100%',
                    boxSizing: 'border-box'
                }}>
                    
                    {/* LEFT: CHAT LIST (Sidebar) */}
                    <ChatCard style={{ background: '#000000' }}>
                        <div style={{ 
                            padding: '0 24px', 
                            borderBottom: '1px solid #1c1c1e', 
                            fontWeight: 700, 
                            fontSize: '20px',
                            letterSpacing: '-0.5px',
                            background: '#000000',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between', 
                            height: '75px',
                            boxSizing: 'border-box',
                            flexShrink: 0
                        }}>
                            <span>Messages</span>

                            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                                <div
                                    onClick={() => setShowLogisticsPanel(!showLogisticsPanel)}
                                    style={{
                                        cursor: "pointer",
                                        color: showLogisticsPanel ? "#4ade80" : "rgba(255, 255, 255, 0.4)",
                                        transition: "all 0.3s ease",
                                        filter: showLogisticsPanel ? "drop-shadow(0 0 8px rgba(74, 222, 128, 0.4))" : "none",
                                        display: "flex",
                                        alignItems: "center"
                                    }}
                                >🚚
                                    {activeShipments.length > 0 && (
                                        <span
                                            style={{
                                                marginLeft:"6px",
                                                display:"flex",
                                                alignItems:"center",
                                                justifyContent:"center",
                                                minWidth:"18px",
                                                height:"18px",
                                                marginLeft: "4px",
                                                background: "#22c55e",
                                                borderRadius: "999px",
                                                padding: "2px 6px",
                                                fontSize: "10px"
                                            }}
                                        >
                                            {activeShipments.length}
                                        </span>
                                    )}
                                </div>
                                {showLogisticsPanel && (
                                    <div
                                        style={{
                                            position: "fixed",
                                            top: "90px",
                                            left: "370px",

                                          width: "380px",
                                            maxWidth: "calc(100vw - 420px)",

                                            background: "#121214",
                                            border: "1px solid #262626",
                                            borderRadius: "16px",
                                            padding: "16px",

                                            maxHeight: "400px",
                                            overflowY: "auto",

                                            zIndex: 9999,
                                            boxShadow: "0 20px 50px rgba(0,0,0,.45)"
                                        }}
                                    >
                                        <h4 style={{
                                            display:"flex",
                                            justifyContent:"space-between",
                                            alignItems:"center",
                                            marginTop:0
                                        }}>
                                            <span>🚚 Active Shipments</span>

                                            <span
                                                style={{
                                                    fontSize:"11px",
                                                    background:"#22c55e",
                                                    padding:"4px 8px",
                                                    borderRadius:"999px"
                                                }}
                                            >
                                                {activeShipments.length}
                                            </span>
                                        </h4>

                                        {activeShipments.length === 0 ? (
                                            <div style={{ color: "#888" }}>
                                                No active shipments
                                            </div>
                                        ) : (
                                            activeShipments.map((shipment) => (
                                                
                                                <div
                                                    key={shipment.id}
                                                    style={{
                                                        background:"#18181b",
                                                        border:"1px solid #262626",
                                                        borderRadius:"12px",
                                                        padding:"12px",
                                                        marginBottom:"12px"
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            fontSize:"11px",
                                                            color:"#6b7280",
                                                            marginBottom:"6px"
                                                        }}
                                                    >
                                                        Client #{sortedChats.findIndex(c => c.id === shipment.id) + 1}
                                                    </div>
                                                    <div
                                                        style={{
                                                            fontWeight:600,
                                                            color:"#fff",
                                                            marginBottom:"8px"
                                                        }}
                                                    >
                                                        📦 {shipment.shipmentProduct}
                                                    </div>

                                                    <div
                                                        style={{
                                                            fontSize:"13px",
                                                            color:"#9ca3af",
                                                            display:"flex",
                                                            justifyContent:"space-between"
                                                        }}
                                                    >
                                                        <span>Qty: {shipment.shipmentQuantity}</span>
                                                        <span>ETA: {shipment.shipmentDate}</span>
                                                    </div>
                                                    <div style={{ marginTop:"12px" }}>
                                                        <div
                                                            style={{
                                                                display:"flex",
                                                                justifyContent:"space-between",
                                                                marginBottom:"6px",
                                                                fontSize:"11px",
                                                                color:"#888"
                                                            }}
                                                        >
                                                            <span>Status</span>
                                                            <span>{getShipmentProgress(shipment)}</span>
                                                            <span> {getDaysRemaining(shipment)}</span>
                                                        </div>

                                                        <div
                                                            style={{
                                                                width:"100%",
                                                                height:"8px",
                                                                background:"#222",
                                                                borderRadius:"999px",
                                                                overflow:"hidden"
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    width:getShipmentProgress(shipment),
                                                                    height:"100%",
                                                                    background:"#22c55e"
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                )}
                                
                                <div
                                    onClick={() => setShowTrustMsg(!showTrustMsg)}
                                    style={{
                                        cursor: "pointer",
                                        color: showTrustMsg ? "#4ade80" : "rgba(255, 255, 255, 0.4)",
                                        transition: "all 0.3s ease",
                                        filter: showTrustMsg ? "drop-shadow(0 0 8px rgba(74, 222, 128, 0.4))" : "none",
                                        display: "flex",
                                        alignItems: "center"
                                    }}
                                >
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                        <path d="m9 12 2 2 4-4" />
                                    </svg>
                                </div>

                                {showTrustMsg && (
                                    <div style={{
                                        position: "absolute",
                                        top: "40px",
                                        right: "0",
                                        width: "280px",
                                        backgroundColor: "rgba(15, 15, 20, 0.95)",
                                        backdropFilter: "blur(15px)",
                                        border: "1px solid rgba(255, 255, 255, 0.1)",
                                        borderRadius: "16px",
                                        padding: "20px",
                                        zIndex: 101,
                                        animation: "fadeIn 0.2s ease-out"
                                    }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                                            <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#4ade80" }}></div>
                                            <span style={{ color: "white", fontWeight: "bold", fontSize: "13px" }}>Secure Session</span>
                                        </div>
                                        <p style={{ margin: "0 0 12px 0", fontSize: "12px", color: "rgba(255,255,255,0.7)", lineHeight: "1.6", fontWeight: "normal" }}>
                                            All conversations are end-to-end encrypted. No Malvin personnel will ever ask for your login info.
                                        </p>
                                        <div style={{ height: "1px", backgroundColor: "rgba(255,255,255,0.1)", marginBottom: "12px" }}></div>
                                        <p style={{ margin: 0, fontSize: "11px", color: "rgba(255,255,255,0.5)", fontWeight: "normal" }}>
                                            Support: <a href="mailto:malvinsupportteam@gmail.com" style={{ color: "#bf00ff", textDecoration: "none", marginLeft: "5px", fontWeight: "bold", transition: "opacity 0.2s" }} onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.7")} onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}>malvinsupportteam@gmail.com</a>
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
                            {sortedChats.map((chat, index) => {
                                const isUnread = chat.viewedByManager === false;
                                const isSelected = selectedChatId === chat.id;
                                const isUnfinished = !!chat.hasUnfinishedBusiness; 
                                const isBlueTheme = !!chat.isOrderBlue;
                                const clientDisplayNum = sortedChats.length - index;

                                // Turn layout rows blue if an active order session exists
                                let rowBackground = 'transparent';
                                let rowBoxShadow = 'none';

                                if (isSelected) {
                                    rowBackground = '#121212';
                                }
                                else if (isBlueTheme) {
                                    rowBackground = 'rgba(0,122,255,0.25)';
                                    rowBoxShadow = 'inset 0 0 15px rgba(0,122,255,0.25)';
                                }
                                else if (isUnfinished) {
                                    rowBackground = 'rgba(255,255,255,0.05)';
                                }
                               

                                return (
                                    <div 
                                        key={chat.id}
                                        onClick={() => handleSelectChat(chat.id)}
                                        style={{
                                            padding: '14px 24px',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '16px',
                                            backgroundColor: rowBackground,
                                            boxShadow: rowBoxShadow,
                                            borderLeft: isBlueTheme ? '4px solid #007aff' : isUnfinished ? '4px solid #ffffff' : '4px solid transparent', 
                                            transition: 'background 0.2s ease, border 0.2s ease'
                                        }}
                                        onMouseEnter={(e) => !isSelected && (e.currentTarget.style.backgroundColor = isBlueTheme ? 'rgba(0, 122, 255, 0.35)' : '#0a0a0a')}
                                        onMouseLeave={(e) => !isSelected && (e.currentTarget.style.backgroundColor = rowBackground)}
                                    >
                                        <div style={{ 
                                            width: '56px', height: '56px', borderRadius: '50%', 
                                            display: 'flex', alignItems: 'center', 
                                            justifyContent: 'center', color: isUnread ? '#000' : '#fff', 
                                            fontWeight: '600', fontSize: '16px',
                                            background: isUnread ? 'linear-gradient(45deg, #2bb35c, #38d777)' : '#262626', 
                                            flexShrink: 0,
                                            border: isSelected ? '2px solid #38d777' : isBlueTheme ? '2px solid #007aff' : 'none',
                                            boxSizing: 'border-box'
                                        }}>
                                            {clientDisplayNum}
                                        </div>
                                        
                                        <div style={{ flex: 1, overflow: 'hidden' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                                                <div style={{ fontSize: '14px', fontWeight: (isUnread || isUnfinished || isBlueTheme) ? 700 : 400, color: '#fff' }}>
                                                    Client #{clientDisplayNum} {isBlueTheme ? '📦' : isUnfinished ? '💼' : ''}
                                                    {chat.shipmentStatus === "in_progress" && (
                                                        <span style={{ background:"rgba(34,197,94,.15)", color:"#22c55e", border:"1px solid rgba(34,197,94,.3)", padding:"2px 8px", borderRadius:"999px", fontSize:"10px", fontWeight:600, marginLeft:"6px"}}> 🚚 Shipping</span>
                                                    )}
                                                    {chat.orderCount > 0 && (
                                                        <span style={{ fontSize: '11px', background: '#007aff', padding: '2px 6px', borderRadius: '10px', marginLeft: '6px' }}>
                                                            {chat.orderCount} orders
                                                        </span>
                                                    )}
                                                </div>
                                                {isUnread && (
                                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#38d777' }} />
                                                )}
                                            </div>
                                            <div style={{ 
                                                fontSize: '13px', 
                                                color: isUnread ? '#fff' : '#a8a8a8', 
                                                fontWeight: isUnread ? 600 : 400,
                                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' 
                                            }}>
                                                {chat.lastMessage || "No messages yet"}
                                            </div>
                                        </div>

                                    
                                    </div>
                                );
                            })}
                        </div>
                    </ChatCard>

                    {/* RIGHT: MESSAGE FEED (Main View) */}
                    <ChatCard style={{ background: '#000000', border: 'none' }}>
                        { selectedChatId ? (
                            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box' }}>
                                {/* Chat Header */}
                                <div style={{ 
                                    padding: '0 24px', 
                                    borderBottom: '1px solid #1c1c1e', 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center', 
                                    background: '#000000',
                                    height: '75px',
                                    boxSizing: 'border-box',
                                    flexShrink: 0,
                                    position: 'relative'
                                }}>
                                    
                                    {/* Confetti Effect Streamers */}
                                    {confettiParticles.map((particle) => (
                                        <div
                                            key={particle.id}
                                            
                                            style={{
                                                "--x": `${particle.x}px`,
                                                "--y": `${particle.y}px`,
                                                position:'absolute',
                                                right:'100px',
                                                top:'60px',
                                                width:particle.size,
                                                height:particle.size,
                                                background:[
                                                    '#007aff',
                                                    '#38d777',
                                                    '#ffd60a',
                                                    '#ff375f',
                                                    '#bf5af2'
                                                ][particle.id % 5],
                                                borderRadius:'50%',
                                                pointerEvents:'none',
                                                animation:'confettiFly 1.5s ease-out forwards'
                                            } as React.CSSProperties}
                                        />
                                    ))}

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#262626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>
                                            C
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: 600, color: '#fff', fontSize: '15px' }}>Client Window</div>
                                            <div style={{ fontSize: '11px', color: currentSelectedChat?.isOrderBlue ? '#007aff' : '#a8a8a8', fontWeight: 500, letterSpacing: '0.5px', marginTop: '2px' }}>
                                                {currentSelectedChat?.isOrderBlue ? '📦 ORDER IN PROGRESS' : '○ DISPATCH STANDBY'}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Custom Firebase Order Flow Control Box */}
                                    <div style={{ display:'flex', alignItems:'center', gap:'10px', flexWrap:'wrap', justifyContent:'flex-end'}}>
                                        {!isOrderActive ? (
                                            <button
                                                onClick={() => {
                                                    setOrderInput("1");
                                                    setShowOrderModal(true);
                                                }}
                                                style={{
                                                    background: '#007aff',
                                                    color: '#fff',
                                                    border: 'none',
                                                    padding: '10px 18px',
                                                    borderRadius: '12px',
                                                    cursor: 'pointer',
                                                    fontWeight: 700,
                                                    fontSize: '13px'
                                                }}
                                            >
                                                📦 Order Placed
                                            </button>
                                        ) : (
                                            <div style={{
                                                display:"flex",
                                                flexWrap:"wrap",
                                                gap:"8px",
                                                justifyContent:"flex-end"
                                            }}>
                                                <button
                                                    onClick={() => {
                                                        setOrderInput("1");
                                                        setShowOrderModal(true);
                                                    }}
                                                    style={{
                                                        background:'#38d777',
                                                        color:'#fff',
                                                        border:'none',
                                                        borderRadius:'999px',
                                                        padding:'8px 14px',
                                                        fontWeight:600,
                                                        cursor:'pointer'
                                                    }}
                                                >
                                                    + Add Orders
                                                </button>

                                                <button
                                                    onClick={handleOrderSettled}
                                                    style={{
                                                        background:'#007aff',
                                                        color:'#fff',
                                                        border:'none',
                                                        borderRadius:'999px',
                                                        padding:'8px 14px',
                                                        fontWeight:600,
                                                        cursor:'pointer'
                                                    }}
                                                >
                                                    ✓ Settled
                                                </button>

                                                <button
                                                    onClick={handleCancelOrder}
                                                    style={{
                                                        background:'#ff3b30',
                                                        color:'#fff',
                                                        border:'none',
                                                        borderRadius:'999px',
                                                        padding:'8px 14px',
                                                        fontWeight:600,
                                                        cursor:'pointer'
                                                    }}
                                                >
                                                    ✕ Cancel
                                                </button>
                                            </div>
                                        )}
                                        {isOrderActive && (
                                            <button
                                                onClick={() => setShowShipmentModal(true)}
                                                style={{
                                                    background:'#ff9500',
                                                    color:'#fff',
                                                    border:'none',
                                                    padding:'10px 18px',
                                                    borderRadius:'12px',
                                                    cursor:'pointer',
                                                    fontWeight:700
                                                }}
                                            >
                                                🚚 Set Shipment
                                            </button>
                                        )}
                                        {showShipmentModal && (
                                            <div
                                                style={{
                                                    position: "fixed",
                                                    inset: 0,
                                                    background: "rgba(0,0,0,.65)",
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent: "center",
                                                    zIndex: 999999
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        background: "#121214",
                                                        padding: "24px",
                                                        borderRadius: "18px",
                                                        width: "350px",
                                                        border: "1px solid #262626"
                                                    }}
                                                >
                                                    <h3 style={{marginTop:0}}>Schedule Shipment</h3>

                                                    <input
                                                        placeholder="Product Name"
                                                        value={shipmentProduct}
                                                        onChange={(e)=>setShipmentProduct(e.target.value)}
                                                        style={{
                                                            width:"100%",
                                                            padding:"12px",
                                                            boxSizing:"border-box",
                                                            background:"#0a0a0a",
                                                            marginBottom:"10px",
                                                            border:"1px solid #262626",
                                                            borderRadius:"10px",
                                                            color:"#fff"
                                                        }}
                                                    />

                                                    <input
                                                        type="number"
                                                        placeholder="Quantity"
                                                        value={shipmentQuantity}
                                                        onChange={(e)=>setShipmentQuantity(e.target.value)}
                                                        style={{
                                                            width:"100%",
                                                            padding:"12px",
                                                            boxSizing:"border-box",
                                                            background:"#0a0a0a",
                                                            marginBottom:"10px",
                                                            border:"1px solid #262626",
                                                            borderRadius:"10px",
                                                            color:"#fff"
                                                        }}
                                                    />

                                                    <input
                                                        type="date"
                                                        value={shipmentDate}
                                                        onChange={(e)=>setShipmentDate(e.target.value)}
                                                        style={{
                                                            width:"100%",
                                                            padding:"12px",
                                                            marginBottom:"10px",
                                                            boxSizing:"border-box",
                                                            background:"#0a0a0a",
                                                            border:"1px solid #262626",
                                                            borderRadius:"10px",
                                                            color:"#fff"
                                                        }}
                                                    />

                                                    <div style={{
                                                        display:"flex",
                                                        gap:"10px"
                                                    }}>
                                                        <button
                                                            onClick={() => setShowShipmentModal(false)}
                                                            style={{
                                                                flex:1
                                                            }}
                                                        >
                                                            Cancel
                                                        </button>

                                                        <button
                                                            onClick={handleSetShipment}
                                                            style={{
                                                                flex:1
                                                            }}
                                                        >
                                                            Set Shipment
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                        {showShippingAnimation && (
                                            <div
                                                style={{
                                                    position:'fixed',
                                                    inset:0,
                                                    background:'rgba(0,0,0,.8)',
                                                    zIndex:999999
                                                }}
                                            >

                                                <div
                                                    style={{
                                                        fontSize:'70px',
                                                        position:'absolute',
                                                        top:'50%',
                                                        left:'0',
                                                        animation:'truckDrive 3s linear forwards'
                                                    }}
                                                >
                                                    🚚
                                                </div>

                                            </div>
                                        )}
                                        {shippingMessage && (
                                            <div
                                                style={{
                                                    position: "fixed",
                                                    top: "20px",
                                                    left: "50%",
                                                    transform: "translateX(-50%)",
                                                    background: "#22c55e",
                                                    color: "#fff",
                                                    padding: "12px 20px",
                                                    borderRadius: "12px",
                                                    zIndex: 999999
                                                }}
                                            >
                                                🚚 Shipping In Progress
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Message Bubble Space */}
                                <div 
                                    id="message-feed" 
                                    style={{ 
                                        flex: 1, 
                                        padding: '24px 30px', 
                                        overflowY: 'auto', 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        gap: '12px',
                                        backgroundColor: '#000000',
                                        maxHeight: 'calc(100% - 150px)', 
                                        boxSizing: 'border-box'
                                    }}
                                >
                                    {activeMessages.map((msg) => {
                                        const isManager = msg.sender === 'manager';
                                        return (
                                            <div key={msg.id} style={{ 
                                                alignSelf: isManager ? 'flex-end' : 'flex-start', 
                                                background: isManager ? '#007aff' : '#262626', 
                                                color: '#fff',
                                                padding: '10px 16px', 
                                                borderRadius: '20px', 
                                                maxWidth: '60%', 
                                                fontSize: '14px',
                                                lineHeight: '1.4',
                                                wordBreak: 'break-word',
                                                boxSizing: 'border-box'
                                            }}>
                                                {msg.text}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Footer Input Strip */}
                                <div style={{ 
                                    padding: '16px 24px', 
                                    display: 'flex', 
                                    background: '#000000', 
                                    alignItems: 'center',
                                    boxSizing: 'border-box',
                                    flexShrink: 0
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        flex: 1,
                                        alignItems: 'center',
                                        background: '#000000',
                                        border: '1px solid #262626',
                                        borderRadius: '24px',
                                        padding: '4px 6px 4px 18px',
                                        boxSizing: 'border-box'
                                    }}>
                                        <input 
                                            value={inputValue} 
                                            onChange={(e) => setInputValue(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleManagerSend(inputValue)}
                                            placeholder="Message..."
                                            style={{ 
                                                flex: 1, 
                                                background: 'transparent', 
                                                border: 'none', 
                                                color: '#fff', 
                                                padding: '10px 0', 
                                                fontSize: '14px',
                                                outline: 'none'
                                            }}
                                        />
                                        <button 
                                            onClick={() => handleManagerSend(inputValue)} 
                                            disabled={!inputValue.trim()}
                                            style={{ 
                                                background: 'transparent', 
                                                color: inputValue.trim() ? '#007aff' : '#00264d',
                                                padding: '0 12px', 
                                                fontWeight: 700, 
                                                fontSize: '14px',
                                                border: 'none', 
                                                cursor: inputValue.trim() ? 'pointer' : 'default',
                                                transition: 'color 0.2s ease'
                                            }}
                                        >
                                            Send
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div style={{ margin: 'auto', textAlign: 'center' }}>
                                <div style={{ 
                                    fontSize: '80px', 
                                    marginBottom: '16px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '120px',
                                    height: '120px',
                                    borderRadius: '50%',
                                    border: '2px solid #fff'
                                }}>✉️</div>
                                <h3 style={{ fontWeight: 400, color: '#fff', fontSize: '22px', margin: '10px 0 5px 0' }}>Your Messages</h3>
                                <p style={{ fontSize: '14px', color: '#737373', maxWidth: '300px', margin: '0 auto' }}>Select a conversation from the sidebar to view details and autopilot controls.</p>
                            </div>
                        )}
                    </ChatCard>
                </div>
            </div>
        </>
    );
};

export default Chats;