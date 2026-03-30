'use client'; // Required for Next.js App Router hooks

import { useState } from 'react';
import Welcomeview from '../components/welcome'; 
import Session from './session';          

export default function Page() {
    const [token, setToken] = useState<string | null>(null);
    const [isConnecting, setIsConnecting] = useState(false);
    
    // Pass this down so the Welcome badge looks legit
    const [userEmail] = useState("user@malvin.ai"); 

    const handleWakeMalvin = async () => {
        // Prevent double-fetching if the auto-trigger hits twice
        if (isConnecting || token) return;

        setIsConnecting(true);
        try {
            const response = await fetch('/api/get-participant-token');
            const data = await response.json();
            
            if (data.token) {
                setToken(data.token);
            } else {
                console.error("No token received:", data.error);
            }
        } catch (e) {
            console.error("Failed to wake Malvin:", e);
        } finally {
            setIsConnecting(false);
        }
    };

    return (
        <main style={{ backgroundColor: '#000', minHeight: '100vh' }}>
            {token ? (
                <div style={{ animation: 'fadeIn 0.8s ease-out' }}>
                    <style>{`
                        @keyframes fadeIn {
                            from { opacity: 0; transform: scale(1.05); }
                            to { opacity: 1; transform: scale(1); }
                        }
                    `}</style>
                    <Session 
                        token={token} 
                        userEmail={userEmail}
                        serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL || ''} 
                        onDisconnect={() => setToken(null)} 
                    />
                </div>
            ) : (
                <Welcomeview 
                    onWakeClick={handleWakeMalvin} 
                    isConnecting={isConnecting} 
                    userEmail={userEmail}
                />
            )}
        </main>
    );
}