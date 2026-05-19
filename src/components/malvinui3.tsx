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
        <left/>
        <middle/>
        {/* 3. RIGHT */}
        <div className="Right-section" style={{ flex: 1, borderRight: '1px solid #222', padding: '20px', gap: '10px', display: 'flex', flexDirection: 'column'}}>
            <ActivityPanel activities={activities} />    
        </div>
    );
};

export default Malvinui;


                            


