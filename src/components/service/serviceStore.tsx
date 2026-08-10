import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { firestore as db, auth, storage } from '../../firebase';
import { applyStorefrontIdentity } from '../../services/storefrontAuth';
import { getDatabase, ref, onValue } from 'firebase/database';
import { doc, getDoc, collection, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Star, ShieldCheck, Clock, MapPin, BadgeCheck, Sparkles, Camera, X, Loader2, CheckCircle2, ArrowLeft, Receipt } from 'lucide-react';
import Banned from '../addons/Banned';
import Suspended from '../addons/Suspended';
import Report from '../addons/report';
import { resolveVerifiedFlag } from '../../utils/verification';
import { SERVICE_CATEGORIES, resolvePrimaryCategory } from '../../utils/serviceCategories';
import { URGENCY_OPTIONS, type UrgencyLevel } from '../../utils/serviceRequests';

interface ServiceProfile {
  businessName: string;
  bio: string;
  address: string;
  openingTime: string;
  closingTime: string;
  isVerified?: boolean;
  categoriesOffered?: string[];
  allowNegotiation?: boolean;
  heroImage?: string;
}

interface ServiceLineItem {
  itemId: string;
  name: string;
  price: number;
  description: string;
}

export default function ServiceStore() {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();
  // True only when this page is genuinely embedded in StoreFront's iframe
  // (see components/customer/StoreFront.tsx) — vs. a shared link opened
  // directly in a normal tab, or the native app's own top-level route,
  // where window.parent === window and there's no outer chrome at all.
  const isEmbedded = typeof window !== 'undefined' && window.parent !== window;
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<ServiceProfile | null>(null);
  const [priceList, setPriceList] = useState<ServiceLineItem[]>([]);
  const [customerUid, setCustomerUid] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);
  const [averageRating, setAverageRating] = useState(0);
  const [totalRatingsCount, setTotalRatingsCount] = useState(0);
  const [isReportOpen, setIsReportOpen] = useState(false);

  // Request form
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [problem, setProblem] = useState('');
  const [address, setAddress] = useState('');
  // Optional — a business without live scheduling still needs to know
  // roughly when the customer wants this done, so it's a plain text field
  // rather than a rigid date/time picker (lets someone write "tomorrow
  // morning" or "after 6pm" just as easily as an exact time).
  const [preferredTime, setPreferredTime] = useState('');
  // Required — how fast the business needs to react. Separate from
  // preferredTime on purpose: urgency is what a manager triages the job
  // board by (Emergency jobs need to jump the queue), while preferredTime
  // is just a scheduling note for once it's been picked up.
  const [urgency, setUrgency] = useState<UrgencyLevel | ''>('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const theme = resolvePrimaryCategory(provider?.categoriesOffered);

  // 🤝 STOREFRONT HANDSHAKE — announces readiness to StoreFront's iframe
  // wrapper (see components/customer/StoreFront.tsx, which matches any
  // "*_READY" message generically) and picks up identity via postMessage,
  // since this page may run in a fresh browsing context that doesn't share
  // the parent app's Firebase Auth session.
  useEffect(() => {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'SERVICE_READY' }, '*');
    }
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'MALVIN_USER' && event.data?.uid) {
        setCustomerUid(event.data.uid);
        // Real Firebase Auth session on this origin from the parent's
        // minted custom token — see services/storefrontAuth.ts for why a
        // bare uid alone leaves Firestore's own security rules unable to
        // verify anything, causing "Missing or insufficient permissions".
        applyStorefrontIdentity(auth, event.data.customToken);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // Falls back to direct Firebase Auth when opened outside the iframe (a
  // shared link in a normal tab, or the native app's own top-level route).
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) setCustomerUid((prev) => prev || user.uid);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!uid) return;
    getDoc(doc(db, 'serviceProviders', uid)).then((snap) => {
      if (snap.exists()) {
        setProvider(snap.data() as ServiceProfile);
      } else {
        setProvider({
          businessName: 'This Provider',
          bio: "This business hasn't finished setting up its profile yet.",
          address: '',
          openingTime: '08:00',
          closingTime: '18:00',
          categoriesOffered: [],
        });
      }
      setLoading(false);
    });

    const unsubItems = onSnapshot(
      collection(db, 'serviceProviders', uid, 'priceList'),
      (snap) => {
        const items: ServiceLineItem[] = [];
        snap.forEach((d) => items.push({ itemId: d.id, ...d.data() } as ServiceLineItem));
        items.sort((a, b) => a.name.localeCompare(b.name));
        setPriceList(items);
      },
      (err) => console.error('Failed to load price list:', err)
    );

    // A category-namespaced document WITHIN the existing store_ratings
    // collection — deliberately NOT `store_ratings/{uid}` (the doc id
    // Mechanic, Food, and Salon all read/write), so a Service business
    // never averages into the same star rating as a Mechanic business
    // sharing the same uid. It stays inside `store_ratings` itself (rather
    // than a brand-new top-level collection) so it's covered by whatever
    // security rules already grant read access to that collection — a new
    // collection name needs its own rule added in the Firebase console
    // before clients can read it, which is what caused the
    // "Missing or insufficient permissions" error.
    const serviceRatingStoreId = `service_${uid}`;
    const unsubRatings = onSnapshot(
      collection(db, 'store_ratings', serviceRatingStoreId, 'user_ratings'),
      (snap) => {
        if (snap.empty) {
          setAverageRating(0);
          setTotalRatingsCount(0);
          return;
        }
        let total = 0;
        snap.forEach((d) => { total += Number(d.data().stars || 0); });
        setAverageRating(total / snap.size);
        setTotalRatingsCount(snap.size);
      },
      (err) => console.error('Failed to load ratings:', err)
    );

    const rtdb = getDatabase();
    const userRef = ref(rtdb, `users/${uid}`);
    const unsubRtdb = onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setIsVerified(resolveVerifiedFlag(data, provider));
        setIsBanned(data.status === 'Banned' || data.banned === true);
        setIsSuspended(data.status === 'Suspended' || data.suspended === true);
      }
    });

    return () => {
      unsubItems();
      unsubRatings();
      unsubRtdb();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);

  if (isBanned) return <Banned />;
  if (isSuspended) return <Suspended />;

  const handlePhotoSelect = async (file: File | null) => {
    if (!file || !uid) return;
    setIsUploadingPhoto(true);
    try {
      const path = `serviceProviders/${uid}/request-photos/${customerUid || 'guest'}_${Date.now()}_${file.name}`;
      const fileRef = storageRef(storage, path);
      const snap = await uploadBytes(fileRef, file);
      const url = await getDownloadURL(snap.ref);
      setPhotoUrl(url);
    } catch (err) {
      console.error('Failed to upload request photo:', err);
      alert('Could not upload that photo. Please try again.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || isUploadingPhoto) return;
    if (!problem.trim() || !address.trim()) {
      alert('Please describe the problem and add your location.');
      return;
    }
    if (!urgency) {
      alert('Please let them know how urgent this is.');
      return;
    }
    setIsSubmitting(true);
    try {
      const requestId = `req_${Date.now()}`;
      // Written directly into the business's own subcollection — same
      // pattern mechanics/{uid}/repair_requests already relies on for a
      // customer to be able to create it in the first place.
      await setDoc(doc(db, 'serviceProviders', uid, 'serviceRequests', requestId), {
        requestId,
        customerUid: customerUid || 'guest_user',
        problem: problem.trim(),
        photoUrl: photoUrl || '',
        address: address.trim(),
        preferredTime: preferredTime.trim(),
        urgency,
        status: 'requested',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setSubmitted(true);
      setProblem('');
      setAddress('');
      setPreferredTime('');
      setUrgency('');
      setPhotoUrl('');
    } catch (err) {
      console.error('Failed to submit service request:', err);
      alert('Could not send this request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !provider) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', color: '#94a3b8' }}>
        Loading…
      </div>
    );
  }

  // Mirrors StoreFront.tsx's own "Malvin Secure View" back arrow (which
  // this page never sees when it's NOT running inside that iframe — a
  // shared link opened in a plain tab, or the native app's own top-level
  // /service/:uid route, has zero surrounding chrome otherwise).
  const handleBack = () => {
    if (isEmbedded) {
      // Let the parent shell handle it exactly the way its own back arrow
      // does, rather than trying to unmount the iframe from inside itself.
      window.parent.postMessage({ type: 'STORE_BACK' }, '*');
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/');
    }
  };

  // Same "embedded vs. standalone" split as handleBack: inside the iframe,
  // ask the parent shell to close this store AND open its Receipts
  // drawer (see StoreFront.tsx's message listener + Front.tsx's
  // onOpenReceipts prop). Standalone, there's no parent shell to ask —
  // drop a one-shot flag and land on '/', where Front.tsx checks for it
  // on mount and opens the drawer itself (same pattern as
  // AppOpenGate.tsx's pending-deep-link handoff).
  const handleGoToReceipts = () => {
    if (isEmbedded) {
      window.parent.postMessage({ type: 'CLOSE_AND_OPEN_RECEIPTS' }, '*');
      return;
    }
    try {
      sessionStorage.setItem('malvinai_open_receipts_on_load', '1');
    } catch {
      // Storage unavailable — worst case they land on '/' and open
      // Receipts manually instead of it opening for them.
    }
    navigate('/');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: 'sans-serif', paddingBottom: '80px', position: 'relative' }}>
      {/* Signed-out backstop — AppOpenGate only covers mobile visitors who
          arrived without the app; this catches EVERYONE genuinely not
          logged in (desktop included), before they hit a raw Firestore
          permission error trying to submit a request. Store details still
          render underneath — this only blocks interaction, not viewing. */}

      {/* IN-PAGE BACK BUTTON — StoreFront.tsx already draws its own back
          arrow around this page when it's embedded in the iframe, so this
          floats a second, small one directly on the hero instead of a full
          header bar (avoids two stacked nav rows in that case). When this
          page is NOT embedded, it's the only way back at all. */}
      <button
        onClick={handleBack}
        aria-label="Back"
        style={{
          position: 'absolute', top: '16px', left: '16px', zIndex: 10,
          width: '34px', height: '34px', borderRadius: '9999px',
          background: 'rgba(255,255,255,0.22)', border: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', backdropFilter: 'blur(6px)',
        }}
      >
        <ArrowLeft size={18} color="#fff" />
      </button>

      {/* Themed hero — the whole point of the category system: this block's
          color follows whichever category resolvePrimaryCategory() picked
          for this provider, with zero per-category code branching here. */}
      <div style={{ background: theme.gradient, padding: '28px 20px 24px', color: '#fff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', opacity: 0.85, marginBottom: '6px' }}>
          <span style={{ fontSize: '14px' }}>{theme.emoji}</span> {theme.label}
        </div>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '8px' }}>
          {provider.businessName}
          {isVerified && (
            <span title="Verified provider" style={{ display: 'inline-flex' }}>
              <BadgeCheck size={18} />
            </span>
          )}
        </h1>
        {provider.bio && <p style={{ margin: '8px 0 0', fontSize: '13px', opacity: 0.9, maxWidth: '480px' }}>{provider.bio}</p>}
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', marginTop: '14px', fontSize: '12px', fontWeight: 700 }}>
          {totalRatingsCount > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Star size={13} fill="#fff" /> {averageRating.toFixed(1)} ({totalRatingsCount})
            </span>
          )}
          {provider.address && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <MapPin size={13} /> {provider.address}
            </span>
          )}
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={13} /> {provider.openingTime}–{provider.closingTime}
          </span>
        </div>
        {provider.categoriesOffered && provider.categoriesOffered.length > 1 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px' }}>
            {provider.categoriesOffered.map((key) => {
              const cat = SERVICE_CATEGORIES.find((c) => c.key === key);
              if (!cat) return null;
              return (
                <span key={key} style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '9999px', padding: '3px 10px', fontSize: '11px', fontWeight: 700 }}>
                  {cat.emoji} {cat.label}
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* Price list */}
      <div style={{ padding: '20px', maxWidth: '560px', margin: '0 auto' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
          <Sparkles size={15} color={theme.color} /> What they charge
        </h3>

        {priceList.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#64748b' }}>This provider hasn't listed pricing yet — you can still send a request and they'll quote you directly.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
            {priceList.map((item) => (
              <div key={item.itemId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 14px' }}>
                <div>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{item.name}</p>
                  {item.description && <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748b' }}>{item.description}</p>}
                </div>
                <span style={{ fontSize: '14px', fontWeight: 900, color: theme.color, flexShrink: 0, marginLeft: '10px' }}>€{item.price.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {provider.allowNegotiation && (
          <p style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '16px' }}>
            <ShieldCheck size={13} color={theme.color} /> This provider accepts price negotiation on quotes.
          </p>
        )}

        {/* Request button — opens the request form modal below. */}
        <button
          onClick={() => { setIsRequestOpen(true); setSubmitted(false); }}
          style={{
            width: '100%', padding: '14px', borderRadius: '14px', border: 'none',
            background: theme.gradient, color: '#fff', fontSize: '14px', fontWeight: 800,
            cursor: 'pointer', boxShadow: `0 8px 20px ${theme.tint}`,
          }}
        >
          Request This Service
        </button>

        <button
          onClick={() => setIsReportOpen(true)}
          style={{ display: 'block', margin: '18px auto 0', background: 'none', border: 'none', fontSize: '11px', color: '#94a3b8', cursor: 'pointer', textDecoration: 'underline' }}
        >
          Report this business
        </button>
      </div>

      {/* Request form modal */}
      {isRequestOpen && (
        <div
          onClick={() => setIsRequestOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '480px', background: '#fff', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', padding: '22px 20px 28px', maxHeight: '88vh', overflowY: 'auto' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 900, color: '#0f172a' }}>Request This Service</h3>
              <button onClick={() => setIsRequestOpen(false)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '9999px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            </div>

            {submitted ? (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <CheckCircle2 size={40} color={theme.color} style={{ marginBottom: '10px' }} />
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>Your request has been placed</p>
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#64748b' }}>
                  {provider.businessName} will review it and send you a quote. Track the status of your request any time in your Receipts.
                </p>
                <button
                  onClick={handleGoToReceipts}
                  style={{
                    marginTop: '16px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    background: theme.gradient, color: '#fff', border: 'none', borderRadius: '12px', padding: '13px', fontSize: '14px', fontWeight: 800, cursor: 'pointer',
                  }}
                >
                  <Receipt size={16} /> Go to Receipts
                </button>
                <button onClick={() => setIsRequestOpen(false)} style={{ marginTop: '10px', background: 'none', border: 'none', color: '#94a3b8', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>
                  Keep browsing instead
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmitRequest} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>How urgent is this?</label>
                  <div style={{ marginTop: '6px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {URGENCY_OPTIONS.map((opt) => {
                      const selected = urgency === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setUrgency(opt.value)}
                          style={{
                            display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px',
                            padding: '10px 12px', borderRadius: '10px', textAlign: 'left', cursor: 'pointer',
                            border: selected ? `1.5px solid ${opt.color}` : '1px solid #e2e8f0',
                            background: selected ? opt.bg : '#ffffff',
                          }}
                        >
                          <span style={{ fontSize: '13px', fontWeight: 800, color: selected ? opt.color : '#0f172a' }}>
                            {opt.emoji} {opt.label}
                          </span>
                          <span style={{ fontSize: '10.5px', color: '#64748b' }}>{opt.hint}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Describe the problem</label>
                  <textarea
                    value={problem}
                    onChange={(e) => setProblem(e.target.value)}
                    placeholder="e.g. Kitchen tap has been leaking since this morning"
                    required
                    style={{ width: '100%', boxSizing: 'border-box', marginTop: '6px', minHeight: '90px', resize: 'vertical', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', outline: 'none', fontFamily: 'inherit', background: '#ffffff', color: '#0f172a', colorScheme: 'light' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Photo (optional)</label>
                  <div style={{ marginTop: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {photoUrl ? (
                      <img src={photoUrl} alt="Attached" style={{ width: '56px', height: '56px', borderRadius: '10px', objectFit: 'cover' }} />
                    ) : (
                      <label style={{ width: '56px', height: '56px', borderRadius: '10px', border: '1.5px dashed #cbd5e1', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                        {isUploadingPhoto ? <Loader2 size={18} className="animate-spin" color="#94a3b8" /> : <Camera size={18} color="#94a3b8" />}
                        <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => handlePhotoSelect(e.target.files?.[0] || null)} />
                      </label>
                    )}
                    {photoUrl && (
                      <button type="button" onClick={() => setPhotoUrl('')} style={{ fontSize: '11px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Your address</label>
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Where should they come to?"
                    required
                    style={{ width: '100%', boxSizing: 'border-box', marginTop: '6px', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', outline: 'none', background: '#ffffff', color: '#0f172a', colorScheme: 'light' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Preferred time (optional)</label>
                  <input
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    placeholder="e.g. Tomorrow morning, or Sat after 2pm"
                    style={{ width: '100%', boxSizing: 'border-box', marginTop: '6px', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '10px 12px', fontSize: '13px', outline: 'none', background: '#ffffff', color: '#0f172a', colorScheme: 'light' }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || isUploadingPhoto}
                  style={{ marginTop: '6px', background: theme.gradient, color: '#fff', border: 'none', borderRadius: '12px', padding: '13px', fontSize: '14px', fontWeight: 800, cursor: 'pointer', opacity: isSubmitting || isUploadingPhoto ? 0.6 : 1 }}
                >
                  {isSubmitting ? 'Sending…' : 'Send Request'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {isReportOpen && uid && (
        <Report
          isOpen={isReportOpen}
          onClose={() => setIsReportOpen(false)}
          reportedUserUid={uid}
          currentUserUid={auth.currentUser?.uid || customerUid || localStorage.getItem('guest_id') || 'anonymous_guest'}
        />
      )}
    </div>
  );
}