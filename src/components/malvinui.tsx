import { db, auth, firestore } from "../firebase";
import { ref as dbRef, onValue } from "firebase/database";
import { signOut } from "firebase/auth";
import Memories from './memories'; 
import Simulator from './Simulator';
import MarginCalculator from './MarginCalculator';
import MarketTrends from './MarketTrends';
import Runway from './Runway';
import MainDashboard from './dashboard';
import Premium from './Premium';
import Settings from './Settings';
import React, { useState } from "react";
import {  useEffect } from 'react';
import '../App.css';
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import ActivityPanel from "./RightSidebar";
import Notes from "./notes";
import Sidebar from "./Sidebar";
import Face from "./Face";
// Define colors so the icons don't crash
const premiumGold = "#FFD700";
const btnReset = { background: 'none', border: 'none', padding: 0, cursor: 'pointer', outline: 'none' };

const smallActionStyle = { padding: '6px 12px', backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: 'white', fontSize: '9px', fontWeight: 'bold', cursor: 'pointer', letterSpacing: '1px', transition: 'all 0.2s' };
const AuraBackground = () => {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      overflow: 'hidden',
      zIndex: 0,
      pointerEvents: 'none'
    }}>
      <style>{`
        @keyframes waveFlow1 {
          0% { transform: translateX(-20%) translateY(0%) rotate(0deg); }
          50% { transform: translateX(20%) translateY(-10%) rotate(8deg); }
          100% { transform: translateX(-20%) translateY(0%) rotate(0deg); }
        }

        @keyframes waveFlow2 {
          0% { transform: translateX(20%) translateY(0%) rotate(0deg); }
          50% { transform: translateX(-20%) translateY(10%) rotate(-8deg); }
          100% { transform: translateX(20%) translateY(0%) rotate(0deg); }
        }

        .aura-wave {
          position: absolute;
          width: 900px;
          height: 400px;
          filter: blur(120px);
          opacity: 0.6;
          mix-blend-mode: screen;
        }
      `}</style>

      {/* PURPLE WAVE */}
      <div
        className="aura-wave"
        style={{
          top: '20%',
          left: '-10%',
          background: 'linear-gradient(90deg, rgba(168,85,247,0.6), rgba(236,72,153,0.4), transparent)',
          animation: 'waveFlow1 12s ease-in-out infinite',
          opacity: 0.7,
        }}
      />

      {/* BLUE WAVE */}
      <div
        className="aura-wave"
        style={{
          bottom: '10%',
          right: '-10%',
          background: 'linear-gradient(90deg, rgba(59,130,246,0.6), rgba(99,102,241,0.4), transparent)',
          animation: 'waveFlow2 14s ease-in-out infinite',
          opacity: 0.7,
        }}
      />

      {/* EXTRA GLOW CENTER */}
      <div
        style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(168,85,247,0.25), transparent 70%)',
          filter: 'blur(100px)',
        }}
      />
    </div>
  );
};

