import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase'; 
import { ref, set, push, onValue } from "firebase/database";

const Catalog = ({ onBack, userBrand }: any) => {
    const [products, setProducts] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);

    // Form State
    const [newItem, setNewItem] = useState({
        name: '',
        price: '',
        currency: '$', // Default currency
        details: '',
        image: '' // This will now store the Base64 data
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

    // Function to handle Image Selection from Files
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewItem({ ...newItem, image: reader.result as string });
            };
            reader.readAsDataURL(file); // Converts image to string
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

    return (
        <div style={{ width: '100vw', minHeight: '100vh', backgroundColor: '#050505', color: 'white', padding: '60px 100px', boxSizing: 'border-box' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '40px', fontWeight: 700, margin: 0 }}>Inventory_Manage</h1>
                    <p style={{ opacity: 0.5 }}>Core assets for {userBrand?.name}.</p>
                </div>
                {products.length > 0 && (
                    <button onClick={() => setShowModal(true)} style={primaryBtn}>+ Add Item</button>
                )}
            </div>

            <div style={gridStyle}>
                {!loading && products.length === 0 && (
                    <div style={emptyStateStyle}>
                        <div style={{ fontSize: '50px' }}>📦</div>
                        <h3>No Products Detected</h3>
                        <button onClick={() => setShowModal(true)} style={primaryBtn}>Initialize First Item</button>
                    </div>
                )}

                {products.map((item) => (
                    <div key={item.id} style={cardStyle}>
                        <div style={{ 
                            width: '100%', height: '200px', borderRadius: '16px', background: '#111', marginBottom: '16px',
                            backgroundImage: `url(${item.image})`, backgroundSize: 'cover', backgroundPosition: 'center'
                        }} />
                        <h3 style={{ margin: '0 0 8px 0' }}>{item.name}</h3>
                        <span style={{ color: '#C5FF41', fontWeight: 700, fontSize: '18px' }}>
                            {item.currency}{item.price}
                        </span>
                        <p style={{ fontSize: '12px', opacity: 0.5, marginTop: '10px' }}>{item.details}</p>
                    </div>
                ))}
            </div>

            {/* --- MODAL --- */}
            {showModal && (
                <div style={modalOverlay}>
                    <div style={glassModal}>
                        <h2 style={{ marginTop: 0 }}>New_Deployment</h2>
                        
                        <label style={labelStyle}>Product Image</label>
                        <input type="file" accept="image/*" onChange={handleImageChange} style={{ marginBottom: '20px', fontSize: '12px' }} />

                        <label style={labelStyle}>Name</label>
                        <input style={inputStyle} value={newItem.name} onChange={(e) => setNewItem({...newItem, name: e.target.value})} />

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Currency</label>
                                <select 
                                    style={inputStyle} 
                                    value={newItem.currency} 
                                    onChange={(e) => setNewItem({...newItem, currency: e.target.value})}
                                >
                                    {currencies.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                </select>
                            </div>
                            <div style={{ flex: 2 }}>
                                <label style={labelStyle}>Price</label>
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
        </div>
    );
};

// --- STYLES ---
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px', marginTop: '40px' };
const cardStyle = { background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '24px', padding: '16px', backdropFilter: 'blur(10px)' };
const modalOverlay = { position: 'fixed' as 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 };
const glassModal = { background: 'rgba(25, 25, 25, 0.95)', border: '1px solid rgba(255,255,255,0.1)', padding: '40px', borderRadius: '32px', width: '420px' };
const inputStyle = { width: '100%', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px', color: 'white', marginBottom: '20px', outline: 'none', boxSizing: 'border-box' as 'border-box' };
const labelStyle = { fontSize: '10px', textTransform: 'uppercase' as 'uppercase', opacity: 0.4, marginBottom: '8px', display: 'block' };
const primaryBtn = { background: '#C5FF41', color: 'black', border: 'none', padding: '14px 24px', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer', flex: 1 };
const secondaryBtn = { background: 'transparent', color: 'white', border: '1px solid #333', padding: '14px 24px', borderRadius: '12px', cursor: 'pointer', flex: 1 };
const emptyStateStyle = { background: 'rgba(255, 255, 255, 0.02)', border: '1px dashed rgba(255, 255, 255, 0.15)', borderRadius: '32px', padding: '60px', textAlign: 'center' as 'center', gridColumn: '1 / -1' };

export default Catalog;