import React, { useState, useEffect, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { 
  doc, setDoc, addDoc, collection, serverTimestamp, 
  query, orderBy, onSnapshot 
} from "firebase/firestore";
import { db, firestore } from "../firebase"; 
import { useParams } from 'react-router-dom';
import { ref as dbRef, onValue, get } from "firebase/database";
import { ProductCard } from './ProductView';

const CustomerChat = ({ brandId: propBrandId }: { brandId?: string }) => {
    // 1. Get Brand ID from URL (Ensure your Route is <Route path="/chat/:brandId" ... />)
    const { brandId: urlBrandId } = useParams();
    const brandId = propBrandId || urlBrandId || '';
    
    const [chatId, setChatId] = useState<string>('');
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState<any[]>([]);
    const [brandData, setBrandData] = useState<any>(null);
    const [showCatalog, setShowCatalog] = useState(false);
    const [catalogItems, setCatalogItems] = useState<any[]>([]);
    const [orderModal, setOrderModal] = useState<any>(null);
    const [quantity, setQuantity] = useState(1);
    
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll logic
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chatHistory]);

    // 2. Fetch Brand Identity & Catalog (Fixed Pathing)
    useEffect(() => {
        if (!brandId) return;

        // Path should match your Dashboard's saving logic
        // If you store brand info under /brands/ID instead of users/ID, change this path:
        const brandInfoRef = dbRef(db, `users/${brandId}/brandData`);
        const catalogRef = dbRef(db, `users/${brandId}/catalog`);

        const unsubBrand = onValue(brandInfoRef, (snapshot) => {
            if (snapshot.exists()) {
                setBrandData(snapshot.val());
            } else {
                setBrandData({ name: "Malvin Partner" });
            }
        });

        const unsubCatalog = onValue(catalogRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setCatalogItems(Object.keys(data).map(k => ({ id: k, ...data[k] })));
            }
        });

        return () => { unsubBrand(); unsubCatalog(); };
    }, [brandId]);

    // 3. Setup Persistent Chat Session for this specific Brand
    useEffect(() => {
        if (!brandId) return;
        let id = localStorage.getItem(`malvin_chat_${brandId}`);
        if (!id) {
            id = uuidv4(); 
            localStorage.setItem(`malvin_chat_${brandId}`, id);
        }
        setChatId(id);
    }, [brandId]);

    // 4. Firestore listener for the specific conversation
    useEffect(() => {
        if (!chatId) return;
        const q = query(collection(firestore, "conversations", chatId, "messages"), orderBy("timestamp", "asc"));
        return onSnapshot(q, (snapshot) => {
            setChatHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
    }, [chatId]);

    const handleSend = async (e?: React.FormEvent, customMsg?: string, isOrder = false, orderData?: any) => {
        if (e) e.preventDefault();
        const textToSend = customMsg || message;
        if (!textToSend.trim() || !chatId) return;

        try {
            const convoRef = doc(firestore, "conversations", chatId);
            
            // Update the main conversation doc (for the Manager's list)
            await setDoc(convoRef, {
                brandId: brandId, // Link this chat to the specific owner
                brandName: brandData?.name || 'Brand',
                lastMessage: textToSend,
                updatedAt: serverTimestamp(),
                status: 'active',
                viewedByManager: false 
            }, { merge: true });

            // Add the message to the subcollection
            await addDoc(collection(firestore, "conversations", chatId, "messages"), {
                text: textToSend,
                sender: 'customer',
                timestamp: serverTimestamp(),
                isOrder: isOrder,
                orderData: orderData || null
            });

            if (!customMsg) setMessage('');
        } catch (error) { console.error("Send Error:", error); }
    };

    const confirmOrder = () => {
        if (!orderModal) return;
        const orderText = `I'd like to order ${quantity}x ${orderModal.name}`;
        handleSend(undefined, orderText, true, {
            name: orderModal.name,
            quantity: quantity,
            image: orderModal.image,
            price: orderModal.price
        });
        setOrderModal(null);
        setQuantity(1);
        setShowCatalog(false);
    };

    return (
        <div style={containerStyle}>
            <style>{`
                @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
                @media (max-width: 768px) {
                    .catalog-sidebar { position: absolute !important; right: 0; top: 0; height: 100%; width: 85% !important; z-index: 50; box-shadow: -10px 0 30px rgba(0,0,0,0.5); }
                    .message-bubble { maxWidth: 90% !important; }
                }
            `}</style>

            {/* Header - Now shows Brand Info dynamically */}
            <div style={headerStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {brandData?.logo && <img src={brandData.logo} style={{ width: '30px', height: '30px', borderRadius: '50%' }} />}
                    <div>
                        <div style={{ fontWeight: 800, fontSize: '16px' }}>{brandData?.name || "Loading..."}</div>
                        <div style={{ fontSize: '11px', color: '#C5FF41' }}>● Online</div>
                    </div>
                </div>
                <button onClick={() => setShowCatalog(!showCatalog)} style={catalogToggleBtn}>
                    {showCatalog ? '✕' : 'Catalog 📦'}
                </button>
            </div>

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
                <div ref={scrollRef} style={messageAreaStyle}>
                    {/* Welcome Message */}
                    <div style={{...messageBubbleStyle, alignSelf: 'flex-start', background: '#1A1A1A', color: 'white'}}>
                        Hello! Welcome to <b>{brandData?.name}</b>. How can I help you today?
                    </div>

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

                {/* Sidebar Catalog - Only shows this brand's items */}
                {showCatalog && (
                    <div className="catalog-sidebar" style={sidebarStyle}>
                        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px'}}>
                            <h4 style={{fontSize: '10px', opacity: 0.5, letterSpacing: '1px', margin: 0}}>STORE_CATALOG</h4>
                            <button onClick={() => setShowCatalog(false)} style={{background: 'none', border: 'none', color: '#666', fontSize: '18px'}}>✕</button>
                        </div>
                        {catalogItems.length > 0 ? catalogItems.map(item => (
                            <ProductCard key={item.id} item={item} onAddToCart={(it: any) => setOrderModal(it)} />
                        )) : (
                            <div style={{ fontSize: '12px', opacity: 0.5, textAlign: 'center', marginTop: '20px' }}>No items available</div>
                        )}
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
                            <button onClick={confirmOrder} style={primaryBtn}>Confirm</button>
                            <button onClick={() => setOrderModal(null)} style={secondaryBtn}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

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

// ... Styles (Container, Header, etc. remain the same as your previous snippet)
const containerStyle: React.CSSProperties = { backgroundColor: '#000', height: '100dvh', display: 'flex', flexDirection: 'column', color: 'white', position: 'fixed', width: '100%', top: 0, left: 0 };
const headerStyle: React.CSSProperties = { padding: '15px 20px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#000', zIndex: 10 };
const catalogToggleBtn: React.CSSProperties = { background: '#1A1A1A', color: 'white', border: '1px solid #333', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer' };
const messageAreaStyle: React.CSSProperties = { flex: 1, padding: '15px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '30px' };
const messageBubbleStyle: React.CSSProperties = { padding: '12px 16px', borderRadius: '20px', maxWidth: '75%', wordWrap: 'break-word' };
const sidebarStyle: React.CSSProperties = { width: '280px', background: '#080808', borderLeft: '1px solid #222', padding: '15px', overflowY: 'auto', animation: 'slideIn 0.3s ease' };
const inputContainerStyle: React.CSSProperties = { padding: '15px', display: 'flex', gap: '8px', background: '#000', borderTop: '1px solid #111' };
const inputStyle: React.CSSProperties = { flex: 1, background: '#111', border: '1px solid #333', color: 'white', padding: '12px 20px', borderRadius: '25px', outline: 'none', fontSize: '16px' }; 
const sendBtnStyle: React.CSSProperties = { background: '#C5FF41', border: 'none', width: '45px', height: '45px', borderRadius: '50%', cursor: 'pointer', flexShrink: 0, fontSize: '20px' };
const modalOverlay: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' };
const glassModal: React.CSSProperties = { background: '#111', border: '1px solid #333', padding: '25px', borderRadius: '24px', width: '100%', maxWidth: '320px', textAlign: 'center' };
const quantityInput: React.CSSProperties = { width: '100%', backgroundColor: '#000', border: '1px solid #333', borderRadius: '12px', padding: '12px', color: 'white', marginBottom: '20px', textAlign: 'center', fontSize: '24px' };
const primaryBtn: React.CSSProperties = { background: '#C5FF41', color: 'black', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', flex: 1 };
const secondaryBtn: React.CSSProperties = { background: 'transparent', color: 'white', border: '1px solid #333', padding: '14px', borderRadius: '12px', cursor: 'pointer', flex: 1 };

export default CustomerChat;