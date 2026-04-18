import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  doc, setDoc, addDoc, collection, serverTimestamp, 
  query, orderBy, onSnapshot 
} from "firebase/firestore";
import { db, firestore, auth } from "../firebase"; 
import { useParams } from 'react-router-dom';
import { ref as dbRef, onValue } from "firebase/database";
import { ProductCard } from './ProductView';

const CustomerChat = ({ brandId: propBrandId }: { brandId: string }) => {
    const { brandId: urlBrandId } = useParams();
    const brandId = propBrandId || urlBrandId || '';
    
    // --- STATES ---
    const [chatId, setChatId] = useState<string>('');
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState<any[]>([]);
    const [brandName, setBrandName] = useState('Loading Store...');
    
    // Catalog & Order States
    const [showCatalog, setShowCatalog] = useState(false);
    const [catalogItems, setCatalogItems] = useState<any[]>([]);
    const [orderModal, setOrderModal] = useState<any>(null);
    const [quantity, setQuantity] = useState(1);

    // --- EFFECTS ---
    
    // 1. Fetch Brand Identity
    useEffect(() => {
        if (!brandId) return;
        const brandRef = dbRef(db, `users/${brandId}/brandData`);
        const unsubscribe = onValue(brandRef, (snapshot) => {
            const data = snapshot.val();
            setBrandName(data?.name || "Malvin AI Partner");
        });
        return () => unsubscribe();
    }, [brandId]);

    // 2. Fetch Catalog Items
    useEffect(() => {
        if (!brandId) return;
        const catalogRef = dbRef(db, `users/${brandId}/catalog`);
        const unsubscribe = onValue(catalogRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setCatalogItems(Object.keys(data).map(k => ({ id: k, ...data[k] })));
            }
        });
        return () => unsubscribe();
    }, [brandId]);

    // 3. Setup Chat ID
    useEffect(() => {
        let existingChatId = localStorage.getItem(`malvin_chat_${brandId}`);
        if (!existingChatId) {
            existingChatId = uuidv4(); 
            localStorage.setItem(`malvin_chat_${brandId}`, existingChatId);
        }
        setChatId(existingChatId);
    }, [brandId]);

    // 4. Listen for Messages
    useEffect(() => {
        if (!chatId) return;
        const q = query(
            collection(firestore, "conversations", chatId, "messages"),
            orderBy("timestamp", "asc")
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setChatHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [chatId]);

    // --- ACTIONS ---

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || !chatId) return;

        try {
            const convoRef = doc(firestore, "conversations", chatId);
            await setDoc(convoRef, {
                brandId: brandId,
                lastMessage: message,
                updatedAt: serverTimestamp(),
                status: 'active'
            }, { merge: true });

            await addDoc(collection(firestore, "conversations", chatId, "messages"), {
                text: message,
                sender: 'customer',
                timestamp: serverTimestamp()
            });

            setMessage('');
        } catch (error) {
            console.error("Error sending:", error);
        }
    };

    const sendOrder = async () => {
        if (!orderModal || !chatId) return;
        
        const orderText = `ORDER_REQUEST: ${quantity}x ${orderModal.name}`;
        
        try {
            await addDoc(collection(firestore, "conversations", chatId, "messages"), {
                text: orderText,
                sender: 'customer',
                timestamp: serverTimestamp(),
                isOrder: true,
                orderData: {
                    name: orderModal.name,
                    price: orderModal.price,
                    currency: orderModal.currency,
                    quantity: quantity,
                    image: orderModal.image
                }
            });

            setOrderModal(null);
            setShowCatalog(false);
            setQuantity(1);
        } catch (error) {
            console.error("Order error:", error);
        }
    };

    return (
        <div style={containerStyle}>
            {/* Inject Animation CSS */}
            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `}</style>

            {/* Header */}
            <div style={headerStyle}>
                <div>
                    <div style={{ fontWeight: 800 }}>{brandName}</div>
                    <div style={{ fontSize: '10px', color: '#C5FF41' }}>● Online</div>
                </div>
                <button onClick={() => setShowCatalog(!showCatalog)} style={catalogToggleBtn}>
                    {showCatalog ? 'Close Store' : 'View Catalog 📦'}
                </button>
            </div>

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
                {/* Messages */}
                <div style={messageAreaStyle}>
                    {chatHistory.map((msg) => (
                        <div key={msg.id} style={{
                            ...messageBubbleStyle,
                            alignSelf: msg.sender === 'customer' ? 'flex-end' : 'flex-start',
                            background: msg.isOrder ? 'rgba(197, 255, 65, 0.1)' : (msg.sender === 'customer' ? '#C5FF41' : '#1A1A1A'),
                            color: msg.sender === 'customer' ? 'black' : 'white',
                            border: msg.isOrder ? '1px solid #C5FF41' : 'none'
                        }}>
                            {msg.isOrder && (
                                <div style={{ marginBottom: '10px', display: 'flex', gap: '10px', alignItems: 'center' }}>
                                    <img src={msg.orderData.image} style={{ width: '40px', height: '40px', borderRadius: '8px', objectFit: 'cover' }} alt="" />
                                    <div style={{ fontSize: '12px' }}>
                                        <div style={{ fontWeight: 'bold' }}>Order Request</div>
                                        <div>{msg.orderData.quantity}x {msg.orderData.name}</div>
                                    </div>
                                </div>
                            )}
                            <div style={{ fontSize: '14px' }}>{msg.text}</div>
                        </div>
                    ))}
                </div>

                {/* Sidebar Catalog */}
                {showCatalog && (
                    <div style={sidebarStyle}>
                        <h4 style={{fontSize: '10px', opacity: 0.5, marginBottom: '15px', letterSpacing: '1px'}}>STORE_CATALOG</h4>
                        {catalogItems.map(item => (
                            <ProductCard key={item.id} item={item} onAddToCart={(it) => setOrderModal(it)} />
                        ))}
                    </div>
                )}
            </div>

            {/* Order Popup */}
            {orderModal && (
                <div style={modalOverlay}>
                    <div style={glassModal}>
                        <h3 style={{marginTop: 0}}>Order Quantity</h3>
                        <p style={{opacity: 0.7}}>{orderModal.name}</p>
                        <input 
                            type="number" 
                            min="1"
                            value={quantity} 
                            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                            style={quantityInput}
                        />
                        <div style={{display: 'flex', gap: '10px'}}>
                            <button onClick={sendOrder} style={primaryBtn}>Confirm Order</button>
                            <button onClick={() => setOrderModal(null)} style={secondaryBtn}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer Input */}
            <form onSubmit={handleSend} style={inputContainerStyle}>
                <input 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Message us..."
                    style={inputStyle}
                />
                <button type="submit" style={sendBtnStyle}>→</button>
            </form>
        </div>
    );
};

// --- STYLES ---
const containerStyle: React.CSSProperties = { backgroundColor: '#000', height: '100vh', display: 'flex', flexDirection: 'column', color: 'white' };
const headerStyle: React.CSSProperties = { padding: '20px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const catalogToggleBtn: React.CSSProperties = { background: '#1A1A1A', color: 'white', border: '1px solid #333', padding: '8px 15px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer' };
const messageAreaStyle: React.CSSProperties = { flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '15px' };
const messageBubbleStyle: React.CSSProperties = { padding: '12px', borderRadius: '18px', maxWidth: '80%', display: 'flex', flexDirection: 'column' };
const sidebarStyle: React.CSSProperties = { width: '240px', background: '#080808', borderLeft: '1px solid #222', padding: '15px', overflowY: 'auto', animation: 'slideIn 0.3s ease' };
const inputContainerStyle: React.CSSProperties = { padding: '20px', display: 'flex', gap: '10px', background: '#000' };
const inputStyle: React.CSSProperties = { flex: 1, background: '#111', border: '1px solid #333', color: 'white', padding: '15px', borderRadius: '30px', outline: 'none' };
const sendBtnStyle: React.CSSProperties = { background: '#C5FF41', border: 'none', width: '50px', height: '50px', borderRadius: '50%', fontWeight: 'bold', cursor: 'pointer' };

// Modal Styles
const modalOverlay: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const glassModal: React.CSSProperties = { background: '#111', border: '1px solid #333', padding: '30px', borderRadius: '24px', width: '300px', textAlign: 'center' };
const quantityInput: React.CSSProperties = { width: '100%', backgroundColor: '#000', border: '1px solid #333', borderRadius: '12px', padding: '12px', color: 'white', marginBottom: '20px', textAlign: 'center', fontSize: '20px' };
const primaryBtn: React.CSSProperties = { background: '#C5FF41', color: 'black', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', flex: 1 };
const secondaryBtn: React.CSSProperties = { background: 'transparent', color: 'white', border: '1px solid #333', padding: '12px', borderRadius: '12px', cursor: 'pointer', flex: 1 };

export default CustomerChat;