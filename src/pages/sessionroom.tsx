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
  const [isSleeping, setIsSleeping] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSleeping(true);
    }, 120000); 
    return () => clearTimeout(timer);
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
    bottom: '70px', 
    left: leftPos,
    transition: 'all 0.3s ease',
    animation: `popIn 0.3s ${delay}s both`,
    boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
    zIndex: 50
  });

  return (
    <div style={{
      width: '100vw', height: '100vh',
      backgroundColor: '#ffffff',
      display: 'flex', flexDirection: 'column',
      position: 'fixed', top: 0, left: 0, overflow: 'hidden'
    }}>
      
      <style>{`
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.5) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes blink {
          0%, 90%, 100% { transform: scaleY(1); }
          95% { transform: scaleY(0.1); }
        }
        @keyframes floatZ {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: translateY(-50px) translateX(20px) scale(1.2); opacity: 0; }
        }
      `}</style>

      {/* --- CENTRAL AI CORE --- */}
      <div style={{
        position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center'
      }}>
        <div style={{
          width: '100px', height: '140px', backgroundColor: '#ffffff',
          border: '3px solid #eee', borderRadius: '50px',
          display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative',
          boxShadow: isSleeping ? 'none' : '0 0 20px rgba(0, 242, 255, 0.1)'
        }}>
          <div style={{ display: 'flex', gap: '15px' }}>
            <div style={{
              width: '12px', height: isSleeping ? '2px' : '12px',
              backgroundColor: '#00f2ff', borderRadius: '50%',
              transition: 'all 0.5s ease',
              animation: isSleeping ? 'none' : 'blink 4s infinite'
            }} />
            <div style={{
              width: '12px', height: isSleeping ? '2px' : '12px',
              backgroundColor: '#00f2ff', borderRadius: '50%',
              transition: 'all 0.5s ease',
              animation: isSleeping ? 'none' : 'blink 4s infinite'
            }} />
          </div>
          {isSleeping && (
            <>
              <span style={{ position: 'absolute', top: '-20px', right: '-10px', color: '#00f2ff', animation: 'floatZ 3s infinite', fontSize: '1rem' }}>Z</span>
              <span style={{ position: 'absolute', top: '-35px', right: '-25px', color: '#00f2ff', animation: 'floatZ 3s infinite 1s', fontSize: '1.2rem' }}>z</span>
            </>
          )}
        </div>
        <p style={{ marginTop: '20px', color: isSleeping ? '#ccc' : '#00f2ff', fontSize: '0.8rem', letterSpacing: '2px' }}>
          {isSleeping ? "SYSTEM_STANDBY" : "MALVIN_ACTIVE"}
        </p>
      </div>

      {/* HEADER */}
      <div style={{ padding: '20px 30px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={() => setIsMenuOpen(!isMenuOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
          <Menu size={32} color="#00f2ff" />
        </button>
        <div style={{ width: '45px', height: '45px', borderRadius: '50%', backgroundColor: '#f0f0f0', border: '1px solid #ddd', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <User size={24} color="#666" />
        </div>
      </div>

      {/* CHAT AREA */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb' }}>
        <p>Malvin is listening...</p>
      </div>

      {/* CONTROLS */}
      <div style={{
        padding: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '20px'
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', backgroundColor: '#ffffff',
          borderRadius: '50px', padding: '10px 15px', width: '600px', 
          border: '2px solid #eee', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
          position: 'relative', overflow: 'visible' 
        }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            <button 
              onClick={() => setShowExtras(!showExtras)}
              style={{
                width: '45px', height: '45px', borderRadius: '50%',
                backgroundColor: '#e0e0e0', border: '2px solid #2337C6', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
              }}
            >
              <Plus size={30} color="#00f2ff" strokeWidth={3} style={{ 
                transform: showExtras ? 'rotate(45deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s ease',
                minWidth: '30px', minHeight: '30px'
              }} />
            </button>

            {showExtras && (
              <>
                <button onClick={() => alert('Cam')} style={floatingCircleStyle(0, '-10px')}>
                   <Camera size={28} color="#2337C6" strokeWidth={2} style={{ minWidth: '28px' }} />
                </button>
                <button onClick={() => alert('File')} style={floatingCircleStyle(0.05, '45px')}>
                   <Paperclip size={28} color="#2337C6" strokeWidth={2} style={{ minWidth: '28px' }} />
                </button>
                <button onClick={() => alert('Screen')} style={floatingCircleStyle(0.1, '100px')}>
                   <MonitorUp size={28} color="#2337C6" strokeWidth={2} style={{ minWidth: '28px' }} />
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
              padding: '0 20px', outline: 'none', fontSize: '1.1rem',
              color: '#000000', width: '100%', minWidth: '0'
            }}
          />

          {input && <Send size={28} color="#2337C6" style={{ cursor: 'pointer', flexShrink: 0 }} />}
        </div>

        <button 
          onClick={() => setIsMicOn(!isMicOn)}
          style={{
            width: '65px', height: '65px', borderRadius: '50%',
            backgroundColor: '#2337C6', border: '2px solid #2337C6', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0
          }}
        >
          {isMicOn ? (
            <Mic size={34} color="#f0f0f0" strokeWidth={2.5} style={{ minWidth: '36px' }} /> 
          ) : (
            <MicOff size={34} color="#adacac" strokeWidth={2.5} style={{ minWidth: '36px' }} />
          )}
        </button>
      </div>
    </div>
  );
}