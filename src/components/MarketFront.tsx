import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { ref as dbRef, onValue, set, push, update, get } from "firebase/database";
import { ProductCard } from './ProductView';
import CustomerChat from './CustomerChat';
import Report from "./report";
import ReputationScore from "./reputationScore";
import {
    doc, collection,
    onSnapshot
} from "firebase/firestore";

import { firestore } from "../firebase";
import { updateUserTrust } from "./trustEngine";

// Reusable Verified Badge Component
const VerifiedBadge = () => (
    <svg 
        width="14" 
        height="14" 
        viewBox="0 0 24 24" 
        fill="#007fff" 
        style={{ display: 'inline-block', marginLeft: '6px', verticalAlign: 'middle' }}
    >
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
    </svg>
);

const MarketFront = ({ brandId: propBrandId, userBrand, brandName }: { brandId?: string, userBrand?: any, brandName?: string }) => {
    const { brandId: urlBrandId } = useParams();
    const brandId = propBrandId || urlBrandId;

    const [selectedDate, setSelectedDate] = useState("");
    const [selectedTime, setSelectedTime] = useState("");
    const [customerName, setCustomerName] = useState(""); // Recommended for business visibility
    
    // Config states from brand profile
    const [maxBookingsPerDay, setMaxBookingsPerDay] = useState<number>(0);
    const [unavailableDates, setUnavailableDates] = useState<string[]>([]);
    const [rawBookings, setRawBookings] = useState<any[]>([]);
    const [bookedDates, setBookedDates] = useState<string[]>([]);
    const [view, setView] = useState<'market' | 'chat' | 'booking'>('market');
    
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [brand, setBrand] = useState<any>(userBrand || null);
    const [catalog, setCatalog] = useState<any[]>([]);
    const [orderModal, setOrderModal] = useState<any>(null);
    const [pendingOrder, setPendingOrder] = useState<any>(null);
    const [quantity, setQuantity] = useState(1);
    const [isLocked, setIsLocked] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

    // Review / Comment Input States
    const [reviews, setReviews] = useState<any[]>([]);
    const [commentText, setCommentText] = useState('');
    const [ratingScore, setRatingScore] = useState(5);
    const [reviewerName, setReviewerName] = useState('');
    const [showReviewForm, setShowReviewForm] = useState(false); 
    const [showReport, setShowReport] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const currentUid = auth.currentUser?.uid;

    // Dynamic Profile States (Bio & Meta Verification)
    const [bio, setBio] = useState('');
    const [isVerified, setIsVerified] = useState(false);

    const [activeShipment, setActiveShipment] = useState<any>(null);
    const [showShipmentBubble, setShowShipmentBubble] = useState(false);
    const [shipmentCardOpen, setShipmentCardOpen] = useState(false);

    
    const [trustScore, setTrustScore] = useState(50);
    const [trustStatus, setTrustStatus] = useState<"green" | "yellow" | "red">("yellow");

    useEffect(() => {
        const link = document.querySelector("link[rel='manifest']");
        if (link) link.setAttribute("href", "/market-manifest.json");
    }, []);

    // Sync Panic Button/System Settings
    useEffect(() => {
        const settingsRef = dbRef(db, 'system_settings');
        const unsubscribe = onValue(settingsRef, (snapshot) => {
            const data = snapshot.val();
            if (data && data.market_lockdown === true) {
                setIsLocked(true);
            } else {
                setIsLocked(false);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!brandId) return;

        const trustRef = dbRef(db, `users/${brandId}/trust`);

        const unsubscribe = onValue(trustRef, (snap) => {
            const data = snap.val();

            if (!data) {
                setTrustScore(100);
                setTrustStatus("green");
                return;
            }

            setTrustScore(data.score ?? 50);
            setTrustStatus(data.status ?? "yellow");
        });

        return () => unsubscribe();
    }, [brandId]);

    // Sync Booked Dates
    // 1. Sync Profile configurations & Bookings Data
    useEffect(() => {
        if (!brandId) return;

        const profilePath = dbRef(db, `users/${brandId}/profile`);
        const bookingsPath = dbRef(db, `users/${brandId}/bookings`);

        const unsubscribeProfile = onValue(profilePath, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setMaxBookingsPerDay(data.maxBookingsPerDay || 0);
                setUnavailableDates(data.unavailableDates || []);
            }
        });

        const unsubscribeBookings = onValue(bookingsPath, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const bookingsList = Object.values(data);
                setRawBookings(bookingsList);
                
                // Map out unique date keys for quick rendering metrics
                const dates = bookingsList.filter((b: any) => b?.date).map((b: any) => b.date);
                setBookedDates(dates);
            } else {
                setRawBookings([]);
                setBookedDates([]);
            }
        });

        return () => {
            unsubscribeProfile();
            unsubscribeBookings();
        };
    }, [brandId]);

    // Sync Brand Profile
    useEffect(() => {
        if (!brandId) return;
        const profilePath = dbRef(db, `users/${brandId}/profile`);
        const unsubscribe = onValue(profilePath, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setBio(data.bio || '');
                setIsVerified(data.isVerified || false);
            }
        });
        return () => unsubscribe();
    }, [brandId]);

    // Sync Brand Identity and Catalog
    useEffect(() => {
        if (!brandId) return;
        const brandPath = dbRef(db, `users/${brandId}/brandData`);
        const unsubscribeBrand = onValue(brandPath, (snapshot) => {
            setBrand(snapshot.val() || { name: "Store" });
        });

        const catalogPath = dbRef(db, `users/${brandId}/catalog`);
        const unsubscribeCatalog = onValue(catalogPath, (snapshot) => {
            const data = snapshot.val();
            setCatalog(data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : []);
        });

        return () => {
            unsubscribeBrand();
            unsubscribeCatalog();
        };
    }, [brandId]);

    // Real-time listener for reviews when a product is clicked open
    useEffect(() => {
        if (!brandId || !selectedProduct) {
            setReviews([]);
            setShowReviewForm(false); 
            return;
        }

        const reviewsPath = dbRef(db, `reviews/${brandId}/${selectedProduct.id}`);
        const unsubscribeReviews = onValue(reviewsPath, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const fetchedReviews = Object.keys(data).map(key => ({
                    id: key,
                    ...data[key]
                }));
                setReviews(fetchedReviews.reverse());
            } else {
                setReviews([]);
            }
        });

        return () => unsubscribeReviews();
    }, [brandId, selectedProduct]);

    const getTrustColor = (status: string) => {
        if (status === "green") return "#C5FF41";
        if (status === "red") return "#ff3b3b";
        return "#ffcc00";
    };

    // Handler to submit a review/comment
    const handlePostReview = async (e: React.FormEvent) => {
        if (!brandId) return;
        await updateUserTrust(brandId);
        e.preventDefault();
        if (!commentText.trim()) return;

        const reviewsPath = dbRef(
            db,
            `reviews/${brandId}/${selectedProduct.id}`
        );

        const newReviewRef = push(reviewsPath);

        await set(newReviewRef, {
            name: reviewerName.trim() || "Anonymous User",
            comment: commentText.trim(),
            rating: Number(ratingScore),
            likes: {},
            timestamp: Date.now()
        });

        await updateUserTrust(brandId);
        

        setCommentText('');
        setReviewerName('');
        setRatingScore(5);
        setShowReviewForm(false);
    };

    // Handler to increment likes on comments
    const handleLikeComment = async (reviewId: string) => {
        if (!brandId) return;
        await updateUserTrust(brandId);
        let visitorId = localStorage.getItem("visitorId");

        if (!visitorId) {
            visitorId = crypto.randomUUID();
            localStorage.setItem("visitorId", visitorId);
        }

        const likeRef = dbRef(
            db,
            `reviews/${brandId}/${selectedProduct.id}/${reviewId}/likes/${visitorId}`
        );

        const snap = await get(likeRef);

        if (!snap.exists()) {
            await set(likeRef, true);
            await updateUserTrust(brandId);
        }
    };

    // Aggregate rating statistics
    const reviewCount = reviews.length;
    const averageRating = reviewCount > 0 
        ? (reviews.reduce((acc, curr) => acc + curr.rating, 0) / reviewCount).toFixed(1)
        : null;

    // 2. Validate Constraints and Save Session
    const handleBookSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!selectedDate || !selectedTime) {
            alert("Please select both a date and a time.");
            return;
        }

        // Rule A: Check Blackout/Unavailable Dates Configuration
        if (unavailableDates.includes(selectedDate)) {
            alert("This date has been marked as unavailable by the host.");
            return;
        }

        // Rule B: Check capacity limit for this specific day
        if (maxBookingsPerDay > 0) {
            const totalBookingsForDay = rawBookings.filter((b) => b.date === selectedDate).length;
            if (totalBookingsForDay >= maxBookingsPerDay) {
                alert(`Booking full! This date has reached its maximum capacity of ${maxBookingsPerDay} sessions.`);
                return;
            }
        }

        // Rule C: Optional Exact duplicate time block avoidance
        const timeSlotTaken = rawBookings.some((b) => b.date === selectedDate && b.time === selectedTime);
        if (timeSlotTaken) {
            alert("This specific time slot is already reserved. Please pick another hour.");
            return;
        }

        try {
            const bookingId = Date.now();
            const newBookingRef = dbRef(db, `users/${brandId}/bookings/${bookingId}`);
            
            await set(newBookingRef, {
                date: selectedDate,
                time: selectedTime,
                clientName: customerName || "Anonymous Client",
                timestamp: bookingId,
                status: "pending"
            });

            alert(`Success! Session reserved for ${selectedDate} at ${selectedTime}.`);
            
            // Reset local inputs
            setSelectedDate("");
            setSelectedTime("");
            setCustomerName("");
            setView("market");
        } catch (err) {
            console.error(err);
            alert("Booking failed. Try again.");
        }
    };

    const handleConfirmOrder = () => {
        if (!orderModal) return;
        localStorage.setItem('pendingOrder', JSON.stringify({
            ...orderModal,
            quantity: quantity
        }));
        setOrderModal(null);
        setView('chat');
    };

    useEffect(() => {
        const storageKey = `activeConversation_${brandId}`;
        const conversationId = localStorage.getItem(storageKey);

        if (!conversationId) return;

        const shipmentsRef = collection(
            firestore,
            "conversations",
            conversationId,
            "shipments"
        );
        console.log("Brand ID:", brandId);
        console.log("Storage Key:", storageKey);
        console.log("Conversation ID:", conversationId);

        const unsubscribe = onSnapshot(shipmentsRef, (snapshot) => {
            const shipments = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            if (shipments.length === 0) {
                setActiveShipment(null);
                setShowShipmentBubble(false);
                return;
            }

            const latest = shipments.sort(
                (a: any, b: any) =>
                    (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)
            )[0];

            setActiveShipment(latest);
            setShowShipmentBubble(true);

            console.log("Shipment received:", latest);
            console.log("Conversation ID:", conversationId);
            console.log("Shipment docs:", snapshot.docs.length);
        });
        console.log("Conversation ID:", conversationId); 

        return () => unsubscribe();
    }, [brandId]);

    if (view === 'booking') {
        return (
            <div style={{ position: 'relative', height: '100dvh', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
                <button onClick={() => setView('market')} style={backToMarketBtn}>← Back</button>
                
                <form onSubmit={handleBookSubmit} style={glassModal}>
                    <h2 style={{ color: '#C5FF41', marginBottom: '10px', fontSize: '20px' }}>RESERVE SESSION</h2>
                    <p style={{ fontSize: '11px', opacity: 0.5, marginBottom: '25px', letterSpacing: '1px' }}>CHOOSE AN OPEN TIMELINE</p>
                    
                    {/* Client Identity Input */}
                    <input 
                        type="text"
                        placeholder="Your Name / Identifier"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        style={{ ...quantityInput, fontSize: '14px', marginBottom: '15px', color: '#fff' }}
                        required
                    />

                    {/* Date Selection */}
                    <input 
                        type="date" 
                        value={selectedDate}
                        style={{...quantityInput, fontSize: '16px', marginBottom: '15px', color: '#fff'}} 
                        min={new Date().toISOString().split('T')[0]} 
                        onChange={(e) => setSelectedDate(e.target.value)}
                        required
                    />

                    {/* 🌟 INSTANT DETECTION WARNING */}
                    {selectedDate && unavailableDates.includes(selectedDate) && (
                        <div style={{ color: '#ff4444', fontSize: '12px', marginTop: '-10px', marginBottom: '15px', fontWeight: 600 }}>
                            🚫 This date is unavailable. Please choose another.
                        </div>
                    )}

                    {/* Time Selection Input */}
                    <input 
                        type="time" 
                        value={selectedTime}
                        style={{...quantityInput, fontSize: '16px', marginBottom: '20px', color: '#fff'}} 
                        onChange={(e) => setSelectedTime(e.target.value)}
                        required
                    />

                    {/* Action Execution Button */}
                    <button type="submit" style={{ ...secondaryBtnStyle, width: '100%', padding: '12px', background: '#C5FF41', color: '#000', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                        CONFIRM RESERVATION
                    </button>

                    <div style={{ fontSize: '11px', color: bookedDates.length > 0 ? '#C5FF41' : '#444', marginTop: '15px', textAlign: 'center' }}>
                        {bookedDates.length} TOTAL SYSTEM RESERVATIONS OUTSTANDING
                    </div>
                </form>
            </div>
        );
    }

    if (view === 'chat') {
        return (
            <div style={{ position: 'relative', height: '100dvh', backgroundColor: '#000' }}>
                <button onClick={() => { setOrderModal(null); setView('market'); }} style={backToMarketBtn}>← Back to Shop</button>
                <CustomerChat />
            </div>
        );
    }

    if (!brand) return <div style={loaderStyle}>INITIALIZING_MARKET...</div>;

    if (isLocked) {
        return (
            <div style={maintenanceContainer}>
                <div style={{ textAlign: 'center', padding: '40px' }}>
                    <h1 style={{ fontSize: '3rem', color: '#ff4d4d', marginBottom: '10px' }}>⚠️</h1>
                    <h2 style={{ letterSpacing: '2px', fontWeight: 900 }}>SYSTEM_OFFLINE</h2>
                    <p style={{ opacity: 0.5, fontSize: '12px', lineHeight: '1.6' }}>
                        The Malvin Market is currently undergoing security maintenance.<br/>
                        Please check back shortly.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div style={marketContainer}>
            <style>{`
                * { box-sizing: border-box; }
                @keyframes slideUp {
                    from { transform: translateY(100%); }
                    to { transform: translateY(0); }
                }
                body { overflow: hidden; background-color: black; margin: 0; }
                .scrolling-grid::-webkit-scrollbar, .modal-scroll-area::-webkit-scrollbar { width: 4px; }
                .scrolling-grid::-webkit-scrollbar-thumb, .modal-scroll-area::-webkit-scrollbar-thumb { background: rgba(195, 255, 65, 0.2); border-radius: 2px; }

                @keyframes shipmentPulse {
                    0%{
                        transform:scale(1);
                    }

                    50%{
                        transform:scale(1.08);
                    }

                    100%{
                        transform:scale(1);
                    }
                }

                @keyframes shipmentSlideUp{
                    from{
                        opacity:0;
                        transform:translateY(20px);
                    }

                    to{
                        opacity:1;
                        transform:translateY(0);
                    }
                }
            `}</style>

            <header style={headerStyle}>
                <div style={{ flex: 1, zIndex: 101, paddingRight: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}>
                        <h1 style={brandTitle}>{brand.name?.toUpperCase()}</h1>
                        {isVerified && <VerifiedBadge />}
                    </div>
                    {bio && <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#aaa', lineHeight: '1.4', fontWeight: 400 }}>{bio}</p>}
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px"
                    }}>
                        <span style={{
                            fontSize: "12px",
                            fontWeight: 700,
                            color:
                                trustStatus === "green"
                                    ? "#C5FF41"
                                    : trustStatus === "red"
                                    ? "#ff3b3b"
                                    : "#ffcc00"
                        }}>
                            TRUST: {trustScore}/100
                        </span>

                        <span
                            onClick={() => setShowReport(true)}
                            style={{
                                color: "#ff4d4d",
                                fontSize: "11px",
                                cursor: "pointer",
                                fontWeight: 700
                            }}
                        >
                            Report
                        </span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <button onClick={() => setView('booking')} style={bookingBtnStyle}>Book 🗓️</button>
                    <button onClick={() => setView('chat')} style={dmButton}>💬</button>
                </div>
            </header>

            <div style={productGrid} className="scrolling-grid">
                {catalog.length === 0 ? (
                    <div style={emptyState}>Catalog is empty.</div>
                ) : (
                    catalog.map((item: any) => (
                        <ProductCard 
                            key={item.id} 
                            item={item} 
                            brandId={brandId} 
                            onAddToCart={(it) => setOrderModal(it)} 
                            onClick={() => setSelectedProduct(item)}
                        />
                    ))
                )}
            </div>

            {/* EXPANDED INTERACTIVE DISPLAY INTERFACE */}
            {selectedProduct && (
                <div style={modalOverlay} onClick={() => setSelectedProduct(null)}>
                    <div style={bigDisplayCard} onClick={e => e.stopPropagation()}>
                        <div style={dragHandle} />
                        <button style={closeBtn} onClick={() => setSelectedProduct(null)}>✕</button>
                        
                        <div style={modalScrollArea} className="modal-scroll-area">
                            <img src={selectedProduct.image} style={bigImage} alt="" />
                            
                            <div style={{ padding: '24px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                    <h2 style={bigTitle}>{selectedProduct.name}</h2>
                                    <div style={bigPrice}>{selectedProduct.currency || '€'}{selectedProduct.price}</div>
                                </div>

                                <div style={ratingSummaryBar}>
                                    <span style={{ color: '#C5FF41', fontWeight: 700 }}>
                                        ★ {averageRating ? `${averageRating} / 5` : 'No reviews yet'}
                                    </span>
                                    <span style={{ color: '#666', fontSize: '12px' }}>
                                        {reviewCount > 0 ? `${reviewCount} ${reviewCount === 1 ? 'person' : 'people'} reviewed this product` : 'Be the first to review'}
                                    </span>
                                </div>

                                <p style={bigDescription}>{selectedProduct.details  || "Premium quality product."}</p>
                                
                                <button style={bigActionBtn} onClick={() => { setOrderModal(selectedProduct); setSelectedProduct(null); }}>
                                    ORDER THIS ITEM
                                </button>

                                <div style={divider} />

                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px",  gap: "10px", flexWrap: "wrap", }}>
                                    {/* LEFT: Title + count */}
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                      <h3 style={{  margin: 0,  fontSize: "12px",  letterSpacing: "1.5px", color: "#888", fontWeight: 700, }}  > REVIEWS & COMMENTS </h3>

                                      <span style={{ fontSize: "11px",  color: "#C5FF41", marginTop: "4px", fontWeight: 600, }}  > {reviewCount} {reviewCount === 1 ? "review" : "reviews"}</span>
                                    </div>

                                    {/* RIGHT: Actions */}
                                    <div style={{ display: "flex", gap: "8px",  alignItems: "center", }} >
                                        {/* Toggle comments */}
                                        <button
                                            onClick={() => setShowComments(!showComments)}
                                            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",  color: "#aaa",  padding: "8px 10px", borderRadius: "10px", fontSize: "11px", cursor: "pointer", transition: "0.2s ease", }} >
                                            {showComments ? "Hide" : "View"}
                                        </button>

                                        {/* Leave review CTA */}
                                        {!showReviewForm && (
                                        <button
                                            onClick={() => setShowReviewForm(true)}
                                            style={{ background: "linear-gradient(135deg, #C5FF41, #9BEA2E)",  border: "none", color: "#000", padding: "8px 12px", borderRadius: "10px", fontSize: "11px", fontWeight: 800, cursor: "pointer", boxShadow: "0 6px 18px rgba(197, 255, 65, 0.25)", }}  > ✍️ Review
                                        </button>
                                        )}
                                    </div>
                                </div>
                                
                                {showReviewForm && (
                                    <form onSubmit={handlePostReview} style={{ ...reviewForm, marginBottom: '20px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                                            <h4 style={{ margin: 0, fontSize: '13px', color: '#C5FF41' }}>LEAVE A REVIEW</h4>
                                            <button 
                                                type="button" 
                                                style={cancelReviewBtnStyle} 
                                                onClick={() => setShowReviewForm(false)}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                        
                                        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                                            <input 
                                                type="text" 
                                                placeholder="Your name" 
                                                value={reviewerName}
                                                onChange={(e) => setReviewerName(e.target.value)}
                                                style={reviewInput}
                                            />
                                            <select 
                                                value={ratingScore} 
                                                onChange={(e) => setRatingScore(Number(e.target.value))}
                                                style={ratingSelector}
                                            >
                                                <option value={5}>5 Stars ★★★★★</option>
                                                <option value={4}>4 Stars ★★★★</option>
                                                <option value={3}>3 Stars ★★★</option>
                                                <option value={2}>2 Stars ★★</option>
                                                <option value={1}>1 Star ★</option>
                                            </select>
                                        </div>

                                        <textarea 
                                            placeholder="Add your review comment here..." 
                                            rows={2}
                                            value={commentText}
                                            onChange={(e) => setCommentText(e.target.value)}
                                            style={reviewTextArea}
                                        />
                                        
                                        <button type="submit" style={submitReviewBtn}>
                                            POST COMMENT
                                        </button>
                                    </form>
                                )}
                                {showComments && (

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                                        {reviews.map((rev) => {
                                            const visitorId = localStorage.getItem("visitorId") || "";
                                            const hasLiked = rev.likes?.[visitorId];
                                            return (
                                                <div
                                                    key={rev.id}
                                                    style={{ ...commentCard, position: "relative", paddingRight: "60px" }}
                                                >
                                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }} >
                                                        <div>
                                                            <div
                                                                style={{  fontWeight: "bold", display: "flex", alignItems: "center", gap: "8px" }}
                                                            >   {rev.name}
                                                                <span style={{ color: "#C5FF41", fontSize: "13px" }} > {'★'.repeat(rev.rating)} </span>
                                                            </div>

                                                            <p style={{ ...commentTextBody, marginTop: "6px" }} > {rev.comment} </p>
                                                        </div>

                                                        <button
                                                            onClick={() => handleLikeComment(rev.id)}
                                                            style={{ background: "transparent", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                                                            <svg  width="20" height="20" viewBox="0 0 24 24" fill={hasLiked ? "#ff3040" : "none"} stroke={hasLiked ? "#ff3040" : "#ffffff"} strokeWidth="2" > <path d="M12 21s-6.7-4.35-9.33-8.12C.4 9.68 2.02 5.5 6.1 5.5c2.16 0 3.4 1.27 3.9 2.15.5-.88 1.74-2.15 3.9-2.15 4.08 0 5.7 4.18 3.43 7.38C18.7 16.65 12 21 12 21z" />
                                                            </svg>

                                                            <span style={{ fontSize: "11px", color: "#aaa" }} > {rev.likes ? Object.keys(rev.likes).length : 0} </span>
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {orderModal && (
                <div style={modalOverlay} onClick={() => setOrderModal(null)}>
                    <div style={glassModal} onClick={e => e.stopPropagation()}>
                        <h3 style={{margin: '0 0 10px 0', fontSize: '18px'}}>Select Quantity</h3>
                        <p style={{opacity: 0.6, fontSize: '12px', marginBottom: '20px'}}>{orderModal.name}</p>
                        <input 
                            type="number" 
                            min="1"
                            value={quantity} 
                            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                            style={quantityInput}
                        />
                        <div style={{display: 'flex', gap: '10px'}}>
                            <button onClick={handleConfirmOrder} style={primaryBtn}>Confirm</button>
                            <button onClick={() => setOrderModal(null)} style={secondaryBtn}>Back</button>
                        </div>
                    </div>
                </div>
            )}
            {showShipmentBubble && activeShipment && (
                <>
                    <div
                        onClick={() =>
                            setShipmentCardOpen(
                                !shipmentCardOpen
                            )
                        }
                        style={{
                            position: "fixed",
                            bottom: "24px",
                            right: "24px",

                            width: "78px",
                            height: "78px",

                            borderRadius: "50%",

                            background:
                                "linear-gradient(135deg,#22c55e,#16a34a)",

                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",

                            fontSize: "34px",

                            cursor: "pointer",

                            zIndex: 999999,

                            boxShadow:
                                "0 0 30px rgba(34,197,94,.45)",

                            animation:
                                "shipmentPulse 2s infinite"
                        }}
                    >
                        🚚
                    </div>

                    {shipmentCardOpen && (
                        <div
                            style={{
                                position: "fixed",

                                right: "24px",
                                bottom: "120px",

                                width: "320px",
                                maxWidth: "90vw",

                                background:
                                    "rgba(18,18,20,.95)",

                                backdropFilter:
                                    "blur(18px)",

                                border:
                                    "1px solid rgba(255,255,255,.08)",

                                borderRadius: "22px",

                                padding: "18px",

                                zIndex: 999999,

                                animation:
                                    "shipmentSlideUp .25s ease"
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "10px",
                                    marginBottom: "16px"
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: "26px"
                                    }}
                                >
                                    🚚
                                </div>

                                <div>
                                    <div
                                        style={{
                                            fontWeight: 700,
                                            color: "#fff"
                                        }}
                                    >
                                        Shipment In Progress
                                    </div>

                                    <div
                                        style={{
                                            fontSize: "12px",
                                            color: "#22c55e"
                                        }}
                                    >
                                        Logistics Active
                                    </div>
                                </div>
                            </div>

                            <div
                                style={{
                                    color: "#fff",
                                    marginBottom: "8px"
                                }}
                            >
                                📦 {activeShipment.product}
                            </div>

                            <div
                                style={{
                                    color: "#9ca3af",
                                    fontSize: "13px",
                                    marginBottom: "6px"
                                }}
                            >
                                Quantity:
                                {" "}
                                {activeShipment.quantity}
                            </div>

                            <div
                                style={{
                                    color: "#9ca3af",
                                    fontSize: "13px",
                                    marginBottom: "14px"
                                }}
                            >
                                ETA:
                                {" "}
                                {activeShipment.deliveryDate}
                            </div>

                            <div
                                style={{
                                    display: "flex",
                                    justifyContent:
                                        "space-between",

                                    fontSize: "11px",
                                    color: "#888",

                                    marginBottom: "6px"
                                }}
                            >
                                <span>Status</span>
                                <span>65%</span>
                            </div>

                            <div
                                style={{
                                    width: "100%",
                                    height: "8px",
                                    background: "#222",
                                    borderRadius: "999px",
                                    overflow: "hidden"
                                }}
                            >
                                <div
                                    style={{
                                        width: "65%",
                                        height: "100%",
                                        background: "#22c55e"
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </>
            )}
            {showReport && (
                <Report
                    reportedUserId={brandId}
                    reporterId={"CURRENT_USER_ID"}
                    onBack={() => setShowReport(false)}
                />
            )}
            {activeShipment && (
                <div
                    style={{
                        position: "fixed",
                        top: 100,
                        left: 20,
                        background: "red",
                        color: "white",
                        padding: 10,
                        zIndex: 999999
                    }}
                >
                    SHIPMENT FOUND
                </div>
            )}
            
        </div>
    );
};

// --- ACTION SPECIFIC BUTTON STYLES ---
const toggleReviewBtnStyle: React.CSSProperties = { background: 'rgba(197, 255, 65, 0.1)', border: '1px solid rgba(197, 255, 65, 0.3)', borderRadius: '10px', color: '#C5FF41', padding: '6px 12px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' };
const cancelReviewBtnStyle: React.CSSProperties = { background: 'transparent', border: 'none', color: '#888', fontSize: '11px', cursor: 'pointer' };

// --- STYLING METRICS ---
const modalScrollArea: React.CSSProperties = { height: '100%', maxHeight: '75vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch' };
const ratingSummaryBar: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', marginBottom: '14px' };
const divider: React.CSSProperties = { height: '1px', backgroundColor: '#222', margin: '20px 0' };
const sectionSubHeading: React.CSSProperties = { fontSize: '12px', letterSpacing: '1px', color: '#888' };
const commentCard: React.CSSProperties = { backgroundColor: '#161616', border: '1px solid #252525', borderRadius: '14px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px' };
const commentHeader: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', fontSize: '12px' };
const commentTextBody: React.CSSProperties = { margin: '4px 0', fontSize: '13px', color: '#ccc', lineHeight: '1.4' };
const likeBtn: React.CSSProperties = { alignSelf: 'flex-start', background: '#222', color: '#fff', border: 'none', borderRadius: '8px', padding: '4px 8px', fontSize: '11px', cursor: 'pointer', marginTop: '4px' };
const reviewForm: React.CSSProperties = { display: 'flex', flexDirection: 'column', backgroundColor: '#111', border: '1px solid #222', padding: '14px', borderRadius: '16px' };
const reviewInput: React.CSSProperties = { flex: 1, backgroundColor: '#000', border: '1px solid #333', borderRadius: '10px', padding: '10px', color: '#fff', fontSize: '13px' };
const ratingSelector: React.CSSProperties = { backgroundColor: '#000', border: '1px solid #333', borderRadius: '10px', padding: '10px', color: '#fff', fontSize: '13px' };
const reviewTextArea: React.CSSProperties = { backgroundColor: '#000', border: '1px solid #333', borderRadius: '10px', padding: '10px', color: '#fff', fontSize: '13px', fontFamily: 'inherit', resize: 'none' };
const submitReviewBtn: React.CSSProperties = { marginTop: '10px', backgroundColor: '#C5FF41', color: '#000', border: 'none', padding: '12px', borderRadius: '10px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' };

// --- BASE APPLICATION STYLES ---
const marketContainer: React.CSSProperties = { backgroundColor: '#000', height: '100dvh', color: 'white', padding: '0 12px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', overflow: 'hidden', paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)', overscrollBehavior: 'none' };
const headerStyle: React.CSSProperties = { display: 'flex', width: '100%', maxWidth: '400px', justifyContent: 'space-between', alignItems: 'flex-start', padding: '24px 0 12px 0', backgroundColor: '#000', zIndex: 110, flexShrink: 0 };
const productGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '12px', width: '100%', maxWidth: '400px', boxSizing: 'border-box', height: 'calc(100vh - 160px)', overflowY: 'auto', paddingBottom: '60px', WebkitOverflowScrolling: 'touch' };
const bookingBtnStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.1)', color: 'white', border: '1px solid #333', padding: '10px 15px', borderRadius: '24px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' };
const backToMarketBtn: React.CSSProperties = { position: 'absolute', top: '15px', left: '15px', zIndex: 999, background: '#C5FF41', color: 'black', border: 'none', padding: '8px 14px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer' };
const maintenanceContainer: React.CSSProperties = { height: '100dvh', backgroundColor: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' };
const brandTitle: React.CSSProperties = { fontSize: '20px', fontWeight: 900, margin: 0, letterSpacing: '-0.5px', display: 'inline-block' };
const onlineStatus: React.CSSProperties = { fontSize: '11px', color: '#888', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' };
const dotStyle: React.CSSProperties = { width: '7px', height: '7px', background: '#C5FF41', borderRadius: '50%', boxShadow: '0 0 8px #C5FF41' };
const dmButton: React.CSSProperties = { background: '#C5FF41', color: 'black', border: 'none', padding: '10px 20px', borderRadius: '24px', fontSize: '13px', fontWeight: 800, cursor: 'pointer' };
const dragHandle: React.CSSProperties = { width: '40px', height: '4px', background: '#333', borderRadius: '2px', margin: '12px auto' };
const bigDisplayCard: React.CSSProperties = { background: '#111', width: '100%', maxWidth: '500px', borderTopLeftRadius: '32px', borderTopRightRadius: '32px', overflow: 'hidden', position: 'absolute', bottom: 0, border: '1px solid #222', animation: 'slideUp 0.3s ease-out', boxShadow: '0 -10px 40px rgba(0,0,0,0.5)' };
const bigImage: React.CSSProperties = { width: '100%', height: '32vh', objectFit: 'cover' };
const closeBtn: React.CSSProperties = { position: 'absolute', top: '15px', right: '15px', background: 'rgba(0,0,0,0.5)', color: 'white', border: 'none', width: '32px', height: '32px', borderRadius: '50%', zIndex: 11, backdropFilter: 'blur(5px)' };
const bigTitle: React.CSSProperties = { margin: 0, fontSize: '22px', fontWeight: 800 };
const bigPrice: React.CSSProperties = { fontSize: '20px', fontWeight: 800, color: '#C5FF41' };
const bigDescription: React.CSSProperties = { color: '#aaa', lineHeight: '1.6', margin: '15px 0 20px 0', fontSize: '14px' };
const bigActionBtn: React.CSSProperties = { width: '100%', background: '#C5FF41', color: 'black', border: 'none', padding: '18px', borderRadius: '18px', fontWeight: 900, fontSize: '15px' };
const modalOverlay: React.CSSProperties = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const glassModal: React.CSSProperties = { background: '#121212', border: '1px solid #222', padding: '30px', borderRadius: '28px', width: '85%', maxWidth: '340px', textAlign: 'center' };
const quantityInput: React.CSSProperties = { width: '100%', backgroundColor: '#000', border: '1px solid #333', borderRadius: '16px', padding: '15px', color: 'white', marginBottom: '25px', textAlign: 'center', fontSize: '28px', fontWeight: 'bold' };
const primaryBtn: React.CSSProperties = { background: '#C5FF41', color: 'black', border: 'none', padding: '16px', borderRadius: '14px', fontWeight: 'bold', flex: 1 };
const secondaryBtn: React.CSSProperties = { background: 'transparent', color: 'white', border: '1px solid #333', padding: '16px', borderRadius: '14px', flex: 1 };
const loaderStyle: React.CSSProperties = { color: '#666', display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#000' };
const emptyState: React.CSSProperties = { gridColumn: '1/-1', textAlign: 'center', padding: '100px 0', opacity: 0.3, fontSize: '13px' };
const secondaryBtnStyle: React.CSSProperties = { padding: '8px 12px', borderRadius: '10px', background: 'transparent', color: 'white', border: '1px solid #333', fontWeight: 600, cursor: 'pointer', fontSize: '11px' };


export default MarketFront;