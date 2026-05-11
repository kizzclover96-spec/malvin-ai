import React, { useState, useRef, useEffect } from 'react';
import { QRCode } from 'react-qrcode-logo';
import { firestore, auth } from "../firebase";
import Chats from './Chats';
import MarketFront from './MarketFront';
import Catalog from './Catalog';
import AdsManager from './AdsManager';
import Payments from'./Payments';
import { io } from 'socket.io-client';
import { collection, query, where, onSnapshot } from "firebase/firestore";

// The "Salesforce-style" rounded containers from your image
const DashboardCard = ({ children, style }: any) => (
  <div style={{
    background: '#111111',
    borderRadius: '32px',
    padding: '24px',
    border: '1px solid #1A1A1A',
    ...style
  }}>
    {children}
  </div>
);

const socket = io('http://localhost:3001'); // Your AI Backend

const BackButton = ({ onClick }) => (
    <div onClick={onClick} style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }} className="group">
        <div style={{
            width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #bf00ff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px',
            boxShadow: '0 0 10px rgba(191, 0, 255, 0.3)', transition: '0.3s'
        }}>ESC</div>
        <span style={{ fontSize: '11px', letterSpacing: '2px', fontWeight: 700, opacity: 0.5 }}>BACK_TO_SESSION</span>
    </div>
);

