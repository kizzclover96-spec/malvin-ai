import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, Settings, Search, Home, Wallet as WalletIcon, QrCode, X, 
  User, Save, Mail, Loader2, CheckCircle2, AlertCircle,
  Clock, Heart, Bell, Moon, Globe, LogOut, ChevronRight, ChevronDown, Calendar, DollarSign,  Download, Trash2, Store, Sparkles, Share2, Tag 
} from 'lucide-react';
import { doc, getDoc, getDocs, setDoc, deleteDoc, collection, collectionGroup, query, where, orderBy, limit, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { signOut, deleteUser } from 'firebase/auth';
import { ref as rtdbRef, get as rtdbGet } from 'firebase/database';
import { firestore as db, db as rtdb, functions } from '../../firebase';
import { httpsCallable } from 'firebase/functions';
import { syncServiceRequestStatus } from '../../utils/serviceRequests';
import { auth } from "../../firebase"; 
import QRCode from 'qrcode'; // Add QRCode to render the scan-ready ticket receipts

import { Radio } from 'lucide-react'; // Added Radio icon for the radar style button
import { VinScanner } from './VinScanner'; // Adjust relative path based on your folder structure
import { NotificationBell, pushNotification } from './Notification';

// --- MODULAR FLOW COMPONENT IMPORTS ---
import { Wallet } from '../addons/Wallet';
import { QRScannerView } from '../addons/QRScannerView';
import { StoreFront } from './StoreFront';
import { RecentBusinesses } from './RecentBusinesses';
import { NearbyBusinesses } from './NearbyBusinesses';
import { VinMoment, getTierForScore, MOM_MILESTONE_STEP } from './Vinmoment';
import { ReceiptsDrawer } from './ReceiptsDrawer';
import { resolveBusiness, extractCategoryAndUid } from '../../services/vinLink';
import { postLocalAlert } from '../../services/pushNotifications';
import VinBackTagCreate from '../vinback/VinBackTagCreate';
import VinBackTagList from '../vinback/VinBackTagList';
import { useLanguage } from '../../contexts/LanguageContext';
import { ALL_LANGUAGES } from '../../i18n/languages';

// Fixed allow-list — these five have hand-tuned, dictionary-based
// translations below (t()), so they render instantly with no network call.
// Any OTHER language a person picks (see the language row in Settings,
// which now lists every language via ALL_LANGUAGES) is handled by the
// shared global live-translator instead — see LanguageContext.tsx. Either
// way `language` here just needs to be a string; it's no longer restricted
// to these five at the type level.
type LanguageCode = 'en' | 'de' | 'fr' | 'es' | 'it';

// Translated strings for everything visible on this screen. Every screen
// text that isn't user-generated data (names, store names, etc.) should
// pull from here via t(key) rather than being hardcoded in JSX, so picking
// a language in Settings actually changes what's on screen.
const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  en: {
    hi: 'Hi',
    goodMorning: 'Good morning',
    goodAfternoon: 'Good afternoon',
    goodEvening: 'Good evening',
    goodNight: 'Good night',
    welcomeBack: 'Welcome back',
    scanPrompt1: 'Scan a VINQR or input',
    scanPrompt2: 'to continue.',
    vinlinkPlaceholder: 'Search businesses, products or VINLINK...',
    nearby: 'Nearby',
    settings: 'Settings',
    controlPanel: 'Control Panel Matrix',
    personalDetails: 'Personal Details',
    personalDetailsDesc: 'Manage identity, locations, contact assets',
    usefulFeatures: 'Useful Features',
    recentBusinesses: 'Recent Businesses',
    favoriteStores: 'Favorite Stores',
    noFavorites: 'No favorites yet — tap the heart on a Recent Business to save it here.',
    notifications: 'Notifications',
    darkMode: 'Dark Mode',
    language: 'Language',
    accountActions: 'Account Actions',
    logOut: 'Log Out',
    downloadData: 'Download My Data',
    deleteAccount: 'Delete Account & Data',
    deleteConfirmTitle: 'Delete Account?',
    deleteConfirmBody: 'Are you sure you want to delete your profile and account? This action is',
    deleteConfirmBodyBold: 'permanent',
    deleteConfirmBodyEnd: 'and will remove all associated user profile data.',
    cancel: 'Cancel',
    confirmDelete: 'Confirm Delete',
    fullName: 'Full Name',
    phoneNumber: 'Phone Number',
    physicalAddress: 'Physical Address',
    emailLocked: 'Email Account (Locked)',
    saveParameters: 'Save Parameters',
    yourMomScore: 'Your MomScore',
  },
  de: {
    hi: 'Hallo',
    goodMorning: 'Guten Morgen',
    goodAfternoon: 'Guten Tag',
    goodEvening: 'Guten Abend',
    goodNight: 'Gute Nacht',
    welcomeBack: 'Willkommen zurück',
    scanPrompt1: 'Scanne einen VINQR oder gib',
    scanPrompt2: 'ein, um fortzufahren.',
    vinlinkPlaceholder: 'Geschäfte, Produkte oder VINLINK suchen...',
    nearby: 'In der Nähe',
    settings: 'Einstellungen',
    controlPanel: 'Kontrollzentrum',
    personalDetails: 'Persönliche Daten',
    personalDetailsDesc: 'Identität, Standorte und Kontaktdaten verwalten',
    usefulFeatures: 'Nützliche Funktionen',
    recentBusinesses: 'Zuletzt besucht',
    favoriteStores: 'Favoriten',
    noFavorites: 'Noch keine Favoriten — tippe auf das Herz bei einem zuletzt besuchten Geschäft.',
    notifications: 'Benachrichtigungen',
    darkMode: 'Dunkelmodus',
    language: 'Sprache',
    accountActions: 'Kontoaktionen',
    logOut: 'Abmelden',
    downloadData: 'Meine Daten herunterladen',
    deleteAccount: 'Konto & Daten löschen',
    deleteConfirmTitle: 'Konto löschen?',
    deleteConfirmBody: 'Möchtest du dein Profil und Konto wirklich löschen? Diese Aktion ist',
    deleteConfirmBodyBold: 'endgültig',
    deleteConfirmBodyEnd: 'und entfernt alle zugehörigen Profildaten.',
    cancel: 'Abbrechen',
    confirmDelete: 'Löschen bestätigen',
    fullName: 'Vollständiger Name',
    phoneNumber: 'Telefonnummer',
    physicalAddress: 'Adresse',
    emailLocked: 'E-Mail-Konto (gesperrt)',
    saveParameters: 'Speichern',
    yourMomScore: 'Dein MomScore',
  },
  fr: {
    hi: 'Salut',
    goodMorning: 'Bonjour',
    goodAfternoon: 'Bon après-midi',
    goodEvening: 'Bonsoir',
    goodNight: 'Bonne nuit',
    welcomeBack: 'Content de te revoir',
    scanPrompt1: 'Scanne un VINQR ou saisis',
    scanPrompt2: 'pour continuer.',
    vinlinkPlaceholder: 'Rechercher des commerces, produits ou un VINLINK...',
    nearby: 'À proximité',
    settings: 'Paramètres',
    controlPanel: 'Panneau de contrôle',
    personalDetails: 'Informations personnelles',
    personalDetailsDesc: 'Gérer identité, adresses, coordonnées',
    usefulFeatures: 'Fonctions utiles',
    recentBusinesses: 'Commerces récents',
    favoriteStores: 'Favoris',
    noFavorites: "Pas encore de favoris — touche le cœur d'un commerce récent pour l'enregistrer ici.",
    notifications: 'Notifications',
    darkMode: 'Mode sombre',
    language: 'Langue',
    accountActions: 'Actions du compte',
    logOut: 'Se déconnecter',
    downloadData: 'Télécharger mes données',
    deleteAccount: 'Supprimer le compte et les données',
    deleteConfirmTitle: 'Supprimer le compte ?',
    deleteConfirmBody: 'Voulez-vous vraiment supprimer votre profil et compte ? Cette action est',
    deleteConfirmBodyBold: 'définitive',
    deleteConfirmBodyEnd: 'et supprimera toutes les données de profil associées.',
    cancel: 'Annuler',
    confirmDelete: 'Confirmer la suppression',
    fullName: 'Nom complet',
    phoneNumber: 'Numéro de téléphone',
    physicalAddress: 'Adresse',
    emailLocked: 'Compte e-mail (verrouillé)',
    saveParameters: 'Enregistrer',
    yourMomScore: 'Votre MomScore',
  },
  es: {
    hi: 'Hola',
    goodMorning: 'Buenos días',
    goodAfternoon: 'Buenas tardes',
    goodEvening: 'Buenas noches',
    goodNight: 'Buenas noches',
    welcomeBack: 'Bienvenido de nuevo',
    scanPrompt1: 'Escanea un VINQR o ingresa',
    scanPrompt2: 'para continuar.',
    vinlinkPlaceholder: 'Buscar negocios, productos o VINLINK...',
    nearby: 'Cerca de ti',
    settings: 'Ajustes',
    controlPanel: 'Panel de control',
    personalDetails: 'Datos personales',
    personalDetailsDesc: 'Gestiona identidad, ubicaciones y contacto',
    usefulFeatures: 'Funciones útiles',
    recentBusinesses: 'Negocios recientes',
    favoriteStores: 'Tiendas favoritas',
    noFavorites: 'Aún no tienes favoritos — toca el corazón en un negocio reciente para guardarlo aquí.',
    notifications: 'Notificaciones',
    darkMode: 'Modo oscuro',
    language: 'Idioma',
    accountActions: 'Acciones de la cuenta',
    logOut: 'Cerrar sesión',
    downloadData: 'Descargar mis datos',
    deleteAccount: 'Eliminar cuenta y datos',
    deleteConfirmTitle: '¿Eliminar cuenta?',
    deleteConfirmBody: '¿Seguro que quieres eliminar tu perfil y cuenta? Esta acción es',
    deleteConfirmBodyBold: 'permanente',
    deleteConfirmBodyEnd: 'y eliminará todos los datos de perfil asociados.',
    cancel: 'Cancelar',
    confirmDelete: 'Confirmar eliminación',
    fullName: 'Nombre completo',
    phoneNumber: 'Número de teléfono',
    physicalAddress: 'Dirección',
    emailLocked: 'Cuenta de correo (bloqueada)',
    saveParameters: 'Guardar',
    yourMomScore: 'Tu MomScore',
  },
  it: {
    hi: 'Ciao',
    goodMorning: 'Buongiorno',
    goodAfternoon: 'Buon pomeriggio',
    goodEvening: 'Buonasera',
    goodNight: 'Buonanotte',
    welcomeBack: 'Bentornato',
    scanPrompt1: 'Scansiona un VINQR o inserisci',
    scanPrompt2: 'per continuare.',
    vinlinkPlaceholder: 'Cerca attività, prodotti o VINLINK...',
    nearby: 'Nelle vicinanze',
    settings: 'Impostazioni',
    controlPanel: 'Pannello di controllo',
    personalDetails: 'Dati personali',
    personalDetailsDesc: 'Gestisci identità, indirizzi e contatti',
    usefulFeatures: 'Funzioni utili',
    recentBusinesses: 'Attività recenti',
    favoriteStores: 'Negozi preferiti',
    noFavorites: 'Nessun preferito ancora — tocca il cuore su un\'attività recente per salvarla qui.',
    notifications: 'Notifiche',
    darkMode: 'Modalità scura',
    language: 'Lingua',
    accountActions: 'Azioni account',
    logOut: 'Esci',
    downloadData: 'Scarica i miei dati',
    deleteAccount: 'Elimina account e dati',
    deleteConfirmTitle: 'Eliminare l\'account?',
    deleteConfirmBody: 'Sei sicuro di voler eliminare il tuo profilo e account? Questa azione è',
    deleteConfirmBodyBold: 'permanente',
    deleteConfirmBodyEnd: 'e rimuoverà tutti i dati di profilo associati.',
    cancel: 'Annulla',
    confirmDelete: 'Conferma eliminazione',
    fullName: 'Nome completo',
    phoneNumber: 'Numero di telefono',
    physicalAddress: 'Indirizzo',
    emailLocked: 'Account email (bloccato)',
    saveParameters: 'Salva',
    yourMomScore: 'Il tuo MomScore',
  },
};

