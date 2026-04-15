import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { ref, onValue, update, runTransaction } from "firebase/database";

const glassStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '24px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    padding: '24px',
    color: 'white',
};

const AuraBackground = () => {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      overflow: 'hidden',
      zIndex: 0,
      pointerEvents: 'none'
    }}>
      <style>{`
        @keyframes waveFlow1 {
          0% { transform: translateX(-20%) translateY(0%) rotate(0deg); }
          50% { transform: translateX(20%) translateY(-10%) rotate(8deg); }
          100% { transform: translateX(-20%) translateY(0%) rotate(0deg); }
        }

        @keyframes waveFlow2 {
          0% { transform: translateX(20%) translateY(0%) rotate(0deg); }
          50% { transform: translateX(-20%) translateY(10%) rotate(-8deg); }
          100% { transform: translateX(20%) translateY(0%) rotate(0deg); }
        }

        .aura-wave {
          position: absolute;
          width: 900px;
          height: 400px;
          filter: blur(120px);
          opacity: 0.6;
          mix-blend-mode: screen;
        }
      `}</style>

      {/* PURPLE WAVE */}
      <div
        className="aura-wave"
        style={{
          top: '20%',
          left: '-10%',
          background: 'linear-gradient(90deg, rgba(168,85,247,0.6), rgba(236,72,153,0.4), transparent)',
          animation: 'waveFlow1 12s ease-in-out infinite',
          opacity: 0.7,
        }}
      />

      {/* BLUE WAVE */}
      <div
        className="aura-wave"
        style={{
          bottom: '10%',
          right: '-10%',
          background: 'linear-gradient(90deg, rgba(59,130,246,0.6), rgba(99,102,241,0.4), transparent)',
          animation: 'waveFlow2 14s ease-in-out infinite',
          opacity: 0.7,
        }}
      />

      {/* EXTRA GLOW CENTER */}
      <div
        style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(168,85,247,0.25), transparent 70%)',
          filter: 'blur(100px)',
        }}
      />
    </div>
  );
};

const AdsManager = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [editBalance, setEditBalance] = useState('');

    useEffect(() => {
        // 1. Fetch ALL Users
        const usersRef = ref(db, 'users');
        onValue(usersRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setUsers(Object.keys(data).map(k => ({ uid: k, ...data[k] })));
            }
        });

        // 2. Fetch Global Pending Wires
        const adminQueueRef = ref(db, `admin/pending_wires`);
        onValue(adminQueueRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setPendingRequests(Object.keys(data).map(k => ({ id: k, ...data[k] })));
            }
        });
    }, []);

    // --- LOGIC: CLEAR FUNDS ---
    const clearFunds = async (req: any) => {
        const userBalanceRef = ref(db, `users/${req.userId}/treasury/balance`);
        
        // Update User Balance
        await runTransaction(userBalanceRef, (current) => (current || 0) + req.amount);

        // Mark ledger entry as settled
        await update(ref(db, `users/${req.userId}/treasury/ledger/${req.id}`), { status: 'Settled' });

        // Remove from admin queue
        await update(ref(db, `admin/pending_wires/${req.id}`), null);
        
        alert(`Funds Cleared for ${req.userEmail}`);
    };

    // --- LOGIC: MANUAL OVERRIDE ---
    const updateManualBalance = async () => {
        if (!selectedUser || !editBalance) return;
        await update(ref(db, `users/${selectedUser.uid}/treasury`), {
            balance: parseFloat(editBalance)
        });
        alert("Balance Updated Manually");
    };

    return (
        <div style={adminLayout}>
            <AuraBackground />
            <header style={headerStyle}>
                <h1 style={{ fontSize: '24px', letterSpacing: '2px', position: 'relative' }}>MALVIN_ADMIN_CENTER</h1>
                <div style={badge}>SYSTEM_ADMIN</div>
            </header>
            
            <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr 400px', gap: '24px', position: 'relative' }}>
                
                {/* --- LEFT: USER DIRECTORY --- */}
                <section style={panelStyle}>
                    <h3 style={sectionTitle}>REGISTERED_USERS</h3>
                    <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        {users.map(u => (
                            <div key={u.uid} 
                                 onClick={() => setSelectedUser(u)}
                                 style={{...userCard, border: selectedUser?.uid === u.uid ? '1px solid #C5FF41' : '1px solid transparent'}}>
                                <div style={{fontWeight: 600}}>{u.brandName || 'Unnamed Brand'}</div>
                                <div style={{fontSize: '11px', opacity: 0.5}}>{u.email}</div>
                                <div style={{fontSize: '12px', color: '#C5FF41', marginTop: '5px'}}>
                                    €{u.treasury?.balance?.toLocaleString() || '0.00'}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* --- CENTER: ACTIVITY FEED --- */}
                <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={panelStyle}>
                        <h3 style={sectionTitle}>PENDING_FUNDS_REQUESTS</h3>
                        {pendingRequests.length === 0 && <p style={{opacity: 0.3}}>No pending wires.</p>}
                        {pendingRequests.map(req => (
                            <div key={req.id} style={itemStyle}>
                                <div>
                                    <div style={{fontWeight: 700, color: '#C5FF41'}}>+ €{req.amount}</div>
                                    <div style={{fontSize: '11px', opacity: 0.6}}>{req.userEmail}</div>
                                </div>
                                <button onClick={() => clearFunds(req)} style={approveBtn}>CLEAR_WIRE</button>
                            </div>
                        ))}
                    </div>

                    <div style={panelStyle}>
                        <h3 style={sectionTitle}>AD_CAMPAIGN_QUEUE</h3>
                        <p style={{opacity: 0.3, fontSize: '12px'}}>No active deployment requests.</p>
                    </div>
                </section>
                {/* --- RIGHT: USER EDITOR --- */}
                <section style={panelStyle}>
                    <h3 style={sectionTitle}>USER_EDITOR</h3>
                    {selectedUser ? (
                        <div>
                            <div style={{marginBottom: '20px'}}>
                                <label style={labelStyle}>BRAND_NAME</label>
                                <input style={inputStyle} defaultValue={selectedUser.brandName} />
                            </div>
                            <div style={{marginBottom: '20px'}}>
                                <label style={labelStyle}>MANUAL_BALANCE_OVERRIDE</label>
                                <input 
                                    style={inputStyle} 
                                    type="number" 
                                    placeholder={selectedUser.treasury?.balance}
                                    onChange={(e) => setEditBalance(e.target.value)}
                                />
                                <button onClick={updateManualBalance} style={{...approveBtn, width: '100%', marginTop: '10px'}}>SAVE_CHANGES</button>
                            </div>
                            <div style={statusBox}>
                                <div style={{fontSize: '10px', opacity: 0.5}}>USER_ID</div>
                                <div style={{fontSize: '10px', fontFamily: 'monospace'}}>{selectedUser.uid}</div>
                            </div>
                        </div>
                    ) : (
                        <p style={{opacity: 0.3, textAlign: 'center', marginTop: '40px'}}>Select a user to edit</p>
                    )}
                </section>

            </div>
        </div>
    );
};

// --- STYLES ---
const adminLayout: React.CSSProperties = { background: '#000', minHeight: '100vh', padding: '40px', color: '#fff', fontFamily: 'Inter, sans-serif', overflow: 'hidden' };
const headerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', borderBottom: '1px solid #222', paddingBottom: '20px', position: 'relative' };
const badge: React.CSSProperties = { background: '#C5FF41', color: '#000', padding: '5px 12px', borderRadius: '4px', fontSize: '10px', fontWeight: 900 };
const panelStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '24px', backdropFilter: 'blur(10px)' };
const sectionTitle: React.CSSProperties = { fontSize: '12px', letterSpacing: '2px', opacity: 0.4, marginBottom: '20px', borderBottom: '1px solid #222', paddingBottom: '10px' };
const userCard: React.CSSProperties = { padding: '15px', borderRadius: '12px', background: 'rgba(255,255,255,0.03)', marginBottom: '10px', cursor: 'pointer', transition: '0.2s' };
const itemStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', background: '#000', borderRadius: '12px', marginBottom: '10px', border: '1px solid #111' };
const approveBtn: React.CSSProperties = { background: '#C5FF41', color: '#000', border: 'none', padding: '10px 18px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontSize: '11px' };
const inputStyle: React.CSSProperties = { width: '100%', background: '#000', border: '1px solid #222', padding: '12px', borderRadius: '8px', color: '#fff', marginTop: '5px' };
const labelStyle: React.CSSProperties = { fontSize: '10px', opacity: 0.5 };
const statusBox: React.CSSProperties = { marginTop: '30px', padding: '15px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' };

export default AdsManager;