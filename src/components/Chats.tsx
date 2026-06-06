import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, doc, setDoc, updateDoc, getDocs } from "firebase/firestore";
import { firestore, auth } from "../firebase";

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
    const [isOrderActive, setIsOrderActive] = useState<boolean>(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    const [confettiBurst, setConfettiBurst] = useState<boolean>(false);

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

    const handleToggleUnfinished = async (e: React.MouseEvent, chatId: string, currentStatus: boolean) => {
        e.stopPropagation(); 
        try {
            const chatRef = doc(firestore, "conversations", chatId);
            await updateDoc(chatRef, { hasUnfinishedBusiness: !currentStatus });
        } catch (error) {
            console.error("Error toggling business status: ", error);
        }
    };

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

    // Action Handlers for Custom Order Flow
    const handleOrderPlaced = async () => {
        if (!selectedChatId) return;
        const countToRegister = parseInt(orderInput) || 1;
        const currentCount = currentSelectedChat?.orderCount || 0;
        const newTotalCount = currentCount + countToRegister;

        try {
            const chatRef = doc(firestore, "conversations", selectedChatId);
            await updateDoc(chatRef, {
                isOrderBlue: true,
                orderCount: newTotalCount
            });

            // Fire Celebration Mechanics
            setConfettiBurst(true);
            setToastMessage(`${countToRegister} order${countToRegister > 1 ? 's' : ''} successfully placed! At this rate, you will be earning much income in no time.`);
            setIsOrderActive(true);

            setTimeout(() => setConfettiBurst(false), 2500);
            setTimeout(() => setToastMessage(null), 5000);
        } catch (err) {
            console.error("Error tracking new order inside firebase: ", err);
        }
    };

    const handleOrderSettled = async () => {
        if (!selectedChatId) return;
        try {
            const chatRef = doc(firestore, "conversations", selectedChatId);
            await updateDoc(chatRef, {
                isOrderBlue: false
            });
            setIsOrderActive(false);
        } catch (err) {
            console.error("Error settling orders: ", err);
        }
    };

    const handleCancelOrder = async () => {
        if (!selectedChatId) return;
        try {
            const chatRef = doc(firestore, "conversations", selectedChatId);
            // Revert counts back or remove blue row indicators safely
            await updateDoc(chatRef, {
                isOrderBlue: false,
                orderCount: 0
            });
            setIsOrderActive(false);
            setToastMessage("Orders cancelled successfully.");
            setTimeout(() => setToastMessage(null), 3000);
        } catch (err) {
            console.error("Error cancelling order system wide: ", err);
        }
    };

    // 5. Auto-scroll to bottom
    useEffect(() => {
        const messageContainer = document.getElementById('message-feed');
        if (messageContainer) {
            messageContainer.scrollTop = messageContainer.scrollHeight;
        }
    }, [activeMessages]);

    return (
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
                <div style={{
                    position: 'fixed',
                    top: '100px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#121214',
                    border: '1px solid #007aff',
                    borderRadius: '14px',
                    padding: '16px 24px',
                    color: '#fff',
                    zIndex: 99999,
                    boxShadow: '0px 8px 32px rgba(0, 122, 255, 0.3)',
                    fontSize: '14px',
                    fontWeight: 500,
                    maxWidth: '420px',
                    textAlign: 'center',
                    animation: 'fadeIn 0.3s ease'
                }}>
                    🎉 {toastMessage}
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
                            if (isSelected) {
                                rowBackground = '#121212';
                            } else if (isBlueTheme) {
                                rowBackground = 'rgba(0, 122, 255, 0.25)'; 
                            } else if (isUnfinished) {
                                rowBackground = 'rgba(255, 255, 255, 0.05)'; 
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

                                    <div 
                                        onClick={(e) => handleToggleUnfinished(e, chat.id, isUnfinished)}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '4px' }}
                                        title={isUnfinished ? "Mark as Finished" : "Mark as Unfinished Business"}
                                    >
                                        <div style={{
                                            width: '34px',
                                            height: '20px',
                                            backgroundColor: isUnfinished ? '#ffffff' : '#333333',
                                            borderRadius: '10px',
                                            position: 'relative',
                                            transition: 'background-color 0.2s',
                                            cursor: 'pointer'
                                        }}>
                                            <div style={{
                                                width: '16px',
                                                height: '16px',
                                                backgroundColor: isUnfinished ? '#000000' : '#ffffff',
                                                borderRadius: '50%',
                                                position: 'absolute',
                                                top: '2px',
                                                left: isUnfinished ? '16px' : '2px',
                                                transition: 'left 0.2s'
                                            }} />
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
                                {confettiBurst && (
                                    <div style={{ position: 'absolute', top: '100%', right: '40px', pointerEvents: 'none', zIndex: 99 }}>
                                        <span style={{ position: 'absolute', display: 'block', width: '8px', height: '8px', background: '#ff0', borderRadius: '50%', animation: 'ping 1s infinite' }}></span>
                                        <span style={{ position: 'absolute', left: '20px', display: 'block', width: '6px', height: '12px', background: '#f0f', transform: 'rotate(45deg)' }}></span>
                                        <span style={{ position: 'absolute', right: '30px', display: 'block', width: '10px', height: '5px', background: '#0ff' }}></span>
                                    </div>
                                )}

                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#262626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>
                                        C
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, color: '#fff', fontSize: '15px' }}>Client Window</div>
                                        <div style={{ fontSize: '11px', color: currentSelectedChat?.isOrderBlue ? '#007aff' : '#a8a8a8', fontWeight: 500, letterSpacing: '0.5px', marginTop: '2px' }}>
                                            {currentSelectedChat?.isOrderBlue ? '● ACTIVE ORDER FOCUS' : '○ DISPATCH STANDBY'}
                                        </div>
                                    </div>
                                </div>

                                {/* Custom Firebase Order Flow Control Box */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    {!isOrderActive ? (
                                        <>
                                            <input 
                                                type="number"
                                                value={orderInput}
                                                onChange={(e) => setOrderInput(e.target.value)}
                                                min="1"
                                                style={{
                                                    width: '50px',
                                                    background: '#121214',
                                                    border: '1px solid #262626',
                                                    borderRadius: '6px',
                                                    color: '#fff',
                                                    padding: '6px',
                                                    fontSize: '13px',
                                                    textAlign: 'center',
                                                    outline: 'none'
                                                }}
                                            />
                                            <button 
                                                onClick={handleOrderPlaced}
                                                style={{ 
                                                    background: '#007aff',
                                                    color: '#fff',
                                                    border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
                                                    transition: 'background 0.2s'
                                                }}
                                            >
                                                Order Placed
                                            </button>
                                        </>
                                    ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <button 
                                                onClick={() => setIsOrderActive(false)}
                                                title="Place More Orders"
                                                style={{
                                                    width: '32px', height: '32px', borderRadius: '50%', background: '#38d777', color: '#fff', border: 'none',
                                                    cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}
                                            >
                                                +
                                            </button>
                                            <button 
                                                onClick={handleOrderSettled}
                                                title="Order Settled"
                                                style={{
                                                    width: '32px', height: '32px', borderRadius: '50%', background: '#007aff', color: '#fff', border: 'none',
                                                    cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}
                                            >
                                                ✓
                                            </button>
                                            <button 
                                                onClick={handleCancelOrder}
                                                title="Cancel Order"
                                                style={{
                                                    width: '32px', height: '32px', borderRadius: '50%', background: '#ff3b30', color: '#fff', border: 'none',
                                                    cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}
                                            >
                                                ✕
                                            </button>
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
    );
};

export default Chats;