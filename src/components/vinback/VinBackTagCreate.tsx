import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { httpsCallable } from 'firebase/functions';
import { functions, auth } from '../../firebase';
import { X, QrCode, Copy, Share2, Download, Loader2, Check, CreditCard, Sparkles } from 'lucide-react';
import { generateVinBackQr } from '../../utils/vinbackQr';
import { PUBLIC_ORIGIN } from '../../services/vinLink';
import { shareContent, canOpenShareSheet } from '../../services/share';
import { useVinBackCredits, FREE_VINBACK_TAGS, VINBACK_TAG_PRICE_USD } from '../../hooks/useVinBackCredits';

interface Props {
  onClose: () => void;
  /** Called after a tag is successfully created, so the "All Tags" list can refresh. */
  onCreated?: () => void;
}

const inputClass =
  "w-full bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl px-3.5 py-3 text-neutral-900 dark:text-neutral-50 placeholder-neutral-400 dark:placeholder-neutral-500 font-medium text-xs focus:outline-none focus:border-[#E53935] focus:bg-white dark:focus:bg-neutral-800 transition-all";

const labelClass = "block text-[10px] font-black uppercase text-neutral-400 dark:text-neutral-500 mb-1.5 ml-1 tracking-wider";

const vinbackVariantId = import.meta.env.VITE_LEMONSQUEEZY_VINBACK_VARIANT_ID;

