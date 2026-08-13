import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag,
  CalendarCheck,
  MessageCircle,
  Star,
  Gift,
  Send,
  Plus,
  Minus,
  X,
  Check,
  Loader2,
} from "lucide-react";
import {
  doc,
  onSnapshot,
  collection,
  setDoc,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
  increment,
  updateDoc,
} from "firebase/firestore";
import { firestore as db, auth } from "../../firebase";
import { applyStorefrontIdentity, waitForRealAuthUid } from "../../services/storefrontAuth";
import { ToolState, isCustomerVisible } from "../../config/bvinTools";

/* ============================================================================
   BVinStore — the unified customer-facing storefront for every B-Vin
   business. Runs inside StoreFront.tsx's sandboxed <iframe> on
   stores.malvinai.com, exactly like Store.tsx / salonStore.tsx / etc:
   announces BVIN_READY, receives MALVIN_USER identity over postMessage,
   and (since a sandboxed frame can't navigate window.top itself) delegates
   any Stripe checkout back to the parent via REQUEST_BVIN_CHECKOUT.

   Which sections render is driven by the business's own `business/{uid}`
   enabledTools — but ONLY for tools the shared catalog marks
   customerVisible; business-internal tools (analytics, jobRequests, etc.)
   are never rendered here even if somehow enabled, and the underlying
   Firestore rules back this up by keeping their subcollections
   owner/admin-read-only regardless of this flag.
============================================================================ */

const ALLOWED_ORIGINS = [
  "https://www.malvinai.com",
  "https://malvinai.com",
  "http://localhost:5173",
  "http://localhost:3000",
];

interface BVinColors {
  accent: string;
  storeBg: string;
  storeText: string;
  font: string;
}

