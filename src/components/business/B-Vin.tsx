import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  QrCode,
  ScanLine,
  Settings as GearIcon,
  Globe,
  MousePointerClick,
  X,
  Download,
  Copy,
  Link2,
  Camera,
  User,
  Wrench,
  Palette,
  Type,
  ChevronRight,
  MessageCircle,
  BookOpen,
  BarChart3,
  CalendarCheck,
  Wallet,
  Tag,
  Bell,
  Receipt,
  Users,
  UserPlus,
  Star,
  Gift,
  ClipboardList,
  ListChecks,
  Check,
  LayoutGrid,
  UserCircle2,
  BadgeCheck,
  Plus,
  Clock,
  MapPin,
  ShoppingBag,
  Phone,
  Armchair,
  Package,
  Layers,
  Trash2,
  ExternalLink,
  Pin,
  Search,
} from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { doc, onSnapshot, setDoc, collection, query, where, addDoc, serverTimestamp } from "firebase/firestore";
import { ref as rtdbRef, set, update as rtdbUpdate, remove, onValue, serverTimestamp as rtdbServerTimestamp } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { firestore, auth, db as rtdb, storage } from "../../firebase";
import { createBusinessStripeAccount, createStripeOnboardingLink, checkStripeAccount } from "../../stripe";
import { storeOrigin, PUBLIC_ORIGIN } from "../../services/vinLink";
import { useAccountStanding } from "../../hooks/useAccountStanding";
import { useLanguage } from "../../contexts/LanguageContext";
import { TeamHub } from "../team/teamHub";
import Chats from "./Chats";
import VinBackTagCreate from "../vinback/VinBackTagCreate";
import VinBackTagList from "../vinback/VinBackTagList";
import { MalvinSystemDashboard } from "../records/MalvinSystemDashboard";
import SaaSEnvironmentVault from "./SaaSEnvironmentVault";
import Premium from "../addons/Premium";
import CatalogueSetupWizard, { CatalogueSetupResult } from "./CatalogueSetupWizard";
import BusinessOnboarding from "./BusinessOnboarding";
import ProductFormModal from "./ProductFormModal";
import { AppsConnectionsPill, ConnectionsStrip } from "./AppsConnectionsPanel";
import { cancelPremiumSubscription, downloadMyData, deleteMyData } from "../../services/bvinConnections";
import { ToolKey, ToolDef, ToolState, TOOLS, DEFAULT_TOOLS, CATEGORY_ORDER, CATEGORY_TINTS } from "../../config/bvinTools";
import styles from "./BVin.module.css";

/* ============================================================================
   B-VIN — Unified Business Hub
============================================================================ */

interface BVinColors {
  accent: string;
  qr: string;
  storeBg: string;
  storeText: string;
  font: string;
}

// Default palette is now the "White / Blue" scheme — soft sky blue instead
// of the old green, matching everywhere the accent shows up.
const DEFAULT_COLORS: BVinColors = {
  accent: "#4F9CF9",
  qr: "#0b0b0b",
  storeBg: "#ffffff",
  storeText: "#0b0b0b",
  font: "Inter",
};

interface BVinProfile {
  name: string;
  logoUrl?: string;
  bio?: string;
  address?: string;
  phone?: string;
  openingTime?: string;
  closingTime?: string;
  darkMode: boolean;
  clicks: number;
  qrScans?: number;
  noticeScans?: number;
  pinnedTools?: Partial<Record<ToolKey, number>>;
  colors: BVinColors;
  customerNoticeText: string;
  stripeConnected: boolean;
  stripeAccountId?: string | null;
  catalogueConfig?: CatalogueSetupResult;
  offeringsConfig?: CatalogueSetupResult;
}

// The unified per-business document at business/{businessId}. Exactly two
// sections, per the unified data model: `profile` (everything about the
// business itself) and `enabledTools` (which tools are switched on).
// Turning a tool off never deletes its underlying subcollection data —
// enabledTools is just a display flag; a business's products/offerings/etc.
// stay intact until the owner explicitly deletes them, so re-enabling a
// tool later picks up right where it left off.
interface BVinDoc {
  businessId: string;
  profile: BVinProfile;
  enabledTools: ToolState;
  updatedAt?: number;
}

const FONT_OPTIONS = ["Inter", "Poppins", "Playfair Display", "DM Sans", "Space Grotesk"];


/* --------------------------------- Helpers -------------------------------- */

const SCANNER_SESSION_TTL_MS = 5 * 60 * 1000;

async function requestStripeOnboarding(businessId: string, existingAccountId: string | null | undefined): Promise<{ url: string; accountId: string }> {
  let accountId = existingAccountId || null;
  if (!accountId) {
    const email = auth.currentUser?.email;
    if (!email) throw new Error("You need to be signed in with an email to connect payouts.");
    const res: any = await createBusinessStripeAccount({ email, businessId, merchantType: "bvin" });
    accountId = res?.data?.stripeAccountId;
    if (!accountId) throw new Error("Stripe didn't return an account id.");
  }
  const linkRes: any = await createStripeOnboardingLink({ stripeAccountId: accountId });
  const url = linkRes?.data?.url;
  if (!url) throw new Error("Stripe didn't return an onboarding link.");
  return { url, accountId };
}

async function refreshStripeStatus(businessId: string, accountId: string) {
  const res: any = await checkStripeAccount({ stripeAccountId: accountId, businessId, merchantType: "bvin" });
  return { detailsSubmitted: !!res?.data?.detailsSubmitted, chargesEnabled: !!res?.data?.chargesEnabled, payoutsEnabled: !!res?.data?.payoutsEnabled };
}

async function createScannerPairingSession(businessId: string): Promise<{ sessionId: string; url: string }> {
  const sessionId = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  await set(rtdbRef(rtdb, `scannerSessions/${businessId}/${sessionId}`), { status: "pending", createdAt: rtdbServerTimestamp(), expiresAt: Date.now() + SCANNER_SESSION_TTL_MS });
  return { sessionId, url: `https://malvinai.com/pair-scanner/${businessId}/${sessionId}` };
}

async function revokeScannerPairingSession(businessId: string, sessionId: string) {
  try {
    await remove(rtdbRef(rtdb, `scannerSessions/${businessId}/${sessionId}`));
  } catch {
    /* session may already be gone — fine */
  }
}

// Shared "blend into white, soft black shadow" button used across every
// popup per the house style — everything except the scanner/QR actions,
// which keep their accent identity so they stay recognizable.
const blendBtnStyle = (disabled?: boolean): React.CSSProperties => ({
  width: "100%",
  border: "none",
  borderRadius: 15,
  padding: "13px 20px",
  fontSize: 14,
  fontWeight: 800,
  color: "#1d1d1f",
  cursor: disabled ? "default" : "pointer",
  background: "linear-gradient(150deg, #ffffff, #eef0f3)",
  boxShadow: disabled ? "none" : "0 3px 10px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.9)",
  opacity: disabled ? 0.5 : 1,
});

/* ================================ Component ================================ */

interface BVinProps {
  businessId: string;
  businessName?: string;
  logoUrl?: string;
}