export default function VinBackTagCreate({ onClose, onCreated }: Props) {
  const [ownerName, setOwnerName] = useState('');
  const [propertyName, setPropertyName] = useState('');
  const [address, setAddress] = useState('');
  const [contact1, setContact1] = useState('');
  const [contact2Name, setContact2Name] = useState('');
  const [contact2, setContact2] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{ tagId: string; code: string; qrDataUrl: string; link: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [paymentRequired, setPaymentRequired] = useState(false);
  const [error, setError] = useState('');

  const credits = useVinBackCredits();

  const userId = auth.currentUser?.uid;
  const checkoutUrl = vinbackVariantId
    ? `https://malvin.lemonsqueezy.com/checkout/buy/${vinbackVariantId}?embed=1&checkout[custom][user_id]=${userId}&checkout[custom][product]=vinback_tag_credit`
    : null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser?.uid) return;
    if (!ownerName.trim() || !propertyName.trim() || !contact1.trim()) {
      alert('Please fill in the owner name, property name, and at least one contact.');
      return;
    }

    // Checked client-side FIRST so clicking "Generate" on an exhausted
    // account shows the $0.88 popup immediately, instead of firing a
    // network request to createVinBackTag that's guaranteed to be
    // rejected (that 400 is harmless — the function is doing its job —
    // but there's no reason to make the person wait for it). The
    // server-side check in the catch block below stays as a backstop for
    // the case credits.loading hasn't resolved yet, or the count changed
    // in another tab since this screen last read it.
    if (!credits.loading && !credits.canCreate) {
      setPaymentRequired(true);
      return;
    }

    setIsGenerating(true);
    setError('');
    setPaymentRequired(false);
    try {
      // Creation happens entirely server-side now (createVinBackTag) —
      // that's what actually enforces "2 free, then $0.88 each" rather
      // than just displaying it; firestore.rules denies a direct client
      // create on vinbackTags for exactly this reason.
      const create = httpsCallable(functions, 'createVinBackTag');
      const res: any = await create({
        ownerName: ownerName.trim(),
        propertyName: propertyName.trim(),
        address: address.trim(),
        contact1: contact1.trim(),
        contact2Name: contact2Name.trim(),
        contact2: contact2.trim(),
      });

      const { tagId, code } = res.data;
      const link = `${PUBLIC_ORIGIN}/vinback/${tagId}`;
      const qrDataUrl = await generateVinBackQr(link);

      setResult({ tagId, code, qrDataUrl, link });
      onCreated?.();
    } catch (err: any) {
      console.error('Failed to generate VinBack tag:', err);
      if (err?.message?.includes('PAYMENT_REQUIRED') || err?.code === 'functions/failed-precondition') {
        setPaymentRequired(true);
      } else {
        setError('Could not generate this tag. Please try again.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy VinBack link:', err);
    }
  };

  const handleShare = async () => {
    if (!result) return;
    if (!canOpenShareSheet()) {
      handleCopy();
      return;
    }
    const res = await shareContent({ title: 'VinBack Tag', text: `Scan to return: ${propertyName}`, url: result.link });
    if (res === 'failed' || res === 'unsupported') handleCopy();
  };

  const handleDownload = () => {
    if (!result) return;
    const anchor = document.createElement('a');
    anchor.href = result.qrDataUrl;
    anchor.download = `vinback-${propertyName.replace(/\s+/g, '-').toLowerCase() || result.code}.png`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-neutral-400 backdrop-blur-sm z-[60]"
      />
      <div className="fixed inset-0 flex items-center justify-center z-[70] p-4 pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ type: 'spring', damping: 24, stiffness: 240 }}
          className="w-full max-w-sm max-h-[88vh] overflow-y-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-[2rem] p-6 shadow-2xl flex flex-col pointer-events-auto"
        >
          <div className="flex items-center justify-between pb-4 border-b border-neutral-100 dark:border-neutral-800 mb-5">
            <div className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-[#E53935]" />
              <h3 className="text-sm font-black text-neutral-900 dark:text-neutral-50 tracking-tight uppercase">VinBack Tag</h3>
            </div>
            <button
              onClick={onClose}
              className="icon-button p-1.5 bg-neutral-50 dark:bg-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-full border border-neutral-200 dark:border-neutral-700 text-neutral-500 dark:text-neutral-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <AnimatePresence mode="wait">
            {paymentRequired ? (
              <motion.div
                key="paywall"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center text-center gap-3 py-4"
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#E53935]/10">
                  <CreditCard className="w-5 h-5 text-[#E53935]" />
                </div>
                <h4 className="text-sm font-black text-neutral-900 dark:text-neutral-50">
                  This costs ${VINBACK_TAG_PRICE_USD.toFixed(2)} per tag
                </h4>
                <p className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 normal-case leading-relaxed px-2">
                  You've used your {FREE_VINBACK_TAGS} free tags. Your details are saved — pay and come
                  straight back to finish generating this one.
                </p>
                {checkoutUrl ? (
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => window.open(checkoutUrl, '_blank')}
                    className="w-full flex items-center justify-center gap-2 mt-2 py-3.5 rounded-xl border-none font-bold text-xs text-white transition-opacity"
                    style={{ background: '#E53935', boxShadow: '0 10px 25px rgba(229,57,53,0.25)' }}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Continue</span>
                  </motion.button>
                ) : (
                  <p className="text-[11px] text-amber-600 font-semibold">Payments aren't configured yet — contact support.</p>
                )}
                <button
                  onClick={() => setPaymentRequired(false)}
                  className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 mt-1"
                >
                  Back
                </button>
              </motion.div>
            ) : !result ? (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onSubmit={handleGenerate}
                className="space-y-4 text-xs"
              >
                <p className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 normal-case leading-relaxed -mt-1">
                  Generate a QR tag for a personal item. Anyone who scans it sees how to reach you if it's lost.
                </p>

                {!credits.loading && (
                  <div className="text-[10px] font-bold uppercase tracking-wide px-3 py-2 rounded-lg bg-neutral-50 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">
                    {credits.paidCredits > 0
                      ? `${credits.paidCredits} paid credit${credits.paidCredits === 1 ? '' : 's'} available`
                      : credits.freeRemaining > 0
                        ? `${credits.freeRemaining} free tag${credits.freeRemaining === 1 ? '' : 's'} remaining`
                        : `Free tags used — $${VINBACK_TAG_PRICE_USD.toFixed(2)} per additional tag`}
                  </div>
                )}

                <div>
                  <label className={labelClass}>Owner's name</label>
                  <input
                    value={ownerName} onChange={(e) => setOwnerName(e.target.value)} required
                    placeholder="e.g., Jane Doe"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Property name</label>
                  <input
                    value={propertyName} onChange={(e) => setPropertyName(e.target.value)} required
                    placeholder="e.g., Jane's Backpack"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Address <span className="normal-case text-neutral-300 dark:text-neutral-600 font-semibold">(optional)</span></label>
                  <input
                    value={address} onChange={(e) => setAddress(e.target.value)}
                    placeholder="Where should it be returned?"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Your phone or email</label>
                  <input
                    value={contact1} onChange={(e) => setContact1(e.target.value)} required
                    placeholder="Phone or email"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className={labelClass}>Secondary contact <span className="normal-case text-neutral-300 dark:text-neutral-600 font-semibold">(optional)</span></label>
                  <input
                    value={contact2Name} onChange={(e) => setContact2Name(e.target.value)}
                    placeholder="Name"
                    className={`${inputClass} mb-2`}
                  />
                  <input
                    value={contact2} onChange={(e) => setContact2(e.target.value)}
                    placeholder="Their phone or email"
                    className={inputClass}
                  />
                </div>

                {error && <p className="text-[11px] font-semibold text-red-500 normal-case">{error}</p>}

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isGenerating}
                  className="w-full flex items-center justify-center gap-2 mt-2 py-3.5 rounded-xl border-none font-bold text-xs text-white transition-opacity"
                  style={{ background: '#E53935', boxShadow: '0 10px 25px rgba(229,57,53,0.25)', opacity: isGenerating ? 0.7 : 1 }}
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                  <span>
                    {isGenerating
                      ? 'Generating…'
                      : !credits.loading && credits.paidCredits === 0 && credits.freeRemaining === 0
                        ? `Generate Tag — $${VINBACK_TAG_PRICE_USD.toFixed(2)}`
                        : 'Generate Tag'}
                  </span>
                </motion.button>
              </motion.form>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center text-center gap-2"
              >
                <div className="rounded-2xl overflow-hidden border border-neutral-200 dark:border-neutral-700 p-2 bg-white">
                  <img src={result.qrDataUrl} alt="VinBack QR" className="w-48 h-auto" />
                </div>
                <div className="text-sm font-black tracking-wide text-[#E53935] mt-1 font-mono">{result.code}</div>
                <p className="text-[11px] font-medium text-neutral-400 dark:text-neutral-500 normal-case leading-relaxed px-2">
                  Print this, or stick the QR onto your item. Anyone who scans it lands on your return page.
                </p>

                <div className="flex gap-2 mt-2 flex-wrap justify-center">
                  <button
                    onClick={handleCopy}
                    className="icon-button flex items-center gap-1.5 text-[11px] font-bold px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copied' : 'Copy link'}
                  </button>
                  <button
                    onClick={handleShare}
                    className="icon-button flex items-center gap-1.5 text-[11px] font-bold px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                  >
                    <Share2 className="w-3.5 h-3.5" /> Share
                  </button>
                  <button
                    onClick={handleDownload}
                    className="icon-button flex items-center gap-1.5 text-[11px] font-bold px-3 py-2 rounded-xl bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                </div>

                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="w-full mt-4 py-3 rounded-xl border-none font-bold text-xs text-white transition-opacity"
                  style={{ background: '#171717' }}
                >
                  Done
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  );
}