import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { firestore as db, auth } from '../../firebase';
import { signInAnonymously } from 'firebase/auth';
import { AlertTriangle, MapPin, Phone, User, CheckCircle2, Navigation, Loader2 } from 'lucide-react';

interface VinBackTag {
  ownerId: string;
  ownerName: string;
  propertyName: string;
  address: string;
  contact1: string;
  contact2Name?: string;
  contact2: string;
  status: 'in_possession' | 'missing' | 'found';
}

export default function VinBackScan() {
  const { tagId } = useParams<{ tagId: string }>();

  const [loading, setLoading] = useState(true);
  const [tag, setTag] = useState<VinBackTag | null>(null);
  const [notFound, setNotFound] = useState(false);

  const [showReturnForm, setShowReturnForm] = useState(false);
  const [finderName, setFinderName] = useState('');
  const [location, setLocation] = useState('');
  const [message, setMessage] = useState('');
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // A physical tag can be scanned by a total stranger with no Malvin session
  // at all — sign in anonymously on the spot so the report write satisfies
  // the same isSignedIn() rule every other write in this app relies on.
  useEffect(() => {
    if (!auth.currentUser) {
      signInAnonymously(auth).catch((err) => console.error('Anonymous sign-in failed:', err));
    }
  }, []);

  useEffect(() => {
    if (!tagId) return;
    getDoc(doc(db, 'vinbackTags', tagId))
      .then((snap) => {
        if (snap.exists()) {
          setTag(snap.data() as VinBackTag);
        } else {
          setNotFound(true);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load VinBack tag:', err);
        setNotFound(true);
        setLoading(false);
      });
  }, [tagId]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
        setIsLocating(false);
      },
      (err) => {
        console.error('Geolocation failed:', err);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagId || !tag) return;
    if (!location.trim()) {
      alert('Please add your current location so the owner knows where to meet you.');
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'vinbackTags', tagId, 'scans'), {
        tagId,
        ownerId: tag.ownerId,
        finderName: finderName.trim(),
        location: location.trim(),
        message: message.trim(),
        createdAt: serverTimestamp(),
      });
      setSubmitted(true);
    } catch (err) {
      console.error('Failed to submit VinBack report:', err);
      alert('Could not send this report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={pageStyle}>
        <Loader2 size={28} className="animate-spin" color="#C9A227" />
      </div>
    );
  }

  if (notFound || !tag) {
    return (
      <div style={pageStyle}>
        <div style={{ textAlign: 'center', color: '#94a3b8' }}>
          <p style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>Tag not found</p>
          <p style={{ fontSize: '13px', marginTop: '6px' }}>This VinBack tag doesn't exist or has been deleted.</p>
        </div>
      </div>
    );
  }

  const isMissing = tag.status === 'missing';
  const isFound = tag.status === 'found';

  return (
    <div style={pageStyle}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#0B1420', border: '2px solid #C9A227', color: '#C9A227', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontFamily: 'Georgia, serif', fontWeight: 700, fontSize: '24px' }}>
            M
          </div>
          <p style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px' }}>VinBack</p>
        </div>

        {isMissing && !submitted && (
          <div style={{ background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.4)', borderRadius: '16px', padding: '16px', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <AlertTriangle size={20} color="#f87171" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#f87171' }}>This property is missing</p>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#fca5a5' }}>
                {tag.address ? `Please return to ${tag.address}.` : 'Please contact the owner below to arrange a return.'}
              </p>
            </div>
          </div>
        )}

        {isFound && (
          <div style={{ background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.4)', borderRadius: '16px', padding: '16px', marginBottom: '16px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
            <CheckCircle2 size={20} color="#38bdf8" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 800, color: '#38bdf8' }}>Already reported found</p>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#bae6fd' }}>
                Someone has already let the owner know this was found. If that's you again, no need to report twice — feel free to contact them directly below.
              </p>
            </div>
          </div>
        )}

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '20px', padding: '20px' }}>
          <h1 style={{ margin: 0, fontSize: '19px', color: '#f8fafc' }}>{tag.propertyName}</h1>
          <p style={{ margin: '4px 0 16px', fontSize: '13px', color: '#94a3b8' }}>Owner: {tag.ownerName}</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {tag.address && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#e2e8f0' }}>
                <MapPin size={14} color="#64748b" /> {tag.address}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#e2e8f0' }}>
              <Phone size={14} color="#64748b" /> {tag.contact1}
            </div>
            {tag.contact2 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#e2e8f0' }}>
                <Phone size={14} color="#64748b" /> {tag.contact2Name ? `${tag.contact2Name} — ${tag.contact2}` : tag.contact2}
              </div>
            )}
          </div>

          {isMissing && !submitted && !showReturnForm && (
            <button
              onClick={() => setShowReturnForm(true)}
              style={{ marginTop: '18px', width: '100%', border: 'none', borderRadius: '12px', padding: '13px', fontWeight: 800, fontSize: '14px', cursor: 'pointer', background: 'linear-gradient(135deg, #f87171 0%, #dc2626 100%)', color: '#fff' }}
            >
              I found this — Return it
            </button>
          )}

          {isMissing && showReturnForm && !submitted && (
            <form onSubmit={handleSubmitReport} style={{ marginTop: '18px', display: 'flex', flexDirection: 'column', gap: '10px', borderTop: '1px solid #1e293b', paddingTop: '16px' }}>
              <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#94a3b8' }}>
                The owner will be notified the moment you send this.
              </p>
              <label style={vbsLabel}>Your name (optional)</label>
              <input value={finderName} onChange={(e) => setFinderName(e.target.value)} style={vbsInput} placeholder="e.g., Alex" />

              <label style={vbsLabel}>Current location *</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input value={location} onChange={(e) => setLocation(e.target.value)} required style={{ ...vbsInput, flex: 1 }} placeholder="Address or area" />
                <button
                  type="button"
                  onClick={handleUseMyLocation}
                  disabled={isLocating}
                  title="Use my current location"
                  style={{ flexShrink: 0, width: '42px', border: 'none', borderRadius: '10px', background: '#1e293b', color: '#38bdf8', cursor: 'pointer' }}
                >
                  {isLocating ? <Loader2 size={15} className="animate-spin" style={{ margin: '0 auto' }} /> : <Navigation size={15} style={{ margin: '0 auto' }} />}
                </button>
              </div>

              <label style={vbsLabel}>Message (optional)</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} style={{ ...vbsInput, resize: 'vertical' }} placeholder="Anything the owner should know" />

              <button
                type="submit"
                disabled={isSubmitting}
                style={{ marginTop: '4px', border: 'none', borderRadius: '12px', padding: '13px', fontWeight: 800, fontSize: '14px', cursor: 'pointer', background: '#0284c7', color: '#fff', opacity: isSubmitting ? 0.6 : 1 }}
              >
                {isSubmitting ? 'Sending…' : 'Send report'}
              </button>
            </form>
          )}

          {submitted && (
            <div style={{ marginTop: '18px', textAlign: 'center', borderTop: '1px solid #1e293b', paddingTop: '16px' }}>
              <CheckCircle2 size={32} color="#34d399" style={{ margin: '0 auto 8px' }} />
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>Report sent</p>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#94a3b8' }}>The owner has been notified. Thank you.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: '#0A0D12',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const vbsLabel: React.CSSProperties = { fontSize: '10.5px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px' };
const vbsInput: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: '#020617', border: '1px solid #1e293b', color: '#f8fafc', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', outline: 'none' };