const BVin: React.FC<BVinProps> = ({ businessId, businessName = "My Business", logoUrl }) => {
  const [name, setName] = useState(businessName);
  const [logoUrlState, setLogoUrlState] = useState(logoUrl || "");
  const [bio, setBio] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [openingTime, setOpeningTime] = useState("");
  const [closingTime, setClosingTime] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [clicks, setClicks] = useState(0);
  const [qrScans, setQrScans] = useState(0);
  const [noticeScans, setNoticeScans] = useState(0);
  const [tools, setTools] = useState<ToolState>(DEFAULT_TOOLS);
  const [pinnedTools, setPinnedTools] = useState<Partial<Record<ToolKey, number>>>({});
  const [colors, setColors] = useState<BVinColors>(DEFAULT_COLORS);
  const [customerNoticeText, setCustomerNoticeText] = useState("We are currently on holiday — we'll be back soon!");
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [stripePayoutsEnabled, setStripePayoutsEnabled] = useState(false);
  const [connectBusy, setConnectBusy] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [catalogueConfig, setCatalogueConfig] = useState<CatalogueSetupResult | null>(null);
  const [offeringsConfig, setOfferingsConfig] = useState<CatalogueSetupResult | null>(null);

  const { isPremium, isVerified } = useAccountStanding(businessId);
  const { language, languages, isTranslating, setLanguage } = useLanguage();

  const [activeTab, setActiveTab] = useState<"dashboard" | "team" | "chat">("dashboard");
  const [fullscreenTool, setFullscreenTool] = useState<"productStore" | "environment" | "premium" | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsView, setSettingsView] = useState<"root" | "profile" | "tools" | "customize">("root");
  const [langOpen, setLangOpen] = useState(false);
  const [langSearch, setLangSearch] = useState("");
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [scannerPopupOpen, setScannerPopupOpen] = useState(false);
  const [pairingUrl, setPairingUrl] = useState<string | null>(null);
  const [pairingSessionId, setPairingSessionId] = useState<string | null>(null);
  const [pairingStatus, setPairingStatus] = useState<"pending" | "claimed" | null>(null);
  const [pairingLastScan, setPairingLastScan] = useState<{ value: string; at: number } | null>(null);
  const [pairingError, setPairingError] = useState<string | null>(null);
  const [connectPopupOpen, setConnectPopupOpen] = useState(false);
  const [pillExpanded, setPillExpanded] = useState(false);
  const [tooltipTool, setTooltipTool] = useState<ToolKey | null>(null);
  const [catalogueWizardOpen, setCatalogueWizardOpen] = useState(false);
  const [offeringsWizardOpen, setOfferingsWizardOpen] = useState(false);

  const [vinbackCreateOpen, setVinbackCreateOpen] = useState(false);
  const [vinbackListOpen, setVinbackListOpen] = useState(false);
  const [vinbackTags, setVinbackTags] = useState<any[]>([]);

  const pillPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pillLongPressed = useRef(false);
  const islandPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tooltipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hydrated = useRef(false);



  

  /* --------------------------- Firestore sync (business/{uid}) --------------------------- */

  // Track last synced payload string to avoid redundant writes
  const lastSyncedRef = useRef<string>("");
  const [showOnboarding, setShowOnboarding] = useState(false);
  const checkedOnboarding = useRef(false);

  useEffect(() => {
    if (!businessId) return;
    const ref = doc(firestore, "business", businessId);
    const unsub = onSnapshot(ref, (snap) => {
      // Ignore local echo snapshots from our own writes
      if (snap.metadata.hasPendingWrites) return;

      if (!snap.exists()) {
        // First time this uid has ever opened "I'm a business" — walk them
        // through the setup wizard instead of dropping them on an empty
        // dashboard. Only fires once per mount even if the listener re-fires
        // with another "doesn't exist yet" snapshot before the wizard's own
        // write lands.
        if (!checkedOnboarding.current) {
          checkedOnboarding.current = true;
          setShowOnboarding(true);
        }
        hydrated.current = true;
        return;
      }
      checkedOnboarding.current = true;
      const data = snap.data() as BVinDoc;
      const p = data.profile || ({} as BVinProfile);

      if (p.name) setName(p.name);
      if (p.logoUrl) setLogoUrlState(p.logoUrl);
      setBio(p.bio || "");
      setAddress(p.address || "");
      setPhone(p.phone || "");
      setOpeningTime(p.openingTime || "");
      setClosingTime(p.closingTime || "");
      setDarkMode(!!p.darkMode);
      setClicks(p.clicks || 0);
      setQrScans(p.qrScans || 0);
      setNoticeScans(p.noticeScans || 0);

      if (data.enabledTools) {
        setTools((prev) => {
          const next = { ...prev, ...data.enabledTools, vinbackTags: true, customerNotice: true };
          return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
        });
      }

      if (p.pinnedTools) {
        setPinnedTools((prev) => (JSON.stringify(prev) === JSON.stringify(p.pinnedTools) ? prev : p.pinnedTools!));
      }

      if (p.colors) {
        setColors((prev) => {
          const next = { ...prev, ...p.colors };
          return JSON.stringify(prev) === JSON.stringify(next) ? prev : next;
        });
      }

      if (p.customerNoticeText !== undefined) setCustomerNoticeText(p.customerNoticeText);
      setStripeConnected(!!p.stripeConnected);
      setStripeAccountId(p.stripeAccountId || null);
      if (p.catalogueConfig) setCatalogueConfig(p.catalogueConfig);
      if (p.offeringsConfig) setOfferingsConfig(p.offeringsConfig);

      hydrated.current = true;
    });
    return () => unsub();
  }, [businessId]);

  useEffect(() => {
    if (!businessId || !hydrated.current) return;

    const profileData: BVinProfile = {
      name,
      logoUrl: logoUrlState,
      bio,
      address,
      phone,
      openingTime,
      closingTime,
      darkMode,
      clicks,
      qrScans,
      noticeScans,
      pinnedTools,
      colors,
      customerNoticeText,
      stripeConnected,
      stripeAccountId,
      ...(catalogueConfig ? { catalogueConfig } : {}),
      ...(offeringsConfig ? { offeringsConfig } : {}),
    };

    // Compare structural data without `updatedAt` to check if genuine changes occurred
    const currentSyncKey = JSON.stringify({ profile: profileData, enabledTools: tools });

    if (lastSyncedRef.current === currentSyncKey) {
      return; // Nothing changed, skip saving!
    }

    const t = setTimeout(() => {
      lastSyncedRef.current = currentSyncKey;

      const payload: BVinDoc = {
        businessId,
        profile: profileData,
        enabledTools: tools,
        updatedAt: Date.now(),
      };

      setDoc(doc(firestore, "business", businessId), payload, { merge: true }).catch(() => {});
    }, 500);

    return () => clearTimeout(t);
  }, [
    businessId, name, logoUrlState, bio, address, phone, openingTime, closingTime, darkMode, clicks, tools,
    pinnedTools, colors, customerNoticeText, stripeConnected, stripeAccountId, catalogueConfig, offeringsConfig,
    qrScans, noticeScans,
  ]);

  useEffect(() => {
    if (!businessId || !stripeAccountId) return;
    const check = () => {
      refreshStripeStatus(businessId, stripeAccountId)
        .then(({ chargesEnabled, payoutsEnabled }) => { setStripeConnected(chargesEnabled); setStripePayoutsEnabled(payoutsEnabled); })
        .catch(() => {});
    };
    check();
    window.addEventListener("focus", check);
    return () => window.removeEventListener("focus", check);
  }, [businessId, stripeAccountId]);

  useEffect(() => {
    if (!businessId) return;
    const q = query(collection(firestore, "vinbackTags"), where("ownerId", "==", businessId));
    const unsub = onSnapshot(q, (snap) => setVinbackTags(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, [businessId]);

  /* --------------------------------- Derived --------------------------------- */

  const enabledToolDefs = useMemo(() => TOOLS.filter((t) => tools[t.key]), [tools]);
  const bentoToolDefs = useMemo(() => enabledToolDefs.filter((t) => !t.noBento), [enabledToolDefs]);

  const theme = darkMode
    ? { pageBg: "linear-gradient(180deg,#141414 0%,#0c0c0c 100%)", text: "#f5f5f2", subtext: "rgba(245,245,242,0.6)", cardBg: "rgba(255,255,255,0.05)", cardBorder: "rgba(255,255,255,0.09)" }
    : { pageBg: "#ffffff", text: "#1d1d1f", subtext: "rgba(29,29,31,0.56)", cardBg: "rgba(0,0,0,0.035)", cardBorder: "rgba(0,0,0,0.07)" };

  const accent = colors.accent;

  /* --------------------------------- Handlers --------------------------------- */

  const registerClick = useCallback(() => setClicks((c) => c + 1), []);

  const toggleTool = (key: ToolKey) => {
    const def = TOOLS.find((t) => t.key === key);
    if (def?.alwaysOn) return;
    const turningOn = !tools[key];
    setTools((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (key === "receiveMoney" && next.receiveMoney && !stripeConnected) setConnectPopupOpen(true);
      return next;
    });
    setPinnedTools((prev) => {
      if (prev[key] === undefined) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    // First-time setup wizards for the two catalogue-style tools.
    if (turningOn && key === "catalogue" && !catalogueConfig) setCatalogueWizardOpen(true);
    if (turningOn && key === "offerings" && !offeringsConfig) setOfferingsWizardOpen(true);
  };

  const togglePin = (key: ToolKey, idx: number) => {
    const def = TOOLS.find((t) => t.key === key);
    if (def?.fixedPlacement) return;
    setPinnedTools((prev) => {
      const next = { ...prev };
      if (next[key] !== undefined) delete next[key];
      else next[key] = idx;
      return next;
    });
  };

  const handlePillPressStart = (key: ToolKey, idx: number) => {
    pillLongPressed.current = false;
    pillPressTimer.current = setTimeout(() => { pillLongPressed.current = true; togglePin(key, idx); }, 550);
  };
  const handlePillPressEnd = (key: ToolKey) => {
    if (pillPressTimer.current) clearTimeout(pillPressTimer.current);
    if (!pillLongPressed.current) toggleTool(key);
  };

  // Long-press on the island's background (not on a specific tool square)
  // expands it to show every enabled tool at once, with the page blurred
  // behind it. Tapping the blurred backdrop collapses it again.
  const islandLongPressed = useRef(false);
  const handleIslandBgPressStart = (e: React.SyntheticEvent) => {
    if (e.target !== e.currentTarget) return; // an icon/button handles its own press
    islandLongPressed.current = false;
    islandPressTimer.current = setTimeout(() => { islandLongPressed.current = true; setPillExpanded(true); }, 500);
  };
  const handleIslandBgPressEnd = () => {
    if (islandPressTimer.current) clearTimeout(islandPressTimer.current);
  };

  const showTooltipFor = (key: ToolKey) => {
    setTooltipTool(key);
    if (tooltipTimer.current) clearTimeout(tooltipTimer.current);
    tooltipTimer.current = setTimeout(() => setTooltipTool(null), 2600);
  };

  const openScannerPairing = async () => {
    setPairingStatus("pending");
    setPairingLastScan(null);
    setPairingError(null);
    setScannerPopupOpen(true);
    try {
      const { sessionId, url } = await createScannerPairingSession(businessId);
      setPairingSessionId(sessionId);
      setPairingUrl(url);
    } catch (err: any) {
      setPairingUrl(null);
      setPairingError(err?.message || "Couldn't create the invite. Check your connection and try again.");
    }
  };

  const closeScannerPairing = () => {
    if (businessId && pairingSessionId && pairingStatus !== "claimed") revokeScannerPairingSession(businessId, pairingSessionId);
    setScannerPopupOpen(false);
    setPairingUrl(null);
    setPairingSessionId(null);
    setPairingStatus(null);
    setPairingLastScan(null);
    setPairingError(null);
  };

  useEffect(() => {
    if (!scannerPopupOpen || !businessId || !pairingSessionId) return;
    const sessRef = rtdbRef(rtdb, `scannerSessions/${businessId}/${pairingSessionId}`);
    const unsub = onValue(
      sessRef,
      (snap) => {
        const val = snap.val();
        if (!val) { setPairingStatus(null); return; }
        setPairingStatus(val.status === "claimed" ? "claimed" : "pending");
        if (val.lastScan?.value) setPairingLastScan(val.lastScan);
      },
      (err) => setPairingError(err?.message || "Lost connection to the invite.")
    );
    const ttl = setTimeout(() => { if (pairingStatus !== "claimed") revokeScannerPairingSession(businessId, pairingSessionId); }, SCANNER_SESSION_TTL_MS);
    return () => { unsub(); clearTimeout(ttl); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scannerPopupOpen, businessId, pairingSessionId]);

  const handleLogoFile = async (file: File) => {
    if (!businessId) return;
    try {
      const fileRef = storageRef(storage, `business/${businessId}/logo.jpg`);
      const snap = await uploadBytes(fileRef, file);
      setLogoUrlState(await getDownloadURL(snap.ref));
    } catch (err) {
      console.error("Logo upload failed:", err);
    }
  };

  const storeQrValue = `${storeOrigin()}/store/${businessId}`;
  const noticeQrValue = `${PUBLIC_ORIGIN}/notice/${businessId}`;

  const filteredLanguages = langSearch.trim() ? languages.filter((l) => l.name.toLowerCase().includes(langSearch.trim().toLowerCase())) : languages;

  /* ==================================================================== */

  const showHeader = activeTab !== "team" && !fullscreenTool;

  if (showOnboarding) {
    return (
      <BusinessOnboarding
        businessId={businessId}
        defaultName={businessName}
        accent={accent}
        onComplete={() => setShowOnboarding(false)}
      />
    );
  }

  return (
    <div
      style={{ minHeight: "100vh", width: "100%", background: theme.pageBg, color: theme.text, fontFamily: `${colors.font}, sans-serif`, position: "relative", overflowX: "hidden", transition: "background 0.5s ease, color 0.5s ease" }}
      onClickCapture={registerClick}
    >
      <GlobalStyle />

      {showHeader && (
        <div className={styles.headerRow}>
          <div className={styles.leftGroup}>
            <div className={styles.avatarHolder}>
              {logoUrlState ? <img src={logoUrlState} alt={name} /> : <UserCircle2 size={20} color={theme.subtext} />}
            </div>
            <span className={styles.businessName} style={{ color: theme.text }}>{name}</span>
            {isVerified && <BadgeCheck size={16} color="#007fff" style={{ flexShrink: 0 }} />}
          </div>

          <BusinessStatusPill
            businessId={businessId}
            isPremium={isPremium}
            isVerified={isVerified}
            onOpenPremium={() => setFullscreenTool("premium")}
          />

          <div className={styles.pillOuter}>
            {/* Backdrop blur layer, shown only while the island is expanded */}
            <AnimatePresence>
              {pillExpanded && (
                <motion.div
                  className={styles.pillBackdrop}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setPillExpanded(false)}
                />
              )}
            </AnimatePresence>

            <motion.div
              layout
              className={`${styles.glassPill} ${pillExpanded ? styles.expanded : ""}`}
              style={{ zIndex: pillExpanded ? 30 : "auto" }}
              onMouseDown={handleIslandBgPressStart}
              onMouseUp={handleIslandBgPressEnd}
              onMouseLeave={handleIslandBgPressEnd}
              onTouchStart={handleIslandBgPressStart}
              onTouchEnd={handleIslandBgPressEnd}
            >
              {!pillExpanded ? (
                <>
                  <div className={styles.pillTools}>
                    <AnimatePresence initial={false}>
                      {enabledToolDefs.length === 0 ? (
                        <motion.span key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: 11, color: "rgba(20,19,16,0.45)", padding: "0 4px", whiteSpace: "nowrap" }}>
                          No tools yet
                        </motion.span>
                      ) : (
                        enabledToolDefs.map((t, idx) => (
                          <motion.div
                            key={t.key}
                            layout
                            initial={{ opacity: 0, scale: 0.6 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.6 }}
                            transition={{ type: "spring", stiffness: 400, damping: 28 }}
                            className={styles.toolSquare}
                            style={{ background: `${accent}1c`, color: accent }}
                            title={t.alwaysOn ? t.label : `Tap to disable · hold to pin — ${t.label}`}
                            onMouseDown={(e) => { e.stopPropagation(); handlePillPressStart(t.key, idx); }}
                            onMouseUp={(e) => { e.stopPropagation(); handlePillPressEnd(t.key); }}
                            onMouseLeave={() => pillPressTimer.current && clearTimeout(pillPressTimer.current)}
                            onTouchStart={(e) => { e.stopPropagation(); handlePillPressStart(t.key, idx); }}
                            onTouchEnd={(e) => { e.stopPropagation(); handlePillPressEnd(t.key); }}
                          >
                            <t.icon size={13} />
                            {pinnedTools[t.key] !== undefined && <Pin size={7} style={{ position: "absolute", top: -2, right: -2 }} />}
                          </motion.div>
                        ))
                      )}
                    </AnimatePresence>
                  </div>
                  <div className={styles.pillActions}>
                    <div className={styles.pillDivider} />
                    <button className={styles.pillCircleBtn} style={{ background: "rgba(0,0,0,0.06)", color: theme.text }} onClick={(e) => { e.stopPropagation(); openScannerPairing(); }} title="Connect a camera">
                      <ScanLine size={15} />
                    </button>
                    <button className={styles.pillCircleBtn} style={{ background: accent, color: "#fff" }} onClick={(e) => { e.stopPropagation(); setQrModalOpen(true); }} title="Store QR code">
                      <QrCode size={15} />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#1d1d1f" }}>Your tools</span>
                    <button onClick={() => setPillExpanded(false)} style={{ background: "rgba(0,0,0,0.06)", border: "none", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                      <X size={12} color="#1d1d1f" />
                    </button>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: "50vh", overflowY: "auto" }}>
                    {enabledToolDefs.length === 0 && <span style={{ fontSize: 12.5, color: "rgba(20,19,16,0.5)" }}>No tools enabled yet.</span>}
                    {enabledToolDefs.map((t, idx) => (
                      <div
                        key={t.key}
                        className={styles.toolRowExpanded}
                        style={{ background: `${accent}10` }}
                        onMouseDown={(e) => { e.stopPropagation(); handlePillPressStart(t.key, idx); }}
                        onMouseUp={(e) => { e.stopPropagation(); handlePillPressEnd(t.key); }}
                        onTouchStart={(e) => { e.stopPropagation(); handlePillPressStart(t.key, idx); }}
                        onTouchEnd={(e) => { e.stopPropagation(); handlePillPressEnd(t.key); }}
                      >
                        <div style={{ width: 30, height: 30, borderRadius: 10, background: `${accent}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <t.icon size={14} color={accent} />
                        </div>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: "#1d1d1f", flex: 1 }}>{t.label}</span>
                        {pinnedTools[t.key] !== undefined && <Pin size={12} color={accent} />}
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                    <button className={styles.pillCircleBtn} style={{ background: "rgba(0,0,0,0.06)", color: "#1d1d1f", width: 34, height: 34 }} onClick={(e) => { e.stopPropagation(); openScannerPairing(); }} title="Connect a camera">
                      <ScanLine size={16} />
                    </button>
                    <button className={styles.pillCircleBtn} style={{ background: accent, color: "#fff", width: 34, height: 34 }} onClick={(e) => { e.stopPropagation(); setQrModalOpen(true); }} title="Store QR code">
                      <QrCode size={16} />
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>

          <AppsConnectionsPill businessId={businessId} accent={accent} />

          <div className={styles.rightGroup} style={{ justifyContent: "flex-end", flex: "1 1 0" }}>
            <div className={styles.clickChip} title="Total clicks">
              <MousePointerClick size={13} />
              <span>{clicks}</span>
            </div>

            <div style={{ position: "relative" }} data-no-translate>
              <button className={styles.langChip} onClick={() => setLangOpen((v) => !v)}>
                {isTranslating ? <span className="bvin-spin-globe"><Globe size={14} /></span> : <Globe size={14} />}
                {languages.find((l) => l.code === language)?.name.slice(0, 8) || "English"}
              </button>
              <AnimatePresence>
                {langOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.96 }} transition={{ duration: 0.16 }}
                    style={{ position: "absolute", top: 44, right: 0, background: "rgba(255,255,255,0.97)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 16, padding: 8, width: 220, maxHeight: 320, display: "flex", flexDirection: "column", zIndex: 50, boxShadow: "0 20px 50px rgba(0,0,0,0.16)" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 6px 8px", borderBottom: "1px solid rgba(0,0,0,0.06)", marginBottom: 4 }}>
                      <Search size={12} color="#999" />
                      <input autoFocus value={langSearch} onChange={(e) => setLangSearch(e.target.value)} placeholder="Search language…" style={{ border: "none", outline: "none", fontSize: 12, flex: 1, background: "transparent", color: "#1d1d1f" }} />
                    </div>
                    <div style={{ overflowY: "auto" }}>
                      {filteredLanguages.map((l) => (
                        <button key={l.code} onClick={() => { setLanguage(l.code); setLangOpen(false); setLangSearch(""); }} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", padding: "7px 8px", borderRadius: 9, border: "none", background: language === l.code ? `${accent}22` : "transparent", color: "#1d1d1f", fontSize: 12.5, cursor: "pointer", textAlign: "left" }}>
                          {l.name}
                          {language === l.code && <Check size={12} color={accent} />}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <button className={styles.gearBtn} onClick={() => { setSettingsOpen(true); setSettingsView("root"); }}>
              <GearIcon size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ============================ MAIN CONTENT ============================ */}
      {fullscreenTool ? (
        <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "#0b0b0c", overflow: "auto" }}>
          <button onClick={() => setFullscreenTool(null)} style={{ position: "fixed", top: 14, right: 14, zIndex: 61, background: "rgba(255,255,255,0.12)", border: "none", borderRadius: "50%", width: 34, height: 34, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <X size={16} />
          </button>
          {fullscreenTool === "productStore" && <MalvinSystemDashboard />}
          {fullscreenTool === "environment" && <SaaSEnvironmentVault userEmail={auth.currentUser?.email || ""} />}
          {fullscreenTool === "premium" && <Premium onBack={() => setFullscreenTool(null)} />}
        </div>
      ) : activeTab === "team" ? (
        <div style={{ position: "fixed", inset: 0, zIndex: 15, background: theme.pageBg }}>
          <TeamHub managerUid={businessId} />
        </div>
      ) : (
        <main style={{ padding: "8px 18px 110px" }}>
          {activeTab === "dashboard" && (
            <>
              {/* Top row: fixed-size Connections glass panel on the left,
                  matching the combined height of Live Notices + VinBack Tags
                  stacked on the right — same layout as every other business
                  category's header row, just generalized. Both cards keep
                  using BentoCard as normal; grid-column/-row styling on a
                  fixedPlacement tool is simply inert once it's outside the
                  CSS grid, so nothing extra is needed there. */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 1080, margin: "0 auto 12px" }}>
                <ConnectionsStrip businessId={businessId} accent={accent} />
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <BentoCard
                    tool={TOOLS.find((t) => t.key === "customerNotice")!}
                    span={2}
                    order={0}
                    pinned={false}
                    theme={theme}
                    accent={accent}
                    extra={<CustomerNoticeCard theme={theme} accent={accent} colors={colors} text={customerNoticeText} setText={setCustomerNoticeText} qrValue={noticeQrValue} />}
                  />
                  <BentoCard
                    tool={TOOLS.find((t) => t.key === "vinbackTags")!}
                    span={2}
                    order={0}
                    pinned={false}
                    theme={theme}
                    accent={accent}
                    extra={<VinBackTagsCard theme={theme} accent={accent} tags={vinbackTags} onCreate={() => setVinbackCreateOpen(true)} onViewAll={() => setVinbackListOpen(true)} />}
                  />
                </div>
              </div>

              <motion.div layout style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gridAutoFlow: "dense", gap: 12, maxWidth: 1080, margin: "0 auto" }}>
              {bentoToolDefs.filter((t) => t.key !== "customerNotice" && t.key !== "vinbackTags").length === 0 && (
                <div style={{ gridColumn: "1 / -1", textAlign: "center", padding: "60px 20px", color: theme.subtext }}>
                  <LayoutGrid size={30} style={{ marginBottom: 10, opacity: 0.5 }} />
                  <p style={{ fontSize: 14 }}>Nothing else enabled yet. Open the gear icon → <b>Enable Tools</b> to build out your dashboard.</p>
                </div>
              )}
              <AnimatePresence>
                {bentoToolDefs.filter((t) => t.key !== "customerNotice" && t.key !== "vinbackTags").map((t, idx) => (
                  <BentoCard
                    key={t.key}
                    tool={t}
                    span={t.shape === "rectangle" ? 4 : 2}
                    order={pinnedTools[t.key] !== undefined ? pinnedTools[t.key]! : 1000 + idx}
                    pinned={pinnedTools[t.key] !== undefined}
                    theme={theme}
                    accent={accent}
                    extra={
                      t.key === "receiveMoney" ? (
                        <ReceiveMoneyCard theme={theme} accent={accent} connected={stripeConnected} payoutsEnabled={stripePayoutsEnabled} />
                      ) : t.key === "catalogue" ? (
                        <CatalogueCard businessId={businessId} theme={theme} accent={accent} config={catalogueConfig} />
                      ) : t.key === "prices" ? (
                        <PricesCard businessId={businessId} theme={theme} accent={accent} />
                      ) : t.key === "offerings" ? (
                        <OfferingsCard businessId={businessId} theme={theme} accent={accent} config={offeringsConfig} />
                      ) : t.key === "jobRequests" ? (
                        <JobRequestsCard businessId={businessId} theme={theme} accent={accent} />
                      ) : t.key === "analytics" ? (
                        <AnalyticsCard theme={theme} accent={accent} qrScans={qrScans} noticeScans={noticeScans} />
                      ) : t.key === "openingStatus" ? (
                        <OpeningStatusCard theme={theme} accent={accent} openingTime={openingTime} closingTime={closingTime} />
                      ) : t.key === "contactBusiness" ? (
                        <ContactBusinessCard theme={theme} accent={accent} phone={phone} />
                      ) : t.key === "requestStaff" || t.key === "tableAssistance" ? (
                        <ServiceCallsCard businessId={businessId} theme={theme} accent={accent} type={t.key === "requestStaff" ? "staff" : "table"} />
                      ) : t.key === "productStore" || t.key === "environment" ? (
                        <FullscreenLaunchCard accent={accent} onOpen={() => setFullscreenTool(t.key as "productStore" | "environment")} />
                      ) : undefined
                    }
                  />
                ))}
              </AnimatePresence>

              {!tools.receiveMoney && bentoToolDefs.length > 0 && (
                <div style={{ gridColumn: "1 / -1", fontSize: 12, color: theme.subtext, textAlign: "center", marginTop: 4 }}>
                  {tools.receipts ? "Payments are off — customers pay you at the counter, and pay Malvin €0.50 to confirm + get a receipt." : "Payments and receipts are off — customers can complete requests without paying anything."}
                </div>
              )}
            </motion.div>
            </>
          )}

          {activeTab === "chat" && tools.chat && (
            <div style={{ height: "calc(100vh - 130px)", borderRadius: 20, overflow: "hidden", border: `1px solid ${theme.cardBorder}` }}>
              <Chats brandId={businessId} userBrand={{ id: businessId, name }} />
            </div>
          )}
        </main>
      )}

      {/* ============================ BOTTOM TABS ============================ */}
      {!fullscreenTool && (
        <nav style={{ position: "fixed", bottom: 18, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 4, background: "rgba(255,255,255,0.85)", border: `1px solid ${theme.cardBorder}`, backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderRadius: 999, padding: 5, zIndex: 40, boxShadow: "0 10px 34px rgba(0,0,0,0.12)" }}>
          <TabButton active={activeTab === "dashboard"} label="Dashboard" accent={accent} onClick={() => setActiveTab("dashboard")} />
          {tools.chat && <TabButton active={activeTab === "chat"} label="Chat" accent={accent} onClick={() => setActiveTab("chat")} />}
          <TabButton active={activeTab === "team"} label="Team" accent={accent} onClick={() => setActiveTab("team")} />
        </nav>
      )}

      {/* ============================ QR MODAL ============================ */}
      <AnimatePresence>
        {qrModalOpen && (
          <GlassOverlay onClose={() => setQrModalOpen(false)}>
            <h3 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 800 }}>Your store QR code</h3>
            <button
              onClick={() => window.open(storeQrValue, "_blank", "noopener,noreferrer")}
              title="Open your store"
              style={{ background: "#fff", borderRadius: 20, padding: 20, display: "flex", justifyContent: "center", marginBottom: 18, border: "1px solid rgba(0,0,0,0.06)", width: "100%", cursor: "pointer" }}
            >
              <QRCodeCanvas id="bvin-store-qr" value={storeQrValue} size={180} fgColor={colors.qr} bgColor="#ffffff" />
            </button>
            {/* Exempt from the blend rule — these stay tied to the QR/scan identity */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <ModalActionButton icon={ExternalLink} label="Open store" accent={accent} onClick={() => window.open(storeQrValue, "_blank", "noopener,noreferrer")} />
              <ModalActionButton icon={Download} label="Download" accent={accent} onClick={() => downloadQr("bvin-store-qr", `${name}-qr.png`)} />
              <ModalActionButton icon={Copy} label="Copy link" accent={accent} onClick={() => navigator.clipboard?.writeText(storeQrValue)} />
              <ModalActionButton icon={Link2} label="Share link" accent={accent} onClick={() => navigator.share?.({ url: storeQrValue, title: name }).catch(() => {})} />
            </div>
          </GlassOverlay>
        )}
      </AnimatePresence>

      {/* ============================ SCANNER PAIRING POPUP ============================ */}
      <AnimatePresence>
        {scannerPopupOpen && (
          <GlassOverlay onClose={closeScannerPairing}>
            <div style={{ textAlign: "center" }}>
              <Camera size={26} style={{ color: accent, marginBottom: 10 }} />
              <h3 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 800 }}>Connect a camera</h3>
              <p style={{ fontSize: 13, color: "rgba(29,29,31,0.6)", margin: "0 0 18px" }}>Scan this with a phone or device to give it temporary access as a confirm scanner.</p>
              {pairingError ? (
                <div style={{ padding: "16px 14px", borderRadius: 14, background: "rgba(220,60,60,0.08)", color: "#c23a3a", fontSize: 12.5 }}>
                  {pairingError}
                  <div style={{ marginTop: 10 }}>
                    <button className="bvin-accent-btn" style={{ background: accent }} onClick={openScannerPairing}>Try again</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ background: "#fff", borderRadius: 20, padding: 18, display: "inline-block", position: "relative", border: "1px solid rgba(0,0,0,0.06)" }}>
                    {pairingUrl ? <QRCodeCanvas value={pairingUrl} size={160} fgColor={colors.qr} /> : (
                      <div style={{ width: 160, height: 160, display: "flex", alignItems: "center", justifyContent: "center", color: "#999", fontSize: 12 }}>Generating code…</div>
                    )}
                  </div>
                  <div style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 12.5, fontWeight: 700, color: pairingStatus === "claimed" ? accent : "rgba(29,29,31,0.55)" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: pairingStatus === "claimed" ? accent : "#999", animation: pairingStatus === "pending" ? "bvinPulse 1.4s infinite" : "none" }} />
                    {pairingStatus === "claimed" ? "Device connected" : pairingStatus === "pending" ? "Waiting for a device to scan…" : "This invite has expired"}
                  </div>
                  {pairingLastScan && (
                    <div style={{ marginTop: 12, fontSize: 12, padding: "8px 12px", borderRadius: 12, background: `${accent}1c`, color: accent, wordBreak: "break-all" }}>Last scan: {pairingLastScan.value}</div>
                  )}
                  <p style={{ fontSize: 11, color: "rgba(29,29,31,0.5)", marginTop: 14 }}>Access expires automatically once the device disconnects.</p>
                </>
              )}
            </div>
          </GlassOverlay>
        )}
      </AnimatePresence>

      {/* ============================ STRIPE CONNECT POPUP ============================ */}
      <AnimatePresence>
        {connectPopupOpen && (
          <GlassOverlay onClose={() => !connectBusy && setConnectPopupOpen(false)}>
            <div style={{ textAlign: "center" }}>
              <Wallet size={26} style={{ color: accent, marginBottom: 10 }} />
              <h3 style={{ margin: "0 0 6px", fontSize: 17, fontWeight: 800 }}>Set up your payout account</h3>
              <p style={{ fontSize: 13, color: "rgba(29,29,31,0.6)", margin: "0 0 20px" }}>Connect a Stripe account so money from customers lands directly with you.</p>
              {connectError && <p style={{ fontSize: 12, color: "#c23a3a", marginBottom: 14 }}>{connectError}</p>}
              <button
                style={blendBtnStyle(connectBusy)}
                disabled={connectBusy}
                onClick={async () => {
                  setConnectError(null);
                  setConnectBusy(true);
                  try {
                    const { url, accountId } = await requestStripeOnboarding(businessId, stripeAccountId);
                    setStripeAccountId(accountId);
                    window.open(url, "_blank", "noopener,noreferrer");
                    setConnectPopupOpen(false);
                  } catch (err: any) {
                    setConnectError(err?.message || "Couldn't start Stripe setup. Try again.");
                  } finally {
                    setConnectBusy(false);
                  }
                }}
              >
                {connectBusy ? "Opening Stripe…" : "Continue with Stripe"}
              </button>
            </div>
          </GlassOverlay>
        )}
      </AnimatePresence>

      {/* ============================ SETTINGS MODAL ============================ */}
      <AnimatePresence>
        {settingsOpen && (
          <GlassOverlay onClose={() => setSettingsOpen(false)} wide={settingsView !== "root"}>
            {settingsView === "root" && (
              <div>
                <h3 style={{ margin: "0 0 18px", fontSize: 17, fontWeight: 800 }}>Settings</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <SettingsRootButton icon={User} label="Profile" accent={accent} onClick={() => setSettingsView("profile")} />
                  <SettingsRootButton icon={Wrench} label="Enable Tools" accent={accent} onClick={() => setSettingsView("tools")} />
                </div>
              </div>
            )}
            {settingsView === "profile" && (
              <ProfileView accent={accent} darkMode={darkMode} setDarkMode={setDarkMode} isVerified={isVerified} isPremium={isPremium} businessId={businessId} name={name} setName={setName} bio={bio} setBio={setBio} address={address} setAddress={setAddress} phone={phone} setPhone={setPhone} openingTime={openingTime} setOpeningTime={setOpeningTime} closingTime={closingTime} setClosingTime={setClosingTime} logoUrl={logoUrlState} onLogoFile={handleLogoFile} onBack={() => setSettingsView("root")} onCustomize={() => setSettingsView("customize")} />
            )}
            {settingsView === "tools" && (
              <ToolsView accent={accent} tools={tools} toggleTool={toggleTool} onBack={() => setSettingsView("root")} tooltipTool={tooltipTool} showTooltipFor={showTooltipFor} />
            )}
            {settingsView === "customize" && (
              <CustomizeView colors={colors} setColors={setColors} name={name} storeQrValue={storeQrValue} onBack={() => setSettingsView("profile")} />
            )}
          </GlassOverlay>
        )}
      </AnimatePresence>

      {vinbackCreateOpen && <VinBackTagCreate onClose={() => setVinbackCreateOpen(false)} />}
      {vinbackListOpen && <VinBackTagList onClose={() => setVinbackListOpen(false)} />}

      <CatalogueSetupWizard
        open={catalogueWizardOpen}
        title="catalogue"
        withPicture
        accent={accent}
        onClose={() => setCatalogueWizardOpen(false)}
        onComplete={(result) => setCatalogueConfig(result)}
      />
      <CatalogueSetupWizard
        open={offeringsWizardOpen}
        title="services"
        withPicture={false}
        accent={accent}
        onClose={() => setOfferingsWizardOpen(false)}
        onComplete={(result) => setOfferingsConfig(result)}
      />
    </div>
  );
};

/* ================================ Subcomponents ================================ */

const GlobalStyle: React.FC = () => (
  <style>{`
    * { box-sizing: border-box; }
    .bvin-accent-btn { border: none; color: #fff; font-weight: 800; font-size: 14px; padding: 13px 22px; border-radius: 14px; cursor: pointer; width: 100%; transition: transform 0.15s ease, filter 0.2s ease; }
    .bvin-accent-btn:hover { filter: brightness(1.06); transform: translateY(-1px); }
    .bvin-tab-btn { border: none; background: transparent; cursor: pointer; padding: 9px 18px; border-radius: 999px; font-size: 13px; font-weight: 600; transition: background 0.25s ease, color 0.25s ease; }
    .bvin-spin-globe { display: inline-flex; animation: bvinSpin 1.2s linear infinite; }
    ::-webkit-scrollbar { display: none; }
    @keyframes bvinPulse { 0% { box-shadow: 0 0 0 0 rgba(153,153,153,0.5); } 70% { box-shadow: 0 0 0 7px rgba(153,153,153,0); } 100% { box-shadow: 0 0 0 0 rgba(153,153,153,0); } }
    @keyframes bvinSpin { to { transform: rotate(360deg); } }
  `}</style>
);

/* Left of the top island: exactly one of three states shows at a time —
   Premium (upsell) -> Request Verification (once premium) -> Verified
   (once granted, either by admin or the onboarding wizard's 24-day grant). */
const BusinessStatusPill: React.FC<{ businessId: string; isPremium: boolean; isVerified: boolean; onOpenPremium: () => void }> = ({ businessId, isPremium, isVerified, onOpenPremium }) => {
  const [requested, setRequested] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [verifiedUntil, setVerifiedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!businessId || !isPremium || isVerified) return;
    // verification_requests/{id} itself is admin-read-only (see
    // database.rules.json), so the business can't read its own request
    // back from there. verificationRequestedAt on the business's own
    // users/{uid} node — which they can always read — is written
    // alongside it purely so this button knows to show "Requested".
    const unsub = onValue(rtdbRef(rtdb, `users/${businessId}/verificationRequestedAt`), (snap) => {
      setRequested(snap.exists());
    });
    return () => unsub();
  }, [businessId, isPremium, isVerified]);

  // Verified-but-not-Premium should only ever happen via the temporary
  // 24-day onboarding grant (a real Premium+admin verification stays
  // verified regardless of Premium status, but nothing else should land
  // a non-Premium account here) — so this combination gets its own
  // visible countdown specifically to make it easy for an admin skimming
  // the dashboard to notice and double check, per the "hard to trace" ask.
  useEffect(() => {
    if (!businessId || isPremium || !isVerified) return;
    const unsub = onValue(rtdbRef(rtdb, `users/${businessId}/verifiedUntil`), (snap) => {
      setVerifiedUntil(snap.exists() ? snap.val() : null);
    });
    return () => unsub();
  }, [businessId, isPremium, isVerified]);

  useEffect(() => {
    if (!verifiedUntil) return;
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, [verifiedUntil]);

  if (isVerified) {
    const showNonPremiumCountdown = !isPremium && verifiedUntil && verifiedUntil > now;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 13px", borderRadius: 999, background: "rgba(0,127,255,0.1)", border: "1px solid rgba(0,127,255,0.25)", fontSize: 12, fontWeight: 800, color: "#007fff" }}>
          <BadgeCheck size={13} /> Verified
        </div>
        {showNonPremiumCountdown && (
          <div title="Non-Premium accounts are only verified via the temporary onboarding grant" style={{ display: "flex", alignItems: "center", gap: 5, padding: "7px 11px", borderRadius: 999, background: "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.3)", fontSize: 11, fontWeight: 800, color: "#b45309" }}>
            <Clock size={11} /> Non-Premium · {formatCountdown(verifiedUntil - now)}
          </div>
        )}
      </div>
    );
  }

  if (!isPremium) {
    return (
      <button
        onClick={onOpenPremium}
        style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 13px", borderRadius: 999, border: "none", background: "linear-gradient(135deg,#7c5cff,#4f9cf9)", color: "#fff", fontSize: 12, fontWeight: 800, cursor: "pointer", boxShadow: "0 8px 18px rgba(79,156,249,0.35)" }}
      >
        <Star size={12} /> Premium
      </button>
    );
  }

  return (
    <button
      onClick={async () => {
        if (requested || requesting) return;
        setRequesting(true);
        try {
          const requestedAt = Date.now();
          await Promise.all([
            // The actual request an admin reviews and, if approved, grants
            // by setting users/{uid}/isVerified = true directly (no
            // verifiedUntil, since an admin grant isn't the 24-day
            // onboarding freebie and shouldn't auto-expire the same way).
            set(rtdbRef(rtdb, `verification_requests/${businessId}`), { businessId, uid: businessId, status: "pending", requestedAt }),
            // The business's own readable copy, purely to drive this button.
            rtdbUpdate(rtdbRef(rtdb, `users/${businessId}`), { verificationRequestedAt: requestedAt }),
          ]);
          setRequested(true);
        } finally {
          setRequesting(false);
        }
      }}
      disabled={requested || requesting}
      style={{ display: "flex", alignItems: "center", gap: 5, padding: "8px 13px", borderRadius: 999, border: "1px solid rgba(0,0,0,0.08)", background: requested ? "rgba(0,0,0,0.04)" : "linear-gradient(150deg, #ffffff, #eef0f3)", color: requested ? "rgba(29,29,31,0.5)" : "#1d1d1f", fontSize: 12, fontWeight: 800, cursor: requested ? "default" : "pointer", boxShadow: requested ? "none" : "0 3px 10px rgba(0,0,0,0.1)" }}
    >
      <BadgeCheck size={13} /> {requested ? "Requested" : "Request Verification"}
    </button>
  );
};

function formatCountdown(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  if (days > 0) return `${days}d ${hours}h left`;
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m left`;
}

const TabButton: React.FC<{ active: boolean; label: string; accent: string; onClick: () => void }> = ({ active, label, accent, onClick }) => (
  <button className="bvin-tab-btn" onClick={onClick} style={{ background: active ? accent : "transparent", color: active ? "#fff" : "rgba(29,29,31,0.55)" }}>{label}</button>
);

const BentoCard: React.FC<{ tool: ToolDef; span: number; order: number; pinned: boolean; theme: any; accent: string; extra?: React.ReactNode }> = ({ tool, span, order, pinned, theme, accent, extra }) => {
  const placementStyle: React.CSSProperties =
    tool.fixedPlacement === "top-right" ? { gridColumn: "3 / span 2", gridRow: 1 }
    : tool.fixedPlacement === "under-top-right" ? { gridColumn: "3 / span 2", gridRow: 2 }
    : { gridColumn: `span ${span}`, order };

  return (
    <motion.div layout initial={{ opacity: 0, scale: 0.92, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ type: "spring", stiffness: 300, damping: 26 }}
      style={{ ...placementStyle, background: theme.cardBg, border: `1px solid ${pinned ? accent : theme.cardBorder}`, borderRadius: 20, padding: 15, minHeight: 128, display: "flex", flexDirection: "column", gap: 10, boxShadow: "0 6px 20px rgba(0,0,0,0.04)", position: "relative" }}
    >
      {pinned && <Pin size={11} color={accent} style={{ position: "absolute", top: 10, right: 10 }} />}
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 9, background: `${accent}1e`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <tool.icon size={14} color={accent} />
        </div>
        <span style={{ fontWeight: 700, fontSize: 13.5 }}>{tool.label}</span>
      </div>
      {extra ? extra : <p style={{ fontSize: 12, color: theme.subtext, margin: 0 }}>{tool.description}</p>}
    </motion.div>
  );
};

const CustomerNoticeCard: React.FC<{
  theme: any;
  accent: string;
  colors: BVinColors;
  text: string;
  setText: (v: string) => void;
  qrValue: string;
}> = ({ theme, accent, colors, text, setText, qrValue }) => {
  const [draft, setDraft] = useState(text);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(text);
  }, [text]);

  const hasChanges = draft !== text;

  const handleSave = () => {
    if (!hasChanges || saving) return;

    setSaving(true);
    setText(draft.trim());
    setSaved(true);

    window.setTimeout(() => {
      setSaving(false);
      setSaved(false);
    }, 1400);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <textarea
        value={draft}
        onChange={(e) => {
          setDraft(e.target.value);
          setSaved(false);
        }}
        rows={2}
        placeholder="e.g. We are currently on holiday, we'll be back…"
        style={{
          resize: "none",
          fontSize: 12,
          borderRadius: 10,
          border: `1px solid ${theme.cardBorder}`,
          background: "transparent",
          color: theme.text,
          padding: 8,
          fontFamily: "inherit",
          outline: "none",
          width: "100%",
          boxSizing: "border-box",
        }}
      />

      <button
        onClick={handleSave}
        disabled={!hasChanges || saving}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          background: hasChanges ? accent : `${accent}14`,
          color: hasChanges ? "#fff" : accent,
          border: `1px solid ${hasChanges ? accent : `${accent}30`}`,
          borderRadius: 10,
          padding: "8px 10px",
          fontSize: 11.5,
          fontWeight: 800,
          cursor: hasChanges ? "pointer" : "default",
          opacity: saving ? 0.75 : 1,
          transition: "all 0.2s ease",
        }}
      >
        <Check size={12} />
        {saving ? "Saving…" : saved ? "Saved" : "Save notice"}
      </button>

      <button
        onClick={() => downloadQr("bvin-notice-qr-hidden", "customer-notice-qr.png")}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          background: `${accent}1c`,
          color: accent,
          border: `1px solid ${accent}44`,
          borderRadius: 10,
          padding: "7px 10px",
          fontSize: 11.5,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        <Download size={12} /> Download QR
      </button>

      <div style={{ display: "none" }}>
        <QRCodeCanvas
          id="bvin-notice-qr-hidden"
          value={qrValue}
          fgColor={colors.qr}
          size={256}
        />
      </div>
    </div>
  );
};

const ReceiveMoneyCard: React.FC<{ theme: any; accent: string; connected: boolean; payoutsEnabled: boolean }> = ({ theme, accent, connected, payoutsEnabled }) => (
  <div>
    <div style={{ fontSize: 22, fontWeight: 800 }}>€0.00</div>
    <div style={{ fontSize: 11, color: connected ? accent : theme.subtext, marginTop: 2, fontWeight: 600 }}>{payoutsEnabled ? "Connected — payouts active" : connected ? "Verifying with Stripe…" : "Not connected yet"}</div>
  </div>
);

const VinBackTagsCard: React.FC<{ theme: any; accent: string; tags: any[]; onCreate: () => void; onViewAll: () => void }> = ({ theme, accent, tags, onCreate, onViewAll }) => (
  <div>
    <div style={{ fontSize: 18, fontWeight: 800 }}>{tags.length}</div>
    <div style={{ fontSize: 10.5, color: theme.subtext, marginBottom: 8 }}>tag{tags.length === 1 ? "" : "s"} created</div>
    <div style={{ display: "flex", gap: 5 }}>
      <button onClick={onCreate} style={{ ...smallBtnStyle(accent, true), flex: 1 }}><Plus size={11} /></button>
      <button onClick={onViewAll} style={{ ...smallBtnStyle(accent, false), flex: 1 }}><Tag size={11} /></button>
    </div>
  </div>
);

const CatalogueCard: React.FC<{ businessId: string; theme: any; accent: string; config: CatalogueSetupResult | null }> = ({ businessId, theme, accent, config }) => {
  const [products, setProducts] = useState<any[]>([]);
  const [formOpen, setFormOpen] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    const unsub = onSnapshot(collection(firestore, "business", businessId, "products"), (snap) => setProducts(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, [businessId]);

  const fields = config?.fields || ["name", "price"];

  return (
    <div>
      {config && <div style={{ fontSize: 10, color: theme.subtext, marginBottom: 6, textTransform: "capitalize" }}>{config.layout.replace(/([A-Z])/g, " $1")} layout</div>}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 10 }}>
        {products.length === 0 && <span style={{ fontSize: 11.5, color: theme.subtext }}>Nothing listed yet.</span>}
        {products.slice(0, 8).map((p) => (
          <div key={p.id} style={{ flexShrink: 0, borderRadius: 12, background: `${accent}14`, fontSize: 11.5, overflow: "hidden", width: p.imageUrl ? 84 : "auto" }}>
            {p.imageUrl && <img src={p.imageUrl} alt={p.name} style={{ width: "100%", height: 54, objectFit: "cover" }} />}
            <div style={{ padding: "6px 10px" }}>
              {p.name && <div style={{ fontWeight: 700 }}>{p.name}</div>}
              {p.price !== undefined && <span style={{ color: theme.subtext }}>€{Number(p.price).toFixed(2)}</span>}
            </div>
          </div>
        ))}
      </div>
      <button onClick={() => setFormOpen(true)} style={smallBtnStyle(accent, false)}><Plus size={12} /> Add item</button>
      <ProductFormModal open={formOpen} onClose={() => setFormOpen(false)} businessId={businessId} fields={fields} accent={accent} />
    </div>
  );
};

const PricesCard: React.FC<{ businessId: string; theme: any; accent: string }> = ({ businessId, theme, accent }) => {
  const [items, setItems] = useState<any[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [n, setN] = useState("");
  const [p, setP] = useState("");

  useEffect(() => {
    if (!businessId) return;
    const unsub = onSnapshot(collection(firestore, "business", businessId, "priceList"), (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, [businessId]);

  const add = async () => {
    if (!n.trim() || !p) return;
    await addDoc(collection(firestore, "business", businessId, "priceList"), { name: n.trim(), price: Number(p), createdAt: serverTimestamp() });
    setN(""); setP(""); setFormOpen(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ maxHeight: 70, overflowY: "auto", display: "flex", flexDirection: "column", gap: 3 }}>
        {items.length === 0 && <span style={{ fontSize: 11.5, color: theme.subtext }}>No prices yet.</span>}
        {items.map((it) => (
          <div key={it.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
            <span>{it.name}</span><span style={{ fontWeight: 700 }}>€{Number(it.price).toFixed(2)}</span>
          </div>
        ))}
      </div>
      {formOpen ? (
        <div style={{ display: "flex", gap: 6 }}>
          <input placeholder="Name" value={n} onChange={(e) => setN(e.target.value)} style={miniInputStyle(theme)} />
          <input placeholder="€" value={p} onChange={(e) => setP(e.target.value)} style={{ ...miniInputStyle(theme), width: 50 }} />
          <button onClick={add} style={smallBtnStyle(accent, true)}><Check size={12} /></button>
        </div>
      ) : (
        <button onClick={() => setFormOpen(true)} style={smallBtnStyle(accent, false)}><Plus size={12} /> Add price</button>
      )}
    </div>
  );
};

const OfferingsCard: React.FC<{ businessId: string; theme: any; accent: string; config: CatalogueSetupResult | null }> = ({ businessId, theme, accent, config }) => {
  const [items, setItems] = useState<any[]>([]);
  const [val, setVal] = useState("");

  const [workers, setWorkers] = useState<any[]>([]);
  const [workerFormOpen, setWorkerFormOpen] = useState(false);
  const [wName, setWName] = useState("");
  const [wPhrase, setWPhrase] = useState("");
  const [wFile, setWFile] = useState<File | null>(null);
  const [wPreview, setWPreview] = useState("");
  const [savingWorker, setSavingWorker] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    const unsub = onSnapshot(collection(firestore, "business", businessId, "offerings"), (snap) => setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, [businessId]);

  useEffect(() => {
    if (!businessId) return;
    const unsub = onSnapshot(collection(firestore, "business", businessId, "team"), (snap) => setWorkers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, [businessId]);

  const add = async () => {
    if (!val.trim()) return;
    await addDoc(collection(firestore, "business", businessId, "offerings"), { name: val.trim(), createdAt: serverTimestamp() });
    setVal("");
  };

  const pickFile = (f: File | null) => { setWFile(f); setWPreview(f ? URL.createObjectURL(f) : ""); };

  const saveWorker = async () => {
    if (!wName.trim()) return;
    setSavingWorker(true);
    try {
      const workerId = `worker_${Date.now()}`;
      let pictureURL = "";
      if (wFile) {
        const fileRef = storageRef(storage, `business/${businessId}/team/${workerId}.jpg`);
        const snap = await uploadBytes(fileRef, wFile);
        pictureURL = await getDownloadURL(snap.ref);
      }
      await setDoc(doc(firestore, "business", businessId, "team", workerId), { name: wName.trim(), catchyPhrase: wPhrase.trim(), pictureURL, createdAt: serverTimestamp() });
      setWName(""); setWPhrase(""); pickFile(null); setWorkerFormOpen(false);
    } finally {
      setSavingWorker(false);
    }
  };

  return (
    <div>
      {config && <div style={{ fontSize: 10, color: theme.subtext, marginBottom: 6, textTransform: "capitalize" }}>{config.layout.replace(/([A-Z])/g, " $1")} layout</div>}

      <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.4, color: theme.subtext, marginBottom: 6 }}>What you offer</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
        {items.length === 0 && <span style={{ fontSize: 11.5, color: theme.subtext }}>Nothing added yet.</span>}
        {items.map((it) => (<span key={it.id} style={{ fontSize: 10.5, fontWeight: 600, padding: "4px 8px", borderRadius: 999, background: `${accent}1c`, color: accent }}>{it.name}</span>))}
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
        <input placeholder="Add an item…" value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} style={miniInputStyle(theme)} />
        <button onClick={add} style={smallBtnStyle(accent, true)}><Plus size={12} /></button>
      </div>

      <div style={{ height: 1, background: theme.cardBorder, marginBottom: 12 }} />

      <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.4, color: theme.subtext, marginBottom: 8 }}>Who's on your team</div>
      <div style={{ display: "flex", gap: 10, overflowX: "auto", marginBottom: 10 }}>
        {workers.length === 0 && <span style={{ fontSize: 11.5, color: theme.subtext }}>No team members yet.</span>}
        {workers.map((w) => (
          <div key={w.id} style={{ flexShrink: 0, textAlign: "center", width: 62 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", overflow: "hidden", margin: "0 auto 4px", background: `${accent}1c`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {w.pictureURL ? <img src={w.pictureURL} alt={w.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <UserPlus size={16} color={accent} />}
            </div>
            <div style={{ fontSize: 10.5, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{w.name}</div>
            {w.catchyPhrase && <div style={{ fontSize: 9, color: theme.subtext, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{w.catchyPhrase}</div>}
          </div>
        ))}
      </div>
      {workerFormOpen ? (
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <button onClick={() => document.getElementById("bvin-worker-file")?.click()} style={{ width: 44, height: 44, borderRadius: "50%", overflow: "hidden", border: `1px dashed ${theme.cardBorder}`, background: "transparent", cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {wPreview ? <img src={wPreview} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <Camera size={14} color={theme.subtext} />}
          </button>
          <input id="bvin-worker-file" type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => pickFile(e.target.files?.[0] || null)} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
            <input placeholder="Name" value={wName} onChange={(e) => setWName(e.target.value)} style={miniInputStyle(theme)} />
            <input placeholder="Catchy phrase" value={wPhrase} onChange={(e) => setWPhrase(e.target.value)} style={miniInputStyle(theme)} />
            <button onClick={saveWorker} style={smallBtnStyle(accent, true)} disabled={savingWorker}>{savingWorker ? "Saving…" : "Save worker"}</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setWorkerFormOpen(true)} style={smallBtnStyle(accent, false)}><UserPlus size={12} /> Add worker</button>
      )}
    </div>
  );
};

const JOB_STATUSES = ["received", "in_progress", "done"] as const;
const JobRequestsCard: React.FC<{ businessId: string; theme: any; accent: string }> = ({ businessId, theme, accent }) => {
  const [jobs, setJobs] = useState<any[]>([]);
  useEffect(() => {
    if (!businessId) return;
    const unsub = onSnapshot(collection(firestore, "business", businessId, "jobRequests"), (snap) => setJobs(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, [businessId]);
  const setStatus = (id: string, status: string) => setDoc(doc(firestore, "business", businessId, "jobRequests", id), { status }, { merge: true });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 130, overflowY: "auto" }}>
      {jobs.length === 0 && <span style={{ fontSize: 11.5, color: theme.subtext }}>No job requests yet.</span>}
      {jobs.map((j) => (
        <div key={j.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "6px 8px", borderRadius: 10, background: `${accent}0d` }}>
          <span style={{ fontSize: 11.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{j.title || j.description || "Request"}</span>
          <select value={j.status || "received"} onChange={(e) => setStatus(j.id, e.target.value)} style={{ fontSize: 10.5, borderRadius: 8, border: `1px solid ${theme.cardBorder}`, background: "transparent", color: theme.text }}>
            {JOB_STATUSES.map((s) => (<option key={s} value={s}>{s.replace("_", " ")}</option>))}
          </select>
        </div>
      ))}
    </div>
  );
};

const AnalyticsCard: React.FC<{ theme: any; accent: string; qrScans: number; noticeScans: number }> = ({ theme, accent, qrScans, noticeScans }) => (
  <div>
    <div style={{ fontSize: 22, fontWeight: 800 }}>{qrScans + noticeScans}</div>
    <div style={{ fontSize: 11, color: theme.subtext, marginBottom: 8 }}>customers scanned in</div>
    <div style={{ display: "flex", gap: 10, fontSize: 10.5 }}>
      <span style={{ color: accent, fontWeight: 700 }}>{qrScans} store</span>
      <span style={{ color: theme.subtext }}>·</span>
      <span style={{ color: accent, fontWeight: 700 }}>{noticeScans} notice</span>
    </div>
  </div>
);

const OpeningStatusCard: React.FC<{ theme: any; accent: string; openingTime: string; closingTime: string }> = ({ theme, accent, openingTime, closingTime }) => {
  const isOpen = useMemo(() => {
    if (!openingTime || !closingTime) return null;
    const now = new Date();
    const [oh, om] = openingTime.split(":").map(Number);
    const [ch, cm] = closingTime.split(":").map(Number);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const openMin = oh * 60 + om;
    const closeMin = ch * 60 + cm;
    return openMin <= closeMin ? nowMin >= openMin && nowMin < closeMin : nowMin >= openMin || nowMin < closeMin;
  }, [openingTime, closingTime]);

  if (isOpen === null) return <p style={{ fontSize: 12, color: theme.subtext, margin: 0 }}>Set your opening hours in Profile to show this.</p>;

  return (
    <div>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, background: isOpen ? `${accent}1e` : "rgba(220,60,60,0.12)", color: isOpen ? accent : "#d64545", fontSize: 12, fontWeight: 700 }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: isOpen ? accent : "#d64545" }} />
        {isOpen ? "Open now" : "Closed"}
      </span>
      <div style={{ fontSize: 11, color: theme.subtext, marginTop: 6 }}>{openingTime} – {closingTime}</div>
    </div>
  );
};

const ContactBusinessCard: React.FC<{ theme: any; accent: string; phone: string }> = ({ theme, accent, phone }) => (
  phone ? (<a href={`tel:${phone}`} style={{ ...smallBtnStyle(accent, true), width: "100%", textDecoration: "none" }}><Phone size={12} /> {phone}</a>)
  : (<p style={{ fontSize: 12, color: theme.subtext, margin: 0 }}>Add a phone number in Profile.</p>)
);

const ServiceCallsCard: React.FC<{ businessId: string; theme: any; accent: string; type: "staff" | "table" }> = ({ businessId, theme, accent, type }) => {
  const [calls, setCalls] = useState<any[]>([]);
  useEffect(() => {
    if (!businessId) return;
    const q = query(collection(firestore, "business", businessId, "serviceCalls"), where("type", "==", type));
    const unsub = onSnapshot(q, (snap) => setCalls(snap.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => unsub();
  }, [businessId, type]);
  const resolve = (id: string) => setDoc(doc(firestore, "business", businessId, "serviceCalls", id), { resolved: true }, { merge: true });
  const active = calls.filter((c) => !c.resolved);
  return (
    <div>
      <div style={{ fontSize: 20, fontWeight: 800 }}>{active.length}</div>
      <div style={{ fontSize: 11, color: theme.subtext, marginBottom: 8 }}>waiting</div>
      {active.slice(0, 3).map((c) => (
        <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, marginBottom: 4 }}>
          <span>{c.tableNumber ? `Table ${c.tableNumber}` : "Customer"}</span>
          <button onClick={() => resolve(c.id)} style={{ fontSize: 10, fontWeight: 700, color: accent, background: "none", border: "none", cursor: "pointer" }}>Done</button>
        </div>
      ))}
    </div>
  );
};

const FullscreenLaunchCard: React.FC<{ accent: string; onOpen: () => void }> = ({ accent, onOpen }) => (
  <button onClick={onOpen} style={{ ...smallBtnStyle(accent, true), width: "100%" }}>Open</button>
);

const smallBtnStyle = (accent: string, filled: boolean): React.CSSProperties => ({
  display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
  padding: "7px 10px", borderRadius: 10, fontSize: 11, fontWeight: 700, cursor: "pointer",
  border: filled ? "none" : `1px solid ${accent}44`,
  background: filled ? accent : `${accent}14`,
  color: filled ? "#fff" : accent,
  whiteSpace: "nowrap",
});

const miniInputStyle = (theme: any): React.CSSProperties => ({ flex: 1, fontSize: 12, padding: "7px 9px", borderRadius: 9, border: `1px solid ${theme.cardBorder}`, background: "transparent", color: theme.text, fontFamily: "inherit" });

/* Every popup is now white glass with a soft dark shadow — no dark-glass
   variant anymore. `wide` gets extra room for the Profile form. */
const GlassOverlay: React.FC<{ children: React.ReactNode; onClose: () => void; wide?: boolean }> = ({ children, onClose, wide }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(20,20,22,0.32)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 20 }}>
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 12 }} transition={{ type: "spring", stiffness: 320, damping: 28 }}
      onClick={(e) => e.stopPropagation()}
      style={{ background: "rgba(255,255,255,0.94)", backdropFilter: "blur(34px) saturate(180%)", WebkitBackdropFilter: "blur(34px) saturate(180%)", border: "1px solid rgba(255,255,255,0.8)", borderRadius: 28, padding: 26, width: "100%", maxWidth: wide ? 560 : 360, maxHeight: "84vh", overflowY: "auto", color: "#1d1d1f", boxShadow: "0 30px 80px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.9)", position: "relative" }}
    >
      <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "linear-gradient(150deg, #ffffff, #eef0f3)", border: "none", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#1d1d1f", boxShadow: "0 2px 6px rgba(0,0,0,0.12)" }}>
        <X size={14} />
      </button>
      {children}
    </motion.div>
  </motion.div>
);

/* Exempted from the blend rule per the house style — stays tied to the
   scanner/QR feature's identity rather than fading into white. */
const ModalActionButton: React.FC<{ icon: React.ElementType; label: string; accent: string; onClick: () => void }> = ({ icon: Icon, label, accent, onClick }) => (
  <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 16px", borderRadius: 15, border: "1px solid rgba(0,0,0,0.06)", background: "rgba(0,0,0,0.025)", color: "#1d1d1f", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
    <Icon size={16} color={accent} />
    {label}
  </button>
);

const SettingsRootButton: React.FC<{ icon: React.ElementType; label: string; accent: string; onClick: () => void }> = ({ icon: Icon, label, accent, onClick }) => (
  <button onClick={onClick} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "15px 17px", borderRadius: 17, border: "none", background: "linear-gradient(150deg, #ffffff, #eef0f3)", color: "#1d1d1f", cursor: "pointer", fontSize: 14, fontWeight: 700, boxShadow: "0 3px 10px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)" }}>
    <span style={{ display: "flex", alignItems: "center", gap: 10 }}><Icon size={16} color={accent} /> {label}</span>
    <ChevronRight size={15} opacity={0.4} />
  </button>
);

const ProfileView: React.FC<{
  accent: string;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
  isVerified: boolean;
  isPremium: boolean;
  businessId: string;
  name: string;
  setName: (v: string) => void;
  bio: string;
  setBio: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  openingTime: string;
  setOpeningTime: (v: string) => void;
  closingTime: string;
  setClosingTime: (v: string) => void;
  logoUrl: string;
  onLogoFile: (f: File) => void;
  onBack: () => void;
  onCustomize: () => void;
}> = ({
  accent,
  darkMode,
  setDarkMode,
  isVerified,
  isPremium,
  businessId,
  name,
  setName,
  bio,
  setBio,
  address,
  setAddress,
  phone,
  setPhone,
  openingTime,
  setOpeningTime,
  closingTime,
  setClosingTime,
  logoUrl,
  onLogoFile,
  onBack,
  onCustomize,
}) => {
  const fileRef = useRef<HTMLInputElement>(null);

  const [draftName, setDraftName] = useState(name);
  const [draftBio, setDraftBio] = useState(bio);
  const [draftAddress, setDraftAddress] = useState(address);
  const [draftPhone, setDraftPhone] = useState(phone);
  const [draftOpeningTime, setDraftOpeningTime] = useState(openingTime);
  const [draftClosingTime, setDraftClosingTime] = useState(closingTime);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelDone, setCancelDone] = useState(false);

  const [downloading, setDownloading] = useState(false);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleCancelPremium = async () => {
    setCancelling(true);
    setCancelError(null);
    try {
      await cancelPremiumSubscription({});
      setCancelDone(true);
      setCancelConfirmOpen(false);
    } catch (err: any) {
      setCancelError(err?.message || "Couldn't cancel your subscription. Try again or contact support.");
    } finally {
      setCancelling(false);
    }
  };

  const handleDownloadData = async () => {
    setDownloading(true);
    try {
      const result: any = await downloadMyData({});
      const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `malvin-business-data-${businessId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download my data failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  const handleDeleteData = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== "DELETE") return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteMyData({});
      // Account (including Firebase Auth) is gone server-side at this
      // point — reload sends them back to a signed-out state naturally,
      // there's no dashboard left to return them to.
      window.location.href = "/";
    } catch (err: any) {
      setDeleteError(err?.message || "Couldn't delete your data. Try again or contact support.");
      setDeleting(false);
    }
  };

  // Keep the editor in sync when Firestore loads or another device changes
  // the saved profile.
  useEffect(() => {
    setDraftName(name);
    setDraftBio(bio);
    setDraftAddress(address);
    setDraftPhone(phone);
    setDraftOpeningTime(openingTime);
    setDraftClosingTime(closingTime);
  }, [name, bio, address, phone, openingTime, closingTime]);

  const hasChanges =
    draftName !== name ||
    draftBio !== bio ||
    draftAddress !== address ||
    draftPhone !== phone ||
    draftOpeningTime !== openingTime ||
    draftClosingTime !== closingTime;

  const handleSave = () => {
    if (!hasChanges || saving) return;

    setSaving(true);

    setName(draftName.trim());
    setBio(draftBio.trim());
    setAddress(draftAddress.trim());
    setPhone(draftPhone.trim());
    setOpeningTime(draftOpeningTime);
    setClosingTime(draftClosingTime);

    setSaved(true);

    window.setTimeout(() => {
      setSaving(false);
      setSaved(false);
    }, 1400);
  };

  return (
    <div>
      <BackHeader title="Profile" onBack={onBack} />

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              overflow: "hidden",
              border: "1px solid rgba(0,0,0,0.08)",
              background: "rgba(0,0,0,0.03)",
              cursor: "pointer",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="logo"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <UserCircle2 size={28} color="#999" />
            )}
          </button>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onLogoFile(f);
            }}
          />

          <div style={{ flex: 1 }}>
            <label style={profileLabelStyle}>Brand name</label>
            <input
              value={draftName}
              onChange={(e) => {
                setDraftName(e.target.value);
                setSaved(false);
              }}
              style={profileInputStyle}
            />
          </div>
        </div>

        {isVerified && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 12,
              color: "#007fff",
              fontWeight: 700,
            }}
          >
            <BadgeCheck size={14} /> Verified business
          </div>
        )}

        <div>
          <label style={profileLabelStyle}>Bio</label>
          <textarea
            value={draftBio}
            onChange={(e) => {
              setDraftBio(e.target.value);
              setSaved(false);
            }}
            rows={2}
            style={{ ...profileInputStyle, resize: "none" }}
            placeholder="What do you do?"
          />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <label style={profileLabelStyle}>
              <MapPin size={11} style={{ verticalAlign: -1 }} /> Address
            </label>
            <input
              value={draftAddress}
              onChange={(e) => {
                setDraftAddress(e.target.value);
                setSaved(false);
              }}
              style={profileInputStyle}
              placeholder="Street, city"
            />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <label style={profileLabelStyle}>
              <Phone size={11} style={{ verticalAlign: -1 }} /> Phone
            </label>
            <input
              value={draftPhone}
              onChange={(e) => {
                setDraftPhone(e.target.value);
                setSaved(false);
              }}
              style={profileInputStyle}
              placeholder="+49 ..."
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <label style={profileLabelStyle}>
              <Clock size={11} style={{ verticalAlign: -1 }} /> Opens
            </label>
            <input
              type="time"
              value={draftOpeningTime}
              onChange={(e) => {
                setDraftOpeningTime(e.target.value);
                setSaved(false);
              }}
              style={profileInputStyle}
            />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <label style={profileLabelStyle}>Closes</label>
            <input
              type="time"
              value={draftClosingTime}
              onChange={(e) => {
                setDraftClosingTime(e.target.value);
                setSaved(false);
              }}
              style={profileInputStyle}
            />
          </div>
        </div>

        <SettingsRow label="Dark mode" accent={accent}>
          <ToggleSwitch
            checked={darkMode}
            onChange={setDarkMode}
            accent={accent}
          />
        </SettingsRow>

        <button
          onClick={onCustomize}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "15px 17px",
            borderRadius: 17,
            border: "none",
            background: "linear-gradient(150deg, #ffffff, #eef0f3)",
            color: "#1d1d1f",
            cursor: "pointer",
            fontSize: 13.5,
            fontWeight: 700,
            boxShadow:
              "0 3px 10px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Palette size={15} color={accent} /> Customize
          </span>
          <ChevronRight size={14} opacity={0.4} />
        </button>

        <button
          onClick={handleSave}
          disabled={!hasChanges || saving}
          style={{
            width: "100%",
            marginTop: 2,
            border: "none",
            borderRadius: 15,
            padding: "13px 20px",
            fontSize: 14,
            fontWeight: 800,
            color: hasChanges ? "#fff" : accent,
            background: hasChanges ? accent : `${accent}14`,
            boxShadow: hasChanges
              ? `0 6px 18px ${accent}35`
              : "none",
            cursor: hasChanges ? "pointer" : "default",
            opacity: saving ? 0.75 : 1,
            transition: "all 0.2s ease",
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 7,
            }}
          >
            <Check size={15} />
            {saving ? "Saving…" : saved ? "Saved" : "Save changes"}
          </span>
        </button>

        {isPremium && (
          <button
            onClick={() => setCancelConfirmOpen(true)}
            style={{ background: "none", border: "none", padding: "4px 2px", fontSize: 12, fontWeight: 700, color: accent, cursor: "pointer", textAlign: "center", marginTop: 2 }}
          >
            Cancel Premium
          </button>
        )}
        {cancelDone && (
          <p style={{ fontSize: 11.5, color: "#22c55e", fontWeight: 600, textAlign: "center", margin: "2px 0 0" }}>
            Your subscription will end at the close of the current billing period.
          </p>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 6 }}>
          <button
            onClick={handleDownloadData}
            disabled={downloading}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 10px", borderRadius: 16, border: "1px solid rgba(0,0,0,0.08)", background: "rgba(0,0,0,0.02)", cursor: downloading ? "default" : "pointer", opacity: downloading ? 0.6 : 1 }}
          >
            <Download size={16} color="#1d1d1f" />
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "#1d1d1f" }}>{downloading ? "Preparing…" : "Download my data"}</span>
          </button>
          <button
            onClick={() => setDeleteConfirmOpen(true)}
            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "14px 10px", borderRadius: 16, border: "1px solid rgba(220,60,60,0.18)", background: "rgba(220,60,60,0.05)", cursor: "pointer" }}
          >
            <Trash2 size={16} color="#c23a3a" />
            <span style={{ fontSize: 11.5, fontWeight: 700, color: "#c23a3a" }}>Delete my data</span>
          </button>
        </div>
      </div>

      {/* Cancel Premium confirmation */}
      <AnimatePresence>
        {cancelConfirmOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !cancelling && setCancelConfirmOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(20,20,22,0.4)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              style={{ width: "100%", maxWidth: 320, background: "rgba(255,255,255,0.96)", borderRadius: 26, padding: 26, boxShadow: "0 30px 80px rgba(0,0,0,0.22)", textAlign: "center" }}
            >
              <h3 style={{ fontSize: 15.5, fontWeight: 800, margin: "0 0 8px", color: "#1d1d1f" }}>Cancel Premium?</h3>
              <p style={{ fontSize: 12.5, color: "rgba(29,29,31,0.6)", margin: "0 0 18px", lineHeight: 1.5 }}>
                You'll keep Premium benefits until the end of your current billing period, then your account reverts to free.
              </p>
              {cancelError && <p style={{ fontSize: 12, color: "#c23a3a", margin: "0 0 14px" }}>{cancelError}</p>}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setCancelConfirmOpen(false)} disabled={cancelling} style={{ flex: 1, padding: "12px", borderRadius: 13, border: "1px solid rgba(0,0,0,0.08)", background: "#fff", fontSize: 12.5, fontWeight: 700, color: "#1d1d1f", cursor: "pointer" }}>
                  Keep Premium
                </button>
                <button onClick={handleCancelPremium} disabled={cancelling} style={{ flex: 1, padding: "12px", borderRadius: 13, border: "none", background: "#c23a3a", fontSize: 12.5, fontWeight: 700, color: "#fff", cursor: cancelling ? "default" : "pointer", opacity: cancelling ? 0.7 : 1 }}>
                  {cancelling ? "Cancelling…" : "Cancel it"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete my data — irreversible, typed confirmation required */}
      <AnimatePresence>
        {deleteConfirmOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => !deleting && setDeleteConfirmOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(20,20,22,0.4)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              onClick={(e) => e.stopPropagation()}
              style={{ width: "100%", maxWidth: 340, background: "rgba(255,255,255,0.96)", borderRadius: 26, padding: 26, boxShadow: "0 30px 80px rgba(0,0,0,0.22)", textAlign: "center" }}
            >
              <Trash2 size={26} color="#c23a3a" style={{ marginBottom: 10 }} />
              <h3 style={{ fontSize: 15.5, fontWeight: 800, margin: "0 0 8px", color: "#1d1d1f" }}>Delete all your data?</h3>
              <p style={{ fontSize: 12.5, color: "rgba(29,29,31,0.6)", margin: "0 0 16px", lineHeight: 1.5 }}>
                This permanently deletes your business profile, catalogue, orders, connections, and account. This can't be undone.
              </p>
              <input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder='Type "DELETE" to confirm'
                style={{ width: "100%", padding: "11px 13px", borderRadius: 12, border: "1px solid rgba(220,60,60,0.25)", background: "rgba(220,60,60,0.04)", fontSize: 13, textAlign: "center", marginBottom: 14 }}
              />
              {deleteError && <p style={{ fontSize: 12, color: "#c23a3a", margin: "0 0 14px" }}>{deleteError}</p>}
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setDeleteConfirmOpen(false)} disabled={deleting} style={{ flex: 1, padding: "12px", borderRadius: 13, border: "1px solid rgba(0,0,0,0.08)", background: "#fff", fontSize: 12.5, fontWeight: 700, color: "#1d1d1f", cursor: "pointer" }}>
                  Cancel
                </button>
                <button onClick={handleDeleteData} disabled={deleting || deleteConfirmText.trim().toUpperCase() !== "DELETE"} style={{ flex: 1, padding: "12px", borderRadius: 13, border: "none", background: "#c23a3a", fontSize: 12.5, fontWeight: 700, color: "#fff", cursor: deleting ? "default" : "pointer", opacity: deleting || deleteConfirmText.trim().toUpperCase() !== "DELETE" ? 0.5 : 1 }}>
                  {deleting ? "Deleting…" : "Delete everything"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const profileLabelStyle: React.CSSProperties = { fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4, opacity: 0.5, display: "block", marginBottom: 5 };
const profileInputStyle: React.CSSProperties = { width: "100%", fontSize: 13.5, padding: "11px 13px", borderRadius: 12, border: "1px solid rgba(0,0,0,0.08)", background: "rgba(0,0,0,0.025)", color: "#1d1d1f", fontFamily: "inherit" };

const ToolsView: React.FC<{ accent: string; tools: ToolState; toggleTool: (key: ToolKey) => void; onBack: () => void; tooltipTool: ToolKey | null; showTooltipFor: (k: ToolKey) => void }> = ({ accent, tools, toggleTool, onBack, tooltipTool, showTooltipFor }) => {
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  const handleDown = (key: ToolKey) => {
    longPressed.current = false;
    pressTimer.current = setTimeout(() => { longPressed.current = true; showTooltipFor(key); }, 480);
  };
  const handleUp = (t: ToolDef) => {
    if (pressTimer.current) clearTimeout(pressTimer.current);
    if (!longPressed.current) toggleTool(t.key);
  };

  return (
    <div>
      <BackHeader title="Enable Tools" onBack={onBack} />
      {CATEGORY_ORDER.map((cat) => (
        <div key={cat} style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: CATEGORY_TINTS[cat] }} />
            <span style={{ fontSize: 11.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: "rgba(29,29,31,0.55)" }}>{cat}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
            {TOOLS.filter((t) => t.category === cat).map((t) => {
              const on = tools[t.key];
              return (
                <div key={t.key} style={{ position: "relative" }}>
                  <button
                    onMouseDown={() => handleDown(t.key)}
                    onMouseUp={() => handleUp(t)}
                    onMouseLeave={() => pressTimer.current && clearTimeout(pressTimer.current)}
                    onTouchStart={() => handleDown(t.key)}
                    onTouchEnd={() => handleUp(t)}
                    disabled={t.alwaysOn}
                    style={{
                      display: "flex", alignItems: "center", gap: 9, padding: "16px 14px", borderRadius: 18, width: "100%",
                      border: on ? `1.5px solid ${accent}` : "none",
                      background: on ? `${accent}14` : "linear-gradient(150deg, #ffffff, #eef0f3)",
                      boxShadow: on ? `0 3px 12px ${accent}22` : "0 3px 10px rgba(0,0,0,0.07), inset 0 1px 0 rgba(255,255,255,0.9)",
                      color: on ? accent : "#1d1d1f", cursor: t.alwaysOn ? "default" : "pointer",
                      fontSize: 13, fontWeight: 700, opacity: t.alwaysOn ? 0.85 : 1, textAlign: "left", minHeight: 58,
                    }}
                  >
                    <t.icon size={16} />
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.label}</span>
                  </button>
                  <AnimatePresence>
                    {tooltipTool === t.key && (
                      <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
                        style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: 6, background: "#1d1d1f", color: "#fff", fontSize: 11, fontWeight: 600, padding: "8px 10px", borderRadius: 10, zIndex: 20, boxShadow: "0 8px 20px rgba(0,0,0,0.25)" }}
                      >
                        {t.description}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <p style={{ fontSize: 11, opacity: 0.5 }}>
        Live Notices and VinBack Tags stay on by default. In the top island: tap an enabled tool to turn it off, hold to pin its position on the dashboard. Hold any tool here to see what it does.
      </p>
    </div>
  );
};

const CustomizeView: React.FC<{ colors: BVinColors; setColors: (fn: (c: BVinColors) => BVinColors) => void; name: string; storeQrValue: string; onBack: () => void }> = ({ colors, setColors, name, storeQrValue, onBack }) => {
  const [tab, setTab] = useState<"store" | "dashboard" | "qr">("store");
  return (
    <div>
      <BackHeader title="Customize" onBack={onBack} />
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {(["store", "dashboard", "qr"] as const).map((k) => (
          <button key={k} onClick={() => setTab(k)} style={{ flex: 1, padding: "9px 6px", borderRadius: 12, border: "none", fontSize: 11.5, fontWeight: 700, textTransform: "capitalize", cursor: "pointer", background: tab === k ? colors.accent : "rgba(0,0,0,0.04)", color: tab === k ? "#fff" : "#1d1d1f" }}>{k}</button>
        ))}
      </div>
      <div style={{ borderRadius: 18, overflow: "hidden", marginBottom: 16, border: "1px solid rgba(0,0,0,0.06)" }}>
        {tab === "qr" ? (
          <div style={{ background: "#fff", padding: 20, display: "flex", justifyContent: "center" }}><QRCodeCanvas value={storeQrValue} size={140} fgColor={colors.qr} /></div>
        ) : tab === "store" ? (
          <div style={{ background: colors.storeBg, color: colors.storeText, padding: 20, fontFamily: colors.font }}>
            <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>{name}</div>
            <div style={{ display: "inline-block", padding: "6px 12px", borderRadius: 999, background: colors.accent, color: "#fff", fontSize: 11, fontWeight: 700 }}>Order now</div>
          </div>
        ) : (
          <div style={{ background: "#f4f4f6", color: "#1d1d1f", padding: 20 }}>
            <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 8 }}>Dashboard background can't be changed</div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 999, background: `${colors.accent}1e`, color: colors.accent, fontSize: 11, fontWeight: 700 }}><Star size={11} /> Sample tool pill</div>
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <ColorRow label="Accent color" value={colors.accent} onChange={(v) => setColors((c) => ({ ...c, accent: v }))} />
        {tab === "qr" && <ColorRow label="QR code color" value={colors.qr} onChange={(v) => setColors((c) => ({ ...c, qr: v }))} />}
        {tab === "store" && (<>
          <ColorRow label="Store background" value={colors.storeBg} onChange={(v) => setColors((c) => ({ ...c, storeBg: v }))} />
          <ColorRow label="Store text" value={colors.storeText} onChange={(v) => setColors((c) => ({ ...c, storeText: v }))} />
        </>)}
        <div>
          <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 6, display: "flex", alignItems: "center", gap: 6 }}><Type size={12} /> Font</div>
          <select value={colors.font} onChange={(e) => setColors((c) => ({ ...c, font: e.target.value }))} style={{ width: "100%", padding: "10px 11px", borderRadius: 12, background: "rgba(0,0,0,0.03)", border: "1px solid rgba(0,0,0,0.08)", color: "#1d1d1f", fontSize: 13 }}>
            {FONT_OPTIONS.map((f) => (<option key={f} value={f}>{f}</option>))}
          </select>
        </div>
      </div>
    </div>
  );
};

const ColorRow: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
    <span style={{ fontSize: 12.5, opacity: 0.75 }}>{label}</span>
    <input type="color" value={value} onChange={(e) => onChange(e.target.value)} style={{ width: 34, height: 34, border: "none", borderRadius: 8, background: "none", cursor: "pointer" }} />
  </div>
);

const SettingsRow: React.FC<{ label: string; accent: string; children: React.ReactNode }> = ({ label, children }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", borderRadius: 16, background: "rgba(0,0,0,0.025)", border: "1px solid rgba(0,0,0,0.05)" }}>
    <span style={{ fontSize: 13.5, fontWeight: 700 }}>{label}</span>
    {children}
  </div>
);

const ToggleSwitch: React.FC<{ checked: boolean; onChange: (v: boolean) => void; accent: string }> = ({ checked, onChange, accent }) => (
  <button onClick={() => onChange(!checked)} style={{ width: 42, height: 24, borderRadius: 999, border: "none", cursor: "pointer", background: checked ? accent : "rgba(0,0,0,0.15)", position: "relative", transition: "background 0.25s ease" }}>
    <motion.div animate={{ x: checked ? 20 : 2 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} style={{ position: "absolute", top: 2, width: 20, height: 20, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
  </button>
);

const BackHeader: React.FC<{ title: string; onBack: () => void }> = ({ title, onBack }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
    <button onClick={onBack} style={{ background: "linear-gradient(150deg, #ffffff, #eef0f3)", border: "none", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#1d1d1f", transform: "rotate(180deg)", boxShadow: "0 2px 6px rgba(0,0,0,0.1)" }}>
      <ChevronRight size={13} />
    </button>
    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>{title}</h3>
  </div>
);

function downloadQr(canvasId: string, filename: string) {
  const canvas = document.getElementById(canvasId) as HTMLCanvasElement | null;
  if (!canvas) return;
  const url = canvas.toDataURL("image/png");
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
}

export default BVin;