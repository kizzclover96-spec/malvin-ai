import React, { useState } from 'react';
import { db } from '../../firebase';
import { ref, push, serverTimestamp } from 'firebase/database';

type Mode = null | 'pull' | 'push';

const card: React.CSSProperties = {
  flex: 1,
  minWidth: 220,
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 18,
  padding: '22px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};

const ConnectAccountPanel: React.FC<{ ownerUid: string; ownerEmail?: string | null }> = ({ ownerUid, ownerEmail }) => {
  const [mode, setMode] = useState<Mode>(null);
  const [targetEmail, setTargetEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const submit = async () => {
    if (!targetEmail.trim()) return;
    setStatus('sending');
    try {
      // direction: 'pull' = we are requesting to attach targetEmail's account to us
      //            'push' = we are requesting to attach ourselves to targetEmail's account
      await push(ref(db, 'accountLinkRequests'), {
        fromUid: ownerUid,
        fromEmail: ownerEmail || null,
        targetEmail: targetEmail.trim().toLowerCase(),
        direction: mode,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      setStatus('sent');
      setTargetEmail('');
    } catch (e) {
      console.error(e);
      setStatus('error');
    }
  };

  return (
    <section>
      <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '8px' }}>Connect Another Malvin Account</h1>
      <h3 style={{ marginTop: 0, fontSize: '14px', color: '#22c55e', letterSpacing: '1px', fontWeight: 800 }}>
        ACCOUNT LINKING
      </h3>

      {!mode && (
        <div style={{ display: 'flex', gap: 16, marginTop: 24, flexWrap: 'wrap' }}>
          <div
            style={card}
            onClick={() => setMode('pull')}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#22c55e')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
          >
            <div style={{ fontSize: 26, marginBottom: 10 }}>📥</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Connect an existing account to this one</div>
            <div style={{ fontSize: 12, opacity: 0.5 }}>
              Bring another Malvin account under this account, so you manage it from here.
            </div>
          </div>
          <div
            style={card}
            onClick={() => setMode('push')}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#22c55e')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
          >
            <div style={{ fontSize: 26, marginBottom: 10 }}>📤</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6 }}>Connect this account to an existing account</div>
            <div style={{ fontSize: 12, opacity: 0.5 }}>
              Attach this account under another Malvin account you already own or manage.
            </div>
          </div>
        </div>
      )}

      {mode && (
        <div style={{ marginTop: 24, maxWidth: 420 }}>
          <button
            onClick={() => { setMode(null); setStatus('idle'); }}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', fontSize: 12, cursor: 'pointer', marginBottom: 16, padding: 0 }}
          >
            ← Choose a different option
          </button>

          <p style={{ fontSize: 13, opacity: 0.6, marginBottom: 14 }}>
            {mode === 'pull'
              ? 'Enter the email of the Malvin account you want to bring under this account.'
              : 'Enter the email of the Malvin account you want this account to be attached to.'}
          </p>

          <input
            type="email"
            placeholder="account-email@example.com"
            value={targetEmail}
            onChange={(e) => setTargetEmail(e.target.value)}
            style={{ width: '100%', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', padding: '12px', borderRadius: 10, color: 'white', boxSizing: 'border-box', marginBottom: 12 }}
          />

          <button
            onClick={submit}
            disabled={status === 'sending'}
            style={{ width: '100%', background: '#22c55e', border: 'none', color: '#04150a', padding: '12px', borderRadius: 10, fontWeight: 800, cursor: 'pointer' }}
          >
            {status === 'sending' ? 'Sending request…' : 'Send Connection Request'}
          </button>

          {status === 'sent' && (
            <p style={{ color: '#22c55e', fontSize: 12, marginTop: 12 }}>
              Request sent — the other account owner needs to approve it before the accounts link.
            </p>
          )}
          {status === 'error' && (
            <p style={{ color: '#ef4444', fontSize: 12, marginTop: 12 }}>
              Couldn't send that request. Check your connection and try again.
            </p>
          )}
        </div>
      )}
    </section>
  );
};

export default ConnectAccountPanel;
