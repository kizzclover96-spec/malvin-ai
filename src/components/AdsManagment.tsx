import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { ref, onValue, update, runTransaction, push, child, serverTimestamp, DataSnapshot } from "firebase/database";

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
    const [auditLogs, setAuditLogs] = useState<any[]>([])

    useEffect(() => {
        // 1. Fetch ALL Users
        const usersRef = ref(db, 'users');
        onValue(usersRef, (snapshot: DataSnapshot) => {
            const data = snapshot.val();
            if (data) {
                const formattedUsers = Object.keys(data).map(k => ({
                    uid: k,
                    ...data[k],
                    brandName: data[k].brandName || "New Merchant",
                    status: data[k].status || 'Active',
                    isVerified: data[k].isVerified || false,
                    marketHidden: data[k].marketHidden || false,
                    treasury: data[k].treasury || { balance: 0 }
                }));
                setUsers(formattedUsers);
            } else {
                setUsers([]); // Clear list if no users exist
            }
        });

        // 2. Fetch Audit Logs (Limited to last 50)
        const logsRef = ref(db, 'admin/audit_log');
        onValue(logsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const list = Object.keys(data).map(k => ({ id: k, ...data[k] }));
                setAuditLogs(list.reverse().slice(0, 50));
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

    // --- HELPER: LOG ACTION ---
    const logAction = async (action: string, targetUid: string, details: string) => {
        const logRef = ref(db, 'admin/audit_log');
        await push(logRef, {
            adminEmail: auth.currentUser?.email,
            action,
            targetUid,
            details,
            timestamp: serverTimestamp(),
            readableDate: new Date().toLocaleString()
        });
    };
  
    // 1. Add this helper to identify clusters of accounts
    const getIpClusterCount = (ip: string) => {
        if (!ip) return 0;
        return users.filter(u => u.security?.lastIp === ip).length;
    };

    const toggleGlobalMarket = async (isLocked: boolean) => {
        if (!window.confirm("WARNING: This will hide the entire Marketfront for all users. Proceed?")) return;
        await update(ref(db, 'system_settings'), { market_lockdown: isLocked });
        logAction('GLOBAL_LOCKDOWN', 'SYSTEM', `Market set to ${isLocked ? 'HIDDEN' : 'VISIBLE'}`);
    };

    // --- LOGIC: VERIFICATION ---
    const toggleVerification = async (user: any) => {
        const newStatus = !user.isVerified;
        await update(ref(db, `users/${user.uid}`), { isVerified: newStatus });
        logAction(newStatus ? 'VERIFY_USER' : 'UNVERIFY_USER', user.uid, `Verified status changed to ${newStatus}`);
    };

    // --- LOGIC: HIDE MARKETFRONT (Panic Button) ---
    const toggleMarketVisibility = async (user: any) => {
        const newHidden = !user.marketHidden;
        await update(ref(db, `users/${user.uid}`), { marketHidden: newHidden });
        logAction(newHidden ? 'HIDE_MARKET' : 'SHOW_MARKET', user.uid, `Market visibility: ${!newHidden}`);
    };

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
        updates[`users/${selectedUser.uid}/brandName`] = editBrandName;
        updates[`users/${selectedUser.uid}/treasury/balance`] = parseFloat(editBalance);
        
        await update(ref(db), updates);
        logAction('UPDATE_ACCOUNT', selectedUser.uid, `New Name: ${editBrandName}, New Bal: ${editBalance}`);
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
                    <div style={badge}>v2.0_SECURE</div>
                </div>
                <button onClick={handleLogout} style={logoutBtn}>LOGOUT</button>
            </header>
            {/* --- TOP BAR: SYSTEM STATUS & PANIC BUTTON --- */}
            <div style={{ display: 'flex', gap: '20px', marginBottom: '20px' }}>
                <div style={panelStyle}>
                    <span style={labelStyle}>GLOBAL_MARKET_STATUS</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                        <button 
                            onClick={() => toggleGlobalMarket(true)} 
                            style={{ ...toolBtn, background: '#ff4d4d', color: '#fff' }}>
                            ACTIVATE_LOCKDOWN
                        </button>
                        <button 
                            onClick={() => toggleGlobalMarket(false)} 
                            style={{ ...toolBtn, borderColor: '#C5FF41', color: '#C5FF41' }}>
                            RESTORE_SYSTEM
                        </button>
                    </div>
                </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr 400px', gap: '24px', position: 'relative' }}>

                
                {/* --- USER_DATABASE (Updated with Bot Detection) --- */}
                <section style={panelStyle}>
                    <h3 style={sectionTitle}>MERCHANT_DIRECTORY</h3>
                    <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        {users.map(u => {
                            const ipCount = getIpClusterCount(u.security?.lastIp);
                            const isSuspicious = ipCount > 2; // More than 2 accounts on 1 IP is a red flag

                            return (
                                <div key={u.uid} 
                                    onClick={() => setSelectedUser(u)}
                                    style={{
                                        ...userCard, 
                                        border: selectedUser?.uid === u.uid ? '1px solid #C5FF41' : '1px solid transparent',
                                        background: isSuspicious ? 'rgba(255, 77, 77, 0.08)' : 'rgba(255,255,255,0.03)'
                                    }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{fontWeight: 600}}>
                                            {u.isVerified && "✓ "} {u.brandName}
                                        </span>
                                        {isSuspicious && (
                                            <span style={botTag}>BOT_DETECTED</span>
                                        )}
                                    </div>
                                    <div style={{fontSize: '10px', opacity: 0.5}}>
                                        IP: {u.security?.lastIp || 'NO_DATA'} • {ipCount} ACCOUNTS
                                    </div>
                                    {/* Progress bar showing risk level */}
                                    <div style={{width: '100%', height: '2px', background: '#222', marginTop: '8px'}}>
                                        <div style={{
                                            width: `${Math.min(ipCount * 20, 100)}%`, 
                                            height: '100%', 
                                            background: isSuspicious ? '#ff4d4d' : '#C5FF41'
                                        }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* --- CENTER: ACTIVITY FEED --- */}
                <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div style={panelStyle}>
                        <h3 style={sectionTitle}>ACCOUNT_MODERATOR</h3>
                        {selectedUser ? (
                            <div style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
                                <div style={toolRow}>
                                    <button onClick={() => toggleVerification(selectedUser)} style={selectedUser.isVerified ? verifyBtnActive : toolBtn}>
                                        {selectedUser.isVerified ? 'REVOKE_VERIFIED' : 'GRANT_VERIFIED'}
                                    </button>
                                    <button onClick={() => toggleMarketVisibility(selectedUser)} style={selectedUser.marketHidden ? toolBtnPanic : toolBtn}>
                                        {selectedUser.marketHidden ? 'RESTORE_MARKET' : 'HIDE_MARKETFRONT'}
                                    </button>
                                </div>
                                
                                <input style={inputStyle} value={editBrandName} onChange={e => setEditBrandName(e.target.value)} placeholder="Brand Name" />
                                <input style={inputStyle} type="number" value={editBalance} onChange={e => setEditBalance(e.target.value)} placeholder="Balance €" />
                                
                                <div style={{display: 'flex', gap: '10px'}}>
                                    <button onClick={handleSaveChanges} style={approveBtn}>SAVE_CHANGES</button>
                                    <button onClick={async () => {
                                        const newStatus = selectedUser.status === 'Banned' ? 'Active' : 'Banned';
                                        await update(ref(db, `users/${selectedUser.uid}`), { status: newStatus });
                                        logAction(newStatus === 'Banned' ? 'BAN_USER' : 'UNBAN_USER', selectedUser.uid, 'Status Toggle');
                                    }} style={secondaryBtn}>
                                        {selectedUser.status === 'Banned' ? 'LIFT_BAN' : 'BAN_PERMANENTLY'}
                                    </button>
                                </div>
                            </div>
                        ) : <div style={{opacity: 0.2, textAlign: 'center', padding: '40px'}}>SELECT_USER_TO_EDIT</div>}
                    </div>

                    <div style={panelStyle}>
                        <h3 style={sectionTitle}>SYSTEM_AD_QUEUE</h3>
                        {adRequests.map(ad => (
                            <div key={ad.id} style={itemStyle}>
                                <div style={{fontSize: '12px'}}>{ad.title} <br/><span style={{opacity: 0.5}}>{ad.userEmail}</span></div>
                                <button onClick={() => approveAd(ad)} style={approveBtn}>DEPLOY</button>
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
                    <h3 style={sectionTitle}>SECURITY_AUDIT_LOG</h3>
                    <div style={scrollArea}>
                        {auditLogs.map(log => (
                            <div key={log.id} style={logItem}>
                                <div style={{color: '#C5FF41', fontWeight: 700}}>{log.action}</div>
                                <div style={{fontSize: '11px'}}>{log.details}</div>
                                <div style={{fontSize: '9px', opacity: 0.3, marginTop: '4px'}}>
                                    {log.readableDate} • By: {log.adminEmail?.split('@')[0]}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

            </div>
        </div>
    );
};

// --- STYLES ---
const botTag: React.CSSProperties = {
    background: '#ff4d4d',
    color: '#fff',
    fontSize: '8px',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: 900,
    letterSpacing: '1px'
};

const gridMain: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: '24px', position: 'relative', height: '80vh' };
const scrollArea: React.CSSProperties = { height: '100%', overflowY: 'auto', paddingRight: '10px' };
const toolRow: React.CSSProperties = { display: 'flex', gap: '10px' };
const toolBtn: React.CSSProperties = { flex: 1, background: '#111', border: '1px solid #333', color: '#fff', padding: '10px', borderRadius: '8px', fontSize: '10px', cursor: 'pointer' };
const verifyBtnActive: React.CSSProperties = { ...toolBtn, borderColor: '#C5FF41', color: '#C5FF41', background: 'rgba(197, 255, 65, 0.05)' };
const toolBtnPanic: React.CSSProperties = { ...toolBtn, borderColor: '#ff4d4d', color: '#ff4d4d', background: 'rgba(255, 77, 77, 0.05)' };
const logItem: React.CSSProperties = { padding: '12px', borderBottom: '1px solid #111', marginBottom: '5px' };
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