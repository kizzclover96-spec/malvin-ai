import React, { useState, useEffect, useRef } from 'react';

// Replace this with your exact Vercel URL (make sure it spells malvin or maivin exactly as deployed)
const BACKEND_API_URL = 'https://maivin-backend.vercel.app/api'; 

const MalvinAI = () => {
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState<{role: string, text: string}[]>([]);
    const [isActive, setIsActive] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const latestFrameRef = useRef<string | null>(null); // Stores the latest screenshot safely

    // 1. Capture the Screen and save the frame locally
    const startVision = async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { cursor: "always" } as any,
                audio: false
            });
            
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setIsActive(true);

            // Periodically take a screenshot and update our reference pointer
            const interval = setInterval(() => {
                captureFrame();
            }, 3000);

            stream.getVideoTracks()[0].onended = () => {
                clearInterval(interval);
                setIsActive(false);
                latestFrameRef.current = null;
            };
        } catch (err) {
            console.error("Vision failed:", err);
        }
    };

    const captureFrame = () => {
        if (!videoRef.current) return;
        
        const canvas = document.createElement("canvas");
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            // Convert to base64 and store it in our reference pointer
            const base64Image = canvas.toDataURL("image/jpeg", 0.5).split(',')[1];
            latestFrameRef.current = base64Image;
        }
    };

    // 2. Send Message + Latest Screen Frame to Vercel Backend via HTTP POST
    const handleSend = async () => {
        const textToSend = message.trim();
        if (!textToSend) return;

        // Optimistically add user message to the UI chat window
        setChatHistory(prev => [...prev, { role: 'user', text: textToSend }]);
        setMessage('');

        // Grab the most recent screenshot taken by the interval if vision is active
        const imageToSend = isActive ? latestFrameRef.current : null;

        try {
            const response = await fetch(BACKEND_API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: textToSend,
                    image: imageToSend
                })
            });

            if (!response.ok) {
                throw new Error(`Server returned code ${response.status}`);
            }

            const data = await response.json();
            
            // Add Malvin's response text to the UI layout
            setChatHistory(prev => [...prev, { role: 'malvin', text: data.text }]);

        } catch (err) {
            console.error("Failed to fetch response from Malvin:", err);
            setChatHistory(prev => [...prev, { role: 'malvin', text: "Connection error. Could not reach my brain." }]);
        }
    };

    return (
        <div style={{
            position: 'fixed', bottom: '20px', right: '20px', width: '350px', 
            background: '#000', border: '1px solid #C5FF41', borderRadius: '20px',
            display: 'flex', flexDirection: 'column', zIndex: 9999, overflow: 'hidden'
        }}>
            <video ref={videoRef} autoPlay style={{ display: 'none' }} />

            <div style={{ padding: '15px', background: '#111', color: '#C5FF41', fontWeight: 800, display: 'flex', justifyContent: 'space-between' }}>
                MALVIN NEURAL ASSISTANT
                <span style={{ fontSize: '10px' }}>{isActive ? '● VISION ON' : '○ VISION OFF'}</span>
            </div>

            <div style={{ height: '300px', overflowY: 'auto', padding: '15px', fontSize: '13px' }}>
                {chatHistory.map((chat, i) => (
                    <div key={i} style={{ marginBottom: '10px', color: chat.role === 'malvin' ? '#C5FF41' : '#fff' }}>
                        <strong>{chat.role === 'malvin' ? '🤖' : '👤'}:</strong> {chat.text}
                    </div>
                ))}
            </div>

            <div style={{ padding: '10px', display: 'flex', gap: '5px', flexDirection: 'column' }}>
                {!isActive && (
                    <button onClick={startVision} style={{ marginBottom: '5px', padding: '10px', background: '#C5FF41', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 700 }}>
                        Enable AI Vision
                    </button>
                )}
                <div style={{ display: 'flex', gap: '5px' }}>
                    <input 
                        value={message} 
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask Malvin..." 
                        style={{ flex: 1, background: '#111', border: '1px solid #333', color: '#fff', padding: '8px', borderRadius: '8px' }}
                    />
                    <button onClick={handleSend} style={{ background: '#C5FF41', border: 'none', padding: '8px 15px', borderRadius: '8px', fontWeight: 700 }}>SEND</button>
                </div>
            </div>
        </div>
    );
};

export default MalvinAI;