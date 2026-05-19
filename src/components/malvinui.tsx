import { db, auth, firestore } from "../firebase";
import { ref as dbRef, onValue } from "firebase/database";
import { signOut } from "firebase/auth";
import LeftPanel from "./left";
import ActivityPanel from "./RightSidebar";
import Notes from "./notes";
import Face from "./Face";
import { AuraBackground } from "../styles/AuraBackground";
import React, { useState } from "react";
import {  useEffect } from 'react';
import '../App.css';
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
const premiumGold = "#FFD700";
const btnReset = { background: 'none', border: 'none', padding: 0, cursor: 'pointer', outline: 'none' };
const smallActionStyle = { padding: '6px 12px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '9px', fontWeight: 'bold', cursor: 'pointer', letterSpacing: '1px', transition: 'all 0.2s' };
const StarIcon = ({ size = 18 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={premiumGold} stroke={premiumGold} strokeWidth="1">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
);
const MalvinHybridCycler = React.memo(({ content }: { content: any[] }) => {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        setIndex(0);
    }, [content]);

    useEffect(() => {
        if (!content?.length) return;

        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % content.length);
        }, 10000);

        return () => clearInterval(timer);
    }, [content]);

    const current = content[index];

    if (!current) return null;

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
            <div
                key={index}
                style={{
                    position: 'absolute',
                    inset: 0,
                    animation: 'slideLeft 0.8s cubic-bezier(0.4, 0, 0.2, 1) forwards',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px'
                }}
            >
                {current.type === 'image' ? (
                    <img
                        src={current.value}
                        alt="Insight"
                        style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            borderRadius: '12px'
                        }}
                    />
                ) : (
                    <p
                        style={{
                            fontSize: '18px',
                            color: 'white',
                            textAlign: 'center',
                            fontStyle: 'italic',
                            lineHeight: '1.6'
                        }}
                    >
                        "{current.value}"
                    </p>
                )}
            </div>
        </div>
    );
});
const appIconStyle: React.CSSProperties = {
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    cursor: 'pointer',
    transition: 'transform 0.2s cubic-bezier(0.2, 0, 0.2, 1)'
};

const iconBackground: React.CSSProperties = {
    width: '60px',
    height: '60px',
    margin: '0 auto 8px',
    borderRadius: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 8px 15px rgba(0,0,0,0.2)'
};

