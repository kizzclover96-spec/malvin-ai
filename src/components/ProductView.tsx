import React from 'react';

// Define the style inside the file so it doesn't break
const cardStyle: React.CSSProperties = { 
    background: 'rgba(255, 255, 255, 0.03)', 
    border: '1px solid rgba(255, 255, 255, 0.08)', 
    borderRadius: '24px', 
    padding: '16px', 
    backdropFilter: 'blur(10px)', 
    width: '200px', 
    height: 'auto', 
    marginBottom: '10px',
    position: 'relative',
    transition: 'transform 0.2s ease'
};

interface ProductCardProps {
    item: any;
    onAddToCart: (item: any) => void;
}

export const ProductCard = ({ item, onAddToCart }: ProductCardProps) => (
    <div style={cardStyle}>
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
            {item.currency}{item.price}
        </span>
        <button 
            onClick={() => onAddToCart(item)}
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