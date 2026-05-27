import React from 'react';

const Explore = () => {
  const aiWomanUrl = "/mockupmm.png";

  const features = [
    {
        title: "Smart Business Command Center",
        desc: "Monitor your entire business from one intelligent dashboard with real-time insights, organized workflows, and a clean productivity-focused workspace.",
        img: "/dashboard.png"
    },
    {
        title: "Unified Communication Workspace",
        desc: "Manage conversations, collaborations, and business operations across multiple platforms without breaking your workflow or losing focus.",
        img: "/chat.png"
    },
    {
        title: "Advanced Product Management Suite",
        desc: "Organize products, streamline catalogs, and manage your business inventory with precision using powerful automation and structured controls.",
        img: "/catalogue.png"
    },
    {
        title: "AI Business Assistant & Market Sharing",
        desc: "Boost productivity with Malvin’s intelligent AI assistant while sharing products, ideas, and business opportunities across connected marketplaces.",
        img: "/aiqr.png"
    },
    {
        title: "Secure Verification & Trust System",
        desc: "Build customer confidence with a professional verification system designed to enhance authenticity, security, and brand credibility.",
        img: "/verify.png"
    },
    {
        title: "Personalized Workspace Settings",
        desc: "Customize your Malvin experience with flexible settings, smart preferences, and optimized controls tailored to your business workflow.",
        img: "/settings.png"
    }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1.2fr 0.8fr', // Split screen layout
      width: '100%',
      height: '100%',
      gap: '40px',
      position: 'relative'
    }}>
      
      {/* --- SCROLLABLE CONTAINER FOR APP FEATURES --- */}
      <div className="explore-scroll-container" style={{
        height: '100%',
        overflowY: 'auto',
        paddingRight: '25px',
        boxSizing: 'border-box'
      }}>
        
        {/* Intro Tag */}
        <div className="animate-reveal" style={{
          fontSize: '0.85rem',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          color: '#00d4ff',
          fontWeight: '700',
          marginBottom: '40px',
          textAlign: 'left'
        }}>
          // Inside the Malvin Interface
        </div>

        {/* Feature List (Alternating Layouts) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '60px', paddingBottom: '100px' }}>
          {features.map((item, index) => {
            const isEven = index % 2 === 0;
            return (
              <div 
                key={index} 
                className="animate-reveal"
                style={{
                  display: 'flex',
                  flexDirection: isEven ? 'row' : 'row-reverse',
                  alignItems: 'center',
                  gap: '40px',
                  background: 'rgba(255, 255, 255, 0.01)',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  borderRadius: '24px',
                  padding: '32px',
                  backdropFilter: 'blur(15px)',
                  boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.05)'
                }}
              >
                {/* App Screenshot Box - Rendered to display real image assets */}
                <div style={{
                  flex: 1.2,
                  borderRadius: '14px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  overflow: 'hidden',
                  background: '#0a0814',
                  boxShadow: '0 20px 45px rgba(0,0,0,0.7)',
                  aspectRatio: '16/10'
                }}>
                  <img 
                    src={item.img} 
                    alt={item.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block'
                    }}
                    onError={(e) => {
                      // Fallback mechanism in case path breaks during build testing
                      e.target.style.display = 'none';
                      e.target.parentNode.innerHTML = `
                        <div style="height: 100%; width: 100%; background: linear-gradient(135deg, #1e1b4b, #090514); display: flex; align-items: center; justify-content: center;">
                          <span style="color: rgba(255,255,255,0.3); font-size: 0.85rem; font-weight: 500;">[ Missing ${item.img} Asset ]</span>
                        </div>
                      `;
                    }}
                  />
                </div>

                {/* Catchy Description Block */}
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <h3 style={{ fontSize: '1.6rem', fontWeight: '800', marginBottom: '14px', color: '#fff', letterSpacing: '-0.5px' }}>
                    {item.title}
                  </h3>
                  <p style={{ fontSize: '0.95rem', color: 'rgba(255,255,255,0.45)', lineHeight: '1.6', fontWeight: '400' }}>
                    {item.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- RIGHT-SIDE AI IMAGE OVERLAY CONTAINER --- */}
      <div style={{
        position: 'relative',
        height: '100%',
        width: '100%',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
        pointerEvents: 'none'
      }}>
        <img 
          src={aiWomanUrl} 
          alt="" 
          style={{
            height: '105%', 
            width: 'auto',
            objectFit: 'contain',
            position: 'absolute',
            bottom: '-10px',
            right: '-60px', 
            opacity: 0.9,
            zIndex: 5
          }} 
        />
      </div>

    </div>
  );
};

export default Explore;