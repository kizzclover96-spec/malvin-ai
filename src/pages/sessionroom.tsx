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

  // 1. Lock the screen to prevent any scrolling
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => { 
      document.body.style.overflow = 'unset'; 
      document.documentElement.style.overflow = 'unset';
    };
  }, []);

  const floatingCircleStyle = (delay, leftPos) => ({
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
    bottom: '75px', // Floats clearly above
    left: leftPos,
    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    animation: `popIn 0.3s ${delay}s both`,
    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
    zIndex: 20
  });

  return (
    <div style={{
      width: '100vw', 
      height: '100vh',
      backgroundColor: '#ffffff',
      display: 'flex', 
      flexDirection: 'column',
      fontFamily: 'sans-serif', 
      position: 'fixed', // Locks to viewport
      top: 0,
      left: 0,
      overflow: 'hidden'
    }}>
      
      {/* --- HEADER --- */}
      <div style={{ padding: '20px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <Menu size={32} color="#00f2ff" />
        </button>
        <div style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: '#f0f0f0', border: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <User size={24} color="#666" />
        </div>
      </div>

      {/* --- CHAT AREA --- */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', overflow: 'hidden' }}>
        <p>Malvin is listening...</p>
      </div>

      {/* --- CONTROLS SECTION --- */}
      <div style={{
        padding: '20px',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '15px',
        width: '100%',
        boxSizing: 'border-box',
        flexShrink: 0 // Prevents footer from squishing
      }}>
        
        {/* THE CAPSULE */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          borderRadius: '50px',
          padding: '10px 15px',
          width: '70%', // Balanced width
          maxWidth: '600px',
          minWidth: '300px',
          border: '2px solid #eee', 
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
          position: 'relative',
          boxSizing: 'border-box'
        }}>
          
          {/* PLUS & EXTRAS */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <button 
              onClick={() => setShowExtras(!showExtras)}
              style={{
                width: '45px', height: '45px', borderRadius: '50%',
                backgroundColor: '#e0e0e0', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 30
              }}
            >
              <Plus size={28} color="#00f2ff" strokeWidth={4} style={{ 
                transform: showExtras ? 'rotate(45deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s ease'
              }} />
            </button>

            {showExtras && (
              <>
                <button onClick={() => alert('Camera')} style={floatingCircleStyle(0, '-10px')}>
                  <Camera size={26} color="#00f2ff" strokeWidth={2.5} />
                </button>
                <button onClick={() => alert('Files')} style={floatingCircleStyle(0.05, '50px')}>
                  <Paperclip size={26} color="#00f2ff" strokeWidth={2.5} />
                </button>
                <button onClick={() => alert('Screen')} style={floatingCircleStyle(0.1, '110px')}>
                  <MonitorUp size={26} color="#00f2ff" strokeWidth={2.5} />
                </button>
              </>
            )}
          </div>

          {/* TEXT INPUT - Fixed Overflow */}
          <input 
            type="text"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{
              flex: 1, 
              border: 'none', 
              background: 'none',
              padding: '0 15px', 
              outline: 'none', 
              fontSize: '1rem',
              color: '#000000',
              minWidth: '0', // ESSENTIAL: Allows input to shrink/wrap inside flexbox
              width: '100%'
            }}
          />

          {input && (
             <div style={{ flexShrink: 0, paddingRight: '5px' }}>
               <Send size={26} color="#00f2ff" style={{ cursor: 'pointer' }} />
             </div>
          )}
        </div>

        {/* MIC CIRCLE */}
        <button 
          onClick={() => setIsMicOn(!isMicOn)}
          style={{
            width: '60px', height: '60px', borderRadius: '50%',
            backgroundColor: '#00f2ff', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(0, 242, 255, 0.3)',
            flexShrink: 0
          }}
        >
          {isMicOn ? (
            <Mic size={32} color="#f0f0f0" strokeWidth={2.5} /> 
          ) : (
            <MicOff size={32} color="#f0f0f0" strokeWidth={2.5} />
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