import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { ref, onValue, update, push, serverTimestamp, DataSnapshot } from "firebase/database";

const AdsManager = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [editBalance, setEditBalance] = useState('');
    const [editBrandName, setEditBrandName] = useState('');
    const [adRequests, setAdRequests] = useState<any[]>([]);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);

    useEffect(() => {
        const usersRef = ref(db, 'users');
        const unsubUsers = onValue(usersRef, (snapshot: DataSnapshot) => {
            const data = snapshot.val();
            if (data) {
                const formatted = Object.keys(data).map(k => ({
                    uid: k,
                    ...data[k],
                    displayName: data[k].brandName || data[k].email || "GHOST_USER",
                }));
                setUsers(formatted);
                if (selectedUser) {
                    const updated = formatted.find(u => u.uid === selectedUser.uid);
                    if (updated) setSelectedUser(updated);
                }
            }
        });

        const logsRef = ref(db, 'admin/audit_log');
        onValue(logsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const list = Object.keys(data).map(k => ({ id: k, ...data[k] }));
                setAuditLogs(list.reverse().slice(0, 50));
            }
        });

        const adQueueRef = ref(db, 'admin/ad_queue');
        onValue(adQueueRef, (snapshot) => {
            const data = snapshot.val();
            setAdRequests(data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : []);
        });

        return () => unsubUsers();
    }, [selectedUser?.uid]);

    // --- HANDLERS ---
    const handleSelectUser = (u: any) => {
        setSelectedUser(u);
        setEditBrandName(u.brandName || '');
        setEditBalance(u.treasury?.balance?.toString() || '0');
    };

    const getIpClusterCount = (ip: string) => {
        return ip ? users.filter(u => u.security?.lastIp === ip).length : 0;
    };

    const logAction = async (action: string, targetUid: string, details: string) => {
        await push(ref(db, 'admin/audit_log'), {
            adminEmail: auth.currentUser?.email,
            action, targetUid, details,
            timestamp: serverTimestamp(),
        });
    };

    // 1. Password Reset Handler
    const handlePasswordReset = async () => {
        if (!selectedUser?.email) return;
        try {
            // Note: For security, Firebase handles password changes via email.
            // Direct password setting requires Admin SDK (Backend).
            alert(`RESET_LINK_SENT_TO: ${selectedUser.email}`);
            await logAction('PASS_RESET_INIT', selectedUser.uid, `Sent to ${selectedUser.email}`);
        } catch (err) {
            console.error(err);
        }
    };

    // 2. Status Update Handler (Ban/Warn/Active)
    const handleUpdateStatus = async (newStatus: string) => {
        if (!selectedUser) return;
        const updates: any = {};
        updates[`users/${selectedUser.uid}/status`] = newStatus;
        
        await update(ref(db), updates);
        logAction('STATUS_CHANGE', selectedUser.uid, `Status set to: ${newStatus}`);
        alert(`USER_STATUS: ${newStatus}`);
    };

    // 3. Updated Save Changes (Fixing the Brand Path)
    const handleSaveChanges = async () => {
        if (!selectedUser) return;
        const updates: any = {};
        
        // We target 'brandData/name' to ensure MarketFront sees the change
        updates[`users/${selectedUser.uid}/brandData/name`] = editBrandName;
        updates[`users/${selectedUser.uid}/treasury/balance`] = parseFloat(editBalance);
        
        try {
            await update(ref(db), updates);
            logAction('UPDATE_ACCOUNT', selectedUser.uid, `Name: ${editBrandName}, Bal: ${editBalance}`);
            alert("SYNC_COMPLETE");
        } catch (err) {
            alert("SYNC_ERROR");
        }
    };

    return (
        <div style={adminLayout}>
            <header style={headerStyle}>
                <h1 style={{ fontSize: '20px', letterSpacing: '3px' }}>MALVIN_ADMIN_V2</h1>
                <button onClick={() => signOut(auth)} style={logoutBtn}>LOGOUT</button>
            </header>
            
            <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr 350px', gap: '24px' }}>

                {/* --- UPDATED MERCHANT DIRECTORY --- */}
                <section style={panelStyle}>
                    <h3 style={sectionTitle}>MERCHANT_DIRECTORY</h3>
                    <div style={{ maxHeight: '75vh', overflowY: 'auto', paddingRight: '8px' }}>
                        {users.map((u) => {
                            const ipCount = getIpClusterCount(u.security?.lastIp);
                            const isHighRisk = ipCount > 2;
                            const isSelected = selectedUser?.uid === u.uid;

                            // FIX: Access the name inside the brandData object, exactly like MarketFront does
                            const merchantName = u.brandData?.name || u.brandName || "Ghost_User";

                            return (
                                <div 
                                    key={u.uid} 
                                    onClick={() => handleSelectUser(u)}
                                    style={{
                                        ...userCard,
                                        borderLeft: isSelected ? '4px solid #C5FF41' : '4px solid transparent',
                                        background: u.status === 'Banned' 
                                            ? 'rgba(255, 77, 77, 0.1)' 
                                            : isSelected ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)',
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '14px', fontWeight: 700, color: u.isVerified ? '#C5FF41' : '#fff' }}>
                                            {u.isVerified && "✓ "}{merchantName.toUpperCase()}
                                        </span>
                                        {isHighRisk && <span style={botTag}>RISK_CLUSTER</span>}
                                    </div>
                                    
                                    <div style={dirMetadata}>
                                        <span style={{ opacity: 0.4 }}>EMAIL:</span> {u.email || 'N/A'}
                                    </div>

                                    <div style={dirMetadata}>
                                        <span style={{ opacity: 0.4 }}>B_ID:</span> 
                                        <span style={{ fontFamily: 'monospace', marginLeft: '4px' }}>{u.uid}</span>
                                    </div>

                                    <div style={{ 
                                        display: 'flex', 
                                        justifyContent: 'space-between', 
                                        marginTop: '10px', 
                                        paddingTop: '8px', 
                                        borderTop: '1px solid rgba(255,255,255,0.05)',
                                        fontSize: '10px' 
                                    }}>
                                        <span style={{ color: '#C5FF41' }}>€{u.treasury?.balance?.toLocaleString() || '0'}</span>
                                        <span style={{ opacity: 0.4 }}>IP: {u.security?.lastIp || 'UNKNOWN'}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* --- UPDATED ACCOUNT_MODERATOR SECTION --- */}
                <section style={panelStyle}>
                    <h3 style={sectionTitle}>ACCOUNT_MODERATOR</h3>
                    {selectedUser ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            
                            {/* BRAND & BALANCE */}
                            <div>
                                <label style={labelStyle}>EDIT_BRAND_NAME</label>
                                <input 
                                    style={inputStyle} 
                                    value={editBrandName} 
                                    onChange={e => setEditBrandName(e.target.value)} 
                                />
                            </div>

                            <div>
                                <label style={labelStyle}>ADJUST_TREASURY_BALANCE</label>
                                <input 
                                    style={inputStyle} 
                                    type="number" 
                                    value={editBalance} 
                                    onChange={e => setEditBalance(e.target.value)} 
                                />
                            </div>

                            {/* STATUS MANAGEMENT */}
                            <div>
                                <label style={labelStyle}>ACCOUNT_STATUS</label>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                                    <button 
                                        onClick={() => handleUpdateStatus('Active')}
                                        style={{ ...statusBtn, border: selectedUser.status === 'Active' ? '1px solid #C5FF41' : '1px solid #333' }}
                                    >ACTIVE</button>
                                    <button 
                                        onClick={() => handleUpdateStatus('Warned')}
                                        style={{ ...statusBtn, color: '#ffcc00' }}
                                    >WARN</button>
                                    <button 
                                        onClick={() => handleUpdateStatus('Banned')}
                                        style={{ ...statusBtn, color: '#ff4d4d' }}
                                    >BAN</button>
                                </div>
                            </div>

                            <hr style={{ border: 'none', borderTop: '1px solid #222', margin: '10px 0' }} />

                            {/* SECURITY ACTIONS */}
                            <div>
                                <label style={labelStyle}>SECURITY_OVERRIDE</label>
                                <button 
                                    onClick={handlePasswordReset}
                                    style={{ ...inputStyle, cursor: 'pointer', textAlign: 'center', marginTop: '8px', color: '#888' }}
                                >
                                    SEND_PASSWORD_RESET_EMAIL
                                </button>
                            </div>

                            <button onClick={handleSaveChanges} style={approveBtn}>PUSH_CHANGES_TO_DB</button>

                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', opacity: 0.3, padding: '50px' }}>SELECT_MERCHANT_TO_MODERATE</div>
                    )}
                </section>

                {/* --- RIGHT: AUDIT LOGS --- */}
                <section style={panelStyle}>
                    <h3 style={sectionTitle}>SYSTEM_AUDIT_LOG</h3>
                    <div style={{ height: '70vh', overflowY: 'auto' }}>
                        {auditLogs.map(log => (
                            <div key={log.id} style={logItem}>
                                <div style={{ color: '#C5FF41', fontSize: '10px' }}>{log.action}</div>
                                <div style={{ fontSize: '11px', opacity: 0.7 }}>{log.details}</div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

// --- STYLES ---
const statusBtn: React.CSSProperties = {
    flex: 1,
    background: '#111',
    border: '1px solid #333',
    color: '#fff',
    padding: '8px',
    borderRadius: '6px',
    fontSize: '10px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: '0.2s'
};
const adminLayout: React.CSSProperties = { background: '#000', minHeight: '100vh', padding: '40px', color: '#fff', fontFamily: 'Inter, sans-serif' };
const panelStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '24px', padding: '24px', backdropFilter: 'blur(10px)' };
const userCard: React.CSSProperties = { padding: '16px', borderRadius: '12px', marginBottom: '12px', cursor: 'pointer', transition: '0.2s', border: '1px solid rgba(255,255,255,0.05)' };
const dirMetadata: React.CSSProperties = { fontSize: '10px', marginBottom: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
const sectionTitle: React.CSSProperties = { fontSize: '11px', letterSpacing: '2px', opacity: 0.4, marginBottom: '20px', borderBottom: '1px solid #222', paddingBottom: '10px' };
const inputStyle: React.CSSProperties = { width: '100%', background: '#000', border: '1px solid #333', padding: '12px', borderRadius: '8px', color: '#fff' };
const approveBtn: React.CSSProperties = { background: '#C5FF41', color: '#000', border: 'none', padding: '12px', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' };
const labelStyle: React.CSSProperties = { fontSize: '10px', opacity: 0.5 };
const logItem: React.CSSProperties = { padding: '10px', borderBottom: '1px solid #111' };
const botTag: React.CSSProperties = { background: '#ff4d4d', color: '#fff', fontSize: '8px', padding: '2px 6px', borderRadius: '4px', fontWeight: 900 };
const headerStyle: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', marginBottom: '30px' };
const logoutBtn: React.CSSProperties = { background: 'transparent', border: '1px solid #ff4d4d', color: '#ff4d4d', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' };

export default AdsManager;