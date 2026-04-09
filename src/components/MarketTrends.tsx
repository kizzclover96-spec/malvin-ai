import React, { useState, useEffect } from 'react';

const MarketTrends = ({ onBack, userBrand }: { onBack: () => void, userBrand: any }) => {
  const [news, setNews] = useState<any[]>([]);
  const [livePosts, setLivePosts] = useState([
    { user: "@market_bot", text: "Volatility detected in tech sector. Adjusting hedge positions.", time: "Now" },
    { user: "@biz_insider", text: "New supply chain regulations announced in EU.", time: "4m ago" }
  ]);

  // 1. SIMULATE INCOMING POSTS (The "Live" feel)
  useEffect(() => {
    if (!userBrand?.category) return;

    const postInterval = setInterval(() => {
      const updates = [
        { user: "@trend_ai", text: `Surge in '${userBrand.category || 'Industry'}' search volume observed.`, time: "Now" },
        { user: "@whale_watcher", text: "Massive capital movement detected in series B.", time: "Now" },
        { user: "@system", text: "Neural Engine re-calibrated for Q3 projections.", time: "Now" }
      ];
      const randomUpdate = updates[Math.floor(Math.random() * updates.length)];
      setLivePosts(prev => [randomUpdate, ...prev.slice(0, 5)]);
    }, 8000);

    return () => clearInterval(postInterval);
  }, [userBrand.category]); // Re-sync if category changes

  // 2. FETCH NEWS (Cleaned Logic)
  useEffect(() => {
    if (!userBrand) return;
    const fetchNews = async () => {
    const apiKey = import.meta.env.VITE_GNEWS_KEY; 
    const industry = userBrand.category || "Business";
    
    // We use the 'search' endpoint to be specific to the industry
    const query = encodeURIComponent(`${industry} industry trends`);
    const url = `https://gnews.io/api/v4/search?q=${query}&lang=en&max=10&apikey=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();
        if (data.articles) {
        setNews(data.articles); 
        }
    } catch (error) {
        console.error("GNews Fetch Error:", error);
        setNews([{ title: "Market Data Unavailable", source: { name: "System" } }]);
    }
    };

    fetchNews();
  }, [userBrand?.category]); // This is the magic line that listens to your Settings

  return (
    <div style={{ 
      position: 'fixed', inset: 0, backgroundColor: '#02040a', color: 'white', 
      display: 'flex', flexDirection: 'column', zIndex: 1000, padding: '20px', 
      fontFamily: 'monospace', boxSizing: 'border-box' 
    }}>
      
      {/* HEADER */}
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #1e293b', paddingBottom: '15px' }}>
        <div>
          <h2 style={{ margin: 0, color: '#3b82f6', fontSize: '20px', letterSpacing: '2px' }}>
            {userBrand?.name ? `${userBrand.name.toUpperCase()}_PULSE` : 'MALVIN_MARKET_PULSE'}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 10px #10b981' }} />
            <span style={{ fontSize: '10px', opacity: 0.6 }}>
               FEED: {userBrand?.category?.toUpperCase() || 'GENERAL'} // ENCRYPTED_CONNECTION
            </span>
          </div>
        </div>
        <button onClick={onBack} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '8px 20px', borderRadius: '4px', cursor: 'pointer' }}>EXIT_TERMINAL</button>
      </div>

      {/* MAIN CONTENT GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '20px', flex: 1, overflow: 'hidden', marginBottom: '40px' }}>
        
        {/* NEWS FEED */}
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', overflowY: 'auto' }}>
          <div style={{ fontSize: '12px', color: '#3b82f6', borderBottom: '1px solid #3b82f6', paddingBottom: '5px', marginBottom: '15px' }}>HEADLINES</div>
          {news.map((art, i) => (
                <div 
                    key={i} 
                    onClick={() => window.open(art.url, '_blank')}
                    style={{ 
                        padding: '15px 0', 
                        borderBottom: '1px dotted rgba(255,255,255,0.1)',
                        cursor: 'pointer',
                        transition: 'opacity 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.7'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                    {/* Optional: Add a tiny thumbnail if the article has one */}
                    {art.image && (
                        <img src={art.image} alt="news" style={{ width: '100%', height: '100px', objectFit: 'cover', borderRadius: '4px', marginBottom: '8px' }} />
                    )}
                    <span style={{ fontSize: '9px', color: '#3b82f6', textTransform: 'uppercase' }}>
                        {art.source.name}
                    </span>
                    <div style={{ fontSize: '13px', fontWeight: '500', marginTop: '4px', lineHeight: '1.4' }}>
                        {art.title}
                    </div>
                </div>
            ))}
        </div>

        {/* SOCIAL/SYSTEM SENTIMENT */}
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '12px', color: '#10b981', borderBottom: '1px solid #10b981', paddingBottom: '5px', marginBottom: '15px' }}>COMMUNITY_SENTIMENT</div>
          {livePosts.map((post, i) => (
            <div key={i} style={{ marginBottom: '15px', animation: 'fadeIn 0.5s ease' }}>
              <div style={{ fontSize: '11px', color: '#10b981' }}>{post.user} <span style={{ opacity: 0.4 }}>• {post.time}</span></div>
              <div style={{ fontSize: '12px', marginTop: '3px', opacity: 0.8 }}>{post.text}</div>
            </div>
          ))}
        </div>

        {/* SECTOR VELOCITY */}
        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ fontSize: '12px', color: '#f59e0b', borderBottom: '1px solid #f59e0b', paddingBottom: '5px', marginBottom: '15px' }}>SECTOR_PERFORMANCE</div>
          {/* Progress Bars as before... */}
        </div>
      </div>

      {/* TICKER TAPE */}
      <div style={{ 
        position: 'absolute', bottom: 0, left: 0, width: '100%', 
        background: '#3b82f6', height: '35px', display: 'flex', 
        alignItems: 'center', overflow: 'hidden', whiteSpace: 'nowrap' 
      }}>
        <div className="ticker-content" style={{ color: 'black', fontWeight: 'bold', fontSize: '12px' }}>
          BTC/USD +2.4% • {userBrand?.category?.toUpperCase() || 'MARKET'}_INDEX +1.2% • MALVIN_OS_CONNECTED • SYSTEM_STABLE • 
        </div>
        <style>{`
          .ticker-content {
            display: inline-block;
            padding-left: 100%;
            animation: ticker 30s linear infinite;
          }
          @keyframes ticker {
            0% { transform: translateX(0); }
            100% { transform: translateX(-100%); }
          }
        `}</style>
      </div>
    </div>
  );
};

export default MarketTrends;