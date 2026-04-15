import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { ref, onValue, update } from "firebase/database";

const AdsManager = () => {
    const [pendingRequests, setPendingRequests] = useState<any[]>([]);

    useEffect(() => {
        // As an admin, you look at the GLOBAL queue we created earlier
        const adminQueueRef = ref(db, `admin/pending_wires`);
        onValue(adminQueueRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setPendingRequests(Object.keys(data).map(k => ({ id: k, ...data[k] })));
            }
        });
    }, []);

    return (
        <div style={adminLayout}>
            <header style={headerStyle}>
                <h1 style={{ fontSize: '24px', letterSpacing: '2px' }}>NEURAL_COMMAND_CENTER</h1>
                <div style={badge}>ADMIN_MODE</div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                
                {/* --- COLUMN 1: PENDING PAYMENTS --- */}
                <section style={panelStyle}>
                    <h3>Pending_Treasury_Wires</h3>
                    {pendingRequests.map(req => (
                        <div key={req.id} style={itemStyle}>
                            <div>
                                <div style={{fontWeight: 600}}>€{req.amount}</div>
                                <div style={{fontSize: '12px', opacity: 0.6}}>{req.userEmail}</div>
                            </div>
                            <button style={approveBtn}>CLEAR_FUNDS</button>
                        </div>
                    ))}
                </section>

                {/* --- COLUMN 2: ACTIVE AD DEPLOYMENTS --- */}
                <section style={panelStyle}>
                    <h3>Active_Campaign_Deployments</h3>
                    <p style={{opacity: 0.4, fontSize: '13px'}}>No active deployments currently running.</p>
                </section>

            </div>
        </div>
    );
};

// --- ADMIN STYLES ---
const adminLayout = { background: '#000', minHeight: '100vh', padding: '40px', color: '#fff', fontFamily: 'Inter, sans-serif' };
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '50px', borderBottom: '1px solid #222', paddingBottom: '20px' };
const badge = { background: '#C5FF41', color: '#000', padding: '5px 12px', borderRadius: '4px', fontSize: '10px', fontWeight: 900 };
const panelStyle = { background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '20px', padding: '25px' };
const itemStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderBottom: '1px solid #111' };
const approveBtn = { background: '#fff', color: '#000', border: 'none', padding: '8px 15px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '11px' };

export default AdsManager;