import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001'); // Connecting to your backend

const MalvinAI = () => {
    const [message, setMessage] = useState('');
    const [chatHistory, setChatHistory] = useState<{role: string, text: string}[]>([]);
    const [isActive, setIsActive] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);

    // 1. THE "EYES": Capture the Screen
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

            // Send a screenshot every 3 seconds
            const interval = setInterval(() => {
                captureAndSendFrame();
            }, 3000);

            stream.getVideoTracks()[0].onended = () => {
                clearInterval(interval);
                setIsActive(false);
            };
        } catch (err) {
            console.error("Vision failed:", err);
        }
    };

    const captureAndSendFrame = () => {
        if (!videoRef.current) return;
        
        const canvas = document.createElement("canvas");
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
        if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
            const base64Image = canvas.toDataURL("image/jpeg", 0.5).split(',')[1];
            
            // Only send if the user is currently asking something
            // or send periodically for "Live Feedback"
            socket.emit('screen-stream', { image: base64Image, text: "Analyze this screen and wait for my command." });
        }
    };

    // 2. THE "MOUTH": Listen for AI replies
    useEffect(() => {
        socket.on('ai-reply', (data) => {
            setChatHistory(prev => [...prev, { role: 'malvin', text: data.text }]);
        });

        socket.on('ai-action', (action) => {
            console.log("AI wants to execute action:", action);
            // This is where you'd trigger your 'handleManagerSend' function!
        });

        return () => {
            socket.off('ai-reply');
            socket.off('ai-action');
        };
    }, []);

    const handleSend = () => {
        if (!message.trim()) return;
        setChatHistory(prev => [...prev, { role: 'user', text: message }]);
        socket.emit('screen-stream', { text: message }); // Sending text to backend
        setMessage('');
    };

    return (
        <div style={{
            position: 'fixed', bottom: '20px', right: '20px', width: '350px', 
            background: '#000', border: '1px solid #C5FF41', borderRadius: '20px',
            display: 'flex', flexDirection: 'column', zIndex: 9999, overflow: 'hidden'
        }}>
            {/* Hidden video element for streaming */}
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

            {!isActive ? (
                <button onClick={startVision} style={{ margin: '10px', padding: '10px', background: '#C5FF41', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 700 }}>
                    Enable AI Vision
                </button>
            ) : (
                <div style={{ padding: '10px', display: 'flex', gap: '5px' }}>
                    <input 
                        value={message} 
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        placeholder="Ask Malvin..." 
                        style={{ flex: 1, background: '#111', border: '1px solid #333', color: '#fff', padding: '8px', borderRadius: '8px' }}
                    />
                    <button onClick={handleSend} style={{ background: '#C5FF41', border: 'none', padding: '8px 15px', borderRadius: '8px', fontWeight: 700 }}>SEND</button>
                </div>
            )}
        </div>
    );
};

export default MalvinAI;