import React, { useEffect, useState } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, orderBy, getDocs } from 'firebase/firestore';
import { firestore as db, auth } from '../../firebase';
import { X, Tag, Trash2, MapPin, ChevronDown, Clock } from 'lucide-react';

interface VinBackTag {
  id: string;
  ownerName: string;
  propertyName: string;
  address: string;
  contact1: string;
  contact2: string;
  code: string;
  status: 'in_possession' | 'missing' | 'found';
}

interface ScanReport {
  id: string;
  finderName?: string;
  location: string;
  message?: string;
  createdAt: any;
}

interface Props {
  onClose: () => void;
}

const STATUS_OPTIONS: { value: VinBackTag['status']; label: string; color: string }[] = [
  { value: 'in_possession', label: 'In possession', color: '#34d399' },
  { value: 'missing', label: 'Missing', color: '#f87171' },
  { value: 'found', label: 'Found', color: '#38bdf8' },
];

export default function VinBackTagList({ onClose }: Props) {
  const [tags, setTags] = useState<VinBackTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTagId, setExpandedTagId] = useState<string | null>(null);
  const [scansByTag, setScansByTag] = useState<Record<string, ScanReport[]>>({});
  const [loadingScans, setLoadingScans] = useState(false);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const q = query(collection(db, 'vinbackTags'), where('ownerId', '==', uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setTags(snap.docs.map((d) => ({ id: d.id, ...d.data() } as VinBackTag)));
        setLoading(false);
      },
      (err) => {
        console.error('Failed to load VinBack tags:', err);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const handleStatusChange = async (tagId: string, status: VinBackTag['status']) => {
    try {
      await updateDoc(doc(db, 'vinbackTags', tagId), { status });
    } catch (err) {
      console.error('Failed to update tag status:', err);
    }
  };

  const handleDelete = async (tagId: string) => {
    if (!window.confirm('Delete this tag permanently? The QR code will stop working.')) return;
    try {
      await deleteDoc(doc(db, 'vinbackTags', tagId));
    } catch (err) {
      console.error('Failed to delete tag:', err);
    }
  };

  const handleToggleHistory = async (tagId: string) => {
    const next = expandedTagId === tagId ? null : tagId;
    setExpandedTagId(next);
    if (!next || scansByTag[next]) return;

    setLoadingScans(true);
    try {
      const q = query(collection(db, 'vinbackTags', next, 'scans'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      setScansByTag((prev) => ({
        ...prev,
        [next]: snap.docs.map((d) => ({ id: d.id, ...d.data() } as ScanReport)),
      }));
    } catch (err) {
      console.error('Failed to load scan history:', err);
    } finally {
      setLoadingScans(false);
    }
  };

  const formatScanTime = (createdAt: any): string => {
    const date = createdAt?.toDate ? createdAt.toDate() : null;
    if (!date) return '';
    return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 5000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '440px', maxHeight: '85vh', overflowY: 'auto', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '24px', padding: '22px', boxSizing: 'border-box' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '17px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Tag size={18} color="#C9A227" /> All Tags
          </h3>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%', width: '30px', height: '30px', color: '#f8fafc', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <p style={{ textAlign: 'center', color: '#64748b', fontSize: '13px', padding: '20px' }}>Loading…</p>
        ) : tags.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#64748b', fontSize: '13px', padding: '20px' }}>
            No VinBack tags yet — generate one from Settings.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {tags.map((tag) => {
              const statusMeta = STATUS_OPTIONS.find((s) => s.value === tag.status) || STATUS_OPTIONS[0];
              return (
                <div key={tag.id} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '14px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div style={{ minWidth: 0 }}>
                      <h4 style={{ margin: 0, fontSize: '14px', color: '#f8fafc' }}>{tag.propertyName}</h4>
                      <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748b' }}>Code {tag.code}</p>
                    </div>
                    <button onClick={() => handleDelete(tag.id)} style={{ background: 'rgba(248,113,113,0.12)', border: 'none', borderRadius: '8px', padding: '6px', color: '#f87171', cursor: 'pointer', flexShrink: 0 }}>
                      <Trash2 size={13} />
                    </button>
                  </div>

                  {tag.address && (
                    <p style={{ display: 'flex', alignItems: 'center', gap: '4px', margin: '8px 0 0', fontSize: '11px', color: '#94a3b8' }}>
                      <MapPin size={11} /> {tag.address}
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: '6px', marginTop: '10px', flexWrap: 'wrap' }}>
                    {STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => handleStatusChange(tag.id, opt.value)}
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 700,
                          padding: '5px 10px',
                          borderRadius: '20px',
                          border: `1px solid ${tag.status === opt.value ? opt.color : '#334155'}`,
                          background: tag.status === opt.value ? `${opt.color}22` : 'transparent',
                          color: tag.status === opt.value ? opt.color : '#94a3b8',
                          cursor: 'pointer',
                        }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => handleToggleHistory(tag.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '10px', background: 'none', border: 'none', padding: 0, color: '#64748b', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    <Clock size={11} /> Scan history
                    <ChevronDown size={11} style={{ transform: expandedTagId === tag.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
                  </button>

                  {expandedTagId === tag.id && (
                    <div style={{ marginTop: '8px', borderTop: '1px solid #334155', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {loadingScans ? (
                        <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>Loading…</p>
                      ) : (scansByTag[tag.id] || []).length === 0 ? (
                        <p style={{ fontSize: '11px', color: '#64748b', margin: 0 }}>No scans reported yet.</p>
                      ) : (
                        (scansByTag[tag.id] || []).map((scan) => (
                          <div key={scan.id} style={{ background: '#0f172a', borderRadius: '10px', padding: '8px 10px' }}>
                            <p style={{ margin: 0, fontSize: '11px', color: '#e2e8f0', fontWeight: 700 }}>
                              {scan.finderName || 'Anonymous finder'} · <span style={{ color: '#64748b', fontWeight: 500 }}>{formatScanTime(scan.createdAt)}</span>
                            </p>
                            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <MapPin size={10} /> {scan.location}
                            </p>
                            {scan.message && (
                              <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#cbd5e1', fontStyle: 'italic' }}>"{scan.message}"</p>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
