import React, { useState } from "react";
import { 
  Plus, Mic, MicOff, Camera, Paperclip, 
  MonitorUp, Menu, User, Send 
} from "lucide-react";

export default function SessionRoom() {
  const [input, setInput] = useState("");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [showExtras, setShowExtras] = useState(false);

  // Style for the extra floating circles
  const floatingCircleStyle = (delay) => ({
    width: '45px',
    height: '45px',
    borderRadius: '50%',
    backgroundColor: '#e0e0e0', // Whitish Grey
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    border: 'none',
    position: 'absolute',
    bottom: '70px', // Floats above the capsule
    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    animation: `popIn 0.3s ${delay}s both`,
    boxShadow: '0 4px 10px rgba(0,0,0,0.1)'
  });

  return (
    <div style={{
      width: '100vw', height: '100vh',
      backgroundColor: '#ffffff',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'sans-serif', position: 'relative'
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
          width: '65%', // Standardized length
          maxWidth: '500px',
          border: '2px solid #eee', // More visible
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
          position: 'relative'
        }}>
          
          {/* PLUS CIRCLE CONTAINER */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <button 
              onClick={() => setShowExtras(!showExtras)}
              style={{
                width: '45px',
                height: '45px',
                borderRadius: '50%',
                backgroundColor: '#e0e0e0', // Whitish grey
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10
              }}
            >
              <Plus size={24} color="#00f2ff" strokeWidth={3} style={{ 
                transform: showExtras ? 'rotate(45deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s ease'
              }} />
            </button>

            {/* FLOATING EXTRA BUTTONS */}
            {showExtras && (
              <>
                <button onClick={() => alert('Camera')} style={{ ...floatingCircleStyle(0), left: '-10px' }}>
                  <Camera size={22} color="#00f2ff" />
                </button>
                <button onClick={() => alert('Files')} style={{ ...floatingCircleStyle(0.05), left: '45px' }}>
                  <Paperclip size={22} color="#00f2ff" />
                </button>
                <button onClick={() => alert('Screen')} style={{ ...floatingCircleStyle(0.1), left: '100px' }}>
                  <MonitorUp size={22} color="#00f2ff" />
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
              padding: '0 20px', outline: 'none', fontSize: '1.1rem'
            }}
          />

          {input && <Send size={24} color="#00f2ff" style={{ cursor: 'pointer' }} />}
        </div>

        {/* MIC CIRCLE */}
        <button 
          onClick={() => setIsMicOn(!isMicOn)}
          style={{
            width: '65px', // Large circle
            height: '65px',
            borderRadius: '50%',
            backgroundColor: '#00f2ff', // Neon Blue
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 6px 20px rgba(0, 242, 255, 0.3)'
          }}
        >
          {isMicOn ? (
            <Mic size={32} color="#f0f0f0" strokeWidth={2.5} /> // 50% visibility
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