import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase'; 
import { ref, set, push, onValue, remove } from "firebase/database";

const Catalog = ({ onBack, userBrand }: any) => {
    const [products, setProducts] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null); // For Detail View
    const [loading, setLoading] = useState(true);

    const [newItem, setNewItem] = useState({
        name: '',
        price: '',
        currency: '$',
        details: '',
        image: '' 
    });

    const currencies = [
        { label: 'USD ($)', value: '$' },
        { label: 'EUR (€)', value: '€' },
        { label: 'GBP (£)', value: '£' },
        { label: 'JPY (¥)', value: '¥' },
        { label: 'NGN (₦)', value: '₦' }
    ];

    useEffect(() => {
        const userId = auth.currentUser?.uid;
        if (!userId) return;
        const catalogRef = ref(db, `users/${userId}/catalog`);
        const unsubscribe = onValue(catalogRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const list = Object.keys(data).map(key => ({ id: key, ...data[key] }));
                setProducts(list);
            } else { setProducts([]); }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewItem({ ...newItem, image: reader.result as string });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        const userId = auth.currentUser?.uid;
        if (!userId || !newItem.name) return;
        try {
            const catalogRef = ref(db, `users/${userId}/catalog`);
            await set(push(catalogRef), newItem);
            setNewItem({ name: '', price: '', currency: '$', details: '', image: '' });
            setShowModal(false);
        } catch (error) { console.error(error); }
    };

    const handleDelete = async (e: React.MouseEvent, productId: string) => {
        e.stopPropagation(); // Prevents opening the detail modal
        if (!window.confirm("Acknowledge: Permanent deletion of asset?")) return;
        const userId = auth.currentUser?.uid;
        const itemRef = ref(db, `users/${userId}/catalog/${productId}`);
        await remove(itemRef);
    };

    return (
        <div style={{ width: '100vw', minHeight: '100vh', backgroundColor: '#050505', color: 'white', padding: '60px 100px', boxSizing: 'border-box', position: 'relative' }}>
            
            {/* Header Area */}
            <div style={{ marginBottom: '40px' }}>
                <h1 style={{ fontSize: '40px', fontWeight: 700, margin: 0 }}>Inventory_Management</h1>
                <p style={{ opacity: 0.5 }}>Core assets for {userBrand?.name}.</p>
            </div>

            {/* Floating Right Corner Add Button (Shrunk) */}
            {products.length > 0 && (
                <button 
                    onClick={() => setShowModal(true)} 
                    style={fabStyle}
                    title="Add Item"
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    +
                </button>
            )}

            <div style={gridStyle}>
                {!loading && products.length === 0 && (
                    <div style={emptyStateStyle}>
                        <div style={{ fontSize: '50px' }}>📦</div>
                        <h3>No Products Available</h3>
                        <p style={{opacity: 0.5, marginBottom: '20px'}}>Add products to catalog to begin.</p>
                        <button onClick={() => setShowModal(true)} style={{...primaryBtn, maxWidth: '200px', margin: '0 auto'}}>+ Add Product</button>
                    </div>
                )}

                {products.map((item) => (
                    <div key={item.id} style={cardStyle} onClick={() => setSelectedProduct(item)}>
                        {/* Delete Button */}
                        <div 
                            onClick={(e) => handleDelete(e, item.id)}
                            style={deleteBtnStyle}
                        >
                            ×
                        </div>

                        <div style={{ 
                            width: '100%', height: '180px', borderRadius: '12px', background: '#111', marginBottom: '16px',
                            backgroundImage: `url(${item.image})`, backgroundSize: 'cover', backgroundPosition: 'center'
                        }} />
                        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</h3>
                        <span style={{ color: '#C5FF41', fontWeight: 700, fontSize: '14px' }}>
                            {item.currency}{item.price}
                        </span>
                        <p style={truncatedTextStyle}>{item.details || "No specifications provided."}</p>
                    </div>
                ))}
            </div>

            {/* --- ADD ITEM MODAL --- */}
            {showModal && (
                <div style={modalOverlay}>
                    <div style={glassModal}>
                        <h2 style={{ marginTop: 0 }}>New_Deployment</h2>
                        <label style={labelStyle}>Product Image</label>
                        <input type="file" accept="image/*" onChange={handleImageChange} style={{ marginBottom: '20px', fontSize: '12px' }} />
                        <label style={labelStyle}>Name</label>
                        <input style={inputStyle} value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} />
                        <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ flex: 1 }}><label style={labelStyle}>Currency</label>
                                <select style={inputStyle} value={newItem.currency} onChange={(e) => setNewItem({...newItem, currency: e.target.value})}>
                                    {currencies.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                </select>
                            </div>
                            <div style={{ flex: 2 }}><label style={labelStyle}>Price</label>
                                <input style={inputStyle} value={newItem.price} onChange={(e) => setNewItem({...newItem, price: e.target.value})} />
                            </div>
                        </div>
                        <label style={labelStyle}>Details</label>
                        <textarea style={{...inputStyle, height: '60px'}} onChange={(e) => setNewItem({...newItem, details: e.target.value})} />
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={handleSave} style={primaryBtn}>Save to Core</button>
                            <button onClick={() => setShowModal(false)} style={secondaryBtn}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- DETAIL VIEW MODAL --- */}
            {selectedProduct && (
                <div style={modalOverlay} onClick={() => setSelectedProduct(null)}>
                    <div style={detailModalStyle} onClick={(e) => e.stopPropagation()}>
                        <div style={{display: 'flex', gap: '40px'}}>
                            <div style={{
                                flex: 1, height: '450px', borderRadius: '24px', 
                                backgroundImage: `url(${selectedProduct.image})`, 
                                backgroundSize: 'cover', backgroundPosition: 'center',
                                border: '1px solid rgba(255,255,255,0.1)'
                            }} />
                            <div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
                                <div style={{flex: 1}}>
                                    <h1 style={{margin: '0 0 10px 0', fontSize: '32px'}}>{selectedProduct.name}</h1>
                                    <p style={{color: '#C5FF41', fontSize: '24px', fontWeight: 700, marginBottom: '20px'}}>
                                        {selectedProduct.currency}{selectedProduct.price}
                                    </p>
                                    <label style={labelStyle}>Description</label>
                                    <p style={{opacity: 0.7, lineHeight: '1.6', fontSize: '14px'}}>{selectedProduct.details}</p>
                                    
                                    <label style={{...labelStyle, marginTop: '30px'}}>Reviews / Neural Feedback</label>
                                    <div style={{padding: '15px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)'}}>
                                        <p style={{fontSize: '12px', opacity: 0.5, margin: 0}}>No internal feedback loops detected for this asset yet.</p>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedProduct(null)} style={{...secondaryBtn, marginTop: '20px'}}>Close View</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- UPDATED STYLES ---
const fabStyle = {
    position: 'fixed' as 'fixed', bottom: '20px', right: '40px',
    background: 'none', color: '#C5FF41', border: 'none',
    fontSize: '80px', fontWeight: '300', cursor: 'pointer',
    zIndex: 100,
    lineHeight: '1',
    transition: 'transform 0.2s ease, opacity 0.2s ease',
    outline: 'none',
    // Slight glow effect to make the raw + pop against the black
    textShadow: '0 0 20px rgba(197, 255, 65, 0.4)'
};

const cardStyle = { 
    background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', 
    borderRadius: '24px', padding: '16px', backdropFilter: 'blur(10px)', 
    width: '260px', height: '340px', cursor: 'pointer', position: 'relative' as 'relative',
    transition: 'transform 0.2s ease'
};

const truncatedTextStyle = { 
    fontSize: '11px', opacity: 0.5, marginTop: '10px', 
    display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as 'vertical',
    overflow: 'hidden', lineHeight: '1.4'
};

const deleteBtnStyle = {
    position: 'absolute' as 'absolute', top: '10px', right: '10px',
    width: '24px', height: '24px', borderRadius: '50%',
    background: 'rgba(255, 50, 50, 0.2)', color: '#ff4d4d',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', fontSize: '18px', border: '1px solid rgba(255, 50, 50, 0.3)', zIndex: 5
};

const detailModalStyle = {
    background: 'rgba(15, 15, 15, 0.98)', border: '1px solid rgba(255,255,255,0.1)',
    padding: '40px', borderRadius: '40px', width: '900px', maxWidth: '90vw',
    boxShadow: '0 50px 100px rgba(0,0,0,0.8)'
};

const gridStyle = { display: 'flex', flexWrap: 'wrap' as 'wrap', gap: '24px', marginTop: '40px', justifyContent: 'flex-start' };
const modalOverlay = { position: 'fixed' as 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 };
const glassModal = { background: 'rgba(25, 25, 25, 0.95)', border: '1px solid rgba(255,255,255,0.1)', padding: '40px', borderRadius: '32px', width: '420px' };
const inputStyle = { width: '100%', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px', color: 'white', marginBottom: '20px', outline: 'none', boxSizing: 'border-box' as 'border-box' };
const labelStyle = { fontSize: '10px', textTransform: 'uppercase' as 'uppercase', opacity: 0.4, marginBottom: '8px', display: 'block', letterSpacing: '1px' };
const primaryBtn = { background: '#C5FF41', color: 'black', border: 'none', padding: '14px 24px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', flex: 1 };
const secondaryBtn = { background: 'transparent', color: 'white', border: '1px solid #333', padding: '14px 24px', borderRadius: '12px', cursor: 'pointer', flex: 1 };
const emptyStateStyle = { background: 'rgba(255, 255, 255, 0.02)', border: '1px dashed rgba(255, 255, 255, 0.15)', borderRadius: '32px', padding: '60px', textAlign: 'center' as 'center', width: '100%' };

export default Catalog;