import React, { useState, useEffect } from 'react';
import { firestore as db } from '../firebase'; 
import { doc, onSnapshot, collection } from 'firebase/firestore';
import styles from './store.module.css';
import { useParams, useNavigate } from "react-router-dom"; 
import { auth } from '../firebase';

// --- Interfaces ---
interface RestaurantProfile {
  brandName: string;
  brandBio: string;
  address?: string; 
  onlineStatus: boolean;
  orderLimitReached?: boolean; 
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

const VerifiedBadge = () => (
    <svg 
        width="14" 
        height="14" 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        style={{ marginLeft: '4px', verticalAlign: 'middle' }}
    >
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="#007FFF"/>
    </svg>
);

export const StoreFrontend: React.FC = () => {
  const { storeUid } = useParams<{ storeUid: string }>();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<RestaurantProfile | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [customerName, setCustomerName] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Load restaurant profile and products
  useEffect(() => {
    if (!storeUid) return;

    const profileRef = doc(db, 'restaurantprofile', storeUid);
    const unsubscribeProfile = onSnapshot(profileRef, (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data() as RestaurantProfile);
      }
      setLoading(false);
    });

    const productsRef = collection(db, 'restaurantprofile', storeUid, 'products');
    const unsubscribeProducts = onSnapshot(productsRef, (querySnap) => {
      const prodList: Product[] = [];
      querySnap.forEach((d) => {
        prodList.push({ id: d.id, ...d.data() } as Product);
      });
      setProducts(prodList);
    });

    return () => {
      unsubscribeProfile();
      unsubscribeProducts();
    };
  }, [storeUid]);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === productId);
      if (existing && existing.quantity > 1) {
        return prev.map((item) =>
          item.product.id === productId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );
      }
      return prev.filter((item) => item.product.id !== productId);
    });
  };

  const totalCartAmount = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);

  // Unified payment checkout handler routing to /ticket
  const handleProceedToCheckout = async (paymentMethod: 'stripe' | 'wallet') => {
    const user = auth.currentUser;
    if (!user) {
      triggerToast("Please log in to make a purchase.");
      return;
    }
    if (!customerName.trim()) {
      triggerToast("Please enter an identification name for pickup.");
      return;
    }
    if (cart.length === 0) {
      triggerToast("Your cart is empty.");
      return;
    }

    const checkoutPayload = {
      targetBusinessUid: storeUid,
      amount: totalCartAmount,
      merchantType: "food",
      appointmentDetails: {
        services: cart.map(item => ({
          serviceName: `${item.quantity}x ${item.product.name}`,
          price: item.product.price,
          duration: 0,
        })),
        stylist: customerName, // Carry client identification under the generic stylist string key
        duration: 0
      }
    };

    localStorage.setItem("pending_checkout_payload", JSON.stringify(checkoutPayload));

    if (paymentMethod === 'stripe') {
      navigate("/ticket", { state: { ...checkoutPayload, gateway: "stripe" } });
    } else {
      navigate("/ticket", { state: { ...checkoutPayload, gateway: "wallet" } });
    }
  };

  if (loading) {
    return <div className={styles.loading}>Loading Store...</div>;
  }

  if (!profile) {
    return <div className={styles.error}>Store not found.</div>;
  }

  return (
    <div className={styles.container}>
      {toastMessage && <div className={styles.toast}>{toastMessage}</div>}

      <header className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate(-1)}>← Back</button>
        <div className={styles.brandContainer}>
          <h1 className={styles.brandName}>
            {profile.brandName} {profile.isVerified && <VerifiedBadge />}
          </h1>
          <p className={styles.brandBio}>{profile.brandBio}</p>
          {profile.address && <p className={styles.address}>{profile.address}</p>}
        </div>
      </header>

      <div className={styles.storeBody}>
        <section className={styles.productsSection}>
          <h2>Menu</h2>
          <div className={styles.productsGrid}>
            {products.map((product) => (
              <div key={product.id} className={styles.productCard}>
                <img src={product.imageUrl || "/placeholder.png"} alt={product.name} className={styles.productImage} />
                <div className={styles.productInfo}>
                  <h3>{product.name}</h3>
                  <p>{product.description}</p>
                  <span className={styles.price}>€{product.price.toFixed(2)}</span>
                </div>
                <button className={styles.addButton} onClick={() => addToCart(product)}>+</button>
              </div>
            ))}
          </div>
        </section>

        {cart.length > 0 && (
          <section className={styles.cartSection}>
            <h2>Your Order</h2>
            <div className={styles.cartItems}>
              {cart.map((item) => (
                <div key={item.product.id} className={styles.cartItem}>
                  <span>{item.quantity}x {item.product.name}</span>
                  <div className={styles.cartItemControls}>
                    <button onClick={() => removeFromCart(item.product.id)}>-</button>
                    <span>€{(item.product.price * item.quantity).toFixed(2)}</span>
                    <button onClick={() => addToCart(item.product)}>+</button>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.cartTotal}>
              <span>Total:</span>
              <span>€{totalCartAmount.toFixed(2)}</span>
            </div>

            <div className={styles.customerInputGroup}>
              <label htmlFor="customerName">Pickup Name:</label>
              <input
                id="customerName"
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. John Doe"
                className={styles.nameInput}
              />
            </div>

            <div className={styles.checkoutActions}>
              <button 
                onClick={() => handleProceedToCheckout('wallet')} 
                className={styles.walletPayButton}
              >
                Pay with App Wallet
              </button>
              <button 
                onClick={() => handleProceedToCheckout('stripe')} 
                className={styles.stripePayButton}
              >
                Pay with Card (Stripe)
              </button>
            </div>
          </section>
        )}
      </div>

      <div className={styles.watermark}>
        Malvinai
      </div>
    </div>
  );
};