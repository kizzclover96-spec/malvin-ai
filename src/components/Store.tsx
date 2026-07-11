import React, { useState, useEffect } from 'react';
import { firestore as db } from '../firebase'; 
import { doc, onSnapshot, collection, addDoc, query, where, deleteDoc, updateDoc, increment } from 'firebase/firestore';
import styles from './store.module.css';
import { useParams, useNavigate } from "react-router-dom";
import QRCode from "qrcode";
import { useBusinessWallet } from "../hooks/useBusinessWallet"; 
import { ShoppingBag, Search, Clock, MapPin, CheckCircle, CreditCard, AlertCircle } from 'lucide-react';

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
  totalPaid: number;
  paymentStatus: 'paid' | 'refunded';
}

export const StoreFrontend: React.FC = () => {
  const { Uid } = useParams();
  const restaurantUid = Uid || "";
  const navigate = useNavigate();
  
  // Wallet Hook Integration for verifying balances and identifying active users
  const { currency, walletBalance, deductFunds, userId } = useBusinessWallet();

  // State
  const [profile, setProfile] = useState<RestaurantProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [userOrders, setUserOrders] = useState<Order[]>([]);

  // UI Control
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [selectedQty, setSelectedQty] = useState(1);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isOrdersOpen, setIsOrdersOpen] = useState(false);

  // Form State
  const [customerName, setCustomerName] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [currentStatus, setCurrentStatus] = useState('home');
  const [tableNumber, setTableNumber] = useState('');
  const [guestId, setGuestId] = useState<string>('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const [receiptQrs, setReceiptQrs] = useState<Record<string, string>>({});

  // 1. Live Feed: Restaurant Profile
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

  // 2. Generate/Track Guest Session Identity
  useEffect(() => {
    let id = localStorage.getItem('guest_id');
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem('guest_id', id);
    }
    setGuestId(id);
  }, []);

  // 3. Live Feed: Product Catalog
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

  // 4. Live Feed: Order Tracking pipeline
  useEffect(() => {
    if (!customerName) return;
    const colRef = collection(db, 'orders');
    const q = query(colRef, where('customerName', '==', customerName), where('restaurantUid', '==', restaurantUid));

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
  }, [customerName, restaurantUid]);

  // 5. Build Live Ticket QR Codes
  useEffect(() => {
    const generateQrs = async () => {
      const qrMap: Record<string, string> = {};
      for (const order of userOrders) {
        if (order.fourDigitCode) {
          qrMap[order.id] = await QRCode.toDataURL(
            JSON.stringify({
              orderId: order.id,
              code: order.fourDigitCode,
              customer: order.customerName,
              payment: order.paymentStatus
            })
          );
        }
      }
      setReceiptQrs(qrMap);
    };
    generateQrs();
  }, [userOrders]);

  const handleAddToCart = () => {
    if (!activeProduct) return;
    setCart([...cart, { product: activeProduct, quantity: selectedQty }]);
    setActiveProduct(null);
    setSelectedQty(1);
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.product.price * item.quantity), 0);

  // Mandatory Upfront Payment and Booking Routine
  // Matches the exact transactional checkout framework pattern used in the Salon workflow
  const handlePlaceOrder = (e: React.FormEvent) => {
    e.preventDefault();

    if (cart.length === 0 || !customerName.trim() || !pickupTime) {
      alert("Missing required order information details.");
      return;
    }

    // Pack the state properties exactly how your central ticket checkout system demands it
    const checkoutPayload = {
      targetBusinessUid: restaurantUid,
      totalPrice: cartTotal, 
      services: cart.map(item => ({
        serviceId: item.product.id,
        serviceName: item.product.name,
        price: item.product.price,
        quantity: item.quantity
      })),
      duration: 0, // Fallback placeholder to satisfy common ticket structures
      date: new Date().toISOString().split('T')[0], // Today's date stamp assignment
      time: pickupTime, 
      customerName: customerName.trim(),
      userMobilityStatus: currentStatus,
      tableNumber: currentStatus === 'in store' ? tableNumber : '',
      customerUid: userId || guestId
    };

    console.log("Navigating restaurant basket into global checkout framework:", checkoutPayload);
    
    // Clear local display states and push to the ticket checkout layout route view
    setCart([]);
    setIsCheckoutOpen(false);
    navigate("/ticket-checkout", { state: checkoutPayload });
  };

  const handleCancelOrder = async (orderId: string, amount: number) => {
    const confirmCancel = window.confirm("Cancel order? A complete refund will be automatically transferred back to your digital wallet.");
    if (!confirmCancel) return;

    try {
      // 1. Delete production queue document
      await deleteDoc(doc(db, 'orders', orderId));
      
      // 2. Rollback client ledger transaction
      const clientWalletRef = doc(db, 'wallets', userId || guestId);
      await updateDoc(clientWalletRef, {
        balance: increment(amount)
      });

      alert("Order voided successfully. Funds returned to your wallet.");
    } catch (error) {
      console.error("Error running cancellation engine: ", error);
      alert("Failed to compile transactional rollback sequence.");
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={styles.appContainer} style={{ background: "#050505", minHeight: "100vh", color: "#fff", fontFamily: "sans-serif", width: "100vw", display: "flex", flexDirection: "column", boxSizing: "border-box" }}>
      
      <header className={styles.topBar} style={{ background: "#0c0c0c", borderBottom: "1px solid #1a1a1a", padding: "16px 24px", width: "100%", boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", maxWidth: "600px", margin: "0 auto" }}>
          <div className={styles.brandInfo} style={{ minWidth: "0", flex: 1, marginRight: "16px" }}>
            <h1 style={{ margin: "0 0 4px 0", fontSize: "20px", fontWeight: 900 }}>{profile?.brandName || 'Loading...'}</h1>
            <p className={styles.brandBio} style={{ color: "#666", margin: 0, fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile?.brandBio || 'Connecting to store...'}</p>
            {profile?.address && (
              <p className={styles.brandLocation} style={{ fontSize: '11px', color: '#888', margin: "4px 0 0 0", display: "flex", alignItems: "center", gap: "4px" }}>
                <MapPin size={12} color="#E53935" /> {profile.address}
              </p>
            )}
          </div>
          <button className={styles.ordersBtn} onClick={() => setIsOrdersOpen(true)} style={{ background: "#111", border: "1px solid #222", color: "#fff", borderRadius: "8px", padding: "8px 16px", fontSize: "12px", fontWeight: "bold", cursor: "pointer", whiteSpace: "nowrap" }}>
            Tickets ({userOrders.length})
          </button>
        </div>
      </header>

      {/* Wallet Balance Strip Indicator */}
      <div style={{ background: "#111", borderBottom: "1px solid #222", padding: "8px 24px" }}>
        <div style={{ maxWidth: "600px", margin: "0 auto", display: "flex", justifyContent: "space-between", fontSize: "12px", color: "#aaa" }}>
          <span>Your Active Wallet Status:</span>
          <span style={{ color: "#4BB543", fontWeight: "bold" }}>Available Balance: {currency}{walletBalance.toFixed(2)}</span>
        </div>
      </div>

      <div className={styles.searchContainer} style={{ padding: "16px 24px 0 24px", width: "100%", maxWidth: "650px", margin: "0 auto", boxSizing: "border-box" }}>
        <div style={{ position: "relative", width: "100%" }}>
          <input 
            type="text" 
            placeholder="Search catalog items..." 
            className={styles.searchBar} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ background: "#0c0c0c", border: "1px solid #1a1a1a", borderRadius: "8px", padding: "10px 16px 10px 40px", color: "#fff", width: "100%", fontSize: "14px", boxSizing: "border-box" }}
          />
          <Search size={16} color="#444" style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)" }} />
        </div>
      </div>

      <main className={styles.catalogContainer} style={{ padding: "16px 24px 80px 24px", width: "100%", maxWidth: "650px", margin: "0 auto", boxSizing: "border-box", flex: 1 }}>
        <div className={styles.grid} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filteredProducts.map((product) => (
            <div key={product.id} className={styles.productCard} onClick={() => setActiveProduct(product)} style={{ display: "flex", background: "#0c0c0c", border: "1px solid #1a1a1a", borderRadius: "12px", padding: "12px", cursor: "pointer", gap: "16px", boxSizing: "border-box", alignItems: "center" }}>
              <img src={product.imageUrl || 'https://via.placeholder.com/150'} alt={product.name} className={styles.productImg} style={{ width: "70px", height: "70px", borderRadius: "8px", objectFit: "cover", background: "#111", flexShrink: 0 }} />
              <div className={styles.productDetails} style={{ flex: 1, minWidth: "0" }}>
                <h3 className={styles.productName} style={{ margin: "0 0 4px 0", fontSize: "14px", fontWeight: "bold" }}>{product.name}</h3>
                <p className={styles.productDesc} style={{ color: "#666", margin: "0 0 8px 0", fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{product.description}</p>
                <div className={styles.productFooter} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className={styles.price} style={{ color: "#4BB543", fontWeight: 900, fontSize: "14px" }}>{currency || product.currency || '$'}{product.price}</span>
                  <span style={{ fontSize: "11px", color: "#E53935", background: "rgba(229,57,53,0.08)", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold" }}>Add +</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {cart.length > 0 && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "#0c0c0c", borderTop: "1px solid #1a1a1a", padding: "12px 24px", zIndex: 90 }}>
          <div className={styles.stickyCart} onClick={() => setIsCheckoutOpen(true)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#E53935", padding: "14px 20px", borderRadius: "10px", color: "#fff", cursor: "pointer", maxWidth: "600px", margin: "0 auto", fontWeight: "bold", fontSize: "14px" }}>
            <span style={{ display: "flex", alignItems: "center", gap: "8px" }}><ShoppingBag size={16} /> Checkout Basket ({cart.reduce((a, b) => a + b.quantity, 0)})</span>
            <span>Pay: {currency}{cartTotal.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Product Drawer */}
      {activeProduct && (
        <div className={styles.drawerOverlay} style={{ position: "fixed", top: 0, bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div className={styles.drawer} style={{ background: "#0c0c0c", borderTop: "2px solid #E53935", width: "100%", maxWidth: "600px", borderTopLeftRadius: "16px", borderTopRightRadius: "16px", padding: "24px", boxSizing: "border-box" }}>
            <div className={styles.drawerHeader} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 900 }}>{activeProduct.name}</h2>
              <button className={styles.closeBtn} onClick={() => setActiveProduct(null)} style={{ background: "none", border: "none", color: "#666", fontSize: "20px", cursor: "pointer" }}>✕</button>
            </div>
            <p style={{ color: "#aaa", fontSize: "13px", lineHeight: "1.5", margin: "0 0 20px 0" }}>{activeProduct.description}</p>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <span style={{ fontSize: "13px", color: "#666", fontWeight: "bold" }}>Quantity Selection</span>
              <div className={styles.qtySelector} style={{ display: "flex", alignItems: "center", gap: "16px", background: "#111", padding: "6px 14px", borderRadius: "8px", border: "1px solid #222" }}>
                <button className={styles.qtyBtn} onClick={() => setSelectedQty(Math.max(1, selectedQty - 1))} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontWeight: "bold" }}>-</button>
                <span style={{ fontSize: "14px", fontWeight: "bold", minWidth: "16px", textAlign: "center" }}>{selectedQty}</span>
                <button className={styles.qtyBtn} onClick={() => setSelectedQty(selectedQty + 1)} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer", fontWeight: "bold" }}>+</button>
              </div>
            </div>
            <button className={styles.ordersBtn} style={{ width: '100%', padding: '14px', background: "#E53935", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", fontSize: "14px" }} onClick={handleAddToCart}>
              Confirm Selection — {currency}{(activeProduct.price * selectedQty).toFixed(2)}
            </button>
          </div>
        </div>
      )}

      {/* Checkout Screen Sheet */}
      {isCheckoutOpen && (
        <div className={styles.drawerOverlay} style={{ position: "fixed", top: 0, bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div className={styles.drawer} style={{ background: "#0c0c0c", borderTop: "2px solid #4BB543", width: "100%", maxWidth: "600px", borderTopLeftRadius: "16px", borderTopRightRadius: "16px", padding: "24px", boxSizing: "border-box", maxHeight: "90vh", overflowY: "auto" }}>
            <div className={styles.drawerHeader} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 900 }}>Authorize Balance Transfer</h2>
              <button className={styles.closeBtn} onClick={() => setIsCheckoutOpen(false)} style={{ background: "none", border: "none", color: "#666", fontSize: "20px", cursor: "pointer" }}>✕</button>
            </div>
            
            {paymentError && (
              <div style={{ background: "rgba(229,57,53,0.08)", border: "1px solid #E53935", borderRadius: "8px", padding: "12px", display: "flex", gap: "8px", alignItems: "center", color: "#ef4444", fontSize: "13px", marginBottom: "16px" }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{paymentError}</span>
              </div>
            )}

            <form onSubmit={handlePlaceOrder} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div className={styles.inputGroup} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "12px", color: "#aaa", fontWeight: "bold" }}>Your Full Name</label>
                <input type="text" className={styles.input} required value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="John Doe" style={{ background: "#111", border: "1px solid #222", borderRadius: "8px", padding: "10px 14px", color: "#fff", fontSize: "14px" }} />
              </div>
              <div className={styles.inputGroup} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "12px", color: "#aaa", fontWeight: "bold" }}>Target Arrival/Pickup Time</label>
                <input type="time" className={styles.input} required value={pickupTime} onChange={e => setPickupTime(e.target.value)} style={{ background: "#111", border: "1px solid #222", borderRadius: "8px", padding: "10px 14px", color: "#fff", fontSize: "14px" }} />
              </div>
              <div className={styles.inputGroup} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "12px", color: "#aaa", fontWeight: "bold" }}>Travel Frame Context</label>
                <select className={styles.input} value={currentStatus} onChange={e => setCurrentStatus(e.target.value)} style={{ background: "#111", border: "1px solid #222", borderRadius: "8px", padding: "10px 14px", color: "#fff", fontSize: "14px" }}>
                  <option value="home">At Home</option>
                  <option value="on the way">On the Way</option>
                  <option value="traffic">Stuck in Traffic</option>
                  <option value="in store">In Store</option>
                </select>
              </div>

              {currentStatus === 'in store' && (
                <div className={styles.inputGroup} style={{ display: "flex", flexDirection: "column", gap: "6px", borderLeft: '3px solid #4BB543', paddingLeft: '12px' }}>
                  <label style={{ fontSize: "12px", color: "#aaa", fontWeight: "bold" }}>Table / Booth Number</label>
                  <input type="text" className={styles.input} required value={tableNumber} onChange={e => setTableNumber(e.target.value)} placeholder="e.g., 5" style={{ background: "#111", border: "1px solid #222", borderRadius: "8px", padding: "10px 14px", color: "#fff", fontSize: "14px" }} />
                </div>
              )}

              <div style={{ background: "#111", border: "1px solid #222", borderRadius: "8px", padding: "12px", display: "flex", justifyContent: "space-between", fontSize: "13px", marginTop: "8px" }}>
                <span style={{ color: "#aaa", display: "flex", alignItems: "center", gap: "6px" }}><CreditCard size={14} /> Internal Balance Debit</span>
                <span style={{ fontWeight: "bold", color: "#fff" }}>-{currency}{cartTotal.toFixed(2)}</span>
              </div>

              <button type="submit" disabled={isProcessingPayment} style={{ width: '100%', padding: '14px', background: '#4BB543', color: '#fff', border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", fontSize: "14px" }}>
                {isProcessingPayment ? "Verifying Transaction Tokens..." : `Complete Ticket Purchase (${currency}${cartTotal.toFixed(2)})`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Active Orders Panel Sheet */}
      {isOrdersOpen && (
        <div className={styles.drawerOverlay} style={{ position: "fixed", top: 0, bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.7)", zIndex: 100, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div className={styles.drawer} style={{ background: "#0c0c0c", borderTop: "2px solid #E53935", width: "100%", maxWidth: "600px", borderTopLeftRadius: "16px", borderTopRightRadius: "16px", padding: "24px", boxSizing: "border-box", maxHeight: "85vh", overflowY: "auto" }}>
            <div className={styles.drawerHeader} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 900 }}>Your Purchased Receipts</h2>
              <button className={styles.closeBtn} onClick={() => setIsOrdersOpen(false)} style={{ background: "none", border: "none", color: "#666", fontSize: "20px", cursor: "pointer" }}>✕</button>
            </div>
            {userOrders.length === 0 ? (
              <p style={{ color: '#555', textAlign: 'center', fontSize: "13px", fontWeight: "bold", padding: "24px 0" }}>No transaction records mapped.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                {userOrders.map((order) => (
                  <div key={order.id} className={styles.orderItem} style={{ background: "#111", border: "1px solid #222", borderRadius: "12px", padding: "16px" }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "11px", textTransform: "uppercase", background: "rgba(229,57,53,0.1)", color: "#E53935", padding: "3px 8px", borderRadius: "4px", fontWeight: "bold" }}>{order.status}</span>
                        {order.status === 'pending' && (
                          <button onClick={() => handleCancelOrder(order.id, order.totalPaid)} style={{ padding: '3px 8px', background: 'none', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', fontWeight: "bold" }}>
                            Void & Refund
                          </button>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "#666", fontSize: "12px" }}>
                        <Clock size={12} />
                        <span>{order.pickupTime}</span>
                      </div>
                    </div>

                    <div style={{ margin: '8px 0', display: "flex", flexDirection: "column", gap: "4px" }}>
                      {order.items.map((it, idx) => (
                        <div key={idx} style={{ fontSize: '13px', display: 'flex', justifyContent: 'space-between', color: "#aaa" }}>
                          <span>{it.quantity}x {it.name}</span>
                          <span>{currency}{(it.price * it.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>

                    <div style={{ marginTop: '12px', borderTop: '1px dashed #222', paddingTop: '12px', textAlign: "center" }}>
                      <span style={{ fontSize: "11px", color: "#4BB543", fontWeight: "bold", display: "block", marginBottom: "2px" }}>✓ PAID VIA DIGITAL WALLET</span>
                      <span style={{ fontSize: "10px", color: "#555", display: "block", marginBottom: "6px" }}>VERIFICATION TOKEN KEY</span>
                      <p style={{ fontSize: '20px', fontWeight: 900, margin: '4px 0', color: '#fff', letterSpacing: "1px" }}>
                        {order.fourDigitCode || '####'}
                      </p>
                      
                      <div style={{ display: "flex", justifyContent: "center", marginTop: "10px" }}>
                        {receiptQrs[order.id] && (
                          <img src={receiptQrs[order.id]} alt="Order QR" style={{ width: "110px", height: "110px", border: "1px solid #222", borderRadius: "8px", padding: "6px", background: "#fff" }} />
                        )}
                      </div>
                    </div>

                    {order.status === 'finished' && (
                      <div style={{ marginTop: "12px", background: "rgba(75,181,67,0.08)", color: "#4BB543", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", padding: "8px", borderRadius: "6px", fontSize: "12px", fontWeight: "bold" }}>
                        <CheckCircle size={14} /> DISPATCH COMPLETED
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className={styles.watermark} style={{ textAlign: "center", color: "#222", fontSize: "10px", padding: "20px 0", letterSpacing: "1px", fontWeight: "bold" }}>
        MALVINAI LEDGER STANDARD
      </div>
    </div>
  );
};