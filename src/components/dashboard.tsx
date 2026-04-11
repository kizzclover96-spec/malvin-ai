import React, { useState } from 'react';
import Chats from './Chats';
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

const dashboard = ({ userBrand }: any) => {
    const [activeTab, setActiveTab] = useState('Invoices');
    const [isAutopilot, setIsAutopilot] = useState(true);
    const shareUrl = `https://malvin.app/chat/${userBrandId}`;
    
    const navItems = ['Estimates', 'Invoices', 'Payments', 'Chats', 'Checkouts'];

    return (
        <>
           
            <div style={{
            backgroundColor: '#000000',
            minHeight: '100vh',
            color: 'white',
            padding: '20px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
            }}>
            
                {/* 1. TOP PILL NAVIGATION */}
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    marginBottom: '30px' 
                }}>
                    <div style={{ 
                    background: '#111', 
                    padding: '6px', 
                    borderRadius: '40px', 
                    display: 'flex', 
                    gap: '5px',
                    border: '1px solid #222'
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
                
                {activeTab === 'Chats' ? (
                    <Chats userBrand={userBrand} onBack={(targetTab: string) => setActiveTab(targetTab)} />
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
                            <DashboardCard style={{ padding: '0px' }}>
                                <div style={{ padding: '24px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between' }}>
                                    <span style={{ fontWeight: 600 }}>Active Invoices</span>
                                    <span style={{ color: '#C5FF41' }}>All Filters</span>
                                </div>
                                <div style={{ background: '#111', padding: '15px', borderRadius: '12px' }}>
                                    <p style={{ fontSize: '12px', color: '#666' }}>YOUR AD LINK</p>
                                    <code style={{ color: '#C5FF41' }}>{shareUrl}</code>
                                    <button onClick={() => navigator.clipboard.writeText(shareUrl)}>
                                        Copy Link
                                    </button>
                                </div>
                                <div style={{ padding: '10px' }}>
                                    {[1, 2, 3].map(i => (
                                        <div key={i} style={{ 
                                            padding: '16px', 
                                            borderRadius: '20px', 
                                            backgroundColor: i === 1 ? '#1A1A1A' : 'transparent',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '15px',
                                            marginBottom: '5px'
                                        }}>
                                            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#333' }} />
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: '14px', fontWeight: 600 }}>Client #{427 + i}</div>
                                                <div style={{ fontSize: '12px', color: '#666' }}>Pending • 2 days left</div>
                                            </div>
                                            <div style={{ fontSize: '14px', fontWeight: 700 }}>€53,154</div>
                                        </div>
                                    ))}
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