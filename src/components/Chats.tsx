import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, doc, setDoc, updateDoc } from "firebase/firestore";
import { firestore } from "../firebase";
import { io } from 'socket.io-client';

// Initialize socket OUTSIDE to prevent multiple connections
const socket = io('http://localhost:3001');

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
    const [chats, setChats] = useState<any[]>([]);
    const [inputValue, setInputValue] = useState('');

    // 1. Sort chats: Unread ones first
    const sortedChats = useMemo(() => {
        return [...chats].sort((a, b) => {
            if (a.viewedByManager === b.viewedByManager) return 0;
            return a.viewedByManager ? 1 : -1;
        });
    }, [chats]);

    // 2. Listen for AI Actions (Socket)
    useEffect(() => {
        socket.on('ai-action', (action) => {
            if (isAutopilot && selectedChatId) {
                console.log("🤖 Malvin Action:", action.text);
                handleManagerSend(action.text); 
            }
        });
        return () => { socket.off('ai-action'); };
    }, [isAutopilot, selectedChatId]);

    // 3. Single Listener for the Chat List
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
                viewedByManager: true // Manager sent it, so they've seen it
            }, { merge: true });

            setInputValue('');
        } catch (e) {
            console.error("Error sending:", e);
        }
    };

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '350px 1fr', 
                gap: '20px', 
                height: '70vh', 
                marginTop: '10px' 
            }}>
                
                {/* LEFT: CHAT LIST */}
                <ChatCard>
                    <div style={{ padding: '20px', borderBottom: '1px solid #222', fontWeight: 600, fontSize: '14px' }}>
                        Active Conversations
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                        {sortedChats.map((chat, index) => (
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
                                    border: chat.viewedByManager === false ? '1px solid #C5FF41' : '1px solid transparent',
                                    backgroundColor: selectedChatId === chat.id ? '#1A1A1A' : (chat.viewedByManager === false ? 'rgba(197, 255, 65, 0.05)' : 'transparent'),
                                }}
                            >
                                <div style={{ 
                                    width: '42px', height: '42px', borderRadius: '50%', 
                                    background: '#333', display: 'flex', alignItems: 'center', 
                                    justifyContent: 'center', color: '#C5FF41', fontWeight: 'bold',
                                    border: chat.viewedByManager === false ? '2px solid #C5FF41' : 'none'
                                }}>
                                    {chats.length - index}
                                </div>
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>
                                        Client #{chats.length - index}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {chat.lastMessage || "No messages yet"}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </ChatCard>

                {/* RIGHT: MESSAGE FEED */}
                <ChatCard style={{ background: '#000' }}>
                    {selectedChatId ? (
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                            <div style={{ padding: '20px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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

                            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {activeMessages.map((msg) => (
                                    <div key={msg.id} style={{ 
                                        alignSelf: msg.sender === 'manager' ? 'flex-end' : 'flex-start', 
                                        background: msg.sender === 'manager' ? '#C5FF41' : '#1A1A1A', 
                                        color: msg.sender === 'manager' ? '#000' : '#fff',
                                        padding: '10px 15px', borderRadius: '15px', maxWidth: '70%', fontSize: '14px'
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
                        <div style={{ margin: 'auto', textAlign: 'center', color: '#444' }}>
                            <h3>Select a conversation to start</h3>
                        </div>
                    )}
                </ChatCard>
            </div>
        </div>
    );
};

export default Chats;