import React from 'react';

const ReloopDeleteAccount = () => {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: '#0a0a0a',
        overflowY: 'auto',
        padding: '60px 20px',
        color: '#ccc',
        lineHeight: '1.7',
      }}
    >
      <h1>Reloop — Delete Your Account</h1>

      <p>
        You can permanently delete your Reloop account from within the
        Reloop app by going to <strong>Settings → Delete Account</strong>.
      </p>

      <p>
        Account information, listings, and associated personal data will be
        deleted or anonymized where appropriate.
      </p>

      <p>
        Certain transaction, tax, or legal records may be retained where
        required by law.
      </p>

      <p>
        If you cannot access your account, contact{' '}
        <a
          href="mailto:privacy@malvinai.com"
          style={{ color: '#4da3ff' }}
        >
          contact@malvinai.com
        </a>{' '}
        and request account deletion.
      </p>
    </div>
  );
};

export default ReloopDeleteAccount;
