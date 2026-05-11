import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  doc, setDoc, addDoc, collection, serverTimestamp, 
  query, orderBy, onSnapshot 
} from "firebase/firestore";
import { db, firestore } from "../firebase"; 
import { useParams } from 'react-router-dom';
import { ref as dbRef, onValue } from "firebase/database";
import { ProductCard } from './ProductView';

const CustomerChat = ({ brandId: propBrandId }: { brandId?: string }) => {
    const { brandId: urlBrandId } = useParams();
    const brandId = propBrandId || urlBrandId || '';
    
    const [chatId, setChatId] = useState<string>('');
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState<any[]>([]);
    const [brandName, setBrandName] = useState('Loading...');
    const [showCatalog, setShowCatalog] = useState(false);
    const [catalogItems, setCatalogItems] = useState<any[]>([]);
    const [orderModal, setOrderModal] = useState<any>(null);
    const [quantity, setQuantity] = useState(1);
    
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chatHistory]);

    // Fetch Brand Identity
    useEffect(() => {
        if (!brandId) return;
        const brandRef = dbRef(db, `users/${brandId}/brandData`);
        return onValue(brandRef, (snapshot) => {
            const data = snapshot.val();
            setBrandName(data?.name || "Malvin AI Partner");
        });
    }, [brandId]);

    // Fetch Catalog
    useEffect(() => {
        if (!brandId) return;
        const catalogRef = dbRef(db, `users/${brandId}/catalog`);
        return onValue(catalogRef, (snapshot) => {
            const data = snapshot.val();
            if (data) setCatalogItems(Object.keys(data).map(k => ({ id: k, ...data[k] })));
        });
    }, [brandId]);

    // Setup Chat ID
    useEffect(() => {
        let id = localStorage.getItem(`malvin_chat_${brandId}`);
        if (!id) {
            id = uuidv4(); 
            localStorage.setItem(`malvin_chat_${brandId}`, id);
        }
        setChatId(id);
    }, [brandId]);

    // Listen for Messages
    useEffect(() => {
        if (!chatId) return;
        const q = query(collection(firestore, "conversations", chatId, "messages"), orderBy("timestamp", "asc"));
        return onSnapshot(q, (snapshot) => {
            setChatHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
    }, [chatId]);

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || !chatId) return;

        try {
            const convoRef = doc(firestore, "conversations", chatId);
            // CRITICAL: Set viewedByManager to false for Dashboard notifications
            await setDoc(convoRef, {
                brandId,
                lastMessage: message,
                updatedAt: serverTimestamp(),
                status: 'active',
                viewedByManager: false 
            }, { merge: true });

            await addDoc(collection(firestore, "conversations", chatId, "messages"), {
                text: message,
                sender: 'customer',
                timestamp: serverTimestamp()
            });

            setMessage('');
        } catch (error) { console.error(error); }
    };

    return (
        <div style={containerStyle}>
            <style>{`
                @keyframes slideIn {
                    from { transform: translateX(100%); }
                    to { transform: translateX(0); }
                }
                /* Mobile optimization for Catalog */
                @media (max-width: 768px) {
                    .catalog-sidebar {
                        position: absolute !important;
                        right: 0;
                        top: 0;
                        height: 100%;
                        width: 85% !important;
                        z-index: 50;
                        box-shadow: -10px 0 30px rgba(0,0,0,0.5);
                    }
                    .message-bubble { maxWidth: 90% !important; }
                }
            `}</style>

            {/* Header */}
            <div style={headerStyle}>
                <div>
                    <div style={{ fontWeight: 800, fontSize: '16px' }}>{brandName}</div>
                    <div style={{ fontSize: '11px', color: '#C5FF41' }}>● Online</div>
                </div>
                <button onClick={() => setShowCatalog(!showCatalog)} style={catalogToggleBtn}>
                    {showCatalog ? '✕' : 'Catalog 📦'}
                </button>
            </div>

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
                {/* Messages Area */}
                <div ref={scrollRef} style={messageAreaStyle}>
                    {chatHistory.map((msg) => (
                        <div key={msg.id} className="message-bubble" style={{
                            ...messageBubbleStyle,
                            alignSelf: msg.sender === 'customer' ? 'flex-end' : 'flex-start',
                            background: msg.isOrder ? 'rgba(197, 255, 65, 0.1)' : (msg.sender === 'customer' ? '#C5FF41' : '#1A1A1A'),
                            color: msg.sender === 'customer' ? 'black' : 'white',
                            border: msg.isOrder ? '1px solid #C5FF41' : 'none',
                        }}>
                            {msg.isOrder && (
                                <div style={{ marginBottom: '8px', display: 'flex', gap: '10px' }}>
                                    <img src={msg.orderData.image} style={{ width: '45px', height: '45px', borderRadius: '8px', objectFit: 'cover' }} />
                                    <div style={{ fontSize: '12px' }}>
                                        <div style={{ fontWeight: 'bold' }}>Order Request</div>
                                        <div>{msg.orderData.quantity}x {msg.orderData.name}</div>
                                    </div>
                                </div>
                            )}
                            <div style={{ fontSize: '14px', lineHeight: '1.4' }}>{msg.text}</div>
                        </div>
                    ))}
                </div>

                {/* Sidebar Catalog */}
                {showCatalog && (
                    <div className="catalog-sidebar" style={sidebarStyle}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                            <h4 style={{fontSize: '10px', opacity: 0.5, letterSpacing: '1px', margin: 0}}>STORE_CATALOG</h4>
                            {/* Mobile Close button inside catalog */}
                            <button onClick={() => setShowCatalog(false)} style={{background: 'none', border: 'none', color: '#666', fontSize: '18px'}}>✕</button>
                        </div>
                        {catalogItems.map(item => (
                            <ProductCard key={item.id} item={item} onAddToCart={(it: any) => setOrderModal(it)} />
                        ))}
                    </div>
                )}
            </div>

            {/* Order Modal */}
            {orderModal && (
                <div style={modalOverlay}>
                    <div style={glassModal}>
                        <h3 style={{marginTop: 0, fontSize: '18px'}}>Order Quantity</h3>
                        <p style={{opacity: 0.7, fontSize: '14px'}}>{orderModal.name}</p>
                        <input 
                            type="number" 
                            min="1"
                            value={quantity} 
                            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                            style={quantityInput}
                        />
                        <div style={{display: 'flex', gap: '10px'}}>
                            <button onClick={() => {/* handle send order */}} style={primaryBtn}>Confirm</button>
                            <button onClick={() => setOrderModal(null)} style={secondaryBtn}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <form onSubmit={handleSend} style={inputContainerStyle}>
                <input 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Ask us anything..."
                    style={inputStyle}
                />
                <button type="submit" style={sendBtnStyle}>→</button>
            </form>
        </div>
    );
};

// --- RESPONSIVE STYLES ---
const containerStyle: React.CSSProperties = { backgroundColor: '#000', height: '100dvh', display: 'flex', flexDirection: 'column', color: 'white', position: 'fixed', width: '100%', top: 0, left: 0 };
const headerStyle: React.CSSProperties = { padding: '15px 20px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#000', zIndex: 10 };
const catalogToggleBtn: React.CSSProperties = { background: '#1A1A1A', color: 'white', border: '1px solid #333', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer' };
const messageAreaStyle: React.CSSProperties = { flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '30px' };
const messageBubbleStyle: React.CSSProperties = { padding: '12px 16px', borderRadius: '20px', maxWidth: '75%', wordWrap: 'break-word' };
const sidebarStyle: React.CSSProperties = { width: '280px', background: '#080808', borderLeft: '1px solid #222', padding: '15px', overflowY: 'auto', animation: 'slideIn 0.3s ease' };
const inputContainerStyle: React.CSSProperties = { padding: '15px', display: 'flex', gap: '8px', background: '#000', borderTop: '1px solid #111' };
const inputStyle: React.CSSProperties = { flex: 1, background: '#111', border: '1px solid #333', color: 'white', padding: '12px 20px', borderRadius: '25px', outline: 'none', fontSize: '16px' }; // 16px prevents iOS zoom on focus
const sendBtnStyle: React.CSSProperties = { background: '#C5FF41', border: 'none', width: '45px', height: '45px', borderRadius: '50%', cursor: 'pointer', flexShrink: 0, fontSize: '20px' };

const modalOverlay: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' };
const glassModal: React.CSSProperties = { background: '#111', border: '1px solid #333', padding: '25px', borderRadius: '24px', width: '100%', maxWidth: '320px', textAlign: 'center' };
const quantityInput: React.CSSProperties = { width: '100%', backgroundColor: '#000', border: '1px solid #333', borderRadius: '12px', padding: '12px', color: 'white', marginBottom: '20px', textAlign: 'center', fontSize: '24px' };
const primaryBtn: React.CSSProperties = { background: '#C5FF41', color: 'black', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', flex: 1 };
const secondaryBtn: React.CSSProperties = { background: 'transparent', color: 'white', border: '1px solid #333', padding: '14px', borderRadius: '12px', cursor: 'pointer', flex: 1 };

export default CustomerChat;