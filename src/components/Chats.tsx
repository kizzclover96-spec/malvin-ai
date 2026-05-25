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
    const adminChatRoomId = "global_system_coordination"; // Constant channel key identifier

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

    // 6. Clear notification status when explicitly clicking the Internal Desk panel
    

    const handleSelectChat = async (chatId: string) => {
        setSelectedChatId(chatId);
        setIsInternalOpen(false); // 🌟 FIX: Auto-close internal support panel when jumping to client profiles
        try {
            const chatRef = doc(firestore, "conversations", chatId);
            await updateDoc(chatRef, { viewedByManager: true });
        } catch (e) {
            console.error("Error marking as read:", e);
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
                        height: '75px',
                        boxSizing: 'border-box',
                        flexShrink: 0
                    }}>
                        Messages
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
                        {sortedChats.map((chat, index) => {
                            const isUnread = chat.viewedByManager === false;
                            const isSelected = selectedChatId === chat.id;
                            const clientDisplayNum = sortedChats.length - index;

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
                                        backgroundColor: isSelected ? '#121212' : 'transparent',
                                        transition: 'background 0.2s ease'
                                    }}
                                    onMouseEnter={(e) => !isSelected && (e.currentTarget.style.backgroundColor = '#0a0a0a')}
                                    onMouseLeave={(e) => !isSelected && (e.currentTarget.style.backgroundColor = 'transparent')}
                                >
                                    <div style={{ 
                                        width: '56px', height: '56px', borderRadius: '50%', 
                                        display: 'flex', alignItems: 'center', 
                                        justifyContent: 'center', color: isUnread ? '#000' : '#fff', 
                                        fontWeight: '600', fontSize: '16px',
                                        background: isUnread ? 'linear-gradient(45deg, #2bb35c, #38d777)' : '#262626', 
                                        flexShrink: 0,
                                        border: isSelected ? '2px solid #38d777' : 'none',
                                        boxSizing: 'border-box'
                                    }}>
                                        {clientDisplayNum}
                                    </div>
                                    
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                                            <div style={{ fontSize: '14px', fontWeight: isUnread ? 700 : 400, color: '#fff' }}>
                                                Client #{clientDisplayNum}
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
                    
                    {/* BOTTOM SIDEBAR ANCHOR: ADMIN BUTTON */}
                    
                </ChatCard>

                {/* RIGHT: MESSAGE FEED (Main View) */}
                <ChatCard style={{ background: '#000000', border: 'none' }}>
                    {/* 🌟 FIX: Prioritize internal view over selected layout to avoid conditional render overlap breaks */}
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