const glassStyle: React.CSSProperties = {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    borderRadius: '16px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
};
const iconLabelStyle: React.CSSProperties = {
    fontSize: '11px', 
    fontWeight: '500', 
    color: 'white',
    textAlign: 'center'
}; 
const GlobalStyles = () => (
    <style>{`
        @keyframes goldGlow { 
        0%, 100% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.2); border-color: rgba(255, 215, 0, 0.4); } 
        50% { box-shadow: 0 0 15px rgba(255, 215, 0, 0.5); border-color: #FFD700; }
        }
        @keyframes twinkle { 
        0%, 100% { opacity: 0.3; transform: scale(0.8) rotate(0deg); } 
        50% { opacity: 1; transform: scale(1.2) rotate(15deg); }
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 768px) {
            .left-section, .Right-section {
            display: none !important; /* Hide sidebars on mobile */
            }
            
            .middle-section {
            flex: 1 !important;
            width: 100vw !important;
            padding: 20px !important;
            }

            .mobile-menu-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.9);
            backdrop-filter: blur(10px);
            z-index: 999;
            display: flex;
            flex-direction: column;
            padding: 40px 20px;
            animation: fadeIn 0.3s ease;
            }
        }
    `}</style>
);
const Malvinui: React.FC<{ userEmail?: string; isPremium?: boolean }> = ({ userEmail, isPremium }) => {
    const [showTools, setShowTools] = useState(false);
    const [seconds, setSeconds] = React.useState(0);
    const [activeTab, setActiveTab] = React.useState('Session'); 
    const [showTrustMsg, setShowTrustMsg] = React.useState(false);
    const [brandData, setBrandData] = useState<any>(null);
    const [showUserMenu, setShowUserMenu] = React.useState(false);
    const [setIsPremium] = useState<boolean>(false);
    const username = "User";
    const [disabled, setDisabled] = React.useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const [userBrand, setUserBrand] = useState({
        id: "",
        name: "Connecting...",
        context: "",
        profilePic: null,
        currency: "Euro (€)",
        language: "English (US)",
        tier: "Basic Free Tier",
        status: "CEO / Founder"
    });
    const [activities, setActivities] = React.useState([{ 
        id: Date.now(), 
        text: "System Ready", 
        icon: "✨", 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    }]);
    
    useEffect(() => {
        // 3. Put the user logic INSIDE the useEffect
        const currentUser = auth.currentUser;

        if (currentUser && db) { 
            const userDbRef = dbRef(db, `users/${currentUser.uid}/brandData`);
            
            const unsubscribe = onValue(userDbRef, (snapshot) => {
                const data = snapshot.val();
                console.log("📡 Brand snapshot received");
                console.log("📦 Raw brand data:", data);
                console.log("🆔 currentUser.uid:", currentUser.uid);
                
                // Fallback: If no brand data exists, use the UID as the ID
                const brandId = data?.id || data?.brandId || currentUser.uid;
                console.log("🛠️ Updating userBrand...");
                setUserBrand(prev => ({
                    ...prev,
                    ...data, // This spreads existing data if it exists
                    id: brandId, // Guarantees we have an ID for Chats.tsx
                    name: data?.name || "CEO / Founder"
                }));
                console.log("✅ userBrand updated");
            });

            return () => unsubscribe();
        }
    }, []);
    useEffect(() => {
        const saved = localStorage.getItem('malvin_history');
        if (saved) setHistory(JSON.parse(saved));
    }, []);

    useEffect(() => {
        localStorage.setItem('malvin_history', JSON.stringify(history));
    }, [history]);
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
            setIsPremium(false);
            return;
            }

            const run = async () => {
            try {
                const userRef = doc(firestore, "users", user.uid);
                const snap = await getDoc(userRef);

                if (snap.exists()) {
                setIsPremium(snap.data()?.premium === true);
                } else {
                setIsPremium(false);
                }

            } catch (err) {
                console.error("Premium check failed:", err);
                setIsPremium(false);
            }
            };

            run();
        });

        return () => unsubscribe();
    }, []);

    // TIMER LOGIC
    React.useEffect(() => {
        const interval = setInterval(() => setSeconds(prev => prev + 1), 1000);
        return () => clearInterval(interval);
    }, []);

    const formatTime = () => {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };
    useEffect(() => {
        console.log("♻️ Malvinui rerendered");
    });
    const handleUpdateBrand = (newData: Partial<typeof userBrand>) => {
        setUserBrand(prev => ({
            ...prev,
            ...newData
        }));
    };
    const handleSaveSimulation = (data: any) => {
        setHistory(prev => [data, ...prev]);
    };
    const handleLogout = async () => {
     await signOut(auth);
    };
    const addActivity = (text: string, icon = "✨") => {
        setActivities(prev => [
            {
                id: Date.now(),
                text,
                icon,
                time: new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit"
                })
            },
            ...prev
        ]);
    };
    return (
        <div style={{ display: "flex", height: "100vh", background: "black" }}>

            {/* LEFT */}
            <div style={{ flex: 1 }}>
            <LeftPanel
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                setShowTools={setShowTools}
                addActivity={addActivity}

                auth={auth}
                userBrand={userBrand}
                setUserBrand={setUserBrand}
                setBrandData={setBrandData}
                history={history}
                handleSaveSimulation={handleSaveSimulation}
                handleUpdateBrand={handleUpdateBrand}
                handleLogout={handleLogout}
                userEmail={userEmail}
            />
            </div>

            {/* MIDDLE */}
            <div style={{ flex: 4, position: "relative" }}>
            <AuraBackground />

            {activeTab === "Notes" ? (
                <Notes userEmail={userEmail} addActivity={addActivity} />
            ) : (
                <Face />
            )}
            </div>

            {/* RIGHT */}
            <div style={{ flex: 2 }}>
            <ActivityPanel activities={activities} />
            </div>

        </div>
    );
};

export default Malvinui;
