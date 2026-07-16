// src/components/ReceiptsDrawer.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, DollarSign, QrCode, Trash2, Maximize2 } from 'lucide-react';

interface ReceiptsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeReceipts: any[];
  receiptQrs: Record<string, string>;
  onDeleteReceipt?: (receiptId: string, isFoodOrder: boolean) => Promise<void> | void;
}

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
                    const displayTotal = receipt.totalPaid || receipt.totalPrice || receipt.price || 0;

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

                    // Determine if this is a food order or a salon booking
                    const isFoodOrder = Array.isArray(receipt.items) && receipt.items.length > 0;
                    const hasSalonServices = (receipt.services || receipt.selectedServices) && (receipt.services || receipt.selectedServices).length > 0;

                    return (
                      <div 
                        key={receipt.id} 
                        className="bg-neutral-50/50 border border-neutral-200/60 rounded-2xl p-4 flex flex-col gap-3 shadow-[0_4px_16px_rgba(0,0,0,0.01)] hover:border-neutral-300 transition-colors relative"
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
                            <span className="inline-flex items-center text-[9px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                              {receipt.status || 'Paid'}
                            </span>
                            <p className="text-xs font-black text-neutral-900 truncate mt-1">
                              Client: {receipt.customerName || 'Customer Receipt'}
                            </p>
                            <p className="text-[10px] font-mono text-neutral-400 truncate">
                              Ref: <span className="text-[#E53935] font-bold">{refId}</span>
                            </p>
                          </div>

                          {/* Interactive QR Code Thumbnail (mt-3 prevents overlap with delete button) */}
                          {qrSrc ? (
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setSelectedQr({ src: qrSrc, refId, customerName: receipt.customerName || 'Customer' })}
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

                        {/* 💇‍♂️ OPTION A: Salon Services Selection */}
                        {hasSalonServices && (
                          <div className="bg-white border border-neutral-100/80 rounded-xl p-2.5 space-y-1.5">
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

                        {/* 🍔 OPTION B: Food / Store Order Items Selection */}
                        {isFoodOrder && (
                          <div className="bg-white border border-neutral-100/80 rounded-xl p-2.5 space-y-1.5">
                            <span className="text-[9px] font-black text-neutral-400 uppercase tracking-wider block">
                              Items Ordered:
                            </span>
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
                                {displayDate} {displayTime ? `(${isFoodOrder ? 'Pickup at' : 'at'} ${displayTime})` : ''}
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 text-neutral-800 font-extrabold mt-1">
                            <DollarSign className="w-3.5 h-3.5 text-[#E53935]" />
                            <span>Total Paid: €{Number(displayTotal).toFixed(2)}</span>
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