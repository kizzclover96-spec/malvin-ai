import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
// Rename them using 'as' so they don't clash or get left undefined
import { ref, onValue, update, push, serverTimestamp, DataSnapshot } from "firebase/database";
import { doc, collection, query, orderBy, onSnapshot, addDoc, setDoc, serverTimestamp as firestoreTimestamp } from "firebase/firestore";
import { firestore } from "../firebase"; // Your firestore initialization file

const AdsManager = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [editBalance, setEditBalance] = useState('');
    const [editBrandName, setEditBrandName] = useState('');
    const [editIsVerified, setEditIsVerified] = useState(false); // Dynamic Verification State
    const [adRequests, setAdRequests] = useState<any[]>([]);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [verificationRequests, setVerificationRequests] = useState<any[]>([]);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [filter, setFilter] = useState("Pending_Admin_Review");
    
    // --- NEW MESSAGING STATES ---
    const [chatMessage, setChatMessage] = useState(''); // Keep this if you use it elsewhere
    const [adminMessage, setAdminMessage] = useState('');
    const [sendingMsg, setSendingMsg] = useState(false);
    const [conversationMessages, setConversationMessages] = useState<any[]>([]); // 🌟 ADD THIS
    
    const filteredAds = adRequests.filter(ad =>
        filter === "ALL" ? true : ad.status === filter
    );
    useEffect(() => {
        const verificationRef = ref(db, 'admin/verification_requests');

        const unsubVerification = onValue(verificationRef, (snapshot) => {
            const data = snapshot.val();

            if (data) {
                const list = Object.keys(data).map(k => ({
                    id: k,
                    ...data[k]
                }));

                setVerificationRequests(list.reverse());
            } else {
                setVerificationRequests([]);
            }
        });

        return () => unsubVerification();
    }, []);

    useEffect(() => {
        const usersRef = ref(db, 'users');
        const unsubUsers = onValue(usersRef, (snapshot: DataSnapshot) => {
            const data = snapshot.val();
            if (data) {
                const formatted = Object.keys(data).map(k => ({
                    uid: k,
                    ...data[k],
                    displayName: data[k].brandData?.name || data[k].brandName || data[k].email || "GHOST_USER",
                    isVerified: data[k].profile?.isVerified || false // Reading flag locally from nested node
                }));
                setUsers(formatted);
                if (selectedUser) {
                    const updated = formatted.find(u => u.uid === selectedUser.uid);
                    if (updated) setSelectedUser(updated);
                }
            }
        });
        
        const logsRef = ref(db, 'admin/audit_log');
        const unsubLogs = onValue(logsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const list = Object.keys(data).map(k => ({ id: k, ...data[k] }));
                setAuditLogs(list.reverse().slice(0, 50));
            }
        });

        const adQueueRef = ref(db, 'admin/ad_queue');
        const unsubAdQueue = onValue(adQueueRef, (snapshot) => {
            const data = snapshot.val();
            setAdRequests(data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : []);
        });

        return () => {
            unsubUsers();
            unsubLogs();
            unsubAdQueue();
        };
        
    }, [selectedUser?.uid]);

    // --- HANDLERS ---
    const handleSelectUser = (u: any) => {
        setSelectedUser(u);
        setEditBrandName(u.brandData?.name || u.brandName || '');
        setEditBalance(u.treasury?.balance?.toString() || '0');
        setEditIsVerified(u.profile?.isVerified || false);
        setChatMessage(''); // Clear messages between brand swaps
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

    const handlePasswordReset = async () => {
        if (!selectedUser?.email) return;
        try {
            alert(`RESET_LINK_SENT_TO: ${selectedUser.email}`);
            await logAction('PASS_RESET_INIT', selectedUser.uid, `Sent to ${selectedUser.email}`);
        } catch (err) {
            console.error(err);
        }
    };

    const handleUpdateStatus = async (newStatus: string) => {
        if (!selectedUser) return;
        const updates: any = {};
        updates[`users/${selectedUser.uid}/status`] = newStatus;
        
        await update(ref(db), updates);
        logAction('STATUS_CHANGE', selectedUser.uid, `Status set to: ${newStatus}`);
        alert(`USER_STATUS: ${newStatus}`);
    };

    const handleSaveChanges = async () => {
        if (!selectedUser) return;
        const updates: any = {};
        
        updates[`users/${selectedUser.uid}/brandData/name`] = editBrandName;
        updates[`users/${selectedUser.uid}/treasury/balance`] = parseFloat(editBalance);
        updates[`users/${selectedUser.uid}/profile/isVerified`] = editIsVerified; // Push verified configuration change
        
        try {
            await update(ref(db), updates);
            logAction('UPDATE_ACCOUNT', selectedUser.uid, `Name: ${editBrandName}, Bal: ${editBalance}, Verified: ${editIsVerified}`);
            alert("SYNC_COMPLETE");
        } catch (err) {
            alert("SYNC_ERROR");
        }
    };

    // --- NEW: INTERCOM BRAND DISPATCHER ---

   
    const sendAdminMessageToFirestore = async (selectedUser, messageText) => {
        if (!messageText?.trim()) return;

        // The chat UI uses the conversation ID (selectedChatId) to read subcollections.
        // Assuming the conversation ID is the user's UID or a shared ID:
        const chatId = selectedUser.uid; 

        try {
            // 1. Add the new message to the subcollection path: conversations/$chatId/messages
            await addDoc(collection(firestore, "conversations", chatId, "messages"), {
            text: messageText,
            sender: 'manager', 
            timestamp: firestoreTimestamp() // 🌟 Updated here
        });

            // 2. Update the parent conversation document so it bubbles up in their sidebar
            await setDoc(doc(firestore, "conversations", chatId), {
                lastMessage: messageText,
                updatedAt: firestoreTimestamp(), // 🌟 Updated here
                viewedByManager: true 
            }, { merge: true });

            console.log("📨 Message synced to Firestore successfully!");
        } catch (error) {
            console.error("Error writing to Firestore:", error);
        }
    };
    useEffect(() => {
        if (!selectedUser?.uid) {
            setConversationMessages([]);
            return;
        }

        // Point to the messages subcollection for the selected user
        const messagesQuery = query(
            collection(firestore, "conversations", selectedUser.uid, "messages"),
            orderBy("timestamp", "asc")
        );

        // Listen for real-time updates
        const unsubscribeChat = onSnapshot(messagesQuery, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setConversationMessages(msgs);
        }, (error) => {
            console.error("Error listening to chat history:", error);
        });

        // Clean up the listener when the user changes or component unmounts
        return () => unsubscribeChat();
    }, [selectedUser?.uid]);

    return (
        <div style={adminLayout}>
            <header style={headerStyle}>
                <h1 style={{ fontSize: '20px', letterSpacing: '3px' }}>MALVIN_ADMIN_V2</h1>
                <button onClick={() => signOut(auth)} style={logoutBtn}>LOGOUT</button>
            </header>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                {["ALL", "Pending_Admin_Review", "Approved", "Rejected"].map(f => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        style={{
                            padding: '6px 10px',
                            fontSize: '10px',
                            border: '1px solid #333',
                            background: filter === f ? '#C5FF41' : 'transparent',
                            color: filter === f ? '#000' : '#fff'
                        }}
                    >
                        {f}
                    </button>
                ))}
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr 350px', gap: '24px' }}>

                {/* --- MERCHANT DIRECTORY --- */}
                <section style={panelStyle}>
                    <h3 style={sectionTitle}>MERCHANT_DIRECTORY</h3>
                    <div style={{ maxHeight: '75vh', overflowY: 'auto', paddingRight: '8px' }}>
                        {users.map((u) => {
                            const ipCount = getIpClusterCount(u.security?.lastIp);
                            const isHighRisk = ipCount > 2;
                            const isSelected = selectedUser?.uid === u.uid;
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
                                        <span style={{ fontSize: '14px', fontWeight: 700, color: u.isVerified ? '#007fff' : '#fff' }}>
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

                {/* --- ACCOUNT_MODERATOR SECTION --- */}
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

                            {/* VERIFICATION PRESETS */}
                            <div>
                                <label style={labelStyle}>VERIFICATION_STATUS</label>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                                    <button
                                        onClick={() => setEditIsVerified(true)}
                                        style={{ 
                                            ...statusBtn, 
                                            border: editIsVerified ? '1px solid #007fff' : '1px solid #333',
                                            color: editIsVerified ? '#007fff' : '#fff'
                                        }}
                                    >
                                        VERIFIED
                                    </button>
                                    <button
                                        onClick={() => setEditIsVerified(false)}
                                        style={{ 
                                            ...statusBtn, 
                                            border: !editIsVerified ? '1px solid #ff4d4d' : '1px solid #333',
                                            color: !editIsVerified ? '#ff4d4d' : '#fff'
                                        }}
                                    >
                                        UNVERIFIED
                                    </button>
                                </div>
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

                            <hr style={{ border: 'none', borderTop: '1px solid #222', margin: '5px 0' }} />

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

                            <hr style={{ border: 'none', borderTop: '1px solid #222', margin: '5px 0' }} />

                            {/* --- BRAND LIVE MESSENGER MODULE --- */}
                            <div style={messengerContainer}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                                    <label style={labelStyle}>SECURE_INTERCOM_DISPATCH</label>
                                    <span style={{ fontSize: '10px', color: '#007fff', fontWeight: 'bold' }}>
                                        (Chatting with: {selectedUser.brandData?.name || selectedUser.brandName || "User"})
                                    </span>
                                </div>

                                {/* 🌟 NEW: Live Message History Feed Box */}
                                <div style={{
                                    height: '200px',
                                    overflowY: 'auto',
                                    background: '#000',
                                    border: '1px solid #222',
                                    borderRadius: '8px',
                                    padding: '12px',
                                    marginBottom: '12px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '8px'
                                }}>
                                    {conversationMessages.length === 0 ? (
                                        <div style={{ textAlign: 'center', opacity: 0.3, fontSize: '11px', marginTop: '80px' }}>
                                            NO_CONVERSATION_HISTORY
                                        </div>
                                    ) : (
                                        conversationMessages.map((msg) => {
                                            const isAdmin = msg.sender === 'manager';
                                            return (
                                                <div 
                                                    key={msg.id} 
                                                    style={{
                                                        alignSelf: isAdmin ? 'flex-end' : 'flex-start',
                                                        background: isAdmin ? 'rgba(0, 127, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                                                        border: isAdmin ? '1px solid #007fff' : '1px solid #333',
                                                        color: '#fff',
                                                        padding: '8px 12px',
                                                        borderRadius: '12px',
                                                        maxWidth: '80%',
                                                        fontSize: '12px',
                                                        wordBreak: 'break-word'
                                                    }}
                                                >
                                                    <div style={{ fontSize: '9px', opacity: 0.5, marginBottom: '2px', fontWeight: 'bold' }}>
                                                        {isAdmin ? 'MALVIN_ADMIN' : 'MERCHANT'}
                                                    </div>
                                                    {msg.text}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>

                                {/* Input Control Block */}
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <input 
                                        type="text"
                                        placeholder="Type a message secure payload..."
                                        value={adminMessage} 
                                        onChange={(e) => setAdminMessage(e.target.value)}
                                        style={{ ...inputStyle, flex: 1 }}
                                        onKeyDown={async (e) => { 
                                            if (e.key === 'Enter' && !sendingMsg && adminMessage?.trim()) {
                                                setSendingMsg(true);
                                                await sendAdminMessageToFirestore(selectedUser, adminMessage);
                                                setAdminMessage('');
                                                setSendingMsg(false);
                                            } 
                                        }}
                                    />
                                    <button 
                                        onClick={async () => {
                                            if (!adminMessage.trim() || sendingMsg) return;
                                            setSendingMsg(true);
                                            await sendAdminMessageToFirestore(selectedUser, adminMessage);
                                            setAdminMessage('');
                                            setSendingMsg(false);
                                        }}
                                        disabled={sendingMsg || !adminMessage?.trim()}
                                        style={{
                                            ...approveBtn,
                                            background: '#007fff',
                                            color: '#fff',
                                            padding: '0 16px',
                                            opacity: (sendingMsg || !adminMessage?.trim()) ? 0.4 : 1,
                                            cursor: (sendingMsg || !adminMessage?.trim()) ? 'not-allowed' : 'pointer'
                                        }}
                                    >
                                        {sendingMsg ? '...' : 'SEND'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', opacity: 0.3, padding: '50px' }}>SELECT_MERCHANT_TO_MODERATE</div>
                    )}
                </section>

                {/* --- RIGHT: AUDIT LOGS --- */}
                <section style={panelStyle}>
                    <h3 style={sectionTitle}>VERIFICATION_REQUESTS</h3>

                    <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        {verificationRequests.length === 0 ? (
                            <div style={{ opacity: 0.3, fontSize: '12px' }}>
                                NO_PENDING_REQUESTS
                            </div>
                        ) : (
                            verificationRequests.map(req => (
                                <div key={req.id} style={{
                                    padding: '12px',
                                    borderBottom: '1px solid #111',
                                    fontSize: '12px'
                                }}>
                                    <div style={{ color: '#C5FF41', fontWeight: 700 }}>
                                        {req.brandName}
                                    </div>

                                    <div style={{ fontSize: '10px', opacity: 0.6 }}>
                                        UID: {req.uid}
                                    </div>

                                    <div style={{ fontSize: '10px', opacity: 0.6 }}>
                                        EMAIL: {req.email}
                                    </div>

                                    <div style={{ fontSize: '10px', marginTop: '6px' }}>
                                        STATUS: {req.status}
                                    </div>

                                    <button
                                        style={{
                                            marginTop: '10px',
                                            padding: '6px 10px',
                                            fontSize: '10px',
                                            border: '1px solid #C5FF41',
                                            background: processingId === req.id ? '#333' : 'transparent',
                                            color: '#C5FF41',
                                            cursor: processingId === req.id ? 'not-allowed' : 'pointer',
                                            opacity: processingId === req.id ? 0.5 : 1
                                        }}
                                        disabled={processingId === req.id}
                                        onClick={async () => {
                                            try {
                                                setProcessingId(req.id);

                                                await update(ref(db), {
                                                    [`users/${req.uid}/profile/isVerified`]: true,
                                                    [`users/${req.uid}/profile/verifiedAt`]: serverTimestamp(),
                                                    [`admin/verification_requests/${req.id}/status`]: "approved"
                                                });

                                                await push(ref(db, 'admin/audit_log'), {
                                                    adminEmail: auth.currentUser?.email,
                                                    action: 'VERIFY_USER',
                                                    targetUid: req.uid,
                                                    details: `Approved verification for ${req.brandName}`,
                                                    timestamp: serverTimestamp(),
                                                });

                                            } finally {
                                                setProcessingId(null);
                                            }
                                        }}
                                    >
                                        {processingId === req.id ? "PROCESSING..." : "APPROVE"}
                                    </button>
                                    <button
                                        style={{
                                            ...statusBtn,
                                            opacity: processingId === req.id ? 0.5 : 1,
                                            cursor: processingId === req.id ? 'not-allowed' : 'pointer'
                                        }}
                                        disabled={processingId === req.id}
                                        onClick={async () => {
                                            try {
                                                setProcessingId(req.id);

                                                await update(ref(db), {
                                                    [`admin/verification_requests/${req.id}/status`]: "rejected"
                                                });

                                                await push(ref(db, 'admin/audit_log'), {
                                                    adminEmail: auth.currentUser?.email,
                                                    action: 'REJECT_VERIFY',
                                                    targetUid: req.uid,
                                                    details: `Rejected verification for ${req.brandName}`,
                                                    timestamp: serverTimestamp(),
                                                });

                                            } finally {
                                                setProcessingId(null);
                                            }
                                        }}
                                    >
                                        {processingId === req.id ? "PROCESSING..." : "REJECT"}
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </section>
                {/* --- AD APPROVAL QUEUE --- */}
                <section style={panelStyle}>
                    <h3 style={sectionTitle}>AD_APPROVAL_QUEUE</h3>

                    <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        {adRequests.length === 0 ? (
                            <div style={{ opacity: 0.3, fontSize: '12px' }}>
                                NO_PENDING_ADS
                            </div>
                        ) : (
                            filteredAds.map((ad) => (
                                <div
                                    key={ad.id}
                                    style={{
                                        padding: '14px',
                                        borderBottom: '1px solid #111',
                                        background: 'rgba(255,255,255,0.02)',
                                        marginBottom: '10px',
                                        borderRadius: '10px'
                                    }}
                                >
                                    {/* TITLE */}
                                    <div style={{ color: '#C5FF41', fontWeight: 700 }}>
                                        {ad.title}
                                    </div>

                                    {/* META */}
                                    <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '6px' }}>
                                        USER: {ad.userEmail}
                                    </div>

                                    <div style={{ fontSize: '10px', opacity: 0.6 }}>
                                        PLATFORM: {ad.platform}
                                    </div>

                                    <div style={{ fontSize: '10px', opacity: 0.6 }}>
                                        BUDGET: €{ad.budget}
                                    </div>

                                    <div style={{ fontSize: '10px', opacity: 0.6 }}>
                                        CTA: {ad.cta}
                                    </div>

                                    {/* DESCRIPTION */}
                                    <div style={{ fontSize: '11px', marginTop: '8px', opacity: 0.8 }}>
                                        {ad.description}
                                    </div>

                                    {/* CREATIVE PREVIEW */}
                                    {ad.creativeUrl && (
                                        <div style={{ marginTop: '10px' }}>
                                            {ad.creativeUrl.includes('.mp4') ? (
                                                <video
                                                    src={ad.creativeUrl}
                                                    controls
                                                    style={{ width: '100%', borderRadius: '8px' }}
                                                />
                                            ) : (
                                                <img
                                                    src={ad.creativeUrl}
                                                    style={{ width: '100%', borderRadius: '8px' }}
                                                />
                                            )}
                                        </div>
                                    )}

                                    {/* ACTIONS */}
                                    <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>

                                        {/* APPROVE */}
                                        <button
                                            style={{
                                                ...approveBtn,
                                                flex: 1,
                                                background: '#C5FF41'
                                            }}
                                            onClick={async () => {
                                                try {
                                                    const user = users.find(u => u.uid === ad.userId);
                                                    const budget = Number(ad.budget || 0);
                                                    const currentBalance = Number(user?.treasury?.balance || 0);
                                                    const newBalance = currentBalance - budget;

                                                    const ledgerKey = push(ref(db, `users/${ad.userId}/treasury/ledger`)).key;

                                                    const updates: any = {};

                                                    // 1. Campaign update
                                                    updates[`users/${ad.userId}/campaigns/${ad.campaignId}/status`] = "Approved";
                                                    updates[`users/${ad.userId}/campaigns/${ad.campaignId}/reviewStatus`] = "Approved";

                                                    // 2. Deduct balance
                                                    updates[`users/${ad.userId}/treasury/balance`] = newBalance;

                                                    // 3. Ledger entry
                                                    updates[`users/${ad.userId}/treasury/ledger/${ledgerKey}`] = {
                                                        type: "Charged",
                                                        amount: ad.budget,
                                                        label: `Approved Ad: ${ad.title}`,
                                                        status: "Completed",
                                                        timestamp: Date.now()
                                                    };

                                                    // 4. Queue update
                                                    updates[`admin/ad_queue/${ad.id}/status`] = "Approved";

                                                    await update(ref(db), updates);

                                                    await push(ref(db, 'admin/audit_log'), {
                                                        adminEmail: auth.currentUser?.email,
                                                        action: 'APPROVE_AD',
                                                        targetUid: ad.userId,
                                                        details: `Approved campaign: ${ad.title}`,
                                                        timestamp: serverTimestamp(),
                                                    });

                                                    alert("AD_APPROVED");
                                                } catch (err) {
                                                    console.error(err);
                                                    alert("APPROVAL_FAILED");
                                                }
                                            }}
                                        >
                                            APPROVE
                                        </button>

                                        {/* REJECT */}
                                        <button
                                            style={{
                                                ...statusBtn,
                                                flex: 1,
                                                color: '#ff4d4d',
                                                border: '1px solid #ff4d4d'
                                            }}
                                            onClick={async () => {
                                                const reason = prompt("Enter rejection reason:");
                                                if (!reason) return;

                                                try {
                                                    const updates: any = {};

                                                    // 1. Update user campaign
                                                    updates[`users/${ad.userId}/campaigns/${ad.campaignId}/status`] = "Rejected";
                                                    updates[`users/${ad.userId}/campaigns/${ad.campaignId}/rejectionReason`] = reason;

                                                    // 2. Update ad queue
                                                    updates[`admin/ad_queue/${ad.id}/status`] = "Rejected";
                                                    updates[`admin/ad_queue/${ad.id}/archived`] = true;
                                                    updates[`admin/ad_queue/${ad.id}/rejectionReason`] = reason;

                                                    await update(ref(db), updates);

                                                    // 3. audit log
                                                    await push(ref(db, 'admin/audit_log'), {
                                                        adminEmail: auth.currentUser?.email,
                                                        action: 'REJECT_AD',
                                                        targetUid: ad.userId,
                                                        details: `Rejected campaign: ${ad.title} (${reason})`,
                                                        timestamp: serverTimestamp(),
                                                    });

                                                    alert("AD_REJECTED");
                                                } catch (err) {
                                                    console.error(err);
                                                    alert("REJECTION_FAILED");
                                                }
                                            }}
                                        >
                                            REJECT
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>
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

// Messenger container layout
const messengerContainer: React.CSSProperties = {
    marginTop: '10px',
    padding: '16px',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255,255,255,0.04)',
    borderRadius: '12px'
};

export default AdsManager;