interface BVinProfile {
  name: string;
  logoUrl?: string;
  enabledTools: ToolState;
  colors: BVinColors;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

const DEFAULT_COLORS: BVinColors = {
  accent: "#22c55e",
  storeBg: "#faf8f4",
  storeText: "#0b0b0b",
  font: "Inter",
};

const BVinStore: React.FC = () => {
  const { uid } = useParams<{ uid: string }>();
  const businessId = uid || "";

  const [profile, setProfile] = useState<BVinProfile | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [activeUser, setActiveUser] = useState<{ uid: string; email: string | null; isGuest: boolean } | null>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const [reservationName, setReservationName] = useState("");
  const [reservationNote, setReservationNote] = useState("");
  const [reservationTime, setReservationTime] = useState("");
  const [reservationSent, setReservationSent] = useState(false);

  const [chatText, setChatText] = useState("");
  const [chatMessages, setChatMessages] = useState<{ id: string; from: string; text: string; at: any }[]>([]);

  const [myRating, setMyRating] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [reviewSent, setReviewSent] = useState(false);

  const [loyaltyPoints, setLoyaltyPoints] = useState<number | null>(null);

  const [placingOrder, setPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [feeNotice, setFeeNotice] = useState<"before" | null>(null);
  const [lastConfirmedOrder, setLastConfirmedOrder] = useState<string | null>(null);

  const pendingOrderResolvers = useRef<Record<string, { resolve: (v: any) => void }>>({});

  /* --------------------------- Load business profile --------------------------- */

  useEffect(() => {
    if (!businessId) return;
    const ref = doc(db, "business", businessId);
    const unsub = onSnapshot(ref, (snap) => {
      if (!snap.exists()) {
        setNotFound(true);
        return;
      }
      const data = snap.data() as any;
      const p = data.profile || {};
      setProfile({
        name: p.name || "Business",
        logoUrl: p.logoUrl,
        enabledTools: data.enabledTools || {},
        colors: { ...DEFAULT_COLORS, ...(p.colors || {}) },
      });
    });
    return () => unsub();
  }, [businessId]);

  // Every store open came from scanning (or tapping) one of the business's
  // QR codes — that's exactly what B-Vin's Analytics card wants to count.
  // Fire-and-forget, once per mount; no need to block rendering on it.
  useEffect(() => {
    if (!businessId) return;
    updateDoc(doc(db, "business", businessId), { "profile.qrScans": increment(1) }).catch(() => {
      // Doc might not exist yet on a brand-new business — fall back to a
      // merge write so the very first scan doesn't get silently dropped.
      setDoc(doc(db, "business", businessId), { profile: { qrScans: increment(1) } }, { merge: true }).catch(() => {});
    });
  }, [businessId]);

  /* --------------------------- Catalogue --------------------------- */

  useEffect(() => {
    if (!businessId || !profile?.enabledTools.catalogue) return;
    const unsub = onSnapshot(collection(db, "business", businessId, "products"), (snap) => {
      setProducts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, [businessId, profile?.enabledTools.catalogue]);

  /* --------------------------- Chat (lightweight, self-contained) --------------------------- */

  useEffect(() => {
    if (!businessId || !profile?.enabledTools.chat || !activeUser?.uid) return;
    const q = query(
      collection(db, "business", businessId, "chats", activeUser.uid, "messages"),
      orderBy("at", "asc"),
      limit(100)
    );
    const unsub = onSnapshot(q, (snap) => {
      setChatMessages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, [businessId, profile?.enabledTools.chat, activeUser?.uid]);

  /* --------------------------- Loyalty --------------------------- */

  useEffect(() => {
    if (!businessId || !profile?.enabledTools.loyalty || !activeUser?.uid) return;
    const ref = doc(db, "business", businessId, "loyalty", activeUser.uid);
    const unsub = onSnapshot(ref, (snap) => setLoyaltyPoints(snap.exists() ? (snap.data() as any).points || 0 : 0));
    return () => unsub();
  }, [businessId, profile?.enabledTools.loyalty, activeUser?.uid]);

  /* --------------------------- StoreFront handshake --------------------------- */

  useEffect(() => {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "BVIN_READY" }, "*");
    }

    const handleParentMessage = (event: MessageEvent) => {
      if (!ALLOWED_ORIGINS.includes(event.origin)) return;

      if (event.data?.type === "MALVIN_USER") {
        setActiveUser({ uid: event.data.uid, email: event.data.email, isGuest: event.data.isGuest });
        applyStorefrontIdentity(auth, event.data.customToken);
        return;
      }

      if (event.data?.type === "BVIN_CHECKOUT_NOT_REQUIRED" || event.data?.type === "BVIN_CHECKOUT_FAILURE") {
        const orderId = event.data.orderId;
        const resolver = pendingOrderResolvers.current[orderId];
        if (resolver) {
          resolver.resolve(event.data);
          delete pendingOrderResolvers.current[orderId];
        }
      }
    };

    window.addEventListener("message", handleParentMessage);
    return () => window.removeEventListener("message", handleParentMessage);
  }, []);

  /* --------------------------------- Derived --------------------------------- */

  const theme = profile?.colors || DEFAULT_COLORS;
  const cartTotal = useMemo(() => cart.reduce((sum, i) => sum + i.product.price * i.quantity, 0), [cart]);

  /* --------------------------------- Handlers --------------------------------- */

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) return prev.map((i) => (i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      return [...prev, { product, quantity: 1 }];
    });
  };
  const removeFromCart = (productId: string) => {
    setCart((prev) =>
      prev
        .map((i) => (i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  // Asks the (unsandboxed) StoreFront parent to run the checkout — it's the
  // only thing that can actually navigate window.top to Stripe. Resolves
  // once the parent reports back "not required" / "failed"; a real Stripe
  // redirect just navigates the whole page away, so there's nothing further
  // to resolve in that case.
  const requestCheckout = (orderId: string, amount: number): Promise<any> =>
    new Promise((resolve) => {
      pendingOrderResolvers.current[orderId] = { resolve };
      window.parent.postMessage(
        { type: "REQUEST_BVIN_CHECKOUT", payload: { businessId, orderId, amount } },
        "*"
      );
      // Safety timeout in case the parent never answers (e.g. this store
      // was opened directly, outside StoreFront's iframe, for local testing).
      setTimeout(() => {
        if (pendingOrderResolvers.current[orderId]) {
          resolve({ type: "BVIN_CHECKOUT_FAILURE", error: "Couldn't reach checkout." });
          delete pendingOrderResolvers.current[orderId];
        }
      }, 8000);
    });

  const placeOrder = async () => {
    if (!businessId || (cart.length === 0 && !profile?.enabledTools.orders)) return;
    setOrderError(null);
    setPlacingOrder(true);
    try {
      const realUid = await waitForRealAuthUid(auth);
      if (!realUid) throw new Error("Still connecting to your account — try again in a moment.");

      const orderRef = await addDoc(collection(db, "business", businessId, "orders"), {
        customerUid: realUid,
        items: cart.map((i) => ({ name: i.product.name, price: i.product.price, quantity: i.quantity })),
        total: cartTotal,
        status: "pending_payment",
        createdAt: serverTimestamp(),
      });

      const tools: Partial<ToolState> = profile?.enabledTools || {};
      const needsCharge = !!tools.receiveMoney || !!tools.receipts;

      if (needsCharge && !tools.receiveMoney && tools.receipts) {
        // Receive Money off, Receipts on -> the flat €0.50 confirm fee.
        // Business gets paid at the counter; this just confirms + unlocks
        // the receipt. Four-second heads-up before we send them to pay it.
        setFeeNotice("before");
        await new Promise((r) => setTimeout(r, 4000));
        setFeeNotice(null);
      }

      if (needsCharge) {
        const result = await requestCheckout(orderRef.id, tools.receiveMoney ? cartTotal : 0.5);
        if (result?.type === "BVIN_CHECKOUT_FAILURE") {
          throw new Error(result.error || "Checkout failed.");
        }
        if (result?.type === "BVIN_CHECKOUT_NOT_REQUIRED") {
          await setDoc(doc(db, "business", businessId, "orders", orderRef.id), { status: "confirmed" }, { merge: true });
          setLastConfirmedOrder(orderRef.id);
          setCart([]);
        }
        // Otherwise a real Stripe redirect is in flight (window.top is
        // navigating away) — the webhook confirms the order server-side.
      } else {
        // No payment anywhere in this flow at all.
        await setDoc(doc(db, "business", businessId, "orders", orderRef.id), { status: "confirmed" }, { merge: true });
        setLastConfirmedOrder(orderRef.id);
        setCart([]);
      }
    } catch (err: any) {
      setOrderError(err?.message || "Couldn't place your order. Try again.");
    } finally {
      setPlacingOrder(false);
    }
  };

  const sendReservation = async () => {
    if (!businessId) return;
    const realUid = await waitForRealAuthUid(auth);
    if (!realUid) return;
    await addDoc(collection(db, "business", businessId, "reservations"), {
      customerUid: realUid,
      name: reservationName,
      time: reservationTime,
      note: reservationNote,
      status: "requested",
      createdAt: serverTimestamp(),
    });
    setReservationSent(true);
  };

  const sendChatMessage = async () => {
    if (!businessId || !activeUser?.uid || !chatText.trim()) return;
    const realUid = await waitForRealAuthUid(auth);
    if (!realUid) return;
    await addDoc(collection(db, "business", businessId, "chats", realUid, "messages"), {
      from: "customer",
      text: chatText.trim(),
      at: serverTimestamp(),
    });
    setChatText("");
  };

  const submitReview = async () => {
    if (!businessId || myRating === 0) return;
    const realUid = await waitForRealAuthUid(auth);
    if (!realUid) return;
    await setDoc(doc(db, "business", businessId, "reviews", realUid), {
      rating: myRating,
      text: reviewText,
      at: serverTimestamp(),
    });
    setReviewSent(true);
  };

  /* ==================================================================== */

  if (notFound) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter, sans-serif" }}>
        <p style={{ color: "#888" }}>This store doesn't exist.</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 className="bvin-spin" size={22} color="#999" />
        <style>{`.bvin-spin { animation: bvinSpin 1s linear infinite; } @keyframes bvinSpin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // A tool only ever renders here if it's BOTH enabled by the business AND
  // marked customerVisible in the shared catalog — this is what stops a
  // business-internal tool (analytics, jobRequests, etc.) from ever
  // appearing in the customer store, even if it's somehow flagged on.
  const rawTools = profile.enabledTools;
  const tools = (Object.keys(rawTools) as (keyof typeof rawTools)[]).reduce((acc, key) => {
    acc[key] = !!rawTools[key] && isCustomerVisible(key as any);
    return acc;
  }, {} as typeof rawTools);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme.storeBg,
        color: theme.storeText,
        fontFamily: `${theme.font}, sans-serif`,
        paddingBottom: 90,
      }}
    >
      <style>{`
        * { box-sizing: border-box; }
        .bvin-store-btn {
          border: none; border-radius: 12px; cursor: pointer;
          font-weight: 700; transition: transform 0.15s ease, filter 0.2s ease;
        }
        .bvin-store-btn:hover { filter: brightness(1.05); transform: translateY(-1px); }
        .bvin-store-btn:active { transform: scale(0.97); }
      `}</style>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 18px 14px" }}>
        {profile.logoUrl && (
          <img src={profile.logoUrl} alt={profile.name} style={{ width: 42, height: 42, borderRadius: "50%", objectFit: "cover" }} />
        )}
        <h1 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>{profile.name}</h1>
      </div>

      <div style={{ padding: "0 18px", display: "flex", flexDirection: "column", gap: 22, maxWidth: 640, margin: "0 auto" }}>
        {/* Catalogue */}
        {tools.catalogue && (
          <section>
            <SectionTitle icon={ShoppingBag} label="Menu" accent={theme.accent} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
              {products.length === 0 && <p style={{ fontSize: 13, opacity: 0.6 }}>Nothing listed yet.</p>}
              {products.map((p) => (
                <div key={p.id} style={{ borderRadius: 16, overflow: "hidden", background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.06)" }}>
                  {p.imageUrl && <img src={p.imageUrl} alt={p.name} style={{ width: "100%", height: 90, objectFit: "cover" }} />}
                  <div style={{ padding: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{p.name}</div>
                    <div style={{ fontSize: 12, opacity: 0.6, margin: "2px 0 8px" }}>€{p.price?.toFixed(2)}</div>
                    {tools.orders && (
                      <button
                        className="bvin-store-btn"
                        style={{ background: theme.accent, color: "#06210f", fontSize: 11.5, padding: "6px 10px", width: "100%" }}
                        onClick={() => addToCart(p)}
                      >
                        Add
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Orders (no catalogue — simple request) */}
        {tools.orders && !tools.catalogue && (
          <section>
            <SectionTitle icon={ShoppingBag} label="Place an order" accent={theme.accent} />
            <p style={{ fontSize: 13, opacity: 0.65, marginBottom: 10 }}>Send a request and the business will confirm it.</p>
            <button className="bvin-store-btn" style={{ background: theme.accent, color: "#06210f", padding: "12px 16px", width: "100%" }} onClick={placeOrder} disabled={placingOrder}>
              {placingOrder ? "Sending…" : "Request order"}
            </button>
          </section>
        )}

        {/* Reservations */}
        {tools.reservations && (
          <section>
            <SectionTitle icon={CalendarCheck} label="Book a time" accent={theme.accent} />
            {reservationSent ? (
              <p style={{ fontSize: 13, color: theme.accent, fontWeight: 700 }}>
                <Check size={14} style={{ verticalAlign: -2 }} /> Request sent — the business will confirm it.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <input placeholder="Your name" value={reservationName} onChange={(e) => setReservationName(e.target.value)} style={inputStyle} />
                <input placeholder="Preferred time" value={reservationTime} onChange={(e) => setReservationTime(e.target.value)} style={inputStyle} />
                <textarea placeholder="Anything else?" value={reservationNote} onChange={(e) => setReservationNote(e.target.value)} rows={2} style={{ ...inputStyle, resize: "none" }} />
                <button className="bvin-store-btn" style={{ background: theme.accent, color: "#06210f", padding: "11px 16px" }} onClick={sendReservation}>
                  Request booking
                </button>
              </div>
            )}
          </section>
        )}

        {/* Reviews */}
        {tools.reviews && (
          <section>
            <SectionTitle icon={Star} label="Leave a review" accent={theme.accent} />
            {reviewSent ? (
              <p style={{ fontSize: 13, color: theme.accent, fontWeight: 700 }}>Thanks for the feedback!</p>
            ) : (
              <div>
                <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      size={22}
                      fill={n <= myRating ? theme.accent : "none"}
                      color={n <= myRating ? theme.accent : "#999"}
                      style={{ cursor: "pointer" }}
                      onClick={() => setMyRating(n)}
                    />
                  ))}
                </div>
                <textarea placeholder="Optional comment" value={reviewText} onChange={(e) => setReviewText(e.target.value)} rows={2} style={{ ...inputStyle, resize: "none", marginBottom: 8 }} />
                <button className="bvin-store-btn" style={{ background: theme.accent, color: "#06210f", padding: "10px 16px" }} onClick={submitReview} disabled={myRating === 0}>
                  Submit
                </button>
              </div>
            )}
          </section>
        )}

        {/* Loyalty */}
        {tools.loyalty && (
          <section>
            <SectionTitle icon={Gift} label="Your points" accent={theme.accent} />
            <div style={{ fontSize: 26, fontWeight: 800 }}>{loyaltyPoints ?? "—"}</div>
          </section>
        )}

        {/* Chat */}
        {tools.chat && (
          <section>
            <SectionTitle icon={MessageCircle} label="Message this business" accent={theme.accent} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 220, overflowY: "auto", marginBottom: 10 }}>
              {chatMessages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    alignSelf: m.from === "customer" ? "flex-end" : "flex-start",
                    background: m.from === "customer" ? theme.accent : "rgba(0,0,0,0.06)",
                    color: m.from === "customer" ? "#06210f" : theme.storeText,
                    padding: "8px 12px",
                    borderRadius: 14,
                    fontSize: 13,
                    maxWidth: "80%",
                  }}
                >
                  {m.text}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input placeholder="Type a message…" value={chatText} onChange={(e) => setChatText(e.target.value)} style={{ ...inputStyle, flex: 1 }} onKeyDown={(e) => e.key === "Enter" && sendChatMessage()} />
              <button className="bvin-store-btn" style={{ background: theme.accent, color: "#06210f", padding: "0 14px" }} onClick={sendChatMessage}>
                <Send size={15} />
              </button>
            </div>
          </section>
        )}

        {orderError && <p style={{ fontSize: 12.5, color: "#d64545" }}>{orderError}</p>}
        {lastConfirmedOrder && (
          <p style={{ fontSize: 12.5, color: theme.accent, fontWeight: 700 }}>
            <Check size={13} style={{ verticalAlign: -2 }} /> Order confirmed!
          </p>
        )}
      </div>

      {/* Cart bar (catalogue + orders) */}
      {tools.catalogue && tools.orders && cart.length > 0 && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: 14 }}>
          <button
            className="bvin-store-btn"
            style={{ background: theme.accent, color: "#06210f", width: "100%", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
            onClick={() => setCartOpen(true)}
          >
            <span>{cart.reduce((n, i) => n + i.quantity, 0)} item(s)</span>
            <span>€{cartTotal.toFixed(2)} · View cart</span>
          </button>
        </div>
      )}

      {/* Cart drawer */}
      <AnimatePresence>
        {cartOpen && (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{
              position: "fixed",
              inset: "auto 0 0 0",
              background: theme.storeBg,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 20,
              maxHeight: "70vh",
              overflowY: "auto",
              boxShadow: "0 -10px 40px rgba(0,0,0,0.15)",
              zIndex: 60,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>Your cart</h3>
              <button onClick={() => setCartOpen(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>
            {cart.map((i) => (
              <div key={i.product.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{i.product.name}</div>
                  <div style={{ fontSize: 12, opacity: 0.6 }}>€{i.product.price.toFixed(2)}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={() => removeFromCart(i.product.id)} style={qtyBtnStyle}><Minus size={12} /></button>
                  <span style={{ fontSize: 13, fontWeight: 700, minWidth: 16, textAlign: "center" }}>{i.quantity}</span>
                  <button onClick={() => addToCart(i.product)} style={qtyBtnStyle}><Plus size={12} /></button>
                </div>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: 15, margin: "14px 0" }}>
              <span>Total</span>
              <span>€{cartTotal.toFixed(2)}</span>
            </div>
            <button
              className="bvin-store-btn"
              style={{ background: theme.accent, color: "#06210f", width: "100%", padding: "13px 16px" }}
              onClick={() => {
                setCartOpen(false);
                placeOrder();
              }}
              disabled={placingOrder}
            >
              {placingOrder ? "Placing order…" : "Place order"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm-fee 4s heads-up (Receive Money off, Receipts on) */}
      <AnimatePresence>
        {feeNotice === "before" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position: "fixed",
              bottom: 100,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(20,20,20,0.9)",
              color: "#fff",
              backdropFilter: "blur(20px)",
              borderRadius: 16,
              padding: "14px 20px",
              maxWidth: 300,
              textAlign: "center",
              fontSize: 13,
              zIndex: 90,
            }}
          >
            {profile.name} asks all customers to pay at the counter. A small €0.50 fee confirms your order.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const SectionTitle: React.FC<{ icon: React.ElementType; label: string; accent: string }> = ({ icon: Icon, label, accent }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
    <Icon size={16} color={accent} />
    <h2 style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>{label}</h2>
  </div>
);

const inputStyle: React.CSSProperties = {
  border: "1px solid rgba(0,0,0,0.12)",
  borderRadius: 10,
  padding: "10px 12px",
  fontSize: 13,
  background: "rgba(255,255,255,0.6)",
  fontFamily: "inherit",
};

const qtyBtnStyle: React.CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: "50%",
  border: "1px solid rgba(0,0,0,0.15)",
  background: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

export default BVinStore;