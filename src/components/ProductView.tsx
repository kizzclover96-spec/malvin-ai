import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { ref as dbRef, onValue } from "firebase/database";

// Define the style inside the file so it doesn't break
const cardStyle: React.CSSProperties = { 
    background: 'rgba(255, 255, 255, 0.03)', 
    border: '1px solid rgba(255, 255, 255, 0.08)', 
    borderRadius: '24px', 
    padding: '16px', 
    backdropFilter: 'blur(10px)', 
    width: '100%', // Changed to 100% to fill the grid layout seamlessly
    height: 'auto', 
    marginBottom: '10px',
    position: 'relative', // Vital for absolute badge positioning
    transition: 'transform 0.2s ease'
};

// Styling for the absolute star rating badge
const ratingBadgeStyle: React.CSSProperties = {
    position: 'absolute',
    top: '24px', // Standardized offset spacing relative to the card container
    right: '24px',
    background: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(4px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '12px',
    padding: '4px 8px',
    color: '#C5FF41',
    fontSize: '11px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    zIndex: 2
};

interface ProductCardProps {
    item: any;
    onAddToCart: (item: any) => void;
}

export const ProductCard = ({ item, onAddToCart }: ProductCardProps) => {
    const [averageRating, setAverageRating] = useState<string | null>(null);

    // Dynamic real-time listening for individual item review statistics
    useEffect(() => {
        // Safe access check for required scope params
        if (!item?.id) return;

        // Use the brandId context from the parent array dataset parsing scope
        // If the brandId property structure exists directly inside item object config
        const targetUid = item.uid || item.brandId || window.location.pathname.split('/')[2]; 
        if (!targetUid) return;

        const itemReviewsRef = dbRef(db, `users/${targetUid}/reviews/${item.id}`);
        const unsubscribe = onValue(itemReviewsRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const reviewsList = Object.values(data) as any[];
                const total = reviewsList.reduce((acc, current) => acc + (current.rating || 0), 0);
                const avg = total / reviewsList.length;
                setAverageRating(avg.toFixed(1));
            } else {
                setAverageRating(null); // Explicit fallback context state
            }
        });

        return () => unsubscribe();
    }, [item]);

    return (
        <div style={cardStyle} onClick={(e) => e.stopPropagation}>
            {/* Conditional star metric floating element wrapper context render logic */}
            {averageRating && (
                <div style={ratingBadgeStyle}>
                    <span>★</span>
                    <span>{averageRating}</span>
                </div>
            )}

            <div style={{ 
                width: '100%', 
                height: '120px', 
                borderRadius: '12px', 
                background: '#111', 
                marginBottom: '10px',
                backgroundImage: `url(${item.image})`, 
                backgroundSize: 'cover', 
                backgroundPosition: 'center'
            }} />
            <h3 style={{ fontSize: '14px', margin: '0', color: 'white' }}>{item.name}</h3>
            <span style={{ color: '#C5FF41', fontWeight: 700, fontSize: '12px' }}>
                {item.currency || '€'}{item.price}
            </span>
            <button 
                onClick={(e) => {
                    e.stopPropagation(); // Prevents opening the overlay modal sheet accidentally when tapping order button
                    onAddToCart(item);
                }}
                style={{
                    marginTop: '10px', 
                    width: '100%', 
                    background: '#C5FF41', 
                    border: 'none', 
                    padding: '8px', 
                    borderRadius: '8px', 
                    fontWeight: 'bold', 
                    cursor: 'pointer', 
                    fontSize: '11px',
                    color: 'black'
                }}
            >
                🛒 ADD TO ORDER
            </button>
        </div>
    );
};