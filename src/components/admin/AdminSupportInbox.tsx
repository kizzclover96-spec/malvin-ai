import React, { useEffect, useState } from 'react';
import {
    collection, doc, query, orderBy, onSnapshot, updateDoc, limit as fsLimit,
} from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { firestore, functions, storage } from '../../firebase';
import { Mail, Send, Check, Clock3, Inbox, CircleDot, User, Search, Paperclip, X, FileText, Download } from 'lucide-react';

const tokens = {
    bg: '#0A0C0E',
    surface: 'rgba(255,255,255,0.025)',
    surfaceRaised: 'rgba(255,255,255,0.06)',
    border: 'rgba(255,255,255,0.08)',
    text: '#EDEFF1',
    textDim: '#8B939B',
    accent: '#C5FF41',
    danger: '#FF5C5C',
    warn: '#FFB020',
    info: '#4FA3FF',
    mono: "'JetBrains Mono', ui-monospace, 'SF Mono', Menlo, monospace",
    sans: "Inter, sans-serif",
};

type ConvStatus = 'open' | 'pending' | 'resolved';

interface Attachment {
    filename: string;
    url: string;
    contentType?: string;
    size?: number;
}

interface Conversation {
    id: string;
    customerEmail: string;
    customerName?: string | null;
    subject: string;
    status: ConvStatus;
    assignedTo?: string | null;
    updatedAt: number;
    lastMessagePreview?: string;
    unreadByAdmin?: boolean;
}

interface SupportMessage {
    id: string;
    direction: 'inbound' | 'outbound';
    from: string;
    to: string;
    subject: string;
    body: string;
    authorEmail?: string | null;
    attachments?: Attachment[];
    createdAt: number;
}

interface AssignableAdmin {
    email: string;
    label: string;
}

const TABS: { key: ConvStatus | 'all'; label: string; icon: React.ReactNode }[] = [
    { key: 'open', label: 'Open', icon: <Inbox size={13} /> },
    { key: 'pending', label: 'Pending', icon: <Clock3 size={13} /> },
    { key: 'resolved', label: 'Resolved', icon: <Check size={13} /> },
    { key: 'all', label: 'All', icon: <CircleDot size={13} /> },
];

const MAX_ATTACHMENTS = 5;
const MAX_ATTACHMENT_MB = 15;

