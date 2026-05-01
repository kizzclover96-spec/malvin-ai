import React, { useState, useRef } from 'react';
import { QRCode } from 'react-qrcode-logo';
import { auth } from "../firebase";
import Chats from './Chats';
import MarketFront from './MarketFront';
import Catalog from './Catalog';
import AdsManager from './AdsManager';
import Payments from'./Payments';
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
    const { userBrand = {}, onBack } = props;
    console.log("All Props received:", props); // This will show you EVERYTHING being sent
    const [activeTab, setActiveTab] = useState('Invoices');
    const [isAutopilot, setIsAutopilot] = useState(true);
    console.log("Dashboard Props:", userBrand);
    const brandName = userBrand?.name || "default";

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
            <div style={{ position: 'relative' }}>
                {/* Floating ESC button to get back to Dashboard */}
                <div style={{ position: 'fixed', top: '20px', left: '20px', zIndex: 9999 }}>
                    <BackButton onClick={() => setActiveTab('Invoices')} />
                </div>
                <MarketFront />
            </div>
        );
    }
   
    return (
        <>
           
            <div style={{
            backgroundColor: '#000000',
            minHeight: '100vh',
            width: '100%',
            color: 'white',
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
                    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        
                        {/* 2. UPPER BENTO BOX (Financial Pulse) */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px' }}>
                        
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

                            {/* Instant Payout Card */}
                            <DashboardCard style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>AVAILABLE FOR PAYOUT</div>
                                <div style={{ fontSize: '36px', fontWeight: 700 }}>€31,211.00</div>
                                <div style={{ marginTop: '15px', color: '#C5FF41', fontSize: '12px', fontWeight: 600 }}>Expected by Friday</div>
                                </div>
                                <button style={{ 
                                    padding: '16px 24px', 
                                    borderRadius: '20px', 
                                    background: 'white', 
                                    color: 'black', 
                                    border: 'none', 
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}>
                                    Pay out now
                                </button>
                            </DashboardCard>
                        </div>

                        {/* 3. LOWER SECTION (The Backdoor Details) */}
                        <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: '400px 1fr', 
                            gap: '20px', 
                            minHeight: '400px' 
                        }}>
                            {/* Left: Transaction/Message List */}
                            <DashboardCard style={{ padding: '0px', display: 'flex', flexDirection: 'column' }}>
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
                            <DashboardCard style={{ background: '#000', border: '1px solid #222', display: 'flex', flexDirection: 'column' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '40px' }}>
                                    <div>
                                        <div style={{ fontSize: '24px', fontWeight: 700 }}>Invoice #427-012</div>
                                        <div style={{ color: '#666' }}>Client: Maria Jones</div>
                                    </div>
                                    <div style={{ backgroundColor: '#111', padding: '10px 20px', borderRadius: '12px' }}>
                                        <span style={{ color: '#C5FF41' }}>●</span> Processing
                                    </div>
                                </div>

                                {/* Malvin Intelligence Integration */}
                                <div style={{ 
                                    flex: 1, 
                                    background: '#111', 
                                    borderRadius: '24px', 
                                    padding: '30px', 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    justifyContent: 'center',
                                    textAlign: 'center'
                                }}>
                                    <div style={{ color: '#C5FF41', fontSize: '12px', fontWeight: 800, letterSpacing: '2px', marginBottom: '10px' }}>MALVIN NEURAL ASSISTANT</div>
                                    <p style={{ fontSize: '18px', maxWidth: '500px', margin: '0 auto', lineHeight: '1.5' }}>
                                        "I noticed this client typically pays via Stripe. Would you like me to send a 1-click payment reminder?"
                                    </p>
                                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '20px' }}>
                                        <button style={{ background: '#C5FF41', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 700 }}>Yes, Send Reminder</button>
                                        <button style={{ background: 'transparent', border: '1px solid #333', color: 'white', padding: '12px 24px', borderRadius: '12px' }}>Ignore</button>
                                    </div>
                                </div>
                            </DashboardCard>
                        </div>
                    </div>
                )}
            </div>
            
        </>       
    );       
  
};

export default dashboard;