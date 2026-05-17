import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, doc, setDoc, updateDoc, getDocs } from "firebase/firestore";
import { firestore, auth } from "../firebase";

const ChatCard = ({ children, style }: any) => (
    <div style={{
        background: '#111111',
        borderRadius: '24px',
        border: '1px solid #1A1A1A',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        ...style
    }}>{children}</div>
);

const Chats = ({ brandId, userBrand }: any) => {
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [isAutopilot, setIsAutopilot] = useState(true);
    const [activeMessages, setActiveMessages] = useState<any[]>([]);
    const [chats, setChats] = useState<any[]>([]); // This is the state variable being used
    const [inputValue, setInputValue] = useState('');

    // 1. Sort chats: Unread ones first
    const sortedChats = useMemo(() => {
        return [...chats].sort((a, b) => {
            if (a.viewedByManager === b.viewedByManager) return 0;
            return a.viewedByManager ? 1 : -1;
        });
    }, [chats]);

    // 2. Listen for AI Actions (Socket placeholder)
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

    // Debug Logger
    useEffect(() => {
        const logAll = async () => {
            const snap = await getDocs(collection(firestore, "conversations"));
            console.log("ROOT conversations:", snap.docs.map(d => d.data()));
        };
        logAll();
    }, []);
    
    // 3. Real-time Listener for the Manager Chat List
    useEffect(() => {
        const managerUid = auth.currentUser?.uid;
        if (!managerUid) return;

        const conversationsRef = collection(firestore, "conversations");

        const q = query(
            conversationsRef,
            where("brandId", "==", managerUid),
            orderBy("updatedAt", "desc") 
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const activeChats = snapshot.docs.map(doc => ({
                id: doc.id, 
                ...doc.data()
            }));
            
            // FIXED: Changed from setConversations to setChats to match your useState
            setChats(activeChats); 
        }, (error) => {
            console.error("Dashboard listener failed:", error);
        });

        return () => unsubscribe();
    }, []);

    // 4. Listener for Messages in Selected Chat
    useEffect(() => {
        if (!selectedChatId) return;

        const q = query(
            collection(firestore, "conversations", selectedChatId, "messages"),
            orderBy("timestamp", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setActiveMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        return () => unsubscribe();
    }, [selectedChatId]);

    const handleSelectChat = async (chatId: string) => {
        setSelectedChatId(chatId);
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

    // 5. Auto-scroll to bottom
    useEffect(() => {
        const messageContainer = document.getElementById('message-feed');
        if (messageContainer) {
            messageContainer.scrollTop = messageContainer.scrollHeight;
        }
    }, [activeMessages]);

    return (
        <div style={{ maxWidth: '100%', margin: '0 auto', padding: '0 10px' }}>
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '300px 1fr', 
                gap: '20px', 
                height: '70vh', 
                marginTop: '10px',
                minHeight: '600px' 
            }}>
                
                {/* LEFT: CHAT LIST */}
                <ChatCard>
                    <div style={{ padding: '20px', borderBottom: '1px solid #222', fontWeight: 600, fontSize: '14px' }}>
                        Active Conversations
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                        {sortedChats.map((chat, index) => {
                            const isUnread = chat.viewedByManager === false;
                            const isSelected = selectedChatId === chat.id;
                            // FIXED: Using sortedChats context instead of chats directly to maintain index logic
                            const clientDisplayNum = sortedChats.length - index;

                            return (
                                <div 
                                    key={chat.id}
                                    onClick={() => handleSelectChat(chat.id)}
                                    style={{
                                        padding: '15px',
                                        borderRadius: '18px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '12px',
                                        marginBottom: '8px',
                                        position: 'relative',
                                        border: isUnread ? '1px solid #C5FF41' : '1px solid transparent',
                                        backgroundColor: isSelected ? '#1A1A1A' : (isUnread ? 'rgba(197, 255, 65, 0.08)' : 'transparent'),
                                        transition: '0.3s'
                                    }}
                                >
                                    <div style={{ 
                                        width: '42px', height: '42px', borderRadius: '50%', 
                                        display: 'flex', alignItems: 'center', 
                                        justifyContent: 'center', color: isUnread ? '#000' : '#C5FF41', 
                                        fontWeight: 'bold',
                                        backgroundColor: isUnread ? '#C5FF41' : '#333', 
                                    }}>
                                        {clientDisplayNum}
                                    </div>
                                    
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ fontSize: '14px', fontWeight: 600, color: isUnread ? '#C5FF41' : '#fff' }}>
                                                Client #{clientDisplayNum}
                                            </div>
                                            {isUnread && (
                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#C5FF41' }} />
                                            )}
                                        </div>
                                        <div style={{ 
                                            fontSize: '12px', 
                                            color: isUnread ? '#fff' : '#666', 
                                            fontWeight: isUnread ? '600' : '400',
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

                {/* RIGHT: MESSAGE FEED */}
                <ChatCard style={{ background: '#000', border: '1px solid #222' }}>
                    {selectedChatId ? (
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div style={{ padding: '24px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#050505' }}>
                                <div>
                                    <div style={{ fontWeight: 700, color: '#fff' }}>Chat Detail</div>
                                    <div style={{ fontSize: '11px', color: isAutopilot ? '#C5FF41' : '#666' }}>
                                        {isAutopilot ? '🤖 AUTOPILOT ON' : '👤 MANUAL MODE'}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setIsAutopilot(!isAutopilot)}
                                    style={{ 
                                        background: isAutopilot ? 'rgba(197, 255, 65, 0.1)' : '#fff',
                                        color: isAutopilot ? '#C5FF41' : '#000',
                                        border: 'none', padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', fontWeight: 700
                                    }}
                                >
                                    {isAutopilot ? 'Take Over' : 'Enable Malvin'}
                                </button>
                            </div>

                            {/* FIXED: ID match for auto-scroll tracking */}
                            <div id="message-feed" style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {activeMessages.map((msg) => (
                                    <div key={msg.id} style={{ 
                                        alignSelf: msg.sender === 'manager' ? 'flex-end' : 'flex-start', 
                                        background: msg.sender === 'manager' ? '#C5FF41' : '#1A1A1A', 
                                        color: msg.sender === 'manager' ? '#000' : '#fff',
                                        padding: '10px 15px', borderRadius: '15px', maxWidth: '85%', fontSize: '14px'
                                    }}>
                                        {msg.text}
                                    </div>
                                ))}
                            </div>

                            <div style={{ padding: '20px', display: 'flex', gap: '10px' }}>
                                <input 
                                    value={inputValue} 
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleManagerSend(inputValue)}
                                    placeholder="Reply..."
                                    style={{ flex: 1, background: '#111', border: '1px solid #333', color: '#fff', padding: '12px', borderRadius: '12px' }}
                                />
                                <button onClick={() => handleManagerSend(inputValue)} style={{ background: '#C5FF41', padding: '0 20px', borderRadius: '12px', fontWeight: 800 }}>SEND</button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ margin: 'auto', textAlign: 'center', opacity: 0.4 }}>
                            <div style={{ fontSize: '50px', marginBottom: '20px' }}>💬</div>
                            <h3 style={{ fontWeight: 400 }}>Select a client to view conversation history</h3>
                        </div>
                    )}
                </ChatCard>
            </div>
        </div>
    );
};

export default Chats;