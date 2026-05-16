import React, { useState, useRef, useEffect } from 'react';
import { QRCode } from 'react-qrcode-logo';
import { firestore, auth } from "../firebase";
import Chats from './Chats';
import MarketFront from './MarketFront';
import Catalog from './Catalog';
import AdsManager from './AdsManager';
import Payments from './Payments';
import { io } from 'socket.io-client';
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { ref as dbRef, onValue, update } from "firebase/database"; 
import { db } from '../firebase'; 

// Exporting this so you can import it and use it anywhere else (Chats, MarketFront, etc.)
export const VerifiedBadge = () => (
  <svg 
    width="14" 
    height="14" 
    viewBox="0 0 24 24" 
    fill="#007fff" 
    style={{ display: 'inline-block', marginLeft: '6px', verticalAlign: 'middle' }}
  >
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
  </svg>
);

const DashboardCard = ({ children, style }: any) => (
  <div style={{
    background: '#111111',
    borderRadius: '32px',
    padding: '24px',
    border: '1px solid #1A1A1A',
    display: 'flex',
    flexDirection: 'column',
    ...style
  }}>
    {children}
  </div>
);

const BackButton = ({ onClick }: { onClick: () => void }) => (
    <div onClick={onClick} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
        <div style={{
            width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #C5FF41',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px',
            boxShadow: '0 0 10px rgba(197, 255, 65, 0.2)', color: '#C5FF41'
        }}>ESC</div>
        <span style={{ fontSize: '11px', letterSpacing: '2px', fontWeight: 700, opacity: 0.5 }}>BACK_TO_SESSION</span>
    </div>
);

