import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { ref as dbRef, onValue } from "firebase/database";
import { ProductCard } from './ProductView'; // Use the shared component for identical UI

const MarketFront = ({ brandId: propBrandId }: { brandId?: string }) => {
    const { brandId: urlBrandId } = useParams();
    const brandId = propBrandId || urlBrandId;

    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [brand, setBrand] = useState<any>(null);
    const [catalog, setCatalog] = useState<any[]>([]);
    const [orderModal, setOrderModal] = useState<any>(null);
    const [quantity, setQuantity] = useState(1);
    
    const navigate = useNavigate();

    useEffect(() => {
        if (!brandId) return;

        // Fetch Brand Identity
        const brandPath = dbRef(db, `users/${brandId}/brandData`);
        onValue(brandPath, (snapshot) => {
            const data = snapshot.val();
            setBrand(data || { name: "My Store" });
        });

        // Fetch Catalog Items
        const catalogPath = dbRef(db, `users/${brandId}/catalog`);
        onValue(catalogPath, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setCatalog(Object.keys(data).map(k => ({ id: k, ...data[k] })));
            } else {
                setCatalog([]);
            }
        });
    }, [brandId]);

    // When they click "Confirm" in the modal, we send them to chat
    const handleConfirmOrder = () => {
        if (!orderModal) return;
        // In a real flow, you might pass the order data via state or a global cart
        setOrderModal(null);
        navigate(`/chat/${brandId}`, { 
            state: { 
                pendingOrder: { ...orderModal, quantity } 
            } 
        });
    };

    if (!brand) return <div style={loaderStyle}>INITIALIZING_MARKET...</div>;

    return (
        <div style={marketContainer}>
            <header style={headerStyle}>
                <div>
                    <h1 style={brandTitle}>{brand.name?.toUpperCase() || 'STORE'}</h1>
                    <div style={onlineStatus}><span style={dotStyle} /> Accepting Orders</div>
                </div>
                <button onClick={() => navigate(`/chat/${brandId}`)} style={dmButton}>Direct Message</button>
            </header>

            <div style={productGrid}>
                {catalog.length === 0 ? (
                    <div style={emptyState}>No products in catalog yet.</div>
                ) : (
                    catalog.map((item: any) => (
                        <div 
                            key={item.id} 
                            style={{ cursor: 'pointer' }} 
                            onClick={() => setSelectedProduct(item)}
                        >
                            <ProductCard 
                                item={item} 
                                onAddToCart={(it) => {
                                    // Stop propagation so clicking '+' doesn't open the big popup
                                    it.stopPropagation?.(); 
                                    setOrderModal(it);
                                }} 
                            />
                        </div>
                    ))
                )}
            </div>
            {/* --- BIG PRODUCT DISPLAY POPUP --- */}
            {selectedProduct && (
                <div style={modalOverlay} onClick={() => setSelectedProduct(null)}>
                    <div style={bigDisplayCard} onClick={e => e.stopPropagation()}>
                        <button style={closeBtn} onClick={() => setSelectedProduct(null)}>✕</button>
                        
                        <img src={selectedProduct.image} style={bigImage} alt={selectedProduct.name} />
                        
                        <div style={{ padding: '25px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <h2 style={bigTitle}>{selectedProduct.name}</h2>
                                <div style={bigPrice}>{selectedProduct.currency || '€'}{selectedProduct.price}</div>
                            </div>
                            
                            <p style={bigDescription}>
                                {selectedProduct.description || "No description available for this item."}
                            </p>

                            <button 
                                style={bigActionBtn}
                                onClick={() => {
                                    setOrderModal(selectedProduct);
                                    setSelectedProduct(null);
                                }}
                            >
                                ADD TO ORDER
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Order Popup - Exactly like CustomerChat */}
            {orderModal && (
                <div style={modalOverlay}>
                    <div style={glassModal}>
                        <h3 style={{marginTop: 0, fontSize: '18px'}}>Order Quantity</h3>
                        <p style={{opacity: 0.7, fontSize: '14px', marginBottom: '20px'}}>{orderModal.name}</p>
                        
                        <input 
                            type="number" 
                            min="1"
                            value={quantity} 
                            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                            style={quantityInput}
                        />

                        <div style={{display: 'flex', gap: '10px'}}>
                            <button onClick={handleConfirmOrder} style={primaryBtn}>Confirm Order</button>
                            <button onClick={() => setOrderModal(null)} style={secondaryBtn}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- STYLES ---
const marketContainer: React.CSSProperties = { 
    backgroundColor: '#000', 
    minHeight: '100vh', 
    color: 'white', 
    padding: '20px' 
};

const headerStyle: React.CSSProperties = { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: '40px 0 30px 0' 
};

const brandTitle: React.CSSProperties = { fontSize: '20px', fontWeight: 900, letterSpacing: '1px' };
const onlineStatus: React.CSSProperties = { fontSize: '11px', color: '#666', display: 'flex', alignItems: 'center', gap: '6px' };
const dotStyle: React.CSSProperties = { width: '6px', height: '6px', background: '#C5FF41', borderRadius: '50%' };
const dmButton: React.CSSProperties = { background: '#111', color: 'white', border: '1px solid #222', padding: '10px 18px', borderRadius: '40px', fontSize: '12px', fontWeight: 600 };

// 2-column grid that makes cards look vertical/square rather than horizontal
const productGrid: React.CSSProperties = { 
    display: 'grid', 
    gridTemplateColumns: '1fr 1fr', 
    gap: '8px',
    marginTop: '20px' 
};

const cardWrapper: React.CSSProperties = {
    width: '100%',
    // This ensures the ProductCard inside follows the same look as the sidebar
};

// Big Display Card Styles
const bigDisplayCard: React.CSSProperties = {
    background: '#111',
    width: '90%',
    maxWidth: '450px',
    borderRadius: '32px',
    overflow: 'hidden',
    position: 'relative',
    border: '1px solid #222',
    animation: 'slideUp 0.3s ease-out'
};

const bigImage: React.CSSProperties = {
    width: '100%',
    height: '350px',
    objectFit: 'cover'
};

const closeBtn: React.CSSProperties = {
    position: 'absolute',
    top: '20px',
    right: '20px',
    background: 'rgba(0,0,0,0.5)',
    color: 'white',
    border: 'none',
    width: '35px',
    height: '35px',
    borderRadius: '50%',
    cursor: 'pointer',
    zIndex: 10,
    backdropFilter: 'blur(5px)'
};

const bigTitle: React.CSSProperties = { margin: 0, fontSize: '24px', fontWeight: 800 };

const bigPrice: React.CSSProperties = { 
    fontSize: '20px', 
    fontWeight: 800, 
    color: '#C5FF41',
    background: 'rgba(197, 255, 65, 0.1)',
    padding: '4px 12px',
    borderRadius: '10px'
};

const bigDescription: React.CSSProperties = {
    color: '#999',
    lineHeight: '1.6',
    margin: '20px 0',
    fontSize: '14px'
};

const bigActionBtn: React.CSSProperties = {
    width: '100%',
    background: '#C5FF41',
    color: 'black',
    border: 'none',
    padding: '18px',
    borderRadius: '16px',
    fontWeight: 900,
    fontSize: '16px',
    cursor: 'pointer',
    letterSpacing: '1px'
};

// Modal Styles (Mirrored from CustomerChat)
const modalOverlay: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const glassModal: React.CSSProperties = { background: '#111', border: '1px solid #333', padding: '30px', borderRadius: '24px', width: '300px', textAlign: 'center' };
const quantityInput: React.CSSProperties = { width: '100%', backgroundColor: '#000', border: '1px solid #333', borderRadius: '12px', padding: '12px', color: 'white', marginBottom: '20px', textAlign: 'center', fontSize: '20px', outline: 'none' };
const primaryBtn: React.CSSProperties = { background: '#C5FF41', color: 'black', border: 'none', padding: '12px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', flex: 1 };
const secondaryBtn: React.CSSProperties = { background: 'transparent', color: 'white', border: '1px solid #333', padding: '12px', borderRadius: '12px', cursor: 'pointer', flex: 1 };
const loaderStyle: React.CSSProperties = { color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', letterSpacing: '2px', fontSize: '12px' };
const emptyState: React.CSSProperties = { gridColumn: '1/-1', textAlign: 'center', padding: '60px', opacity: 0.3, fontSize: '14px' };

export default MarketFront;