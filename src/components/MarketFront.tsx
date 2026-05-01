import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { ref as dbRef, onValue } from "firebase/database";

const MarketFront = ({ brandId: propBrandId }: { brandId?: string }) => {
    const { brandId: urlBrandId } = useParams();
    const brandId = propBrandId || urlBrandId;
    const [brand, setBrand] = useState<any>(null);
    const [catalog, setCatalog] = useState<any[]>([]);
    const [cart, setCart] = useState<any[]>([]);
    const navigate = useNavigate();

    const navigateToChat = () => {
        navigate(`/chat/${brandId}`);
    };

    useEffect(() => {
        if (!brandId) return;

        // Fetch Brand Identity
        const brandPath = dbRef(db, `users/${brandId}/brandData`);
        const unsubscribeBrand = onValue(brandPath, (snapshot) => {
            const data = snapshot.val();
            setBrand(data || { name: "My Store" });
        });

        // Fetch Catalog Items
        const catalogPath = dbRef(db, `users/${brandId}/catalog`);
        const unsubscribeCatalog = onValue(catalogPath, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const items = Object.keys(data).map(k => ({ id: k, ...data[k] }));
                setCatalog(items);
            } else {
                setCatalog([]);
            }
        });

        return () => {
            unsubscribeBrand();
            unsubscribeCatalog();
        };
    }, [brandId]);

    const addToCart = (item: any, e: React.MouseEvent) => {
        setCart([...cart, item]);
        
        // --- TEMU FLY ANIMATION ---
        const rect = (e.target as HTMLElement).getBoundingClientRect();
        const dot = document.createElement('div');
        dot.style.cssText = `
            position: fixed;
            top: ${rect.top}px;
            left: ${rect.left}px;
            width: 20px;
            height: 20px;
            background: #C5FF41;
            border-radius: 50%;
            z-index: 1000;
            transition: all 0.7s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        `;
        document.body.appendChild(dot);

        setTimeout(() => {
            dot.style.top = '95%';
            dot.style.left = '50%';
            dot.style.transform = 'scale(0.2)';
            dot.style.opacity = '0';
        }, 50);
        setTimeout(() => dot.remove(), 750);
    };

    if (!brand) return <div style={loaderStyle}>INITIALIZING_MARKET...</div>;

    const total = cart.reduce((acc, item: any) => acc + (parseFloat(item.price) || 0), 0);

    return (
        <div style={marketContainer}>
            <header style={headerStyle}>
                <div>
                    <h1 style={brandTitle}>{brand.name?.toUpperCase() || 'STORE'}</h1>
                    <div style={onlineStatus}><span style={dotStyle} /> Accepting Orders</div>
                </div>
                <button onClick={navigateToChat} style={dmButton}>Direct Message</button>
            </header>

            <div style={productGrid}>
                {catalog.length === 0 ? (
                    <div style={emptyState}>No products in catalog yet.</div>
                ) : (
                    catalog.map((item: any) => (
                        <div key={item.id} style={productCard}>
                            {/* Image Container with Absolute Add Button */}
                            <div style={imageWrapper}>
                                <img src={item.image} alt={item.name} style={productImg} />
                                <button 
                                    onClick={(e) => addToCart(item, e)} 
                                    style={addToCartBtn}
                                >
                                    +
                                </button>
                            </div>
                            
                            {/* Product Details */}
                            <div style={productInfo}>
                                <div style={itemName}>{item.name}</div>
                                <div style={priceTag}>
                                    <span style={{color: '#C5FF41', marginRight: '2px'}}>{item.currency || '€'}</span>
                                    {item.price}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Floating Checkout Bar */}
            {cart.length > 0 && (
                <div style={floatingCart}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '10px', color: '#666', fontWeight: 700 }}>{cart.length} ITEMS SELECTED</span>
                        <span style={{ fontWeight: 900, fontSize: '18px' }}>€{total.toFixed(2)}</span>
                    </div>
                    <button onClick={navigateToChat} style={checkoutBtn}>CHECKOUT_NOW</button>
                </div>
            )}
        </div>
    );
};

// --- STYLES ---
const marketContainer: React.CSSProperties = { backgroundColor: '#000', minHeight: '100vh', color: 'white', padding: '20px', paddingBottom: '120px' };
const headerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '40px 0 20px 0' };
const brandTitle: React.CSSProperties = { fontSize: '22px', fontWeight: 900, letterSpacing: '1px', marginBottom: '4px' };
const onlineStatus: React.CSSProperties = { fontSize: '11px', color: '#666', display: 'flex', alignItems: 'center', gap: '6px' };
const dotStyle: React.CSSProperties = { width: '6px', height: '6px', background: '#C5FF41', borderRadius: '50%' };
const dmButton: React.CSSProperties = { background: '#111', color: 'white', border: '1px solid #222', padding: '10px 18px', borderRadius: '40px', fontSize: '12px', fontWeight: 600 };

const productGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' };

const productCard: React.CSSProperties = { 
    background: '#111', 
    borderRadius: '20px', 
    overflow: 'hidden',
    border: '1px solid #222' 
};

const imageWrapper: React.CSSProperties = { 
    position: 'relative', 
    height: '160px', 
    background: '#080808' 
};

const productImg: React.CSSProperties = { 
    width: '100%', 
    height: '100%', 
    objectFit: 'cover' 
};

const addToCartBtn: React.CSSProperties = { 
    position: 'absolute', 
    bottom: '10px', 
    right: '10px', 
    width: '38px', 
    height: '38px', 
    borderRadius: '50%', 
    background: '#C5FF41', 
    color: 'black', 
    fontSize: '24px', 
    border: 'none', 
    fontWeight: 800, 
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 15px rgba(0,0,0,0.4)'
};

const productInfo: React.CSSProperties = { padding: '12px' };
const itemName: React.CSSProperties = { fontSize: '13px', fontWeight: 500, color: '#fff', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const priceTag: React.CSSProperties = { fontSize: '16px', fontWeight: 900 };

const floatingCart: React.CSSProperties = { position: 'fixed', bottom: '30px', left: '20px', right: '20px', background: 'rgba(15,15,15,0.9)', backdropFilter: 'blur(15px)', padding: '15px 25px', borderRadius: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #333', boxShadow: '0 20px 40px rgba(0,0,0,0.7)', zIndex: 100 };
const checkoutBtn: React.CSSProperties = { background: '#C5FF41', padding: '12px 24px', borderRadius: '30px', border: 'none', fontWeight: 900, cursor: 'pointer', fontSize: '14px', color: 'black' };
const loaderStyle: React.CSSProperties = { color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', letterSpacing: '2px', fontSize: '12px' };
const emptyState: React.CSSProperties = { gridColumn: '1/-1', textAlign: 'center', padding: '60px', opacity: 0.3, fontSize: '14px' };

export default MarketFront;