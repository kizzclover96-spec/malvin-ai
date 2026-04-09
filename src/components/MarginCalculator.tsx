import React, { useState } from 'react';

const MarginCalculator = ({ onBack }: { onBack: () => void }) => {
    const [values, setValues] = useState({
        price: 100,
        cogs: 30, // Cost of Goods
        shipping: 10,
        marketing: 20, // Per unit acquisition
        tax: 20, // Percentage
    });

    // Business Logic
    const grossProfit = values.price - values.cogs;
    const netProfit = values.price - values.cogs - values.shipping - values.marketing;
    const taxAmount = (netProfit > 0) ? (netProfit * (values.tax / 100)) : 0;
    const finalTakeHome = netProfit - taxAmount;
    const marginPercentage = ((finalTakeHome / values.price) * 100).toFixed(1);

    const inputStyle: React.CSSProperties = {
        width: '100%',
        padding: '12px',
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '8px',
        color: 'white',
        marginTop: '8px',
        fontSize: '16px'
    };

    return (
        <div style={{ position: 'fixed', width: '100vw', height: '100vh', backgroundColor: '#08080a', color: 'white', padding: '24px', zIndex: 1000, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxSizing: 'border-box', }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
                <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '10px 25px', borderRadius: '30px', cursor: 'pointer' }}>
                    ← EXIT TO DASHBOARD
                </button>
                <div style={{ textAlign: 'right' }}>
                    <h2 style={{ margin: 0, color: '#f59e0b', letterSpacing: '2px' }}>MARGIN ARCHITECT</h2>
                    <p style={{ opacity: 0.5, fontSize: '12px' }}>UNIT ECONOMICS V1.0</p>
                </div>
            </div>

            <div style={{ display: 'flex',  flexWrap: 'wrap', gridTemplateColumns: '1fr 1fr', gap: '20px', flex: 1, overflowY: 'auto' }}>
                
                {/* Left: Inputs */}
                <div style={{ background: 'rgba(255,255,255,0.02)', flex: '1 1 400px', padding: '20px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.05)', height: 'fit-content' }}>
                    <h3 style={{ marginBottom: '15px', fontSize: '14px', opacity: 0.8 }}>Unit Parameters</h3>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '20px' }}>
                        <div>
                            <label style={{ fontSize: '11px', opacity: 0.5 }}>RETAIL PRICE</label>
                            <input type="number" value={values.price} onChange={(e) => setValues({...values, price: Number(e.target.value)})} style={inputStyle} />
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', opacity: 0.5 }}>COGS (PRODUCT COST)</label>
                            <input type="number" value={values.cogs} onChange={(e) => setValues({...values, cogs: Number(e.target.value)})} style={inputStyle} />
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', opacity: 0.5 }}>SHIPPING & HANDLING</label>
                            <input type="number" value={values.shipping} onChange={(e) => setValues({...values, shipping: Number(e.target.value)})} style={inputStyle} />
                        </div>
                        <div>
                            <label style={{ fontSize: '11px', opacity: 0.5 }}>MARKETING (CPA)</label>
                            <input type="number" value={values.marketing} onChange={(e) => setValues({...values, marketing: Number(e.target.value)})} style={inputStyle} />
                        </div>
                    </div>
                </div>

                {/* Right: Results Display */}
                <div style={{ display: 'flex', flexDirection: 'column', flex: '1 1 350px', gap: '15px' }}>
                    <div style={{ flex: 1, background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(239, 68, 68, 0.1))', padding: '30px', borderRadius: '24px', border: '1px solid #f59e0b', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
                        <span style={{ fontSize: '12px', opacity: 0.6, letterSpacing: '1px' }}>NET PROFIT PER UNIT</span>
                        <h1 style={{ fontSize: '48px', margin: '5px 0', color: finalTakeHome > 0 ? '#4dff88' : '#ff4d4d' }}>
                            €{finalTakeHome.toFixed(2)}
                        </h1>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', opacity: 0.8 }}>
                            {marginPercentage}% Profit Margin
                        </div>
                    </div>

                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '20px', borderRadius: '16px', display: 'flex', justifyContent: 'space-around' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '10px', opacity: 0.5 }}>GROSS PROFIT</div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>€{grossProfit.toFixed(2)}</div>
                        </div>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '10px', opacity: 0.5 }}>TAX ESTIMATE</div>
                            <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ff4d4d' }}>-€{taxAmount.toFixed(2)}</div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default MarginCalculator;