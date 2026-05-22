import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { ref as dbRef, onValue } from "firebase/database";
import { ProductCard } from './ProductView';
import CustomerChat from './CustomerChat';

// Reusable Verified Badge Component
const VerifiedBadge = () => (
    <svg 
        width="14" 
        height="14" 
        viewBox="0 0 24 24" 
        fill="#007fff" 
        style={{ display: 'inline-block', marginLeft: '6px', verticalAlign: 'middle' }}
    >
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
);

const MarketFront = ({ brandId: propBrandId, userBrand, brandName }: { brandId?: string, userBrand?: any, brandName?: string }) => {
    const { brandId: urlBrandId } = useParams();
    const brandId = propBrandId || urlBrandId;

    const [view, setView] = useState<'market' | 'chat' | 'booking'>('market');
    const [bookedDates, setBookedDates] = useState<string[]>([]);
    
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [brand, setBrand] = useState<any>(userBrand || null);
    const [catalog, setCatalog] = useState<any[]>([]);
    const [orderModal, setOrderModal] = useState<any>(null);
    const [quantity, setQuantity] = useState(1);
    const [isLocked, setIsLocked] = useState(false);

    // Dynamic Profile States (Bio & Meta Verification)
    const [bio, setBio] = useState('');
    const [isVerified, setIsVerified] = useState(false);
    useEffect(() => {
        const link = document.querySelector("link[rel='manifest']");
        if (link) link.setAttribute("href", "/market-manifest.json");
    }, []);

    // Sync Panic Button/System Settings
    useEffect(() => {
        const settingsRef = dbRef(db, 'system_settings');
        const unsubscribe = onValue(settingsRef, (snapshot) => {
            const data = snapshot.val();
            if (data && data.market_lockdown === true) {
                setIsLocked(true);
            } else {
                setIsLocked(false);
            }
        });
        return () => unsubscribe();
    }, []);
    
    const navigate = useNavigate();

    // Sync Booked Dates
    useEffect(() => {
        if (!brandId) return;
        const bookingsPath = dbRef(db, `users/${brandId}/bookings`);
        const unsubscribe = onValue(bookingsPath, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setBookedDates(Object.values(data).map((b: any) => b.date));
            } else {
                setBookedDates([]);
            }
        });
        return () => unsubscribe();
    }, [brandId]);

    // Sync Brand Profile (Bio & Verification Status)
    useEffect(() => {
        if (!brandId) return;
        const profilePath = dbRef(db, `users/${brandId}/profile`);
        const unsubscribe = onValue(profilePath, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setBio(data.bio || '');
                setIsVerified(data.isVerified || false);
            }
        });
        return () => unsubscribe();
    }, [brandId]);

    // Sync Brand Identity and Catalog
    useEffect(() => {
        if (!brandId) return;
        const brandPath = dbRef(db, `users/${brandId}/brandData`);
        const unsubscribeBrand = onValue(brandPath, (snapshot) => {
            setBrand(snapshot.val() || { name: "Store" });
        });

        const catalogPath = dbRef(db, `users/${brandId}/catalog`);
        const unsubscribeCatalog = onValue(catalogPath, (snapshot) => {
            const data = snapshot.val();
            setCatalog(data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : []);
        });

        return () => {
            unsubscribeBrand();
            unsubscribeCatalog();
        };
    }, [brandId]);

    const handleBookDate = (date: string) => {
        if (!date) return;
        if (bookedDates.includes(date)) {
            alert("This date is already taken!");
            return;
        }

        const newBookingRef = dbRef(db, `users/${brandId}/bookings/${Date.now()}`);
        const bookingData = {
            date: date,
            timestamp: Date.now(),
            status: 'pending'
        };

        import('firebase/database').then(({ set }) => {
            set(newBookingRef, bookingData).then(() => {
                alert(`Success! Date ${date} reserved.`);
                setView('market');
            });
        });
    };

    const handleConfirmOrder = () => {
        if (!orderModal) return;
        setOrderModal(null);
        setView('chat');
    };

    if (view === 'booking') {
        return (
            <div style={{ position: 'relative', height: '100dvh', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <button onClick={() => setView('market')} style={backToMarketBtn}>← Back</button>
                
                <div style={glassModal}>
                    <h2 style={{ color: '#C5FF41', marginBottom: '10px', fontSize: '20px' }}>RESERVE SESSION</h2>
                    <p style={{ fontSize: '11px', opacity: 0.5, marginBottom: '25px', letterSpacing: '1px' }}>SELECT AN AVAILABLE DATE</p>
                    
                    <input 
                        type="date" 
                        style={{...quantityInput, fontSize: '18px'}} 
                        min={new Date().toISOString().split('T')[0]} 
                        onChange={(e) => handleBookDate(e.target.value)}
                    />
                    
                    <div style={{ fontSize: '11px', color: bookedDates.length > 0 ? '#C5FF41' : '#444', marginTop: '10px' }}>
                        {bookedDates.length} DATES ALREADY RESERVED
                    </div>
                </div>
            </div>
        );
    }

    if (view === 'chat') {
        return (
            <div style={{ position: 'relative', height: '100dvh', backgroundColor: '#000' }}>
                <button 
                    onClick={() => setView('market')} 
                    style={backToMarketBtn}
                >
                    ← Back to Shop
                </button>
                <CustomerChat />
            </div>
        );
    }

    if (!brand) return <div style={loaderStyle}>INITIALIZING_MARKET...</div>;

    if (isLocked) {
        return (
            <div style={maintenanceContainer}>
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <h1 style={{ fontSize: '3rem', color: '#ff4d4d', marginBottom: '10px' }}>⚠️</h1>
                    <h2 style={{ letterSpacing: '2px', fontWeight: 900 }}>SYSTEM_OFFLINE</h2>
                    <p style={{ opacity: 0.5, fontSize: '12px', lineHeight: '1.6' }}>
                        The Malvin Market is currently undergoing security maintenance.<br/>
                        Please check back shortly.
                    </p>
                    <div style={pulseScanner} />
                </div>
            </div>
        );
    }

    return (
        <div style={marketContainer}>
            <style>{`
                * {
                    box-sizing: border-box;
                }
                @keyframes slideUp {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                body { overflow-x: hidden; background-color: black; margin: 0; }
                ::-webkit-scrollbar { width: 0px; }
            `}</style>

            <header style={headerStyle}>
                <div style={{ flex: 1, zIndex: 101, paddingRight: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                        <h1 style={brandTitle}>{brand.name?.toUpperCase()}</h1>
                        {isVerified && <VerifiedBadge />}
                    </div>
                    
                    {/* Dynamic User Bio Display */}
                    {bio && (
                        <p style={{ 
                            margin: '6px 0 0 0', 
                            fontSize: '12px', 
                            color: '#aaa', 
                            lineHeight: '1.4',
                            fontWeight: 400 
                        }}>
                            {bio}
                        </p>
                    )}
                    
                    <div style={onlineStatus}><span style={dotStyle} /> Active Now</div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <button onClick={() => setView('booking')} style={bookingBtnStyle}>
                        Book 🗓️
                    </button>
                    <button onClick={() => setView('chat')} style={dmButton}>
                        💬
                    </button>
                </div>
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

            {selectedProduct && (
                <div style={modalOverlay} onClick={() => setSelectedProduct(null)}>
                    <div style={bigDisplayCard} onClick={e => e.stopPropagation()}>
                        <div style={dragHandle} />
                        <button style={closeBtn} onClick={() => setSelectedProduct(null)}>✕</button>
                        <img src={selectedProduct.image} style={bigImage} alt="" />
                        <div style={{ padding: '24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <h2 style={bigTitle}>{selectedProduct.name}</h2>
                                <div style={bigPrice}>{selectedProduct.currency || '€'}{selectedProduct.price}</div>
                            </div>
                            <p style={bigDescription}>{selectedProduct.description || "Premium quality product."}</p>
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

// --- STYLES ---
const marketContainer: React.CSSProperties = { 
    backgroundColor: '#000',
    minHeight: '100dvh',
    color: 'white',
    padding: '0 12px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    overflowX: 'hidden'
};

const headerStyle: React.CSSProperties = { 
    display: 'flex', 
    width: '100%',
    maxWidth: '400px', 
    justifyContent: 'space-between', 
    alignItems: 'flex-start', 
    padding: '24px 0',
    position: 'sticky',
    top: 0,
    backgroundColor: '#000',
    zIndex: 110,
    marginBottom: '10px'
};

const productGrid: React.CSSProperties = { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: '12px',
    paddingBottom: '40px',
    width: '100%',
    maxWidth: '400px',
    boxSizing: 'border-box',
    overflowX: 'hidden'
};

const bookingBtnStyle: React.CSSProperties = { 
    background: 'rgba(255,255,255,0.1)', 
    color: 'white', 
    border: '1px solid #333', 
    padding: '10px 15px', 
    borderRadius: '24px', 
    fontSize: '13px', 
    fontWeight: 800, 
    cursor: 'pointer',
    whiteSpace: 'nowrap'
};

const backToMarketBtn: React.CSSProperties = {
    position: 'absolute',
    top: '15px',
    left: '15px',
    zIndex: 999,
    background: '#C5FF41',
    color: 'black',
    border: 'none',
    padding: '8px 14px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 'bold',
    cursor: 'pointer'
};

const maintenanceContainer: React.CSSProperties = {
    height: '100dvh',
    backgroundColor: '#000',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'monospace'
};

const pulseScanner: React.CSSProperties = {
    width: '100%',
    height: '2px',
    background: 'linear-gradient(90deg, transparent, #ff4d4d, transparent)',
    marginTop: '30px',
    animation: 'scan 2s linear infinite'
};

const cardWrapper: React.CSSProperties = { 
    cursor: 'pointer',
    width: '100%',
    minWidth: 0
};

const brandTitle: React.CSSProperties = { fontSize: '20px', fontWeight: 900, margin: 0, letterSpacing: '-0.5px', display: 'inline-block' };
const onlineStatus: React.CSSProperties = { fontSize: '11px', color: '#888', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' };
const dotStyle: React.CSSProperties = { width: '7px', height: '7px', background: '#C5FF41', borderRadius: '50%', boxShadow: '0 0 8px #C5FF41' };
const dmButton: React.CSSProperties = { background: '#C5FF41', color: 'black', border: 'none', padding: '10px 20px', borderRadius: '24px', fontSize: '13px', fontWeight: 800, cursor: 'pointer' };

const dragHandle: React.CSSProperties = { width: '40px', height: '4px', background: '#333', borderRadius: '2px', margin: '12px auto' };
const bigDisplayCard: React.CSSProperties = { background: '#111', width: '100%', maxWidth: '500px', borderTopLeftRadius: '32px', borderTopRightRadius: '32px', overflow: 'hidden', position: 'absolute', bottom: 0, border: '1px solid #222', animation: 'slideUp 0.3s ease-out', boxShadow: '0 -10px 40px rgba(0,0,0,0.5)' };
const bigImage: React.CSSProperties = { width: '100%', height: '45vh', objectFit: 'cover' };
const closeBtn: React.CSSProperties = { position: 'absolute', top: '15px', right: '15px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', width: '32px', height: '32px', borderRadius: '50%', zIndex: 11, backdropFilter: 'blur(5px)' };
const bigTitle: React.CSSProperties = { margin: 0, fontSize: '22px', fontWeight: 800 };
const bigPrice: React.CSSProperties = { fontSize: '20px', fontWeight: 800, color: '#C5FF41' };
const bigDescription: React.CSSProperties = { color: '#aaa', lineHeight: '1.6', margin: '15px 0 30px 0', fontSize: '14px' };
const bigActionBtn: React.CSSProperties = { width: '100%', background: '#C5FF41', color: 'black', border: 'none', padding: '18px', borderRadius: '18px', fontWeight: 900, fontSize: '15px' };
const modalOverlay: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const glassModal: React.CSSProperties = { background: '#121212', border: '1px solid #222', padding: '30px', borderRadius: '28px', width: '85%', maxWidth: '340px', textAlign: 'center' };
const quantityInput: React.CSSProperties = { width: '100%', backgroundColor: '#000', border: '1px solid #333', borderRadius: '16px', padding: '15px', color: 'white', marginBottom: '25px', textAlign: 'center', fontSize: '28px', fontWeight: 'bold' };
const primaryBtn: React.CSSProperties = { background: '#C5FF41', color: 'black', border: 'none', padding: '16px', borderRadius: '14px', fontWeight: 'bold', flex: 1 };
const secondaryBtn: React.CSSProperties = { background: 'transparent', color: 'white', border: '1px solid #333', padding: '16px', borderRadius: '14px', flex: 1 };
const loaderStyle: React.CSSProperties = { color: '#666', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000' };
const emptyState: React.CSSProperties = { gridColumn: '1/-1', textAlign: 'center', padding: '100px 0', opacity: 0.3, fontSize: '13px' };

export default MarketFront;