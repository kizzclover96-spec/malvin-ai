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
    const [isAutopilot, setIsAutopilot] = useState(true);
    const [activeMessages, setActiveMessages] = useState<any[]>([]);
    const [chats, setChats] = useState<any[]>([]); 
    const [inputValue, setInputValue] = useState('');
    const [isInternalOpen, setIsInternalOpen] = useState(false);
    const [hasNewInternalMsg, setHasNewInternalMsg] = useState(false);
    const [showTrustMsg, setShowTrustMsg] = useState(false); // Added State for Shield Menu
    const adminChatRoomId = "global_system_coordination"; 

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

    // 2. Listen for AI Actions
    useEffect(() => {
        const handleAiAction = (action: any) => {
            const messageText = action.text || action.args?.message;
            const incomingChatId = action.chatId || action.args?.chatId;

            if (isAutopilot && selectedChatId && incomingChatId === selectedChatId) {
                console.log("🤖 Malvin Auto-Reply:", messageText);
                handleManagerSend(messageText); 
            }
        };
        return () => {};
    }, [isAutopilot, selectedChatId]); 

    // 3. Real-time Listener for the Manager Chat List
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

    // 4. Listener for Messages in Selected Chat
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

    // 5. Dynamic Real-time Listener for the Gold Admin Notification Badge
    useEffect(() => {
        const docRef = doc(firestore, "admin_support", adminChatRoomId);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                setHasNewInternalMsg(docSnap.data().unread === true);
            }
        });
        return () => unsubscribe();
    }, []);

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

    // New Function: Handles flipping the "unfinished business" state in Firestore
    const handleToggleUnfinished = async (e: React.MouseEvent, chatId: string, currentStatus: boolean) => {
        e.stopPropagation(); // Prevents clicking the toggle from activating/selecting the whole chat box
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

    // 7. Auto-scroll to bottom
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
            overflow: 'hidden'
        }}>
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
                        justifyContent: 'space-between', // Pushes shield item to the right side of header
                        height: '75px',
                        boxSizing: 'border-box',
                        flexShrink: 0
                    }}>
                        <span>Messages</span>

                        {/* Your Secure Session Shield Element */}
                        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                            <div
                                onClick={() => setShowTrustMsg(!showTrustMsg)}
                                style={{
                                    cursor: "pointer",
                                    color: showTrustMsg
                                        ? "#4ade80"
                                        : "rgba(255, 255, 255, 0.4)",
                                    transition: "all 0.3s ease",
                                    filter: showTrustMsg
                                        ? "drop-shadow(0 0 8px rgba(74, 222, 128, 0.4))"
                                        : "none",
                                    display: "flex",
                                    alignItems: "center"
                                }}
                            >
                                <svg
                                    width="22"
                                    height="22"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                                    <path d="m9 12 2 2 4-4" />
                                </svg>
                            </div>

                            {showTrustMsg && (
                                <div
                                    style={{
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
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            marginBottom: "10px"
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: "8px",
                                                height: "8px",
                                                borderRadius: "50%",
                                                backgroundColor: "#4ade80"
                                            }}
                                        ></div>

                                        <span
                                            style={{
                                                color: "white",
                                                fontWeight: "bold",
                                                fontSize: "13px"
                                            }}
                                        >
                                            Secure Session
                                        </span>
                                    </div>

                                    <p
                                        style={{
                                            margin: "0 0 12px 0",
                                            fontSize: "12px",
                                            color: "rgba(255,255,255,0.7)",
                                            lineHeight: "1.6",
                                            fontWeight: "normal"
                                        }}
                                    >
                                        All conversations are end-to-end encrypted.
                                        No Malvin personnel will ever ask for your
                                        login info.
                                    </p>

                                    <div
                                        style={{
                                            height: "1px",
                                            backgroundColor: "rgba(255,255,255,0.1)",
                                            marginBottom: "12px"
                                        }}
                                    ></div>

                                    <p
                                        style={{
                                            margin: 0,
                                            fontSize: "11px",
                                            color: "rgba(255,255,255,0.5)",
                                            fontWeight: "normal"
                                        }}
                                    >
                                        Support:
                                        <a
                                            href="mailto:malvinsupportteam@gmail.com"
                                            style={{
                                                color: "#bf00ff",
                                                textDecoration: "none",
                                                marginLeft: "5px",
                                                fontWeight: "bold",
                                                transition: "opacity 0.2s"
                                            }}
                                            onMouseEnter={(e) =>
                                                (e.currentTarget.style.opacity = "0.7")
                                            }
                                            onMouseLeave={(e) =>
                                                (e.currentTarget.style.opacity = "1")
                                            }
                                        >
                                            malvinsupportteam@gmail.com
                                        </a>
                                    </p>
                                </div>
                            )}
                        </div>

                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
                        {sortedChats.map((chat, index) => {
                            const isUnread = chat.viewedByManager === false;
                            const isSelected = selectedChatId === chat.id;
                            const isUnfinished = !!chat.hasUnfinishedBusiness; // Check the business flag
                            const clientDisplayNum = sortedChats.length - index;

                            // Dynamic determination of the background tone if marked or selected
                            let rowBackground = 'transparent';
                            if (isSelected) {
                                rowBackground = '#121212';
                            } else if (isUnfinished) {
                                rowBackground = 'rgba(0, 122, 255, 0.15)'; // Elegant subtle blue background tint
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
                                        borderLeft: isUnfinished ? '4px solid #007aff' : '4px solid transparent', // Left blue stripe indicator
                                        transition: 'background 0.2s ease, border 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => !isSelected && (e.currentTarget.style.backgroundColor = isUnfinished ? 'rgba(0, 122, 255, 0.25)' : '#0a0a0a')}
                                    onMouseLeave={(e) => !isSelected && (e.currentTarget.style.backgroundColor = rowBackground)}
                                >
                                    {/* Number Circle Graphic */}
                                    <div style={{ 
                                        width: '56px', height: '56px', borderRadius: '50%', 
                                        display: 'flex', alignItems: 'center', 
                                        justifyContent: 'center', color: isUnread ? '#000' : '#fff', 
                                        fontWeight: '600', fontSize: '16px',
                                        background: isUnread ? 'linear-gradient(45deg, #2bb35c, #38d777)' : '#262626', 
                                        flexShrink: 0,
                                        border: isSelected ? '2px solid #38d777' : isUnfinished ? '2px solid #007aff' : 'none',
                                        boxSizing: 'border-box'
                                    }}>
                                        {clientDisplayNum}
                                    </div>
                                    
                                    {/* Middle Section: Label & Last text excerpt */}
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                                            <div style={{ fontSize: '14px', fontWeight: (isUnread || isUnfinished) ? 700 : 400, color: '#fff' }}>
                                                Client #{clientDisplayNum} {isUnfinished && '💼'}
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

                                    {/* RIGHT: Actionable Toggle Switch (Stops bubbling event to row click) */}
                                    <div 
                                        onClick={(e) => handleToggleUnfinished(e, chat.id, isUnfinished)}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '4px'
                                        }}
                                        title={isUnfinished ? "Mark as Finished" : "Mark as Unfinished Business"}
                                    >
                                        <div style={{
                                            width: '34px',
                                            height: '20px',
                                            backgroundColor: isUnfinished ? '#007aff' : '#333333',
                                            borderRadius: '10px',
                                            position: 'relative',
                                            transition: 'background-color 0.2s',
                                            cursor: 'pointer'
                                        }}>
                                            <div style={{
                                                width: '16px',
                                                height: '16px',
                                                backgroundColor: '#ffffff',
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
                                flexShrink: 0
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#262626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 'bold' }}>
                                        C
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: 600, color: '#fff', fontSize: '15px' }}>Client Window</div>
                                        <div style={{ fontSize: '11px', color: isAutopilot ? '#38d777' : '#a8a8a8', fontWeight: 500, letterSpacing: '0.5px', marginTop: '2px' }}>
                                            {isAutopilot ? '● AUTOPILOT ENABLED' : '○ MANUAL CONTROL'}
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setIsAutopilot(!isAutopilot)}
                                    style={{ 
                                        background: isAutopilot ? '#262626' : '#38d777',
                                        color: '#fff',
                                        border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px',
                                        transition: 'background 0.2s'
                                    }}
                                >
                                    {isAutopilot ? 'Take Over' : 'Enable Malvin'}
                                </button>
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
                                            background: isManager ? '#2bb35c' : '#262626', 
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
                                            color: inputValue.trim() ? '#38d777' : '#004d1c',
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