const StarIcon = ({ size = 18 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={premiumGold} stroke={premiumGold} strokeWidth="1">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
);

// 2. The Main Island Container

// 1. Move this OUTSIDE of Malvinui
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
const Malvinui: React.FC<{ userEmail?: string }> = ({ userEmail }) => {
    console.log("🔥 MALVINUI RENDER STARTED");
    console.log("📧 userEmail:", userEmail);
    console.log("🌐 navigator online:", navigator.onLine);
    // 1. STATE & VARS (Fixed missing references)
    const [showTools, setShowTools] = useState(false);
    const [seconds, setSeconds] = React.useState(0);
    const [activeTab, setActiveTab] = React.useState('Session'); 
    const [showTrustMsg, setShowTrustMsg] = React.useState(false);
    const [isPremium, setIsPremium] = useState<boolean>(false);
    const [loadingPremium, setLoadingPremium] = useState<boolean>(true);
    const [brandData, setBrandData] = useState<any>(null);
    const [activities, setActivities] = React.useState([{ 
        id: Date.now(), 
        text: "System Ready", 
        icon: "✨", 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
    }]);
    const [showUserMenu, setShowUserMenu] = React.useState(false);
    const username = "User";
    const [disabled, setDisabled] = React.useState(false);
    console.log("🧭 activeTab:", activeTab);
    console.log("👑 isPremium:", isPremium);
    console.log("⏳ loadingPremium:", loadingPremium);
    
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
    useEffect(() => {
        window.onerror = function(message, source, lineno, colno, error) {
            console.error("🌍 GLOBAL ERROR CAUGHT:");
            console.error(message);
            console.error(error);
        };

        return () => {
            window.onerror = null;
        };
    }, []);
    const [history, setHistory] = useState<any[]>([]);
    
    console.log("🏷️ userBrand:", userBrand);
    console.log("📚 history length:", history?.length);
    
    
    const handleSaveSimulation = (data: any) => {
        setHistory(prev => [data, ...prev]);
    };
    useEffect(() => {
        console.log("🚀 Premium useEffect STARTED");

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {

            console.log("👤 Auth state changed");
            console.log("👤 Current user:", currentUser);

            if (!currentUser) {
                console.log("❌ No current user");

                setIsPremium(false);
                setLoadingPremium(false);

                return;
            }

            try {

                console.log("🌐 navigator.onLine:", navigator.onLine);

                if (!navigator.onLine) {
                    console.warn("⚠️ User offline");

                    setLoadingPremium(false);
                    return;
                }

                console.log("📡 Fetching firestore document...");

                const userRef = doc(firestore, "users", currentUser.uid);

                console.log("📄 userRef:", userRef);

                const userSnap = await getDoc(userRef);

                console.log("📥 Firestore response received");

                if (userSnap.exists()) {

                    console.log("✅ User document exists");

                    const data = userSnap.data();

                    console.log("📦 Firestore data:", data);

                    setIsPremium(data?.premium === true);

                } else {

                    console.log("❌ User document does not exist");

                    setIsPremium(false);
                }

            } catch (err) {

                console.error("💥 PREMIUM CHECK CRASH:");
                console.error(err);

                setIsPremium(false);

            } finally {

                console.log("🏁 Premium loading finished");

                setLoadingPremium(false);
            }
        });

        return () => {
            console.log("🧹 Premium useEffect cleanup");
            unsubscribe();
        };

    }, []);
    const addActivity = (text: string, icon: string = "✨") => {
        const newEntry = {
            id: Date.now(),
            text,
            icon,
            time: new Date().toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
            })
        };

        setActivities(prev => [newEntry, ...prev]);
    };

    
    const handleUpdateBrand = (newData: Partial<typeof userBrand>) => {
        setUserBrand(prev => ({
            ...prev,
            ...newData
        }));
    };

        
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
    const handleLogout = async () => {
        try {
            await signOut(auth);
            // App.jsx will automatically see the user is null and show the login screen
            console.log("User signed out successfully");
        } catch (error) {
            console.error("Error signing out: ", error);
        }
    };
      
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
    

    // Add this inside Malvinui to auto-persist the memories
    useEffect(() => {
        const saved = localStorage.getItem('malvin_history');
        if (saved) setHistory(JSON.parse(saved));
    }, []);

    useEffect(() => {
        localStorage.setItem('malvin_history', JSON.stringify(history));
    }, [history]);

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
    
    if (!userBrand) {
        return (
            <div style={{ 
                height: '100vh', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                backgroundColor: '#000', 
                color: '#bf00ff',
                fontFamily: 'sans-serif' 
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div className="spinner" style={{ marginBottom: '10px' }}>⚡</div>
                    <p>Initializing Malvin...</p>
                </div>
            </div>
        );
    }
    if (loadingPremium) {
        return (
            <div style={{ color: "white", padding: 20 }}>
                Checking premium status...
            </div>
        );
    }
    console.log("🎨 MAIN RENDER");
    console.log("🧭 Current activeTab:", activeTab);
    return (
        <>
            {/* CASE A: FULL SCREEN MEMORIES TAKEOVER */}
            {activeTab === 'Settings' ? (
                <Settings 
                    auth={auth}
                    userBrand={userBrand} 
                    setUserBrand={setUserBrand} 
                    onBack={() => setActiveTab('Session')} // Goes back to main view 
                    onUpdate={handleUpdateBrand}
                    onSave={(updatedBrand: React.SetStateAction<{ id: string; name: string; context: string; profilePic: null; currency: string; language: string; tier: string; status: string; }>) => {
                        setUserBrand(updatedBrand);
                        setBrandData(updatedBrand); // If you still use brandData elsewhere
                        setActiveTab('Session');
                    }}
                />
            ) : activeTab === 'Memories' ? (
                <Memories 
                    onBack={() => setActiveTab('Session')}
                    data={history}
                />
            ) : activeTab === 'Calculator' ? (
                <MarginCalculator onBack={() => setActiveTab('Session')} />
            ) : activeTab === 'Premium' ? (
                <Premium onBack={() => setActiveTab('Session')}
                />
            ) : activeTab === 'MainDashboard' ? (
                <MainDashboard onBack={() => setActiveTab('Session')} 
                    userBrand={userBrand}
                    brandName={userBrand.name}
                />
            ) : activeTab === 'Trends' ? (
                <MarketTrends 
                    userBrand={userBrand}
                    brandName={userBrand.name}
                    onBack={() => setActiveTab('Session')} 
                    
                />
            ) : activeTab === 'Runway' ? (
                <Runway
                    userBrand={userBrand}
                    onBack={() => setActiveTab('Session')} 
                />
            ) : activeTab === 'Simulator' ? (
                <Simulator 
                    onBack={() => setActiveTab('Session')} 
                    onSave={handleSaveSimulation}
                    brandName={userBrand.name}
                />
            ) : (
                <div className="main-full-ui" style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: "black" }}> 
                    <GlobalStyles />
                    <div className="background-blobs">
                        <div className="blob purple"></div>
                        <div className="blob blue"></div>
                        <div className="blob pink"></div>
                    </div>
                    {showTools && (
                        <div 
                            onClick={() => setShowTools(false)} // Close when clicking outside
                            style={{
                                position: 'absolute',
                                inset: 0,
                                zIndex: 100,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: 'rgba(0,0,0,0.2)' // Dim the background slightly
                            }}
                        >
                            {/* THE GLASS CONTAINER */}
                            <div 
                                onClick={(e) => e.stopPropagation()} 
                                style={{
                                    width: '280px',
                                    padding: '24px',
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    backdropFilter: 'blur(30px)',
                                    WebkitBackdropFilter: 'blur(30px)',
                                    borderRadius: '38px', // More rounded for that Apple feel
                                    border: '1px solid rgba(255, 255, 255, 0.15)',
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(3, 1fr)', 
                                    gap: '20px',
                                    boxShadow: '0 30px 60px rgba(0,0,0,0.5)',
                                }}
                            >
                                {/* SIMULATIONS APP ICON */}
                                <div 
                                    onClick={() => {
                                        setActiveTab('Simulator');
                                        setShowTools(false);
                                        addActivity("Launched Simulator", "🎮");
                                    }}
                                    style={{ 
                                        display: 'flex', 
                                        flexDirection: 'column', 
                                        alignItems: 'center', 
                                        cursor: 'pointer',
                                        transition: 'transform 0.2s cubic-bezier(0.2, 0, 0.2, 1)' 
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    <div style={{
                                        width: '60px',
                                        height: '60px',
                                        margin: '0 auto 8px',
                                        background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                                        borderRadius: '14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 10px 20px rgba(168, 85, 247, 0.3)'
                                    }}>
                                        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                                        </svg>
                                    </div>
                                    <span style={{ fontSize: '11px', fontWeight: '500', color: 'white' }}>
                                        Simulate
                                    </span>
                                </div>
                                
                                {/* 1. CALCULATOR: UNIT ECONOMICS */}
                                <div 
                                    onClick={() => { setActiveTab('Calculator'); setShowTools(false); addActivity("Opened Margin Calc", "🧮"); }}
                                    style={appIconStyle}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    <div style={{ ...iconBackground, background: 'linear-gradient(135deg, #f59e0b, #ef4444)' }}>
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                            <rect x="4" y="2" width="16" height="20" rx="2" />
                                            <line x1="8" y1="6" x2="16" y2="6" /><line x1="8" y1="10" x2="16" y2="10" />
                                            <path d="M8 14h2m4 0h2m-6 4h2m4 0h2" />
                                        </svg>
                                    </div>
                                    <span style={iconLabelStyle}>Margins</span>
                                </div>

                                {/* 2. TRENDS: MARKET PULSE */}
                                <div 
                                    onClick={() => { setActiveTab('Trends'); setShowTools(false); addActivity("Checked Trends", "📈"); }}
                                    style={appIconStyle}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    <div style={{ ...iconBackground, background: 'linear-gradient(135deg, #10b981, #3b82f6)' }}>
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                            <path d="M23 6l-9.5 9.5-5-5L1 18" /><polyline points="17 6 23 6 23 12" />
                                        </svg>
                                    </div>
                                    <span style={iconLabelStyle}>Trends</span>
                                </div>

                                {/* 3. CASHFLOW: BURN SENTRY */}
                                <div 
                                    onClick={() => { setActiveTab('Runway'); setShowTools(false); addActivity("Audited Cashflow", "🔥"); }}
                                    style={appIconStyle}
                                    onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                                    onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    <div style={{ ...iconBackground, background: 'linear-gradient(135deg, #ec4899, #8b5cf6)' }}>
                                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                                        </svg>
                                    </div>
                                    <span style={iconLabelStyle}>Runway</span>
                                </div>

                                {/* Placeholder for more apps */}
                                <div style={{ opacity: 0.3 }}>
                                    <div style={{ width: '60px', height: '60px', margin: '0 auto 8px', background: 'rgba(255,255,255,0.1)', borderRadius: '14px' }} />
                                    <span style={{ fontSize: '11px' }}>Coming...</span>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* 1. LEFT */}
                    <div className="left-section" style={{ flex: 1, display: 'flex', borderRight: '1px solid #222', padding: '20px', gap: '10px', flexDirection: 'column'}}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                overflow: 'hidden',
                                border: '1.5px solid #bf00ff', // That Neon Purple "Manly" Ring
                                flexShrink: 0,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: 'rgba(255, 255, 255, 0.05)'
                            }}>
                                <img 
                                    src="/Malvin self.png" 
                                    alt="Malvin AI"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                />
                            </div>
                            
                            <span style={{ 
                                color: 'white', 
                                fontWeight: '800', 
                                letterSpacing: '2px', 
                                fontSize: '18px',
                                fontFamily: 'sans-serif' // Or your custom font
                            }}>
                                MALVIN
                            </span>
                        </div>
                        <div className="left top panel" style={{ width: '200px',flex: 1, gap: '10px',
                                borderRight: '1px solid rgba(255, 255, 255, 0.1)', // Subtle white line
                                padding: '20px',
                                display: 'flex',
                                flexDirection: 'column',

                                /* --- THE GLASS LOOK --- */
                                backgroundColor: 'rgba(255, 255, 255, 0.03)',   // 1. Semi-transparent white
                                backdropFilter: 'blur(12px)',                  // 2. The "Frosted" blur
                                WebkitBackdropFilter: 'blur(12px)',
                                borderRadius: '16px', // Smooth corners
                                border: '1px solid rgba(255, 255, 255, 0.1)'
                            }}>
                            {/*<Sidebar activeTab={activeTab} setActiveTab={setActiveTab} setShowTools={setShowTools} addActivity={addActivity} userBrand={userBrand} isPremium={isPremium} />*/}
                            <div style={{ color: "white" }}>
                              Sidebar disabled for testing
                            </div>
                        </div>
                            {/* button left section */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }} >
                            <div className="left buttom-panel" style={{ 
                                    borderRight: '1px solid rgba(255, 255, 255, 0.1)', // Subtle white line
                                    padding: '20px',
                                    flexDirection: 'column',
                                    display: 'flex',

                                    /* --- THE GLASS LOOK --- */
                                    backgroundColor: 'rgba(255, 255, 255, 0.03)',   // 1. Semi-transparent white
                                    backdropFilter: 'blur(12px)',                  // 2. The "Frosted" blur
                                    WebkitBackdropFilter: 'blur(12px)',
                                    borderRadius: '16px', // Smooth corners
                                    border: '1px solid rgba(255, 255, 255, 0.1)'
                                }}>
                                {/* THE CIRCLE WRAPPER */}
                                <div style={{
                                    width: '45px',
                                    height: '45px',
                                    borderRadius: '50%',
                                    overflow: 'hidden', // Ensures the image stays a circle
                                    border: '1.5px solid #bf00ff', // Optional: Neon Purple Ring
                                    flexShrink: 0, // Prevents the circle from squashing
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)'
                                }}>
                                    <img 
                                        src="/Malvin self.png" 
                                        alt="Malvin AI"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                                    />
                                </div>
                                <p style={{ color: 'white', margin: 0, fontWeight: '600' }}>Malvin AI</p>
                                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', margin: '5px 0 0 0' }}>Your intelligent collaborator partner</p>
                                    
                            </div>
                            {/* --- THE USER PANEL SECTION --- */}
                            <div style={{ position: 'relative', width: '100%', marginTop: 'auto' }}>

                                {/* 🚪 LOGOUT POPUP MENU */}
                                {showUserMenu && (
                                    <div style={{
                                        position: 'absolute',
                                        bottom: '100%', 
                                        left: '0',
                                        right: '0',
                                        marginBottom: '10px',
                                        backgroundColor: 'rgba(15, 15, 15, 0.95)',
                                        backdropFilter: 'blur(20px)',
                                        borderRadius: '12px',
                                        padding: '8px',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                                        zIndex: 100
                                    }}>
                                        <button 
                                            onClick={handleLogout} // 👈 TRIGGERS FIREBASE SIGNOUT
                                            style={{
                                                width: '100%',
                                                padding: '12px',
                                                backgroundColor: 'rgba(255, 59, 48, 0.15)',
                                                border: '1px solid rgba(255, 59, 48, 0.3)',
                                                borderRadius: '8px',
                                                color: '#ff3b30',
                                                fontSize: '11px',
                                                fontWeight: '800',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '10px'
                                            }}
                                        >
                                            LOG OUT
                                        </button>
                                    </div>
                                )}

                                {/* 👤 THE USER PANEL TRIGGER */}
                                <div 
                                    className="left-user-panel" 
                                    onClick={() => setShowUserMenu(!showUserMenu)}
                                    style={{ 
                                        padding: '15px 20px',
                                        flexDirection: 'column', 
                                        display: 'flex',
                                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                        backdropFilter: 'blur(12px)',
                                        borderRadius: '16px',
                                        border: showUserMenu ? '1px solid #bf00ff' : '1px solid rgba(255, 255, 255, 0.1)',
                                        cursor: 'pointer',
                                        transition: 'all 0.3s ease'
                                    }}
                                > 
                                    <div style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>
                                        {userEmail?.split('@')[0] || "Guest User"} 
                                    </div>
                                    <div style={{ color: 'white', fontSize: '11px', opacity: 0.4, marginTop: '4px' }}>
                                        {userEmail}
                                    </div>
                                </div> 
                            </div>     
                        </div>
                        
                    </div>
                    {/* 2. MIDDLE */}
                    <div className="middle-section" style={{ flex: 4, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '40px' }}>
                        <AuraBackground />
                        {/* --- TOP RIGHT SECURITY & MENU --- */}
                        <div style={{ 
                            position: 'absolute', 
                            top: '25px', 
                            right: '20px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '10px',
                            zIndex: 100 
                        }}>
                            {/* TRUST SHIELD */}
                            <div style={{ position: 'relative' }}>
                                <div 
                                    onClick={() => setShowTrustMsg(!showTrustMsg)}
                                    style={{ 
                                        cursor: 'pointer', 
                                        color: showTrustMsg ? '#4ade80' : 'rgba(255, 255, 255, 0.4)',
                                        transition: 'all 0.3s ease',
                                        filter: showTrustMsg ? 'drop-shadow(0 0 8px rgba(74, 222, 128, 0.4))' : 'none'
                                    }}
                                >
                                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                                        <path d="m9 12 2 2 4-4"/>
                                    </svg>
                                </div>

                                {/* POPUP MESSAGE */}
                                {showTrustMsg && (
                                    <div style={{
                                        position: 'absolute',
                                        top: '40px',
                                        right: '0',
                                        width: '280px',
                                        backgroundColor: 'rgba(15, 15, 20, 0.95)',
                                        backdropFilter: 'blur(15px)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '16px',
                                        padding: '20px',
                                        zIndex: 101,
                                        animation: 'fadeIn 0.2s ease-out'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#4ade80' }}></div>
                                            <span style={{ color: 'white', fontWeight: 'bold', fontSize: '13px' }}>Secure Session</span>
                                        </div>
                                        <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6' }}>
                                            All conversations are end-to-end encrypted. No Malvin personnel will ever ask for your login info.
                                        </p>
                                        <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: '12px' }}></div>
                                        <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                                            Support: 
                                            <a 
                                                href="mailto:malvinsupportteam@gmail.com" 
                                                style={{ 
                                                    color: '#bf00ff', 
                                                    textDecoration: 'none', 
                                                    marginLeft: '5px',
                                                    fontWeight: 'bold',
                                                    transition: 'opacity 0.2s'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                                                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                                            >
                                                malvinsupportteam@gmail.com
                                            </a>
                                        </p>
                                        
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="status-pill-container" style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'space-between', width: '100%', paddingBottom: '20px', alignSelf: 'stretch'}}>
                            <div className="status-pill" style={{ marginTop: '-18px', marginLeft: '-12px' }}>
                                <span className="live-dot"></span>
                                <span className="status-text">LIVE SESSION</span>
                                <span className="status-timer">{formatTime()}</span>
                            </div>
                        </div>
                        <div style={{ display: 'flex', position: 'absolute', bottom: '90px', left: '50%', transform: 'translateX(-50%)', alignItems: 'center', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '850px', zIndex: 10 }}>
                            {activeTab === 'Notes' ? (
                                <Notes userEmail={userEmail} addActivity={addActivity}/>
                            ) : (
                                (() => {
                                    try {
                                        console.log("🟢 Rendering Face");
                                        return <Face />;
                                    } catch (err) {
                                        console.error("💥 FACE COMPONENT CRASHED", err);
                                        return <div style={{color:"red"}}>Face crashed</div>;
                                    }
                                })()
                            )}
                        </div>
                    </div>
                    {/* 3. RIGHT */}
                    <div className="Right-section" style={{ flex: 1, borderRight: '1px solid #222', padding: '20px', gap: '10px', display: 'flex', flexDirection: 'column'}}>
                        <ActivityPanel activities={activities} />    
                    </div>
                </div>
            )}
        </>    
    );
};

export default Malvinui;


                            


