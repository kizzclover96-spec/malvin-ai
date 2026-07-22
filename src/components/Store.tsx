import React, { useState, useEffect } from 'react';
import { firestore as db } from '../firebase'; // Ensure your firebase configuration is exported here
import { doc, onSnapshot, collection, addDoc, query, where, getDoc, setDoc } from 'firebase/firestore';
import styles from './store.module.css';
import { useParams, useNavigate, useLocation } from "react-router-dom"; 
import QRCode from "qrcode";
import { auth } from '../firebase';
import Report from "./report"; // <--- Imported Report component
import { Star, AlertTriangle } from 'lucide-react';

// --- Interfaces ---
interface RestaurantProfile {
  brandName: string;
  brandBio: string;
  address?: string; 
  onlineStatus: boolean;
  orderLimitReached?: boolean; 
  cooldownExpiresAt?: string | null;
  isVerified?: boolean;        
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  imageUrl: string;
  category: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface Order {
  id: string;
  customerName: string;
  pickupTime: string;
  status: 'pending' | 'preparing' | 'in queue' | 'ready for pickup' | 'finished';
  items: { name: string; quantity: number; price: number }[];
  fourDigitCode: string;
}

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

export const StoreFrontend: React.FC = () => {
  const { Uid } = useParams();
  const restaurantUid = Uid || "";
  
  // Initialize Hooks
  const navigate = useNavigate();
  const location = useLocation();

  // State
  const [profile, setProfile] = useState<RestaurantProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [userOrders, setUserOrders] = useState<Order[]>([]);

  // --- Rating & Report States ---
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [totalRatingsCount, setTotalRatingsCount] = useState<number>(0);
  const [userRating, setUserRating] = useState<number>(0);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [hoveredStar, setHoveredStar] = useState<number>(0);

  // Modals / Drawers UI Control
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [selectedQty, setSelectedQty] = useState(1);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);

  // Controls visibility of the customer's interactive rating widget
  const [showRateModal, setShowRateModal] = useState(false);

  // Checkout Form State
  const [customerName, setCustomerName] = useState<string>(() => {
    return localStorage.getItem('saved_customer_name') || location.state?.orderPayload?.customerName || '';
  });
  const [pickupTime, setPickupTime] = useState('');
  const [currentStatus, setCurrentStatus] = useState('home');
  const [tableNumber, setTableNumber] = useState('');

  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

  const [guestId, setGuestId] = useState<string>(() => {
    return localStorage.getItem('guest_id') || '';
  });
  
  // Code generation state variables
  const [receiptQrs, setReceiptQrs] = useState<Record<string, string>>({});

