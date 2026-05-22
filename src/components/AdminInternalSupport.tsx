import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { firestore, storage } from "../firebase"; // Ensure your storage instance is imported

interface AdminInternalSupportProps {
    adminChatId: string; // A unique document ID dedicated to this specific admin channel
    onClose: () => void;
}

const AdminInternalSupport = ({ adminChatId, onClose }: AdminInternalSupportProps) => {
    const [messages, setMessages] = useState<any[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [uploading, setUploading] = useState(false);
    const feedRef = useRef<HTMLDivElement>(null);

    // 1. Listen to internal admin messages
    useEffect(() => {
        if (!adminChatId) return;

        const q = query(
            collection(firestore, "admin_support", adminChatId, "messages"),
            orderBy("timestamp", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setMessages(msgs);
        });

        // Mark as read when opened
        setDoc(doc(firestore, "admin_support", adminChatId), { unread: false }, { merge: true });

        return () => unsubscribe();
    }, [adminChatId]);

    // 2. Auto-scroll
    useEffect(() => {
        if (feedRef.current) {
            feedRef.current.scrollTop = feedRef.current.scrollHeight;
        }
    }, [messages]);

    // 3. Send Text Message
    const handleSendText = async (text: string) => {
        if (!text.trim()) return;
        try {
            await addDoc(collection(firestore, "admin_support", adminChatId, "messages"), {
                text: text,
                type: 'text',
                sender: 'current_admin',
                timestamp: serverTimestamp()
            });

            await setDoc(doc(firestore, "admin_support", adminChatId), {
                lastMessage: text,
                updatedAt: serverTimestamp(),
                unread: true // Alerts other admins
            }, { merge: true });

            setInputValue('');
        } catch (e) {
            console.error("Failed to send internal text:", e);
        }
    };

    // 4. Handle File Upload (Verification Documents)
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !adminChatId) return;

        setUploading(true);
        try {
            // Path structure for verification files
            const storageRef = ref(storage, `admin_verifications/${adminChatId}/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadUrl = await getDownloadURL(snapshot.ref);

            // Add file message attachment payload to firestore
            await addDoc(collection(firestore, "admin_support", adminChatId, "messages"), {
                text: `Sent a file: ${file.name}`,
                fileUrl: downloadUrl,
                fileName: file.name,
                type: 'file',
                sender: 'current_admin',
                timestamp: serverTimestamp()
            });

            await setDoc(doc(firestore, "admin_support", adminChatId), {
                lastMessage: `📎 Attached File: ${file.name}`,
                updatedAt: serverTimestamp(),
                unread: true
            }, { merge: true });

        } catch (error) {
            console.error("File upload failed:", error);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#050505' }}>
            {/* Header */}
            <div style={{ padding: '0 24px', height: '75px', borderBottom: '1px solid #1c1c1e', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                    <div style={{ fontWeight: 600, fontSize: '15px', color: '#ffd700' }}>⚠️ ADMIN_INTERNAL_VERIFICATION</div>
                    <div style={{ fontSize: '11px', color: '#a8a8a8' }}>Secure channel for administrative coordination</div>
                </div>
                <button onClick={onClose} style={{ background: '#262626', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>Close</button>
            </div>

            {/* Message Feed */}
            <div ref={feedRef} style={{ flex: 1, padding: '24px 30px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {messages.map((msg) => (
                    <div key={msg.id} style={{
                        alignSelf: msg.sender === 'current_admin' ? 'flex-end' : 'flex-start',
                        background: msg.sender === 'current_admin' ? '#1c1c1e' : '#ffd700',
                        color: msg.sender === 'current_admin' ? '#fff' : '#000',
                        padding: '10px 16px',
                        borderRadius: '20px',
                        maxWidth: '65%',
                        fontSize: '14px',
                        border: msg.sender === 'current_admin' ? '1px solid #262626' : 'none'
                    }}>
                        {msg.type === 'file' ? (
                            <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: msg.sender === 'current_admin' ? '#38d777' : '#000', fontWeight: 'bold', textDecoration: 'underline' }}>
                                📎 {msg.fileName} (Click to View File)
                            </a>
                        ) : (
                            msg.text
                        )}
                    </div>
                ))}
            </div>

            {/* Footer Input Controls */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #1c1c1e', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <label style={{ background: '#262626', padding: '10px 14px', borderRadius: '24px', cursor: 'pointer', fontSize: '14px' }}>
                    {uploading ? '...' : '📎 Upload'}
                    <input type="file" onChange={handleFileUpload} disabled={uploading} style={{ display: 'none' }} />
                </label>
                <div style={{ display: 'flex', flex: 1, border: '1px solid #262626', borderRadius: '24px', padding: '4px 6px 4px 18px', background: '#000' }}>
                    <input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendText(inputValue)}
                        placeholder="Type internal secure update..."
                        style={{ flex: 1, background: 'transparent', border: 'none', color: '#fff', padding: '10px 0', fontSize: '14px', outline: 'none' }}
                    />
                    <button onClick={() => handleSendText(inputValue)} disabled={!inputValue.trim()} style={{ background: 'transparent', color: inputValue.trim() ? '#ffd700' : '#4d3d00', border: 'none', fontWeight: 700, padding: '0 12px', cursor: 'pointer' }}>
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminInternalSupport;