import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Menu, Settings, Search, Home, Wallet as WalletIcon, QrCode, X, 
  User, Save, Mail, Loader2, CheckCircle2, AlertCircle,
  Clock, Heart, Bell, Moon, Globe, LogOut, ChevronRight, ChevronDown, Calendar, DollarSign,  Download, Trash2, Store, Sparkles, Share2 
} from 'lucide-react';
import { doc, getDoc, getDocs, setDoc, deleteDoc, collection, collectionGroup, query, where, orderBy, limit, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { signOut, deleteUser } from 'firebase/auth';
import { firestore as db } from '../../firebase'; 
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
import { VinMoment, getTierForScore, MOM_MILESTONE_STEP } from './Vinmoment';
import { ReceiptsDrawer } from './ReceiptsDrawer';

// Fixed allow-list — the language row can only ever pick one of these,
// which is what keeps the stored value safe even before Firestore rules see it.
type LanguageCode = 'en' | 'de' | 'fr' | 'es' | 'it';
const LANGUAGES: { code: LanguageCode; label: string }[] = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'it', label: 'Italiano' },
];

// Translated strings for everything visible on this screen. Every screen
// text that isn't user-generated data (names, store names, etc.) should
// pull from here via t(key) rather than being hardcoded in JSX, so picking
// a language in Settings actually changes what's on screen.
const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  en: {
    hi: 'Hi',
    welcomeBack: 'Welcome back',
    scanPrompt1: 'Scan a VINQR or input',
    scanPrompt2: 'to continue.',
    vinlinkPlaceholder: 'Enter VINLINK...',
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
    welcomeBack: 'Willkommen zurück',
    scanPrompt1: 'Scanne einen VINQR oder gib',
    scanPrompt2: 'ein, um fortzufahren.',
    vinlinkPlaceholder: 'VINLINK eingeben...',
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
    welcomeBack: 'Content de te revoir',
    scanPrompt1: 'Scanne un VINQR ou saisis',
    scanPrompt2: 'pour continuer.',
    vinlinkPlaceholder: 'Entrer VINLINK...',
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
    welcomeBack: 'Bienvenido de nuevo',
    scanPrompt1: 'Escanea un VINQR o ingresa',
    scanPrompt2: 'para continuar.',
    vinlinkPlaceholder: 'Ingresar VINLINK...',
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
    welcomeBack: 'Bentornato',
    scanPrompt1: 'Scansiona un VINQR o inserisci',
    scanPrompt2: 'per continuare.',
    vinlinkPlaceholder: 'Inserisci VINLINK...',
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
  
  // State tracking whether historical list has rendering records
  const [hasRecentItems, setHasRecentItems] = useState(false);

  // App & Settings states
  const [vinQuery, setVinQuery] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPersonalDetailsModalOpen, setIsPersonalDetailsModalOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Settings: notifications, language, favorites
  // `prefsLoaded` guards toggles until the real saved values arrive from Firestore,
  // so a fast tap can't race a write before we know the current state.
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [language, setLanguage] = useState<LanguageCode>('en');
  // Looks up a screen string in the current language, falling back to
  // English if a key is ever missing from a translation (should never
  // happen since TRANSLATIONS is fully populated for all 5 languages, but
  // this keeps a typo from ever showing "undefined" on screen).
  const t = (key: string): string =>
    TRANSLATIONS[language]?.[key] ?? TRANSLATIONS.en[key] ?? key;
  const [isFavoritesExpanded, setIsFavoritesExpanded] = useState(false);
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
  const [isRadarOpen, setIsRadarOpen] = useState(false);
  // Inline-styled to sidestep the global `.icon-button { all: unset }` rule
  const [isSearchHovered, setIsSearchHovered] = useState(false);

  // Active booking receipts state
  const [activeReceipts, setActiveReceipts] = useState<any[]>([]);
  const [receiptQrs, setReceiptQrs] = useState<Record<string, string>>({});

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
    let cleanUid = rawInput;

    if (cleanUid.includes('/')) {
        const segments = cleanUid.split('/');
        cleanUid = segments.filter(Boolean).pop() || cleanUid;
    }

    const storefrontTarget = rawInput.includes('http') 
        ? rawInput 
        : `https://malvinai.com/salon/${rawInput}`;

    setActiveStoreUid(storefrontTarget);

    try {
        const recentDocRef = doc(db, 'customers', user.uid, 'recentBusinesses', cleanUid);
        const docSnap = await getDoc(recentDocRef);
        const isFirstVisit = !docSnap.exists();
        const resolvedName = isFirstVisit ? 'Saved Store' : (docSnap.data().customName || 'Saved Store');

        // 🟢 Save cleanly without blocking prompt modals
        await setDoc(recentDocRef, {
        businessUid: storefrontTarget,
        lastVisited: new Date().toISOString(),
        // Keep existing customName if it's already there, otherwise default to 'Saved Store'
        customName: resolvedName
        }, { merge: true });

        pushNotification(
          user.uid,
          'store_visited',
          'Store visited',
          `You visited ${resolvedName}.`
        );

        // First time seeing this business — nudge them toward VinMoment a
        // couple seconds later, once the "Opening..." toast has cleared.
        if (isFirstVisit) {
          setTimeout(() => {
            setShareNudge({ uid: storefrontTarget, storeName: resolvedName });
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
          // rather than trusting it blindly.
          const storedLanguage = LANGUAGES.some(l => l.code === data.language) ? data.language : 'en';
          setLanguage(storedLanguage);
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

  const handleSelectLanguage = async (code: LanguageCode) => {
    const previous = language;
    setLanguage(code); // optimistic
    setIsLanguageExpanded(false);
    try {
      await updateCustomerPref({ language: code });
    } catch (err) {
      console.error(err);
      setLanguage(previous);
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
  // 🟢 SYNC BOTH SALON & FOOD RECEIPTS IN REAL-TIME
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

    // Unified state compiler
    const rawReceiptsRef = { salon: [] as any[], food: [] as any[] };
    // Tracks which receipt ids we've already surfaced, so the *first*
    // snapshot (every pre-existing active receipt) doesn't fire a wall of
    // notifications — only receipts that show up *after* that count as new.
    let salonInitialized = false;
    let foodInitialized = false;
    let bothInitialized = false;
    const seenReceiptIds = new Set<string>();

    const updateUnifiedReceipts = async (newList: any[], type: 'salon' | 'food') => {
      rawReceiptsRef[type] = newList;
      if (type === 'salon') salonInitialized = true;
      if (type === 'food') foodInitialized = true;
      const combined = [...rawReceiptsRef.salon, ...rawReceiptsRef.food];

      if (salonInitialized && foodInitialized) {
        if (!bothInitialized) {
          combined.forEach((c) => seenReceiptIds.add(c.id));
          bothInitialized = true;
        } else {
          combined
            .filter((c) => !seenReceiptIds.has(c.id))
            .forEach((item) => {
              seenReceiptIds.add(item.id);
              pushNotification(
                user.uid,
                'new_receipt',
                'New receipt',
                item.receiptType === 'food'
                  ? 'You have a new food order receipt.'
                  : 'You have a new salon booking receipt.'
              );
            });
        }
      }

      setActiveReceipts(combined);

      // Generate local QR codes for both salon and food tickets
      const qrMap: Record<string, string> = {};
      for (const item of combined) {
        const refId = item.referenceId || item.ticketId || item.fourDigitCode || item.id;
        if (refId) {
          try {
            qrMap[item.id] = await QRCode.toDataURL(
              JSON.stringify({ 
                ticketId: item.id,
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
    };
  }, [user]);
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
      />
    );
  }

  return (
    <div className="malvin-hub min-h-screen bg-white dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50 font-sans relative flex flex-col justify-between p-6 pb-28 transition-colors duration-300">
      
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
        className="w-full flex items-center justify-between z-10"
      >
        <motion.button 
          whileTap={{ scale: 0.92 }}
          onClick={() => setIsDrawerOpen(true)}
          className="icon-button p-3 bg-white dark:bg-neutral-900 rounded-full border border-neutral-100 dark:border-neutral-800 shadow-[0_10px_24px_rgba(0,0,0,0.08)] hover:shadow-[0_14px_30px_rgba(0,0,0,0.12)] transition-shadow text-[#E53935]"
        >
          <Menu className="w-6 h-6" />
        </motion.button>

        <div className="text-center max-w-[50%] truncate">
          <h2 className="text-sm font-black text-neutral-900 dark:text-neutral-50 tracking-tight truncate">
            {t('hi')}, {fullName || user.email}
          </h2>
          {momScore > 0 ? (
            <button
              onClick={() => setIsSettingsOpen(true)}
              title={t('yourMomScore')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                marginTop: '4px',
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
            <p className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200/70 dark:border-neutral-800 text-[9px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest leading-none">
              {t('welcomeBack')}
            </p>
          )}
        </div>

        {/* RIGHT ACTION BUTTONS — grouped into one pill, matching the bottom nav pill */}
        <div className="flex items-center gap-1 bg-neutral-50/70 dark:bg-neutral-900/70 border border-neutral-200/50 dark:border-neutral-800/60 backdrop-blur-xl px-2 py-2 rounded-full shadow-[0_10px_24px_rgba(0,0,0,0.05)]">
          {/* RADAR SCANNER BUTTON (Pulsing Radar Wave style) */}
          <motion.button 
            whileTap={{ scale: 0.92 }}
            onClick={() => setIsRadarOpen(true)}
            className="icon-button relative p-2.5 hover:bg-white dark:hover:bg-neutral-800 rounded-full transition-colors text-[#E53935]"
            title="Open MalvinAI Radar"
          >
            <Radio className="w-6 h-6 animate-pulse" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          </motion.button>

          {/* NOTIFICATIONS BELL — red dot shows only while there's something unread */}
          <NotificationBell userId={user.uid} />

          {/* SETTINGS GEAR BUTTON */}
          <motion.button 
            whileTap={{ scale: 0.92 }}
            onClick={() => setIsSettingsOpen(true)}
            className="icon-button p-2.5 hover:bg-white dark:hover:bg-neutral-800 rounded-full transition-colors text-[#E53935]"
          >
            <Settings className="w-6 h-6" />
          </motion.button>
        </div>
      </motion.header>

      {/* BODY WORKSPACE CONTAINER */}
      <div className="flex-grow flex flex-col justify-start pt-12 w-full">
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
                  className="w-full bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-[2rem] pl-6 pr-14 py-4.5 text-sm font-medium text-neutral-900 dark:text-neutral-50 placeholder-neutral-400 dark:placeholder-neutral-500 focus:outline-none focus:border-[#E53935] focus:bg-white dark:focus:bg-neutral-900 focus:ring-4 focus:ring-[#E53935]/5 transition-all"
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
                    backgroundColor: isSearchHovered ? '#E53935' : (isDarkMode ? '#262626' : '#F5F5F5'),
                    color: isSearchHovered ? '#FFFFFF' : (isDarkMode ? '#a3a3a3' : '#737373'),
                    transition: 'background-color 0.2s ease, color 0.2s ease',
                  }}
                >
                  <Search className="w-4 h-4" />
                </motion.button>
              </div>

              {/* 🟢 ACTIVE TICKETS / RECEIPTS DROPDOWN ACCORDION */}
              
            </motion.main>

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

      {/* NAVIGATION PILL */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        {/* PILL CONTAINER — home, wallet, and scanner all live in one centered pill */}
        <div className="bg-neutral-50/70 dark:bg-neutral-900/70 border border-neutral-200/50 dark:border-neutral-800/60 backdrop-blur-xl px-4 py-3 rounded-[2.5rem] flex items-center gap-3 shadow-[0_16px_36px_rgba(0,0,0,0.06)] relative overflow-hidden">
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

          {/* SCANNER BUTTON — now inside the pill, still visually the primary action */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsScannerOpen(true)}
            className="icon-button w-14 h-14 bg-[#E53935] hover:bg-[#d32f2f] rounded-full flex items-center justify-center text-white shadow-[0_10px_26px_rgba(229,57,53,0.35)] hover:shadow-[0_14px_30px_rgba(229,57,53,0.45)] transition-all"
          >
            <QrCode className="w-6 h-6" />
          </motion.button>
        </div>
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
                        <span className="text-neutral-400 dark:text-neutral-500 font-semibold">{LANGUAGES.find(l => l.code === language)?.label}</span>
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
                          <div className="pb-3 space-y-1">
                            {LANGUAGES.map(l => (
                              <button
                                key={l.code}
                                type="button"
                                onClick={() => handleSelectLanguage(l.code)}
                                className={`icon-button w-full flex items-center justify-between rounded-xl px-3 py-2 normal-case transition-colors ${
                                  l.code === language ? 'bg-[#E53935]/10 text-[#E53935]' : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                                }`}
                              >
                                <span className="font-bold">{l.label}</span>
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
                    className="w-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 rounded-xl py-3.5 font-bold hover:bg-neutral-950 dark:hover:bg-white transition-colors flex items-center justify-center gap-2 mt-2 shadow-lg shadow-neutral-900/5"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
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
        activeReceipts={activeReceipts}
        receiptQrs={receiptQrs}
      />

      {/* RADAR SCANNER MODAL OVERLAY */}
      <AnimatePresence>
        {isRadarOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 bg-slate-950 flex flex-col"
          >
            {/* Top Close Bar */}
            <div className="absolute top-4 right-4 z-50">
              <button
                onClick={() => setIsRadarOpen(false)}
                className="p-3 rounded-full bg-slate-900/80 border border-slate-700/60 text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Embedded VinScanner Component */}
            <VinScanner />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};