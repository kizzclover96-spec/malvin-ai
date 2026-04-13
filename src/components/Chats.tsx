import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { ref, push, onValue } from "firebase/database";

// Reusable Sub-Card for the chat elements
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

const Chats = ({ onBack, userBrand }: any) => {
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null); // Change to string
    const [isAutopilot, setIsAutopilot] = useState(true);
    const [activeTab, setActiveTab] = useState('Chats');
  // Inside Chats.tsx (Manager Dashboard)
    const [activeMessages, setActiveMessages] = useState<any[]>([]);

    useEffect(() => {
        if (!selectedChatId) return;

        const q = query(collection(firestore, "conversations"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setActiveMessages(msgs);
        });

        return () => unsubscribe();
    }, [selectedChatId]);
    const [chats, setChats] = useState<any[]>([]);
    useEffect(() => {
        if (!userBrand || !userBrand?.id) {
            console.log("❌ Chats.tsx: userBrand.id is missing!");
            console.log("Waiting for brand data...");
            return; 
        }
        console.log("🔍 Manager is searching for Brand ID:", userBrand.id);
        console.log("🔍 Data Type of Brand ID:", typeof userBrand.id);
        // Only show chats belonging to THIS manager's brand
        const q = query(
            collection(firestore, "conversations"),
            where("brandId", "==", String(userBrand?.id)),
            orderBy("updatedAt", "desc")
        );

        const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
            console.log("✅ Snapshot received! Document count:", snapshot.size);
            const chatList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setChats(chatList);
        }, (error) => {
            console.error("🔥 Firestore Error:", error.message);
        });

        return () => unsubscribe();
    }, [userBrand?.id]);

    const [inputValue, setInputValue] = useState('');

    // The User's custom "Commands" for Malvin
    const [directives] = useState([
        { trigger: 'discount', response: 'Since you are a loyal customer of {name}, I can offer you 10% off!' },
        { trigger: 'hours', response: 'We are open until 9 PM today in the {category} department.' },
        { trigger: 'stock', response: 'Let me check the back... Yes, we have that in stock!' }
    ]);
    
    const sendMessage = (roomId, text) => {
        const chatRef = ref(db, `chats/${roomId}/messages`);
        push(chatRef, {
            senderId: auth.currentUser.uid,
            text: text,
            timestamp: Date.now()
        });
    };

    const handleManagerSend = async (text: string) => {
        if (!text.trim() || !selectedChatId) return;

        // 1. Add the message as 'manager'
        await addDoc(collection(db, "conversations", selectedChatId, "messages"), {
            text: text,
            sender: 'manager',
            timestamp: serverTimestamp()
        });

        // 2. Update the main convo doc so the list stays sorted
        await setDoc(doc(db, "conversations", selectedChatId), {
            lastMessage: text,
            updatedAt: serverTimestamp()
        }, { merge: true });
    };

    const navItems = ['Estimates', 'Invoices', 'Payments', 'Chats', 'Checkouts'];

    return (
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}> {/* Container to keep everything centered */}    
            <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '350px 1fr', 
            gap: '20px', 
            height: '600px', // Matches the layout height
            marginTop: '10px' 
            }}>
            
                {/* LEFT: CHAT HEADS LIST */}
                <ChatCard>
                    <div style={{ padding: '20px', borderBottom: '1px solid #222', fontWeight: 600, fontSize: '14px' }}>
                    Active Conversations
                    </div>
                    <div style={{ flex: 1, overflowY: 'auto', padding: '10px' }}>
                    {chats.map(chat => (
                        <div 
                        key={chat.id}
                        onClick={() => setSelectedChatId(chat.id)}
                        style={{
                            padding: '15px',
                            borderRadius: '18px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            marginBottom: '8px',
                            transition: '0.2s',
                            backgroundColor: selectedChatId === chat.id ? '#1A1A1A' : 'transparent',
                        }}
                        >
                        {/* Profile Avatar with Status Ring */}
                        <div style={{ 
                            width: '42px', height: '42px', borderRadius: '50%', background: '#333',
                            border: chat.status === 'Online' ? '2px solid #C5FF41' : '2px solid transparent'
                        }} />
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                            <div style={{ fontSize: '14px', fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
                            {chat.name}
                            <span style={{ fontSize: '10px', color: '#666', fontWeight: 400 }}>{chat.time}</span>
                            </div>
                            <div style={{ fontSize: '12px', color: '#666', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {chat.lastMsg}
                            </div>
                        </div>
                        </div>
                    ))}
                    </div>
                </ChatCard>

                {/* RIGHT: CONVERSATION OR EMPTY STATE */}
                <ChatCard style={{ background: '#000' }}>
                    {selectedChatId ? (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        {/* Chat Header */}
                        <div style={{ padding: '20px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <div style={{ fontWeight: 700 }}>Sarah Jenkins</div>
                            <div style={{ fontSize: '11px', color: isAutopilot ? '#C5FF41' : '#666' }}>
                            {isAutopilot ? '🤖 MALVIN AUTOPILOT ON' : '👤 MANUAL MODE'}
                            </div>
                        </div>
                        <button 
                            onClick={() => setIsAutopilot(!isAutopilot)}
                            style={{ 
                            background: isAutopilot ? 'rgba(197, 255, 65, 0.1)' : '#fff',
                            color: isAutopilot ? '#C5FF41' : '#000',
                            border: 'none', padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, fontSize: '12px'
                            }}
                        >
                            {isAutopilot ? 'Take Over' : 'Enable Malvin'}
                        </button>
                        </div>

                        {/* Message Feed */}
                        <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
                            {activeMessages.map((msg) => (
                                <div key={msg.id} style={{ 
                                    alignSelf: msg.sender === 'manager' ? 'flex-end' : 'flex-start', 
                                    background: msg.sender === 'manager' ? 'rgba(197, 255, 65, 0.05)' : '#1A1A1A', 
                                    border: msg.sender === 'manager' ? '1px solid #C5FF41' : 'none',
                                    padding: '12px 16px', 
                                    borderRadius: '15px', 
                                    fontSize: '14px', 
                                    maxWidth: '70%',
                                    color: msg.sender === 'manager' ? '#C5FF41' : 'white'
                                }}>
                                    {msg.text}
                                </div>
                            ))}
                        </div>
                        {/* Input */}
                        <div style={{ padding: '20px', borderTop: '1px solid #222', display: 'flex', gap: '10px' }}>
                        <input 
                            placeholder="Type a message..." 
                            style={{ flex: 1, background: '#111', border: '1px solid #333', color: 'white', borderRadius: '14px', padding: '12px', outline: 'none' }} 
                        />
                        <button style={{ background: '#C5FF41', color: 'black', border: 'none', padding: '0 20px', borderRadius: '14px', fontWeight: 800 }}>
                            SEND
                        </button>
                        </div>
                    </div>
                    ) : (
                    /* EMPTY STATE */
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '40px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🛰️</div>
                        <h3 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '10px' }}>No chats yet?</h3>
                        <p style={{ color: '#666', maxWidth: '300px', lineHeight: '1.6', fontSize: '14px' }}>
                        Tell someone about **{userBrand?.name || 'your brand'}** or run an ad campaign today to start the conversation.
                        </p>
                        <button style={{ marginTop: '25px', background: '#C5FF41', color: 'black', border: 'none', padding: '14px 32px', borderRadius: '30px', fontWeight: 800, cursor: 'pointer' }}>
                        Launch Growth Ads
                        </button>
                    </div>
                    )}
                </ChatCard>
            </div>
        </div>
    );     

};

export default Chats;