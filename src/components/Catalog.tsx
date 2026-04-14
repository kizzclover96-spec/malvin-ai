import React from 'react';
import { auth, db } from '../firebase'; 

const Catalog = ({ onBack, userBrand }: any) => {
    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            backgroundColor: '#050505',
            color: 'white',
            padding: '60px 100px',
            position: 'relative',
            overflowY: 'auto'
        }}>
            <button 
                onClick={onBack}
                style={{ marginBottom: '40px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'white', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}
            >
                ← Back
            </button>

            <h1 style={{ fontSize: '40px', fontWeight: 700 }}>Product Catalog</h1>
            <p style={{ opacity: 0.5 }}>Manage the inventory for {userBrand?.name || 'your brand'}.</p>

            <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', 
                gap: '24px', 
                marginTop: '40px' 
            }}>
                {/* Placeholder Card */}
                <div style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '24px',
                    padding: '24px',
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '40px', marginBottom: '16px' }}>📦</div>
                    <h3>Add New Item</h3>
                    <p style={{ fontSize: '12px', opacity: 0.5 }}>Upload product specs to the neural engine.</p>
                    <button style={{ marginTop: '12px', background: '#FFD700', color: 'black', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: 'bold' }}>
                        + Add
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Catalog;