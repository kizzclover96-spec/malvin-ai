import React, { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, doc, setDoc, updateDoc, getDocs } from "firebase/firestore";
import { firestore, auth } from "../firebase";

const ChatCard = ({ children, style }: any) => (
    <div style={{
        background: '#111111',
        borderRadius: '0px', 
        borderRight: '1px solid #222',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
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
        <div style={{ 
            width: '100%', 
            height: 'calc(100vh - 80px)', 
            background: '#111',
            color: '#fff',
            fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif',
            boxSizing: 'border-box'
        }}>
            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: '350px 1fr', 
                height: '100%',
                width: '100%',
                boxSizing: 'border-box'
            }}>
                
                {/* LEFT: CHAT LIST (Sidebar) */}
                <ChatCard style={{ background: '#111111' }}>
                    <div style={{ 
                        padding: '20px', 
                        borderBottom: '1px solid #222', 
                        fontWeight: 600, 
                        fontSize: '16px',
                        background: '#1c1c1c',
                        display: 'flex',
                        alignItems: 'center',
                        height: '60px',
                        boxSizing: 'border-box'
                    }}>
                        Active Conversations
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 4px' }}>
                        {sortedChats.map((chat, index) => {
                            const isUnread = chat.viewedByManager === false;
                            const isSelected = selectedChatId === chat.id;
                            const clientDisplayNum = sortedChats.length - index;

                            return (
                                <div 
                                    key={chat.id}
                                    onClick={() => handleSelectChat(chat.id)}
                                    style={{
                                        padding: '12px 16px',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '15px',
                                        borderBottom: '1px solid #1a1a1a',
                                        backgroundColor: isSelected ? '#2a2a2a' : 'transparent',
                                        transition: 'background 0.2s',
                                        boxSizing: 'border-box'
                                    }}
                                    onMouseEnter={(e) => !isSelected && (e.currentTarget.style.backgroundColor = '#1c1c1c')}
                                    onMouseLeave={(e) => !isSelected && (e.currentTarget.style.backgroundColor = 'transparent')}
                                >
                                    <div style={{ 
                                        width: '45px', height: '45px', borderRadius: '50%', 
                                        display: 'flex', alignItems: 'center', 
                                        justifyContent: 'center', color: isUnread ? '#000' : '#C5FF41', 
                                        fontWeight: 'bold', fontSize: '15px',
                                        backgroundColor: isUnread ? '#C5FF41' : '#333', 
                                        flexShrink: 0
                                    }}>
                                        {clientDisplayNum}
                                    </div>
                                    
                                    <div style={{ flex: 1, overflow: 'hidden' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                            <div style={{ fontSize: '15px', fontWeight: 500, color: '#fff' }}>
                                                Client #{clientDisplayNum}
                                            </div>
                                            {isUnread && (
                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#C5FF41' }} />
                                            )}
                                        </div>
                                        <div style={{ 
                                            fontSize: '13px', 
                                            color: isUnread ? '#C5FF41' : '#aaa', 
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
                <ChatCard style={{ background: '#0b141a', border: 'none' }}>
                    {selectedChatId ? (
                        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, boxSizing: 'border-box' }}>
                            
                            {/* Chat Header */}
                            <div style={{ 
                                padding: '10px 20px', 
                                borderBottom: '1px solid #222', 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                background: '#1c1c1c',
                                height: '60px',
                                boxSizing: 'border-box'
                            }}>
                                <div>
                                    <div style={{ fontWeight: 600, color: '#fff', fontSize: '16px' }}>Client Window</div>
                                    <div style={{ fontSize: '11px', color: isAutopilot ? '#C5FF41' : '#aaa', marginTop: '2px' }}>
                                        {isAutopilot ? '🤖 AUTOPILOT ENABLED' : '👤 MANUAL CONTROL'}
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setIsAutopilot(!isAutopilot)}
                                    style={{ 
                                        background: isAutopilot ? 'rgba(197, 255, 65, 0.15)' : '#fff',
                                        color: isAutopilot ? '#C5FF41' : '#000',
                                        border: 'none', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontWeight: 600, fontSize: '13px'
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
                                    padding: '20px 10%', 
                                    overflowY: 'auto', 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    gap: '6px',
                                    backgroundColor: '#0b141a',
                                    backgroundImage: 'radial-gradient(rgba(255,255,255,0.03) 1px, transparent 0)',
                                    backgroundSize: '24px 24px',
                                    boxSizing: 'border-box'
                                }}
                            >
                                {activeMessages.map((msg) => {
                                    const isManager = msg.sender === 'manager';
                                    return (
                                        <div key={msg.id} style={{ 
                                            alignSelf: isManager ? 'flex-end' : 'flex-start', 
                                            background: isManager ? '#005c4b' : '#128c7e', // Both variants now stylized with custom greens
                                            color: '#fff',
                                            padding: '8px 14px', 
                                            borderRadius: isManager ? '8px 0px 8px 8px' : '0px 8px 8px 8px', 
                                            maxWidth: '65%', 
                                            fontSize: '14px',
                                            boxShadow: '0 1px 0.5px rgba(0,0,0,0.13)',
                                            lineHeight: '1.4',
                                            wordBreak: 'break-word', // Keeps layout crisp regardless of string lengths
                                            boxSizing: 'border-box'
                                        }}>
                                            {msg.text}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Footer Input Strip */}
                            <div style={{ padding: '12px 24px', display: 'flex', gap: '12px', background: '#1c1c1c', alignItems: 'center', boxSizing: 'border-box' }}>
                                <input 
                                    value={inputValue} 
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleManagerSend(inputValue)}
                                    placeholder="Type a message"
                                    style={{ 
                                        flex: 1, 
                                        background: '#2a2a2a', 
                                        border: 'none', 
                                        color: '#fff', 
                                        padding: '12px 18px', 
                                        borderRadius: '8px',
                                        fontSize: '14px',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />
                                <button 
                                    onClick={() => handleManagerSend(inputValue)} 
                                    style={{ 
                                        background: '#00a884', 
                                        color: '#fff',
                                        padding: '12px 24px', 
                                        borderRadius: '8px', 
                                        fontWeight: 600, 
                                        border: 'none', 
                                        cursor: 'pointer',
                                        boxSizing: 'border-box'
                                    }}
                                >
                                    SEND
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div style={{ margin: 'auto', textAlign: 'center', opacity: 0.5 }}>
                            <div style={{ fontSize: '60px', marginBottom: '15px' }}>💻</div>
                            <h3 style={{ fontWeight: 300, color: '#fff', fontSize: '20px' }}>Keep your phone connected</h3>
                            <p style={{ fontSize: '14px', color: '#aaa', maxWidth: '300px', margin: '0 auto' }}>Select a conversation from the sidebar to view messages.</p>
                        </div>
                    )}
                </ChatCard>
            </div>
        </div>
    );
};

export default Chats;