import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import CustomerChat from './CustomerChat';

const MarketFront = ({ brandId: propBrandId }: { brandId?: string }) => {
    const { brandId: urlBrandId } = useParams();
    const brandId = propBrandId || urlBrandId;
    const [brand, setBrand] = useState<any>(null);
    const [catalog, setCatalog] = useState([]);
    const [cart, setCart] = useState([]);
    const navigate = useNavigate();
    const navigateToChat = () => {
        navigate(`/chat/${brandId}`); // Cleaner, faster transition
    };

    useEffect(() => {
        const fetchMarketData = async () => {
            if (!brandId) {
                console.error("No Brand ID found!");
                return;
            }

            try {
                // 1. Fetch Brand Info
                const brandDoc = await getDoc(doc(db, "brands", brandId));
                if (brandDoc.exists()) {
                    setBrand(brandDoc.data());
                } else {
                    // Fallback brand data so it doesn't stay stuck if the doc isn't created yet
                    setBrand({ name: "My Store" });
                }

                // 2. Fetch Catalog
                const querySnapshot = await getDocs(collection(db, "brands", brandId, "catalog"));
                const items = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                setCatalog(items);
            } catch (error) {
                console.error("Error fetching market data:", error);
            }
        };

        fetchMarketData();
    }, [brandId]);

    const addToCart = (item, e) => {
        setCart([...cart, item]);
        
        // --- TEMU FLY ANIMATION ---
        const rect = e.target.getBoundingClientRect();
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
            dot.style.top = '90%';
            dot.style.left = '50%';
            dot.style.transform = 'scale(0.2)';
            dot.style.opacity = '0';
        }, 50);
        setTimeout(() => dot.remove(), 750);
    };

    if (!brand) return <div style={loaderStyle}>INITIALIZING_MARKET...</div>;

    // Calculate total for the Temu checkout bar
    const total = cart.reduce((acc, item: any) => acc + (parseFloat(item.price) || 0), 0);

    return (
        <div style={marketContainer}>
            <header style={headerStyle}>
                <div>
                    <h1 style={brandTitle}>{brand.name?.toUpperCase() || 'STORE'}</h1>
                    <div style={onlineStatus}><span style={dot} /> Accepting Orders</div>
                </div>
                <button onClick={navigateToChat} style={dmButton}>Direct Message</button>
            </header>

            <div style={productGrid}>
                {catalog.length === 0 ? (
                    <div style={{gridColumn: '1/-1', textAlign: 'center', padding: '40px', opacity: 0.5}}>
                        No products in catalog yet.
                    </div>
                ) : (
                    catalog.map((item: any) => (
                        <div key={item.id} style={productCard}>
                            <div style={imageWrapper}>
                                <img src={item.image} alt={item.name} style={productImg} />
                                <button onClick={(e) => addToCart(item, e)} style={addToCartBtn}>+</button>
                            </div>
                            <div style={productInfo}>
                                <div style={itemName}>{item.name}</div>
                                <div style={priceTag}>€{item.price}</div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {cart.length > 0 && (
                <div style={floatingCart}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '10px', color: '#666' }}>{cart.length} ITEMS</span>
                        <span style={{ fontWeight: 800 }}>€{total.toFixed(2)}</span>
                    </div>
                    <button onClick={navigateToChat} style={checkoutBtn}>CHECKOUT_NOW</button>
                </div>
            )}
        </div>
    );
};

// --- UPDATED STYLES ---
const marketContainer = { backgroundColor: '#000', minHeight: '100vh', color: 'white', padding: '20px', paddingBottom: '120px' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '40px 0 20px 0' };
const brandTitle = { fontSize: '20px', fontWeight: 900, letterSpacing: '2px', marginBottom: '4px' };
const onlineStatus = { fontSize: '11px', color: '#666', display: 'flex', alignItems: 'center', gap: '6px' };
const dot = { width: '6px', height: '6px', background: '#C5FF41', borderRadius: '50%' };
const dmButton = { background: '#111', color: 'white', border: '1px solid #222', padding: '10px 18px', borderRadius: '40px', fontSize: '12px', fontWeight: 600 };
const productGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' };
const productCard = { background: '#080808', borderRadius: '20px', overflow: 'hidden' };
const imageWrapper = { position: 'relative' as 'relative', height: '180px', background: '#111' };
const productImg = { width: '100%', height: '100%', objectFit: 'cover' as 'cover' };
const addToCartBtn = { position: 'absolute' as 'absolute', bottom: '10px', right: '10px', width: '36px', height: '36px', borderRadius: '50%', background: '#C5FF41', color: 'black', fontSize: '20px', border: 'none', fontWeight: 800, cursor: 'pointer' };
const productInfo = { padding: '12px' };
const itemName = { fontSize: '13px', color: '#999', marginBottom: '4px' };
const priceTag = { fontSize: '16px', fontWeight: 700 };
const floatingCart = { position: 'fixed' as 'fixed', bottom: '30px', left: '20px', right: '20px', background: 'rgba(17,17,17,0.95)', backdropFilter: 'blur(10px)', padding: '15px 25px', borderRadius: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #C5FF41', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', zIndex: 100 };
const checkoutBtn = { background: '#C5FF41', padding: '12px 24px', borderRadius: '30px', border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: '14px' };
const loaderStyle = { color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', letterSpacing: '2px' };

export default MarketFront;