const Dashboard = (props: any) => {
    const { userBrand = {}, onBack } = props;
    const [activeTab, setActiveTab] = useState('Invoices');
    const [chatCount, setChatCount] = useState(0);
    const [aiMessage, setAiMessage] = useState('');
    const [aiHistory, setAiHistory] = useState<any[]>([]);
    const [isVisionActive, setIsVisionActive] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);
    const [toast, setToast] = useState({ show: false, msg: '', sender: '' });
    const [orderCount, setOrderCount] = useState(0);
    const [bookedDates, setBookedDates] = useState<string[]>([]); 
    const [showCalendar, setShowCalendar] = useState(false);

    // Profile States
    const [bio, setBio] = useState('');
    const [isVerified, setIsVerified] = useState(false);
    const [isSavingBio, setIsSavingBio] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const visionInterval = useRef<any>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Listen to profile details & reservations
    useEffect(() => {
        if (!userBrand?.id) return;

        // Sync Bio & Verified status from database path
        const profileRef = dbRef(db, `users/${userBrand.id}/profile`);
        const unsubscribeProfile = onValue(profileRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setBio(data.bio || '');
                setIsVerified(data.isVerified || false);
            }
        });

        // Sync Reservations
        const bookingsPath = dbRef(db, `users/${userBrand.id}/bookings`);
        const unsubscribeBookings = onValue(bookingsPath, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const dates = Object.values(data).map((b: any) => b.date);
                setBookedDates(dates);
            } else {
                setBookedDates([]);
            }
        });

        return () => {
            unsubscribeProfile();
            unsubscribeBookings();
        };
    }, [userBrand?.id]);

    // Save manually edited Bio changes to Firebase Realtime DB
    const saveBio = async () => {
        if (!userBrand?.id) return;
        setIsSavingBio(true);
        try {
            await update(dbRef(db, `users/${userBrand.id}/profile`), { bio });
        } catch (err) {
            console.error("Error updating bio:", err);
        } finally {
            setIsSavingBio(false);
        }
    };

    // Sync Notifications
    useEffect(() => {
        if (!userBrand?.id) return;

        const q = query(
            collection(firestore, "conversations"),
            where("brandId", "==", String(userBrand.id))
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setChatCount(snapshot.size);
            const unreadExist = snapshot.docs.some(doc => doc.data().viewedByManager === false);
            setHasUnread(unreadExist);

            snapshot.docChanges().forEach((change) => {
                if ((change.type === "added" || change.type === "modified") && activeTab !== 'Chats') {
                    const data = change.doc.data();
                    if (data.viewedByManager === false) {
                        setToast({ 
                            show: true, 
                            msg: data.lastMessage || "New message received", 
                            sender: data.clientPhone || `New Client`
                        });
                        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 5000);
                    }
                }
            });
        });

        return () => unsubscribe();
    }, [userBrand?.id, activeTab]);

    // AI Vision
    const captureFrame = () => {
        if (!videoRef.current || isProcessing) return;
        
        const canvas = document.createElement("canvas");
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext("2d");
        
        if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const base64 = canvas.toDataURL("image/jpeg", 0.4); 
            sendToMalvin("Analyze this dashboard view.", base64);
        }
    };

    const startVision = async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            if (videoRef.current) videoRef.current.srcObject = stream;
            setIsVisionActive(true);
            visionInterval.current = setInterval(() => captureFrame(), 30000);
        } catch (err) { console.error(err); }
    };

    const sendToMalvin = async (customText?: string, imageBase64?: string) => {
        const messageToSend = customText || aiMessage;
        if (!messageToSend.trim() && !imageBase64) return;

        if (messageToSend) {
            setAiHistory(prev => [...prev, { role: 'user', text: messageToSend }]);
        }
        
        setIsProcessing(true);
        setAiMessage('');

        try {
            const response = await fetch('https://maivin-backend.vercel.app/api', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: messageToSend,
                    image: imageBase64 
                })
            });

            const data = await response.json();

            if (data.text) {
                setAiHistory(prev => [...prev, { role: 'malvin', text: data.text }]);
            }
        } catch (err) {
            console.error("AI_API_ERROR:", err);
            setAiHistory(prev => [...prev, { role: 'malvin', text: "SYSTEM_OFFLINE: Could not reach brain." }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const shareUrl = `${window.location.origin}/chat/${auth.currentUser?.uid}`;
    const marketFrontUrl = `${window.location.origin}/chat/${auth.currentUser?.uid}`;

    if (activeTab === 'Preview') {
        return (
            <div style={{ position: 'relative', background: '#000', minHeight: '100vh' }}>
                <div style={{ position: 'fixed', top: '20px', left: '20px', zIndex: 9999 }}>
                    <BackButton onClick={() => setActiveTab('Invoices')} />
                </div>
                <MarketFront brandId={userBrand?.id} />
            </div>
        );
    }

    return (
        <div style={mainContainerStyle}>
            <style>{`
                @keyframes slideIn {
                    0% { transform: translateY(-100%) translateX(-50%); opacity: 0; }
                    100% { transform: translateY(0%) translateX(-50%); opacity: 1; }
                }
                .notification-toast { animation: slideIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
                ::-webkit-scrollbar { width: 4px; }
                ::-webkit-scrollbar-thumb { background: #222; border-radius: 10px; }
            `}</style>

            {toast.show && (
                <div className="notification-toast" onClick={() => setActiveTab('Chats')} style={toastStyle}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#C5FF41' }} />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '10px', color: '#666', fontWeight: 800 }}>NEW MESSAGE</div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{toast.sender}</div>
                        <div style={{ fontSize: '12px', color: '#AAA', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '250px' }}>{toast.msg}</div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div style={headerWrapper}>
                <BackButton onClick={onBack} />
                <div style={navPillStyle}>
                    {['Ads', 'Invoices', 'Payments', 'Chats', 'Catalog'].map(item => (
                        <div key={item} onClick={() => setActiveTab(item)} style={{
                            ...navItemStyle,
                            backgroundColor: activeTab === item ? '#C5FF41' : 'transparent',
                            color: activeTab === item ? 'black' : '#666',
                        }}>
                            {item}
                            {item === 'Chats' && hasUnread && <div style={unreadDotStyle} />}
                        </div>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div style={contentWrapper}>
                {activeTab === 'Chats' ? <Chats userBrand={userBrand} brandId={userBrand?.id} /> :
                 activeTab === 'Ads' ? <AdsManager userBrand={userBrand} /> :
                 activeTab === 'Catalog' ? <Catalog userBrand={userBrand} /> :
                 activeTab === 'Payments' ? <Payments userBrand={userBrand} /> :
                (
                    <div style={bentoGridStyle}>
                        {/* Upper Bento */}
                        <div style={upperGridStyle}>
                            <DashboardCard>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                                        
                                        {/* BOOKING SECTION */}
                                        <div 
                                            onClick={() => setShowCalendar(true)} 
                                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
                                        >
                                            <div>
                                                <span style={{ fontSize: '10px', color: '#666', fontWeight: 800, letterSpacing: '1px' }}>RESERVATIONS</span>
                                                <div style={{ fontSize: '32px', fontWeight: 700, color: bookedDates.length > 0 ? '#C5FF41' : '#fff' }}>
                                                    {bookedDates.length}
                                                </div>
                                            </div>
                                            <div style={{ 
                                                width: '12px', height: '12px', borderRadius: '50%', 
                                                backgroundColor: bookedDates.length > 0 ? '#C5FF41' : '#222',
                                                boxShadow: bookedDates.length > 0 ? '0 0 15px #C5FF41' : 'none',
                                                transition: '0.3s'
                                            }} />
                                        </div>

                                        <div style={{ width: '1px', height: '40px', background: '#1A1A1A' }} />

                                        {/* ORDERS SECTION */}
                                        <div>
                                            <span style={{ fontSize: '10px', color: '#666', fontWeight: 800, letterSpacing: '1px' }}>PENDING_ORDERS</span>
                                            <div style={{ display: 'flex', alignItems: 'baseline' }}>
                                                <input 
                                                    type="number"
                                                    value={orderCount}
                                                    onChange={(e) => setOrderCount(parseInt(e.target.value) || 0)}
                                                    style={{ 
                                                        background: 'none', border: 'none', color: 'white', 
                                                        fontSize: '32px', fontWeight: 700, width: '60px', outline: 'none'
                                                    }} 
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                            <div style={{ color: '#C5FF41', fontSize: '10px', fontWeight: 900 }}>LIVE_SYNC</div>
                                            {isVerified && <VerifiedBadge />}
                                        </div>
                                        <div style={{ color: '#333', fontSize: '10px' }}>ID: {userBrand?.id?.slice(0,8)}</div>
                                    </div>
                                </div>

                                {/* MANUALLY EDITABLE BIO (Upper-left card, under data fields) */}
                                <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <span style={{ fontSize: '10px', color: '#666', fontWeight: 800, letterSpacing: '1px' }}>STORE_FRONT_BIO</span>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                                        <textarea 
                                            value={bio}
                                            onChange={(e) => setBio(e.target.value)}
                                            placeholder="Write something cool about your brand for the storefront marketplace..."
                                            maxLength={160}
                                            style={{
                                                flex: 1, height: '54px', background: '#070707', color: '#fff',
                                                border: '1px solid #1A1A1A', borderRadius: '12px', padding: '10px',
                                                fontSize: '12px', outline: 'none', resize: 'none', fontFamily: 'sans-serif'
                                            }}
                                        />
                                        <button 
                                            onClick={saveBio}
                                            disabled={isSavingBio}
                                            style={{
                                                padding: '10px 14px', borderRadius: '12px', border: 'none',
                                                background: '#222', color: '#C5FF41', fontSize: '11px', fontWeight: 700,
                                                cursor: 'pointer', height: '54px', transition: '0.2s', opacity: isSavingBio ? 0.5 : 1
                                            }}
                                        >
                                            {isSavingBio ? '...' : 'SAVE'}
                                        </button>
                                    </div>
                                </div>

                                <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '12px', border: '1px solid #1A1A1A' }}>
                                    <span style={{ fontSize: '11px', color: '#888' }}>
                                        {bookedDates.length > 0 
                                            ? `Next session: ${[...bookedDates].sort().reverse()[0]}` 
                                            : "No upcoming sessions"}
                                    </span>
                                </div>
                            </DashboardCard>

                            <DashboardCard style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '12px', color: '#666' }}>
                                        ACTIVE CUSTOMERS {isVerified && <VerifiedBadge />}
                                    </div>
                                    <div style={{ fontSize: '32px', fontWeight: 700 }}>{chatCount}</div>
                                </div>
                                <button onClick={() => setActiveTab('Ads')} style={actionBtnStyle}>+ Add Customers</button>
                            </DashboardCard>
                        </div>

                        {/* Lower Grid */}
                        <div style={lowerGridStyle}>
                            <DashboardCard style={{ overflowY: 'auto' }}>
                                <div style={{ background: '#000', padding: '15px', borderRadius: '12px', border: '1px solid #222', marginBottom: '20px' }}>
                                    <p style={{ fontSize: '10px', color: '#666', marginBottom: '8px' }}>AD LINK</p>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                        <code style={codeStyle}>{shareUrl}</code>
                                    </div>
                                </div>
                                <div style={qrContainerStyle}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>Online Store</div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button onClick={() => setActiveTab('Preview')} style={secondaryBtnStyle}>Preview</button>
                                        </div>
                                    </div>
                                    <div style={qrBoxStyle}>
                                        <QRCode value={marketFrontUrl} size={80} qrStyle="dots" bgColor="#000" fgColor="#C5FF41" />
                                    </div>
                                </div>
                            </DashboardCard>

                            {/* Malvin AI */}
                            <DashboardCard style={{ flex: 1, overflow: 'hidden' }}>
                                <video ref={videoRef} autoPlay style={{ display: 'none' }} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                                    <div style={{ fontSize: '18px', fontWeight: 700 }}>Malvin Assistant</div>
                                    <div onClick={startVision} style={{ ...visionBadge, backgroundColor: isVisionActive ? '#C5FF41' : '#111', color: isVisionActive ? '#000' : '#fff' }}>
                                        {isVisionActive ? '● VISION ACTIVE' : '○ ENABLE VISION'}
                                    </div>
                                </div>
                                <div style={aiChatArea}>
                                    {aiHistory.map((chat, i) => (
                                        <div key={i} style={{ 
                                            alignSelf: chat.role === 'user' ? 'flex-end' : 'flex-start', 
                                            maxWidth: '85%', padding: '12px', borderRadius: '15px', 
                                            background: chat.role === 'user' ? '#222' : 'rgba(197,255,65,0.05)',
                                            border: chat.role === 'malvin' ? '1px solid #C5FF41' : 'none',
                                            color: chat.role === 'malvin' ? '#C5FF41' : '#fff',
                                            fontSize: '13px'
                                        }}>{chat.text}</div>
                                    ))}
                                    <div ref={chatEndRef} />
                                </div>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                    <input value={aiMessage} onChange={e => setAiMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendToMalvin()} placeholder="Ask Malvin..." style={aiInputStyle} />
                                    <button onClick={() => sendToMalvin()} style={aiSendBtn}>SEND</button>
                                </div>
                            </DashboardCard>
                        </div>
                    </div>
                )}
            </div>
            {showCalendar && (
                <div style={modalOverlayStyle} onClick={() => setShowCalendar(false)}>
                    <div style={calendarCardStyle} onClick={e => e.stopPropagation()}>
                        <h3 style={{ color: '#C5FF41', margin: '0 0 10px 0' }}>SESSION LOG</h3>
                        <p style={{ fontSize: '11px', color: '#666', marginBottom: '20px' }}>CLIENT RESERVATIONS RECORDED VIA MARKETFRONT</p>
                        
                        <div style={{ maxHeight: '300px', overflowY: 'auto', textAlign: 'left', marginBottom: '20px' }}>
                            {bookedDates.length === 0 ? (
                                <div style={{ color: '#333', textAlign: 'center', padding: '20px' }}>NO_DATA_FOUND</div>
                            ) : (
                                bookedDates.sort().map((date, idx) => (
                                    <div key={idx} style={dateRowStyle}>
                                        <span style={{ color: '#C5FF41' }}>[ SESSION ]</span>
                                        <span style={{ color: '#fff', fontWeight: 600 }}>{date}</span>
                                        <span style={{ fontSize: '10px', color: '#444' }}>CONFIRMED</span>
                                    </div>
                                ))
                            )}
                        </div>

                        <button style={{ ...secondaryBtnStyle, width: '100%', padding: '15px' }} onClick={() => setShowCalendar(false)}>
                            CLOSE_LOG
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// Styles
const modalOverlayStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
    backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 20000,
    display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)'
};

const calendarCardStyle: React.CSSProperties = {
    background: '#111', border: '1px solid #1A1A1A', padding: '30px', 
    borderRadius: '32px', width: '400px', textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
};

const dateRowStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '12px 0', borderBottom: '1px solid #1A1A1A', fontSize: '13px', fontFamily: 'monospace'
};
const mainContainerStyle: React.CSSProperties = { backgroundColor: '#000', height: '100vh', width: '100%', color: 'white', display: 'flex', flexDirection: 'column', overflow: 'hidden' };
const headerWrapper: React.CSSProperties = { width: '100%', maxWidth: '1400px', margin: '0 auto', padding: '20px', display: 'flex', alignItems: 'center', position: 'relative' };
const navPillStyle: React.CSSProperties = { position: 'absolute', left: '50%', transform: 'translateX(-50%)', background: '#111', padding: '6px', borderRadius: '40px', display: 'flex', gap: '5px', border: '1px solid #222' };
const navItemStyle: React.CSSProperties = { position: 'relative', padding: '10px 24px', borderRadius: '30px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', transition: '0.3s' };
const unreadDotStyle: React.CSSProperties = { position: 'absolute', top: '6px', right: '12px', width: '8px', height: '8px', borderRadius: '50%', background: '#FF4141', border: '2px solid #111' };
const contentWrapper: React.CSSProperties = { flex: 1, padding: '0 20px 20px 20px', overflow: 'hidden', display: 'flex', flexDirection: 'column' };
const bentoGridStyle: React.CSSProperties = { flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1400px', margin: '0 auto', width: '100%', overflow: 'hidden' };
const upperGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', flexShrink: 0 };
const lowerGridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: '400px 1fr', gap: '20px', flex: 1, minHeight: 0 };
const progressBarStyle: React.CSSProperties = { height: '8px', width: '100%', background: '#222', borderRadius: '10px', overflow: 'hidden' };
const actionBtnStyle: React.CSSProperties = { padding: '16px 24px', borderRadius: '20px', background: '#C5FF41', border: 'none', fontWeight: 700, cursor: 'pointer' };
const codeStyle: React.CSSProperties = { color: '#C5FF41', fontSize: '11px', wordBreak: 'break-all', flex: 1 };
const qrContainerStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '20px', border: '1px solid #222', display: 'flex', alignItems: 'center', gap: '15px' };
const qrBoxStyle: React.CSSProperties = { background: '#000', padding: '8px', borderRadius: '12px', border: '1px solid #C5FF41', lineHeight: 0 };
const secondaryBtnStyle: React.CSSProperties = { padding: '8px 12px', borderRadius: '10px', background: 'transparent', color: 'white', border: '1px solid #333', fontWeight: 600, cursor: 'pointer', fontSize: '11px' };
const toastStyle: React.CSSProperties = { position: 'fixed', top: '30px', left: '50%', zIndex: 10000, width: '380px', background: '#1A1A1A', border: '1px solid #C5FF41', borderRadius: '20px', padding: '16px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' };
const aiChatArea: React.CSSProperties = { flex: 1, background: '#080808', borderRadius: '24px', padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' };
const aiInputStyle: React.CSSProperties = { flex: 1, background: '#111', border: '1px solid #333', borderRadius: '15px', padding: '12px', color: '#fff' };
const aiSendBtn: React.CSSProperties = { background: '#C5FF41', border: 'none', padding: '0 20px', borderRadius: '15px', fontWeight: 700, cursor: 'pointer' };
const visionBadge: React.CSSProperties = { padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', fontSize: '10px', fontWeight: 700, letterSpacing: '1px' };
export default Dashboard;