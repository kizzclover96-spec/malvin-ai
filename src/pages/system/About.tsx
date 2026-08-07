import React from 'react';
import { Helmet } from "react-helmet-async";

const About = () => {
    return (
        <>
            <Helmet>
                <title>About Malvin AI | Shop • Connect • Share</title>
                <meta name="description" content="Malvin AI is an intelligent commerce and connection platform designed to bring businesses and customers closer than ever before." />
                <link rel="canonical" href="https://malvinai.com/about" />
            </Helmet>
            <div className="animate delay-1" style={{ 
                display: 'flex', 
                flexDirection: 'column',
                alignItems: 'center', 
                minHeight: '100vh',
                width: '100%',
                padding: '40px 24px 80px 24px',
                boxSizing: 'border-box'
            }}>
                <div style={{ maxWidth: '800px', width: '100%', textAlign: 'left' }}>
                    
                    {/* --- HEADER --- */}
                    <h2 style={{ 
                        fontSize: '3rem', 
                        fontWeight: '800', 
                        marginBottom: '12px',
                        background: 'linear-gradient(90deg, #ffffff 50%, #a855f7 100%)',
                        WebkitBackgroundClip: 'text', 
                        WebkitTextFillColor: 'transparent'
                    }}>
                        About Malvin AI
                    </h2>

                    <h3 style={{
                        fontSize: '1.4rem',
                        fontWeight: '600',
                        color: '#06b6d4',
                        marginBottom: '32px'
                    }}>
                        Bridging the Gap Between Businesses and Customers
                    </h3>
                    
                    {/* --- MAIN INTRO --- */}
                    <p style={{ 
                        fontSize: '1.15rem', 
                        lineHeight: '1.7', 
                        color: 'rgba(255, 255, 255, 0.85)', 
                        marginBottom: '20px' 
                    }}>
                        Malvin AI is an intelligent commerce and connection platform designed to bring businesses and customers closer than ever before.
                    </p>

                    <p style={{ 
                        fontSize: '1.05rem', 
                        lineHeight: '1.7', 
                        color: 'rgba(255, 255, 255, 0.7)', 
                        marginBottom: '20px' 
                    }}>
                        In today's world, many businesses struggle to reach new customers, manage their operations efficiently, and adapt to changing digital expectations. At the same time, customers often struggle to discover trusted businesses, access services easily, and build meaningful connections with brands around them.
                    </p>

                    <p style={{ 
                        fontSize: '1.1rem', 
                        fontWeight: '600',
                        color: '#ffffff', 
                        marginBottom: '20px' 
                    }}>
                        Malvin AI was created to solve this gap.
                    </p>

                    <p style={{ 
                        fontSize: '1.05rem', 
                        lineHeight: '1.7', 
                        color: 'rgba(255, 255, 255, 0.7)', 
                        marginBottom: '36px' 
                    }}>
                        By combining artificial intelligence, digital commerce tools, and smart discovery technology, Malvin creates a seamless environment where businesses can grow, manage, and connect — while customers can discover, interact, and experience businesses in a smarter way.
                    </p>

                    {/* --- SECTION 1 --- */}
                    <h3 style={{ 
                        fontSize: '1.6rem', 
                        fontWeight: '700', 
                        color: '#ffffff', 
                        marginTop: '32px', 
                        marginBottom: '16px' 
                    }}>
                        Built for Businesses. Designed for Customers.
                    </h3>

                    <p style={{ 
                        fontSize: '1.05rem', 
                        lineHeight: '1.7', 
                        color: 'rgba(255, 255, 255, 0.7)', 
                        marginBottom: '16px' 
                    }}>
                        Whether you are a small business looking for new ways to expand, a growing brand searching for better organization, or an established company improving customer engagement, Malvin AI provides the tools to help you move forward.
                    </p>

                    <p style={{ 
                        fontSize: '1.05rem', 
                        lineHeight: '1.7', 
                        color: 'rgba(255, 255, 255, 0.7)', 
                        marginBottom: '16px' 
                    }}>
                        Businesses can create their digital presence, manage products and services, communicate with customers, organize teams, and explore new ways of reaching their audience — all from one connected platform.
                    </p>

                    <p style={{ 
                        fontSize: '1.05rem', 
                        lineHeight: '1.7', 
                        color: 'rgba(255, 255, 255, 0.7)', 
                        marginBottom: '36px' 
                    }}>
                        Customers can discover nearby Malvin-supported businesses, explore products and services, communicate directly with brands, make bookings, place orders, and experience a more connected way of interacting with local businesses.
                    </p>

                    {/* --- SECTION 2 --- */}
                    <h3 style={{ 
                        fontSize: '1.6rem', 
                        fontWeight: '700', 
                        color: '#ffffff', 
                        marginTop: '32px', 
                        marginBottom: '16px' 
                    }}>
                        Discover Businesses Around You with VINQR & Vinscanner
                    </h3>

                    <p style={{ 
                        fontSize: '1.05rem', 
                        lineHeight: '1.7', 
                        color: 'rgba(255, 255, 255, 0.7)', 
                        marginBottom: '16px' 
                    }}>
                        Malvin AI introduces a smarter way to discover the world around you.
                    </p>

                    <p style={{ 
                        fontSize: '1.05rem', 
                        lineHeight: '1.7', 
                        color: 'rgba(255, 255, 255, 0.7)', 
                        marginBottom: '16px' 
                    }}>
                        With VINQR and Vinscanner technology, customers can scan and discover Malvin-certified businesses nearby, explore their profiles, view available services, and connect instantly.
                    </p>

                    <p style={{ 
                        fontSize: '1.05rem', 
                        lineHeight: '1.7', 
                        color: 'rgba(255, 255, 255, 0.7)', 
                        marginBottom: '36px' 
                    }}>
                        Instead of searching endlessly for businesses, Malvin helps bring the right businesses closer to the right customers.
                    </p>

                    {/* --- SECTION 2.5: CATEGORIES --- */}
                    <h3 style={{ 
                        fontSize: '1.6rem', 
                        fontWeight: '700', 
                        color: '#ffffff', 
                        marginTop: '32px', 
                        marginBottom: '16px' 
                    }}>
                        Five Categories, One App
                    </h3>

                    <p style={{ 
                        fontSize: '1.05rem', 
                        lineHeight: '1.7', 
                        color: 'rgba(255, 255, 255, 0.7)', 
                        marginBottom: '20px' 
                    }}>
                        Malvin currently supports Food, Salon, Hotel, Mechanic, and Service businesses — each with its own storefront experience built around how that kind of business actually operates, from ordering off a live menu to requesting a repair quote and flagging how urgent it is.
                    </p>

                    <p style={{ 
                        fontSize: '1.05rem', 
                        lineHeight: '1.7', 
                        color: 'rgba(255, 255, 255, 0.7)', 
                        marginBottom: '36px' 
                    }}>
                        A single owner can even run more than one — a Food account and a Salon account under the same person are still treated as two completely independent businesses, each with its own page, its own rating, and its own place in a customer's history.
                    </p>

                    {/* --- SECTION 2.6: NO APP STORE NEEDED --- */}
                    <h3 style={{ 
                        fontSize: '1.6rem', 
                        fontWeight: '700', 
                        color: '#ffffff', 
                        marginTop: '32px', 
                        marginBottom: '16px' 
                    }}>
                        Get Started Without an App Store
                    </h3>

                    <p style={{ 
                        fontSize: '1.05rem', 
                        lineHeight: '1.7', 
                        color: 'rgba(255, 255, 255, 0.7)', 
                        marginBottom: '36px' 
                    }}>
                        Scanning a Malvin link opens straight in your browser first, so you can see a business's details before installing anything. Android offers a one-tap install; iPhone users can add Malvin to their Home Screen from Safari and use it like a full app — including real push notifications — no App Store required.
                    </p>

                    {/* --- SECTION 3: FEATURES LIST --- */}
                    <h3 style={{ 
                        fontSize: '1.6rem', 
                        fontWeight: '700', 
                        color: '#ffffff', 
                        marginTop: '32px', 
                        marginBottom: '16px' 
                    }}>
                        Powerful Tools for Modern Businesses
                    </h3>

                    <p style={{ 
                        fontSize: '1.05rem', 
                        lineHeight: '1.7', 
                        color: 'rgba(255, 255, 255, 0.7)', 
                        marginBottom: '20px' 
                    }}>
                        Malvin AI provides businesses with a complete digital workspace designed for growth:
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '36px' }}>
                        <div>
                            <h4 style={{ fontSize: '1.15rem', color: '#06b6d4', fontWeight: '700', marginBottom: '4px' }}>
                                • Business Management
                            </h4>
                            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', lineHeight: '1.6' }}>
                                Manage products, services, and important business operations from one centralized environment.
                            </p>
                        </div>

                        <div>
                            <h4 style={{ fontSize: '1.15rem', color: '#06b6d4', fontWeight: '700', marginBottom: '4px' }}>
                                • Team Hub
                            </h4>
                            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', lineHeight: '1.6' }}>
                                Connect your entire team in one personalized workspace. Managers can communicate, assign tasks, and monitor workflows while keeping everyone aligned.
                            </p>
                        </div>

                        <div>
                            <h4 style={{ fontSize: '1.15rem', color: '#06b6d4', fontWeight: '700', marginBottom: '4px' }}>
                                • Customer Engagement
                            </h4>
                            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', lineHeight: '1.6' }}>
                                Build stronger relationships through communication tools, ratings, and digital interactions that help businesses improve trust and customer experience.
                            </p>
                        </div>

                        <div>
                            <h4 style={{ fontSize: '1.15rem', color: '#06b6d4', fontWeight: '700', marginBottom: '4px' }}>
                                • Smart Business Growth
                            </h4>
                            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1rem', lineHeight: '1.6' }}>
                                Whether you are starting a new business or expanding an existing brand, Malvin provides tools designed to help you reach more customers and operate more efficiently.
                            </p>
                        </div>
                    </div>

                    {/* --- SECTION 4 --- */}
                    <h3 style={{ 
                        fontSize: '1.6rem', 
                        fontWeight: '700', 
                        color: '#ffffff', 
                        marginTop: '32px', 
                        marginBottom: '16px' 
                    }}>
                        Powered by Artificial Intelligence
                    </h3>

                    <p style={{ 
                        fontSize: '1.05rem', 
                        lineHeight: '1.7', 
                        color: 'rgba(255, 255, 255, 0.7)', 
                        marginBottom: '16px' 
                    }}>
                        AI is at the heart of Malvin.
                    </p>

                    <p style={{ 
                        fontSize: '1.05rem', 
                        lineHeight: '1.7', 
                        color: 'rgba(255, 255, 255, 0.7)', 
                        marginBottom: '16px' 
                    }}>
                        Our intelligent systems help create smarter interactions between businesses and customers by improving discovery, organization, and digital experiences.
                    </p>

                    <p style={{ 
                        fontSize: '1.05rem', 
                        lineHeight: '1.7', 
                        color: 'rgba(255, 255, 255, 0.7)', 
                        marginBottom: '36px' 
                    }}>
                        Malvin AI is designed to make technology easier to use, helping businesses focus on what matters most — serving their customers and growing their brand.
                    </p>

                    {/* --- SECTION 5 --- */}
                    <h3 style={{ 
                        fontSize: '1.6rem', 
                        fontWeight: '700', 
                        color: '#ffffff', 
                        marginTop: '32px', 
                        marginBottom: '16px' 
                    }}>
                        Our Vision
                    </h3>

                    <p style={{ 
                        fontSize: '1.05rem', 
                        lineHeight: '1.7', 
                        color: 'rgba(255, 255, 255, 0.7)', 
                        marginBottom: '16px' 
                    }}>
                        Malvin AI is building the future of connected commerce.
                    </p>

                    <p style={{ 
                        fontSize: '1.05rem', 
                        lineHeight: '1.7', 
                        color: 'rgba(255, 255, 255, 0.7)', 
                        marginBottom: '16px' 
                    }}>
                        Our vision is to create a global system where anyone, anywhere, can discover, connect, and interact with businesses effortlessly.
                    </p>

                    <p style={{ 
                        fontSize: '1.05rem', 
                        lineHeight: '1.7', 
                        color: 'rgba(255, 255, 255, 0.7)', 
                        marginBottom: '16px' 
                    }}>
                        Imagine entering a new country and being able to discover local businesses, understand their services, communicate, order, book, and complete payments without worrying about barriers such as location or currency.
                    </p>

                    <p style={{ 
                        fontSize: '1.05rem', 
                        lineHeight: '1.7', 
                        color: 'rgba(255, 255, 255, 0.7)', 
                        marginBottom: '36px' 
                    }}>
                        Malvin AI aims to make global commerce more accessible, connected, and intelligent.
                    </p>

                    {/* --- SECTION 6 --- */}
                    <h3 style={{ 
                        fontSize: '1.6rem', 
                        fontWeight: '700', 
                        color: '#ffffff', 
                        marginTop: '32px', 
                        marginBottom: '16px' 
                    }}>
                        A Platform Built on Connection
                    </h3>

                    <p style={{ 
                        fontSize: '1.05rem', 
                        lineHeight: '1.7', 
                        color: 'rgba(255, 255, 255, 0.7)', 
                        marginBottom: '16px' 
                    }}>
                        Malvin AI serves as a technology platform connecting customers with independent businesses and brands. Businesses remain responsible for their own products, services, and customer experiences.
                    </p>

                    <p style={{ 
                        fontSize: '1.05rem', 
                        lineHeight: '1.7', 
                        color: 'rgba(255, 255, 255, 0.7)', 
                        marginBottom: '36px' 
                    }}>
                        For safety and the best experience, users should only interact with official Malvin-generated VINQR codes and links. Malvin-certified codes and links help ensure a trusted connection between customers and businesses.
                    </p>

                    {/* --- SECTION 7 --- */}
                    <h3 style={{ 
                        fontSize: '1.6rem', 
                        fontWeight: '700', 
                        color: '#ffffff', 
                        marginTop: '32px', 
                        marginBottom: '16px' 
                    }}>
                        Founded With a Vision
                    </h3>

                    <p style={{ 
                        fontSize: '1.05rem', 
                        lineHeight: '1.7', 
                        color: 'rgba(255, 255, 255, 0.7)', 
                        marginBottom: '20px' 
                    }}>
                        Malvin AI was founded by young entrepreneur Praise Eloghosaruwen Imasuen with a mission to empower businesses with smarter technology and create better connections between brands and people.
                    </p>

                    <div style={{ 
                        background: 'rgba(6, 182, 212, 0.05)', 
                        borderLeft: '4px solid #06b6d4', 
                        padding: '16px 20px', 
                        borderRadius: '0 12px 12px 0',
                        marginBottom: '36px' 
                    }}>
                        <p style={{ fontSize: '1rem', fontWeight: '600', color: '#ffffff', marginBottom: '8px' }}>
                            The goal is simple:
                        </p>
                        <p style={{ fontSize: '1.05rem', color: '#06b6d4', fontWeight: '700', margin: 0 }}>
                            Help businesses grow. Help customers discover. Build a smarter connected world.
                        </p>
                    </div>

                    {/* --- FOOTER TAGLINE --- */}
                    <p style={{ 
                        fontSize: '1.2rem', 
                        fontWeight: '700', 
                        color: '#06b6d4', 
                        borderTop: '1px solid rgba(255,255,255,0.1)', 
                        paddingTop: '24px',
                        textAlign: 'center'
                    }}>
                        Malvin AI — Shop • Connect • Share
                    </p>

                </div>
            </div>
        </>
    );
};

export default About;