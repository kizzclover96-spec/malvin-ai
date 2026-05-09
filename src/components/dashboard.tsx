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
const BackButton = ({ onClick }: { onClick: () => void }) => (
    <div 
        onClick={onClick}
        style={{
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '12px',
            marginBottom: '32px'
        }}
        className="group"
    >
        <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: '1px solid #bf00ff', // Your purple brand color
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
            boxShadow: '0 0 10px rgba(191, 0, 255, 0.3)',
            transition: '0.3s'
        }}>
            ESC
        </div>
        <span style={{ 
            fontSize: '11px', 
            letterSpacing: '2px', 
            fontWeight: 700, 
            opacity: 0.5 
        }}>
            BACK_TO_SESSION
        </span>
    </div>
);

const dashboard = (props) => {
    const user = auth.currentUser;
    const [isProcessing, setIsProcessing] = useState(false);
    const { userBrand = {}, onBack } = props;
    console.log("All Props received:", props); // This will show you EVERYTHING being sent
    const [activeTab, setActiveTab] = useState('Invoices');
    const [isAutopilot, setIsAutopilot] = useState(true);
    console.log("Dashboard Props:", userBrand);
    const brandName = userBrand?.name || "default";
    const [chatCount, setChatCount] = useState(0);
    const [aiMessage, setAiMessage] = useState('');
    const [aiHistory, setAiHistory] = useState([]);
    const [isVisionActive, setIsVisionActive] = useState(false);
    const videoRef = useRef(null);

    // AI VISION LOGIC
    const startVision = async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
            if (videoRef.current) videoRef.current.srcObject = stream;
            setIsVisionActive(true);
            
            // 1. Clear any existing interval to prevent "Double Vision"
            if (visionInterval.current) clearInterval(visionInterval.current);

            // 2. Slowed down to 10 seconds (10000ms)
            // 3. Added the isProcessing check to ensure we wait for the AI
            visionInterval.current = setInterval(() => {
                if (!isProcessing) {
                    captureFrame();
                }
            }, 10000); 

        } catch (err) { 
            console.error("Vision Error:", err); 
        }
    };

    const captureFrame = () => {
        if (!videoRef.current || isProcessing) return; // Don't send if already busy
        
        setIsProcessing(true); // Lock it
        const canvas = document.createElement("canvas");
        canvas.width = 1280; 
        canvas.height = 720;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL("image/jpeg", 0.5).split(',')[1];
        
        socket.emit('screen-stream', { image: base64, text: "Analyzing dashboard..." });
    };

    useEffect(() => {
        socket.on('ai-reply', (data) => {
            setAiHistory(prev => [...prev, { role: 'malvin', text: data.text }]);
            setIsProcessing(false); // AI replied, we can send a new frame now
        });
        return () => {
            socket.off('ai-reply');
            if (visionInterval.current) clearInterval(visionInterval.current);
        };
    }, []);

    const sendToMalvin = () => {
        setAiHistory(prev => [...prev, { role: 'user', text: aiMessage }]);
        socket.emit('screen-stream', { text: aiMessage });
        setAiMessage('');
    };

    // 2. Real-time Listener for Customer/Chat Count
    useEffect(() => {
        if (!userBrand?.id) return;

        const q = query(
            collection(firestore, "conversations"),
            where("brandId", "==", String(userBrand.id))
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setChatCount(snapshot.size); // Updates dashboard real-time
        });

        return () => unsubscribe();
    }, [userBrand?.id]);

    const userBrandId = (typeof userBrand !== 'undefined' && userBrand?.id) 
        ? userBrand.id 
        : brandName.toLowerCase().replace(/\s+/g, '-');
    
    const navItems = ['Ads', 'Invoices', 'Payments', 'Chats', 'Catalog'];
    const marketFrontUrl = `${window.location.origin}/market/${userBrand?.slug || auth.currentUser?.uid}`;
    const shareUrl = `${window.location.origin}/chat/${auth.currentUser?.uid}`;
    
    const downloadQR = () => {
        const canvas = document.getElementById("malvin-qr") as HTMLCanvasElement;
        if (canvas) {
            const pngUrl = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
            let downloadLink = document.createElement("a");
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
                <MarketFront 
                    brandId={userBrandId} 
                    userBrand={userBrand} 
                    brandName={userBrand?.name || 'Brand'} 
                />
            </div>
        );
    }
   
    return (
        <>
           
            <div style={{
            backgroundColor: '#000000',
            height: '100vh',
            width: '100%',
            color: 'white',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            overflowX: 'hidden'
            }}>
                {/* --- HEADER AREA --- */}
                <div style={{ 
                    maxWidth: '1200px', 
                    margin: '0 auto 60px auto', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', // Centers the pill
                    position: 'relative',      // Allows BackButton to sit on the left
                    minHeight: '50px',
                    paddingTop: '20px'
                }}>
                    {/* Back Button positioned absolutely relative to this header */}
                    <div style={{ position: 'absolute', left: 0 }}>
                        <BackButton onClick={onBack} />
                    </div>
                    
                    {/* 1. TOP PILL NAVIGATION */}
                    <div style={{ 
                        margin: '0 auto' 
                    }}>
                        <div style={{ 
                        background: '#111', 
                        padding: '6px', 
                        borderRadius: '40px', 
                        display: 'flex', 
                        gap: '5px',
                        border: '1px solid #222',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
                        }}>
                            {navItems.map(item => (
                                <div 
                                key={item}
                                onClick={() => setActiveTab(item)}
                                style={{
                                    padding: '10px 24px',
                                    borderRadius: '30px',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    backgroundColor: activeTab === item ? '#C5FF41' : 'transparent',
                                    color: activeTab === item ? 'black' : '#666',
                                    transition: '0.3s'
                                }}
                                >
                                {item}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                {activeTab === 'Chats' ? (
                    <Chats userBrand={userBrand}
                     onBack={() => setActiveTab('Invoices')}
                     brandId={auth.currentUser?.uid}
                    />
                ) : activeTab === 'Ads' ? (
                    <AdsManager userBrand={userBrand} 
                     onBack={() => setActiveTab('Invoices')}
                     userBrand={userBrand}
                     brandName={userBrand.name}
                    />
                ) : activeTab === 'Catalog' ? (
                    <Catalog 
                        userBrand={userBrand} 
                        brandName={userBrand.name}
                        onBack={() => setActiveTab('Invoices')}
                    />
                ) : activeTab === 'Payments' ? (
                    <Payments 
                        userBrand={userBrand} 
                        brandName={userBrand.name}
                        onBack={() => setActiveTab('Invoices')}
                    />
                ) : (
                    <div style={{ 
                        flex: 1, // This tells the content to take up all space below the header
                        padding: '0 20px 20px 20px', 
                        overflow: 'hidden', // Keeps the "bento box" inside the screen
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '20px',
                        maxWidth: '1400px',
                        margin: '0 auto',
                        width: '100%',
                        boxSizing: 'border-box'
                    }}>
                        
                        {/* 2. UPPER BENTO BOX (Financial Pulse) */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', flexShrink: 0 }}>
                        
                            {/* Revenue Card */}
                            <DashboardCard>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                                <div>
                                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>MONTHLY REVENUE</div>
                                    <div style={{ fontSize: '36px', fontWeight: 700 }}>€172,560.00</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>MALVIN FORECAST</div>
                                    <div style={{ fontSize: '18px', color: '#C5FF41' }}>+12.4%</div>
                                </div>
                                </div>
                                {/* The Progress Bar from your image */}
                                <div style={{ height: '8px', width: '100%', background: '#222', borderRadius: '10px', overflow: 'hidden', display: 'flex' }}>
                                    <div style={{ width: '70%', background: '#C5FF41', height: '100%' }} />
                                </div>
                                <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                                    {/* Avatar stack like the image */}
                                    {[1,2,3,4].map(i => (
                                        <div key={i} style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#333', border: '2px solid #111' }} />
                                    ))}
                                </div>
                            </DashboardCard>

                            {/* 3. NEW CUSTOMER/CHAT CARD (Replaces Payout Card) */}
                            <DashboardCard style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>ACTIVE CUSTOMERS</div>
                                    <div style={{ fontSize: '36px', fontWeight: 700 }}>
                                        {chatCount} <span style={{ fontSize: '18px', color: '#666' }}>Present</span>
                                    </div>
                                    <div style={{ marginTop: '15px', color: '#C5FF41', fontSize: '12px', fontWeight: 600 }}>
                                        ● Live in your chat section
                                    </div>
                                </div>
                                
                                {/* 4. SWITCH TO ADS TAB BUTTON */}
                                <button 
                                    onClick={() => setActiveTab('Ads')}
                                    style={{ 
                                        padding: '16px 24px', 
                                        borderRadius: '20px', 
                                        background: '#C5FF41', // Highlighted color
                                        color: 'black', 
                                        border: 'none', 
                                        fontWeight: 700,
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 15px rgba(197, 255, 65, 0.2)'
                                    }}
                                >
                                    + Add Customers
                                </button>
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
                            <DashboardCard style={{ display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
                                {/* Header */}
                                <div style={{ padding: '24px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontWeight: 600 }}>Business links</span>
                                    <span style={{ color: '#C5FF41', cursor: 'pointer', fontSize: '12px' }}>All Filters</span>
                                </div>

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
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        justifyContent: 'space-between', 
                                        gap: '15px',
                                        background: 'rgba(255,255,255,0.02)',
                                        padding: '15px',
                                        borderRadius: '20px',
                                        border: '1px solid rgba(197, 255, 65, 0.2)'
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

                                <div style={{ flexShrink: 0, paddingBottom: '20px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                        <div>
                                            <div style={{ fontSize: '24px', fontWeight: 700 }}>Neural Assistant Link</div>
                                            <div style={{ color: '#666' }}>Active ID: {userBrand?.id || 'MAL-001'}</div>
                                        </div>
                                        <div onClick={startVision} style={{ backgroundColor: isVisionActive ? '#C5FF41' : '#111', color: isVisionActive ? '#000' : '#fff', padding: '10px 20px', borderRadius: '12px', cursor: 'pointer', fontWeight: 700, height: 'fit-content' }}>
                                            {isVisionActive ? '● VISION ACTIVE' : '○ ENABLE VISION'}
                                        </div>
                                    </div>
                                </div>

                                {/* Live AI Chat History */}
                                <div style={{ 
                                    flex: 1, 
                                    background: '#111', 
                                    borderRadius: '24px', 
                                    padding: '20px', 
                                    display: 'flex', 
                                    flexDirection: 'column',
                                    overflowY: 'auto', // This allows only the messages to scroll
                                    gap: '15px',
                                    border: '1px solid #1A1A1A'
                                }}>
                                    {aiHistory.length === 0 ? (
                                        <div style={{ textAlign: 'center', marginTop: '50px', opacity: 0.5 }}>
                                            <p>"Waiting for vision stream to analyze dashboard..."</p>
                                        </div>
                                    ) : (
                                        aiHistory.map((chat, i) => (
                                            <div key={i} style={{ alignSelf: chat.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                                                <div style={{ 
                                                    background: chat.role === 'user' ? '#222' : 'transparent', 
                                                    padding: '12px 18px', 
                                                    borderRadius: '15px',
                                                    border: chat.role === 'malvin' ? '1px solid #C5FF41' : 'none',
                                                    color: chat.role === 'malvin' ? '#C5FF41' : '#fff'
                                                }}>
                                                    {chat.text}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Input Area */}
                                <div style={{ display: 'flex', gap: '10px', marginTop: '20px'}}>
                                    <input 
                                        value={aiMessage}
                                        onChange={(e) => setAiMessage(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && sendToMalvin()}
                                        placeholder="Talk to Malvin..."
                                        style={{ flex: 1, background: '#111', border: '1px solid #333', borderRadius: '15px', padding: '15px', color: '#fff', outline: 'none' }}
                                    />
                                    <button onClick={sendToMalvin} style={{ background: '#C5FF41', border: 'none', padding: '0 25px', borderRadius: '15px', fontWeight: 700, cursor: 'pointer' }}>SEND</button>
                                </div>
                            </DashboardCard>
                        </div>
                    </div>
                )}
                {activeTab === 'Ads' && <AdsManager userBrand={userBrand} brandName={userBrand.name} />}
            </div>
            
        </>       
    );       
  
};

export default dashboard;