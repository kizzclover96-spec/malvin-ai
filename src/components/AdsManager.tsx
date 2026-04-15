import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { ref, onValue, push, set } from "firebase/database";

const AdsManager = ({ userBrand }: any) => {
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);

    const [newAd, setNewAd] = useState({
        title: '',
        linkedProduct: '',
        budget: '',
        duration: '7', // Days
        targeting: 'Global_Tech', // Default interest
        platform: 'Neural_Feed',
        status: 'Pending_Review' // Changed from Active to Pending
    });
    const totalInvestment = (Number(newAd.budget) * Number(newAd.duration)) || 0;
    const neuralFee = totalInvestment * 0.10; // 10% processing fee
    // Fetch Ads and Products (to link them)
    useEffect(() => {
        const userId = auth.currentUser?.uid;
        if (!userId) return;

        // Fetch Ads
        onValue(ref(db, `users/${userId}/campaigns`), (snapshot) => {
            const data = snapshot.val();
            setCampaigns(data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : []);
            setLoading(false);
        });

        // Fetch Products for the dropdown
        onValue(ref(db, `users/${userId}/catalog`), (snapshot) => {
            const data = snapshot.val();
            setProducts(data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : []);
        });
    }, []);

    const deployCampaign = async () => {
        const userId = auth.currentUser?.uid;
        if (!userId || !newAd.title || !newAd.budget) return;
        
        const adRef = ref(db, `users/${userId}/campaigns`);
        await set(push(adRef), {
            ...newAd,
            totalInvestment,
            neuralFee,
            timestamp: Date.now(),
            reach: 0, // Starts at 0 until you manually update it
            status: 'Awaiting_Funding' 
        });
        setShowModal(false);
    };

    return (
        <div style={{ padding: '20px', color: 'white' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
                <div>
                    <h1 style={{ fontSize: '40px', fontWeight: 700, margin: 0 }}>Ad_Deploy</h1>
                    <p style={{ opacity: 0.5 }}>Amplify {userBrand?.name} across the neural network.</p>
                </div>
                <button onClick={() => setShowModal(true)} style={deployBtnStyle}>Launch New Campaign</button>
            </div>

            {/* --- ANALYTICS OVERVIEW --- */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '40px' }}>
                <div style={statBox}>
                    <span style={statLabel}>Total Reach</span>
                    <div style={statValue}>{campaigns.reduce((acc, curr) => acc + (curr.reach || 0), 0).toLocaleString()}</div>
                </div>
                <div style={statBox}>
                    <span style={statLabel}>Active Campaigns</span>
                    <div style={statValue}>{campaigns.length}</div>
                </div>
                <div style={statBox}>
                    <span style={statLabel}>Avg. Engagement</span>
                    <div style={statValue}>4.2%</div>
                </div>
            </div>

            {/* --- CAMPAIGN LIST --- */}
            <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                            <th style={thStyle}>Campaign</th>
                            <th style={thStyle}>Status</th>
                            <th style={thStyle}>Budget</th>
                            <th style={thStyle}>Reach</th>
                            <th style={thStyle}>Platform</th>
                        </tr>
                    </thead>
                    <tbody>
                        {campaigns.map(ad => (
                            <tr key={ad.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                                <td style={tdStyle}>{ad.title}</td>
                                <td style={tdStyle}>
                                    <span style={{ color: '#C5FF41', fontSize: '10px', border: '1px solid #C5FF41', padding: '2px 8px', borderRadius: '10px' }}>{ad.status}</span>
                                </td>
                                <td style={tdStyle}>${ad.budget}</td>
                                <td style={tdStyle}>{ad.reach?.toLocaleString()}</td>
                                <td style={tdStyle}>{ad.platform}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* --- LAUNCH MODAL --- */}
            {showModal && (
                <div style={overlayStyle}>
                    <div style={glassModal}>
                        <h2 style={{ marginBottom: '5px' }}>Initiate_Deployment</h2>
                        <p style={{ fontSize: '12px', opacity: 0.5, marginBottom: '25px' }}>
                            Specify targeting parameters for manual neural routing.
                        </p>
                        
                        <label style={labelStyle}>Campaign Title</label>
                        <input style={inputStyle} placeholder="Summer Drop 2026" value={newAd.title} onChange={e => setNewAd({...newAd, title: e.target.value})} />

                        <div style={{ display: 'flex', gap: '15px' }}>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Target Demographic</label>
                                <select style={inputStyle} value={newAd.targeting} onChange={e => setNewAd({...newAd, targeting: e.target.value})}>
                                    <option value="Global_Tech">Global_Tech</option>
                                    <option value="Luxury_Fashion">Luxury_Fashion</option>
                                    <option value="Creative_Arts">Creative_Arts</option>
                                    <option value="Gen_Alpha_Core">Gen_Alpha_Core</option>
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={labelStyle}>Duration (Days)</label>
                                <input style={inputStyle} type="number" value={newAd.duration} onChange={e => setNewAd({...newAd, duration: e.target.value})} />
                            </div>
                        </div>

                        <label style={labelStyle}>Daily Budget ($)</label>
                        <input style={inputStyle} type="number" placeholder="min. 10.00" value={newAd.budget} onChange={e => setNewAd({...newAd, budget: e.target.value})} />

                        {/* --- PRICE BREAKDOWN (The "Agency" part) --- */}
                        <div style={{ 
                            padding: '20px', background: 'rgba(197, 255, 65, 0.05)', 
                            borderRadius: '16px', border: '1px solid rgba(197, 255, 65, 0.1)',
                            marginBottom: '25px'
                        }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span style={{ fontSize: '12px', opacity: 0.6 }}>Ad Credit:</span>
                                <span style={{ fontSize: '12px' }}>${totalInvestment.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <span style={{ fontSize: '12px', opacity: 0.6 }}>Neural Processing (10%):</span>
                                <span style={{ fontSize: '12px' }}>${neuralFee.toFixed(2)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(197, 255, 65, 0.2)', paddingTop: '10px' }}>
                                <span style={{ fontWeight: 700, color: '#C5FF41' }}>TOTAL INVESTMENT:</span>
                                <span style={{ fontWeight: 700, color: '#C5FF41' }}>${(totalInvestment + neuralFee).toFixed(2)}</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '15px' }}>
                            <button onClick={deployCampaign} style={primaryBtn}>DEPLOY_CAMPAIGN</button>
                            <button onClick={() => setShowModal(false)} style={secondaryBtn}>Abort</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// --- STYLES ---
const statBox = { background: 'rgba(255,255,255,0.03)', padding: '24px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)' };
const statLabel = { fontSize: '12px', opacity: 0.4, textTransform: 'uppercase' as 'uppercase', letterSpacing: '1px' };
const statValue = { fontSize: '28px', fontWeight: 700, marginTop: '8px', color: '#C5FF41' };
const thStyle = { padding: '20px', opacity: 0.4, fontSize: '12px', textTransform: 'uppercase' as 'uppercase' };
const tdStyle = { padding: '20px', fontSize: '14px' };
const overlayStyle = { position: 'fixed' as 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };
const glassModal = { background: 'rgba(20,20,20,0.95)', border: '1px solid rgba(255,255,255,0.1)', padding: '40px', borderRadius: '32px', width: '500px' };
const inputStyle = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '12px', color: 'white', marginBottom: '20px', outline: 'none' };
const labelStyle = { fontSize: '10px', opacity: 0.4, textTransform: 'uppercase' as 'uppercase', marginBottom: '8px', display: 'block' };
const deployBtnStyle = { background: '#C5FF41', color: 'black', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' };
const primaryBtn = { background: '#C5FF41', color: 'black', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 700, flex: 1, cursor: 'pointer' };
const secondaryBtn = { background: 'transparent', color: 'white', border: '1px solid #333', padding: '14px', borderRadius: '12px', flex: 1, cursor: 'pointer' };

export default AdsManager;