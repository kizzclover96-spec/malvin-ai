import React, { useState, useEffect } from 'react';
import { auth, db } from "../firebase";
import { ref, onValue } from "firebase/database";

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
                const list = Object.keys(data).map(k => ({
                    id: k,
                    ...data[k]
                }));
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

    // ✅ FIXED: clean checkout flow
    const handleDirectFunding = () => {
        if (!userId) return;
        if (!pointsVariantId) return;

        const checkoutUrl =
            `https://checkout.lemonsqueezy.com/checkout/buy/${pointsVariantId}?checkout[custom][user_id]=${userId}`;

        // ✅ IMPORTANT FIX: use redirect instead of window.open
        window.location.href = checkoutUrl;
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
            
            {/* HEADER */}
            <div style={{ marginBottom: '40px' }}>
                <h1 style={{ fontSize: '40px', fontWeight: 700, margin: 0 }}>
                    The_Treasury
                </h1>
                <p style={{ opacity: 0.5 }}>
                    Manage your liquidity and neural bridge credits.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '30px' }}>

                {/* LEFT */}
                <div style={liquidityCard}>
                    <div style={{ opacity: 0.4, fontSize: '12px' }}>
                        CURRENT_LIQUIDITY
                    </div>

                    <div style={{ fontSize: '48px', fontWeight: 700, margin: '20px 0', color: '#C5FF41' }}>
                        €{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>

                    <button onClick={handleDirectFunding} style={fundingBtn}>
                        Purchase Credits
                    </button>
                </div>

                {/* RIGHT */}
                <div style={ledgerContainer}>
                    <div style={{ padding: '20px', fontWeight: 600 }}>
                        NEURAL_LEDGER
                    </div>

                    <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                        {transactions.length === 0 ? (
                            <div style={{ padding: '40px', textAlign: 'center', opacity: 0.3 }}>
                                No transaction history found.
                            </div>
                        ) : (
                            transactions.map((t) => (
                                <div key={t.id} style={transactionRow}>
                                    <div>
                                        <div>{t.label}</div>
                                        <div style={{ fontSize: '11px', opacity: 0.4 }}>
                                            {t.date} • {t.status}
                                        </div>
                                    </div>

                                    <div style={{ fontWeight: 700 }}>
                                        {t.type === 'Inflow' ? '+' : '-'}
                                        €{Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

// Styles
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
    fontSize: '15px'
};

export default Payments;