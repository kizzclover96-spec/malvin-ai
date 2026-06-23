import React, { useState, useEffect } from 'react';
import { firestore as db } from '../firebase'; // Ensure your firebase configuration is exported here
import { doc, onSnapshot, collection, addDoc, query, where } from 'firebase/firestore';
import styles from './store.module.css';
import { useParams } from "react-router-dom";

// --- Interfaces ---
interface RestaurantProfile {
  brandName: string;
  brandBio: string;
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
  fourDigitCode?: string;
}

interface StoreProps {
  restaurantUid: string; // Pass the target restaurant UID as a prop
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
  const [guestId, setGuestId] = useState<string>('');
  console.log("Restaurant UID:", restaurantUid);

  // 1. Real-time Subscription: Restaurant Profile
  useEffect(() => {
    const docRef = doc(db, 'restaurantprofile', restaurantUid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data() as RestaurantProfile);
      }
    });
    console.log("Restaurant UID:", restaurantUid);
    return () => unsubscribe();
  }, [restaurantUid]);

  useEffect(() => {
    let id = localStorage.getItem('guest_id');

    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('guest_id', id);
    }

    setGuestId(id);
  }, []);

  // 2. Real-time Subscription: Product Catalog
  useEffect(() => {
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

  // 3. Real-time Subscription: Track Orders (Simulated for this client device via localStorage backup/name verification)
  useEffect(() => {
    if (!customerName) return;

    const colRef = collection(db, 'orders');
    const q = query(colRef, where('customerName', '==', customerName));

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

  // Actions
  const handleAddToCart = () => {
    if (!activeProduct) return;
    setCart([...cart, { product: activeProduct, quantity: selectedQty }]);
    setActiveProduct(null);
    setSelectedQty(1);
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0 || !customerName || !pickupTime) return;

    const orderData = {
      restaurantUid,
      customerName,
      guestId,
      pickupTime,
      userMobilityStatus: currentStatus,
      status: 'pending',
      createdAt: new Date().toISOString(),
      items: cart.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price
      }))
    };

    try {
      await addDoc(collection(db, 'orders'), orderData);
      setCart([]);
      setIsCheckoutOpen(false);
      setIsOrdersOpen(true); // Direct to status/receipt panel
    } catch (error) {
      console.error("Error creating order: ", error);
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const cartTotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

  return (
    <div className={styles.appContainer}>
      {/* Top Bar */}
      <header className={styles.topBar}>
        <div className={styles.brandInfo}>
          <h1>{profile?.brandName || 'Loading...'}</h1>
          <p className={styles.brandBio}>{profile?.brandBio || 'Connecting to store...'}</p>
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
                </select>
              </div>
              <button type="submit" className={styles.ordersBtn} style={{ width: '100%', padding: '16px', background: '#10b981' }}>
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
                    <span className={`${styles.statusBadge} ${styles[order.status]}`}>{order.status}</span>
                    <small>{order.pickupTime}</small>
                  </div>

                  {/* Receipt Presentation Block (Render when past pending/approved status context matches rules) */}
                  {order.status !== 'pending' && (
                    <div style={{ marginTop: '12px', borderTop: '1px dashed #ccc', paddingTop: '12px' }}>
                      <strong>Digital Receipt Token</strong>
                      <p style={{ margin: '4px 0', fontSize: '13px' }}>Customer: {order.customerName}</p>
                      <p style={{ fontSize: '20px', fontWeight: 'bold', margin: '4px 0', color: '#111' }}>
                        Code: {order.fourDigitCode || '####'}
                      </p>
                      
                      {/* Placeholder UI logic representing a scanning dynamic target context QR container */}
                      <div className={styles.qrPlaceholder}>
                        [ QR SCAN CODE: {order.id.substring(0,6).toUpperCase()} ]
                      </div>
                    </div>
                  )}

                  <div style={{ margin: '8px 0' }}>
                    {order.items.map((it, idx) => (
                      <div key={idx} style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{it.quantity}x {it.name}</span>
                        <span>${(it.price * it.quantity).toFixed(2)}</span>
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
    </div>
  );
};