// src/components/ReceiptsDrawer.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { X, Calendar, Clock, DollarSign } from 'lucide-react';

interface ReceiptsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeReceipts: any[];
  receiptQrs: Record<string, string>;
}

export const ReceiptsDrawer: React.FC<ReceiptsDrawerProps> = ({
  isOpen,
  onClose,
  activeReceipts,
  receiptQrs,
}) => {
  return (
    <>
      {/* Backdrop overlay */}
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black z-40"
        />
      )}

      {/* Slideout Side Drawer */}
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: isOpen ? 0 : '-100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="fixed top-0 left-0 bottom-0 w-[85vw] max-w-sm bg-white shadow-2xl z-50 flex flex-col p-6 overflow-y-auto"
      >
        {/* Header inside drawer */}
        <div className="flex items-center justify-between border-b border-neutral-100 pb-4 mb-6">
          <div>
            <h3 className="text-base font-black tracking-tight text-neutral-900">
              Active Bookings
            </h3>
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
              {activeReceipts.length} Receipt{activeReceipts.length === 1 ? '' : 's'} Total
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded-full transition-colors text-neutral-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of Receipts */}
        {activeReceipts.length === 0 ? (
          <div className="flex-grow flex flex-col items-center justify-center text-center text-neutral-400">
            <p className="text-xs font-bold uppercase tracking-wider">No active passes</p>
            <p className="text-[11px] mt-1 text-neutral-400/80">Your completed ticket codes appear here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {activeReceipts.map((receipt) => {
              const refId = receipt.referenceId || receipt.ticketId || receipt.id;
              const qrSrc = receiptQrs[refId];

              return (
                <div 
                  key={receipt.id} 
                  className="bg-neutral-50 border border-neutral-100 rounded-2xl p-4 flex flex-col gap-3 shadow-sm hover:border-neutral-200 transition-colors"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="space-y-1">
                      <p className="text-xs font-black text-neutral-900 truncate">
                        {receipt.serviceName || receipt.services?.map((s: any) => s.serviceName).join(', ') || 'Service Booking'}
                      </p>
                      <p className="text-[10px] font-mono text-[#E53935] tracking-tight font-black uppercase">
                        Ref: {refId?.substring(0, 10).toUpperCase()}
                      </p>
                    </div>

                    {/* QR Code Container */}
                    {qrSrc && (
                      <div className="bg-white p-1 rounded-xl border border-neutral-100 shadow-sm flex-shrink-0">
                        <img src={qrSrc} alt="Ticket QR" className="w-14 h-14" />
                      </div>
                    )}
                  </div>

                  {/* Metadata Blocks */}
                  <div className="grid grid-cols-2 gap-2 border-t border-neutral-100 pt-3 text-[11px]">
                    <div className="flex items-center gap-1.5 text-neutral-500 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-neutral-400" />
                      <span>{receipt.date}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-neutral-500 font-medium">
                      <Clock className="w-3.5 h-3.5 text-neutral-400" />
                      <span>{receipt.time}</span>
                    </div>
                    <div className="col-span-2 flex items-center gap-1.5 text-neutral-700 font-bold mt-1">
                      <DollarSign className="w-3.5 h-3.5 text-[#E53935]" />
                      <span>${receipt.price || receipt.totalAmount || '0.00'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </>
  );
};