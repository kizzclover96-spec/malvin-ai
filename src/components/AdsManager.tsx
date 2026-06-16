import React, { useState, useEffect } from 'react';

import { auth, db, storage } from '../firebase';
import { ref as dbRef } from "firebase/database";
import { serverTimestamp } from "firebase/database";

import AdReachEngine from "./AdReachEngine";

import {
    ref as dbRefRoot,
    onValue,
    push,
    update,
    child
} from "firebase/database";

import {
    ref as storageRef,
    uploadBytes,
    getDownloadURL
} from "firebase/storage";

const AdsManager = ({ userBrand }: any) => {
    const [campaigns, setCampaigns] = useState<any[]>([]);
    const [products, setProducts] = useState<any[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [creativeFile, setCreativeFile] = useState<File | null>(null);
    const [deploying, setDeploying] = useState(false);
    const [loading, setLoading] = useState(true);
    const activeCampaigns = campaigns.filter(
        c =>
            c.status === "Running" ||
            c.status === "Approved"
    ).length;
    const totalReach = campaigns.reduce(
        (sum, campaign) => sum + Number(campaign.reach || 0),
        0
    );
    const formatNumber = (num: number) => {
        if (num >= 1_000_000) {
            return (num / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
        }
        if (num >= 1_000) {
            return (num / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
        }
        return num.toString();
    };
    const getStatusColor = (status: string) => {
        switch(status) {
            case 'Pending_Admin_Review':
            return '#ffaa00';

            case 'Approved':
            return '#00ff88';

            case 'Rejected':
            return '#ff4d4d';

            case 'Running':
            return '#4da3ff';

            default:
            return '#999';
        }
    };
    const [agreements, setAgreements] = useState({
        terms: false,
        refund: false,
        policy: false
    });
    const agreementsAccepted =
    agreements.terms &&
    agreements.refund &&
    agreements.policy;
    
    // --- 1. ADD BALANCE STATE ---
    const [currentBalance, setCurrentBalance] = useState(0);

    const [newAd, setNewAd] = useState({
        title: '',
        linkedProduct: '',
        budget: '',
        duration: '7',
        targeting: 'Global_Tech',

        platform: 'Meta_Ads',

        website: '',
        description: '',
        cta: 'Learn More',
        creativeType: 'Image',

        status: 'Active'
    });

    const totalInvestment = (Number(newAd.budget) * Number(newAd.duration)) || 0;
    const neuralFee = totalInvestment * 0.10;
    const grandTotal = totalInvestment + neuralFee; // This is the total to subtract

    useEffect(() => {
        const userId = auth.currentUser?.uid;
        if (!userId) return;

        const balanceRef = dbRef(db, `users/${userId}/treasury/balance`);
        const campaignsRef = dbRef(db, `users/${userId}/campaigns`);
        const catalogRef = dbRef(db, `users/${userId}/catalog`);

        const unsubBalance = onValue(balanceRef, (snapshot) => {
            setCurrentBalance(snapshot.val() || 0);
        });

        const unsubCampaigns = onValue(campaignsRef, (snapshot) => {
            const data = snapshot.val();
            setCampaigns(data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : []);
            setLoading(false);
        });

        const unsubCatalog = onValue(catalogRef, (snapshot) => {
            const data = snapshot.val();
            setProducts(data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : []);
        });

        return () => {
            unsubBalance();
            unsubCampaigns();
            unsubCatalog();
        };
    }, []);
   
    const deployCampaign = async () => {
        const userId = auth.currentUser?.uid;
        const userEmail = auth.currentUser?.email;

        if (!userId) return;
        if (!newAd.title) return alert("Title required");
        if (!newAd.budget) return alert("Budget required");

        setDeploying(true);

        try {
            const allowedTypes = [
            'image/png',
            'image/jpeg',
            'image/webp',
            'video/mp4'
            ];

            if (!newAd.website.startsWith('http')) {
            alert("Please enter a valid URL");
            return;
            }

            if (newAd.description.trim().length < 20) {
            alert("Description must be at least 20 characters");
            return;
            }

            if (!creativeFile) {
            alert("Please upload a campaign creative");
            return;
            }

            if (Number(newAd.budget) < 10) {
            alert("Minimum campaign budget is €10/day");
            return;
            }

            if (!allowedTypes.includes(creativeFile.type)) {
            alert("Unsupported file type");
            return;
            }

            if (creativeFile.size > 15 * 1024 * 1024) {
            alert("File exceeds 15MB limit");
            return;
            }

            if (grandTotal > currentBalance) {
            alert("⚠️ INSUFFICIENT_BALANCE");
            return;
            }

            

            // upload file
            let uploadedUrl = "";

            if (creativeFile) {
            const filePath = `ads/${userId}/${Date.now()}_${creativeFile.name}`;
            const fileRef = storageRef(storage, filePath);

            await uploadBytes(fileRef, creativeFile);
            uploadedUrl = await getDownloadURL(fileRef);
            }

            const adRef = dbRef(db, `users/${userId}/campaigns`);
            const campaignId = push(adRef).key;

            const updates: any = {};

            updates[`users/${userId}/campaigns/${campaignId}`] = {
            ...newAd,
            creativeUrl: uploadedUrl,
            totalInvestment,
            neuralFee,
            grandTotal,
            reach: 0,
            status: 'Pending_Admin_Review',
            reviewStatus: 'Pending',
            paymentStatus: 'Pending_Charge',
            agreementsAccepted: true,
            rejectionReason: '',
            adminNotes: '',
            submittedAt: Date.now(),
            timestamp: Date.now()
            };

            const adminAdRef = push(child(dbRef(db), `admin/ad_queue`)).key;

            updates[`admin/ad_queue/${adminAdRef}`] = {
                campaignId,
                userId,
                userEmail,
                title: newAd.title,
                budget: grandTotal,
                platform: newAd.platform,
                description: newAd.description,
                website: newAd.website,
                cta: newAd.cta,
                creativeType: newAd.creativeType,
                timestamp: Date.now(),
                creativeUrl: uploadedUrl,

                // ADD THIS
                status: 'Pending_Admin_Review'
            };

            const ledgerKey = push(child(dbRef(db), `users/${userId}/treasury/ledger`)).key;

            updates[`users/${userId}/treasury/ledger/${ledgerKey}`] = {
            type: 'Reserved',
            amount: grandTotal,
            label: `Ad Campaign: ${newAd.title}`,
            date: new Date().toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short'
            }).toUpperCase(),
            status: 'Pending Approval',
            timestamp: Date.now()
            };

            await update(dbRefRoot(db), updates);

            setShowModal(false);

            setNewAd({
            title: '',
            linkedProduct: '',
            budget: '',
            duration: '7',
            targeting: 'Global_Tech',
            platform: 'Meta_Ads',
            website: '',
            description: '',
            cta: 'Learn More',
            creativeType: 'Image',
            status: 'Active'
            });

            alert("🚀 SENT_FOR_APPROVAL");

        } catch (error) {
            console.error("Deployment Error:", error);
            alert("Deployment Failed. Please check connection.");
        } finally {
            setDeploying(false);
        }
    };
    

    return (
        <>
            <AdReachEngine />
            <div style={{ padding: '20px', color: 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
                    <div>
                        <h1 style={{ fontSize: '40px', fontWeight: 700, margin: 0 }}>Ad_Deploy</h1>
                        <p style={{ opacity: 0.5 }}>Amplify {userBrand?.name} | Balance: <span style={{color: '#C5FF41'}}>€{currentBalance.toLocaleString()}</span></p>
                    </div>
                    <button onClick={() => setShowModal(true)} style={deployBtnStyle}>Launch New Campaign</button>
                
                </div>    

                {/* --- ANALYTICS OVERVIEW --- */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '40px' }}>
                    <div style={statBox}>
                        <span style={statLabel}>Total Reach</span>
                        <div style={statValue}>{formatNumber(totalReach)}</div>
                    </div>
                    <div style={statBox}>
                        <span style={statLabel}>Active Campaigns</span>
                        <div style={statValue}> {activeCampaigns}</div>
                    </div>
                    <div style={statBox}>
                        <span style={statLabel}>Avg. Engagement</span>
                        <div style={statValue}>4.2%</div>
                    </div>
                </div>

                {/* --- CAMPAIGN LIST (MODIFIED FOR FIXED SHAPE & SCROLLABLE CONTENT) --- */}
                <div style={{ 
                    background: 'rgba(255,255,255,0.02)', 
                    borderRadius: '24px', 
                    border: '1px solid rgba(255,255,255,0.05)', 
                    overflow: 'hidden',
                    maxHeight: '400px', 
                    overflowY: 'auto' 
                }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ position: 'sticky', top: 0, background: 'rgba(20,20,20,1)', zIndex: 1 }}>
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
                                <tr key={ad.id}>
                                    <td style={tdStyle}>{ad.title}</td>

                                    <td style={tdStyle}>
                                        <span
                                            style={{
                                                color: getStatusColor(ad.status),
                                                border: `1px solid ${getStatusColor(ad.status)}`,
                                                padding: '2px 8px',
                                                borderRadius: '10px',
                                                fontSize: '10px'
                                            }}
                                        >
                                            {ad.status}
                                        </span>

                                        {ad.status === 'Rejected' && ad.rejectionReason && (
                                            <div
                                                style={{
                                                    color: '#ff4d4d',
                                                    fontSize: '11px',
                                                    marginTop: '6px'
                                                }}
                                            >
                                                {ad.rejectionReason}
                                            </div>
                                        )}
                                    </td>

                                    <td style={tdStyle}>€{ad.grandTotal}</td>

                                    <td style={tdStyle}>
                                        {ad.reach?.toLocaleString()}
                                    </td>

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
                                Current Liquidity: €{currentBalance.toLocaleString()}
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
                                    <label style={labelStyle}>Advertising Platform</label>

                                    <select
                                        style={inputStyle}
                                        value={newAd.platform}
                                        onChange={(e) =>
                                            setNewAd({
                                            ...newAd,
                                            platform: e.target.value
                                            })
                                        }
                                        >
                                        <option value="Meta_Ads">Meta Ads</option>
                                        <option value="Google_Ads">Google Ads</option>
                                        <option value="TikTok_Ads">TikTok Ads</option>
                                        <option value="YouTube_Ads">YouTube Ads</option>
                                        <option value="Instagram_Ads">Instagram Ads</option>
                                    </select>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>Duration (Days)</label>
                                    <input style={inputStyle} type="number" value={newAd.duration} onChange={e => setNewAd({...newAd, duration: e.target.value})} />
                                </div>
                            </div>

                            <label style={labelStyle}>Daily Budget (€)</label>
                            <input style={inputStyle} type="number" placeholder="min. 10.00" value={newAd.budget} onChange={e => setNewAd({...newAd, budget: e.target.value})} />
                            <label style={labelStyle}>Website URL</label>
                            <input
                            style={inputStyle}
                            placeholder="(paste your ad link from your dashboard https://yourchat.com)"
                            value={newAd.website}
                            onChange={(e) =>
                                setNewAd({
                                ...newAd,
                                website: e.target.value
                                })
                            }
                            />
                            <label style={labelStyle}>Campaign Creative</label>

                            <input
                                type="file"
                                style={{
                                    marginBottom: '20px',
                                    color: 'white',
                                    width: '100%'
                                }}
                                accept="image/*,video/*"
                                onChange={(e: any) => {
                                    if (e.target.files?.[0]) {
                                        setCreativeFile(e.target.files[0]);
                                    }
                                }}
                            />
                            
                            <label style={labelStyle}>Ad Description</label>
                            <textarea
                            style={{
                                ...inputStyle,
                                minHeight: '120px',
                                resize: 'none'
                            }}
                            placeholder="Describe your product/service..."
                            value={newAd.description}
                            onChange={(e) =>
                                setNewAd({
                                ...newAd,
                                description: e.target.value
                                })
                            }
                            />
                            

                            {/* --- PRICE BREAKDOWN --- */}
                            <div style={{ 
                                padding: '20px', background: 'rgba(197, 255, 65, 0.05)', 
                                borderRadius: '16px', border: grandTotal > currentBalance ? '1px solid #ff4d4d' : '1px solid rgba(197, 255, 65, 0.1)',
                                marginBottom: '25px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '12px', opacity: 0.6 }}>Ad Credit:</span>
                                    <span style={{ fontSize: '12px' }}>€{totalInvestment.toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '12px', opacity: 0.6 }}>Neural Processing (10%):</span>
                                    <span style={{ fontSize: '12px' }}>€{neuralFee.toFixed(2)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid rgba(197, 255, 65, 0.2)', paddingTop: '10px' }}>
                                    <span style={{ fontWeight: 700, color: grandTotal > currentBalance ? '#ff4d4d' : '#C5FF41' }}>TOTAL REQUIRED:</span>
                                    <span style={{ fontWeight: 700, color: grandTotal > currentBalance ? '#ff4d4d' : '#C5FF41' }}>€{grandTotal.toFixed(2)}</span>
                                </div>
                                {grandTotal > currentBalance && (
                                    <div style={{color: '#ff4d4d', fontSize: '10px', marginTop: '10px', fontWeight: 600}}>
                                        (!) INSUFFICIENT_TREASURY_FUNDS
                                    </div>
                                )}
                            </div>
                            <div style={policyBox}>
                                <label style={checkboxLabel}>
                                    <input
                                    type="checkbox"
                                    checked={agreements.terms}
                                    onChange={(e) =>
                                        setAgreements({
                                        ...agreements,
                                        terms: e.target.checked
                                        })
                                    }
                                    />
                                    I agree to the Terms of Service
                                </label>

                                <label style={checkboxLabel}>
                                    <input
                                    type="checkbox"
                                    checked={agreements.refund}
                                    onChange={(e) =>
                                        setAgreements({
                                        ...agreements,
                                        refund: e.target.checked
                                        })
                                    }
                                    />
                                    I understand the Refund Policy
                                </label>

                                <label style={checkboxLabel}>
                                    <input
                                    type="checkbox"
                                    checked={agreements.policy}
                                    onChange={(e) =>
                                        setAgreements({
                                        ...agreements,
                                        policy: e.target.checked
                                        })
                                    }
                                    />
                                    My campaign complies with advertising policies
                                </label>
                            </div>
                            <div style={warningBox}>
                            <strong>Restricted Content Notice</strong>

                            <p style={{ opacity: 0.7 }}>
                                Campaigns involving scams, crypto guarantees,
                                adult content, illegal products, misleading
                                claims, or prohibited financial promotions
                                will be rejected and may result in account
                                suspension.
                            </p>
                            </div>
                            
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <button 
                                    onClick={deployCampaign} 
                                    style={{...primaryBtn, opacity: grandTotal > currentBalance ? 0.3 : 1, cursor: grandTotal > currentBalance ? 'not-allowed' : 'pointer'}}
                                    disabled={deploying || grandTotal > currentBalance || !agreementsAccepted}
                                >
                                    {deploying ? "DEPLOYING..." : "DEPLOY_CAMPAIGN"}
                                </button>
                                <button onClick={() => setShowModal(false)} style={secondaryBtn}>Abort</button>
                            </div>
                            <div style={{
                                display: 'flex',
                                gap: '20px',
                                marginTop: '20px',
                                fontSize: '11px',
                                opacity: 0.5
                                }}>
                                <span>Terms of Service</span>
                                <span>Refund Policy</span>
                                <span>Advertising Policies</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

// --- STYLES ---
const policyBox = {
  padding: '16px',
  background: 'rgba(255,255,255,0.03)',
  borderRadius: '16px',
  border: '1px solid rgba(255,255,255,0.08)',
  marginBottom: '20px'
};

const checkboxLabel = {
  display: 'flex',
  gap: '10px',
  alignItems: 'center',
  marginBottom: '12px',
  fontSize: '12px',
  opacity: 0.8
};

const warningBox = {
  background: 'rgba(255,170,0,0.08)',
  border: '1px solid rgba(255,170,0,0.25)',
  padding: '16px',
  borderRadius: '16px',
  marginBottom: '20px',
  fontSize: '12px'
};
const statBox = { background: 'rgba(255,255,255,0.03)', padding: '24px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)' };
const statLabel = { fontSize: '12px', opacity: 0.4, textTransform: 'uppercase' as 'uppercase', letterSpacing: '1px' };
const statValue = { fontSize: '28px', fontWeight: 700, marginTop: '8px', color: '#C5FF41' };
const thStyle = { padding: '20px', opacity: 0.4, fontSize: '12px', textTransform: 'uppercase' as 'uppercase' };
const tdStyle = { padding: '20px', fontSize: '14px' };
const overlayStyle = { position: 'fixed' as 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(10px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 };

const glassModal = { 
    background: 'rgba(20,20,20,0.95)', 
    border: '1px solid rgba(255,255,255,0.1)', 
    padding: '40px', 
    borderRadius: '32px', 
    width: '500px',
    maxHeight: '85vh',
    overflowY: 'auto' as 'auto'
};

const inputStyle = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', padding: '12px', borderRadius: '12px', color: 'white', marginBottom: '20px', outline: 'none' };
const labelStyle = { fontSize: '10px', opacity: 0.4, textTransform: 'uppercase' as 'uppercase', marginBottom: '8px', display: 'block' };
const deployBtnStyle = { background: '#C5FF41', color: 'black', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 700, cursor: 'pointer' };
const primaryBtn = { background: '#C5FF41', color: 'black', border: 'none', padding: '14px', borderRadius: '12px', fontWeight: 700, flex: 1, cursor: 'pointer' };
const secondaryBtn = { background: 'transparent', color: 'white', border: '1px solid #333', padding: '14px', borderRadius: '12px', flex: 1, cursor: 'pointer' };

export default AdsManager;