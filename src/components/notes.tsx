import React, { useState, useEffect, useRef } from "react";
import { glassPanel } from "../styles/glass";
import { auth, firestore } from "../firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const btnReset = { background: 'none', border: 'none', padding: 0, cursor: 'pointer', outline: 'none' };
const smallActionStyle = {
    padding: '6px 12px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '6px',
    color: 'white',
    fontSize: '9px',
    fontWeight: 'bold',
    cursor: 'pointer',
    letterSpacing: '1px',
    transition: 'all 0.2s'
};

interface NotesProps {
   userEmail?: string;
   addActivity?: (text: string, icon?: string) => void;
   onBack?: () => void;
}
const Notes = ({ userEmail, addActivity, onBack }: NotesProps) => {    
    const [showHistory, setShowHistory] = useState(false);
    const [savedNotes, setSavedNotes] = useState<Array<{ userId?: string; title: string; content: string; date: string; createdAt: serverTimestamp(),; id?: string; }>>([]);
    const noteRef = useRef<HTMLDivElement | null>(null);
    
    const [currentNote, setCurrentNote] = useState("");
    
    
    const exportToPDF = () => {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            const content = `
                <html>
                    <head>
                        <title>Strategic Intel Export</title>
                        <style>
                            body { font-family: monospace; padding: 40px; background: white; color: black; }
                            h1 { color: #bf00ff; border-bottom: 2px solid #bf00ff; padding-bottom: 10px; }
                            .meta { color: #666; font-size: 12px; margin-bottom: 30px; }
                            .note-body { white-space: pre-wrap; line-height: 1.6; font-size: 14px; }
                        </style>
                    </head>
                    <body>
                        <h1>STRATEGIC SESSION NOTES</h1>
                        <div class="meta">
                            <strong>SOURCE:</strong> ${userEmail || 'ARCHIVE_USER'}<br>
                            <strong>TIMESTAMP:</strong> ${new Date().toLocaleString()}
                        </div>
                        <div class="note-body">${currentNote}</div>
                    </body>
                </html>
            `;
            printWindow.document.write(content);
            printWindow.document.close();
            
            // Wait a tiny bit for the styles to load, then trigger print
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250);
        }
    };
    const handleSaveNote = async () => {
        if (!currentNote.trim()) return;

        const firstLine = currentNote.split('\n')[0];
        const title =
            firstLine.length > 25
                ? firstLine.substring(0, 25) + "..."
                : firstLine || "Untitled Strategic Note";

        const uid = auth.currentUser?.uid;

        if (!uid) {
            alert("User not authenticated");
            return;
        }

        const noteData = {
            userId: uid,
            title,
            content: currentNote,
            date: new Date().toLocaleDateString(),
            createdAt: serverTimestamp(),
        };

        try {
            const docRef = await addDoc(
                collection(firestore, "users", uid, "memories"),
                noteData
            );

            const savedNote = {
                ...noteData,
                id: docRef.id, // ✅ important fix
            };

            setSavedNotes((prev) => [savedNote, ...prev]);
            setCurrentNote("");
            setShowHistory(true);

            addActivity?.(`Archived to Vault: ${title}`, "💎");

            alert("Strategy permanently archived in the Intel Vault.");
        } catch (err) {
            console.error("Firestore Save Error:", err);
            alert("Failed to archive. Check console.");
        }
    };
    const handleDeleteNote = (id?: string) => {
        setSavedNotes((prev) => prev.filter((note) => note.id !== id));
        addActivity?.("Deleted a note from Vault", "🗑️");
    };
        
    
    return (  
        <div style={{ 
            ...glassPanel, width: '100%', height: '600px', 
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            border: '1px solid rgba(191, 0, 255, 0.3)', // Purple Malvin Tint
            animation: 'fadeIn 0.4s ease-out'
        }}>
            {/* NOTEPAD HEADER */}
            <div style={{ padding: '15px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    {onBack && (
                        <button
                            onClick={onBack}
                            style={{
                                ...btnReset,
                                color: '#bf00ff',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                letterSpacing: '1px'
                            }}
                        >
                            ← BACK
                        </button>
                    )}
                    <span style={{ color: '#bf00ff', fontWeight: '900', fontSize: '10px', letterSpacing: '2px' }}>INTEL DRAFT</span>
                    {savedNotes.length > 0 && (
                        <button 
                            onClick={() => setShowHistory(!showHistory)}
                            style={{ ...btnReset, color: 'rgba(255,255,255,0.5)', fontSize: '10px', cursor: 'pointer', borderBottom: '1px solid' }}
                        >
                            {showHistory ? "CLOSE HISTORY" : `PREVIOUS NOTES (${savedNotes.length})`}
                        </button>
                    )}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={handleSaveNote} style={{...smallActionStyle, border: '1px solid #bf00ff'}}>SAVE TO VAULT</button>
                    <button onClick={exportToPDF} style={smallActionStyle}>EXPORT PDF</button>
                </div>
            </div>

            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                {/* PREVIOUS NOTES SIDE-BAR */}
                {showHistory && savedNotes.length > 0 && (
                    <div style={{ width: '220px', borderRight: '1px solid rgba(255,255,255,0.1)', backgroundColor: 'rgba(0,0,0,0.3)', overflowY: 'auto', padding: '10px' }}>
                        {savedNotes.map(note => (
                            <div 
                                key={note.id} 
                                onClick={() => setCurrentNote(note.content)}
                                style={{ 
                                    padding: '12px', 
                                    borderRadius: '8px', 
                                    marginBottom: '8px', 
                                    backgroundColor: 'rgba(255,255,255,0.05)', 
                                    cursor: 'pointer', 
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    display: 'flex',          // Added flex to align text and button
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'}
                            >
                                <div style={{ overflow: 'hidden' }}>
                                    
                                    <div ref={noteRef} style={{ fontSize: '11px', color: 'white', fontWeight: 'bold', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                        {note.title}
                                    </div>
                                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                                        {note.date}
                                    </div>
                                </div>

                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteNote(note.id);
                                    }}
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: 'rgba(255, 77, 77, 0.6)', // Slightly faded red
                                        cursor: 'pointer',
                                        padding: '4px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.color = '#ff4d4d'} // Bright red on hover
                                    onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 77, 77, 0.6)'}
                                    title="Delete Note"
                                >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="3 6 5 6 21 6"></polyline>
                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* THE TYPEWRITER EDITOR */}
                <textarea 
                    value={currentNote}
                    onChange={(e) => setCurrentNote(e.target.value)}
                    placeholder="Type your strategic mission details here..."
                    style={{
                        flex: 1, padding: '25px', backgroundColor: 'transparent', border: 'none',
                        color: 'white', fontSize: '15px', outline: 'none', resize: 'none',
                        fontFamily: 'monospace', lineHeight: '1.6', caretColor: '#bf00ff', height: '60vh'
                    }}
                />
            </div>
        </div>
    ) 
}
export default Notes;