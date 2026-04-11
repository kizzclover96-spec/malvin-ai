import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { doc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase"; // path to your config
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { useParams } from 'react-router-dom';

const CustomerChat = ({ brandId }: { brandId: string }) => {
    const [chatId, setChatId] = useState<string>('');
    const [message, setMessage] = useState('');
    
    const CustomerChatWrapper = () => {
        const { brandId } = useParams(); // Grabs 'brand_123' from /chat/brand_123
        return <CustomerChat brandId={brandId || ''} />;
    };
    useEffect(() => {
        // 1. Check if this customer already has a chat session stored in their browser
        let existingChatId = localStorage.getItem(`malvin_chat_${brandId}`);
        
        if (!existingChatId) {
            // 2. If not, generate a new unique ID for this specific customer
            existingChatId = uuidv4(); 
            localStorage.setItem(`malvin_chat_${brandId}`, existingChatId);
        }
        
        setChatId(existingChatId);
    }, [brandId]);

    const [chatHistory, setChatHistory] = useState<any[]>([]);

    useEffect(() => {
        if (!chatId) return;

        // Listen to the specific 'messages' sub-collection for this chatId
        const q = query(
            collection(db, "conversations", chatId, "messages"),
            orderBy("timestamp", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setChatHistory(msgs);
        });

        return () => unsubscribe();
    }, [chatId]);

    const messagePayload = {
        chatId: chatId,
        brandId: brandId,
        text: message,
        sender: 'customer',
        timestamp: Date.now()
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || !chatId) return;

        try {
            // 1. Update/Create the main conversation record
            // This is what the Manager's sidebar "listens" to
            const convoRef = doc(db, "conversations", chatId);
            await setDoc(convoRef, {
                brandId: brandId,
                lastMessage: message,
                updatedAt: serverTimestamp(),
                status: 'active'
            }, { merge: true });

            // 2. Add the actual message to the sub-collection
            await addDoc(collection(db, "conversations", chatId, "messages"), {
                text: message,
                sender: 'customer',
                timestamp: serverTimestamp()
            });

            setMessage('');
        } catch (error) {
            console.error("Error sending message:", error);
        }
    };

    return (
        <div style={{
            backgroundColor: '#000',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'sans-serif',
            color: 'white'
        }}>
            {/* Header: Brand Identity */}
            <div style={{ padding: '20px', borderBottom: '1px solid #222', textAlign: 'center' }}>
                <div style={{ fontWeight: 800, fontSize: '18px' }}>Malvin Store</div>
                <div style={{ fontSize: '12px', color: '#C5FF41' }}>● Online</div>
            </div>

            {/* Message Area */}
            <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {chatHistory.map((msg) => (
                    <div key={msg.id} style={{
                        alignSelf: msg.sender === 'customer' ? 'flex-end' : 'flex-start',
                        background: msg.sender === 'customer' ? '#C5FF41' : '#1A1A1A',
                        color: msg.sender === 'customer' ? 'black' : 'white',
                        padding: '12px 16px',
                        borderRadius: '18px',
                        maxWidth: '80%',
                        fontSize: '14px',
                        fontWeight: 500
                    }}>
                        {msg.text}
                    </div>
                ))}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} style={{ padding: '20px', display: 'flex', gap: '10px', background: '#000' }}>
                <input 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Message us..."
                    style={{
                        flex: 1,
                        background: '#111',
                        border: '1px solid #333',
                        color: 'white',
                        padding: '15px',
                        borderRadius: '30px',
                        outline: 'none'
                    }}
                />
                <button type="submit" style={{
                    background: '#C5FF41',
                    border: 'none',
                    width: '50px',
                    height: '50px',
                    borderRadius: '50%',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                }}>
                    →
                </button>
            </form>
        </div>
    );
};

export default CustomerChat;