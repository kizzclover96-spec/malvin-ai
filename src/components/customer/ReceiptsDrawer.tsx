// src/components/ReceiptsDrawer.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Calendar, DollarSign, QrCode, Trash2, Maximize2,
  BedDouble, UtensilsCrossed, Scissors, Moon, Users, LogIn, LogOut, Timer,
} from 'lucide-react';

/** "12m 04s" — the remaining life of an unpaid hold. */
function formatCountdown(msLeft: number): string {
  const total = Math.max(0, Math.floor(msLeft / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
}

interface ReceiptsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeReceipts: any[];
  receiptQrs: Record<string, string>;
  onDeleteReceipt?: (receiptId: string, isFoodOrder: boolean) => Promise<void> | void;
}

type ReceiptKind = 'hotel' | 'food' | 'salon';

/**
 * Which kind of pass this is.
 *
 * Front.tsx stamps `receiptType` on every receipt as it merges the three
 * listeners, so that's the authoritative answer. The shape-sniffing below is
 * only a fallback for receipts written before that field existed — hotels
 * are checked first because a reservation carries checkIn/checkOut and
 * neither of the other two do.
 */
function receiptKind(receipt: any): ReceiptKind {
  if (receipt.receiptType === 'hotel' || receipt.receiptType === 'food' || receipt.receiptType === 'salon') {
    return receipt.receiptType;
  }
  if (receipt.checkIn || receipt.roomCategory || receipt.reservationId) return 'hotel';
  if (Array.isArray(receipt.items) && receipt.items.length > 0) return 'food';
  return 'salon';
}

// Each kind gets its own colour, icon and wording so a glance down the list
// is enough to tell a dinner order apart from a hotel stay. The restaurant
// styling in particular is pulled away from the neutral default the other
// two share — warm amber card, its own icon, and the pickup code promoted
// to a badge, since that's the thing a customer at a counter actually needs.
const RECEIPT_THEME: Record<ReceiptKind, {
  label: string;
  Icon: React.ElementType;
  card: string;
  chip: string;
  accentText: string;
  detailBox: string;
}> = {
  hotel: {
    label: 'Hotel Stay',
    Icon: BedDouble,
    card: 'bg-amber-50/40 border-amber-200/70',
    chip: 'text-amber-700 bg-amber-100',
    accentText: 'text-amber-700',
    detailBox: 'bg-white border-amber-100',
  },
  food: {
    label: 'Food Order',
    Icon: UtensilsCrossed,
    card: 'bg-orange-50/50 border-orange-200/70',
    chip: 'text-orange-700 bg-orange-100',
    accentText: 'text-orange-700',
    detailBox: 'bg-white border-orange-100',
  },
  salon: {
    label: 'Salon Booking',
    Icon: Scissors,
    card: 'bg-neutral-50/50 border-neutral-200/60',
    chip: 'text-violet-700 bg-violet-100',
    accentText: 'text-violet-700',
    detailBox: 'bg-white border-neutral-100/80',
  },
};

export const ReceiptsDrawer: React.FC<ReceiptsDrawerProps> = ({
  isOpen,
  onClose,
  activeReceipts,
  receiptQrs,
  onDeleteReceipt,
}) => {
  // State for managing the enlarged QR code preview modal
  const [selectedQr, setSelectedQr] = useState<{ src: string; refId: string; customerName: string } | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // Sort receipts so that the newest ones always appear at the top
  const sortedReceipts = [...activeReceipts].sort((a, b) => {
    const timeA = a.createdAt?.seconds 
      ? a.createdAt.seconds * 1000 
      : a.createdAt 
        ? new Date(a.createdAt).getTime() 
        : 0;
        
    const timeB = b.createdAt?.seconds 
      ? b.createdAt.seconds * 1000 
      : b.createdAt 
        ? new Date(b.createdAt).getTime() 
        : 0;

    return timeB - timeA; // Descending order (newest first)
  });

  const handleDelete = async (receiptId: string, isFoodOrder: boolean) => {
    if (!window.confirm("Are you sure you want to delete this ticket?")) return;
    try {
      setIsDeletingId(receiptId);
      if (onDeleteReceipt) {
        await onDeleteReceipt(receiptId, isFoodOrder);
      } else {
        console.warn("onDeleteReceipt prop is not defined. Ticket ID:", receiptId);
      }
    } catch (error) {
      console.error("Failed to delete receipt:", error);
    } finally {
      setIsDeletingId(null);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop Shadow Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.4 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black z-50 backdrop-blur-[2px]"
            />

            {/* Left Side Sliding Panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 26, stiffness: 220 }}
              className="fixed top-0 left-0 bottom-0 h-full w-[85vw] max-w-sm bg-white shadow-2xl border-r border-neutral-100 z-50 flex flex-col overflow-hidden"
            >
              {/* Header Area */}
              <div className="flex items-center justify-between p-6 border-b border-neutral-100 bg-neutral-50/50">
                <div>
                  <h3 className="text-base font-black tracking-tight text-neutral-900">
                    Active Passes & Receipts
                  </h3>
                  <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mt-0.5">
                    {activeReceipts.length} Active Receipt{activeReceipts.length === 1 ? '' : 's'}
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-2 bg-white border border-neutral-200/80 hover:bg-neutral-100 rounded-full text-neutral-500 transition-colors shadow-sm"
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>

              {/* Scrollable Receipt List */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {sortedReceipts.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center px-4 py-12">
                    <div className="w-12 h-12 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-300 mb-3">
                      <QrCode className="w-6 h-6" />
                    </div>
                    <p className="text-xs font-black uppercase tracking-wider text-neutral-400">No active passes</p>
                    <p className="text-[10.5px] mt-1 text-neutral-400/80 leading-relaxed max-w-[200px]">
                      Successfully completed orders or bookings will appear here instantly.
                    </p>
                  </div>
                ) : (
                  sortedReceipts.map((receipt) => {
                    const refId = receipt.referenceId || receipt.ticketId || receipt.id;
                    const qrSrc = receiptQrs[receipt.id]; // Fixed: Look up using receipt.id to match Front.tsx mapping
                    
                    // Safe pricing calculations
                    // paidAmount is what the Stripe webhook stamps onto a
                    // confirmed hotel reservation; totalPrice is the pre-payment figure.
                    const displayTotal =
                      receipt.totalPaid || receipt.paidAmount || receipt.totalPrice || receipt.price || 0;

                    // Parse date fallback cleanly using the FireStore Timestamp "createdAt"
                    let displayDate = receipt.date;
                    let displayTime = receipt.time || receipt.pickupTime;
                    if (!displayDate && receipt.createdAt) {
                      const jsDate = receipt.createdAt.toDate ? receipt.createdAt.toDate() : new Date(receipt.createdAt);
                      displayDate = jsDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                      if (!displayTime) {
                        displayTime = jsDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                      }
                    }

                    const kind = receiptKind(receipt);
                    const theme = RECEIPT_THEME[kind];
                    const KindIcon = theme.Icon;

                    // An unpaid room hold. Front.tsx removes it from this
                    // list the moment holdExpiresAt passes, so anything
                    // still rendering here has time left on the clock.
                    const isHeldHold = kind === 'hotel' && receipt.status === 'held';
                    const msLeft = isHeldHold ? (receipt.holdExpiresAt || 0) - Date.now() : 0;

                    // Determine if this is a food order or a salon booking
                    const isFoodOrder = kind === 'food' && Array.isArray(receipt.items) && receipt.items.length > 0;
                    const hasSalonServices = kind === 'salon' && (receipt.services || receipt.selectedServices) && (receipt.services || receipt.selectedServices).length > 0;

                    return (
                      <div
                        key={receipt.id}
                        className={`${theme.card} border rounded-2xl p-4 flex flex-col gap-3 shadow-[0_4px_16px_rgba(0,0,0,0.01)] transition-colors relative`}
                      >
                        {/* Smaller, Elegant Delete Button in far top-right corner */}
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          disabled={isDeletingId === receipt.id}
                          onClick={() => handleDelete(receipt.id, isFoodOrder)}
                          className="absolute top-2 right-2 p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors z-10"
                          title="Delete Ticket"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </motion.button>

                        {/* Top Info Header with extra right padding so text doesn't overlap delete button */}
                        <div className="flex justify-between items-start gap-3 pr-4">
                          <div className="space-y-1 flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {/* Receipt kind — the primary at-a-glance tell */}
                              <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider ${theme.chip} px-2 py-0.5 rounded`}>
                                <KindIcon className="w-2.5 h-2.5" />
                                {theme.label}
                              </span>
                              <span
                                className={`inline-flex items-center text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                                  isHeldHold ? 'text-amber-700 bg-amber-100' : 'text-emerald-600 bg-emerald-50'
                                }`}
                              >
                                {isHeldHold ? 'Reserved · Unpaid' : receipt.status || 'Paid'}
                              </span>
                            </div>
                            <p className="text-xs font-black text-neutral-900 truncate mt-1">
                              {kind === 'hotel' ? 'Guest' : 'Client'}: {receipt.guestName || receipt.customerName || 'Customer Receipt'}
                            </p>
                            <p className="text-[10px] font-mono text-neutral-400 truncate">
                              Ref: <span className={`${theme.accentText} font-bold`}>{refId}</span>
                            </p>
                          </div>

                          {/* Interactive QR Code Thumbnail (mt-3 prevents overlap with delete button) */}
                          {qrSrc ? (
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setSelectedQr({ src: qrSrc, refId, customerName: receipt.guestName || receipt.customerName || 'Customer' })}
                              className="bg-white p-1 rounded-xl border border-neutral-100 shadow-sm flex-shrink-0 cursor-zoom-in relative group/qr mt-3"
                            >
                              <img src={qrSrc} alt="Ticket QR" className="w-12 h-12" />
                              <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover/qr:opacity-100 transition-opacity flex items-center justify-center">
                                <Maximize2 className="w-3 h-3 text-white" />
                              </div>
                            </motion.button>
                          ) : (
                            <div className="w-12 h-12 bg-neutral-100 animate-pulse rounded-xl mt-3" />
                          )}
                        </div>

                        {/* 🏨 OPTION A: Hotel Stay — room, dates, nights, guests */}
                        {kind === 'hotel' && (
                          <div className={`${theme.detailBox} border rounded-xl p-2.5 space-y-2`}>
                            <div className="flex items-center justify-between">
                              <span className="text-[10.5px] font-black text-neutral-900 truncate">
                                {receipt.roomCategory || 'Room'}
                              </span>
                              {receipt.nights ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700">
                                  <Moon className="w-3 h-3" />
                                  {receipt.nights} night{receipt.nights === 1 ? '' : 's'}
                                </span>
                              ) : null}
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div className="flex items-center gap-1.5 text-[10px] text-neutral-600">
                                <LogIn className="w-3 h-3 text-amber-600 shrink-0" />
                                <span className="truncate">
                                  <span className="block text-[8.5px] font-black uppercase tracking-wider text-neutral-400">Check in</span>
                                  <span className="font-bold text-neutral-800">{receipt.checkIn || '—'}</span>
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 text-[10px] text-neutral-600">
                                <LogOut className="w-3 h-3 text-amber-600 shrink-0" />
                                <span className="truncate">
                                  <span className="block text-[8.5px] font-black uppercase tracking-wider text-neutral-400">Check out</span>
                                  <span className="font-bold text-neutral-800">{receipt.checkOut || '—'}</span>
                                </span>
                              </div>
                            </div>

                            {receipt.guestCount ? (
                              <div className="flex items-center gap-1.5 text-[10px] font-bold text-neutral-500 pt-1 border-t border-amber-50">
                                <Users className="w-3 h-3 text-neutral-400" />
                                <span>{receipt.guestCount} guest{receipt.guestCount === 1 ? '' : 's'}</span>
                              </div>
                            ) : null}

                            {/* Live hold clock. This pass vanishes on its own
                                when it hits zero, so say so plainly. */}
                            {isHeldHold && (
                              <div className="flex items-center gap-1.5 pt-2 border-t border-amber-100">
                                <Timer className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-[11px] font-black text-amber-700 leading-tight tabular-nums">
                                    Room held for {formatCountdown(msLeft)}
                                  </p>
                                  <p className="text-[9.5px] font-semibold text-neutral-400 leading-tight mt-0.5">
                                    Pay before the timer ends or the room is released.
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* 💇‍♂️ OPTION B: Salon Services Selection */}
                        {hasSalonServices && (
                          <div className={`${theme.detailBox} border rounded-xl p-2.5 space-y-1.5`}>
                            <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wider block">
                              Services Selected:
                            </span>
                            {(receipt.services || receipt.selectedServices).map((service: any, sIdx: number) => (
                              <div key={sIdx} className="flex justify-between items-center text-[10.5px] text-neutral-600">
                                <span className="truncate max-w-[150px] font-medium">
                                  {service.serviceName || service.name}
                                </span>
                                <span className="font-bold text-neutral-900">
                                  €{service.price}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* 🍔 OPTION C: Food / Store Order Items Selection */}
                        {isFoodOrder && (
                          <div className={`${theme.detailBox} border rounded-xl p-2.5 space-y-1.5`}>
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wider">
                                Items Ordered:
                              </span>
                              {/* Pickup code, promoted — at the counter this is
                                  the only part of the receipt that gets read out. */}
                              {receipt.fourDigitCode && (
                                <span className="text-[10px] font-black font-mono tracking-widest text-orange-700 bg-orange-100 px-2 py-0.5 rounded">
                                  #{receipt.fourDigitCode}
                                </span>
                              )}
                            </div>
                            {receipt.items.map((item: any, itemIdx: number) => (
                              <div key={itemIdx} className="flex justify-between items-center text-[10.5px] text-neutral-600">
                                <span className="truncate max-w-[150px] font-medium">
                                  {item.quantity}x {item.name}
                                </span>
                                <span className="font-bold text-neutral-900">
                                  €{((item.price || 0) * (item.quantity || 1)).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Footer Metadata Blocks (Date/Time & Price Summary) */}
                        <div className="border-t border-neutral-100 pt-2.5 mt-1 flex flex-col gap-1 text-[10px] text-neutral-500 font-bold">
                          {(displayDate || displayTime) && (
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                              <span>
                                {kind === 'hotel' ? 'Booked ' : ''}{displayDate}{' '}
                                {displayTime ? `(${isFoodOrder ? 'Pickup at' : 'at'} ${displayTime})` : ''}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 text-neutral-800 font-extrabold mt-1">
                            <DollarSign className={`w-3.5 h-3.5 ${theme.accentText}`} />
                            {/* Nothing has been charged on an unpaid hold —
                                labelling it "Total Paid" would be a lie. */}
                            <span>
                              {isHeldHold ? 'Total due' : 'Total Paid'}: €{Number(displayTotal).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              
              {/* Drawer Bottom Utility */}
              <div className="p-5 border-t border-neutral-100 bg-neutral-50/50 text-center">
                <span className="text-[9px] font-black uppercase tracking-widest text-neutral-400">
                  Tap QR to enlarge & scan
                </span>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Enlarged QR Code Modal Dialog overlay */}
      <AnimatePresence>
        {selectedQr && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedQr(null)}
              className="absolute inset-0 bg-neutral-950 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ scale: 0.9, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 15, opacity: 0 }}
              transition={{ type: "spring", duration: 0.35 }}
              className="relative w-full max-w-xs bg-white rounded-3xl p-6 shadow-2xl border border-neutral-100 text-center flex flex-col items-center gap-4 z-10"
            >
              {/* Top Modal Header Close */}
              <button 
                onClick={() => setSelectedQr(null)}
                className="absolute top-4 right-4 p-1.5 bg-neutral-100 hover:bg-neutral-200 rounded-full text-neutral-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="mt-2">
                <h4 className="text-sm font-black text-neutral-900">Scan Code</h4>
                <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider mt-0.5">
                  Client: {selectedQr.customerName}
                </p>
              </div>

              {/* Enlarged Scanning Box */}
              <div className="bg-white p-3 rounded-2xl border border-neutral-100 shadow-md">
                <img 
                  src={selectedQr.src} 
                  alt="Enlarged Scanning QR Code" 
                  className="w-48 h-48 select-none" 
                />
              </div>

              <div className="space-y-1">
                <p className="text-[10px] font-mono text-neutral-400">
                  Ticket Reference Node:
                </p>
                <p className="text-xs font-mono font-black text-[#E53935]">
                  {selectedQr.refId}
                </p>
              </div>

              <button 
                onClick={() => setSelectedQr(null)}
                className="w-full bg-neutral-900 text-white font-bold rounded-xl py-3 text-xs hover:bg-neutral-950 transition-colors"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};