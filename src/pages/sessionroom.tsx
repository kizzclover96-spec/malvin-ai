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

  // Function stubs for the actions
  const openCamera = () => alert("Camera sequence initialized...");
  const openFiles = () => alert("Accessing local files...");
  const startScreenShare = () => alert("Initializing screen broadcast...");

  return (
    <div style={{
      width: '100vw', height: '100vh',
      backgroundColor: '#ffffff', // Clean white background
      display: 'flex', flexDirection: 'column',
      fontFamily: 'sans-serif', position: 'relative', overflow: 'hidden'
    }}>

      {/* --- HEADER SECTION --- */}
      <div style={{
        padding: '20px 30px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        zIndex: 100
      }}>
        {/* Dropdown Toggle */}
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          style={{ background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <Menu size={28} color="#00f2ff" />
        </button>

        {/* Profile Icon */}
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          backgroundColor: '#f0f0f0', border: '1px solid #ddd',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <User size={20} color="#666" />
        </div>
      </div>

      {/* --- SIDE DROPDOWN MENU --- */}
      <div style={{
        position: 'absolute', top: 0, left: isMenuOpen ? 0 : '-300px',
        width: '280px', height: '100%', backgroundColor: '#fff',
        boxShadow: '2px 0 10px rgba(0,0,0,0.1)', zIndex: 200,
        transition: 'left 0.3s ease', padding: '80px 20px'
      }}>
        <h3 style={{ color: '#00f2ff', letterSpacing: '2px' }}>HISTORY</h3>
        <p style={{ color: '#999', fontSize: '0.8rem' }}>No recent sessions found.</p>
        <button 
          onClick={() => setIsMenuOpen(false)}
          style={{ marginTop: '20px', color: '#666', cursor: 'pointer', border: 'none', background: 'none' }}
        >
          Close Menu
        </button>
      </div>

      {/* --- MAIN CHAT DISPLAY AREA --- */}
      <div style={{ flex: 1, padding: '20px', textAlign: 'center', color: '#ccc' }}>
        {/* Messages would render here */}
        <p style={{ marginTop: '20%' }}>Start a new session with Malvin</p>
      </div>

      {/* --- FOOTER / CAPSULE SECTION --- */}
      <div style={{
        padding: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px'
      }}>
        
        {/* Main Capsule */}
        <div style={{
          display: 'flex', alignItems: 'center',
          backgroundColor: '#f5f5f5', borderRadius: '40px',
          padding: '8px 15px', width: '80%', maxWidth: '600px',
          border: '1px solid #eee', boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
        }}>
          
          {/* Plus Circle & Extras */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button 
              onClick={() => setShowExtras(!showExtras)}
              style={{
                width: '35px', height: '35px', borderRadius: '50%',
                backgroundColor: '#e0e0e0', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'transform 0.3s ease'
              }}
            >
              <Plus size={20} color="#00f2ff" style={{ transform: showExtras ? 'rotate(45deg)' : 'rotate(0deg)' }} />
            </button>

            {/* Extra Tools (Conditional Rendering) */}
            {showExtras && (
              <div style={{ display: 'flex', gap: '8px', animation: 'fadeIn 0.3s forwards' }}>
                <button onClick={openCamera} style={extraButtonStyle}><Camera size={16} color="#00f2ff" /></button>
                <button onClick={openFiles} style={extraButtonStyle}><Paperclip size={16} color="#00f2ff" /></button>
                <button onClick={startScreenShare} style={extraButtonStyle}><MonitorUp size={16} color="#00f2ff" /></button>
              </div>
            )}
          </div>

          {/* Text Input */}
          <input 
            type="text"
            placeholder="Ask Malvin anything..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            style={{
              flex: 1, border: 'none', background: 'none',
              padding: '10px 15px', outline: 'none', fontSize: '1rem', color: '#333'
            }}
          />
          
          {input && <Send size={20} color="#00f2ff" style={{ cursor: 'pointer' }} />}
        </div>

        {/* Mic Circle */}
        <button 
          onClick={() => setIsMicOn(!isMicOn)}
          style={{
            width: '50px', height: '50px', borderRadius: '50%',
            backgroundColor: '#00f2ff', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: isMicOn ? '0 0 15px rgba(0, 242, 255, 0.5)' : 'none',
            transition: 'all 0.2s ease'
          }}
        >
          {isMicOn ? <Mic size={24} color="#f0f0f0" /> : <MicOff size={24} color="#f0f0f0" />}
        </button>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateX(-10px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

// Reusable style for the small circles
const extraButtonStyle = {
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  backgroundColor: '#e0e0e0',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
};