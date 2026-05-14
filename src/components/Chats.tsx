import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, doc, setDoc, updateDoc } from "firebase/firestore";
import { firestore } from "../firebase";
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001');

const ChatCard = ({ children, style }: any) => (
    <div style={{
        background: '#111111',
        borderRadius: '24px',
        border: '1px solid #1A1A1A',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        height: '100%', // Ensure children fill the card
        ...style
    }}>{children}</div>
);

const Chats = ({ brandId, userBrand }: any) => {
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [isAutopilot, setIsAutopilot] = useState(true);
    const [activeMessages, setActiveMessages] = useState<any[]>([]);
    const [chats, setChats] = useState<any[]>([]);
    const [inputValue, setInputValue] = useState('');

    const sortedChats = useMemo(() => {
        return [...chats].sort((a, b) => {
            if (a.viewedByManager === b.viewedByManager) return 0;
            return a.viewedByManager ? 1 : -1;
        });
    }, [chats]);

    useEffect(() => {
        socket.on('ai-action', (action) => {
            if (isAutopilot && selectedChatId) {
                handleManagerSend(action.text); 
            }
        });
        return () => { socket.off('ai-action'); };
    }, [isAutopilot, selectedChatId]);

    useEffect(() => {
        const idToUse = brandId || userBrand?.id;
        if (!idToUse) return;

        const q = query(
            collection(firestore, "conversations"),
            where("brandId", "==", String(idToUse)),
            orderBy("updatedAt", "desc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const chatList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setChats(chatList);
        });

        return () => unsubscribe();
    }, [brandId, userBrand?.id]);

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

    return (
        /* Increased maxWidth to allow the UI to breathe */
        <div style={{ maxWidth: '1600px', margin: '0 auto', padding: '0 20px' }}>
            <div style={{ 
                display: 'grid', 
                /* Adjusted columns: Sidebar is slightly smaller relative to the feed */
                gridTemplateColumns: '320px 1fr', 
                gap: '24px', 
                /* Height increased to 85% of viewport for a "Big Screen" feel */
                height: '85vh', 
                marginTop: '20px',
                minHeight: '600px' 
            }}>
                
                {/* LEFT: CHAT LIST */}
                <ChatCard>
                    <div style={{ padding: '24px', borderBottom: '1px solid #222', fontWeight: 700, fontSize: '16px', letterSpacing: '0.5px' }}>
                        Conversations
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
                        {sortedChats.map((chat, index) => {
                            const isUnread = chat.viewedByManager === false;
                            const isSelected = selectedChatId === chat.id;

                            return (
                                <div 
                                    key={chat.id}
                                    onClick={() => handleSelectChat(chat.id)}
                                    style={{
                                        padding: '16px',
                                        borderRadius: '20px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '14px',
                                        marginBottom: '10px',
                                        border: isUnread ? '1px solid #C5FF41' : '1px solid transparent',
                                        backgroundColor: isSelected ? '#1A1A1A' : (isUnread ? 'rgba(197, 255, 65, 0.08)' : 'transparent'),
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <div style={{ 
                                        width: '44px', height: '44px', borderRadius: '50%', 
                                        display: 'flex', alignItems: 'center', 
                                        justifyContent: 'center', color: isUnread ? '#000' : '#C5FF41', 
                                        fontWeight: 800,
                                        backgroundColor: isUnread ? '#C5FF41' : '#222',
                                    }}>
                                        {chats.length - index}
                                    </div>
                                    
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                            <div style={{ fontSize: '14px', fontWeight: 700, color: isUnread ? '#C5FF41' : '#fff' }}>
                                                Client #{chats.length - index}
                                            </div>
                                            {isUnread && (
                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#C5FF41', boxShadow: '0 0 10px #C5FF41' }} />
                                            )}
                                        </div>
                                        <div style={{ 
                                            fontSize: '12px', 
                                            color: isUnread ? '#eee' : '#888', 
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
                                    <div style={{ fontWeight: 800, fontSize: '18px', color: '#fff' }}>Client Session</div>
                                    <div style={{ fontSize: '12px', color: isAutopilot ? '#C5FF41' : '#666', fontWeight: 600, marginTop: '2px' }}>
                                        {isAutopilot ? '● AUTOPILOT ACTIVE' : '○ MANUAL OVERRIDE'}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setIsAutopilot(!isAutopilot)}
                                    style={{ 
                                        background: isAutopilot ? 'rgba(197, 255, 65, 0.1)' : '#C5FF41',
                                        color: isAutopilot ? '#C5FF41' : '#000',
                                        border: isAutopilot ? '1px solid #C5FF41' : 'none', 
                                        padding: '10px 20px', borderRadius: '14px', cursor: 'pointer', fontWeight: 800,
                                        transition: '0.3s'
                                    }}
                                >
                                    {isAutopilot ? 'Take Over' : 'Enable AI'}
                                </button>
                            </div>

                            <div style={{ flex: 1, padding: '30px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {activeMessages.map((msg) => (
                                    <div key={msg.id} style={{ 
                                        alignSelf: msg.sender === 'manager' ? 'flex-end' : 'flex-start', 
                                        background: msg.sender === 'manager' ? '#C5FF41' : '#1A1A1A', 
                                        color: msg.sender === 'manager' ? '#000' : '#fff',
                                        padding: '14px 18px', 
                                        borderRadius: msg.sender === 'manager' ? '20px 20px 4px 20px' : '20px 20px 20px 4px', 
                                        maxWidth: '65%', 
                                        fontSize: '15px',
                                        lineHeight: '1.4',
                                        boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
                                    }}>
                                        {msg.text}
                                    </div>
                                ))}
                            </div>

                            <div style={{ padding: '24px', background: '#050505', borderTop: '1px solid #222', display: 'flex', gap: '15px' }}>
                                <input 
                                    value={inputValue} 
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleManagerSend(inputValue)}
                                    placeholder="Type a message..."
                                    style={{ 
                                        flex: 1, 
                                        background: '#111', 
                                        border: '1px solid #333', 
                                        color: '#fff', 
                                        padding: '16px', 
                                        borderRadius: '16px',
                                        fontSize: '15px',
                                        outline: 'none'
                                    }}
                                />
                                <button 
                                    onClick={() => handleManagerSend(inputValue)} 
                                    style={{ 
                                        background: '#C5FF41', 
                                        padding: '0 30px', 
                                        borderRadius: '16px', 
                                        fontWeight: 900, 
                                        fontSize: '14px',
                                        cursor: 'pointer',
                                        border: 'none'
                                    }}
                                >
                                    SEND
                                </button>
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