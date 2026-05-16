import React, { useState, useEffect } from 'react';
import { auth, db } from "../firebase";
import { ref, onValue, push } from "firebase/database";

const pointsVariantId = import.meta.env.VITE_LEMONSQUEEZY_POINTS_VARIANT_ID;

const Payments = ({ userBrand }: { userBrand: any }) => {
    const [balance, setBalance] = useState(0.00);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [showFundingModal, setShowFundingModal] = useState(false);
    const [fundingAmount, setFundingAmount] = useState('');
    const [userId, setUserId] = useState<string | null>(null);

    // Auth listener
    useEffect(() => {
        const unsub = auth.onAuthStateChanged((user) => {
            setUserId(user ? user.uid : null);
        });

        return () => unsub();
    }, []);

    // Firebase sync
    useEffect(() => {
        if (!userId) return;

        const balanceRef = ref(db, `users/${userId}/treasury/balance`);
        const ledgerRef = ref(db, `users/${userId}/treasury/ledger`);

        const unsubBalance = onValue(balanceRef, (snapshot) => {
            setBalance(snapshot.val() || 0);
        });

        const unsubLedger = onValue(ledgerRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const list = Object.keys(data).map(k => ({ id: k, ...data[k] }));
                setTransactions(list.sort((a, b) => b.timestamp - a.timestamp));
            } else {
                setTransactions([]);
            }
        });

        return () => {
            unsubBalance();
            unsubLedger();
        };
    }, [userId]);

    const handleFundingRequest = async () => {
        if (!userId || !pointsVariantId) return;

        const amount = parseFloat(fundingAmount);
        if (isNaN(amount) || amount <= 0) {
            alert("Please enter a valid amount.");
            return;
        }

        const checkoutUrl = `https://checkout.lemonsqueezy.com/checkout/buy/${pointsVariantId}?checkout[custom][user_id]=${userId}`;

        setShowFundingModal(false);
        window.open(checkoutUrl, '_blank');

        await push(ref(db, `users/${userId}/treasury/ledger`), {
            type: 'Inflow',
            amount,
            label: 'Top_Up_Initiated',
            date: new Date().toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short'
            }).toUpperCase(),
            status: 'Awaiting_Payment',
            timestamp: Date.now(),
        });
    };

    if (!userId) {
        return (
            <div style={{ padding: '20px', color: 'white', opacity: 0.5 }}>
                Authenticating Treasury Access...
            </div>
        );
    }

    return (
        
        <div style={{ padding: '20px', color: 'white' }}>
            <div style={{ marginBottom: '40px' }}>
                <h1 style={{ fontSize: '40px', fontWeight: 700, margin: 0 }}>The_Treasury</h1>
                <p style={{ opacity: 0.5 }}>Manage your liquidity and neural bridge credits.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
                
                {/* --- LEFT: LIQUIDITY CARD --- */}
                <div style={liquidityCard}>
                    <div style={{ opacity: 0.4, fontSize: '12px', letterSpacing: '2px' }}>CURRENT_LIQUIDITY</div>
                    <div style={{ fontSize: '48px', fontWeight: 700, margin: '20px 0', color: '#C5FF41' }}>
                        €{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    
                    <div style={{ padding: '15px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', marginBottom: '30px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '10px' }}>
                            <span style={{ opacity: 0.5 }}>Reserved for Ads</span>
                            <span>€0.00</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                            <span style={{ opacity: 0.5 }}>Available Credit</span>
                            <span>€{balance.toLocaleString()}</span>
                        </div>
                    </div>

                    <button onClick={() => setShowFundingModal(true)} style={fundingBtn}>
                        Request_Funding_Invoice
                    </button>
                </div>

                {/* --- RIGHT: TRANSACTION LEDGER --- */}
                <div style={ledgerContainer}>
                    <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: 600 }}>
                        NEURAL_LEDGER
                    </div>
                    <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                        {transactions.length === 0 ? (
                            <div style={{ padding: '40px', textAlign: 'center', opacity: 0.3 }}>No transaction history found.</div>
                        ) : transactions.map(t => (
                            <div key={t.id} style={transactionRow}>
                                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                    <div style={{ 
                                        width: '8px', height: '8px', borderRadius: '50%', 
                                        background: t.status === 'Pending_Wire' ? '#FFA500' : (t.type === 'Inflow' ? '#C5FF41' : '#ff4d4d'),
                                        boxShadow: t.status === 'Pending_Wire' ? '0 0 10px #FFA500' : 'none'
                                    }} />
                                    <div>
                                        <div style={{ fontSize: '14px' }}>{t.label}</div>
                                        <div style={{ fontSize: '11px', opacity: 0.4 }}>{t.date} • {t.status}</div>
                                    </div>
                                </div>
                                <div style={{ fontWeight: 700, color: t.type === 'Inflow' ? '#C5FF41' : 'white' }}>
                                    {t.type === 'Inflow' ? '+' : '-'}€{t.amount.toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- FUNDING MODAL --- */}
            {showFundingModal && (
                <div style={modalOverlay}>
                    <div style={fundingModal}>
                        <h2 style={{ marginTop: 0 }}>Funding_Request</h2>
                        <p style={{ opacity: 0.5, fontSize: '13px' }}>Enter the amount you wish to credit. Our treasury team will provide manual wire instructions.</p>
                        
                        <label style={labelStyle}>Amount to Fund (EUR)</label>
                        <input 
                            style={inputStyle} 
                            type="number" 
                            placeholder="e.g. 5000" 
                            value={fundingAmount}
                            onChange={(e) => setFundingAmount(e.target.value)}
                        />

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button onClick={handleFundingRequest} style={primaryBtn}>Confirm_Request</button>
                            <button onClick={() => setShowFundingModal(false)} style={secondaryBtn}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ... Styles (Keep as you had them)
const liquidityCard = {
    background: 'linear-gradient(145deg, #111, #080808)',
    padding: '40px',
    borderRadius: '32px',
    border: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    flexDirection: 'column' as 'column'
};

const ledgerContainer = {
    background: 'rgba(255,255,255,0.02)',
    borderRadius: '32px',
    border: '1px solid rgba(255,255,255,0.05)',
};

const transactionRow = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid rgba(255,255,255,0.03)'
};

const fundingBtn = {
    background: '#C5FF41',
    color: 'black',
    border: 'none',
    padding: '18px',
    borderRadius: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '1px'
};

const modalOverlay = { position: 'fixed' as 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const fundingModal = { background: '#0a0a0a', border: '1px solid rgba(255,255,255,0.1)', padding: '40px', borderRadius: '32px', width: '450px' };
const inputStyle = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '15px', borderRadius: '12px', color: 'white', marginBottom: '20px', outline: 'none' };
const labelStyle = { fontSize: '10px', opacity: 0.4, textTransform: 'uppercase' as 'uppercase', marginBottom: '8px', display: 'block' };
const primaryBtn = { background: '#C5FF41', color: 'black', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 700, flex: 1, cursor: 'pointer' };
const secondaryBtn = { background: 'transparent', color: 'white', border: '1px solid #333', padding: '14px', borderRadius: '12px', flex: 1, cursor: 'pointer' };

export default Payments;