interface FavoriteItem {
  id: string;
  businessUid: string;
  storeName: string;
  logoUrl?: string;
  address?: string;
}

export const Front: React.FC = () => {
  const user = auth.currentUser;
  
  // Layout Router View Layer Configurations
  const [activeTab, setActiveTab] = useState<'home' | 'wallet'>('home');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [activeStoreUid, setActiveStoreUid] = useState<string | null>(null);

  // 🤖 LINK-RESOLUTION RETRY POPUP — shown instead of silently falling
  // through to the fallback link (the old "blank/landing screen" bug).
  // Tracks consecutive failures so the copy can escalate from "try again"
  // to "this link might actually be broken" after a few in a row.
  const [linkFailPopup, setLinkFailPopup] = useState<'retry' | 'broken' | null>(null);
  // Shown instead of (not in addition to) the usual error toast when a
  // service payment attempt fails specifically because the business hasn't
  // finished Stripe onboarding yet — the backend's own wording for that
  // case is "This merchant is not ready to accept payments yet."
  const [merchantNotReadyPopup, setMerchantNotReadyPopup] = useState(false);
  const consecutiveFailsRef = useRef(0);
  
  // State tracking whether historical list has rendering records
  const [hasRecentItems, setHasRecentItems] = useState(false);

  // App & Settings states
  const [vinQuery, setVinQuery] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPersonalDetailsModalOpen, setIsPersonalDetailsModalOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [fullName, setFullName] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [showFullProfilePic, setShowFullProfilePic] = useState(false);
  const avatarPressTimer = useRef<any>(null);
  const avatarLongPressFired = useRef(false);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);

 
  const [isSaveHovered, setIsSaveHovered] = useState(false);

  // Settings: notifications, language, favorites
  // `prefsLoaded` guards toggles until the real saved values arrive from Firestore,
  // so a fast tap can't race a write before we know the current state.
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  // `language` drives the local t() dictionary below (instant for the 5
  // curated languages); it's widened to `string` because the picker now
  // offers every language, not just those 5. `globalLanguage`/`setGlobalLanguage`
  // is the shared LanguageContext — selecting ANY language also calls it so
  // the live-translator picks up the rest of this screen (and the rest of
  // the app) too, not just the strings that go through t().
  const [language, setLanguage] = useState<string>('en');
  const { setLanguage: setGlobalLanguage } = useLanguage();
  // Looks up a screen string in the current language, falling back to
  // English if a key is ever missing from a translation (should never
  // happen since TRANSLATIONS is fully populated for all 5 curated
  // languages), or if `language` is one of the many non-curated languages
  // now selectable — those render the English string here, which the
  // global live-translator (see LanguageContext.tsx) then picks up and
  // translates at the DOM level, same as everywhere else in the app.
  const t = (key: string): string =>
    TRANSLATIONS[language as LanguageCode]?.[key] ?? TRANSLATIONS.en[key] ?? key;
  // Time-based greeting for the new header layout — computed fresh on
  // every render, so it naturally flips from "Good morning" to "Good
  // afternoon" etc. as the day goes on without needing its own timer.
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 5) return t('goodNight');
    if (hour < 12) return t('goodMorning');
    if (hour < 18) return t('goodAfternoon');
    return t('goodEvening');
  })();
  const [isFavoritesExpanded, setIsFavoritesExpanded] = useState(false);
  const [isVinBackCreateOpen, setIsVinBackCreateOpen] = useState(false);
  const [isVinBackListOpen, setIsVinBackListOpen] = useState(false);
  const [isLanguageExpanded, setIsLanguageExpanded] = useState(false);
  const [favoriteStores, setFavoriteStores] = useState<FavoriteItem[]>([]);
  const [isFavoritesLoading, setIsFavoritesLoading] = useState(true);

  // First-visit "try sharing this" nudge — set briefly after a NEW recent
  // business is saved (see handleBusinessVisit), cleared once dismissed,
  // shared, or after its own timeout.
  const [shareNudge, setShareNudge] = useState<{ uid: string; storeName: string } | null>(null);
  const [nudgeMomentOpen, setNudgeMomentOpen] = useState(false);
  const [momScore, setMomScore] = useState(0);



  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  // 🔴 RECEIPTS RED DOT — mirrors the notification bell's own unread dot
  // (see components/customer/Notification.tsx). Set true the moment a
  // genuinely new receipt shows up (same branch that already fires
  // pushNotification/postLocalAlert for it, below), cleared the moment the
  // drawer is actually opened. Backed by localStorage (not just React
  // state) so it survives a reload between "a new receipt arrived" and
  // "the customer got around to checking" — same pattern as the bell's own
  // notif_muted_ cache.
  const [hasNewReceipt, setHasNewReceipt] = useState(false);
  const markReceiptsSeen = () => {
    setHasNewReceipt(false);
    try {
      if (user?.uid) localStorage.setItem(`malvinai_has_unopened_receipt_${user.uid}`, 'false');
    } catch {
      /* soft failure — worst case the dot lingers until next new receipt clears it anyway */
    }
  };

  // Sync the red dot's initial state from localStorage as soon as we know
  // who the user is (a plain render-time read of auth.currentUser above
  // won't itself trigger this — the uid dependency is what does).
  useEffect(() => {
    if (!user?.uid) return;
    try {
      const cached = localStorage.getItem(`malvinai_has_unopened_receipt_${user.uid}`);
      setHasNewReceipt(cached === 'true');
    } catch {
      /* storage unavailable — dot just starts off, worst case */
    }
  }, [user?.uid]);

  // One-shot handoff from a store page opened standalone (no StoreFront
  // iframe wrapper around it — see serviceStore.tsx's handleGoToReceipts).
  // That flow can't reach this component's state directly, so it drops a
  // flag and lands on '/'; this picks it up once on mount and opens the
  // drawer itself, same idea as AppOpenGate.tsx's pending-deep-link resume.
  useEffect(() => {
    try {
      if (sessionStorage.getItem('malvinai_open_receipts_on_load') === '1') {
        sessionStorage.removeItem('malvinai_open_receipts_on_load');
        setIsDrawerOpen(true);
        markReceiptsSeen();
      }
    } catch {
      /* storage unavailable — the flag just never gets picked up, no crash */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Belt-and-suspenders: whichever of the several places in this file opens
  // the drawer (main nav icon, Radar's Receipts tab, the standalone
  // sessionStorage handoff above), the dot clears the moment isDrawerOpen
  // actually flips true — so a future new "open receipts" call site can't
  // forget to also clear it.
  useEffect(() => {
    if (isDrawerOpen) markReceiptsSeen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDrawerOpen]);

  const [isRadarOpen, setIsRadarOpen] = useState(false);
  // 🤖 AI QUICK-MENU — the half-circle category picker fanning out from the
  // AI face in the top-left corner. radarCategoryFilter carries the pick
  // through to VinScanner's initialCategoryFilter.
  // Opens automatically every time Front.tsx mounts (i.e. every time the
  // customer lands on this screen — App.jsx unmounts/remounts Front when
  // flowStep changes away and back, so this naturally re-fires each visit,
  // not just the very first one) rather than waiting for a tap.
  const [isAiMenuOpen, setIsAiMenuOpen] = useState(true);
  const [radarCategoryFilter, setRadarCategoryFilter] = useState<'all' | 'restaurant' | 'salon' | 'mechanic' | 'service' | 'services'>('all');
  // Inline-styled to sidestep the global `.icon-button { all: unset }` rule
  const [isSearchHovered, setIsSearchHovered] = useState(false);
  const [isScannerHovered, setIsScannerHovered] = useState(false);

  // Active booking receipts state
  const [activeReceipts, setActiveReceipts] = useState<any[]>([]);
  const [receiptQrs, setReceiptQrs] = useState<Record<string, string>>({});
  // Drives the live countdown on unpaid hotel holds, and the moment one
  // drops out of the list.
  const [nowTick, setNowTick] = useState(() => Date.now());

  // Data Download and Account Deletion state
  const [isDownloading, setIsDownloading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast State
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  // Auto-dismiss the share nudge if it's just ignored — but not while the
  // person has actually opened VinMoment from it.
  useEffect(() => {
    if (!shareNudge || nudgeMomentOpen) return;
    const id = setTimeout(() => setShareNudge(null), 7000);
    return () => clearTimeout(id);
  }, [shareNudge, nudgeMomentOpen]);


  // Export and Download Data Functionality
  const handleDownloadData = async () => {
    if (!user?.uid) return;
    setIsDownloading(true);
    try {
      const customerDocSnap = await getDoc(doc(db, 'customers', user.uid));
      const customerData = customerDocSnap.exists() ? customerDocSnap.data() : {};

      const exportPayload = {
        account: {
          uid: user.uid,
          email: user.email,
          fullName,
          phone,
          address,
          ...customerData
        },
        activeReceipts,
        exportedAt: new Date().toISOString()
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `user-data-${user.uid}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      showToast('success', 'Data exported successfully!');
    } catch (err) {
      console.error(err);
      showToast('error', 'Failed to compile data export package.');
    } finally {
      setIsDownloading(false);
    }
  };

  // Account & Profile Data Erasure Functionality
  const handleDeleteAccountAndData = async () => {
    if (!user?.uid) return;
    setIsDeleting(true);
    try {
      // 1. Delete customer document entry in Firestore
      await deleteDoc(doc(db, 'customers', user.uid));

      // 2. Delete Firebase Authentication User
      await deleteUser(user);

      showToast('success', 'Account and personal data permanently erased.');
    } catch (err: any) {
      console.error(err);
      if (err?.code === 'auth/requires-recent-login') {
        showToast('error', 'Re-authentication required. Please log out and back in to proceed with account deletion.');
      } else {
        showToast('error', 'Failed to erase user profile data completely.');
      }
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  const handleBusinessVisit = async (inputUidOrUrl: string) => {
    if (!user?.uid) return;

    const rawInput = inputUidOrUrl.trim();
    if (!rawInput) return;

    // A /category/:uid link carries its category in the path — that hint is
    // what lets the same uid run entirely separate businesses per category
    // (malvinai.com/food/<uid> vs malvinai.com/salon/<uid>) without one
    // resolution silently shadowing the other.
    const { uid: cleanUid, categoryHint } = extractCategoryAndUid(rawInput);

    // 🗨️ CHAT LINKS — a business's /chat/:brandId link (from a dashboard's
    // "share chat" button) points at Realtime Database data (users/{uid}/
    // brandData), not any of the four storefront collections resolveBusiness
    // checks. Running it through resolveBusiness always came back "not
    // found" — the link would just silently fail to open. Detected purely
    // by path shape, independent of domain, so it works the same on
    // malvinai.com and on a local dev server.
    const isChatLink = /\/chat\//i.test(rawInput);

    // An external link (a VinMoment shared from somewhere else, say) is
    // passed through untouched — StoreFront vets the origin itself.
    // Everything else gets looked up rather than guessed at.
    //
    // The old code defaulted a bare uid to `/salon/<uid>`, so opening a
    // restaurant or hotel by uid loaded SalonStore against a document that
    // doesn't exist — the blank/landing screen. Worse, that wrong URL was
    // then saved as the history entry's businessUid, so every later tap on
    // that row reopened the same dead link. Resolving here fixes the visit
    // AND repairs the stored row, since what gets written below is the
    // resolved link, not the raw input.
    const isExternalUrl = /^https?:\/\//i.test(rawInput) && !rawInput.includes('malvinai.com');

    let storefrontTarget = rawInput;
    let business: Awaited<ReturnType<typeof resolveBusiness>> | null = null;
    // Chat links resolve their display info from Realtime Database instead
    // of one of the four Firestore storefront collections — populated below
    // only when isChatLink is true, and merged into the recentBusinesses
    // write the same way `business` is for storefront visits, so a chat
    // brand shows its real name/logo in history instead of "Saved Store".
    let chatBrandInfo: { storeName: string; logoUrl: string; bio: string } | null = null;

    if (!isExternalUrl && !isChatLink) {
      business = await resolveBusiness(cleanUid, categoryHint);
      storefrontTarget = business.link;
    }

    if (isChatLink) {
      try {
        const brandSnap = await rtdbGet(rtdbRef(rtdb, `users/${cleanUid}/brandData`));
        if (brandSnap.exists()) {
          const data = brandSnap.val() || {};
          chatBrandInfo = {
            storeName: data.brandName || data.name || 'Chat',
            logoUrl: data.logo || data.logoUrl || '',
            bio: data.bio || data.tagline || '',
          };
        }
      } catch (err) {
        console.error('Failed to load chat brand info for history:', err);
      }
    }

    // Don't open the storefront (or write a history row) for something that
    // resolved to nothing — a typo, an unpublished business, or a link that
    // failed to match any collection. Opening it anyway is what produces the
    // "blank/landing screen": a /food/<uid> link built from the fallback
    // kind, pointing at a document that doesn't exist.
    if (business && !business.found) {
      consecutiveFailsRef.current += 1;
      setLinkFailPopup(consecutiveFailsRef.current >= 3 ? 'broken' : 'retry');
      return;
    }

    // Success — clear the streak so a later failure starts counting fresh.
    consecutiveFailsRef.current = 0;
    setActiveStoreUid(storefrontTarget);

    try {
        // Keyed by category+uid, not uid alone. The same uid can run
        // completely separate businesses per category (a /food/<uid>
        // account and a /salon/<uid> account are two different storefronts),
        // so each one needs its own row in Recent Businesses rather than
        // overwriting whichever was visited last.
        const recentKey = business ? `${business.kind}_${cleanUid}` : cleanUid;
        const recentDocRef = doc(db, 'customers', user.uid, 'recentBusinesses', recentKey);
        const docSnap = await getDoc(recentDocRef);
        const isFirstVisit = !docSnap.exists();

        const storeName = business?.storeName || chatBrandInfo?.storeName || docSnap.data()?.storeName || 'Saved Store';
        // The label shown in history: the user's own nickname wins, then the
        // business's real name. Previously every row was stamped with the
        // literal 'Saved Store' as its customName, which meant every store
        // the customer opened showed up as an identical, unidentifiable row.
        const displayName = docSnap.data()?.customName || storeName;

        // 🟢 Save cleanly without blocking prompt modals
        await setDoc(recentDocRef, {
        // The bare uid, matching what this field is named. The resolved
        // deep link is kept separately so opening the row doesn't have to
        // re-derive the store type.
        businessUid: cleanUid,
        businessKind: business?.kind || null,
        vinLink: storefrontTarget,
        storeName,
        logoUrl: business?.logoUrl || chatBrandInfo?.logoUrl || '',
        bio: business?.bio || chatBrandInfo?.bio || '',
        address: business?.address || '',
        lastVisited: new Date().toISOString(),
        }, { merge: true });

        pushNotification(
          user.uid,
          'store_visited',
          'Store visited',
          `You visited ${displayName}.`
        );

        // First time seeing this business — nudge them toward VinMoment a
        // couple seconds later, once the "Opening..." toast has cleared.
        if (isFirstVisit) {
          setTimeout(() => {
            setShareNudge({ uid: cleanUid, storeName: displayName });
          }, 2200);
        }

    } catch (err) {
        console.error("Failed to log business visit history item:", err);
    }
  };

  // Profile data synchronization
  useEffect(() => {
    if (!user?.uid) return;
    const fetchUserProfile = async () => {
      try {
        const docRef = doc(db, 'customers', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setFullName(data.fullName || '');
          setPhone(data.phone || '');
          setAddress(data.address || '');

          // Preferences ride along on this same read — one round trip instead of three.
          setIsDarkMode(Boolean(data.darkMode));
          // Default ON: only an explicit `false` in Firestore turns this off.
          // A brand-new account (field not written yet) should start with
          // notifications enabled, not silently disabled.
          setNotificationsEnabled(data.notificationsEnabled === false ? false : true);
          // Defensive fallback: if a stored language value isn't one we recognize
          // (tampered, stale, or from a future app version), default to English
          // rather than trusting it blindly. Validated against the FULL
          // language list now, not just the 5 curated ones, since the picker
          // offers all of them.
          const storedLanguage = ALL_LANGUAGES.some(l => l.code === data.language) ? data.language : 'en';
          setLanguage(storedLanguage);
          if (storedLanguage !== 'en') setGlobalLanguage(storedLanguage);
        }

        // Fetched separately from its own document (customers/{uid}/profile/photo)
        // — see handlePhotoUpload for why it's kept out of the main doc.
        try {
          const photoSnap = await getDoc(doc(db, 'customers', user.uid, 'profile', 'photo'));
          if (photoSnap.exists()) {
            setProfilePicture(photoSnap.data().profilePicture || '');
          }
        } catch (photoErr) {
          console.error('Error reading profile picture:', photoErr);
        }
      } catch (err) {
        console.error('Error reading profile ledger data node:', err);
      } finally {
        setPrefsLoaded(true);
      }
    };
    fetchUserProfile();
  }, [user]);

  // New-device detection — a lightweight heuristic, not a security feature.
  // Each browser gets a random ID stashed in localStorage. If this ID isn't
  // already registered under customers/{uid}/devices AND at least one other
  // device is already registered, this must be a browser/device the account
  // hasn't been used from before, so we let the customer know. On someone's
  // very first-ever sign-in there's nothing to compare against yet, so no
  // notification fires — it just registers as device #1 silently.
  useEffect(() => {
    if (!user?.uid) return;
    (async () => {
      try {
        const storageKey = `malvin_device_id_${user.uid}`;
        let deviceId = localStorage.getItem(storageKey);
        if (!deviceId) {
          deviceId = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
          localStorage.setItem(storageKey, deviceId);
        }

        const devicesRef = collection(db, 'customers', user.uid, 'devices');
        const existingSnap = await getDocs(devicesRef);
        const alreadyKnownHere = existingSnap.docs.some((d) => d.id === deviceId);
        const hasOtherDevices = existingSnap.docs.some((d) => d.id !== deviceId);

        if (!alreadyKnownHere && hasOtherDevices) {
          pushNotification(
            user.uid,
            'new_device',
            'New sign-in detected',
            'Your account was just used on a device we haven\'t seen before.'
          );
        }

        await setDoc(
          doc(db, 'customers', user.uid, 'devices', deviceId),
          { lastSeen: new Date().toISOString(), userAgent: navigator.userAgent },
          { merge: true }
        );
      } catch (err) {
        console.error('Device check failed:', err);
      }
    })();
  }, [user]);

  // Applies the persisted Dark Mode preference to the whole customer hub.
  // Scoped via the `.malvin-hub` CSS class (see index.css) so this can never
  // affect any other part of the app that happens to share the page.
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDarkMode);
    // Reset to light on unmount so navigating away (e.g. to a business dashboard
    // in the same session) never leaves a stray `dark` class behind.
    return () => { document.documentElement.classList.remove('dark'); };
  }, [isDarkMode]);

  // Live favorites list — a customer can only ever favorite a business they've
  // actually visited (added via the heart icon on Recent Businesses), so this
  // can't be used to inject arbitrary entries.
  useEffect(() => {
    if (!user?.uid) return;
    const favRef = collection(db, 'customers', user.uid, 'favorites');
    const q = query(favRef, orderBy('favoritedAt', 'desc'), limit(50));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setFavoriteStores(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as FavoriteItem)));
      setIsFavoritesLoading(false);
    }, (err) => {
      console.error('Error syncing favorite stores:', err);
      setIsFavoritesLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // Live MomScore — subscribed (not just fetched once) so sharing a
  // VinMoment updates the badge here immediately, without needing a reload.
  useEffect(() => {
    if (!user?.uid) return;
    const ref = doc(db, 'customers', user.uid);
    const unsubscribe = onSnapshot(ref, (snap) => {
      if (snap.exists()) setMomScore(typeof snap.data().momScore === 'number' ? snap.data().momScore : 0);
    }, (err) => console.error('Error syncing MomScore:', err));
    return () => unsubscribe();
  }, [user]);

  // Generic, safe preference writer — merges one field at a time onto the
  // customer's own doc. Paired with Firestore rules that only allow the
  // signed-in owner to write to their own `customers/{uid}` doc, and that
  // type-check each of these fields server-side.
  const updateCustomerPref = async (patch: Record<string, unknown>) => {
    if (!user?.uid) throw new Error('Not signed in');
    await setDoc(doc(db, 'customers', user.uid), patch, { merge: true });
  };

  const handleToggleDarkMode = async () => {
    const next = !isDarkMode;
    setIsDarkMode(next); // optimistic — flips instantly via the effect above
    try {
      await updateCustomerPref({ darkMode: next });
      pushNotification(
        user?.uid,
        'dark_mode',
        next ? 'Dark Mode on' : 'Dark Mode off',
        next ? 'Switched to Dark Mode.' : 'Switched back to Light Mode.'
      );
    } catch (err) {
      console.error(err);
      setIsDarkMode(!next); // roll back on failure
      showToast('error', 'Could not save that preference. Please try again.');
    }
  };

  const handleToggleNotifications = async () => {
    const next = !notificationsEnabled;

    // Turning ON: actually ask the browser for permission rather than just
    // flipping a switch that silently does nothing.
    if (next && typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          showToast('error', 'Notifications are blocked in your browser settings.');
          return;
        }
      } catch (err) {
        console.error('Notification permission request failed:', err);
      }
    }

    setNotificationsEnabled(next);
    try {
      await updateCustomerPref({ notificationsEnabled: next });
      showToast('success', next ? 'Notifications turned on.' : 'Notifications turned off.');
    } catch (err) {
      console.error(err);
      setNotificationsEnabled(!next);
      showToast('error', 'Could not save that preference. Please try again.');
    }
  };

  const handleSelectLanguage = async (code: string) => {
    const previous = language;
    setLanguage(code); // optimistic
    setGlobalLanguage(code); // drives the live, whole-app DOM translation
    setIsLanguageExpanded(false);
    try {
      await updateCustomerPref({ language: code });
    } catch (err) {
      console.error(err);
      setLanguage(previous);
      setGlobalLanguage(previous);
      showToast('error', 'Could not save that preference. Please try again.');
    }
  };

  const handleRemoveFavorite = async (id: string) => {
    if (!user?.uid) return;
    try {
      await deleteDoc(doc(db, 'customers', user.uid, 'favorites', id));
    } catch (err) {
      console.error(err);
      showToast('error', 'Could not remove that favorite.');
    }
  };

  const handleOpenFavorite = (businessUid: string) => {
    setIsSettingsOpen(false);
    handleBusinessVisit(businessUid);
  };

  // Sync user active receipts / booking tickets in real-time
  // 🟢 SYNC SALON, FOOD & HOTEL RECEIPTS IN REAL-TIME
  useEffect(() => {
    if (!user?.uid) return;
    console.log("Listening to receipts for customer:", user.uid);

    // 1. Listen to Salon Appointments Subcollection
    const salonAppointmentsRef = collection(db, 'salonAppointments', user.uid, 'appointments');
    const unsubscribeSalon = onSnapshot(salonAppointmentsRef, async (snapshot) => {
      const salonList = snapshot.docs.map(doc => ({
        id: doc.id,
        receiptType: 'salon',
        ...doc.data()
      })).filter((app: any) => app.status === 'paid' || app.paymentStatus === true);

      updateUnifiedReceipts(salonList, 'salon');
    });

    // 2. Listen to Food Orders Collection
    // Querying the main 'orders' collection where customerUid matches current user
    const ordersCollectionRef = collection(db, 'orders');
    const foodQuery = query(ordersCollectionRef, where('customerUid', '==', user.uid));
    const unsubscribeFood = onSnapshot(foodQuery, async (snapshot) => {
      const foodList = snapshot.docs.map(doc => ({
        id: doc.id,
        receiptType: 'food',
        ...doc.data()
      })).filter((ord: any) => ord.paymentStatus === 'paid' || ord.status !== 'finished'); // show active orders

      updateUnifiedReceipts(foodList, 'food');
    });

    // 3. Listen to Hotel Reservations Subcollection
    // The doc is written client-side at hold time (status "held",
    // paymentStatus false) and then UPDATED by the Stripe webhook on
    // success — see malvinbackend/src/index.ts.
    //
    // Both states belong in the drawer: a paid reservation is a permanent
    // pass, and an unpaid hold is a temporary one the guest needs in front
    // of them while the clock runs. The time-based cutoff for holds is NOT
    // applied here — it's applied at render (see visibleReceipts), because
    // a hold expiring is the passage of time rather than a document change,
    // and no snapshot fires to tell us about it.
    const hotelReservationsRef = collection(db, 'customers', user.uid, 'hotelReservations');
    const unsubscribeHotel = onSnapshot(hotelReservationsRef, async (snapshot) => {
      const hotelList = snapshot.docs.map(doc => ({
        id: doc.id,
        receiptType: 'hotel',
        ...doc.data()
      })).filter((res: any) => {
        if (res.status === 'cancelled' || res.status === 'expired') return false;
        return res.paymentStatus === true || res.status === 'confirmed' || res.status === 'held';
      });

      updateUnifiedReceipts(hotelList, 'hotel');
    });

    // 4. Listen to Mechanic Appointments Subcollection
    // Mechanics take no payment — the garage accepting the repair request is
    // what issues the receipt, and acceptance is what writes this document
    // (see utils/mechanicAppointments.ts). So unlike the other three there's
    // no payment flag to test: existence here already means "accepted".
    const mechanicAppointmentsRef = collection(db, 'customers', user.uid, 'mechanicAppointments');
    const unsubscribeMechanic = onSnapshot(mechanicAppointmentsRef, async (snapshot) => {
      const mechanicList = snapshot.docs.map(doc => ({
        id: doc.id,
        receiptType: 'mechanic',
        ...doc.data()
      })).filter((appt: any) => appt.status !== 'cancelled' && appt.status !== 'declined');

      updateUnifiedReceipts(mechanicList, 'mechanic');
    });

    // 5. Listen to Service Receipts Subcollection
    // Written by the business at quote time (see utils/serviceRequests.ts),
    // same "acceptance/quoting is what issues the receipt" shape as
    // mechanic. Completed/cancelled/expired are deliberately excluded here
    // — they still exist (nothing is hard-deleted, see serviceRequests.ts),
    // they just belong in a History view, not the active drawer.
    const serviceReceiptsRef = collection(db, 'customers', user.uid, 'serviceReceipts');
    const unsubscribeService = onSnapshot(serviceReceiptsRef, async (snapshot) => {
      const serviceList = snapshot.docs.map(doc => ({
        id: doc.id,
        receiptType: 'service',
        ...doc.data()
      })).filter((r: any) => !['cancelled', 'completed', 'expired'].includes(r.status));

      updateUnifiedReceipts(serviceList, 'service');
    });

    // Unified state compiler
    const rawReceiptsRef = { salon: [] as any[], food: [] as any[], hotel: [] as any[], mechanic: [] as any[], service: [] as any[] };
    // Tracks which receipt ids we've already surfaced, so the *first*
    // snapshot (every pre-existing active receipt) doesn't fire a wall of
    // notifications — only receipts that show up *after* that count as new.
    const initialized = { salon: false, food: false, hotel: false, mechanic: false, service: false };
    let allInitialized = false;
    const seenReceiptIds = new Set<string>();

    const newReceiptMessage = (item: any): string => {
      if (item.receiptType === 'food') return 'You have a new food order receipt.';
      if (item.receiptType === 'salon') return 'You have a new salon booking receipt.';
      if (item.receiptType === 'mechanic') {
        return `${item.businessName || 'The garage'} accepted your repair booking — your pass is in Receipts.`;
      }
      if (item.receiptType === 'service') {
        return `${item.businessName || 'The business'} sent you a quote for €${Number(item.quote?.total || 0).toFixed(2)} — check your Receipts.`;
      }
      if (item.receiptType === 'hotel') {
        // A hold and a paid stay are both receipts, but only one of them is
        // finished business — don't tell someone their room is confirmed
        // when the clock is still running on an unpaid hold.
        return item.status === 'held'
          ? 'Your room is on hold — pay before the timer ends to confirm it.'
          : 'Your hotel reservation is confirmed — the pass is in your receipts.';
      }
      return 'You have a new receipt.';
    };

    const updateUnifiedReceipts = async (newList: any[], type: 'salon' | 'food' | 'hotel' | 'mechanic' | 'service') => {
      rawReceiptsRef[type] = newList;
      initialized[type] = true;
      const combined = [
        ...rawReceiptsRef.salon,
        ...rawReceiptsRef.food,
        ...rawReceiptsRef.hotel,
        ...rawReceiptsRef.mechanic,
        ...rawReceiptsRef.service,
      ];

      if (initialized.salon && initialized.food && initialized.hotel && initialized.mechanic && initialized.service) {
        if (!allInitialized) {
          combined.forEach((c) => seenReceiptIds.add(c.id));
          allInitialized = true;
        } else {
          combined
            .filter((c) => !seenReceiptIds.has(c.id))
            .forEach((item) => {
              seenReceiptIds.add(item.id);
              const message = newReceiptMessage(item);
              pushNotification(user.uid, 'new_receipt', 'New receipt', message);

              // Red dot on the Receipts drawer icon — cleared the moment
              // the customer actually opens the drawer (markReceiptsSeen).
              setHasNewReceipt(true);
              try {
                localStorage.setItem(`malvinai_has_unopened_receipt_${user.uid}`, 'true');
              } catch {
                /* soft failure — dot just won't survive a reload this time */
              }

              // A mechanic acceptance or a service quote is the one receipt
              // the customer isn't already expecting a fixed answer for —
              // they submitted a request and then waited, so it gets a
              // device-level alert on top of the in-app bell. (Local
              // notification: only reaches a device with the app running —
              // see postLocalAlert.)
              if (item.receiptType === 'mechanic' || item.receiptType === 'service') {
                postLocalAlert(item.receiptType === 'service' ? 'Quote received' : 'Repair booking accepted', message);
              }
            });
        }
      }

      setActiveReceipts(combined);

      // Generate local QR codes for salon, food and hotel tickets
      const qrMap: Record<string, string> = {};
      for (const item of combined) {
        const refId = item.referenceId || item.ticketId || item.fourDigitCode || item.id;
        if (refId) {
          try {
            qrMap[item.id] = await QRCode.toDataURL(
              JSON.stringify({
                // Hotels key off reservationId — that's the doc id the desk
                // scanner and the Stripe webhook both address the record by.
                ticketId: item.reservationId || item.id,
                referenceId: refId,
                businessUid: item.businessId || item.targetBusinessUid || item.restaurantUid || "",
                receiptType: item.receiptType
              })
            );
          } catch (err) {
            console.error("Failed to generate unified ticket QR:", err);
          }
        }
      }
      setReceiptQrs(prevQrs => ({ ...prevQrs, ...qrMap }));
    };

    return () => {
      unsubscribeSalon();
      unsubscribeFood();
      unsubscribeHotel();
      unsubscribeMechanic();
      unsubscribeService();
    };
  }, [user]);

  // An unpaid hold is only valid until holdExpiresAt. Nothing pushes an
  // update at that instant — the hotel's sweep marks the document "expired"
  // only while a manager has the dashboard open — so the guest's copy has to
  // age out on its own clock. Ticking is gated on there actually being a
  // live hold, so the common case (no holds) costs no re-renders.
  const hasLiveHold = activeReceipts.some(
    (r) => r.receiptType === 'hotel' && r.status === 'held' && typeof r.holdExpiresAt === 'number'
  );

  useEffect(() => {
    if (!hasLiveHold) return;
    const interval = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [hasLiveHold]);

  // What the drawer actually shows. A hold past its expiry disappears
  // completely — not greyed out, not "expired", just gone, matching what
  // the room's availability has already done on the hotel's side.
  const visibleReceipts = useMemo(
    () =>
      activeReceipts.filter((r) => {
        if (r.receiptType !== 'hotel' || r.status !== 'held') return true;
        return typeof r.holdExpiresAt === 'number' && r.holdExpiresAt > nowTick;
      }),
    [activeReceipts, nowTick]
  );

  // Resizes/compresses the picked image client-side before it ever touches
  // Firestore — an uncompressed phone photo can be several MB, well past
  // what's sane to store inline on a document. Downscaling to a small
  // square avatar keeps this well under Firestore's 1MB doc limit.
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.uid) return;
    setIsUploadingPhoto(true);

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const resized = await new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const size = 240; // small, fixed avatar size — plenty for a circular profile pic
          const canvas = document.createElement('canvas');
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext('2d');
          if (!ctx) { reject(new Error('Canvas not supported')); return; }

          // Center-crop to a square before scaling down, so the avatar
          // isn't stretched/distorted for non-square source photos.
          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);

          resolve(canvas.toDataURL('image/jpeg', 0.82));
        };
        img.onerror = reject;
        img.src = dataUrl;
      });

      // Written to its OWN document — customers/{uid}/profile/photo —
      // rather than merged into the main customers/{uid} doc. That doc
      // gets written constantly (dark mode, notifications, language,
      // MomScore) and also has a live onSnapshot listener on it; Firestore
      // bills a write by the FULL document's size in 1KB steps regardless
      // of which field changed, so a 20-60KB image sitting in there was
      // making every unrelated toggle cost 20-60x what it should, and
      // re-downloading the photo on every snapshot update. Isolating it
      // keeps the main doc small and cheap again.
      await setDoc(doc(db, 'customers', user.uid, 'profile', 'photo'), { profilePicture: resized }, { merge: true });
      setProfilePicture(resized);
      showToast('success', 'Profile picture updated.');
    } catch (err) {
      console.error('Photo upload failed:', err);
      showToast('error', 'Could not update your profile picture.');
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = ''; // allow re-selecting the same file later
    }
  };

  // Distinguishes a short tap (open Settings) from a long press (show the
  // profile picture full-size).
  //
  // 🐛 FIX: this used to decide "open settings" inside onPointerUp — but
  // real phones frequently fire onPointerCancel or onPointerLeave INSTEAD
  // of onPointerUp for a perfectly normal tap, any time the browser has
  // even slight ambiguity about whether the touch might be a scroll
  // gesture. Since the old handleAvatarPressCancel only cleared the timer
  // and never opened Settings, a tap that got routed through
  // cancel/leave (very common on real devices, rare on desktop mouse
  // testing) silently did nothing — exactly the reported bug.
  //
  // Fix: onClick is what reliably fires after every genuine tap on every
  // platform, so "open Settings" now lives there. The pointer handlers
  // below only manage the long-press timer; onClick just checks whether
  // that timer already fired a long press, and if so, treats this click
  // as already "consumed" instead of opening Settings too.
  const AVATAR_LONG_PRESS_MS = 450;
  const handleAvatarPressStart = () => {
    avatarLongPressFired.current = false;
    avatarPressTimer.current = setTimeout(() => {
      avatarLongPressFired.current = true;
      if (profilePicture) setShowFullProfilePic(true);
    }, AVATAR_LONG_PRESS_MS);
  };
  const handleAvatarPressEnd = () => {
    clearTimeout(avatarPressTimer.current);
  };
  const handleAvatarClick = () => {
    if (avatarLongPressFired.current) {
      avatarLongPressFired.current = false; // already handled by the long press
      return;
    }
    setIsSettingsOpen(true);
  };

  // 🤖 AI QUICK-MENU — the 5 category buttons in the half-circle fan.
  // "Home services" and "Shopping" don't have a dedicated Firestore
  // collection the way food/salon/mechanic do, so both currently fall back
  // to the radar's general "services" bucket rather than a real filtered
  // category — worth a dedicated collection later if those categories grow.
  // 🤖 AI QUICK-MENU — the 5 category buttons in the half-circle fan.
  // "Home services" now maps to the real Services vertical ('service'),
  // which prompts the customer for a specific trade before showing results
  // (see VinScanner's sub-picker). "Shopping" still has no backing
  // collection at all, so it still falls into the radar's generic leftover
  // "Other" bucket rather than a real filtered category.
  const AI_QUICK_CATEGORIES: Array<{
    key: 'restaurant' | 'salon' | 'mechanic' | 'service' | 'services';
    emoji: string;
    label: string;
  }> = [
    { key: 'restaurant', emoji: '🍕', label: 'Food' },
    { key: 'mechanic', emoji: '🛠', label: 'Repairs' },
    { key: 'salon', emoji: '💇', label: 'Beauty' },
    { key: 'service', emoji: '🧹', label: 'Home services' },
    { key: 'services', emoji: '🛒', label: 'Shopping' },
  ];

  const handleAiCategoryPick = (key: 'restaurant' | 'salon' | 'mechanic' | 'service' | 'services') => {
    setIsAiMenuOpen(false);
    setRadarCategoryFilter(key);
    setIsRadarOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'customers', user.uid), {
        fullName, phone, address, email: user.email,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      pushNotification(
        user.uid,
        'profile_updated',
        'Profile updated',
        fullName ? `Your profile details were saved, ${fullName}.` : 'Your profile details were saved.'
      );
      showToast('success', 'Profile assets safely committed to internal storage.');
      setIsPersonalDetailsModalOpen(false); 
    } catch (err) {
      showToast('error', 'Failed to push configuration properties to database index.');
    } finally {
      setIsSaving(false);
    }
  };

  // 🚨 Passed to StoreFront as a STABLE reference (useCallback, empty deps —
  // it only touches setState functions and a ref, neither of which change
  // identity between renders). Keeping this stable is what lets StoreFront
  // trust it in a dependency array without its own effects restarting on
  // every unrelated re-render of Front.tsx (receipts/notifications/etc).
  const handleStoreLoadFailure = useCallback(() => {
    setActiveStoreUid(null);
    consecutiveFailsRef.current += 1;
    setLinkFailPopup(consecutiveFailsRef.current >= 3 ? 'broken' : 'retry');
  }, []);

  // --- Service request actions (Receipts Drawer) ---
  // These dual-write both copies of the request (business's job-board
  // record and the customer's own receipt) via syncServiceRequestStatus,
  // rather than a Cloud Function — the same trust model the initial
  // request write already relies on (a customer writing directly into a
  // business's subcollection, same as mechanics/{uid}/repair_requests).

  const handleServiceNegotiate = async (receipt: any, amount: number) => {
    if (!user?.uid || !receipt.businessId || !receipt.requestId) return;
    try {
      await syncServiceRequestStatus(receipt.businessId, user.uid, receipt.requestId, {
        negotiationOffer: { amount, status: 'pending' },
      });
    } catch (err) {
      console.error('Failed to send negotiation offer:', err);
      showToast('error', 'Could not send your offer. Please try again.');
    }
  };

  const handleServiceCancel = async (receipt: any) => {
    if (!user?.uid || !receipt.businessId || !receipt.requestId) return;
    if (!window.confirm('Cancel this service request?')) return;
    try {
      // cancelledBy distinguishes this from the business declining its own
      // request (handleDeclineRequest in serviceDashboard.tsx, which also
      // lands on status 'cancelled') — the dashboard uses this flag to
      // decide whether to alert the manager that the CUSTOMER walked away.
      await syncServiceRequestStatus(receipt.businessId, user.uid, receipt.requestId, {
        status: 'cancelled',
        cancelledBy: 'customer',
      });
      // Let the business know right away — this writes into the manager's
      // own notifications feed and, on their device, fires a local push via
      // serviceDashboard.tsx's live listener.
      await pushNotification(
        receipt.businessId,
        'service_cancelled',
        'Service request cancelled',
        `A customer cancelled their ${receipt.businessName ? `request with ${receipt.businessName}` : 'service request'}${receipt.referenceId ? ` (Ref: ${receipt.referenceId})` : ''}.`
      );
    } catch (err) {
      console.error('Failed to cancel service request:', err);
      showToast('error', 'Could not cancel this request. Please try again.');
    }
  };

  const handleServiceAcceptPay = async (receipt: any) => {
    if (!user?.uid || !receipt.businessId || !receipt.quote?.total) return;
    try {
      const createSession = httpsCallable(functions, 'createDirectPaymentSession');
      const result: any = await createSession({
        amount: receipt.quote.total,
        targetBusinessUid: receipt.businessId,
        merchantType: 'service',
        appointmentDetails: { requestId: receipt.requestId },
      });
      if (result?.data?.url) {
        window.location.href = result.data.url;
      } else {
        showToast('error', 'Could not start checkout. Please try again.');
      }
    } catch (err: any) {
      console.error('Failed to start service payment:', err);
      // The backend throws this exact 'failed-precondition' when the
      // business hasn't finished Stripe onboarding — surface it as its own
      // popup rather than folding it into the generic error toast, since
      // "try again" isn't useful advice for a merchant-side problem.
      const isMerchantNotReady =
        err?.code === 'functions/failed-precondition' ||
        err?.code === 'failed-precondition' ||
        /not ready to accept payments/i.test(err?.message || '');
      if (isMerchantNotReady) {
        setMerchantNotReadyPopup(true);
      } else {
        showToast('error', err?.message || 'Could not start checkout. Please try again.');
      }
    }
  };

  // Handles manual link submissions identically to the QR Camera scan pipeline
  const handleQueryLaunch = () => {
    const cleanQuery = vinQuery.trim();
    if (!cleanQuery) return;

    showToast('success', `Opening linked context page...`);
    handleBusinessVisit(cleanQuery); // 🟢 Changed from setActiveStoreUid
    setVinQuery('');
  };

  const handleLogout = async () => {
    try { await signOut(auth); } catch (err) {
      showToast('error', 'An operational fault interrupted the checkout pipeline.');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-sans">
        <Loader2 className="w-6 h-6 text-[#E53935] animate-spin" />
      </div>
    );
  }

  // 🟢 SWAP ENTIRE LAYOUT IF BUSINESS IS SCANNED / VISITED
  if (activeStoreUid) {
    return (
      <StoreFront
        businessUid={activeStoreUid}
        userUid={user.uid}
        userWalletBalance={0}
        onExecutePayment={async () => {}}
        onExit={() => setActiveStoreUid(null)}
        onOpenReceipts={() => { setIsDrawerOpen(true); markReceiptsSeen(); }}
        onLoadFailure={handleStoreLoadFailure}
      />
    );
  }

  return (
    <div className="malvin-hub min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50 font-sans relative flex flex-col justify-between px-6 pb-28 transition-colors duration-300">
      
      {/* TOAST NOTIFICATION CONTAINER */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 left-6 right-6 z-50 mx-auto max-w-sm p-4 rounded-2xl border flex items-center gap-3 backdrop-blur-xl shadow-2xl ${
              toast.type === 'success' ? 'bg-emerald-50/90 border-emerald-500/20 text-emerald-900' : 'bg-rose-50/90 border-rose-500/20 text-rose-900'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />}
            <span className="text-xs font-semibold tracking-wide leading-tight">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🤖 LINK-RESOLUTION FAILURE POPUP — replaces the old silent
          fallback that used to quietly open a broken /food/<uid> link (the
          "blank/landing screen" bug). Shows a worried little AI face; after
          3 misses in a row the copy admits the link/QR itself might be bad. */}
      <AnimatePresence>
        {linkFailPopup && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setLinkFailPopup(null)}
              className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-[60]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[61] w-[85vw] max-w-xs bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-100 dark:border-neutral-800 px-6 py-7 flex flex-col items-center text-center"
            >
              {/* Little worried AI face — bobs gently, eyes dart side to
                  side, eyebrows angled in, mouth a small wavy "uh-oh" line. */}
              <motion.svg
                width="72" height="72" viewBox="0 0 100 100"
                animate={{ y: [0, -5, 0], rotate: [-2, 2, -2] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                className="mb-4"
              >
                <circle cx="50" cy="50" r="42" fill={isDarkMode ? '#262626' : '#F5F5F5'} stroke="#E53935" strokeWidth="3" />
                {/* worried eyebrows */}
                <line x1="28" y1="38" x2="42" y2="43" stroke="#E53935" strokeWidth="3" strokeLinecap="round" />
                <line x1="72" y1="38" x2="58" y2="43" stroke="#E53935" strokeWidth="3" strokeLinecap="round" />
                {/* eyes, darting */}
                <motion.circle
                  cy="52" r="4.5" fill="#E53935"
                  initial={{ cx: 38 }}
                  animate={{ cx: [38, 41, 35, 38] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.circle
                  cy="52" r="4.5" fill="#E53935"
                  initial={{ cx: 62 }}
                  animate={{ cx: [62, 65, 59, 62] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                />
                {/* small wavy worried mouth */}
                <path d="M40 68 Q45 63 50 68 Q55 73 60 68" stroke="#E53935" strokeWidth="3" strokeLinecap="round" fill="none" />
              </motion.svg>

              <h4 className="text-sm font-black text-neutral-900 dark:text-neutral-50 mb-1.5">
                {linkFailPopup === 'broken' ? "Hmm, I think something's wrong" : 'Oops, can you retry that?'}
              </h4>
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 leading-snug mb-5">
                {linkFailPopup === 'broken'
                  ? "That link or QR code hasn't worked a few times in a row now — it might genuinely be broken or point at a business that isn't set up yet."
                  : "That VinLink didn't match a business. Might've just been a hiccup — give it another go."}
              </p>
              <button
                onClick={() => setLinkFailPopup(null)}
                className="w-full py-2.5 rounded-xl bg-[#E53935] text-white text-xs font-black active:scale-[0.98] transition-transform"
              >
                {linkFailPopup === 'broken' ? 'Got it' : 'Okay, I\'ll retry'}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MERCHANT NOT READY FOR PAYMENT — shown when Secure Payment fails
          because the business hasn't finished Stripe onboarding yet. */}
      <AnimatePresence>
        {merchantNotReadyPopup && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setMerchantNotReadyPopup(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-[60]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 10 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[61] w-[85vw] max-w-xs bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-100 dark:border-neutral-800 px-6 py-7 flex flex-col items-center text-center"
            >
              <div className="w-14 h-14 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center mb-4">
                <AlertCircle className="w-7 h-7 text-amber-500" />
              </div>
              <h4 className="text-sm font-black text-neutral-900 dark:text-neutral-50 mb-1.5">
                This merchant isn't ready to receive payment
              </h4>
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 leading-snug mb-5">
                They haven't finished setting up payments on their account yet. Try again a bit later, or reach out to them directly to ask when they'll be ready.
              </p>
              <button
                onClick={() => setMerchantNotReadyPopup(false)}
                className="w-full py-2.5 rounded-xl bg-[#E53935] text-white text-xs font-black active:scale-[0.98] transition-transform"
              >
                Got it
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* SHARE NUDGE — appears once, a couple seconds after a business is
          visited for the first time, inviting them to make a VinMoment. */}
      <AnimatePresence>
        {shareNudge && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 22, stiffness: 260 }}
            className="fixed top-6 left-6 right-6 z-50 mx-auto max-w-sm p-4 rounded-2xl bg-[#0a0d16]/95 border border-white/10 backdrop-blur-xl shadow-2xl flex items-center gap-3"
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-400/25 to-violet-500/25 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-cyan-300" />
            </div>
            <p className="flex-1 text-[11px] font-semibold text-slate-200 leading-snug">
              Hey! Try sharing <span className="text-white font-black">{shareNudge.storeName}</span> and your moment with friends ✨
            </p>
            <button
              onClick={() => {
                setNudgeMomentOpen(true);
                pushNotification(
                  user?.uid,
                  'vinmoment_shared',
                  'VinMoment shared',
                  shareNudge ? `You shared a moment from ${shareNudge.storeName}.` : 'You shared a VinMoment.'
                );
              }}
              className="shrink-0 px-3 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-violet-500 text-slate-950 text-[11px] font-black flex items-center gap-1"
            >
              <Share2 className="w-3 h-3" /> Share
            </button>
            <button
              onClick={() => setShareNudge(null)}
              className="shrink-0 p-1.5 rounded-full bg-white/5 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {nudgeMomentOpen && shareNudge && (
        <VinMoment
          businessUid={shareNudge.uid}
          storeName={shareNudge.storeName}
          onClose={() => { setNudgeMomentOpen(false); setShareNudge(null); }}
        />
      )}

      {/* TOP BAR */}
      {/* TOP BAR */}
      <motion.header 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 pt-6 pb-4 bg-white/90 dark:bg-neutral-950/90 backdrop-blur-xl border-b border-neutral-100/60 dark:border-neutral-800/60"
      >
        {/* LEFT: greeting / name / MomScore. The face used to live inside
            this button, but that meant blurring the menu backdrop also had
            to blur (or exempt) the whole header to keep the face sharp —
            wrong shape. The face is now a fully separate fixed element
            (rendered right after this header, at the very end of this
            component's JSX) that just happens to sit visually in this same
            corner via matching coordinates + left padding here. This div
            purely reserves the space; it doesn't render or handle the
            face at all. */}
        <div className="text-left max-w-[62%]" style={{ paddingLeft: '30px' }}>
          <p className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 leading-none mb-1">
            {greeting}
          </p>
          <h2 className="text-sm font-black text-neutral-900 dark:text-neutral-50 tracking-tight truncate leading-none">
            {fullName || user.email}
          </h2>
          {momScore > 0 ? (
            <button
              onClick={() => setIsSettingsOpen(true)}
              title={t('yourMomScore')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                marginTop: '6px',
                padding: '4px 10px',
                borderRadius: '9999px',
                backgroundColor: isDarkMode ? '#1c1917' : '#FFFFFF',
                border: isDarkMode ? '1px solid rgba(139,92,246,0.35)' : '1px solid rgba(221,214,254,0.7)',
                outline: 'none',
                boxShadow: '0 4px 10px rgba(139,92,246,0.10)',
                cursor: 'pointer',
                appearance: 'none',
              }}
            >
              <span style={{ fontSize: '11px', lineHeight: 1 }}>✦</span>
              <span style={{ fontSize: '11px', fontWeight: 900, color: isDarkMode ? '#a78bfa' : '#7c3aed', lineHeight: 1 }}>
                {momScore}
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  color: isDarkMode ? '#a3a3a3' : '#737373',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  lineHeight: 1,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {getTierForScore(momScore)}
              </span>
            </button>
          ) : (
            <p className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/70 dark:border-neutral-800 text-[9px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest leading-none">
              {t('welcomeBack')}
            </p>
          )}
        </div>

        {/* RIGHT: only notifications + profile avatar now — Radar moved to
            the bottom pill. */}
        <div className="flex items-center gap-2.5 bg-neutral-50/70 dark:bg-neutral-900/70 border border-neutral-200/50 dark:border-neutral-800/60 backdrop-blur-xl px-2.5 py-2 rounded-full shadow-[0_10px_24px_rgba(0,0,0,0.05)]">
          {/* NOTIFICATIONS BELL — red dot shows only while there's something unread */}
          <NotificationBell userId={user.uid} />

          {/* PROFILE AVATAR — short tap opens Settings (same as before);
              long press shows the picture full-size instead. Stays a small
              clipped circle either way. Inline styles ONLY here (no
              className, especially no "icon-button") — that class's
              `all: unset` was wiping out width/height/border-radius/
              overflow, which is exactly why the picture was rendering at
              full size instead of staying a clipped circle. */}
          <motion.button 
            whileTap={{ scale: 0.92 }}
            onPointerDown={handleAvatarPressStart}
            onPointerUp={handleAvatarPressEnd}
            onPointerLeave={handleAvatarPressEnd}
            onPointerCancel={handleAvatarPressEnd}
            onClick={handleAvatarClick}
            title="Tap for Settings · hold to view photo"
            style={{
              width: '36px',
              height: '36px',
              minWidth: '36px',
              minHeight: '36px',
              borderRadius: '9999px',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: isDarkMode ? '#404040' : '#e5e5e5',
              color: isDarkMode ? '#d4d4d4' : '#737373',
              border: isDarkMode ? '1px solid rgba(115,115,115,0.5)' : '1px solid rgba(212,212,212,0.5)',
              padding: 0,
              cursor: 'pointer',
              appearance: 'none',
              outline: 'none',
              userSelect: 'none',
              touchAction: 'manipulation',
            }}
          >
            {profilePicture ? (
              <img
                src={profilePicture}
                alt="Profile"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  pointerEvents: 'none',
                  display: 'block',
                }}
              />
            ) : (
              <User style={{ width: '18px', height: '18px', pointerEvents: 'none' }} />
            )}
          </motion.button>
        </div>
      </motion.header>

      {/* 🤖 AI FACE — deliberately its own element, not part of the header.
          Vertically centered on the username/email row — i.e. between the
          "Good afternoon" greeting line above it and the "Welcome back"
          pill below it — visually aligned via that paddingLeft above but
          structurally separate, at a z-index above the menu's blur
          backdrop/panel. So when the menu opens, the header behind it
          (name, notifications, avatar) blurs normally while the face stays
          crisp and tappable. Static now — no bobbing — only the eyes
          blink. */}
      <button
        onClick={() => setIsAiMenuOpen((open) => !open)}
        title="What do you need today?"
        style={{
          position: 'fixed',
          top: '48px',
          left: '36px',
          transform: 'translate(-50%, -50%)',
          zIndex: 48,
          width: '24px',
          height: '24px',
          padding: 0,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          appearance: 'none',
        }}
      >
        <svg width="24" height="24" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="#3B82F6" />
          <motion.ellipse
            cx="36" cy="46" rx="5" fill="#FFFFFF"
            initial={{ ry: 6 }}
            animate={{ ry: [6, 6, 0.5, 6] }}
            transition={{ duration: 3.4, repeat: Infinity, times: [0, 0.85, 0.9, 1], ease: 'easeInOut' }}
          />
          <motion.ellipse
            cx="64" cy="46" rx="5" fill="#FFFFFF"
            initial={{ ry: 6 }}
            animate={{ ry: [6, 6, 0.5, 6] }}
            transition={{ duration: 3.4, repeat: Infinity, times: [0, 0.85, 0.9, 1], ease: 'easeInOut' }}
          />
          <path d="M35 62 Q50 76 65 62" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" fill="none" />
        </svg>
      </button>

      {/* 🤖 AI QUICK-MENU — half-circle of category buttons fanning out
          from the face in the header's top-left corner. The backdrop blurs
          everything behind it; tapping the backdrop or the face again
          closes it without picking anything. */}
      <AnimatePresence>
        {isAiMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setIsAiMenuOpen(false)}
              className="fixed inset-0 z-[44] backdrop-blur-md bg-black/10 dark:bg-black/30"
            />
            {/* Big soft rounded panel bulging in from the corner — the
                "half circle" backdrop the buttons sit on. Sized to wrap
                around the face while staying clear of it (the header
                renders above this panel — see the z-[46] bump above — so
                the face stays visible through the middle of the bulge). */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', damping: 22, stiffness: 240 }}
              style={{
                position: 'fixed',
                top: '-195px',
                left: '-195px',
                width: '480px',
                height: '480px',
                borderRadius: '9999px',
                transformOrigin: 'top left',
                background: isDarkMode ? 'rgba(23,23,23,0.94)' : 'rgba(255,255,255,0.96)',
                boxShadow: '0 25px 70px rgba(0,0,0,0.28)',
                zIndex: 45,
              }}
            />
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ delay: 0.05 }}
              style={{ position: 'fixed', top: '76px', left: '24px', maxWidth: '190px', zIndex: 46 }}
              className="text-[12px] font-black text-neutral-800 dark:text-neutral-100 leading-snug"
            >
              What do you need today, {(fullName || user.email || 'there').split(/[\s@]/)[0]}?
            </motion.p>

            {AI_QUICK_CATEGORIES.map((cat, i) => {
              // Fans across a ~110° arc below-right of the face (0° = due
              // east, 90° = due south) — reads as a half-circle hugging the
              // corner without any button landing off-screen. Radius is
              // generous relative to the panel so each button gets real
              // breathing room from its neighbors instead of crowding.
              const angleDeg = 8 + i * 24;
              const rad = (angleDeg * Math.PI) / 180;
              const radius = 150;
              const faceX = 36;
              const faceY = 48;
              const x = faceX + radius * Math.cos(rad);
              const y = faceY + radius * Math.sin(rad);
              return (
                <motion.button
                  key={`${cat.key}-${cat.label}`}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ delay: 0.04 * i, type: 'spring', stiffness: 260, damping: 18 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => handleAiCategoryPick(cat.key)}
                  title={cat.label}
                  style={{
                    position: 'fixed',
                    top: `${y}px`,
                    left: `${x}px`,
                    transform: 'translate(-50%, -50%)',
                    zIndex: 47,
                    width: '58px',
                    height: '58px',
                    borderRadius: '9999px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '2px',
                    background: isDarkMode ? '#262626' : '#FFFFFF',
                    border: isDarkMode ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(0,0,0,0.05)',
                    boxShadow: '0 8px 22px rgba(0,0,0,0.18)',
                    cursor: 'pointer',
                    appearance: 'none',
                  }}
                >
                  <span style={{ fontSize: '18px', lineHeight: 1 }}>{cat.emoji}</span>
                  <span
                    style={{
                      fontSize: '7px',
                      fontWeight: 800,
                      color: isDarkMode ? '#a3a3a3' : '#737373',
                      lineHeight: 1,
                      textAlign: 'center',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {cat.label}
                  </span>
                </motion.button>
              );
            })}
          </>
        )}
      </AnimatePresence>

      {/* BODY WORKSPACE CONTAINER */}
      <div className="flex-grow flex flex-col justify-start pt-[150px] w-full">
        {activeTab === 'home' ? (
          <motion.div
            key="home-view"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full flex flex-col items-center"
          >
            <motion.main 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md mx-auto flex flex-col items-center text-center px-4"
            >
              {/* 🟢 HIDES SCAN BANNER ELEMENT IF ITEMS EXIST IN HISTORICAL LAYER */}
              {!hasRecentItems && (
                <h1 className="text-2xl font-black text-neutral-900 dark:text-neutral-50 tracking-tight leading-snug mb-8">
                  {t('scanPrompt1')} <br />
                  <span className="text-[#E53935]">VINLINK</span> {t('scanPrompt2')}
                </h1>
              )}

              <div className="w-full relative shadow-[0_16px_40px_rgba(0,0,0,0.02)] group mb-6">
                <input
                  type="text"
                  placeholder={t('vinlinkPlaceholder')}
                  value={vinQuery}
                  onChange={(e) => setVinQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleQueryLaunch()}
                  className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-[2rem] pl-6 pr-14 py-3 text-sm font-medium text-neutral-900 dark:text-neutral-50 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-[#E53935] focus:bg-white dark:focus:bg-neutral-900 focus:ring-4 focus:ring-[#E53935]/5 transition-all"
                />
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleQueryLaunch}
                  onMouseEnter={() => setIsSearchHovered(true)}
                  onMouseLeave={() => setIsSearchHovered(false)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    marginTop: '-20px',
                    width: '40px',
                    height: '40px',
                    borderRadius: '9999px',
                    border: 'none',
                    outline: 'none',
                    boxShadow: 'none',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    backgroundColor: isSearchHovered ? '#E53935' : (isDarkMode ? '#1a1a1a' : '#E5E5E5'),
                    color: isSearchHovered ? '#FFFFFF' : (isDarkMode ? '#d4d4d4' : '#525252'),
                    transition: 'background-color 0.2s ease, color 0.2s ease',
                  }}
                >
                  <Search className="w-4 h-4" />
                </motion.button>
              </div>

              {/* 🟢 ACTIVE TICKETS / RECEIPTS DROPDOWN ACCORDION */}
              
            </motion.main>

            {/* NEARBY DISCOVERY ROW — gives the home tab a reason to explore,
                not just a waiting room for search/history */}
            <NearbyBusinesses
              onSelectBusiness={(uid) => handleBusinessVisit(uid)}
              label={t('nearby')}
            />

            {/* HISTORICAL COMPONENT RENDERING ROW */}
            <RecentBusinesses 
              onSelectBusiness={(uid) => handleBusinessVisit(uid)} // 🟢 Changed from setActiveStoreUid
              setHasRecentItems={setHasRecentItems}
            />
          </motion.div>
        ) : (
          <motion.div
            key="wallet-view"
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full"
          >
            <Wallet onNavigateToHome={() => setActiveTab('home')} />
          </motion.div>
        )}
      </div>

      {/* NAVIGATION PILL + SCANNER CIRCLE — kept as one centered group */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3">
        {/* PILL CONTAINER — home, wallet, radar, and the menu/receipts dropdown */}
        <div className="bg-neutral-50/50 dark:bg-neutral-900/50 border border-neutral-200/40 dark:border-neutral-800/50 backdrop-blur-xl px-4 py-3 rounded-[2.5rem] flex items-center gap-3 shadow-[0_10px_28px_rgba(0,0,0,0.04)] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 dark:via-white/5 to-transparent pointer-events-none" />
          
          <button
            onClick={() => setActiveTab('home')}
            className={`icon-button p-4 rounded-full transition-all flex items-center justify-center ${
              activeTab === 'home' 
                ? 'bg-white dark:bg-neutral-800 shadow-md text-[#E53935]' 
                : 'text-neutral-400 dark:text-neutral-600 hover:text-neutral-600 dark:hover:text-neutral-300'
            }`}
          >
            <Home className="w-6 h-6" />
          </button>
          
          <button
            onClick={() => setActiveTab('wallet')}
            className={`icon-button p-4 rounded-full transition-all flex items-center justify-center ${
              activeTab === 'wallet' 
                ? 'bg-white dark:bg-neutral-800 shadow-md text-[#E53935]' 
                : 'text-neutral-400 dark:text-neutral-600 hover:text-neutral-600 dark:hover:text-neutral-300'
            }`}
          >
            <WalletIcon className="w-6 h-6" />
          </button>

          {/* RADAR — moved here from the header */}
          <motion.button 
            whileTap={{ scale: 0.92 }}
            onClick={() => setIsRadarOpen(true)}
            className="icon-button relative p-4 rounded-full transition-all flex items-center justify-center text-neutral-400 dark:text-neutral-600 hover:text-[#E53935] dark:hover:text-[#E53935]"
            title="Open MalvinAI Radar"
          >
            <Radio className="w-6 h-6" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          </motion.button>

          {/* DROPDOWN — the receipts/history drawer, moved here from its old
              floating top-left circle so the header could be freed up for
              the greeting block. */}
          <button
            onClick={() => { setIsDrawerOpen(true); markReceiptsSeen(); }}
            className="icon-button relative p-4 rounded-full transition-all flex items-center justify-center text-neutral-400 dark:text-neutral-600 hover:text-neutral-600 dark:hover:text-neutral-300"
            title="Receipts & history"
          >
            <Menu className="w-6 h-6" />
            {hasNewReceipt && (
              <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white dark:border-neutral-900" />
            )}
          </button>
        </div>

        {/* SCANNER — now its own circle just outside the pill, not inside
            it. Inline styles ONLY (no className, especially no
            "icon-button") — same fix as the avatar: that class's
            `all: unset` was wiping out the background/size/shadow entirely,
            which is why it wasn't visible. */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsScannerOpen(true)}
          onMouseEnter={() => setIsScannerHovered(true)}
          onMouseLeave={() => setIsScannerHovered(false)}
          style={{
            width: '56px',
            height: '56px',
            minWidth: '56px',
            minHeight: '56px',
            borderRadius: '9999px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: isScannerHovered ? '#C62828' : '#D64545', // a slightly softer, warmer red than the pure brand red
            color: '#FFFFFF',
            border: 'none',
            outline: 'none',
            appearance: 'none',
            padding: 0,
            cursor: 'pointer',
            flexShrink: 0,
            boxShadow: isScannerHovered
              ? '0 14px 30px rgba(198,40,40,0.45)'
              : '0 10px 26px rgba(214,69,69,0.35)',
            transition: 'background-color 0.2s ease, box-shadow 0.2s ease',
          }}
        >
          <QrCode style={{ width: '24px', height: '24px' }} />
        </motion.button>
      </div>


      {/* SCANNER MODAL WRAPPER LAYER */}
      <AnimatePresence>
        {isScannerOpen && (
          <QRScannerView 
            onClose={() => setIsScannerOpen(false)} 
            onScanSuccess={(businessUid) => {
              setIsScannerOpen(false);
              handleBusinessVisit(businessUid);
            }} 
          />
        )}
      </AnimatePresence>

      {/* SETTINGS DRAWER OVERLAY PANEL */}
      <AnimatePresence>
        {isSettingsOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.2 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsOpen(false)}
              className="fixed inset-0 bg-neutral-400 z-40"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="fixed top-0 right-0 h-full w-full max-w-md bg-neutral-50 dark:bg-neutral-950 shadow-[-10px_0_40px_rgba(0,0,0,0.03)] border-l border-neutral-200/50 dark:border-neutral-800/60 z-50 flex flex-col overflow-y-auto p-6"
            >
              <div className="flex items-center justify-between pb-6 border-b border-neutral-200 dark:border-neutral-800">
                <div>
                  <h3 className="text-xl font-black text-neutral-900 dark:text-neutral-50 tracking-tight">{t('settings')}</h3>
                  <p className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider mt-0.5">{t('controlPanel')}</p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setIsSettingsOpen(false)}
                  className="icon-button p-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full text-neutral-500 dark:text-neutral-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>

              {/* MOMSCORE STAT CARD */}
              {momScore > 0 && (
                <div className="mt-6 bg-gradient-to-br from-cyan-400/10 to-violet-500/10 dark:from-cyan-400/5 dark:to-violet-500/5 border border-violet-300/30 dark:border-violet-500/20 rounded-[1.75rem] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.01)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-wider text-violet-500 dark:text-violet-400 mb-1">{t('yourMomScore')}</p>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-neutral-900 dark:text-neutral-50">{momScore}</span>
                        <span className="text-xs font-black text-violet-600 dark:text-violet-400">{getTierForScore(momScore)}</span>
                      </div>
                    </div>
                    <div className="text-3xl">✦</div>
                  </div>
                  <div className="mt-3">
                    <div className="h-1.5 bg-neutral-200/70 dark:bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-400 to-violet-500 rounded-full transition-all"
                        style={{ width: `${((momScore % MOM_MILESTONE_STEP) / MOM_MILESTONE_STEP) * 100}%` }}
                      />
                    </div>
                    <p className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 mt-1.5">
                      {MOM_MILESTONE_STEP - (momScore % MOM_MILESTONE_STEP)} more VinMoment{MOM_MILESTONE_STEP - (momScore % MOM_MILESTONE_STEP) === 1 ? '' : 's'} to level up
                    </p>
                  </div>
                </div>
              )}

              <div className="mt-6 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-[1.75rem] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.01)]">
                <button 
                  onClick={() => setIsPersonalDetailsModalOpen(true)}
                  className="icon-button w-full flex items-center justify-between text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-500/10 flex items-center justify-center text-[#E53935]">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="icon-buttontext-xs font-black uppercase tracking-wider text-neutral-800 dark:text-neutral-100">{t('personalDetails')}</h4>
                      <p className="text-[10px] text-neutral-400 dark:text-neutral-500 font-medium mt-0.5">{t('personalDetailsDesc')}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-neutral-400 dark:text-neutral-600 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>

              {/* SETTINGS OPTIONS GRID LAYOUT */}
              <div className="mt-4 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-[1.75rem] p-5 shadow-[0_8px_24px_rgba(0,0,0,0.01)]">
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="w-4 h-4 text-[#E53935]" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{t('usefulFeatures')}</h4>
                </div>

                <div className="divide-y divide-neutral-100 dark:divide-neutral-800 text-xs font-bold text-neutral-700 dark:text-neutral-300">
                  <div className="flex items-center justify-between py-3 cursor-pointer hover:text-neutral-900 dark:hover:text-neutral-50">
                    <div className="flex items-center gap-2.5"><Clock className="w-4 h-4 text-neutral-400 dark:text-neutral-500" /><span>{t('recentBusinesses')}</span></div>
                  </div>

                  <div className="my-2 border-t border-neutral-200 dark:border-neutral-800" />

                  {/* VINBACK TAG — generate a lost-and-found QR tag for a personal item */}
                  <button
                    type="button"
                    onClick={() => { setIsSettingsOpen(false); setIsVinBackCreateOpen(true); }}
                    className="icon-button w-full flex items-center justify-between py-3 hover:text-neutral-900 dark:hover:text-neutral-50"
                  >
                    <div className="flex items-center gap-2.5"><QrCode className="w-4 h-4 text-neutral-400 dark:text-neutral-500" /><span>VinBack Tag</span></div>
                    <ChevronRight className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-600" />
                  </button>

                  <div className="my-2 border-t border-neutral-200 dark:border-neutral-800" />

                  {/* ALL TAGS — manage previously generated VinBack tags */}
                  <button
                    type="button"
                    onClick={() => { setIsSettingsOpen(false); setIsVinBackListOpen(true); }}
                    className="icon-button w-full flex items-center justify-between py-3 hover:text-neutral-900 dark:hover:text-neutral-50"
                  >
                    <div className="flex items-center gap-2.5"><Tag className="w-4 h-4 text-neutral-400 dark:text-neutral-500" /><span>All Tags</span></div>
                    <ChevronRight className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-600" />
                  </button>

                  <div className="my-2 border-t border-neutral-200 dark:border-neutral-800" />

                  {/* FAVORITE STORES — expandable, backed by customers/{uid}/favorites */}
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => setIsFavoritesExpanded(v => !v)}
                      className="icon-button w-full flex items-center justify-between py-2 hover:text-neutral-900 dark:hover:text-neutral-50"
                    >
                      <div className="flex items-center gap-2.5">
                        <Heart className="w-4 h-4 text-neutral-400 dark:text-neutral-500" />
                        <span>{t('favoriteStores')}</span>
                        {favoriteStores.length > 0 && (
                          <span className="text-[10px] font-black bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 rounded-full px-1.5 py-0.5">{favoriteStores.length}</span>
                        )}
                      </div>
                      <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 transition-transform ${isFavoritesExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence initial={false}>
                      {isFavoritesExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="pb-3 space-y-2">
                            {isFavoritesLoading ? (
                              <div className="flex justify-center py-3"><Loader2 className="w-4 h-4 text-neutral-300 dark:text-neutral-700 animate-spin" /></div>
                            ) : favoriteStores.length === 0 ? (
                              <p className="text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 normal-case py-2 leading-relaxed">
                                {t('noFavorites')}
                              </p>
                            ) : (
                              favoriteStores.map(fav => (
                                <div key={fav.id} className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-800/60 rounded-xl px-3 py-2.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenFavorite(fav.businessUid)}
                                    className="icon-button flex items-center gap-2.5 flex-1 min-w-0 text-left"
                                  >
                                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-700 flex-shrink-0 flex items-center justify-center">
                                      {fav.logoUrl ? (
                                        <img src={fav.logoUrl} alt={fav.storeName} className="w-full h-full object-cover" />
                                      ) : (
                                        <Store className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" />
                                      )}
                                    </div>
                                    <span className="text-[11px] font-black text-neutral-800 dark:text-neutral-100 truncate normal-case">{fav.storeName}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveFavorite(fav.id)}
                                    className="icon-button p-1.5 text-neutral-400 dark:text-neutral-500 hover:text-[#E53935] shrink-0"
                                    title="Remove favorite"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* NOTIFICATIONS — real permission request + persisted preference, ON by default */}
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-2.5"><Bell className="w-4 h-4 text-neutral-400 dark:text-neutral-500" /><span>{t('notifications')}</span></div>
                    <input
                      type="checkbox" checked={notificationsEnabled} disabled={!prefsLoaded}
                      onChange={handleToggleNotifications}
                      className="w-9 h-5 bg-neutral-200 dark:bg-neutral-700 checked:bg-[#E53935] rounded-full appearance-none transition-colors relative cursor-pointer disabled:opacity-40 disabled:cursor-wait before:content-[''] before:w-4 before:h-4 before:bg-white before:rounded-full before:absolute before:top-0.5 before:left-0.5 checked:before:translate-x-4 before:transition-transform before:shadow-sm"
                    />
                  </div>

                  {/* DARK MODE — persisted + actually re-skins the customer hub */}
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-2.5"><Moon className="w-4 h-4 text-neutral-400 dark:text-neutral-500" /><span>{t('darkMode')}</span></div>
                    <input 
                      type="checkbox" checked={isDarkMode} disabled={!prefsLoaded}
                      onChange={handleToggleDarkMode}
                      className="w-9 h-5 bg-neutral-200 dark:bg-neutral-700 checked:bg-[#E53935] rounded-full appearance-none transition-colors relative cursor-pointer disabled:opacity-40 disabled:cursor-wait before:content-[''] before:w-4 before:h-4 before:bg-white before:rounded-full before:absolute before:top-0.5 before:left-0.5 checked:before:translate-x-4 before:transition-transform before:shadow-sm"
                    />
                  </div>

                  {/* LANGUAGE — fixed allow-list picker, no free text. Every screen
                      string is pulled through t(), so picking a language here
                      immediately changes what's rendered everywhere on this page. */}
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => setIsLanguageExpanded(v => !v)}
                      className="icon-button w-full flex items-center justify-between py-2 hover:text-neutral-900 dark:hover:text-neutral-50"
                    >
                      <div className="flex items-center gap-2.5"><Globe className="w-4 h-4 text-neutral-400 dark:text-neutral-500" /><span>{t('language')}</span></div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-neutral-400 dark:text-neutral-500 font-semibold">{ALL_LANGUAGES.find(l => l.code === language)?.name || 'English'}</span>
                        <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 transition-transform ${isLanguageExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </button>

                    <AnimatePresence initial={false}>
                      {isLanguageExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="pb-3 space-y-1 max-h-64 overflow-y-auto">
                            {ALL_LANGUAGES.map(l => (
                              <button
                                key={l.code}
                                type="button"
                                onClick={() => handleSelectLanguage(l.code)}
                                className={`icon-button w-full flex items-center justify-between rounded-xl px-3 py-2 normal-case transition-colors ${
                                  l.code === language ? 'bg-[#E53935]/10 text-[#E53935]' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                                }`}
                              >
                                <span className="font-bold">{l.name}</span>
                                {l.code === language && <CheckCircle2 className="w-3.5 h-3.5" />}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* LOGOUT & DATA MANAGEMENT OPTIONS */}
              {/* ACCOUNT & DATA ACTIONS */}
              <div className="mt-4 mb-6 bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-[1.75rem] p-4 shadow-[0_8px_24px_rgba(0,0,0,0.01)]">
                <div className="flex items-center justify-between mb-3 px-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                    {t('accountActions')}
                  </span>
                </div>

                <div className="space-y-2">
                  {/* LOGOUT BUTTON */}
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleLogout}
                    className="icon-button w-full bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-100 rounded-2xl py-3 px-4 font-bold transition-all flex items-center justify-between text-xs group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-neutral-200/60 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 group-hover:bg-neutral-900 group-hover:text-white transition-colors">
                        <LogOut className="w-3.5 h-3.5" />
                      </div>
                      <span>{t('logOut')}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 group-hover:translate-x-0.5 transition-transform" />
                  </motion.button>

                  {/* DOWNLOAD DATA BUTTON */}
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleDownloadData}
                    disabled={isDownloading}
                    className="icon-button w-full bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-100 rounded-2xl py-3 px-4 font-bold transition-all flex items-center justify-between text-xs group disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 group-hover:bg-sky-600 group-hover:text-white transition-colors">
                        {isDownloading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                      </div>
                      <span>{t('downloadData')}</span>
                    </div>
                  </motion.button>

                  {/* DELETE ACCOUNT BUTTON */}
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setIsDeleteModalOpen(true)}
                    className="icon-button w-full bg-rose-50/50 dark:bg-rose-500/5 border border-rose-100 dark:border-rose-500/20 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl py-3 px-4 font-bold transition-all flex items-center justify-between text-xs group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-rose-100/80 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </div>
                      <span>{t('deleteAccount')}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-rose-400 group-hover:translate-x-0.5 transition-transform" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* DETAIL MODAL METRICS PROFILE FORM LAYER */}
      {/* CONFIRMATION MODAL FOR DELETING ACCOUNT & DATA */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteModalOpen(false)}
              className="fixed inset-0 bg-neutral-900 backdrop-blur-sm z-[80]"
            />
            <div className="fixed inset-0 flex items-center justify-center z-[90] p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="w-full max-w-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-[2rem] p-6 shadow-2xl flex flex-col pointer-events-auto"
              >
                <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400 mb-3">
                  <div className="p-2.5 bg-rose-50 dark:bg-rose-500/10 rounded-full">
                    <Trash2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-black text-neutral-900 dark:text-neutral-50 tracking-tight">{t('deleteConfirmTitle')}</h3>
                </div>

                <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 leading-relaxed mb-6">
                  {t('deleteConfirmBody')} <strong className="text-neutral-900 dark:text-neutral-100">{t('deleteConfirmBodyBold')}</strong> {t('deleteConfirmBodyEnd')}
                </p>

                <div className="flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 font-bold text-xs text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
                  >
                    {t('cancel')}
                  </button>

                  <button
                    type="button"
                    onClick={handleDeleteAccountAndData}
                    disabled={isDeleting}
                    className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 font-bold text-xs text-white transition-colors flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 disabled:opacity-50"
                  >
                    {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    <span>{t('confirmDelete')}</span>
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {isPersonalDetailsModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPersonalDetailsModalOpen(false)}
              className="fixed inset-0 bg-neutral-400 backdrop-blur-sm z-[60]"
            />
            <div className="fixed inset-0 flex items-center justify-center z-[70] p-4 pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: 'spring', damping: 24, stiffness: 240 }}
                className="w-full max-w-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-[2rem] p-6 shadow-2xl flex flex-col pointer-events-auto"
              >
                <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800 mb-5">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-[#E53935]" />
                    <h3 className="text-sm font-black text-neutral-900 dark:text-neutral-50 tracking-tight uppercase">{t('personalDetails')}</h3>
                  </div>
                  <button 
                    onClick={() => setIsPersonalDetailsModalOpen(false)}
                    className="icon-button p-1.5 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full border border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                  {/* PROFILE PICTURE — what shows in the header avatar */}
                  <div className="flex flex-col items-center pb-2">
                    <label className="relative cursor-pointer group">
                      <div className="w-20 h-20 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-700 border border-neutral-300/50 dark:border-neutral-600/50 flex items-center justify-center">
                        {profilePicture ? (
                          <img src={profilePicture} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-8 h-8 text-neutral-500 dark:text-neutral-300" />
                        )}
                        {isUploadingPhoto && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full">
                            <Loader2 className="w-5 h-5 text-white animate-spin" />
                          </div>
                        )}
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#E53935] border-2 border-white dark:border-neutral-900 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Save className="w-3 h-3 text-white" />
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        disabled={isUploadingPhoto}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[9px] font-semibold text-neutral-400 dark:text-neutral-500 mt-2 normal-case">
                      Tap to change your profile picture
                    </p>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black uppercase text-neutral-400 dark:text-neutral-500 mb-1.5 ml-1">{t('fullName')}</label>
                    <input 
                      type="text" placeholder="John Doe" value={fullName} 
                      onChange={e => setFullName(e.target.value)}
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3.5 py-3 text-neutral-900 dark:text-neutral-50 placeholder-neutral-400 dark:placeholder-neutral-500 font-medium focus:outline-none focus:border-[#E53935] focus:bg-white dark:focus:bg-neutral-800 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-neutral-400 dark:text-neutral-500 mb-1.5 ml-1">{t('phoneNumber')}</label>
                    <input 
                      type="tel" placeholder="+1 (555) 000-0000" value={phone} 
                      onChange={e => setPhone(e.target.value)}
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3.5 py-3 text-neutral-900 dark:text-neutral-50 placeholder-neutral-400 dark:placeholder-neutral-500 font-medium focus:outline-none focus:border-[#E53935] focus:bg-white dark:focus:bg-neutral-800 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-neutral-400 dark:text-neutral-500 mb-1.5 ml-1">{t('physicalAddress')}</label>
                    <input 
                      type="text" placeholder="123 Main St, City" value={address} 
                      onChange={e => setAddress(e.target.value)}
                      className="w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3.5 py-3 text-neutral-900 dark:text-neutral-50 placeholder-neutral-400 dark:placeholder-neutral-500 font-medium focus:outline-none focus:border-[#E53935] focus:bg-white dark:focus:bg-neutral-800 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase text-neutral-400 dark:text-neutral-500 mb-1.5 ml-1">{t('emailLocked')}</label>
                    <div className="relative opacity-70">
                      <div className="absolute right-4 top-1/2 -translate-y-1/2"><Mail className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" /></div>
                      <input 
                        type="email" disabled value={user.email || ''} 
                        className="w-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3.5 py-3 text-neutral-500 dark:text-neutral-400 font-medium cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={isSaving}
                    onMouseEnter={() => setIsSaveHovered(true)}
                    onMouseLeave={() => setIsSaveHovered(false)}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      marginTop: '8px',
                      padding: '14px',
                      borderRadius: '12px',
                      border: 'none',
                      outline: 'none',
                      appearance: 'none',
                      cursor: isSaving ? 'default' : 'pointer',
                      fontWeight: 700,
                      fontSize: '12px',
                      color: isDarkMode ? '#171717' : '#FFFFFF',
                      backgroundColor: isDarkMode
                        ? (isSaveHovered ? '#FFFFFF' : '#f5f5f5')
                        : (isSaveHovered ? '#0a0a0a' : '#171717'),
                      boxShadow: '0 10px 25px rgba(23,23,23,0.15)',
                      opacity: isSaving ? 0.7 : 1,
                      transition: 'background-color 0.2s ease, opacity 0.2s ease',
                    }}
                  >
                    {isSaving ? (
                      <Loader2 style={{ width: '16px', height: '16px' }} className="animate-spin" />
                    ) : (
                      <Save style={{ width: '16px', height: '16px' }} />
                    )}
                    <span>{t('saveParameters')}</span>
                  </motion.button>
                </form>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
      <ReceiptsDrawer 
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        activeReceipts={visibleReceipts}
        receiptQrs={receiptQrs}
        onServiceAcceptPay={handleServiceAcceptPay}
        onServiceNegotiate={handleServiceNegotiate}
        onServiceCancel={handleServiceCancel}
      />

      {/* RADAR SCANNER MODAL OVERLAY */}
      <AnimatePresence>
        {isRadarOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex flex-col"
          >
            {/* Embedded VinScanner Component — it now renders its own
                close/refresh buttons and bottom tab bar, so no external
                close overlay is needed here anymore. Favorites/Receipts
                tabs hand off to the screens that already exist for those,
                rather than duplicating them inside the radar. */}
            <VinScanner
              onClose={() => setIsRadarOpen(false)}
              initialCategoryFilter={radarCategoryFilter}
              onOpenFavorites={() => {
                setIsRadarOpen(false);
                setIsSettingsOpen(true);
                setIsFavoritesExpanded(true);
              }}
              onOpenReceipts={() => {
                setIsRadarOpen(false);
                setIsDrawerOpen(true);
                markReceiptsSeen();
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* PROFILE PICTURE FULL-VIEW — long-press on the avatar only. Tap
          anywhere to dismiss. */}
      <AnimatePresence>
        {showFullProfilePic && profilePicture && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowFullProfilePic(false)}
            className="fixed inset-0 z-[95] bg-black/90 backdrop-blur-sm flex items-center justify-center p-8"
          >
            <motion.img
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ type: 'spring', damping: 22, stiffness: 260 }}
              src={profilePicture}
              alt="Profile"
              className="max-w-full max-h-full rounded-[2rem] object-contain shadow-2xl"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {isVinBackCreateOpen && (
        <VinBackTagCreate onClose={() => setIsVinBackCreateOpen(false)} />
      )}
      {isVinBackListOpen && (
        <VinBackTagList onClose={() => setIsVinBackListOpen(false)} />
      )}
    </div>
  );
};