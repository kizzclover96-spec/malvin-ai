import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const LegalDocs = () => {
  const [tab, setTab] = useState('terms'); // 'terms', 'privacy', or 'impressum'
  const navigate = useNavigate();

  const sectionStyle = {
    lineHeight: '1.6',
    color: '#ccc',
    padding: '20px',
    maxWidth: '800px',
    margin: '0 auto'
  };

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <nav style={{ padding: '20px', borderBottom: '1px solid #333', display: 'flex', gap: '20px', justifyContent: 'center' }}>
        <button onClick={() => setTab('terms')} style={{ background: 'none', border: 'none', color: tab === 'terms' ? '#00d4ff' : '#fff', cursor: 'pointer' }}>Terms</button>
        <button onClick={() => setTab('privacy')} style={{ background: 'none', border: 'none', color: tab === 'privacy' ? '#00d4ff' : '#fff', cursor: 'pointer' }}>Privacy</button>
        <button onClick={() => setTab('impressum')} style={{ background: 'none', border: 'none', color: tab === 'impressum' ? '#00d4ff' : '#fff', cursor: 'pointer' }}>Impressum</button>
        <button onClick={() => navigate(-1)} style={{ background: '#333', border: 'none', color: '#fff', padding: '5px 15px', borderRadius: '5px', cursor: 'pointer' }}>Back</button>
      </nav>

      <div style={sectionStyle}>
        {tab === 'terms' && (
          <div>
            <h1>Terms and Conditions – Malvin AI</h1>
            <p>Last updated: May 2026</p>
            <h3>1. Use of Service</h3>
            <p>Malvin AI provides AI-powered assistance for business insights, automation, and decision support. You agree to use the service responsibly and not for unlawful or harmful activities.</p>
            {/* ... Add other sections here ... */}
          </div>
        )}

        {tab === 'privacy' && (
          <div>
            <h1>Privacy Policy – Malvin AI</h1>
            <p>Last updated: May 2026</p>
            <h3>1. Information We Collect</h3>
            <p>We may collect account information, usage data, and technical data to provide and improve Malvin AI services.</p>
            {/* ... Add other sections here ... */}
          </div>
        )}

        {tab === 'impressum' && (
          <div style={{ textAlign: 'center' }}>
            <h1>Impressum</h1>
            <p><strong>Angaben gemäß § 5 TMG</strong></p>
            <p>Praise Imasuen<br />Im Waager 41<br />72581 Dettingen an der Erms<br />Deutschland</p>
            <p>Kontakt: kizzclover96@gmail.com</p>
            {/* ... Add other sections here ... */}
          </div>
        )}
      </div>
    </div>
  );
};

export default LegalDocs;