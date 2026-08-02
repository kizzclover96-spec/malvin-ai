import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Share2, User, Smartphone, Moon, Store, Receipt, Sparkles, X,
} from 'lucide-react';
import {
  collection, query, orderBy, limit, onSnapshot, doc, writeBatch,
  addDoc, serverTimestamp, Timestamp,
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
  | 'new_receipt';

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
export const pushNotification = async (
  uid: string | undefined | null,
  type: NotificationType,
  title: string,
  message: string
): Promise<void> => {
  if (!uid) return;
  try {
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

  // Close the popup on an outside click/tap.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [isOpen]);

  const unreadCount = items.filter((n) => !n.read).length;

  const handleToggleOpen = async () => {
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
        className="icon-button relative p-2.5 hover:bg-white dark:hover:bg-neutral-800 rounded-full transition-colors text-[#E53935]"
        title="Notifications"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white dark:border-neutral-900" />
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 max-w-[85vw] max-h-[70vh] overflow-y-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl z-50"
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
                  return (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 px-4 py-3 ${
                        !n.read ? 'bg-rose-50/50 dark:bg-rose-500/5' : ''
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center flex-shrink-0 text-[#E53935]">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-neutral-800 dark:text-neutral-100 leading-snug">
                          {n.title}
                        </p>
                        <p className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400 leading-snug mt-0.5">
                          {n.message}
                        </p>
                        <p className="text-[9px] font-bold text-neutral-300 dark:text-neutral-600 mt-1 uppercase tracking-wide">
                          {timeAgo(date)}
                        </p>
                      </div>
                      {!n.read && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#E53935] mt-1.5 flex-shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};