export function AdminSupportInbox({
    myEmail, myUid, assignableAdmins = [],
}: { myEmail: string; myUid: string; assignableAdmins?: AssignableAdmin[] }) {
    const [tab, setTab] = useState<ConvStatus | 'all'>('open');
    const [searchTerm, setSearchTerm] = useState('');
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [messages, setMessages] = useState<SupportMessage[]>([]);
    const [replyBody, setReplyBody] = useState('');
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState('');
    const [isAssignMenuOpen, setIsAssignMenuOpen] = useState(false);

    // --- OUTBOUND ATTACHMENTS being composed for the current reply ---
    const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');

    // --- CONVERSATION LIST (all statuses — filtered client-side so we
    // don't need a composite index per tab for a handful of admins) ---
    useEffect(() => {
        const q = query(collection(firestore, 'supportConversations'), orderBy('updatedAt', 'desc'), fsLimit(200));
        const unsub = onSnapshot(q, (snap) => {
            setConversations(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
        }, (err) => console.error('SUPPORT_INBOX_LIST_ERROR:', err));
        return () => unsub();
    }, []);

    const byStatus = tab === 'all' ? conversations : conversations.filter(c => c.status === tab);
    // Search matches customer name/email, subject, and the last message
    // preview — a full historical message-body search would need a real
    // search index (Algolia/Typesense) since Firestore can't do text
    // search natively; this covers what's visible in the list itself.
    const search = searchTerm.trim().toLowerCase();
    const filtered = !search ? byStatus : byStatus.filter(c =>
        (c.customerName || '').toLowerCase().includes(search) ||
        c.customerEmail.toLowerCase().includes(search) ||
        (c.subject || '').toLowerCase().includes(search) ||
        (c.lastMessagePreview || '').toLowerCase().includes(search)
    );
    const selected = conversations.find(c => c.id === selectedId) || null;

    // --- THREAD MESSAGES for the selected conversation ---
    useEffect(() => {
        if (!selectedId) { setMessages([]); return; }
        const q = query(collection(firestore, 'supportConversations', selectedId, 'messages'), orderBy('createdAt', 'asc'));
        const unsub = onSnapshot(q, (snap) => {
            setMessages(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })));
        }, (err) => console.error('SUPPORT_THREAD_READ_ERROR:', err));
        return () => unsub();
    }, [selectedId]);

    // Mark read the moment an unread conversation is opened.
    useEffect(() => {
        if (selected?.unreadByAdmin) {
            updateDoc(doc(firestore, 'supportConversations', selected.id), { unreadByAdmin: false }).catch(() => {});
        }
    }, [selected?.id]);

    const openConversation = (id: string) => {
        setSelectedId(id);
        setReplyBody('');
        setSendError('');
        setPendingAttachments([]);
        setUploadError('');
        setIsAssignMenuOpen(false);
    };

    const setStatus = async (status: ConvStatus) => {
        if (!selected) return;
        try {
            await updateDoc(doc(firestore, 'supportConversations', selected.id), { status });
        } catch (err) {
            console.error('SUPPORT_STATUS_UPDATE_ERROR:', err);
        }
    };

    const assignTo = async (email: string) => {
        if (!selected) return;
        setIsAssignMenuOpen(false);
        try {
            const isMe = email === myEmail;
            await updateDoc(doc(firestore, 'supportConversations', selected.id), {
                assignedTo: email,
                assignedToUid: isMe ? myUid : null,
            });
        } catch (err) {
            console.error('SUPPORT_ASSIGN_ERROR:', err);
        }
    };

    // --- ATTACH A FILE TO THE REPLY BEING COMPOSED ---
    // Uploads straight to Storage from the browser (support-attachments/
    // outbound/{conversationId}/...) and keeps only the resulting download
    // URL + metadata in state — sendSupportReply never sees raw bytes, it
    // just hands Resend that URL to fetch from.
    const handleAttachFiles = async (fileList: FileList | null) => {
        if (!fileList || !selected) return;
        const files = Array.from(fileList);
        if (pendingAttachments.length + files.length > MAX_ATTACHMENTS) {
            setUploadError(`Up to ${MAX_ATTACHMENTS} attachments per reply.`);
            return;
        }
        setUploadError('');
        setIsUploading(true);
        try {
            for (const file of files) {
                if (file.size > MAX_ATTACHMENT_MB * 1024 * 1024) {
                    setUploadError(`${file.name} is over ${MAX_ATTACHMENT_MB}MB — skipped.`);
                    continue;
                }
                const path = `support-attachments/outbound/${selected.id}/${Date.now()}-${file.name}`;
                const fileRef = storageRef(storage, path);
                await uploadBytes(fileRef, file, { contentType: file.type || 'application/octet-stream' });
                const url = await getDownloadURL(fileRef);
                setPendingAttachments(prev => [...prev, { filename: file.name, url, contentType: file.type, size: file.size }]);
            }
        } catch (err) {
            console.error('SUPPORT_ATTACHMENT_UPLOAD_ERROR:', err);
            setUploadError('Failed to upload one or more files.');
        } finally {
            setIsUploading(false);
        }
    };

    const removePendingAttachment = (url: string) => {
        setPendingAttachments(prev => prev.filter(a => a.url !== url));
    };

    const sendReply = async () => {
        if (!selected || (!replyBody.trim() && pendingAttachments.length === 0)) return;
        setSending(true);
        setSendError('');
        try {
            const reply = httpsCallable(functions, 'sendSupportReply');
            await reply({ conversationId: selected.id, body: replyBody.trim(), attachments: pendingAttachments });
            setReplyBody('');
            setPendingAttachments([]);
        } catch (err: any) {
            console.error('SUPPORT_REPLY_ERROR:', err);
            setSendError(err?.message || 'Failed to send reply.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, height: 'calc(100vh - 160px)' }}>
            {/* ---------- CONVERSATION LIST ---------- */}
            <section style={{ ...panelStyle, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ position: 'relative', marginBottom: 12 }}>
                    <Search size={13} style={{ position: 'absolute', left: 10, top: 10, opacity: 0.4 }} />
                    <input
                        type="text"
                        placeholder="Search name, email, subject…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        style={{ ...inputStyle, paddingLeft: 30 }}
                    />
                </div>

                <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
                    {TABS.map(t => {
                        const count = t.key === 'all' ? conversations.length : conversations.filter(c => c.status === t.key).length;
                        const isActive = tab === t.key;
                        return (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                style={{
                                    ...segmentBtn,
                                    display: 'flex', alignItems: 'center', gap: 5,
                                    background: isActive ? tokens.accent : 'transparent',
                                    color: isActive ? '#000' : tokens.textDim,
                                    borderColor: isActive ? tokens.accent : tokens.border,
                                }}
                            >
                                {t.icon} {t.label} {count > 0 && <span style={{ opacity: 0.6 }}>({count})</span>}
                            </button>
                        );
                    })}
                </div>

                <div style={{ overflowY: 'auto', flex: 1 }}>
                    {filtered.length === 0 && (
                        <div style={{ textAlign: 'center', opacity: 0.35, padding: '40px 16px', fontSize: 12 }}>
                            {search ? 'No matches.' : 'Nothing here.'}
                        </div>
                    )}
                    {filtered.map(c => {
                        const isSelected = c.id === selectedId;
                        return (
                            <div
                                key={c.id}
                                onClick={() => openConversation(c.id)}
                                style={{
                                    padding: 12,
                                    borderRadius: 10,
                                    marginBottom: 8,
                                    cursor: 'pointer',
                                    border: `1px solid ${isSelected ? tokens.accent : tokens.border}`,
                                    background: isSelected ? tokens.surfaceRaised : tokens.surface,
                                }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <span style={{ fontSize: 12, fontWeight: c.unreadByAdmin ? 800 : 600 }}>
                                        {c.unreadByAdmin && <span style={{ color: tokens.accent, marginRight: 4 }}>●</span>}
                                        {c.customerName || c.customerEmail}
                                    </span>
                                    <StatusPill status={c.status} />
                                </div>
                                <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4, fontWeight: c.unreadByAdmin ? 700 : 400 }}>
                                    {c.subject || '(no subject)'}
                                </div>
                                {c.lastMessagePreview && (
                                    <div style={{ fontSize: 10, opacity: 0.4, marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {c.lastMessagePreview}
                                    </div>
                                )}
                                {c.assignedTo && (
                                    <div style={{ fontSize: 9, opacity: 0.4, marginTop: 6, fontFamily: tokens.mono, display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <User size={9} /> {c.assignedTo}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* ---------- THREAD ---------- */}
            <section style={{ ...panelStyle, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {!selected ? (
                    <div style={{ margin: 'auto', textAlign: 'center', opacity: 0.35, fontSize: 12 }}>
                        <Mail size={22} style={{ marginBottom: 8 }} />
                        <div>Select a conversation to read it.</div>
                    </div>
                ) : (
                    <>
                        <div style={{ borderBottom: `1px solid ${tokens.border}`, paddingBottom: 12, marginBottom: 12, flexShrink: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 800 }}>{selected.subject || '(no subject)'}</div>
                                    <div style={{ fontSize: 11, opacity: 0.5, marginTop: 2, fontFamily: tokens.mono }}>
                                        {selected.customerName ? `${selected.customerName} · ` : ''}{selected.customerEmail}
                                    </div>
                                </div>
                                <StatusPill status={selected.status} />
                            </div>
                            <div style={{ display: 'flex', gap: 8, marginTop: 10, position: 'relative' }}>
                                <button onClick={() => setStatus('open')} style={toggleBtn(selected.status === 'open', tokens.accent)}>OPEN</button>
                                <button onClick={() => setStatus('pending')} style={toggleBtn(selected.status === 'pending', tokens.warn)}>PENDING</button>
                                <button onClick={() => setStatus('resolved')} style={toggleBtn(selected.status === 'resolved', tokens.info)}>RESOLVED</button>

                                <div style={{ marginLeft: 'auto', position: 'relative' }}>
                                    <button
                                        onClick={() => setIsAssignMenuOpen(v => !v)}
                                        style={{ ...miniBtn, border: `1px solid ${tokens.border}`, color: tokens.textDim, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                                    >
                                        <User size={11} /> {selected.assignedTo ? `Assigned: ${selected.assignedTo}` : 'Assign…'}
                                    </button>
                                    {isAssignMenuOpen && (
                                        <div style={{
                                            position: 'absolute', right: 0, top: '110%', zIndex: 20,
                                            background: '#111', border: `1px solid ${tokens.border}`, borderRadius: 10,
                                            minWidth: 200, boxShadow: '0 12px 30px rgba(0,0,0,0.5)', overflow: 'hidden',
                                        }}>
                                            <button
                                                onClick={() => assignTo(myEmail)}
                                                style={assignMenuItem(selected.assignedTo === myEmail)}
                                            >
                                                Assign to me
                                            </button>
                                            {assignableAdmins
                                                .filter(a => a.email !== myEmail)
                                                .map(a => (
                                                    <button key={a.email} onClick={() => assignTo(a.email)} style={assignMenuItem(selected.assignedTo === a.email)}>
                                                        {a.label} <span style={{ opacity: 0.5 }}>({a.email})</span>
                                                    </button>
                                                ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 10, paddingRight: 4 }}>
                            {messages.map(m => (
                                <div
                                    key={m.id}
                                    style={{
                                        alignSelf: m.direction === 'outbound' ? 'flex-end' : 'flex-start',
                                        maxWidth: '78%',
                                        background: m.direction === 'outbound' ? 'rgba(197,255,65,0.08)' : tokens.surface,
                                        border: `1px solid ${m.direction === 'outbound' ? 'rgba(197,255,65,0.25)' : tokens.border}`,
                                        borderRadius: 12,
                                        padding: 12,
                                    }}
                                >
                                    <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 6, fontFamily: tokens.mono, display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                        <span>{m.direction === 'outbound' ? (m.authorEmail || 'Malvin Support') : m.from}</span>
                                        <span>{m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}</span>
                                    </div>
                                    <div style={{ fontSize: 12, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{m.body}</div>
                                    {m.attachments && m.attachments.length > 0 && (
                                        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
                                            {m.attachments.map((a, i) => (
                                                <a
                                                    key={i}
                                                    href={a.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    style={{
                                                        display: 'flex', alignItems: 'center', gap: 6,
                                                        fontSize: 11, color: tokens.info, textDecoration: 'none',
                                                        border: `1px solid ${tokens.border}`, borderRadius: 8, padding: '6px 10px',
                                                        background: 'rgba(255,255,255,0.03)',
                                                    }}
                                                >
                                                    <FileText size={12} />
                                                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.filename}</span>
                                                    <Download size={12} />
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div style={{ marginTop: 12, flexShrink: 0 }}>
                            {(sendError || uploadError) && (
                                <div style={{ fontSize: 11, color: tokens.danger, marginBottom: 6 }}>{sendError || uploadError}</div>
                            )}
                            {pendingAttachments.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                                    {pendingAttachments.map(a => (
                                        <span key={a.url} style={{
                                            display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontFamily: tokens.mono,
                                            background: 'rgba(255,255,255,0.06)', borderRadius: 6, padding: '5px 8px',
                                        }}>
                                            <Paperclip size={10} /> {a.filename}
                                            <button onClick={() => removePendingAttachment(a.url)} style={{ background: 'none', border: 'none', color: tokens.textDim, cursor: 'pointer', display: 'flex', padding: 0 }}>
                                                <X size={10} />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: 8 }}>
                                <textarea
                                    value={replyBody}
                                    onChange={e => setReplyBody(e.target.value)}
                                    placeholder="Type a reply…"
                                    rows={3}
                                    style={{ ...inputStyle, resize: 'vertical', flex: 1 }}
                                />
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignSelf: 'flex-end' }}>
                                    <label style={{ ...attachBtn, opacity: isUploading ? 0.5 : 1, cursor: isUploading ? 'not-allowed' : 'pointer' }}>
                                        <Paperclip size={14} />
                                        <input
                                            type="file"
                                            multiple
                                            disabled={isUploading}
                                            onChange={(e) => { handleAttachFiles(e.target.files); e.currentTarget.value = ''; }}
                                            style={{ display: 'none' }}
                                        />
                                    </label>
                                    <button
                                        disabled={sending || isUploading || (!replyBody.trim() && pendingAttachments.length === 0)}
                                        onClick={sendReply}
                                        style={{ ...primaryBtn, display: 'flex', alignItems: 'center', gap: 6, opacity: sending || isUploading || (!replyBody.trim() && pendingAttachments.length === 0) ? 0.5 : 1 }}
                                    >
                                        <Send size={13} /> {sending ? '…' : 'SEND'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}

function StatusPill({ status }: { status: ConvStatus }) {
    const color = status === 'open' ? tokens.accent : status === 'pending' ? tokens.warn : tokens.info;
    return (
        <span style={{ fontSize: 9, fontFamily: tokens.mono, fontWeight: 800, padding: '3px 8px', borderRadius: 5, background: `${color}1A`, color }}>
            {status.toUpperCase()}
        </span>
    );
}

function toggleBtn(active: boolean, color: string): React.CSSProperties {
    return {
        flex: '0 0 auto',
        background: active ? `${color}1A` : 'transparent',
        border: `1px solid ${active ? color : tokens.border}`,
        color: active ? color : tokens.textDim,
        padding: '8px 12px',
        borderRadius: 8,
        fontSize: 10,
        fontFamily: tokens.mono,
        fontWeight: 700,
        letterSpacing: '0.5px',
        cursor: 'pointer',
    };
}

function assignMenuItem(active: boolean): React.CSSProperties {
    return {
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: '10px 12px',
        fontSize: 11,
        background: active ? 'rgba(197,255,65,0.08)' : 'transparent',
        color: active ? tokens.accent : tokens.text,
        border: 'none',
        borderBottom: `1px solid ${tokens.border}`,
        cursor: 'pointer',
    };
}

const panelStyle: React.CSSProperties = {
    background: tokens.surface,
    border: `1px solid ${tokens.border}`,
    borderRadius: 16,
    padding: 18,
};

const segmentBtn: React.CSSProperties = {
    padding: '7px 12px',
    fontSize: 10,
    fontFamily: tokens.mono,
    fontWeight: 700,
    letterSpacing: '0.5px',
    border: '1px solid',
    borderRadius: 8,
    cursor: 'pointer',
    textTransform: 'uppercase',
};

const miniBtn: React.CSSProperties = {
    padding: '7px 10px',
    fontSize: 10,
    fontFamily: tokens.mono,
    fontWeight: 700,
    borderRadius: 6,
    letterSpacing: '0.3px',
};

const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#000',
    border: `1px solid ${tokens.border}`,
    padding: '11px 12px',
    borderRadius: 8,
    color: tokens.text,
    fontSize: 12,
    fontFamily: tokens.sans,
    boxSizing: 'border-box',
};

const primaryBtn: React.CSSProperties = {
    background: tokens.accent,
    color: '#000',
    border: 'none',
    padding: '12px 18px',
    borderRadius: 8,
    fontWeight: 800,
    fontSize: 11,
    fontFamily: tokens.mono,
    letterSpacing: '0.5px',
    cursor: 'pointer',
};

const attachBtn: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
    borderRadius: 8,
    border: `1px solid ${tokens.border}`,
    color: tokens.textDim,
    background: 'transparent',
};

export default AdminSupportInbox;
