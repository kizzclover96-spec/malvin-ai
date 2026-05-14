import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { ref as dbRef, onValue } from "firebase/database";
import { ProductCard } from './ProductView';

const MarketFront = ({ brandId: propBrandId, userBrand, brandName }: { brandId?: string, userBrand?: any, brandName?: string }) => {
    const { brandId: urlBrandId } = useParams();
    const brandId = propBrandId || urlBrandId;

    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [brand, setBrand] = useState<any>(userBrand || null);
    const [catalog, setCatalog] = useState<any[]>([]);
    const [orderModal, setOrderModal] = useState<any>(null);
    const [quantity, setQuantity] = useState(1);
    
    const navigate = useNavigate();

    useEffect(() => {
        if (!brandId) return;

        const brandPath = dbRef(db, `users/${brandId}/brandData`);
        onValue(brandPath, (snapshot) => {
            const data = snapshot.val();
            setBrand(data || { name: "Store" });
        });

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

    const handleConfirmOrder = () => {
        if (!orderModal) return;
        const itemToOrder = orderModal;
        setOrderModal(null);
        // Pass order data to chat so it auto-sends
        navigate(`/chat/${brandId}`, { 
            state: { 
                pendingOrder: { ...itemToOrder, quantity } 
            } 
        });
    };

    if (!brand) return <div style={loaderStyle}>INITIALIZING_MARKET...</div>;

    return (
        <div style={marketContainer}>
            {/* Mobile-Friendly Headings & Global Styles */}
            <style>{`
                @keyframes slideUp {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                body { overflow-x: hidden; }
            `}</style>

            <header style={headerStyle}>
                <div style={{ flex: 1 }}>
                    <h1 style={brandTitle}>{brand.name?.toUpperCase()}</h1>
                    <div style={onlineStatus}><span style={dotStyle} /> Active Now</div>
                </div>
                <button onClick={() => navigate(`/chat/${brandId}`)} style={dmButton}>
                    Message 💬
                </button>
            </header>

            <div style={productGrid}>
                {catalog.length === 0 ? (
                    <div style={emptyState}>Catalog is empty.</div>
                ) : (
                    catalog.map((item: any) => (
                        <div 
                            key={item.id} 
                            style={cardWrapper} 
                            onClick={() => setSelectedProduct(item)}
                        >
                            <ProductCard 
                                item={item} 
                                onAddToCart={(it) => {
                                    setOrderModal(it);
                                }} 
                            />
                        </div>
                    ))
                )}
            </div>

            {/* PRODUCT DETAILS DRAWER (Mobile Optimized) */}
            {selectedProduct && (
                <div style={modalOverlay} onClick={() => setSelectedProduct(null)}>
                    <div style={bigDisplayCard} onClick={e => e.stopPropagation()}>
                        <div style={dragHandle} />
                        <button style={closeBtn} onClick={() => setSelectedProduct(null)}>✕</button>
                        
                        <img src={selectedProduct.image} style={bigImage} alt="" />
                        
                        <div style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <h2 style={bigTitle}>{selectedProduct.name}</h2>
                                <div style={bigPrice}>{selectedProduct.currency || '€'}{selectedProduct.price}</div>
                            </div>
                            
                            <p style={bigDescription}>
                                {selectedProduct.description || "Premium quality product."}
                            </p>

                            <button 
                                style={bigActionBtn}
                                onClick={() => {
                                    setOrderModal(selectedProduct);
                                    setSelectedProduct(null);
                                }}
                            >
                                ORDER THIS ITEM
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* QUANTITY PICKER */}
            {orderModal && (
                <div style={modalOverlay} onClick={() => setOrderModal(null)}>
                    <div style={glassModal} onClick={e => e.stopPropagation()}>
                        <h3 style={{margin: '0 0 10px 0', fontSize: '18px'}}>Select Quantity</h3>
                        <p style={{opacity: 0.6, fontSize: '12px', marginBottom: '20px'}}>{orderModal.name}</p>
                        
                        <input 
                            type="number" 
                            min="1"
                            value={quantity} 
                            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                            style={quantityInput}
                        />

                        <div style={{display: 'flex', gap: '10px'}}>
                            <button onClick={handleConfirmOrder} style={primaryBtn}>Confirm</button>
                            <button onClick={() => setOrderModal(null)} style={secondaryBtn}>Back</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- STYLES (Mobile First) ---
const marketContainer: React.CSSProperties = { 
    backgroundColor: '#000', 
    minHeight: '100dvh', 
    color: 'white', 
    padding: '16px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
};

const headerStyle: React.CSSProperties = { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: '20px 0',
    position: 'sticky',
    top: 0,
    backgroundColor: '#000',
    zIndex: 100
};

const brandTitle: React.CSSProperties = { fontSize: '18px', fontWeight: 900, margin: 0 };
const onlineStatus: React.CSSProperties = { fontSize: '10px', color: '#888', display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' };
const dotStyle: React.CSSProperties = { width: '6px', height: '6px', background: '#C5FF41', borderRadius: '50%' };
const dmButton: React.CSSProperties = { background: '#C5FF41', color: 'black', border: 'none', padding: '8px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 };

const productGrid: React.CSSProperties = { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', 
    gap: '12px',
    paddingBottom: '40px'
};

const cardWrapper: React.CSSProperties = {
    transition: 'transform 0.1s active',
};

const dragHandle: React.CSSProperties = {
    width: '40px', height: '4px', background: '#333', borderRadius: '2px', margin: '12px auto'
};

const bigDisplayCard: React.CSSProperties = {
    background: '#111',
    width: '100%',
    maxWidth: '500px',
    borderTopLeftRadius: '32px',
    borderTopRightRadius: '32px',
    overflow: 'hidden',
    position: 'absolute',
    bottom: 0,
    border: '1px solid #222',
    animation: 'slideUp 0.3s cubic-bezier(0.25, 1, 0.5, 1)'
};

const bigImage: React.CSSProperties = { width: '100%', height: '40vh', objectFit: 'cover' };

const closeBtn: React.CSSProperties = {
    position: 'absolute', top: '15px', right: '15px', background: 'rgba(0,0,0,0.5)',
    color: 'white', border: 'none', width: '30px', height: '30px', borderRadius: '50%',
    zIndex: 11, backdropFilter: 'blur(5px)'
};

const bigTitle: React.CSSProperties = { margin: 0, fontSize: '20px', fontWeight: 800 };
const bigPrice: React.CSSProperties = { fontSize: '18px', fontWeight: 800, color: '#C5FF41' };
const bigDescription: React.CSSProperties = { color: '#888', lineHeight: '1.5', margin: '15px 0 25px 0', fontSize: '13px' };

const bigActionBtn: React.CSSProperties = {
    width: '100%', background: '#C5FF41', color: 'black', border: 'none',
    padding: '16px', borderRadius: '16px', fontWeight: 900, fontSize: '14px'
};

const modalOverlay: React.CSSProperties = { 
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
    backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', 
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 
};

const glassModal: React.CSSProperties = { 
    background: '#111', border: '1px solid #333', padding: '24px', 
    borderRadius: '24px', width: '85%', maxWidth: '320px', textAlign: 'center' 
};

const quantityInput: React.CSSProperties = { 
    width: '100%', backgroundColor: '#000', border: '1px solid #333', 
    borderRadius: '12px', padding: '15px', color: 'white', marginBottom: '20px', 
    textAlign: 'center', fontSize: '24px', fontWeight: 'bold' 
};

const primaryBtn: React.CSSProperties = { background: '#C5FF41', color: 'black', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 'bold', flex: 1 };
const secondaryBtn: React.CSSProperties = { background: 'transparent', color: 'white', border: '1px solid #333', padding: '14px', borderRadius: '12px', flex: 1 };
const loaderStyle: React.CSSProperties = { color: '#666', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: '10px', letterSpacing: '1px' };
const emptyState: React.CSSProperties = { gridColumn: '1/-1', textAlign: 'center', padding: '100px 0', opacity: 0.3, fontSize: '12px' };

export default MarketFront;