const Dashboard = (props) => {
    const { userBrand = {}, onBack } = props;
    const [activeTab, setActiveTab] = useState('Invoices');
    const [chatCount, setChatCount] = useState(0);
    const [aiMessage, setAiMessage] = useState('');
    const [aiHistory, setAiHistory] = useState([]);
    const [isVisionActive, setIsVisionActive] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);
    const [toast, setToast] = useState({ show: false, msg: '', sender: '' });

    const videoRef = useRef(null);
    const visionInterval = useRef(null);
    const chatEndRef = useRef(null);

    // Auto-scroll AI history
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [aiHistory]);

    

    // 1. Real-time Firebase Listener (Unread & Count)
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
                if (change.type === "modified" && activeTab !== 'Chats') {
                    const data = change.doc.data();
                    if (data.viewedByManager === false) {
                        setToast({ 
                            show: true, 
                            msg: data.lastMessage || "New message", 
                            sender: data.clientPhone || "Customer" 
                        });
                        setTimeout(() => setToast(prev => ({ ...prev, show: false })), 4000);
                    }
                }
            });
        });

        return () => unsubscribe();
    }, [userBrand?.id, activeTab]);

    // 2. AI Vision Logic
    const captureFrame = () => {
        if (!videoRef.current || isProcessing) return;
        setIsProcessing(true);
        const canvas = document.createElement("canvas");
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL("image/jpeg", 0.5).split(',')[1];
        socket.emit('screen-stream', { image: base64, text: "Analyzing dashboard..." });
    };

    const startVision = async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            if (videoRef.current) videoRef.current.srcObject = stream;
            setIsVisionActive(true);
            visionInterval.current = setInterval(() => captureFrame(), 10000);
        } catch (err) {
            console.error("Vision Error:", err);
        }
    };

    

    useEffect(() => {
        socket.on('ai-reply', (data) => {
            setAiHistory(prev => [...prev, { role: 'malvin', text: data.text }]);
            setIsProcessing(false);
        });
        return () => {
            socket.off('ai-reply');
            if (visionInterval.current) clearInterval(visionInterval.current);
        };
    }, []);

    const sendToMalvin = () => {
        if (!aiMessage.trim()) return;
        setAiHistory(prev => [...prev, { role: 'user', text: aiMessage }]);
        socket.emit('screen-stream', { text: aiMessage });
        setAiMessage('');
    };


    
    
    const navItems = ['Ads', 'Invoices', 'Payments', 'Chats', 'Catalog'];
    const shareUrl = `${window.location.origin}/chat/${auth.currentUser?.uid}`;
    const marketFrontUrl = `${window.location.origin}/market/${userBrand?.slug || auth.currentUser?.uid}`;
    
    
    const downloadQR = () => {
        const canvas = document.getElementById("malvin-qr");
        if (canvas instanceof HTMLCanvasElement) {
            const pngUrl = canvas.toDataURL("image/png");
            const downloadLink = document.createElement("a");
            downloadLink.href = pngUrl;
            downloadLink.download = `${userBrand?.name || 'Brand'}_QR.png`;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
        }
    };

    if (activeTab === 'Preview') {
        return (
            <div style={{ position: 'relative', background: '#000', minHeight: '100vh' }}>
                <div style={{ position: 'fixed', top: '20px', left: '20px', zIndex: 9999 }}>
                    <BackButton onClick={() => setActiveTab('Invoices')} />
                </div>
                {/* FIXED: Using userBrandId (the variable you defined above) */}
                <MarketFront brandId={userBrand?.id} userBrand={userBrand} brandName={userBrand?.name || 'Brand'} />
            </div>
        );
    }

    return (
        <>
           <style>{`
                @keyframes slideIn {
                    0% { transform: translateY(-100%) translateX(-50%); opacity: 0; }
                    100% { transform: translateY(0%) translateX(-50%); opacity: 1; }
                }
                .notification-toast { animation: slideIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
            `}</style>
           {toast.show && (
                <div className="notification-toast" onClick={() => { setActiveTab('Chats'); setToast(p => ({ ...p, show: false })); }}
                    style={{ position: 'fixed', top: '30px', left: '50%', zIndex: 10000, width: '380px', background: '#1A1A1A', border: '1px solid #C5FF41', borderRadius: '20px', padding: '16px', display: 'flex', alignItems: 'center', gap: '15px', cursor: 'pointer' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#C5FF41' }} />
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '10px', color: '#666', fontWeight: 800 }}>NEW MESSAGE</div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{toast.sender}</div>
                        <div style={{ fontSize: '12px', color: '#AAA', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '250px' }}>{toast.msg}</div>
                    </div>
                </div>
            )}

            <div style={{ backgroundColor: '#000000', height: '100vh', width: '100%', color: 'white', display: 'flex', flexDirection: 'column', boxSizing: 'border-box',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', overflowX: 'hidden'
            }}>
                {/* --- HEADER AREA --- */}
                <div style={{ width: '100%', maxWidth: '1400px', margin: '0 auto', padding: '20px', display: 'flex', alignItems: 'center', position: 'relative' }}>
                    <BackButton onClick={onBack} />
                    {/* 1. TOP PILL NAVIGATION */}
                    <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', background: '#111', padding: '6px', borderRadius: '40px', display: 'flex', gap: '5px', border: '1px solid #222' }}>
                        {navItems.map(item => (
                            <div key={item} onClick={() => setActiveTab(item)} style={{
                                position: 'relative', padding: '10px 24px', borderRadius: '30px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                                backgroundColor: activeTab === item ? '#C5FF41' : 'transparent',
                                color: activeTab === item ? 'black' : '#666', transition: '0.3s'
                            }}>
                                {item}
                                {item === 'Chats' && hasUnread && (
                                    <div style={{ position: 'absolute', top: '6px', right: '12px', width: '8px', height: '8px', borderRadius: '50%', background: '#FF4141', border: '2px solid #111' }} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                {/* --- MAIN CONTENT AREA --- */}
                <div style={{ flex: 1, padding: '0 20px 20px 20px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    {activeTab === 'Chats' ? <Chats userBrand={userBrand} brandId={auth.currentUser?.uid} /> :
                     activeTab === 'Ads' ? <AdsManager userBrand={userBrand} /> :
                     activeTab === 'Catalog' ? <Catalog userBrand={userBrand} /> :
                     activeTab === 'Payments' ? <Payments userBrand={userBrand} /> :
                    (
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1400px', margin: '0 auto', width: '100%', overflow: 'hidden' }}>
                         
                            {/* 2. UPPER BENTO BOX (Financial Pulse) */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', flexShrink: 0 }}>
                            
                                {/* Revenue Card */}
                                <DashboardCard>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                        <div>
                                            <div style={{ fontSize: '12px', color: '#666' }}>MONTHLY REVENUE</div>
                                            <div style={{ fontSize: '36px', fontWeight: 700 }}>€172,560.00</div>
                                        </div>
                                        <div style={{ color: '#C5FF41' }}>+12.4%</div>
                                    </div>
                                    <div style={{ height: '8px', width: '100%', background: '#222', borderRadius: '10px', overflow: 'hidden' }}>
                                        <div style={{ width: '70%', background: '#C5FF41', height: '100%' }} />
                                    </div>
                                </DashboardCard>

                                {/* 3. NEW CUSTOMER/CHAT CARD (Replaces Payout Card) */}
                                <DashboardCard style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div>
                                        <div style={{ fontSize: '12px', color: '#666' }}>ACTIVE CUSTOMERS</div>
                                        <div style={{ fontSize: '36px', fontWeight: 700 }}>{chatCount}</div>
                                    </div>
                                    <button onClick={() => setActiveTab('Ads')} style={{ padding: '16px 24px', borderRadius: '20px', background: '#C5FF41', border: 'none', fontWeight: 700, cursor: 'pointer' }}>+ Add Customers</button>
                                </DashboardCard>
                            </div>

                            {/* 3. LOWER SECTION (The Backdoor Details) */}
                            <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: '400px 1fr', 
                                gap: '20px', 
                                flex: 1, // Tells this section to grow to fill remaining space
                                minHeight: 0, // Critical for nested scrolling to work in Chrome/Safari
                                
                            }}>
                                {/* Left: Transaction/Message List */}
                                <DashboardCard style={{ overflowY: 'auto' }}>
                                    {/* Header */}

                                    {/* URL Link Box - Fixed to prevent overflow */}
                                    <div style={{ padding: '20px' }}>
                                        <div style={{ background: '#000', padding: '15px', borderRadius: '12px', border: '1px solid #222', marginBottom: '20px' }}>
                                            <p style={{ fontSize: '10px', color: '#666', marginBottom: '8px', letterSpacing: '1px' }}>YOUR AD LINK</p>
                                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                                <code style={{ 
                                                    color: '#C5FF41', 
                                                    fontSize: '11px', 
                                                    wordBreak: 'break-all', 
                                                    flex: 1 
                                                }}>
                                                    {shareUrl}
                                                </code>
                                                <button 
                                                    onClick={() => navigator.clipboard.writeText(shareUrl)}
                                                    style={{ background: '#222', color: '#fff', border: 'none', padding: '5px 10px', borderRadius: '6px', fontSize: '10px', cursor: 'pointer' }}
                                                >
                                                    Copy
                                                </button>
                                            </div>
                                        </div>

                                        {/* QR & Store View Row - Combined into a clean layout */}
                                        <div style={{ 
                                            background: 'rgba(255,255,255,0.02)', padding: '15px', borderRadius: '20px', border: '1px solid #222',
                                            display: 'flex', alignItems: 'center', gap: '15px'
                                        }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>Online Store View</div>
                                                <div style={{ display: 'flex', gap: '8px' }}>
                                                    <button onClick={downloadQR} style={{ 
                                                        padding: '8px 12px', borderRadius: '10px', background: 'white', 
                                                        color: 'black', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '11px'
                                                    }}>
                                                        Download QR
                                                    </button>
                                                    <button onClick={() => setActiveTab('Preview')} style={{ 
                                                        padding: '8px 12px', borderRadius: '10px', background: 'transparent', 
                                                        color: 'white', border: '1px solid #333', fontWeight: 600, cursor: 'pointer', fontSize: '11px'
                                                    }}>
                                                        Preview
                                                    </button>
                                                </div>
                                            </div>

                                            <div style={{ 
                                                background: '#000', 
                                                padding: '8px', 
                                                borderRadius: '12px', 
                                                border: '1px solid #C5FF41',
                                                lineHeight: 0 // Removes extra bottom space
                                            }}>
                                                <QRCode 
                                                    id="malvin-qr"
                                                    value={marketFrontUrl}
                                                    size={80} // Slightly smaller to fit perfectly
                                                    qrStyle="dots"
                                                    eyeRadius={5}
                                                    bgColor="#000000"
                                                    fgColor="#C5FF41"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </DashboardCard>

                                {/* Right: The Focus Area (Detail View) */}
                                <DashboardCard style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                    <video ref={videoRef} autoPlay style={{ display: 'none' }} />
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
                                        <div style={{ fontSize: '20px', fontWeight: 700 }}>Malvin Assistant</div>
                                        <div onClick={startVision} style={{ backgroundColor: isVisionActive ? '#C5FF41' : '#111', color: isVisionActive ? '#000' : '#fff', padding: '8px 16px', borderRadius: '12px', cursor: 'pointer', fontSize: '12px' }}>
                                            {isVisionActive ? '● VISION ACTIVE' : '○ ENABLE VISION'}
                                        </div>
                                    </div>
                                    <div style={{ flex: 1, background: '#111', borderRadius: '24px', padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {aiHistory.map((chat, i) => (
                                            <div key={i} style={{ alignSelf: chat.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%', padding: '12px', borderRadius: '15px', background: chat.role === 'user' ? '#222' : 'transparent', border: chat.role === 'malvin' ? '1px solid #C5FF41' : 'none', color: chat.role === 'malvin' ? '#C5FF41' : '#fff' }}>
                                                {chat.text}
                                            </div>
                                        ))}
                                        <div ref={chatEndRef} />
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                                        <input value={aiMessage} onChange={e => setAiMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendToMalvin()} placeholder="Ask Malvin..." style={{ flex: 1, background: '#111', border: '1px solid #333', borderRadius: '15px', padding: '12px', color: '#fff' }} />
                                        <button onClick={sendToMalvin} style={{ background: '#C5FF41', border: 'none', padding: '0 20px', borderRadius: '15px', fontWeight: 700 }}>SEND</button>
                                    </div>
                                </DashboardCard>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            
        </>       
    );       
  
};

export default Dashboard;