  // 1. Real-time Subscription: Restaurant Profile
  // 1. Real-time Subscription: Restaurant Profile
  useEffect(() => {
    if (!restaurantUid) return;
    const docRef = doc(db, 'restaurantprofile', restaurantUid); // Listening to restaurantprofile collection
    
    const unsubscribe = onSnapshot(docRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as RestaurantProfile;
        const now = new Date();
        const expiresAt = data.cooldownExpiresAt ? new Date(data.cooldownExpiresAt) : null;

        // 🟢 Check if the 24-hour cooldown timer has expired
        if (expiresAt && now > expiresAt) {
          try {
            // Import updateDoc function dynamically to avoid load-time bloat
            const { updateDoc } = await import('firebase/firestore');
            
            // Clear the cooldown flags in the Firestore database
            await updateDoc(docRef, {
              orderLimitReached: false,
              cooldownExpiresAt: null,
              currentCycleCount: 0 // Reset daily order count counter
            });

            // Optimistically update local state to resume ordering immediately
            setProfile({
              ...data,
              orderLimitReached: false,
              cooldownExpiresAt: null
            });
          } catch (error) {
            console.error("Failed to automatically clear store cooldown expiration:", error);
            setProfile(data);
          }
        } else {
          // Keep enforcing standard profile metadata rules
          setProfile(data);
        }
      }
    });
    return () => unsubscribe();
  }, [restaurantUid]);

  // --- 1. Fetch Store Average Rating & Ratings Count ---
  useEffect(() => {
    if (!restaurantUid) return;
    const ratingDocRef = doc(db, 'store_ratings', restaurantUid);
    const unsub = onSnapshot(ratingDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAverageRating(data.average || 0);
        setTotalRatingsCount(data.count || 0);
      } else {
        setAverageRating(0);
        setTotalRatingsCount(0);
      }
    });
    return () => unsub();
  }, [restaurantUid]);

  // --- 2. Check current user's existing rating ---
  useEffect(() => {
    const currentUserId = auth.currentUser?.uid || guestId;
    if (!restaurantUid || !currentUserId) return;
    const userRatingRef = doc(db, 'store_ratings', restaurantUid, 'user_ratings', currentUserId);
    getDoc(userRatingRef).then((docSnap) => {
      if (docSnap.exists()) {
        setUserRating(docSnap.data().stars || 0);
      }
    });
  }, [restaurantUid, guestId]);

  // --- 3. Handle Star Click (Submit or Update Rating) ---
  const handleRateStore = async (stars: number) => {
    const currentUserId = auth.currentUser?.uid || guestId;
    if (!currentUserId) {
      alert("Please log in or establish session to rate this store.");
      return;
    }
    if (!restaurantUid || isSubmittingRating) return;

    setIsSubmittingRating(true);
    try {
      const userRatingRef = doc(db, 'store_ratings', restaurantUid, 'user_ratings', currentUserId);
      const summaryRef = doc(db, 'store_ratings', restaurantUid);

      const oldRatingSnap = await getDoc(userRatingRef);
      const summarySnap = await getDoc(summaryRef);

      let currentSum = 0;
      let currentCount = 0;

      if (summarySnap.exists()) {
        currentSum = summarySnap.data().sum || 0;
        currentCount = summarySnap.data().count || 0;
      }

      if (oldRatingSnap.exists()) {
        const previousStars = oldRatingSnap.data().stars || 0;
        currentSum = currentSum - previousStars + stars;
      } else {
        currentSum += stars;
        currentCount += 1;
      }

      const newAverage = currentCount > 0 ? Number((currentSum / currentCount).toFixed(1)) : 0;

      await setDoc(userRatingRef, {
        stars,
        updatedAt: new Date().toISOString()
      });

      await setDoc(summaryRef, {
        average: newAverage,
        count: currentCount,
        sum: currentSum
      }, { merge: true });

      setUserRating(stars);
    } catch (err) {
      console.error("Error rating store:", err);
      alert("Failed to submit rating.");
    } finally {
      setIsSubmittingRating(false);
    }
  };

  useEffect(() => {
    if (!profile?.cooldownExpiresAt) {
      setTimeRemaining(null);
      return;
    }

    const interval = setInterval(() => {
      const expiryTime = new Date(profile.cooldownExpiresAt!).getTime();
      const now = new Date().getTime();
      const distance = expiryTime - now;

      if (distance <= 0) {
        setTimeRemaining(null);
        clearInterval(interval);
      } else {
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [profile?.cooldownExpiresAt]);

  // Guest Session setup
  useEffect(() => {
    if (auth.currentUser?.uid) {
      setGuestId(auth.currentUser.uid);
      localStorage.setItem('guest_id', auth.currentUser.uid);
      return;
    }

    const handleIdentityMessage = (event: MessageEvent) => {
      if ((event.data?.type === "MALVIN_IDENTITY" || event.data?.type === "MALVIN_USER") && event.data?.uid) {
        console.log("StoreFrontend caught real context identity:", event.data.uid);
        setGuestId(event.data.uid);
        localStorage.setItem('guest_id', event.data.uid);
      }
    };

    window.addEventListener("message", handleIdentityMessage);
    
    const realUid = localStorage.getItem('guest_id');
    if (realUid && !realUid.includes("-")) {
      setGuestId(realUid);
    }

    return () => window.removeEventListener("message", handleIdentityMessage);
  }, []);

  // Update localStorage cache records
  useEffect(() => {
    if (customerName.trim()) {
      localStorage.setItem('saved_customer_name', customerName.trim());
    }
  }, [customerName]);

  // 2. Real-time Subscription: Product Catalog
  useEffect(() => {
    if (!restaurantUid) return;
    const colRef = collection(db, 'Restaurantcatalogue', restaurantUid, 'products');
    const unsubscribe = onSnapshot(colRef, (querySnapshot) => {
      const items: Product[] = [];
      querySnapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Product);
      });
      setProducts(items);
    });
    return () => unsubscribe();
  }, [restaurantUid]);

  // 3. Real-time Subscription: Track Orders
  // 3. Real-time Subscription: Track Orders (Scoped securely by UID and Business ID)
  useEffect(() => {
    const finalUid = auth.currentUser?.uid || guestId;
    if (!finalUid || !restaurantUid) return;

    const colRef = collection(db, 'orders');
    
    // Scoped to the unique user ID AND the current restaurant to avoid cross-store leakage
    const q = query(
      colRef, 
      where('customerUid', '==', finalUid),
      where('targetBusinessUid', '==', restaurantUid)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ordersList: Order[] = [];
      querySnapshot.forEach((docSnap) => {
        ordersList.push({
          id: docSnap.id,
          ...docSnap.data()
        } as Order);
      });
      setUserOrders(ordersList);
    }, (error) => {
      console.error("Error fetching scoped user orders: ", error);
    });

    return () => unsubscribe();
  }, [guestId, restaurantUid]); // Depend on guestId/auth changes and current restaurant instead of name

  // 4. Live Tracking QR Generation Lookups
  useEffect(() => {
    const generateQrs = async () => {
      const qrMap: Record<string, string> = {};
      for (const order of userOrders) {
        if (order.fourDigitCode) {
          try {
            qrMap[order.id] = await QRCode.toDataURL(
              JSON.stringify({
                orderId: order.id,
                code: order.fourDigitCode,
                customer: order.customerName,
              })
            );
          } catch (err) {
            console.error("Failed to generate QR string data: ", err);
          }
        }
      }
      setReceiptQrs(qrMap);
    };

    if (userOrders.length > 0) {
      generateQrs();
    }
  }, [userOrders]);

  // Handshake Frame Sync Hook
  useEffect(() => {
    window.parent.postMessage(
      {
        type: "SALON_READY", 
      },
      "*"
    );

    console.log("Sent STORE_READY frame handshake from StoreFrontend to parent wrapper");
  }, []);

  useEffect(() => {
    if (location.state?.paymentConfirmed && location.state?.orderPayload) {
      const confirmedData = location.state.orderPayload;
      setCustomerName(confirmedData.customerName);
      localStorage.setItem('saved_customer_name', confirmedData.customerName);
      setIsOrdersOpen(true); // Open the orders panel to track live cook times

      // Reset routing pointer context
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, navigate, location.pathname]);

  const cartTotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

  // Actions
  const handleAddToCart = () => {
    if (!activeProduct) return;
    setCart([...cart, { product: activeProduct, quantity: selectedQty }]);
    setActiveProduct(null);
    setSelectedQty(1);
  };

  // Optimized to package details and transition directly to secure checkout without data duplication
  // Optimized to initiate a live payment session and redirect to Stripe
  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || !customerName.trim() || !pickupTime) return;

    const finalUid = auth.currentUser?.uid || guestId;

    if (!finalUid) {
      alert("Authentication handling is still initializing. Please wait a brief moment...");
      return;
    }

    // 1. Prepare metadata to cache locally so ticket-checkout can reconstruct it
    const checkoutPayload = {
      targetBusinessUid: restaurantUid,
      amount: cartTotal, 
      services: cart.map(item => ({
        serviceId: item.product.id,
        serviceName: item.product.name,
        price: item.product.price,
        quantity: item.quantity
      })),
      duration: 0,
      date: new Date().toISOString().split('T')[0],
      time: pickupTime, 
      customerName: customerName.trim(),
      userMobilityStatus: currentStatus,
      tableNumber: currentStatus === 'in store' ? tableNumber : '',
      customerUid: finalUid,
      
      fromStore: true,
      merchantType: "food"
    };

    // Cache parameters locally to ensure ticket registration triggers on success callback
    localStorage.setItem("pending_checkout_payload", JSON.stringify(checkoutPayload));

    try {
      // 2. Import and initialize Firebase cloud function call
      const { getFunctions, httpsCallable } = await import("firebase/functions");
      const functions = getFunctions();
      const createDirectPaymentSession = httpsCallable(functions, "createDirectPaymentSession");

      // 3. Request session creation matching backend schemas
      const response = await createDirectPaymentSession({
        amount: cartTotal,
        targetBusinessUid: restaurantUid,
        merchantType: "food",
        appointmentDetails: {
          services: cart.map(item => ({
            serviceName: item.product.name,
            price: item.product.price,
            quantity: item.quantity
          })),
          stylist: pickupTime, // Passing the pickup time through the standard stylist field
          duration: 0
        }
      });

      const data = response.data as { url?: string };

      if (data?.url) {
        // Clear local cart states now that the transaction is managed by Stripe
        setCart([]);
        setIsCheckoutOpen(false);
        
        // 🚀 ESCAPE THE IFRAME: Redirect the top-most browser window to Stripe Checkout
        if (window.top) {
          window.top.location.href = data.url;
        } else {
          window.location.href = data.url;
        }
      } else {
        throw new Error("Stripe gateway returned an empty checkout link.");
      }
    } catch (error: any) {
      console.error("Stripe Checkout initiation failed:", error);
      alert(`Payment Initialization Failure:\n${error.message || error}`);
    }
  };
  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ----------------------------------------------------
  // ⏳ COOLDOWN COOLDOWN BLOCKER
  // ----------------------------------------------------
  if (profile?.orderLimitReached) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center p-6 text-center font-sans">
        <div 
          className="w-20 h-20 bg-red-500/10 border-2 border-red-500 text-red-500 rounded-full flex items-center justify-center text-3xl mb-6 animate-pulse"
          style={{ boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)' }}
        >
          ⏳
        </div>
        <h1 className="text-3xl font-black uppercase tracking-tight mb-2">Store on Cooldown</h1>
        <p className="text-neutral-400 max-w-sm text-sm mb-6 leading-relaxed">
          This store has temporarily reached its daily capacity limit. 
          {timeRemaining ? (
            <> Please check back in <strong style={{ color: '#ef4444' }}>{timeRemaining}</strong>!</>
          ) : (
            " Please check back in the next 24 hours!"
          )}
        </p>
        <div className="text-xs text-neutral-500 uppercase tracking-widest font-bold">
          Powered by Malvin Platform
        </div>
      </div>
    );
  }

  return (
    <div className={styles.appContainer}>
      {/* Top Bar */}
      {/* Top Bar */}
      <header className={styles.topBar}>
        <div className={styles.brandInfo} style={{ width: '100%', textAlign: 'left', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          
          {/* BRAND NAME & VERIFIED BADGE */}
          <h1 style={{ fontSize: '24px', fontWeight: 900, margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '6px', color: '#0f172a', letterSpacing: '-0.02em' }}>
            <span>{profile?.brandName || 'Loading...'}</span>
            {profile?.isVerified && <VerifiedBadge />}
          </h1>

          {/* BRAND BIO */}
          <p className={styles.brandBio} style={{ margin: '0 0 6px 0', fontSize: '14px', fontWeight: 600, color: '#334155', lineHeight: 1.4, maxWidth: '480px' }}>
            {profile?.brandBio || 'Connecting to store...'}
          </p>
          
          {/* ADDRESS */}
          {profile?.address && (
            <p className={styles.brandLocation} style={{ fontSize: '13px', fontWeight: 700, color: '#475569', margin: '0 0 8px 0', display: 'flex', alignItems: 'center', gap: '4px' }}>
              📍 <span>{profile.address}</span>
            </p>
          )}

          {/* LEFT-ALIGNED SUB-HEADER ROW: RATINGS & REPORT */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', marginTop: '4px' }}>
            
            {/* CLICKABLE AVERAGE RATING BADGE */}
            <button
              type="button"
              onClick={() => setShowRateModal(!showRateModal)}
              style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '12px',
                padding: '4px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}
              title="Click to rate this business"
            >
              <Star size={12} fill="#eab308" color="#eab308" />
              <span style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a' }}>
                {averageRating.toFixed(1)}
              </span>
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
                ({totalRatingsCount})
              </span>
            </button>

            {/* SMALL REPORT BUTTON */}
            <button
              type="button"
              onClick={() => {
                const activeUser = auth.currentUser?.uid || guestId || localStorage.getItem('guest_id');
                if (!activeUser) {
                  alert("Initializing session... please try again in a moment.");
                  return;
                }
                setIsReportOpen(true);
              }}
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                color: '#ef4444',
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '11px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                cursor: 'pointer'
              }}
            >
              <AlertTriangle size={11} />
              <span>Report</span>
            </button>
          </div>
        </div>

        <button className={styles.ordersBtn} onClick={() => setIsOrdersOpen(true)}>
          Orders ({userOrders.length})
        </button>
      </header>

      {/* Search Bar */}
      <div className={styles.searchContainer}>
        <input 
          type="text" 
          placeholder="Search items..." 
          className={styles.searchBar} 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Main Grid Product Catalog */}
      <main className={styles.catalogContainer}>
        <div className={styles.grid}>
          {filteredProducts.map((product) => (
            <div key={product.id} className={styles.productCard} onClick={() => setActiveProduct(product)}>
              <img src={product.imageUrl || 'https://via.placeholder.com/150'} alt={product.name} className={styles.productImg} />
              <div className={styles.productDetails}>
                <h3 className={styles.productName}>{product.name}</h3>
                <p className={styles.productDesc}>{product.description}</p>
                <div className={styles.productFooter}>
                  <span className={styles.price}>{product.currency || '$'}{product.price}</span>
                  <button className={styles.addBtn}>+</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Sticky Bottom Cart Indicator */}
      {cart.length > 0 && (
        <div className={styles.stickyCart} onClick={() => setIsCheckoutOpen(true)}>
          <span>View Cart ({cart.reduce((a, b) => a + b.quantity, 0)} items)</span>
          <span>Total: ${cartTotal.toFixed(2)}</span>
        </div>
      )}

      {/* Modal: Item Product Configuration */}
      {activeProduct && (
        <div className={styles.drawerOverlay}>
          <div className={styles.drawer}>
            <div className={styles.drawerHeader}>
              <h2>{activeProduct.name}</h2>
              <button className={styles.closeBtn} onClick={() => setActiveProduct(null)}>✕</button>
            </div>
            <p>{activeProduct.description}</p>
            <div className={styles.qtySelector}>
              <button className={styles.qtyBtn} onClick={() => setSelectedQty(Math.max(1, selectedQty - 1))}>-</button>
              <span>{selectedQty}</span>
              <button className={styles.qtyBtn} onClick={() => setSelectedQty(selectedQty + 1)}>+</button>
            </div>
            <button className={styles.ordersBtn} style={{ width: '100%', padding: '16px' }} onClick={handleAddToCart}>
              Add to Basket
            </button>
          </div>
        </div>
      )}

      {/* Modal: Checkout Form Panel */}
      {isCheckoutOpen && (
        <div className={styles.drawerOverlay}>
          <div className={styles.drawer}>
            <div className={styles.drawerHeader}>
              <h2>Checkout</h2>
              <button className={styles.closeBtn} onClick={() => setIsCheckoutOpen(false)}>✕</button>
            </div>
            <form onSubmit={handlePlaceOrder}>
              <div className={styles.inputGroup}>
                <label>Your Name</label>
                <input type="text" className={styles.input} required value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="John Doe" />
              </div>
              <div className={styles.inputGroup}>
                <label>Target Pickup Time</label>
                <input type="time" className={styles.input} required value={pickupTime} onChange={e => setPickupTime(e.target.value)} />
              </div>
              <div className={styles.inputGroup}>
                <label>Current Status Context</label>
                <select className={styles.input} value={currentStatus} onChange={e => setCurrentStatus(e.target.value)}>
                  <option value="home">At Home</option>
                  <option value="on the way">On the Way</option>
                  <option value="traffic">Stuck in Traffic</option>
                  <option value="in store">In Store</option>
                </select>
              </div>

              {/* Conditional Table Number Input */}
              {currentStatus === 'in store' && (
                <div className={styles.inputGroup} style={{ marginTop: '12px', paddingLeft: '10px', borderLeft: '3px solid #10b981' }}>
                  <label>Table Number</label>
                  <input 
                    type="text" 
                    className={styles.input} 
                    required 
                    value={tableNumber} 
                    onChange={e => setTableNumber(e.target.value)} 
                    placeholder="e.g., 5" 
                  />
                </div>
              )}

              <button type="submit" className={styles.ordersBtn} style={{ width: '100%', padding: '16px', background: '#10b981', marginTop: '16px' }}>
                Proceed to Secure Payment
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Drawer: Active Orders Tracking & Live Receipts */}
      {isOrdersOpen && (
        <div className={styles.drawerOverlay}>
          <div className={styles.drawer}>
            <div className={styles.drawerHeader}>
              <h2>Your Tracking Desk</h2>
              <button className={styles.closeBtn} onClick={() => setIsOrdersOpen(false)}>✕</button>
            </div>
            {userOrders.length === 0 ? (
              <p style={{ color: '#aaa', textAlign: 'center' }}>No current transactions mapped.</p>
            ) : (
              userOrders.map((order) => (
                <div key={order.id} className={styles.orderItem}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span className={`${styles.statusBadge} ${styles[order.status]}`}>{order.status}</span>
                    </div>
                    <small>{order.pickupTime}</small>
                  </div>

                  {(order.status === 'pending' || order.status !== 'finished') && (
                    <div style={{ marginTop: '12px', borderTop: '1px dashed #ccc', paddingTop: '12px' }}>
                      <strong>Digital Receipt Token</strong>
                      <p style={{ margin: '4px 0', fontSize: '13px' }}>Customer: {order.customerName}</p>
                      <p style={{ fontSize: '20px', fontWeight: 'bold', margin: '4px 0', color: '#111' }}>
                        Code: {order.fourDigitCode || '####'}
                      </p>
                      
                      <div style={{ display: "flex", justifyContent: "center", marginTop: "10px" }}>
                        {receiptQrs[order.id] && (
                          <img
                            src={receiptQrs[order.id]}
                            alt="Order QR"
                            style={{
                              width: "120px",
                              height: "120px",
                              border: "2px solid #000",
                              borderRadius: "12px",
                              padding: "4px",
                              background: "#fff",
                            }}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  <div style={{ margin: '8px 0' }}>
                    {order.items?.map((it, idx) => (
                      <div key={idx} style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{it.quantity}x {it.name}</span>
                        <span>${((it.price || 0) * (it.quantity || 1)).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  {order.status === 'finished' && (
                    <div className={styles.completedBadge}>✓ ORDER COMPLETED</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
      {isReportOpen && restaurantUid && (
        <Report
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          reportedUserUid={restaurantUid}
          currentUserUid={auth.currentUser?.uid || guestId || localStorage.getItem('guest_id') || 'anonymous_guest'}
        />
      )}
      {/* INTERACTIVE STAR RATING MODAL (POPS UP WHEN RATINGS ARE CLICKED) */}
      {showRateModal && (
        <div 
          className={styles.drawerOverlay} 
          onClick={() => setShowRateModal(false)}
          style={{ zIndex: 2500 }}
        >
          <div 
            className={styles.drawer} 
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '320px', margin: 'auto', textAlign: 'center', padding: '20px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Rate This Store
              </h3>
              <button 
                className={styles.closeBtn} 
                onClick={() => setShowRateModal(false)}
                style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>
              {userRating > 0 
                ? `You previously rated this business ${userRating} stars. Tap to update your rating:` 
                : 'Tap a star to leave your rating for this business:'}
            </p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  disabled={isSubmittingRating}
                  onClick={async () => {
                    await handleRateStore(star);
                    setShowRateModal(false);
                  }}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '4px',
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease'
                  }}
                >
                  <Star
                    size={28}
                    fill={(hoveredStar || userRating) >= star ? "#eab308" : "none"}
                    color={(hoveredStar || userRating) >= star ? "#eab308" : "#a3a3a3"}
                    style={{
                      transform: (hoveredStar || userRating) >= star ? 'scale(1.15)' : 'scale(1)'
                    }}
                  />
                </button>
              ))}
            </div>

            {userRating > 0 && (
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#10b981' }}>
                ✓ Current Rating: {userRating} Stars
              </span>
            )}
          </div>
        </div>
      )}
      {/* Small Blue Watermark */}
      <div className={styles.watermark}>
        Malvinai
      </div>
    </div>
  );
};