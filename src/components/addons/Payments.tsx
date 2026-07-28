import React, { useState, useEffect } from 'react';
import { auth, db } from "../../firebase";
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

    // Firebase RTDB Live Synchronization Engine
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
                const list = Object.keys(data)
                    // SAFELY FILTER OUT RAW ROOT STRINGS OR TIMESTAMPS
                    .filter(key => typeof data[key] === 'object' && data[key] !== null)
                    .map(k => ({
                        id: k,
                        ...data[k]
                    }));
                setTransactions(list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
            } else {
                setTransactions([]);
            }
        });

        return () => {
            unsubBalance();
            unsubLedger();
        };
    }, [userId]);

    // Clean checkout pipeline routing
    const handleDirectFunding = () => {
        if (!userId) return;
        if (!pointsVariantId) {
            console.error("Missing VITE_LEMONSQUEEZY_POINTS_VARIANT_ID config.");
            return;
        }

        // Dynamic metadata parsing configuration
        const checkoutUrl = `https://malvin.lemonsqueezy.com/checkout/buy/${pointsVariantId}?embed=0&checkout[custom][user_id]=${userId}`;
        
        // Using isolated target routing instead of window.location.href
        window.open(checkoutUrl, "_blank", "noopener,noreferrer");
    };

    if (!userId) {
        return (
            <div style={{ padding: '20px', color: 'white', opacity: 0.5, fontFamily: 'monospace' }}>
                Authenticating Treasury Access...
            </div>
        );
    }

    return (
        <>
            <style>{responsiveStyles}</style>
            <div className="payments-container" style={{ padding: '20px', color: 'white', fontFamily: 'sans-serif' }}>
                
                {/* HEADER */}
                <div style={{ marginBottom: '30px' }}>
                    <h1 className="payments-title" style={{ fontSize: '40px', fontWeight: 700, margin: 0, fontFamily: 'monospace' }}>
                        The_Treasury
                    </h1>
                    <p style={{ opacity: 0.5, fontSize: '14px', marginTop: '4px' }}>
                        Manage your liquidity and neural bridge credits.
                    </p>
                </div>

                <div className="payments-grid">

                    {/* LEFT: Balance Block */}
                    <div className="liquidity-card" style={liquidityCard}>
                        <div>
                            <div style={{ opacity: 0.4, fontSize: '12px', letterSpacing: '2px' }}>
                                CURRENT_LIQUIDITY
                            </div>

                            <div className="balance-amount" style={{ fontSize: '44px', fontWeight: 700, margin: '20px 0', color: '#C5FF41', fontFamily: 'monospace' }}>
                                €{balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                        </div>

                        <button onClick={handleDirectFunding} style={fundingBtn}>
                            Purchase Credits
                        </button>
                    </div>

                    {/* RIGHT: Live Ledger */}
                    <div style={ledgerContainer}>
                        <div style={{ padding: '20px', fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.04)', letterSpacing: '1px' }}>
                            NEURAL_LEDGER
                        </div>

                        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                            {transactions.length === 0 ? (
                                <div style={{ padding: '40px', textAlign: 'center', opacity: 0.3, fontSize: '13px' }}>
                                    No transaction history found.
                                </div>
                            ) : (
                                transactions.map((t) => {
                                    // Convert database server timestamp to readable string format
                                    const displayDate = t.timestamp 
                                        ? new Date(t.timestamp).toLocaleDateString(undefined, {
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })
                                        : 'Processing...';

                                    return (
                                        <div key={t.id} style={transactionRow}>
                                            <div>
                                                <div style={{ fontSize: '14px', fontWeight: 500 }}>{t.label || "Credit Top-Up"}</div>
                                                <div style={{ fontSize: '11px', opacity: 0.4, marginTop: '4px' }}>
                                                    {displayDate} • {t.status || "Settled"}
                                                </div>
                                            </div>

                                            <div style={{ fontWeight: 700, color: t.type === 'Inflow' ? '#C5FF41' : '#ff4141', fontFamily: 'monospace' }}>
                                                {t.type === 'Inflow' ? '+' : '-'}
                                                €{Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </>
    );
};

// --- RESPONSIVE CSS INJECTION ---
const responsiveStyles = `
  .payments-grid {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 30px;
  }

  @media (max-width: 768px) {
    .payments-container {
      padding: 15px !important;
    }

    .payments-title {
      font-size: 28px !important;
    }

    .payments-grid {
      grid-template-columns: 1fr !important;
      gap: 20px !important;
    }

    .liquidity-card {
      padding: 24px !important;
      border-radius: 20px !important;
      gap: 20px !important;
    }

    .balance-amount {
      font-size: 32px !important;
      margin: 12px 0 !important;
    }
  }
`;

// --- STYLING PACKAGES ---

const liquidityCard = {
    background: 'linear-gradient(145deg, #0e0d14, #050408)',
    padding: '40px',
    borderRadius: '32px',
    border: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    flexDirection: 'column' as 'column',
    justifyContent: 'space-between'
};

const ledgerContainer = {
    background: 'rgba(255,255,255,0.01)',
    borderRadius: '24px',
    border: '1px solid rgba(255,255,255,0.04)',
};

const transactionRow = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid rgba(255,255,255,0.02)'
};

const fundingBtn = {
    background: '#C5FF41',
    color: 'black',
    border: 'none',
    padding: '16px',
    borderRadius: '16px',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: '15px',
    width: '100%',
    transition: 'transform 0.2s ease',
};

export default Payments;