import React, { useState, useEffect } from "react";
import { 
  Plus, Mic, MicOff, Camera, Paperclip, 
  MonitorUp, Menu, User, Send 
} from "lucide-react";

export default function SessionRoom() {
  const [input, setInput] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [showExtras, setShowExtras] = useState(false);

  // Prevent browser-level scrolling
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  const floatingCircleStyle = (delay) => ({
    width: '45px',
    height: '45px',
    borderRadius: '50%',
    backgroundColor: '#e0e0e0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: 'none',
    position: 'absolute',
    bottom: '70px',
    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    animation: `popIn 0.3s ${delay}s both`,
    boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
  });

  return (
    <div style={{
      width: '100vw', 
      height: '100vh',
      backgroundColor: '#ffffff',
      display: 'flex', 
      flexDirection: 'column',
      fontFamily: 'sans-serif', 
      position: 'fixed', // Fixed ensures it stays locked to the screen
      top: 0,
      left: 0,
      overflow: 'hidden' // Disables internal scrolling
    }}>
      
      {/* --- HEADER --- */}
      <div style={{ padding: '20px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <Menu size={32} color="#00f2ff" />
        </button>
        <div style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: '#f0f0f0', border: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <User size={24} color="#666" />
        </div>
      </div>

      {/* --- CHAT AREA --- */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb' }}>
        <p>Malvin is listening...</p>
      </div>

      {/* --- CONTROLS SECTION --- */}
      <div style={{
        padding: '30px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '20px',
        position: 'relative'
      }}>
        
        {/* THE CAPSULE */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          borderRadius: '50px',
          padding: '10px 20px',
          width: '65%', 
          maxWidth: '500px',
          border: '2px solid #eee', 
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
          position: 'relative'
        }}>
          
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <button 
              onClick={() => setShowExtras(!showExtras)}
              style={{
                width: '45px', height: '45px', borderRadius: '50%',
                backgroundColor: '#e0e0e0', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10
              }}
            >
              <Plus size={28} color="#00f2ff" strokeWidth={4} style={{ 
                transform: showExtras ? 'rotate(45deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s ease'
              }} />
            </button>

            {showExtras && (
              <>
                <button onClick={() => alert('Camera')} style={{ ...floatingCircleStyle(0), left: '-10px' }}>
                  <Camera size={50} color="#00f2ff" strokeWidth={2.5} />
                </button>
                <button onClick={() => alert('Files')} style={{ ...floatingCircleStyle(0.05), left: '45px' }}>
                  <Paperclip size={50} color="#00f2ff" strokeWidth={2.5} />
                </button>
                <button onClick={() => alert('Screen')} style={{ ...floatingCircleStyle(0.1), left: '100px' }}>
                  <MonitorUp size={50} color="#00f2ff" strokeWidth={2.5} />
                </button>
              </>
            )}
          </div>

          <input 
            type="text"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{
              flex: 1, border: 'none', background: 'none',
              padding: '0 20px', outline: 'none', fontSize: '1.1rem', color=#000000
            }}
          />

          {input && <Send size={26} color="#00f2ff" style={{ cursor: 'pointer' }} />}
        </div>

        {/* MIC CIRCLE */}
        <button 
          onClick={() => setIsMicOn(!isMicOn)}
          style={{
            width: '65px', height: '65px', borderRadius: '50%',
            backgroundColor: '#00f2ff', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(0, 242, 255, 0.3)'
          }}
        >
          {isMicOn ? (
            <Mic size={34} color="#f0f0f0" strokeWidth={2.5} /> 
          ) : (
            <MicOff size={34} color="#f0f0f0" strokeWidth={2.5} />
          )}
        </button>
      </div>

      <style>{`
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.5) translateY(20px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}