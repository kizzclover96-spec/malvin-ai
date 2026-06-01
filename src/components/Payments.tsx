import React, { useState, useEffect } from 'react';
import { auth, db } from "../firebase";
import { ref, onValue, push } from "firebase/database";

const pointsVariantId = import.meta.env.VITE_LEMONSQUEEZY_POINTS_VARIANT_ID;

const Payments = ({ userBrand }: { userBrand: any }) => {
    const [balance, setBalance] = useState(0.00);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [userId, setUserId] = useState<string | null>(null);

    // Auth listener
    useEffect(() => {
        const unsub = auth.onAuthStateChanged((user) => {
            setUserId(user ? user.uid : null);
        });

        return () => unsub();
    }, []);

    // Firebase data synchronization
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

    // Fast-track handling to direct checkout
    const handleDirectFunding = async () => {
        if (!userId) {
            alert("Authentication token missing. Please try again.");
            return;
        }
        if (!pointsVariantId) {
            alert("Checkout configuration missing. Please verify system environment variables.");
            return;
        }

        // Construct Lemon Squeezy checkout link passing the authenticated Firebase User ID
        const checkoutUrl = `https://checkout.lemonsqueezy.com/checkout/buy/${pointsVariantId}?checkout[custom][user_id]=${userId}`;

        // Launch product store immediately
        window.open(checkoutUrl, '_blank');

        // Log the initiated event on the database ledger
        await push(ref(db, `users/${userId}/treasury/ledger`), {
            type: 'Inflow',
            amount: 0, // Set as pending update until Lemon Squeezy Webhook updates the actual payload
            label: 'Top_Up_Redirect',
            date: new Date().toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short'
            }).toUpperCase(),
            status: 'Redirected',
            timestamp: Date.now(),
        });
    };

    if (!userId) {
        return (
            <div style={{ padding: '20px', color: 'white', opacity: 0.5, fontFamily: 'monospace' }}>
                Authenticating Treasury Access...
            </div>
        );
    }

    return (
        <div style={{ padding: '20px', color: 'white' }}>
            {/* --- HEADER --- */}
            <div style={{ marginBottom: '40px' }}>
                <h1 style={{ fontSize: '40px', fontWeight: 700, margin: 0, letterSpacing: '-1px' }}>The_Treasury</h1>
                <p style={{ opacity: 0.5, fontSize: '14px' }}>Manage your liquidity and neural bridge credits.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>
                
                {/* --- LEFT: LIQUIDITY CARD --- */}
                <div style={liquidityCard}>
                    <div style={{ opacity: 0.4, fontSize: '12px', letterSpacing: '2px', fontWeight: 600 }}>CURRENT_LIQUIDITY</div>
                    <div style={{ fontSize: '48px', fontWeight: 700, margin: '20px 0', color: '#C5FF41', letterSpacing: '-1px' }}>
                        €{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                    
                    <div style={{ padding: '15px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '16px', marginBottom: '30px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '10px' }}>
                            <span style={{ opacity: 0.5 }}>Reserved for Ads</span>
                            <span style={{ fontWeight: 500 }}>€0.00</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                            <span style={{ opacity: 0.5 }}>Available Credit</span>
                            <span style={{ color: '#C5FF41', fontWeight: 500 }}>€{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>

                    {/* Streamlined Direct Button CTA */}
                    <button onClick={handleDirectFunding} style={fundingBtn}>
                        Purchase Credits
                    </button>
                </div>

                {/* --- RIGHT: TRANSACTION LEDGER --- */}
                <div style={ledgerContainer}>
                    <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: 600, fontSize: '13px', letterSpacing: '1px' }}>
                        NEURAL_LEDGER
                    </div>
                    <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                        {transactions.length === 0 ? (
                            <div style={{ padding: '40px', textAlign: 'center', opacity: 0.3, fontSize: '14px' }}>No transaction history found.</div>
                        ) : transactions.map(t => (
                            <div key={t.id} style={transactionRow}>
                                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                    <div style={{ 
                                        width: '8px', height: '8px', borderRadius: '50%', 
                                        background: t.status === 'Pending_Wire' ? '#FFA500' : (t.type === 'Inflow' ? '#C5FF41' : '#ff4d4d'),
                                        boxShadow: t.status === 'Pending_Wire' ? '0 0 10px #FFA500' : 'none'
                                    }} />
                                    <div>
                                        <div style={{ fontSize: '14px', fontWeight: 500 }}>{t.label}</div>
                                        <div style={{ fontSize: '11px', opacity: 0.4, marginTop: '2px' }}>{t.date} • {t.status}</div>
                                    </div>
                                </div>
                                <div style={{ fontWeight: 700, color: t.type === 'Inflow' ? '#C5FF41' : 'white' }}>
                                    {t.type === 'Inflow' ? '+' : '-'}€{t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- STYLES ---
const liquidityCard = {
    background: 'linear-gradient(145deg, #0e0d14, #050408)',
    padding: '40px',
    borderRadius: '32px',
    border: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    flexDirection: 'column' as 'column'
};

const ledgerContainer = {
    background: 'rgba(255,255,255,0.01)',
    borderRadius: '32px',
    border: '1px solid rgba(255,255,255,0.04)',
};

const transactionRow = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid rgba(255,255,255,0.02)'
};

const fundingBtn = {
    background: '#C5FF41',
    color: 'black',
    border: 'none',
    padding: '18px',
    borderRadius: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    letterSpacing: '0.5px',
    fontSize: '15px',
    transition: 'transform 0.2s ease'
};

export default Payments;