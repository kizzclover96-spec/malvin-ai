import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Share2, User, Smartphone, Moon, Store, Receipt, Sparkles, X, AlertTriangle,
} from 'lucide-react';
import {
  collection, query, orderBy, limit, onSnapshot, doc, writeBatch,
  addDoc, serverTimestamp, Timestamp, getDoc, setDoc,
} from 'firebase/firestore';
import { firestore as db } from '../../firebase';

// One entry per kind of "important thing the customer did" that Front.tsx
// reports. Keeping this list as a union (rather than a free string) means
// every call site and the icon map below stay in sync — add a new kind of
// event here first, then the icon map won't compile until you've picked an
// icon for it.
export type NotificationType =
  | 'vinmoment_shared'
  | 'profile_updated'
  | 'new_device'
  | 'dark_mode'
  | 'store_visited'
  | 'new_receipt'
  | 'property_scanned';

interface NotificationDoc {
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: Timestamp | null;
}

interface NotificationItem extends NotificationDoc {
  id: string;
}

// Single write path for every notification in the app — every caller in
// Front.tsx goes through this instead of writing to Firestore directly, so
// the document shape can only ever drift in one place.
//
// Checks the customer's own notificationsMuted flag first. This is a real
// suppression (nothing gets written to Firestore, no push, no badge), not
// just a hidden badge — long-pressing the bell actually turns notifications
// off, the same way muting a phone conversation would.
export const pushNotification = async (
  uid: string | undefined | null,
  type: NotificationType,
  title: string,
  message: string
): Promise<void> => {
  if (!uid) return;
  try {
    const customerRef = doc(db, 'customers', uid);
    const customerSnap = await getDoc(customerRef);
    if (customerSnap.exists() && customerSnap.data()?.notificationsMuted === true) {
      return; // Muted — don't write anything.
    }
    await addDoc(collection(db, 'customers', uid, 'notifications'), {
      type,
      title,
      message,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error('Failed to write notification:', err);
  }
};

const ICONS: Record<NotificationType, React.ElementType> = {
  vinmoment_shared: Share2,
  profile_updated: User,
  new_device: Smartphone,
  dark_mode: Moon,
  store_visited: Store,
  new_receipt: Receipt,
  property_scanned: AlertTriangle,
};

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 5) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

interface NotificationBellProps {
  userId: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ userId }) => {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  // Separate ref for the portaled popup content — it's no longer a DOM
  // descendant of wrapperRef once rendered into document.body, so the
  // outside-click check below needs to know about both.
  const popupRef = useRef<HTMLDivElement>(null);

  // 🔕 MUTE STATE — long-pressing the bell toggles customers/{uid}
  // .notificationsMuted, which pushNotification() checks before writing
  // anything. localStorage is kept purely as an instant-paint cache so the
  // icon doesn't flash "unmuted" for a moment while the real doc loads.
  const [isMuted, setIsMuted] = useState(false);
  useEffect(() => {
    if (!userId) return;
    const cached = localStorage.getItem(`notif_muted_${userId}`);
    if (cached !== null) setIsMuted(cached === 'true');

    getDoc(doc(db, 'customers', userId)).then((snap) => {
      const muted = snap.exists() && snap.data()?.notificationsMuted === true;
      setIsMuted(muted);
      localStorage.setItem(`notif_muted_${userId}`, String(muted));
    }).catch((err) => console.error('Failed to load mute state:', err));
  }, [userId]);

  // Long-press handling — mirrors the avatar long-press pattern elsewhere in
  // the app: a timer starts on press-down, and if it fires before the
  // pointer lifts, the resulting click is treated as "already handled" so
  // it doesn't also toggle the popup open.
  const BELL_LONG_PRESS_MS = 500;
  const bellPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bellLongPressFired = useRef(false);

  const handleBellPressStart = () => {
    bellLongPressFired.current = false;
    bellPressTimer.current = setTimeout(async () => {
      bellLongPressFired.current = true;
      const next = !isMuted;
      setIsMuted(next); // optimistic — the line animates immediately
      localStorage.setItem(`notif_muted_${userId}`, String(next));
      if (navigator.vibrate) navigator.vibrate(12);
      try {
        await setDoc(doc(db, 'customers', userId), { notificationsMuted: next }, { merge: true });
      } catch (err) {
        console.error('Failed to save mute state:', err);
        // Roll back on failure so the icon doesn't lie about the saved state.
        setIsMuted(!next);
        localStorage.setItem(`notif_muted_${userId}`, String(!next));
      }
    }, BELL_LONG_PRESS_MS);
  };
  const handleBellPressEnd = () => {
    if (bellPressTimer.current) clearTimeout(bellPressTimer.current);
  };

  // Live feed — newest 30, most recent first.
  useEffect(() => {
    if (!userId) return;
    const q = query(
      collection(db, 'customers', userId, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(30)
    );
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as NotificationDoc) })));
      },
      (err) => console.error('Error syncing notifications:', err)
    );
    return () => unsubscribe();
  }, [userId]);

  // Close the popup on an outside click/tap. Checks both the bell's own
  // wrapper and the portaled popup content (see popupRef above) — without
  // the second check, any click inside the popup itself would look like
  // an "outside" click the instant the popup moved to document.body.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        wrapperRef.current && !wrapperRef.current.contains(target) &&
        popupRef.current && !popupRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const unreadCount = items.filter((n) => !n.read).length;

  const handleToggleOpen = async () => {
    // A long press just fired — that press already did its job (toggling
    // mute); don't also let the resulting click open the popup.
    if (bellLongPressFired.current) {
      bellLongPressFired.current = false;
      return;
    }
    const next = !isOpen;
    setIsOpen(next);
    if (!next || unreadCount === 0) return;
    // Mark everything currently unread as read the moment the popup opens.
    try {
      const batch = writeBatch(db);
      items
        .filter((n) => !n.read)
        .forEach((n) => {
          batch.update(doc(db, 'customers', userId, 'notifications', n.id), { read: true });
        });
      await batch.commit();
    } catch (err) {
      console.error('Failed to mark notifications as read:', err);
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={handleToggleOpen}
        onPointerDown={handleBellPressStart}
        onPointerUp={handleBellPressEnd}
        onPointerLeave={handleBellPressEnd}
        className="icon-button relative p-2.5 hover:bg-white dark:hover:bg-neutral-800 rounded-full transition-colors text-[#E53935]"
        title={isMuted ? 'Notifications muted — long-press to turn back on' : 'Notifications — long-press to mute'}
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && !isMuted && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white dark:border-neutral-900" />
        )}
        {/* 🔕 Mute strike — sweeps diagonally across the bell on long-press,
            and stays put while muted is on. */}
        <AnimatePresence>
          {isMuted && (
            <motion.span
              key="mute-line"
              initial={{ scaleX: 0, opacity: 0 }}
              animate={{ scaleX: 1, opacity: 1 }}
              exit={{ scaleX: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: 'easeOut' }}
              style={{ transformOrigin: 'center' }}
              className="absolute left-1/2 top-1/2 w-7 h-[2.5px] bg-[#E53935] rounded-full -translate-x-1/2 -translate-y-1/2 rotate-45 pointer-events-none shadow-sm"
            />
          )}
        </AnimatePresence>
      </motion.button>

      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <div ref={popupRef}>
              {/* Backdrop — dims the screen and gives mobile users an
                  obvious tap-anywhere-to-close target now that the panel
                  floats in the middle of the screen instead of hanging off
                  the bell. */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
                onClick={() => setIsOpen(false)}
                className="fixed inset-0 bg-black/40 backdrop-blur-[1px] z-40"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 max-w-[85vw] max-h-[70vh] overflow-y-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl z-50"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-neutral-800">
                <h4 className="text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                  Notifications
                </h4>
                <button
                  onClick={() => setIsOpen(false)}
                  className="icon-button p-1 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {items.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <Bell className="w-6 h-6 text-neutral-300 dark:text-neutral-700 mx-auto mb-2" />
                  <p className="text-[11px] font-semibold text-neutral-400 dark:text-neutral-500">
                    No notifications yet
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {items.map((n) => {
                    const Icon = ICONS[n.type] || Sparkles;
                    const date = n.createdAt?.toDate ? n.createdAt.toDate() : new Date();
                    const isUrgent = n.type === 'property_scanned';
                    return (
                      <div
                        key={n.id}
                        className={`flex items-start gap-3 px-4 py-3 ${
                          isUrgent
                            ? 'bg-red-600 dark:bg-red-700'
                            : !n.read
                              ? 'bg-rose-50/50 dark:bg-rose-500/5'
                              : ''
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isUrgent ? 'bg-white/20 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-[#E53935]'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-[11px] font-black leading-snug ${isUrgent ? 'text-white' : 'text-neutral-800 dark:text-neutral-100'}`}>
                            {n.title}
                          </p>
                          <p className={`text-[10px] font-medium leading-snug mt-0.5 ${isUrgent ? 'text-white/90' : 'text-neutral-500 dark:text-neutral-400'}`}>
                            {n.message}
                          </p>
                          <p className={`text-[9px] font-bold mt-1 uppercase tracking-wide ${isUrgent ? 'text-white/70' : 'text-neutral-300 dark:text-neutral-600'}`}>
                            {timeAgo(date)}
                          </p>
                        </div>
                        {!n.read && !isUrgent && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#E53935] mt-1.5 flex-shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
};