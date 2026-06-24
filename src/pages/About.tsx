import React from 'react';
import { Helmet } from "react-helmet-async";

const About = () => {
    return (
        <>
            <Helmet>
                <title>About Malvin AI | Business Operating System</title>
                <meta name="description" content="Learn more about Malvin and our mission to help businesses grow and scale." />
                <link rel="canonical" href="https://malvinai.com/about" />
            </Helmet>
            <div className="animate delay-1" style={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            flex: 1, 
            padding: '40px 60px',
            overflowY: 'auto',
            maxHeight: 'calc(100vh - 200px)' // Prevents layout overflow
            }}>
                <div style={{ maxWidth: '800px', width: '100%', textAlign: 'left' }}>
                    
                    {/* --- HEADER --- */}
                    <h2 style={{ 
                    fontSize: '3rem', 
                    fontWeight: '800', 
                    marginBottom: '24px',
                    background: 'linear-gradient(90deg, #ffffff 50%, #a855f7 100%)',
                    WebkitBackgroundClip: 'text', 
                    WebkitTextFillColor: 'transparent'
                    }}>
                    About Malvin
                    </h2>
                    
                    {/* --- INTRO PARAGRAPHS --- */}
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem', lineHeight: '1.7', marginBottom: '40px' }}>
                    <p style={{ marginBottom: '16px' }}>
                        Malvin is a Multi-vendor commerce platform designed to help businesses grow, organize, and scale more effectively. With over <strong>95% of the tools and functions</strong> most businesses need—from online stores and digital services to physical businesses—Malvin provides a powerful, centralized workspace for managing operations.
                    </p>
                    <p style={{ marginBottom: '16px' }}>
                        Built with real-time collaboration, intelligent control systems, integrated communication tools, and an AI assistant that prioritizes your brand, Malvin gives businesses everything they need to operate efficiently from a single platform.
                    </p>
                    <p>
                        Whether you're launching a startup, managing a growing company, or optimizing an established business, Malvin is designed for seamless integration with your existing workflow. Getting started is simple, and adapting Malvin to your business requires minimal effort.
                    </p>
                    </div>

                    {/* --- VISION SECTION --- */}
                    <div style={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.02)', 
                    border: '1px solid rgba(255, 255, 255, 0.08)', 
                    borderRadius: '16px', 
                    padding: '30px', 
                    marginBottom: '40px' 
                    }}>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '12px', color: '#fff' }}>Founded with a Vision</h3>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '1.05rem', lineHeight: '1.6' }}>
                        Malvin was founded by young entrepreneur <strong>Praise Eloghosaruwen Imasuen</strong> with a clear mission: to help businesses reach their highest potential through better structure, smarter tools, and intelligent automation.
                    </p>
                    </div>

                    {/* --- WHY CHOOSE MALVIN --- */}
                    <h3 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '16px', color: '#fff' }}>Why Choose Malvin?</h3>
                    <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '1.05rem', marginBottom: '20px' }}>
                    Because every business deserves a workspace built around its unique needs.
                    </p>

                    <ul style={{ 
                    listStyleType: 'none', 
                    padding: 0, 
                    margin: '0 0 30px 0', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '12px' 
                    }}>
                    {[
                        "A personalized business environment tailored to your operations",
                        "Powerful AI assistance that understands and prioritizes your brand",
                        "Real-time management and communication tools",
                        "Seamless integration with existing business processes",
                        "A scalable foundation for long-term growth"
                    ].map((item, index) => (
                        <li key={index} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', color: 'rgba(255,255,255,0.7)', fontSize: '1.05rem' }}>
                        <span style={{ color: '#06b6d4', fontWeight: 'bold' }}>•</span>
                        {item}
                        </li>
                    ))}
                    </ul>

                    <p style={{ 
                    fontSize: '1.1rem', 
                    fontWeight: '600', 
                    color: '#06b6d4', 
                    borderTop: '1px solid rgba(255,255,255,0.1)', 
                    paddingTop: '20px' 
                    }}>
                    Your business deserves more than scattered tools. Malvin brings everything together in one intelligent workspace.
                    </p>

                </div>
            </div>
        </>
    );
};

export default About;