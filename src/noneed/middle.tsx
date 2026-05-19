{/* 2. MIDDLE */}
export constant middle = {
    <div className="middle-section" style={{ flex: 4, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '40px' }}>
        <AuraBackground />
        {/* --- TOP RIGHT SECURITY & MENU --- */}
        <div style={{ 
            position: 'absolute', 
            top: '25px', 
            right: '20px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '10px',
            zIndex: 100 
        }}>
            {/* TRUST SHIELD */}
            <div style={{ position: 'relative' }}>
                <div 
                    onClick={() => setShowTrustMsg(!showTrustMsg)}
                    style={{ 
                        cursor: 'pointer', 
                        color: showTrustMsg ? '#4ade80' : 'rgba(255, 255, 255, 0.4)',
                        transition: 'all 0.3s ease',
                        filter: showTrustMsg ? 'drop-shadow(0 0 8px rgba(74, 222, 128, 0.4))' : 'none'
                    }}
                >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                        <path d="m9 12 2 2 4-4"/>
                    </svg>
                </div>

                {/* POPUP MESSAGE */}
                {showTrustMsg && (
                    <div style={{
                        position: 'absolute',
                        top: '40px',
                        right: '0',
                        width: '280px',
                        backgroundColor: 'rgba(15, 15, 20, 0.95)',
                        backdropFilter: 'blur(15px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '16px',
                        padding: '20px',
                        zIndex: 101,
                        animation: 'fadeIn 0.2s ease-out'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#4ade80' }}></div>
                            <span style={{ color: 'white', fontWeight: 'bold', fontSize: '13px' }}>Secure Session</span>
                        </div>
                        <p style={{ margin: '0 0 12px 0', fontSize: '12px', color: 'rgba(255,255,255,0.7)', lineHeight: '1.6' }}>
                            All conversations are end-to-end encrypted. No Malvin personnel will ever ask for your login info.
                        </p>
                        <div style={{ height: '1px', backgroundColor: 'rgba(255,255,255,0.1)', marginBottom: '12px' }}></div>
                        <p style={{ margin: 0, fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
                            Support: 
                            <a 
                                href="mailto:malvinsupportteam@gmail.com" 
                                style={{ 
                                    color: '#bf00ff', 
                                    textDecoration: 'none', 
                                    marginLeft: '5px',
                                    fontWeight: 'bold',
                                    transition: 'opacity 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                            >
                                malvinsupportteam@gmail.com
                            </a>
                        </p>
                        
                    </div>
                )}
            </div>
        </div>
        <div className="status-pill-container" style={{ display: 'flex', alignItems: 'stretch', justifyContent: 'space-between', width: '100%', paddingBottom: '20px', alignSelf: 'stretch'}}>
            <div className="status-pill" style={{ marginTop: '-18px', marginLeft: '-12px' }}>
                <span className="live-dot"></span>
                <span className="status-text">LIVE SESSION</span>
                <span className="status-timer">{formatTime()}</span>
            </div>
        </div>
        <div style={{ display: 'flex', position: 'absolute', bottom: '90px', left: '50%', transform: 'translateX(-50%)', alignItems: 'center', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '850px', zIndex: 10 }}>
            {activeTab === 'Notes' ? (
                <Notes userEmail={userEmail} addActivity={addActivity}/>
            ) : (
                (() => {
                    try {
                        console.log("🟢 Rendering Face");
                        return <Face />;
                    } catch (err) {
                        console.error("💥 FACE COMPONENT CRASHED", err);
                        return <div style={{color:"red"}}>Face crashed</div>;
                    }
                })()
            )}
        </div>
    </div>
}