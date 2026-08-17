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
  BadgeCheck,
  Phone,
  Frown,
  Globe,
  MapPin,
  Clock,
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
  getDoc,
  getDocs,
} from "firebase/firestore";
import QRCode from "qrcode";
import { firestore as db, auth } from "../../firebase";
import { applyStorefrontIdentity, resolveGuestUid } from "../../services/storefrontAuth";
import { ToolState, isCustomerVisible } from "../../config/bvinTools";
import { formatPrice } from "../../config/currency";
import { OfferSticker, SpecialOfferData } from "./OfferSticker";
import { useAccountStanding } from "../../hooks/useAccountStanding";
import { useLanguage } from "../../contexts/LanguageContext";
import RequestStaffFlow from "./RequestStaffFlow";
import { encodeOrderQr } from "../../utils/orderQr";

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
  bio?: string;
  address?: string;
  phone?: string;
  openingTime?: string;
  closingTime?: string;
  allowToGo?: boolean;
  enabledTools: ToolState;
  colors: BVinColors;
  specialOffer?: SpecialOfferData;
  currency?: string;
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  duration?: string;
  discount?: number;
  category?: string;
  stock?: number;
  variants?: string[];
}

interface CartItem {
  product: Product;
  quantity: number;
}

const DEFAULT_COLORS: BVinColors = {
  accent: "#4F9CF9",
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
  // activeUser is ONLY ever set by the postMessage handshake below, which
  // requires this page to be embedded in StoreFront.tsx's <iframe> with a
  // parent that actually sends MALVIN_USER — never true for someone who
  // scanned a QR code directly with their phone camera, which is the
  // normal way a customer reaches this page. guestUid is resolved
  // independently (real handshake if one's coming, anonymous sign-in
  // immediately otherwise — see resolveGuestUid) so chat and loyalty work
  // for that overwhelmingly common case instead of silently never loading.
  const [guestUid, setGuestUid] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    resolveGuestUid(auth).then((uid) => { if (!cancelled) setGuestUid(uid); });
    return () => { cancelled = true; };
  }, []);
  const effectiveUid = activeUser?.uid || guestUid;

  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  // "That's all" flow: instead of paying online, the customer shows this QR
  // to a worker, who scans it and keys the order in themselves.
  const [orderQrSrc, setOrderQrSrc] = useState<string | null>(null);
  const [orderQrBusy, setOrderQrBusy] = useState(false);

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
        bio: p.bio || "",
        address: p.address || "",
        phone: p.phone || "",
        openingTime: p.openingTime || "",
        closingTime: p.closingTime || "",
        allowToGo: !!p.allowToGo,
        enabledTools: data.enabledTools || {},
        colors: { ...DEFAULT_COLORS, ...(p.colors || {}) },
        specialOffer: p.specialOffer,
        currency: p.currency || "EUR",
      });
    });
    return () => unsub();
  }, [businessId]);

  // Star rating — average of business/{id}/reviews, only fetched (and only
  // rendered) when the business has Reviews enabled. Deliberately a
  // one-time fetch, not onSnapshot — a customer doesn't need to see a
  // brand-new review pop in live while they're browsing, and a live
  // listener here means re-reading the WHOLE reviews collection every
  // time anyone leaves a review, for every customer currently on the
  // page at once. Re-fetches once per mount, which is the same
  // "accurate as of when you loaded the page" freshness most storefronts
  // actually have anyway.
  const [avgRating, setAvgRating] = useState<number | null>(null);
  const [reviewCount, setReviewCount] = useState(0);
  const refreshReviews = React.useCallback(async () => {
    if (!businessId) return;
    const snap = await getDocs(collection(db, "business", businessId, "reviews"));
    if (snap.empty) {
      setAvgRating(null);
      setReviewCount(0);
      return;
    }
    const ratings = snap.docs.map((d) => (d.data() as any).rating || 0);
    setAvgRating(ratings.reduce((a, b) => a + b, 0) / ratings.length);
    setReviewCount(ratings.length);
  }, [businessId]);
  useEffect(() => {
    if (!businessId || !profile?.enabledTools.reviews) return;
    refreshReviews();
  }, [businessId, profile?.enabledTools.reviews, refreshReviews]);

  // The language selector glows for a few seconds on every visit — new or
  // returning customer alike — purely so first-time (and easily-missed)
  // visitors notice it's there at all.
  const [langGlow, setLangGlow] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setLangGlow(false), 4000);
    return () => clearTimeout(t);
  }, []);

  const { isVerified } = useAccountStanding(businessId);
  const { language, languages, setLanguage } = useLanguage();
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [showLangPrompt, setShowLangPrompt] = useState(true);
  const [entryLangSearch, setEntryLangSearch] = useState("");
  // Special Offer splash — dismissed for this page load only; a fresh
  // scan of the store QR is a fresh mount, so it shows again next time,
  // same as the language prompt above.
  const [offerDismissed, setOfferDismissed] = useState(false);
  const [langSearch, setLangSearch] = useState("");
  const [contactOpen, setContactOpen] = useState(false);
  const [complaintOpen, setComplaintOpen] = useState(false);
  const [complaintText, setComplaintText] = useState("");
  const [complaintSent, setComplaintSent] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const contactPhone = profile?.phone || "";

  const submitComplaint = async () => {
    if (!complaintText.trim()) return;
    try {
      const uid = await resolveGuestUid(auth);
      await addDoc(collection(db, "business", businessId, "complaints"), {
        text: complaintText.trim(),
        customerUid: uid,
        createdAt: serverTimestamp(),
      });
      setComplaintSent(true);
      setComplaintText("");
      setTimeout(() => { setComplaintOpen(false); setComplaintSent(false); }, 2200);
    } catch {
      /* best-effort — no retry UI for a lightweight complaint box */
    }
  };

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
    if (!businessId || !profile?.enabledTools.chat || !effectiveUid) return;
    const q = query(
      collection(db, "business", businessId, "chats", effectiveUid, "messages"),
      orderBy("at", "asc"),
      limit(100)
    );
    const unsub = onSnapshot(q, (snap) => {
      setChatMessages(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    });
    return () => unsub();
  }, [businessId, profile?.enabledTools.chat, effectiveUid]);

  /* --------------------------- Loyalty --------------------------- */

  useEffect(() => {
    if (!businessId || !profile?.enabledTools.loyalty || !effectiveUid) return;
    getDoc(doc(db, "business", businessId, "loyalty", effectiveUid)).then((snap) => {
      setLoyaltyPoints(snap.exists() ? (snap.data() as any).points || 0 : 0);
    });
  }, [businessId, profile?.enabledTools.loyalty, effectiveUid]);

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
      const realUid = await resolveGuestUid(auth);

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

  // "That's all" — no online payment, just a QR the customer shows a
  // worker in person. Nothing is written to Firestore here; the order is
  // encoded directly into the QR itself and read back out by the worker's
  // scanner (see src/utils/orderQr.ts).
  const showOrderQr = async () => {
    if (!businessId || cart.length === 0) return;
    setOrderQrBusy(true);
    try {
      const raw = encodeOrderQr({
        businessId,
        items: cart.map((i) => ({ name: i.product.name, price: i.product.price, quantity: i.quantity })),
        total: cartTotal,
      });
      const dataUrl = await QRCode.toDataURL(raw, { width: 280, margin: 1, errorCorrectionLevel: "M" });
      setCartOpen(false);
      setOrderQrSrc(dataUrl);
    } catch {
      setOrderError("Couldn't build your order QR. Try again.");
    } finally {
      setOrderQrBusy(false);
    }
  };

  const sendReservation = async () => {
    if (!businessId) return;
    const realUid = await resolveGuestUid(auth);
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
    if (!businessId || !chatText.trim()) return;
    const realUid = effectiveUid || (await resolveGuestUid(auth));
    await addDoc(collection(db, "business", businessId, "chats", realUid, "messages"), {
      from: "customer",
      text: chatText.trim(),
      at: serverTimestamp(),
    });
    setChatText("");
  };

  const submitReview = async () => {
    if (!businessId || myRating === 0) return;
    const realUid = await resolveGuestUid(auth);
    await setDoc(doc(db, "business", businessId, "reviews", realUid), {
      rating: myRating,
      text: reviewText,
      at: serverTimestamp(),
    });
    setReviewSent(true);
    refreshReviews();
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

  // The Special Offer splash needs the tool on, an actual sticker saved
  // (an offer price is the one required field), the owner not having
  // paused it, and the customer not having dismissed it yet this visit.
  const showSpecialOffer = !!(
    tools.specialOffers &&
    profile.specialOffer &&
    profile.specialOffer.active &&
    profile.specialOffer.offerPrice &&
    !offerDismissed
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme.storeBg,
        color: theme.storeText,
        fontFamily: `${theme.font}, sans-serif`,
        paddingBottom: 90,
        position: "relative",
        overflowX: "hidden",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@600;700&display=swap');
        * { box-sizing: border-box; }
        .bvin-store-btn {
          border: none; border-radius: 12px; cursor: pointer;
          font-weight: 700; transition: transform 0.15s ease, filter 0.2s ease;
        }
        .bvin-store-btn:hover { filter: brightness(1.05); transform: translateY(-1px); }
        .bvin-store-btn:active { transform: scale(0.97); }
        .bvin-store-name { font-family: 'Fraunces', 'Inter', serif; }
        @keyframes bvinDrift {
          0%, 100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(3%, 4%) scale(1.08); }
        }
        .bvin-drift { animation: bvinDrift 15s ease-in-out infinite; }
        .bvin-card {
          background: rgba(255,255,255,0.55);
          border: 1px solid rgba(127,127,127,0.14);
          border-radius: 20px;
          padding: 18px;
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
        }
      `}</style>

      {/* Special Offer splash — the first thing a customer sees, every
          single time they scan or open this store, whenever the business
          has an active sticker saved. Sits above everything else on the
          page, including the language prompt below. Dismiss by tapping
          the backdrop, the button, or the sticker's own close button. */}
      <AnimatePresence>
        {showSpecialOffer && profile.specialOffer && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOfferDismissed(true)}
            style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(10,10,14,0.66)", backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.82, y: 24 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.88 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, position: "relative" }}
            >
              <button
                onClick={() => setOfferDismissed(true)}
                style={{ position: "absolute", top: -14, right: -14, width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.95)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 4px 14px rgba(0,0,0,0.25)" }}
              >
                <X size={15} color="#1d1d1f" />
              </button>
              <OfferSticker
                design={profile.specialOffer.design}
                headline={profile.specialOffer.headline}
                originalPrice={profile.specialOffer.originalPrice}
                offerPrice={profile.specialOffer.offerPrice}
                accent={theme.accent}
                size={230}
              />
              <button
                onClick={() => setOfferDismissed(true)}
                style={{ background: "rgba(255,255,255,0.95)", color: "#1d1d1f", border: "none", borderRadius: 999, padding: "12px 30px", fontSize: 13.5, fontWeight: 800, cursor: "pointer" }}
              >
                Shop now
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ambient background — soft accent-tinted glow + a faint dot texture, tuned
          to whatever accent color this particular business picked, so it reads
          right for a café, a salon, a garage, or anything else. */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
        <div className="bvin-drift" style={{ position: "absolute", top: "-12%", right: "-10%", width: "60vw", height: "60vw", maxWidth: 480, maxHeight: 480, background: `radial-gradient(circle, ${theme.accent}22 0%, transparent 70%)`, filter: "blur(60px)" }} />
        <div className="bvin-drift" style={{ position: "absolute", bottom: "5%", left: "-15%", width: "55vw", height: "55vw", maxWidth: 420, maxHeight: 420, background: `radial-gradient(circle, ${theme.accent}18 0%, transparent 70%)`, filter: "blur(60px)", animationDelay: "4s" }} />
        <div style={{ position: "absolute", inset: 0, opacity: 0.5, backgroundImage: `radial-gradient(${theme.accent}14 1px, transparent 1px)`, backgroundSize: "22px 22px", maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 30%, transparent 85%)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
      {/* Header */}
      <div style={{ position: "relative", padding: "20px 18px 16px", maxWidth: 640, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
          {/* Top-left: logo beside a column of [name+badge, bio directly under it] */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "flex-start", gap: 10 }}>
            {profile.logoUrl ? (
              <img src={profile.logoUrl} alt={profile.name} style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: `2px solid ${theme.accent}` }} />
            ) : (
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: `${theme.accent}1c`, flexShrink: 0, border: `2px solid ${theme.accent}` }} />
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <h1 className="bvin-store-name" style={{ fontSize: 18, fontWeight: 700, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile.name}</h1>
                {isVerified && <BadgeCheck size={15} color="#007fff" style={{ flexShrink: 0 }} />}
              </div>
              {profile.bio && <p style={{ fontSize: 12, opacity: 0.65, margin: "2px 0 0", lineHeight: 1.4 }}>{profile.bio}</p>}
              {profile.address && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, opacity: 0.55, marginTop: 5 }}>
                  <MapPin size={11} /> {profile.address}
                </div>
              )}
              {(profile.openingTime || profile.closingTime) && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, opacity: 0.55, marginTop: 4 }}>
                  <Clock size={11} /> {profile.openingTime || "—"} – {profile.closingTime || "—"}
                </div>
              )}
              {tools.reviews && avgRating !== null && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 700, marginTop: 4 }}>
                  <Star size={12} fill={theme.accent} color={theme.accent} />
                  {avgRating.toFixed(1)} <span style={{ opacity: 0.5, fontWeight: 500 }}>({reviewCount})</span>
                </div>
              )}
            </div>
          </div>

          {/* Top-right: glass pill, plus the Request Staff circle sitting directly beside it */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{ position: "relative" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 4, padding: 5, borderRadius: 999, background: "rgba(255,255,255,0.6)", backdropFilter: "blur(20px) saturate(180%)", WebkitBackdropFilter: "blur(20px) saturate(180%)", border: "1px solid rgba(255,255,255,0.8)", boxShadow: "0 8px 22px rgba(0,0,0,0.08)" }}>
                {tools.chat && (
                  <button onClick={() => setChatOpen(true)} title="Chat" style={pillIconBtnStyle(theme.accent)}>
                    <MessageCircle size={15} />
                  </button>
                )}
                {tools.complaints && (
                  <button onClick={() => setComplaintOpen(true)} title="Report an issue" style={pillIconBtnStyle(theme.accent)}>
                    <span style={{ fontSize: 15, lineHeight: 1 }}>😠</span>
                  </button>
                )}
                {tools.contactBusiness && (
                  <button onClick={() => setContactOpen(true)} title="Contact" style={pillIconBtnStyle(theme.accent)}>
                    <Phone size={14} />
                  </button>
                )}
                {/* Language selector is always present, regardless of enabled tools */}
                <motion.button
                  onClick={() => setLangMenuOpen((v) => !v)}
                  title="Language"
                  animate={langGlow ? { boxShadow: [`0 0 0 0px ${theme.accent}55`, `0 0 0 7px ${theme.accent}00`] } : {}}
                  transition={langGlow ? { duration: 1.1, repeat: Infinity } : {}}
                  style={{ ...pillIconBtnStyle(theme.accent), background: langGlow ? `${theme.accent}22` : "transparent" }}
                >
                  <Globe size={15} />
                </motion.button>
              </div>

              <AnimatePresence>
                {langMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    style={{ position: "absolute", top: 46, right: 0, zIndex: 50, width: 220, maxHeight: 300, background: "#fff", borderRadius: 16, padding: 8, boxShadow: "0 20px 50px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column" }}
                  >
                    <input value={langSearch} onChange={(e) => setLangSearch(e.target.value)} placeholder="Search language…" style={{ fontSize: 12, padding: "8px 10px", borderRadius: 9, border: "1px solid rgba(0,0,0,0.08)", marginBottom: 6 }} />
                    <div style={{ overflowY: "auto" }}>
                      {languages.filter((l) => l.name.toLowerCase().includes(langSearch.trim().toLowerCase())).map((l) => (
                        <button key={l.code} onClick={() => { setLanguage(l.code); setLangMenuOpen(false); }} style={{ display: "flex", justifyContent: "space-between", width: "100%", padding: "7px 9px", borderRadius: 8, border: "none", background: language === l.code ? `${theme.accent}18` : "transparent", fontSize: 12.5, cursor: "pointer", textAlign: "left" }}>
                          {l.name}
                          {language === l.code && <Check size={12} color={theme.accent} />}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {tools.requestStaff && (
              <RequestStaffFlow businessId={businessId} accent={theme.accent} allowToGo={!!profile.allowToGo} />
            )}
          </div>
        </div>
      </div>

      {/* Language prompt — shown in German every time someone opens the store,
          prompting them to pick whichever language they're actually
          comfortable in. Dismissible without picking (defaults stay put). */}
      <AnimatePresence>
        {showLangPrompt && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(20,20,22,0.45)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              style={{ width: "100%", maxWidth: 340, background: "#fff", borderRadius: 26, padding: 26, boxShadow: "0 30px 80px rgba(0,0,0,0.25)" }}
            >
              <div style={{ width: 46, height: 46, borderRadius: 14, background: `${theme.accent}18`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                <Globe size={20} color={theme.accent} />
              </div>
              <h3 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 800, color: "#1d1d1f" }}>Sprache auswählen</h3>
              <p style={{ fontSize: 12.5, color: "rgba(29,29,31,0.6)", margin: "0 0 16px" }}>
                Bitte wählen Sie Ihre bevorzugte Sprache aus.
              </p>
              <input
                value={entryLangSearch}
                onChange={(e) => setEntryLangSearch(e.target.value)}
                placeholder="Sprache suchen…"
                style={{ width: "100%", fontSize: 13, padding: "10px 12px", borderRadius: 11, border: "1px solid rgba(0,0,0,0.08)", marginBottom: 10 }}
              />
              <div style={{ maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 3, marginBottom: 14 }}>
                {languages.filter((l) => l.name.toLowerCase().includes(entryLangSearch.trim().toLowerCase())).map((l) => (
                  <button
                    key={l.code}
                    onClick={() => { setLanguage(l.code); setShowLangPrompt(false); }}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "10px 12px", borderRadius: 11, border: language === l.code ? `1.5px solid ${theme.accent}` : "1px solid rgba(0,0,0,0.06)", background: language === l.code ? `${theme.accent}10` : "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left", color: "#1d1d1f" }}
                  >
                    {l.name}
                    {language === l.code && <Check size={13} color={theme.accent} />}
                  </button>
                ))}
              </div>
              <button onClick={() => setShowLangPrompt(false)} style={{ width: "100%", background: "none", border: "none", fontSize: 12, fontWeight: 700, color: "rgba(29,29,31,0.4)", cursor: "pointer", padding: 4 }}>
                Später · Not now
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Contact popup */}
      <AnimatePresence>
        {contactOpen && (
          <SimplePopup onClose={() => setContactOpen(false)} title="Contact us" accent={theme.accent}>
            {contactPhone ? (
              <a href={`tel:${contactPhone}`} style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 16px", borderRadius: 14, background: theme.accent, color: "#fff", fontWeight: 700, textDecoration: "none" }}>
                <Phone size={15} /> {contactPhone}
              </a>
            ) : (
              <p style={{ fontSize: 13, opacity: 0.6, textAlign: "center" }}>No contact number listed yet.</p>
            )}
          </SimplePopup>
        )}
      </AnimatePresence>

      {/* Complaint popup */}
      <AnimatePresence>
        {complaintOpen && (
          <SimplePopup onClose={() => setComplaintOpen(false)} title="Raise an issue" accent={theme.accent}>
            {complaintSent ? (
              <p style={{ fontSize: 13, fontWeight: 700, color: theme.accent, textAlign: "center" }}>Thanks — the business has been notified.</p>
            ) : (
              <>
                <textarea value={complaintText} onChange={(e) => setComplaintText(e.target.value)} rows={4} placeholder="What went wrong?" style={{ width: "100%", fontSize: 13, padding: 12, borderRadius: 14, border: "1px solid rgba(0,0,0,0.1)", resize: "none", marginBottom: 12 }} />
                <button onClick={submitComplaint} disabled={!complaintText.trim()} style={{ width: "100%", border: "none", borderRadius: 14, padding: "12px 16px", fontSize: 13.5, fontWeight: 800, color: "#fff", background: theme.accent, cursor: "pointer", opacity: !complaintText.trim() ? 0.5 : 1 }}>
                  Send
                </button>
              </>
            )}
          </SimplePopup>
        )}
      </AnimatePresence>

      {/* Chat popup — only ever shown when the chat icon in the header pill is tapped */}
      <AnimatePresence>
        {chatOpen && (
          <SimplePopup onClose={() => setChatOpen(false)} title="Message this business" accent={theme.accent}>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 320, overflowY: "auto", marginBottom: 10 }}>
              {chatMessages.length === 0 && <p style={{ fontSize: 12.5, opacity: 0.5, textAlign: "center" }}>No messages yet — say hello.</p>}
              {chatMessages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    alignSelf: m.from === "customer" ? "flex-end" : "flex-start",
                    background: m.from === "customer" ? theme.accent : "rgba(0,0,0,0.06)",
                    color: m.from === "customer" ? "#fff" : theme.storeText,
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
              <button className="bvin-store-btn" style={{ background: theme.accent, color: "#fff", padding: "0 14px" }} onClick={sendChatMessage}>
                <Send size={15} />
              </button>
            </div>
          </SimplePopup>
        )}
      </AnimatePresence>

      <div style={{ padding: "0 18px", display: "flex", flexDirection: "column", gap: 22, maxWidth: 640, margin: "0 auto" }}>
        {/* Catalogue */}
        {tools.catalogue && (
          <section className="bvin-card">
            <SectionTitle icon={ShoppingBag} label="Catalogue" accent={theme.accent} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
              {products.length === 0 && <p style={{ fontSize: 13, opacity: 0.6 }}>Nothing listed yet.</p>}
              {products.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedProduct(p)}
                  style={{ borderRadius: 16, overflow: "hidden", background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.06)", cursor: "pointer" }}
                >
                  {p.imageUrl && (
                    <div style={{ width: "100%", height: 90, background: "rgba(0,0,0,0.04)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <img src={p.imageUrl} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    </div>
                  )}
                  <div style={{ padding: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{p.name}</div>
                    <div style={{ fontSize: 12, opacity: 0.6, margin: "2px 0 8px" }}>{formatPrice(p.price, profile.currency)}</div>
                    {tools.orders && (
                      <button
                        className="bvin-store-btn"
                        style={{ background: theme.accent, color: "#fff", fontSize: 11.5, padding: "6px 10px", width: "100%" }}
                        onClick={(e) => { e.stopPropagation(); addToCart(p); }}
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
          <section className="bvin-card">
            <SectionTitle icon={ShoppingBag} label="Place an order" accent={theme.accent} />
            <p style={{ fontSize: 13, opacity: 0.65, marginBottom: 10 }}>Send a request and the business will confirm it.</p>
            <button className="bvin-store-btn" style={{ background: theme.accent, color: "#fff", padding: "12px 16px", width: "100%" }} onClick={placeOrder} disabled={placingOrder}>
              {placingOrder ? "Sending…" : "Request order"}
            </button>
          </section>
        )}

        {/* Reservations */}
        {tools.reservations && (
          <section className="bvin-card">
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
                <button className="bvin-store-btn" style={{ background: theme.accent, color: "#fff", padding: "11px 16px" }} onClick={sendReservation}>
                  Request booking
                </button>
              </div>
            )}
          </section>
        )}

        {/* Reviews */}
        {tools.reviews && (
          <section className="bvin-card">
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
                <button className="bvin-store-btn" style={{ background: theme.accent, color: "#fff", padding: "10px 16px" }} onClick={submitReview} disabled={myRating === 0}>
                  Submit
                </button>
              </div>
            )}
          </section>
        )}

        {/* Loyalty */}
        {tools.loyalty && (
          <section className="bvin-card">
            <SectionTitle icon={Gift} label="Your points" accent={theme.accent} />
            <div style={{ fontSize: 26, fontWeight: 800 }}>{loyaltyPoints ?? "—"}</div>
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
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, padding: 14, display: "flex", justifyContent: "center" }}>
          <button
            className="bvin-store-btn"
            style={{ background: theme.accent, color: "#fff", width: "100%", maxWidth: 640, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}
            onClick={() => setCartOpen(true)}
          >
            <span>{cart.reduce((n, i) => n + i.quantity, 0)} item(s)</span>
            <span>{formatPrice(cartTotal, profile.currency)} · View cart</span>
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
                  <div style={{ fontSize: 12, opacity: 0.6 }}>{formatPrice(i.product.price, profile.currency)}</div>
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
              <span>{formatPrice(cartTotal, profile.currency)}</span>
            </div>
            <button
              className="bvin-store-btn"
              style={{ background: theme.accent, color: "#fff", width: "100%", padding: "13px 16px" }}
              onClick={() => {
                setCartOpen(false);
                placeOrder();
              }}
              disabled={placingOrder}
            >
              {placingOrder ? "Placing order…" : "Place order"}
            </button>
            <button
              className="bvin-store-btn"
              style={{ background: "transparent", color: theme.accent, border: `1px solid ${theme.accent}`, width: "100%", padding: "13px 16px", marginTop: 8 }}
              onClick={showOrderQr}
              disabled={orderQrBusy}
            >
              {orderQrBusy ? "Preparing QR…" : "That's all — show QR to staff"}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order QR — customer shows this to a worker instead of paying online */}
      <AnimatePresence>
        {orderQrSrc && (
          <SimplePopup title="Show this to staff" accent={theme.accent} onClose={() => setOrderQrSrc(null)}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <img src={orderQrSrc} alt="Order QR" style={{ width: 220, height: 220, borderRadius: 12 }} />
              <p style={{ fontSize: 12, color: "#6b6b6f", textAlign: "center", margin: 0 }}>
                A staff member will scan this to take your order. No payment is made from this screen.
              </p>
            </div>
          </SimplePopup>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedProduct && (
          <ProductDetailModal
            product={selectedProduct}
            accent={theme.accent}
            currency={profile.currency}
            canOrder={tools.orders}
            onAdd={() => { addToCart(selectedProduct); setSelectedProduct(null); }}
            onClose={() => setSelectedProduct(null)}
          />
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
    </div>
  );
};

const SectionTitle: React.FC<{ icon: React.ElementType; label: string; accent: string }> = ({ icon: Icon, label, accent }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
    <Icon size={16} color={accent} />
    <h2 style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>{label}</h2>
  </div>
);

const pillIconBtnStyle = (accent: string): React.CSSProperties => ({
  width: 30, height: 30, borderRadius: "50%", border: "none", background: "transparent",
  display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: accent,
});

const detailChipStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: "rgba(0,0,0,0.05)", color: "rgba(29,29,31,0.65)" };

const ProductDetailModal: React.FC<{
  product: Product;
  accent: string;
  currency?: string;
  canOrder: boolean;
  onAdd: () => void;
  onClose: () => void;
}> = ({ product, accent, currency, canOrder, onAdd, onClose }) => {
  const outOfStock = product.stock !== undefined && product.stock <= 0;
  const hasChips = !!(product.category || product.duration || product.discount || (product.variants && product.variants.length > 0) || product.stock !== undefined);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 210, background: "rgba(20,20,22,0.5)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.94 }}
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 360, maxHeight: "86vh", overflowY: "auto", background: "#fff", borderRadius: 26, boxShadow: "0 30px 80px rgba(0,0,0,0.25)", position: "relative" }}
      >
        <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, zIndex: 2, background: "rgba(255,255,255,0.85)", border: "none", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
          <X size={14} />
        </button>

        {product.imageUrl && (
          <div style={{ width: "100%", height: 220, background: "#FDF8ED", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", borderRadius: "26px 26px 0 0", overflow: "hidden" }}>
            <img src={product.imageUrl} alt={product.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
            {/* The little branded mark — same identity every Malvin QR code carries, here just as a corner badge rather than an actual scannable code. */}
            <div style={{ position: "absolute", bottom: 10, right: 10, width: 26, height: 26, borderRadius: "50%", background: "#0B1220", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.25)" }}>
              <img src="/logo.png" alt="" style={{ width: 16, height: 16, objectFit: "contain" }} />
            </div>
          </div>
        )}

        <div style={{ padding: 20 }}>
          <h3 style={{ margin: "0 0 4px", fontSize: 18, fontWeight: 800, color: "#1d1d1f" }}>{product.name}</h3>
          <div style={{ fontSize: 18, fontWeight: 800, color: accent, margin: "0 0 12px" }}>{formatPrice(product.price, currency)}</div>

          {product.description && (
            <p style={{ fontSize: 13.5, lineHeight: 1.5, color: "rgba(29,29,31,0.7)", margin: "0 0 14px" }}>{product.description}</p>
          )}

          {hasChips && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
              {product.category && <span style={detailChipStyle}>{product.category}</span>}
              {product.duration && <span style={detailChipStyle}>{product.duration}</span>}
              {!!product.discount && <span style={detailChipStyle}>-{product.discount}%</span>}
              {product.stock !== undefined && <span style={detailChipStyle}>{outOfStock ? "Out of stock" : `${product.stock} in stock`}</span>}
              {product.variants?.map((v) => <span key={v} style={detailChipStyle}>{v}</span>)}
            </div>
          )}

          {canOrder && !outOfStock && (
            <button className="bvin-store-btn" style={{ background: accent, color: "#fff", padding: "12px 16px", width: "100%", fontSize: 14, fontWeight: 700 }} onClick={onAdd}>
              Add to order
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

const SimplePopup: React.FC<{ title: string; accent: string; onClose: () => void; children: React.ReactNode }> = ({ title, accent, onClose, children }) => (
  <motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    onClick={onClose}
    style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(20,20,22,0.4)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
  >
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92 }}
      onClick={(e) => e.stopPropagation()}
      style={{ width: "100%", maxWidth: 320, background: "#fff", borderRadius: 24, padding: 22, boxShadow: "0 30px 80px rgba(0,0,0,0.22)", position: "relative" }}
    >
      <button onClick={onClose} style={{ position: "absolute", top: 14, right: 14, background: "rgba(0,0,0,0.05)", border: "none", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
        <X size={12} />
      </button>
      <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 800, color: "#1d1d1f" }}>{title}</h3>
      {children}
    </motion.div>
  </motion.div>
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