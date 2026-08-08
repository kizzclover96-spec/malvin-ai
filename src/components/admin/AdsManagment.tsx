import React, { useState, useEffect } from 'react';
import { auth, db } from '../../firebase';
import { signOut } from 'firebase/auth';
// Rename them using 'as' so they don't clash or get left undefined
import { ref, onValue, update, push, serverTimestamp, DataSnapshot } from "firebase/database";
import { doc, collection, query, orderBy, onSnapshot, addDoc, setDoc, serverTimestamp as firestoreTimestamp } from "firebase/firestore";
import { firestore } from "../../firebase"; // Your firestore initialization file
import { remove } from "firebase/database";
import AllAds from "./AllAds";
import { Link } from "react-router-dom";
import AdminReports from "./AdminReports";
import {MalvinAiPersonnelSystem} from "./MalvinAiPersonnelSystem";
import AdminKillSwitch from "./AdminKillSwitch";
import { useSystemStatus } from "../../hooks/useSystemStatus";
import {
    LayoutGrid, Megaphone, FileBarChart2, ShieldAlert, Power, LogOut,
    Search, ShieldCheck, Ban, Users as UsersIcon, BadgeCheck, ExternalLink,
    CircleDot, ChevronRight
} from "lucide-react";

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
    const [searchTerm, setSearchTerm] = useState('');
    const [activePanel, setActivePanel] = useState("ads");
    const totalUsers = users.length;

    // Live "is anything currently restricted" read for the status pill in
    // the top bar — the same /system/status node the Kill Switch panel
    // controls. Purely informational here; AdminKillSwitch owns the writes.
    const { status: systemStatus } = useSystemStatus();
    const anyRestricted = systemStatus.appLocked || systemStatus.storesLocked || systemStatus.businessLocked || systemStatus.customerHubLocked;

    const verifiedUsers = users.filter(
     (u) => u.isVerified === true
    ).length;

    const bannedUsers = users.filter(
        (u) =>
            u.status === "Banned" ||
            u.isBanned === true ||
            u.brandData?.status === "Banned"
    ).length;
    
    
    
    
    const filteredAds = adRequests.filter(ad =>
        filter === "ALL" ? true : ad.status === filter
    );
    const pendingAdCount = adRequests.filter(ad => ad.status === "Pending_Admin_Review").length;

    useEffect(() => {
        const verificationRef = ref(db, "verification_requests");

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
        const unsubAdQueue = onValue(
            adQueueRef,
            (snapshot) => {
                const data = snapshot.val();

                setAdRequests(
                    data
                        ? Object.keys(data).map(k => ({
                            id: k,
                            ...data[k]
                        }))
                        : []
                );
            },
            (error) => {
                console.error("AD_QUEUE_LISTENER_ERROR:", error);
            }
        );

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

        const uid = selectedUser.uid;
        const updates: any = {};

        if (newStatus === "Banned") {
            // Write to both top-level user status and brandData status
            updates[`users/${uid}/status`] = "Banned";
            updates[`users/${uid}/isBanned`] = true;
            updates[`users/${uid}/brandData/status`] = "Banned";
            updates[`users/${uid}/brandData/banReason`] =
                "Account has been banned. Contact verify.malvin@gmail.com";
        }
        else if (newStatus === "Suspended") {
            updates[`users/${uid}/status`] = "Suspended";
            updates[`users/${uid}/isSuspended`] = true;
            updates[`users/${uid}/brandData/status`] = "Suspended";
            updates[`users/${uid}/brandData/suspensionEnds`] =
                Date.now() + 3600000;
        }
        else {
            updates[`users/${uid}/status`] = "Active";
            updates[`users/${uid}/isBanned`] = false;
            updates[`users/${uid}/isSuspended`] = false;
            updates[`users/${uid}/brandData/status`] = "Active";
            updates[`users/${uid}/brandData/suspensionEnds`] = null;
        }

        await update(ref(db), updates);

        await logAction(
            "STATUS_CHANGE",
            uid,
            `Status set to ${newStatus}`
        );

        alert(`STATUS_SET_TO_${newStatus}`);
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
    const filteredUsers = users.filter(user => {

        const brand =
            user.brandData?.name ||
            user.brandName ||
            '';

        const search = searchTerm.toLowerCase();

        return (
            user.email?.toLowerCase().includes(search) ||
            user.uid?.toLowerCase().includes(search) ||
            brand.toLowerCase().includes(search)
        );
    });

    // The AI Personnel system is its own full-bleed white workspace with its
    // own internal navigation — it intentionally opts out of the console
    // shell below rather than being squeezed into a dark sidebar layout.
    if (activePanel === "personnel") {
        return (
            <div style={{ width: "100vw", height: "100vh", background: "#fff" }}>
                <div style={{ position: "fixed", top: 16, left: 16, zIndex: 50 }}>
                    <button onClick={() => setActivePanel("ads")} style={backToConsoleBtn}>
                        <ChevronRight size={13} style={{ transform: "rotate(180deg)" }} />
                        CONSOLE
                    </button>
                </div>
                <MalvinAiPersonnelSystem />
            </div>
        );
    }

    const NAV_ITEMS: { key: string; label: string; icon: React.ReactNode }[] = [
        { key: "ads", label: "MERCHANTS & ADS", icon: <LayoutGrid size={16} /> },
        { key: "reports", label: "REPORTS", icon: <FileBarChart2 size={16} /> },
        { key: "personnel", label: "AI PERSONNEL", icon: <UsersIcon size={16} /> },
        { key: "killswitch", label: "KILL SWITCH", icon: <ShieldAlert size={16} /> },
    ];

    const PANEL_TITLES: Record<string, string> = {
        ads: "Merchants & Ads",
        reports: "Reports",
        killswitch: "Kill Switch",
    };

    return (
        <div style={consoleShell}>
            {/* ---------- SIDEBAR ---------- */}
            <aside style={sidebarStyle}>
                <div style={{ padding: "0 20px", marginBottom: 36 }}>
                    <div style={{ fontSize: 10, letterSpacing: "3px", opacity: 0.4, marginBottom: 2 }}>MALVIN AI</div>
                    <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: "1.5px" }}>ADMIN_V2</div>
                </div>

                <nav style={{ display: "flex", flexDirection: "column", gap: 4, padding: "0 12px" }}>
                    {NAV_ITEMS.map(item => {
                        const isActive = activePanel === item.key;
                        const isDanger = item.key === "killswitch";
                        return (
                            <button
                                key={item.key}
                                onClick={() => setActivePanel(item.key)}
                                style={{
                                    ...navItemStyle,
                                    background: isActive ? (isDanger ? "rgba(255,92,92,0.12)" : "rgba(197,255,65,0.10)") : "transparent",
                                    color: isActive ? (isDanger ? tokens.danger : tokens.accent) : tokens.textDim,
                                    borderLeft: isActive ? `2px solid ${isDanger ? tokens.danger : tokens.accent}` : "2px solid transparent",
                                }}
                            >
                                {item.icon}
                                {item.label}
                                {item.key === "ads" && pendingAdCount > 0 && (
                                    <span style={navBadge}>{pendingAdCount}</span>
                                )}
                            </button>
                        );
                    })}

                    <Link to="/allads" style={{ ...navItemStyle, textDecoration: "none", color: tokens.textDim }}>
                        <ExternalLink size={16} />
                        APPROVED ADS
                    </Link>
                </nav>

                <div style={{ marginTop: "auto", padding: "0 12px 12px" }}>
                    <button onClick={() => signOut(auth)} style={{ ...navItemStyle, color: tokens.danger }}>
                        <LogOut size={16} />
                        LOG OUT
                    </button>
                </div>
            </aside>

            {/* ---------- MAIN ---------- */}
            <main style={mainStyle}>
                <header style={topBarStyle}>
                    <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "0.5px", margin: 0 }}>
                        {PANEL_TITLES[activePanel] || ""}
                    </h1>

                    <div
                        style={{
                            ...statusPillStyle,
                            background: anyRestricted ? "rgba(255,92,92,0.12)" : "rgba(197,255,65,0.10)",
                            color: anyRestricted ? tokens.danger : tokens.accent,
                        }}
                    >
                        <span style={{ position: "relative", display: "flex", width: 8, height: 8 }}>
                            <span style={{ ...pulseDot, background: anyRestricted ? tokens.danger : tokens.accent }} />
                            <span style={{ ...pulseDotCore, background: anyRestricted ? tokens.danger : tokens.accent }} />
                        </span>
                        {anyRestricted ? "RESTRICTION ACTIVE" : "ALL SYSTEMS NORMAL"}
                    </div>
                </header>

                <div style={contentArea}>
                    {activePanel === "ads" && (
                        <>
                            {/* ---------- KPI ROW ---------- */}
                            <div style={kpiRow}>
                                <KpiCard icon={<UsersIcon size={15} />} label="Total users" value={totalUsers} />
                                <KpiCard icon={<BadgeCheck size={15} />} label="Verified" value={verifiedUsers} tone="info" />
                                <KpiCard icon={<Ban size={15} />} label="Banned" value={bannedUsers} tone="danger" />
                                <KpiCard icon={<Megaphone size={15} />} label="Ads pending review" value={pendingAdCount} tone="accent" />
                            </div>

                            {/* ---------- FILTER BAR ---------- */}
                            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                                {["ALL", "Pending_Admin_Review", "Approved", "Rejected"].map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setFilter(f)}
                                        style={{
                                            ...segmentBtn,
                                            background: filter === f ? tokens.accent : 'transparent',
                                            color: filter === f ? '#000' : tokens.textDim,
                                            borderColor: filter === f ? tokens.accent : tokens.border,
                                        }}
                                    >
                                        {f.replace(/_/g, " ")}
                                    </button>
                                ))}
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: 20 }}>

                                {/* --- MERCHANT DIRECTORY --- */}
                                <section style={panelStyle}>
                                    <h3 style={sectionTitle}>MERCHANT DIRECTORY</h3>

                                    <div style={{ position: "relative", marginBottom: '14px' }}>
                                        <Search size={14} style={{ position: "absolute", left: 12, top: 12, opacity: 0.4 }} />
                                        <input
                                            type="text"
                                            placeholder="Search email, uid or brand…"
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            style={{ ...inputStyle, paddingLeft: 34 }}
                                        />
                                    </div>
                                    <div style={{ maxHeight: '68vh', overflowY: 'auto', paddingRight: '4px' }}>
                                        {filteredUsers.length === 0 && (
                                            <EmptyState text="No merchants match this search." />
                                        )}
                                        {filteredUsers.map((u) => {
                                            const ipCount = getIpClusterCount(u.security?.lastIp);
                                            const isHighRisk = ipCount > 2;
                                            const isSelected = selectedUser?.uid === u.uid;
                                            const merchantName = u.brandData?.name || u.brandName || "Ghost_User";
                                            const isBanned = u.brandData?.status === 'Banned';

                                            return (
                                                <div 
                                                    key={u.uid} 
                                                    onClick={() => handleSelectUser(u)}
                                                    style={{
                                                        ...userCard,
                                                        borderColor: isSelected ? tokens.accent : tokens.border,
                                                        background: isBanned
                                                            ? 'rgba(255, 92, 92, 0.06)' 
                                                            : isSelected ? tokens.surfaceRaised : tokens.surface,
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: "flex-start", marginBottom: '8px' }}>
                                                        <span style={{ fontSize: '13px', fontWeight: 700, color: u.isVerified ? tokens.info : tokens.text }}>
                                                            {u.isVerified && "✓ "}{merchantName.toUpperCase()}
                                                        </span>
                                                        {isHighRisk && <span style={riskTag}>RISK CLUSTER</span>}
                                                    </div>
                                                    
                                                    <div style={dirMetadata}>
                                                        <span style={{ opacity: 0.4 }}>EMAIL</span> {u.email || 'N/A'}
                                                    </div>

                                                    <div style={dirMetadata}>
                                                        <span style={{ opacity: 0.4 }}>ID</span> 
                                                        <span style={{ fontFamily: tokens.mono, marginLeft: '4px' }}>{u.uid}</span>
                                                    </div>

                                                    <div style={{ 
                                                        display: 'flex', 
                                                        justifyContent: 'space-between', 
                                                        marginTop: '10px', 
                                                        paddingTop: '8px', 
                                                        borderTop: `1px solid ${tokens.border}`,
                                                        fontSize: '10px' 
                                                    }}>
                                                        <span style={{ color: tokens.accent, fontFamily: tokens.mono }}>€{u.treasury?.balance?.toLocaleString() || '0'}</span>
                                                        <span style={{ opacity: 0.4, fontFamily: tokens.mono }}>{u.security?.lastIp || 'UNKNOWN'}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>

                                {/* --- ACCOUNT_MODERATOR SECTION --- */}
                                <section style={panelStyle}>
                                    <h3 style={sectionTitle}>ACCOUNT MODERATOR</h3>
                                    {selectedUser ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                                            
                                            {/* BRAND & BALANCE */}
                                            <div>
                                                <label style={labelStyle}>BRAND NAME</label>
                                                <input 
                                                    style={inputStyle} 
                                                    value={editBrandName} 
                                                    onChange={e => setEditBrandName(e.target.value)} 
                                                />
                                            </div>

                                            <div>
                                                <label style={labelStyle}>TREASURY BALANCE (€)</label>
                                                <input 
                                                    style={inputStyle} 
                                                    type="number" 
                                                    value={editBalance} 
                                                    onChange={e => setEditBalance(e.target.value)} 
                                                />
                                            </div>

                                            {/* VERIFICATION PRESETS */}
                                            <div>
                                                <label style={labelStyle}>VERIFICATION STATUS</label>
                                                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                                    <button
                                                        onClick={() => setEditIsVerified(true)}
                                                        style={toggleBtn(editIsVerified, tokens.info)}
                                                    >
                                                        VERIFIED
                                                    </button>
                                                    <button
                                                        onClick={() => setEditIsVerified(false)}
                                                        style={toggleBtn(!editIsVerified, tokens.danger)}
                                                    >
                                                        UNVERIFIED
                                                    </button>
                                                </div>
                                            </div>

                                            {/* STATUS MANAGEMENT */}
                                            <div>
                                                <label style={labelStyle}>ACCOUNT STATUS</label>
                                                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                                                    <button 
                                                        onClick={() => handleUpdateStatus('Active')}
                                                        style={toggleBtn(selectedUser.status === 'Active', tokens.accent)}
                                                    >ACTIVE</button>
                                                    <button 
                                                        onClick={() => handleUpdateStatus('Suspended')}
                                                        style={{ ...statusBtn, color: tokens.warn }}
                                                    >WARN</button>
                                                    <button 
                                                        onClick={() => handleUpdateStatus('Banned')}
                                                        style={{ ...statusBtn, color: tokens.danger }}
                                                    >BAN</button>
                                                </div>
                                            </div>

                                            <div style={dividerStyle} />

                                            {/* SECURITY ACTIONS */}
                                            <div>
                                                <label style={labelStyle}>SECURITY OVERRIDE</label>
                                                <button 
                                                    onClick={handlePasswordReset}
                                                    style={{ ...inputStyle, cursor: 'pointer', textAlign: 'center', marginTop: '8px', color: tokens.textDim, fontFamily: tokens.mono, fontSize: 11, letterSpacing: '0.5px' }}
                                                >
                                                    SEND PASSWORD RESET EMAIL
                                                </button>
                                            </div>

                                            <button onClick={handleSaveChanges} style={primaryBtn}>PUSH CHANGES TO DB</button>
                                        </div>
                                    ) : (
                                        <EmptyState text="Select a merchant from the directory to moderate their account." />
                                    )}
                                </section>

                                {/* --- RIGHT: VERIFICATION REQUESTS --- */}
                                <section style={panelStyle}>
                                    <h3 style={sectionTitle}>VERIFICATION & SUBSCRIPTION NOTICES</h3>

                                    <div style={{ maxHeight: '68vh', overflowY: 'auto' }}>
                                        {verificationRequests.length === 0 ? (
                                            <EmptyState text="No pending requests or notices." />
                                        ) : (
                                            verificationRequests.map(req => {
                                                const isCanceled = req.status === "subscription_canceled";

                                                return (
                                                    <div key={req.id} style={{
                                                        padding: '14px',
                                                        border: `1px solid ${tokens.border}`,
                                                        background: isCanceled ? 'rgba(255, 92, 92, 0.06)' : tokens.surface,
                                                        borderRadius: '10px',
                                                        marginBottom: '10px',
                                                        fontSize: '12px'
                                                    }}>
                                                        <div style={{ color: isCanceled ? tokens.danger : tokens.accent, fontWeight: 700 }}>
                                                            {req.brandName || "UNKNOWN BRAND"}
                                                        </div>

                                                        <div style={{ fontSize: '10px', opacity: 0.6, fontFamily: tokens.mono, marginTop: 2 }}>
                                                            {req.uid}
                                                        </div>

                                                        <div style={{ fontSize: '10px', opacity: 0.6, marginTop: 2 }}>
                                                            {req.email}
                                                        </div>

                                                        {/* STATUS BADGE */}
                                                        <div style={{ marginTop: '8px' }}>
                                                            {isCanceled ? (
                                                                <span style={{ ...badgeStyle, background: tokens.danger, color: '#fff' }}>
                                                                    SUBSCRIPTION CANCELED
                                                                </span>
                                                            ) : (
                                                                <span style={{ ...badgeStyle, background: tokens.warn, color: '#000' }}>
                                                                    VERIFICATION REQUESTED
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* ACTION BUTTONS */}
                                                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                                            {isCanceled ? (
                                                                /* REVOKE & DISMISS CANCELLATION */
                                                                <button
                                                                    style={{
                                                                        ...miniBtn,
                                                                        border: `1px solid ${tokens.danger}`,
                                                                        background: processingId === req.id ? tokens.surfaceRaised : 'rgba(255, 92, 92, 0.12)',
                                                                        color: tokens.danger,
                                                                        cursor: processingId === req.id ? 'not-allowed' : 'pointer',
                                                                    }}
                                                                    disabled={processingId === req.id}
                                                                    onClick={async () => {
                                                                        try {
                                                                            setProcessingId(req.id);

                                                                            // 1. Remove verified and premium status from profile
                                                                            await update(ref(db), {
                                                                                [`users/${req.uid}/profile/isVerified`]: false,
                                                                                [`users/${req.uid}/profile/isPremium`]: false,
                                                                            });

                                                                            // 2. Remove cancellation notice
                                                                            await remove(ref(db, `verification_requests/${req.id}`));

                                                                            // 3. Log audit event
                                                                            await push(ref(db, 'admin/audit_log'), {
                                                                                adminEmail: auth.currentUser?.email,
                                                                                action: 'REVOKE_VERIFICATION',
                                                                                targetUid: req.uid,
                                                                                details: `Revoked verification mark due to subscription cancellation for ${req.brandName}`,
                                                                                timestamp: serverTimestamp(),
                                                                            });
                                                                        } finally {
                                                                            setProcessingId(null);
                                                                        }
                                                                    }}
                                                                >
                                                                    {processingId === req.id ? "REVOKING…" : "REVOKE BADGE & DISMISS"}
                                                                </button>
                                                            ) : (
                                                                /* APPROVE VERIFICATION */
                                                                <>
                                                                    <button
                                                                        style={{
                                                                            ...miniBtn,
                                                                            border: `1px solid ${tokens.accent}`,
                                                                            background: processingId === req.id ? tokens.surfaceRaised : 'transparent',
                                                                            color: tokens.accent,
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
                                                                                });
                                                                                await remove(ref(db, `verification_requests/${req.id}`));

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
                                                                        {processingId === req.id ? "PROCESSING…" : "APPROVE"}
                                                                    </button>

                                                                    {/* REJECT VERIFICATION */}
                                                                    <button
                                                                        style={{
                                                                            ...miniBtn,
                                                                            border: `1px solid ${tokens.border}`,
                                                                            color: tokens.textDim,
                                                                            opacity: processingId === req.id ? 0.5 : 1,
                                                                            cursor: processingId === req.id ? 'not-allowed' : 'pointer'
                                                                        }}
                                                                        disabled={processingId === req.id}
                                                                        onClick={async () => {
                                                                            try {
                                                                                setProcessingId(req.id);

                                                                                await remove(ref(db, `verification_requests/${req.id}`));

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
                                                                        {processingId === req.id ? "PROCESSING…" : "REJECT"}
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </section>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '20px' }}>
                                {/* --- AD APPROVAL QUEUE --- */}
                                <section style={panelStyle}>
                                    <h3 style={sectionTitle}>AD APPROVAL QUEUE</h3>

                                    <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                                        {adRequests.length === 0 ? (
                                            <EmptyState text="No ads waiting on review." />
                                        ) : (
                                            filteredAds.map((ad) => (
                                                <div
                                                    key={ad.id}
                                                    style={{
                                                        padding: '16px',
                                                        border: `1px solid ${tokens.border}`,
                                                        background: tokens.surface,
                                                        marginBottom: '10px',
                                                        borderRadius: '12px'
                                                    }}
                                                >
                                                    {/* TITLE */}
                                                    <div style={{ color: tokens.accent, fontWeight: 700, fontSize: 13 }}>
                                                        {ad.title}
                                                    </div>

                                                    {/* META */}
                                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8 }}>
                                                        <span style={metaChip}>{ad.userEmail}</span>
                                                        <span style={metaChip}>{ad.platform}</span>
                                                        <span style={metaChip}>€{ad.budget}</span>
                                                        <span style={metaChip}>{ad.cta}</span>
                                                    </div>

                                                    {/* DESCRIPTION */}
                                                    <div style={{ fontSize: '11px', marginTop: '10px', opacity: 0.75, lineHeight: 1.5 }}>
                                                        {ad.description}
                                                    </div>

                                                    {/* CREATIVE PREVIEW */}
                                                    {ad.creativeUrl && (
                                                        <div style={{ marginTop: '12px' }}>
                                                            {ad.creativeUrl.includes('.mp4') ? (
                                                                <video
                                                                    src={ad.creativeUrl}
                                                                    controls
                                                                    style={{ width: '100%', borderRadius: '10px' }}
                                                                />
                                                            ) : (
                                                                <img
                                                                    src={ad.creativeUrl}
                                                                    style={{ width: '100%', borderRadius: '10px' }}
                                                                />
                                                            )}
                                                        </div>
                                                    )}

                                                    {/* ACTIONS */}
                                                    <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>

                                                        {/* APPROVE */}
                                                        <button
                                                            style={{ ...primaryBtn, flex: 1, padding: '10px' }}
                                                            onClick={async () => {
                                                                try {
                                                                    const user = users.find(u => u.uid === ad.userId);

                                                                    if (!user) {
                                                                        alert("USER_NOT_FOUND");
                                                                        return;
                                                                    }
                                                                    const approvedData = {
                                                                        adId: ad.id,
                                                                        campaignId: ad.campaignId,
                                                                        userId: ad.userId,
                                                                        title: ad.title,
                                                                        description: ad.description,
                                                                        platform: ad.platform,
                                                                        budget: ad.budget,
                                                                        creativeUrl: ad.creativeUrl,

                                                                        approvedAt: Date.now(),
                                                                        approvedBy: auth.currentUser?.email,

                                                                        postingStatus: "Not Posted",
                                                                        status: "Approved"
                                                                    };
                                                                    const budget = Number(ad.budget || 0);
                                                                    const currentBalance = Number(user?.treasury?.balance || 0);
                                                                    const newBalance = currentBalance - budget;

                                                                    const ledgerKey = push(ref(db, `users/${ad.userId}/treasury/ledger`)).key;

                                                                    const updates: any = {};

                                                                    // 1. Campaign update
                                                                    updates[`users/${ad.userId}/campaigns/${ad.campaignId}/status`] = "Approved";
                                                                    updates[`users/${ad.userId}/campaigns/${ad.campaignId}/reviewStatus`] = "Approved";

                                                                    updates[`users/${ad.userId}/campaigns/${ad.campaignId}/approvedAt`] = Date.now();

                                                                    updates[`users/${ad.userId}/campaigns/${ad.campaignId}/reach`] = 0;

                                                                    updates[`users/${ad.userId}/campaigns/${ad.campaignId}/targetReach`] = null;

                                                                    // 2. Deduct balance
                                                                    updates[`users/${ad.userId}/treasury/balance`] = newBalance;

                                                                    // 3. Ledger entry
                                                                    updates[`users/${ad.userId}/treasury/ledger/${ledgerKey}`] = {
                                                                        type: "Charged",
                                                                        amount: ad.budget,
                                                                        label: `Approved Ad: ${ad.title}`,
                                                                        status: "Completed",
                                                                        timestamp: Date.now(),
                                                                        approvedAt: Date.now(),
                                                                        reach: 0,
                                                                        targetReach: null
                                                                    };

                                                                    // 4. Queue update
                                                                    updates[`admin/ad_queue/${ad.id}/status`] = "Approved";

                                                                    // save approved ad
                                                                    updates[`admin/approved_ads/${ad.id}`] = {
                                                                        adId: ad.id,
                                                                        campaignId: ad.campaignId,
                                                                        userId: ad.userId,

                                                                        title: ad.title,
                                                                        description: ad.description,
                                                                        platform: ad.platform,
                                                                        budget: ad.budget,
                                                                        creativeUrl: ad.creativeUrl,

                                                                        approvedAt: Date.now(),
                                                                        approvedBy: auth.currentUser?.email,

                                                                        postingStatus: "Not Posted",
                                                                        status: "Approved",
                                                                        reach: 0,
                                                                        targetReach: null
                                                                    };

                                                                    // remove from review queue
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
                                                                color: tokens.danger,
                                                                border: `1px solid ${tokens.danger}`
                                                            }}
                                                            onClick={async () => {
                                                                const reason = prompt("Enter rejection reason:");
                                                                if (!reason) return;

                                                                try {
                                                                    const updates: any = {};

                                                                    updates[`users/${ad.userId}/campaigns/${ad.campaignId}/status`] = "Rejected";
                                                                    updates[`users/${ad.userId}/campaigns/${ad.campaignId}/rejectionReason`] = reason;

                                                                    await update(ref(db), {
                                                                        [`users/${ad.userId}/campaigns/${ad.campaignId}/status`]: "Rejected",
                                                                        [`users/${ad.userId}/campaigns/${ad.campaignId}/reviewStatus`]: "Rejected",
                                                                        [`users/${ad.userId}/campaigns/${ad.campaignId}/rejectionReason`]: reason
                                                                    });

                                                                    await remove(ref(db, `admin/ad_queue/${ad.id}`));

                                                                    await push(ref(db, 'admin/audit_log'), {
                                                                        adminEmail: auth.currentUser?.email,
                                                                        action: 'REJECT_AD',
                                                                        targetUid: ad.userId,
                                                                        details: `Rejected campaign: ${ad.title} (${reason})`,
                                                                        timestamp: serverTimestamp(),
                                                                    });

                                                                    alert("AD_REJECTED");
                                                                }
                                                                catch(err){
                                                                    console.error(err);
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
                                    <h3 style={sectionTitle}>SYSTEM AUDIT LOG</h3>
                                    <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                                        {auditLogs.length === 0 && <EmptyState text="No activity recorded yet." />}
                                        {auditLogs.map(log => (
                                            <div key={log.id} style={logItem}>
                                                <div style={{ color: tokens.accent, fontSize: '10px', fontFamily: tokens.mono, letterSpacing: '0.5px' }}>{log.action}</div>
                                                <div style={{ fontSize: '11px', opacity: 0.7, marginTop: 2 }}>{log.details}</div>
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </div>
                        </>
                    )}
                    {activePanel === "reports" && (
                        <AdminReports />
                    )}
                    {activePanel === "killswitch" && (
                        <AdminKillSwitch />
                    )}
                </div>
            </main>
        </div>
    );
};

// ============================================================
// DESIGN TOKENS
// ============================================================
const tokens = {
    bg: '#0A0C0E',
    surface: 'rgba(255,255,255,0.025)',
    surfaceRaised: 'rgba(255,255,255,0.06)',
    border: 'rgba(255,255,255,0.08)',
    text: '#EDEFF1',
    textDim: '#8B939B',
    accent: '#C5FF41',
    danger: '#FF5C5C',
    warn: '#FFB020',
    info: '#4FA3FF',
    mono: "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace",
    sans: "Inter, sans-serif",
};

// ============================================================
// SMALL SHARED SUBCOMPONENTS
// ============================================================
function KpiCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone?: 'accent' | 'danger' | 'info' }) {
    const color = tone === 'accent' ? tokens.accent : tone === 'danger' ? tokens.danger : tone === 'info' ? tokens.info : tokens.text;
    return (
        <div style={kpiCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color, opacity: 0.9 }}>
                {icon}
                <span style={{ fontSize: 10, letterSpacing: '1px', opacity: 0.7, fontFamily: tokens.mono, textTransform: 'uppercase' }}>{label}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8, fontFamily: tokens.mono, color }}>{value}</div>
        </div>
    );
}

function EmptyState({ text }: { text: string }) {
    return (
        <div style={{ textAlign: 'center', opacity: 0.35, padding: '40px 20px', fontSize: 12, lineHeight: 1.6 }}>
            {text}
        </div>
    );
}

function toggleBtn(active: boolean, color: string): React.CSSProperties {
    return {
        ...statusBtn,
        border: `1px solid ${active ? color : tokens.border}`,
        color: active ? color : tokens.textDim,
        background: active ? `${color}1A` : 'transparent',
    };
}

// ============================================================
// STYLES
// ============================================================
const consoleShell: React.CSSProperties = {
    display: 'flex',
    minHeight: '100vh',
    background: tokens.bg,
    color: tokens.text,
    fontFamily: tokens.sans,
};

const sidebarStyle: React.CSSProperties = {
    width: 220,
    flexShrink: 0,
    borderRight: `1px solid ${tokens.border}`,
    display: 'flex',
    flexDirection: 'column',
    paddingTop: 28,
    paddingBottom: 20,
    position: 'sticky',
    top: 0,
    height: '100vh',
};

const navItemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '10px 12px',
    borderRadius: 8,
    border: 'none',
    background: 'transparent',
    fontFamily: tokens.mono,
    fontSize: 11,
    letterSpacing: '0.5px',
    fontWeight: 600,
    cursor: 'pointer',
    textAlign: 'left',
    position: 'relative',
};

const navBadge: React.CSSProperties = {
    marginLeft: 'auto',
    background: tokens.accent,
    color: '#000',
    fontSize: 9,
    fontWeight: 800,
    padding: '1px 6px',
    borderRadius: 999,
};

const mainStyle: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
};

const topBarStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px 32px',
    borderBottom: `1px solid ${tokens.border}`,
    position: 'sticky',
    top: 0,
    background: tokens.bg,
    zIndex: 10,
};

const statusPillStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 12px',
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.5px',
    fontFamily: tokens.mono,
};

const pulseDot: React.CSSProperties = {
    position: 'absolute',
    inset: 0,
    borderRadius: '50%',
    opacity: 0.5,
    animation: 'malvin-pulse 1.8s ease-out infinite',
};

const pulseDotCore: React.CSSProperties = {
    position: 'relative',
    width: 8,
    height: 8,
    borderRadius: '50%',
};

const contentArea: React.CSSProperties = {
    padding: '28px 32px 40px',
    flex: 1,
};

const kpiRow: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 16,
    marginBottom: 24,
};

const kpiCardStyle: React.CSSProperties = {
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 14,
    padding: '18px 20px',
};

const segmentBtn: React.CSSProperties = {
    padding: '8px 14px',
    fontSize: '10px',
    fontFamily: tokens.mono,
    fontWeight: 700,
    letterSpacing: '0.5px',
    border: '1px solid',
    borderRadius: 8,
    cursor: 'pointer',
    textTransform: 'uppercase',
};

const statusBtn: React.CSSProperties = {
    flex: 1,
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    color: tokens.text,
    padding: '10px',
    borderRadius: '8px',
    fontSize: '10px',
    fontFamily: tokens.mono,
    fontWeight: 700,
    letterSpacing: '0.5px',
    cursor: 'pointer',
    transition: '0.15s',
};

const panelStyle: React.CSSProperties = {
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: '16px',
    padding: '22px',
};

const userCard: React.CSSProperties = {
    padding: '14px',
    borderRadius: '10px',
    marginBottom: '10px',
    cursor: 'pointer',
    transition: '0.15s',
    border: '1px solid',
};

const dirMetadata: React.CSSProperties = {
    fontSize: '10px',
    marginBottom: '3px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    opacity: 0.85,
};

const sectionTitle: React.CSSProperties = {
    fontSize: '10px',
    fontFamily: tokens.mono,
    letterSpacing: '2px',
    opacity: 0.5,
    marginBottom: '18px',
    borderBottom: `1px solid ${tokens.border}`,
    paddingBottom: '12px',
    fontWeight: 700,
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#000',
    border: `1px solid ${tokens.border}`,
    padding: '11px 12px',
    borderRadius: '8px',
    color: tokens.text,
    fontSize: 12,
    boxSizing: 'border-box',
};

const primaryBtn: React.CSSProperties = {
    background: tokens.accent,
    color: '#000',
    border: 'none',
    padding: '12px',
    borderRadius: '8px',
    fontWeight: 800,
    fontSize: 11,
    fontFamily: tokens.mono,
    letterSpacing: '0.5px',
    cursor: 'pointer',
};

const labelStyle: React.CSSProperties = {
    fontSize: '10px',
    fontFamily: tokens.mono,
    letterSpacing: '0.5px',
    opacity: 0.5,
};

const logItem: React.CSSProperties = {
    padding: '10px 0',
    borderBottom: `1px solid ${tokens.border}`,
};

const riskTag: React.CSSProperties = {
    background: tokens.danger,
    color: '#fff',
    fontSize: '8px',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: 900,
    fontFamily: tokens.mono,
    flexShrink: 0,
};

const badgeStyle: React.CSSProperties = {
    fontSize: '9px',
    padding: '3px 8px',
    borderRadius: '4px',
    fontWeight: 800,
    fontFamily: tokens.mono,
    letterSpacing: '0.3px',
};

const miniBtn: React.CSSProperties = {
    padding: '7px 10px',
    fontSize: '10px',
    fontFamily: tokens.mono,
    fontWeight: 700,
    borderRadius: '6px',
    letterSpacing: '0.3px',
};

const metaChip: React.CSSProperties = {
    fontSize: '9px',
    fontFamily: tokens.mono,
    opacity: 0.6,
    background: 'rgba(255,255,255,0.04)',
    padding: '3px 8px',
    borderRadius: '5px',
};

const dividerStyle: React.CSSProperties = {
    border: 'none',
    borderTop: `1px solid ${tokens.border}`,
    margin: 0,
};

const backToConsoleBtn: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    background: '#000',
    color: '#fff',
    border: '1px solid #333',
    padding: '8px 14px',
    borderRadius: 999,
    fontSize: 10,
    fontFamily: tokens.mono,
    fontWeight: 700,
    letterSpacing: '0.5px',
    cursor: 'pointer',
};

// Injects the status-dot pulse animation once. Styled-JSX/CSS modules
// aren't set up in this project, and this is the only keyframe animation
// on the page, so a single injected <style> tag is simpler than adding a
// new build dependency for one effect.
if (typeof document !== 'undefined' && !document.getElementById('malvin-admin-keyframes')) {
    const styleTag = document.createElement('style');
    styleTag.id = 'malvin-admin-keyframes';
    styleTag.textContent = `
        @keyframes malvin-pulse {
            0% { transform: scale(1); opacity: 0.6; }
            100% { transform: scale(2.4); opacity: 0; }
        }
    `;
    document.head.appendChild(styleTag);
}

export default AdsManager;