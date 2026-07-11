import React, { useState, useEffect } from 'react';
import { firestore as db } from '../firebase'; // Ensure your firebase configuration is exported here
import { doc, onSnapshot, collection, addDoc, query, where, deleteDoc } from 'firebase/firestore';
import styles from './store.module.css';
import { useParams, useNavigate, useLocation } from "react-router-dom"; // 👈 Restored all required routing hooks
import QRCode from "qrcode";
import { auth } from '../firebase';

// --- Interfaces ---
interface RestaurantProfile {
  brandName: string;
  brandBio: string;
  address?: string; 
  onlineStatus: boolean;
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

  // Modals / Drawers UI Control
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [selectedQty, setSelectedQty] = useState(1);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);

  // Checkout Form State
  const [customerName, setCustomerName] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [currentStatus, setCurrentStatus] = useState('home');
  const [tableNumber, setTableNumber] = useState('');
  const [guestId, setGuestId] = useState<string>('');
  
  // Code generation state variables
  const [receiptQrs, setReceiptQrs] = useState<Record<string, string>>({});

  // 1. Real-time Subscription: Restaurant Profile
  useEffect(() => {
    if (!restaurantUid) return;
    const docRef = doc(db, 'restaurantprofile', restaurantUid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data() as RestaurantProfile);
      }
    });
    return () => unsubscribe();
  }, [restaurantUid]);

  // Guest Session setup
  useEffect(() => {
    if (auth.currentUser?.uid) {
      setGuestId(auth.currentUser.uid);
      return;
    }

    const handleIdentityMessage = (event: MessageEvent) => {
      // 🟢 Fix: Align type filter string with your system's postMessage type
      if ((event.data?.type === "MALVIN_IDENTITY" || event.data?.type === "MALVIN_USER") && event.data?.uid) {
        console.log("StoreFrontend caught real context identity:", event.data.uid);
        setGuestId(event.data.uid);
      }
    };

    window.addEventListener("message", handleIdentityMessage);
    
    const realUid = localStorage.getItem('guest_id');
    if (realUid && !realUid.includes("-")) {
      setGuestId(realUid);
    }

    return () => window.removeEventListener("message", handleIdentityMessage);
  }, []);

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
  useEffect(() => {
    if (!customerName) return;

    const colRef = collection(db, 'orders');
    const q = query(colRef, where('customerName', '==', customerName.trim()));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const ordersList: Order[] = [];
      querySnapshot.forEach((docSnap) => {
        ordersList.push({
          id: docSnap.id,
          ...docSnap.data()
        } as Order);
      });
      setUserOrders(ordersList);
    });

    return () => unsubscribe();
  }, [customerName]);

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
  // Add this inside StoreFrontend in store.tsx:
  useEffect(() => {
    // Ping the parent wrapper using the name it expects
    window.parent.postMessage(
      {
        type: "SALON_READY", 
      },
      "*"
    );

    console.log("Sent STORE_READY frame handshake from StoreFrontend to parent wrapper");
  }, []);

  // 5. Catch Incoming Auto-Bounce Payments from ticket.tsx
  useEffect(() => {
    if (location.state?.paymentConfirmed && location.state?.orderPayload) {
      const confirmedData = location.state.orderPayload;
      
      const commitOrderToDatabase = async () => {
        try {
          const fourDigitPin = Math.floor(1000 + Math.random() * 9000).toString();
          
          await addDoc(collection(db, 'orders'), {
            restaurantUid: restaurantUid,
            customerName: confirmedData.customerName,
            pickupTime: confirmedData.time,
            status: 'pending',
            items: confirmedData.services.map((s: any) => ({
              name: s.serviceName,
              quantity: s.quantity,
              price: s.price
            })),
            fourDigitCode: fourDigitPin,
            totalPaid: confirmedData.totalPrice,
            paymentStatus: 'paid',
            userMobilityStatus: confirmedData.userMobilityStatus,
            tableNumber: confirmedData.tableNumber,
            customerUid: confirmedData.customerUid,
            createdAt: new Date().toISOString()
          });

          // Open up the tickets side drawer so they see the live QR code right away
          setIsOrdersOpen(true);
          
          // Clear router configuration memory state pointers to prevent duplicate records on page refresh actions
          navigate(location.pathname, { replace: true, state: {} });
        } catch (err) {
          console.error("Failed writing verified order log:", err);
        }
      };

      commitOrderToDatabase();
    }
  }, [location.state, restaurantUid, navigate, location.pathname]);

  const cartTotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

  // Actions
  const handleAddToCart = () => {
    if (!activeProduct) return;
    setCart([...cart, { product: activeProduct, quantity: selectedQty }]);
    setActiveProduct(null);
    setSelectedQty(1);
  };

  // Optimized to package details and transition directly to secure checkout without data duplication
  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || !customerName || !pickupTime) return;

    const finalUid = auth.currentUser?.uid || guestId;

    if (!finalUid) {
      alert("Authentication handling is still initializing. Please wait a brief moment...");
      return;
    }

    const checkoutPayload = {
      targetBusinessUid: restaurantUid,
      totalPrice: cartTotal, 
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
      customerUid: finalUid, // 👈 Ensures the active ID goes straight through
      fromStore: true ,
      merchantType: "food"
    };

    setCart([]);
    setIsCheckoutOpen(false);
    navigate("/ticket-checkout", { state: checkoutPayload });
  };

  const handleCancelOrder = async (orderId: string) => {
    const confirmCancel = window.confirm("Are you sure you want to cancel this order?");
    if (!confirmCancel) return;

    try {
      const orderDocRef = doc(db, 'orders', orderId);
      await deleteDoc(orderDocRef);
      alert("Order cancelled successfully.");
    } catch (error) {
      console.error("Error cancelling order: ", error);
      alert("Failed to cancel order. Please try again.");
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={styles.appContainer}>
      {/* Top Bar */}
      <header className={styles.topBar}>
        <div className={styles.brandInfo}>
          <h1>{profile?.brandName || 'Loading...'}</h1>
          <p className={styles.brandBio}>{profile?.brandBio || 'Connecting to store...'}</p>
          
          {/* Added Brand Location Layout Placement */}
          {profile?.address && (
            <p className={styles.brandLocation} style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
              📍 {profile.address}
            </p>
          )}
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
                Confirm Order Base
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
                      {order.status === 'pending' && (
                        <button 
                          onClick={() => handleCancelOrder(order.id)}
                          style={{
                            marginLeft: '10px',
                            padding: '4px 8px',
                            background: '#ef4444',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Cancel Order
                        </button>
                      )}
                    </div>
                    <small>{order.pickupTime}</small>
                  </div>

                  {order.status !== 'pending' && (
                    <div style={{ marginTop: '12px', borderTop: '1px dashed #ccc', paddingTop: '12px' }}>
                      <strong>Digital Receipt Token</strong>
                      <p style={{ margin: '4px 0', fontSize: '13px' }}>Customer: {order.customerName}</p>
                      <p style={{ fontSize: '20px', fontWeight: 'bold', margin: '4px 0', color: '#111' }}>
                        Code: {order.fourDigitCode || '####'}
                      </p>
                      
                      <div
                        style={{
                          display: "flex",
                          justify: "center",
                          marginTop: "10px",
                        }}
                      >
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
      
      {/* Small Blue Watermark */}
      <div className={styles.watermark}>
        Malvinai
      </div>
    </div>
  );
};