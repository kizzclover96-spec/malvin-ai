import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

interface StoreFrontProps {
  businessUid: string;
  userUid: string;
  userWalletBalance: number;
  onExecutePayment: (
    amount:number,
    businessId:string
  ) => Promise<void>;
  onExit: () => void;
}
export const StoreFront: React.FC<StoreFrontProps> = ({  businessUid, userUid, onExit }) => {
  // Fallback check to ensure we have a valid absolute URL string
  const targetUrl = businessUid.startsWith('http://') || businessUid.startsWith('https://') ? businessUid : `https://${businessUid}`;

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
 
  useEffect(() => {

    const listener = (event: MessageEvent) => {

        if (event.data?.type === "SALON_READY") {

            iframeRef.current?.contentWindow?.postMessage(
                {
                    type: "MALVIN_USER",
                    uid: userUid
                },
                "*"
            );

            console.log(
                "Salon requested identity:",
                userUid
            );
        }

    };

    window.addEventListener("message", listener);

    return () => window.removeEventListener("message", listener);

  }, [userUid]);

 
  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      // h-[100dvh] ensures full coverage on mobile browsers ignoring address bar heights
      className="fixed inset-0 w-screen h-[100dvh] bg-white text-black font-sans z-50 flex flex-col overflow-hidden overscroll-y-contain"
    >
      {/* MINIMAL MOBILE TOP HEADER BAR */}
      <div className="w-full h-14 border-b border-neutral-100 px-4 flex items-center justify-between shrink-0 bg-white">
        <button 
          onClick={onExit}
          className="p-2.5 -ml-2.5 hover:bg-neutral-100 active:scale-95 text-neutral-800 rounded-full transition-all flex items-center justify-center"
          aria-label="Go Back"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>
        
        {/* Dynamic empty spacer layer to balance flex positioning grids */}
        <div className="w-10 h-10" />
      </div>

      {/* MOBILE OPTIMIZED IFRAME VIEWPORT */}
      <div className="flex-1 w-full relative bg-neutral-50 overflow-hidden">
        <iframe 
            ref={iframeRef}
            src={targetUrl}
            title="In-App Store Webview Content"
            className="w-full h-full border-none m-0 p-0"
            // 🟢 Expanded permissions to make sure third-party checkout scripts don't break
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-top-navigation-by-user-activation"
            allow="clipboard-write; camera; microphone; geolocation"
        />
      </div>
    </motion.div>
  );
};