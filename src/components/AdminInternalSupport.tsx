import React, { useState, useEffect, useRef } from 'react';
import { collection, query, onSnapshot, orderBy, addDoc, serverTimestamp, doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { firestore, storage, auth } from "../firebase"; 

interface AdminInternalSupportProps {
    adminChatId: string; // A unique document ID dedicated to this specific admin channel
    onClose: () => void;
}

const AdminInternalSupport = ({ adminChatId, onClose }: AdminInternalSupportProps) => {
    const [messages, setMessages] = useState<any[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [uploading, setUploading] = useState(false);
    const feedRef = useRef<HTMLDivElement>(null);

    // 1. Listen to internal admin messages safely
    useEffect(() => {
        if (!adminChatId) return;

        const q = query(
            collection(firestore, "conversations", adminChatId, "messages"),
            orderBy("timestamp", "asc")
        );

        // 🌟 FIX: Added { includeMetadataChanges: true } and fallback dates 
        // to prevent UI breaks when serverTimestamp() is computing.
        const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
            const msgs = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    // Safe evaluation: if Firestore hasn't returned the true timestamp yet, 
                    // use local client clock so order doesn't break.
                    timestamp: data.timestamp ? data.timestamp.toDate() : new Date()
                };
            });
            setMessages(msgs);
        }, (error) => {
            console.error("Internal Admin chat listener error: ", error);
        });

        // Mark as read when opened
        setDoc(doc(firestore, "conversations", adminChatId), { unread: false }, { merge: true })
            .catch(err => console.error("Could not update read status:", err));

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
            await addDoc(
                collection(firestore, "conversations", adminChatId, "messages"),
                {
                    text,
                    senderRole: "admin",
                    senderId: auth.currentUser?.uid || "admin",
                    senderName: auth.currentUser?.displayName || "Admin",
                    timestamp: serverTimestamp()
                }
            );
            await setDoc(doc(firestore, "conversations", adminChatId), {
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
            const storageRef = ref(storage, `admin_verifications/${adminChatId}/${Date.now()}_${file.name}`);
            const snapshot = await uploadBytes(storageRef, file);
            const downloadUrl = await getDownloadURL(snapshot.ref);

            await addDoc(collection(firestore, "conversations", adminChatId, "messages"), {
                text: `Sent a file: ${file.name}`,
                fileUrl: downloadUrl,
                fileName: file.name,
                type: 'file',
                senderRole: "admin",
                senderId: auth.currentUser?.uid || "admin",
                senderName: auth.currentUser?.displayName || "Admin",
                timestamp: serverTimestamp()
            });

            await setDoc(doc(firestore, "conversations", adminChatId), {
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
                        alignSelf: msg.senderId === auth.currentUser?.uid ? 'flex-end' : 'flex-start',
                        background: msg.senderId === auth.currentUser?.uid ? '#1c1c1e' : '#ffd700',
                        color: msg.senderId === auth.currentUser?.uid ? '#fff' : '#000', 
                        border: msg.senderId === auth.currentUser?.uid ? '1px solid #262626' : 'none',
                        padding: '10px 16px',
                        borderRadius: '20px',
                        maxWidth: '65%',
                        fontSize: '14px'
                    }}>
                        <div style={{
                            fontSize: '10px',
                            opacity: 0.6,
                            marginBottom: '4px'
                        }}>
                            {msg.senderName || msg.senderEmail}
                        </div>
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