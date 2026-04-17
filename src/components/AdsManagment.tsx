import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { ref, onValue, update, runTransaction, push, child } from "firebase/database";

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
    const [editBrandName, setEditBrandName] = useState('');
    const [adRequests, setAdRequests] = useState<any[]>([]);

    useEffect(() => {
        // 1. Fetch ALL Users
        const usersRef = ref(db, 'users');
        onValue(usersRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const formattedUsers = Object.keys(data).map(k => ({
                    uid: k,
                    // Fallback to "Unknown" or the UID itself if name is missing
                    brandName: data[k].brandName || data[k].name || "No Brand Name",
                    email: data[k].email || "No Email",
                    status: data[k].status || 'Active',
                    treasury: data[k].treasury || { balance: 0 }
                }));
                setUsers(formattedUsers);
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

        // 3. Fetch Global Ad Queue
        const adQueueRef = ref(db, `admin/ad_queue`);
        onValue(adQueueRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setAdRequests(Object.keys(data).map(k => ({ id: k, ...data[k] })));
            } else {
                setAdRequests([]);
            }
        });
    }, []);

    const handleLogout = () => signOut(auth);
    // --- LOGIC: CLEAR FUNDS ---
    const clearFunds = async (req: any) => {
        try {
            // A. Update the User's Balance (Keep runTransaction for safety with numbers)
            const userBalanceRef = ref(db, `users/${req.userId}/treasury/balance`);
            await runTransaction(userBalanceRef, (current) => (current || 0) + req.amount);

            // B. Use a multi-path update to delete from admin AND add to ledger
            // First, generate a new key for the ledger entry
            const newLedgerKey = push(child(ref(db), `users/${req.userId}/treasury/ledger`)).key;

            const updates: any = {};
            
            // Path 1: Delete from Admin Queue (setting to null in an object deletes it)
            updates[`admin/pending_wires/${req.id}`] = null;
            
            // Path 2: Add to User Ledger
            updates[`users/${req.userId}/treasury/ledger/${newLedgerKey}`] = {
                type: 'Inflow',
                amount: req.amount,
                label: 'Wire_Transfer_Settled',
                date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase(),
                status: 'Completed',
                timestamp: Date.now()
            };

            // Execute both simultaneously
            await update(ref(db), updates);

            alert(`Funds (€${req.amount}) successfully cleared for ${req.userEmail}`);
        } catch (err) {
            console.error("Clear Funds Error:", err);
            alert("System Error: Check console for permission/syntax details.");
        }
    };

    const handleSaveChanges = async () => {
        if (!selectedUser) return;
        const updates: any = {};
        if (editBrandName) updates[`users/${selectedUser.uid}/brandName`] = editBrandName;
        if (editBalance) updates[`users/${selectedUser.uid}/treasury/balance`] = parseFloat(editBalance);
        
        await update(ref(db), updates);
        alert("Account Updated.");
    };

    const toggleAccountStatus = async () => {
        const newStatus = selectedUser.status === 'Banned' ? 'Active' : 'Banned';
        await update(ref(db, `users/${selectedUser.uid}`), { status: newStatus });
        alert(`User is now ${newStatus}`);
    };

    // --- LOGIC: MANUAL OVERRIDE ---
    const updateManualBalance = async () => {
        if (!selectedUser || !editBalance) return;
        await update(ref(db, `users/${selectedUser.uid}/treasury`), {
            balance: parseFloat(editBalance)
        });
        alert("Balance Updated Manually");
    };

    // --- LOGIC: APPROVE AD ---
    const approveAd = async (req: any) => {
        try {
            const updates: any = {};
            // 1. Set campaign status to Active on the user's side
            updates[`users/${req.userId}/campaigns/${req.campaignId}/status`] = 'Active';
            
            // 2. Remove from Admin Queue
            updates[`admin/ad_queue/${req.id}`] = null;

            await update(ref(db), updates);
            alert(`Campaign "${req.title}" is now LIVE.`);
        } catch (err) {
            console.error("Ad Approval Error:", err);
        }
    };

    return (
        <div style={adminLayout}>
            <AuraBackground />
            <header style={headerStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', position: 'relative' }}>
                    <h1 style={{ fontSize: '24px', letterSpacing: '2px', margin: 0 }}>MALVIN_ADMIN</h1>
                    <div style={badge}>SYSTEM_ADMIN</div>
                </div>
                <button onClick={handleLogout} style={logoutBtn}>LOGOUT</button>
            </header>
            
            <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr 400px', gap: '24px', position: 'relative' }}>
                
                {/* --- LEFT: USER DIRECTORY --- */}
                <section style={panelStyle}>
                    <h3 style={sectionTitle}>USER_DATABASE</h3>
                    <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        {users.map(u => (
                            <div key={u.uid} 
                                onClick={() => { setSelectedUser(u); setEditBrandName(u.brandName || ''); setEditBalance(u.treasury?.balance || ''); }}
                                 style={{...userCard, border: selectedUser?.uid === u.uid ? '1px solid #C5FF41' : '1px solid transparent'}}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{fontWeight: 600}}>{u.brandName || 'New User'}</span>
                                    {u.status === 'Banned' && <span style={{color: '#ff4d4d', fontSize: '10px'}}>BANNED</span>}
                                </div>
                                <div style={{fontSize: '11px', opacity: 0.5}}>{u.email}</div>
                                <div style={{fontSize: '12px', color: '#C5FF41', marginTop: '5px'}}>€{u.treasury?.balance || 0}</div>
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
                        {adRequests.length === 0 && <p style={{opacity: 0.3, fontSize: '12px'}}>No active deployment requests.</p>}
                        {adRequests.map(ad => (
                            <div key={ad.id} style={itemStyle}>
                                <div>
                                    <div style={{fontWeight: 700, color: '#C5FF41'}}>{ad.title}</div>
                                    <div style={{fontSize: '11px', opacity: 0.6}}>
                                        {ad.userEmail} • €{ad.budget}
                                    </div>
                                </div>
                                <button onClick={() => approveAd(ad)} style={approveBtn}>APPROVE_LIVE</button>
                            </div>
                        ))}
                    </div>
                </section>
                {/* --- RIGHT: USER EDITOR --- */}
                <section style={panelStyle}>
                    <h3 style={sectionTitle}>ACCOUNT_MODERATOR</h3>
                    {selectedUser ? (
                        <div>
                            <div style={{marginBottom: '20px'}}>
                                <label style={labelStyle}>BRAND_IDENTITY</label>
                                <input 
                                    style={inputStyle} 
                                    value={editBrandName} 
                                    onChange={(e) => setEditBrandName(e.target.value)}
                                />
                            </div>
                            <div style={{marginBottom: '20px'}}>
                                <label style={labelStyle}>TREASURY_LIQUIDITY (EUR)</label>
                                <input 
                                    style={inputStyle} 
                                    type="number" 
                                    value={editBalance}
                                    onChange={(e) => setEditBalance(e.target.value)}
                                />
                            </div>

                            <button onClick={handleSaveChanges} style={{...approveBtn, width: '100%', marginBottom: '10px'}}>APPLY_CHANGES</button>
                            <button onClick={toggleAccountStatus} style={secondaryBtn}>
                                {selectedUser.status === 'Banned' ? 'UNBAN_USER' : 'BAN_ACCOUNT'}
                            </button>

                            <div style={statusBox}>
                                <label style={labelStyle}>NEURAL_METADATA</label>
                                <p style={{fontSize: '11px', margin: '5px 0'}}>UID: {selectedUser.uid}</p>
                                <p style={{fontSize: '11px', margin: '5px 0'}}>Email: {selectedUser.email}</p>
                                <p style={{fontSize: '11px', margin: '5px 0'}}>Brand: {selectedUser.brandName}</p>
                            </div>
                        </div>
                    ) : (
                        <p style={{opacity: 0.3, textAlign: 'center', marginTop: '40px'}}>Select a user to modify</p>
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
const logoutBtn: React.CSSProperties = { background: 'transparent', border: '1px solid #ff4d4d', color: '#ff4d4d', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', fontWeight: 700 };
const secondaryBtn: React.CSSProperties = { background: 'transparent', color: '#ff4d4d', border: '1px solid #ff4d4d', width: '100%', padding: '10px', borderRadius: '8px', cursor: 'pointer' };

export default AdsManager;