import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { firestore as db, auth } from '../../firebase';
import { getDatabase, ref, onValue } from 'firebase/database';
import {
  doc, getDoc, setDoc, deleteDoc, onSnapshot, collection, serverTimestamp,
} from 'firebase/firestore';
import {
  Sparkles, Clock, QrCode, Trash2, DollarSign, Copy, Share2, Download,
  BadgeCheck, Plus, Pencil, Handshake, Check, Inbox, History as HistoryIcon,
  MapPin, ImageIcon, X, ScanLine, ThumbsUp, ThumbsDown,
} from 'lucide-react';
import QRCodeLib from 'qrcode';
import { shareContent, canOpenShareSheet } from '../../services/share';
import { publicOrigin } from '../../services/vinLink';
import Banned from '../addons/Banned';
import Suspended from '../addons/Suspended';
import ConfirmQRScanner from '../addons/ConfirmQRScanner';
import { geocodeAddress } from '../../utils/geocoding';
import { useAccountStanding } from '../../hooks/useAccountStanding';
import { SERVICE_CATEGORIES, resolvePrimaryCategory } from '../../utils/serviceCategories';
import { buildServiceReferenceId, writeServiceReceipt, syncServiceRequestStatus, QuoteLineItem } from '../../utils/serviceRequests';
import { pushNotification } from '../customer/Notification';

interface ServiceLineItem {
  itemId: string;
  name: string;
  price: number;
  description: string;
}

interface ServiceRequestDoc {
  requestId: string;
  customerUid: string;
  problem: string;
  photoUrl?: string;
  address: string;
  status: 'requested' | 'quoted' | 'paid' | 'completed' | 'cancelled' | 'expired';
  quote?: { items: QuoteLineItem[]; total: number };
  negotiationOffer?: { amount: number; status: 'pending' | 'accepted' | 'rejected' } | null;
  referenceId?: string;
  createdAt?: any;
}

const ACTIVE_STATUSES: ServiceRequestDoc['status'][] = ['requested', 'quoted', 'paid'];
const HISTORY_STATUSES: ServiceRequestDoc['status'][] = ['completed', 'cancelled', 'expired'];

export default function ServiceDashboard() {
  const navigate = useNavigate();
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [businessName, setBusinessName] = useState('Service Provider');

  // Profile editor
  const [profileOpen, setProfileOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formBio, setFormBio] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formOpening, setFormOpening] = useState('08:00');
  const [formClosing, setFormClosing] = useState('18:00');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [hasCoords, setHasCoords] = useState(false);

  // Categories offered — this drives the whole theme. Selecting/deselecting
  // saves immediately (no separate "save" step) so the color preview below
  // always matches what's actually live.
  const [categoriesOffered, setCategoriesOffered] = useState<string[]>([]);
  const [isSavingCategories, setIsSavingCategories] = useState(false);

  // Negotiation toggle — the data half of the negotiate flow. The actual
  // negotiate UI on the customer's checkout receipt is a later phase; this
  // just makes sure the flag exists and is editable from day one, so that
  // phase doesn't also need a settings migration.
  const [allowNegotiation, setAllowNegotiation] = useState(false);

  // Price list — the "basic things they do" with a price attached, shown to
  // the customer before they ever send a request.
  const [priceList, setPriceList] = useState<ServiceLineItem[]>([]);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemName, setItemName] = useState('');
  const [itemPrice, setItemPrice] = useState('');
  const [itemDescription, setItemDescription] = useState('');
  const [isSavingItem, setIsSavingItem] = useState(false);

  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // Requests job board
  const [requests, setRequests] = useState<ServiceRequestDoc[]>([]);
  const [boardTab, setBoardTab] = useState<'active' | 'history'>('active');
  const [quotingRequest, setQuotingRequest] = useState<ServiceRequestDoc | null>(null);
  const [quoteItems, setQuoteItems] = useState<QuoteLineItem[]>([{ label: '', amount: 0 }]);
  const [isSendingQuote, setIsSendingQuote] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const { isVerified } = useAccountStanding(uid);
  const [isBanned, setIsBanned] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);

  const theme = useMemo(() => resolvePrimaryCategory(categoriesOffered), [categoriesOffered]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) setUid(user.uid);
      else navigate('/login');
    });
    return () => unsub();
  }, [navigate]);

  useEffect(() => {
    if (!uid) return;

    const unsubItems = onSnapshot(
      collection(db, 'serviceProviders', uid, 'priceList'),
      (snap) => {
        const items: ServiceLineItem[] = [];
        snap.forEach((d) => items.push({ itemId: d.id, ...d.data() } as ServiceLineItem));
        items.sort((a, b) => a.name.localeCompare(b.name));
        setPriceList(items);
      },
      (err) => console.error('Failed to load service price list:', err)
    );

    const unsubRequests = onSnapshot(
      collection(db, 'serviceProviders', uid, 'serviceRequests'),
      (snap) => {
        const items: ServiceRequestDoc[] = [];
        snap.forEach((d) => items.push({ requestId: d.id, ...d.data() } as ServiceRequestDoc));
        items.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setRequests(items);
      },
      (err) => console.error('Failed to load service requests:', err)
    );

    const rtdb = getDatabase();
    const userRef = ref(rtdb, `users/${uid}`);
    onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setIsBanned(data.status === 'Banned' || data.banned === true);
        setIsSuspended(data.status === 'Suspended' || data.suspended === true);
      }
    });

    getDoc(doc(db, 'serviceProviders', uid))
      .then((snap) => {
        setLoading(false);
        if (!snap.exists()) return;
        const data = snap.data();
        const name = data.businessName || 'Service Provider';
        setBusinessName(name);
        setFormName(name);
        setFormBio(data.bio || '');
        setFormAddress(data.address || '');
        setFormOpening(data.openingTime || '08:00');
        setFormClosing(data.closingTime || '18:00');
        setHasCoords(Boolean(data.latitude && data.longitude));
        setCategoriesOffered(Array.isArray(data.categoriesOffered) ? data.categoriesOffered : []);
        setAllowNegotiation(data.allowNegotiation === true);
      })
      .catch((err) => {
        console.error('Failed to read service provider profile:', err);
        setLoading(false);
      });

    return () => {
      unsubItems();
      unsubRequests();
    };
  }, [uid]);

  // --- Job board actions ---

  const openQuoteModal = (r: ServiceRequestDoc) => {
    setQuotingRequest(r);
    setQuoteItems(r.quote?.items?.length ? r.quote.items : [{ label: '', amount: 0 }]);
  };

  const quoteTotal = useMemo(
    () => quoteItems.reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    [quoteItems]
  );

  const handleSendQuote = async () => {
    if (!uid || !quotingRequest) return;
    const cleanItems = quoteItems.filter((i) => i.label.trim() && i.amount > 0);
    if (cleanItems.length === 0) {
      alert('Add at least one priced line item.');
      return;
    }
    setIsSendingQuote(true);
    try {
      const referenceId = quotingRequest.referenceId || buildServiceReferenceId();
      const total = cleanItems.reduce((sum, item) => sum + item.amount, 0);

      await setDoc(
        doc(db, 'serviceProviders', uid, 'serviceRequests', quotingRequest.requestId),
        {
          status: 'quoted',
          quote: { items: cleanItems, total },
          referenceId,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      await writeServiceReceipt({
        requestId: quotingRequest.requestId,
        customerUid: quotingRequest.customerUid,
        businessUid: uid,
        businessName,
        categoryKey: theme.key,
        problem: quotingRequest.problem,
        photoUrl: quotingRequest.photoUrl,
        address: quotingRequest.address,
        quote: { items: cleanItems, total },
        allowNegotiation,
        referenceId,
      });

      if (quotingRequest.customerUid && quotingRequest.customerUid !== 'guest_user') {
        pushNotification(
          quotingRequest.customerUid,
          'new_receipt',
          'Quote received',
          `${businessName} sent you a quote for €${total.toFixed(2)} — check your Receipts.`
        );
      }

      setQuotingRequest(null);
    } catch (err) {
      console.error('Failed to send quote:', err);
      alert('Could not send this quote. Please try again.');
    } finally {
      setIsSendingQuote(false);
    }
  };

  const handleDeclineRequest = async (r: ServiceRequestDoc) => {
    if (!uid || !window.confirm('Decline this request?')) return;
    await setDoc(doc(db, 'serviceProviders', uid, 'serviceRequests', r.requestId), { status: 'cancelled', updatedAt: serverTimestamp() }, { merge: true });
  };

  const handleNegotiationResponse = async (r: ServiceRequestDoc, accept: boolean) => {
    if (!uid || !r.negotiationOffer) return;
    if (accept) {
      const newTotal = r.negotiationOffer.amount;
      await syncServiceRequestStatus(uid, r.customerUid, r.requestId, {
        quote: { items: r.quote?.items || [], total: newTotal },
        negotiationOffer: { ...r.negotiationOffer, status: 'accepted' },
      });
      pushNotification(r.customerUid, 'new_receipt', 'Offer accepted', `${businessName} accepted your offer of €${newTotal.toFixed(2)} — you can pay now.`);
    } else {
      await syncServiceRequestStatus(uid, r.customerUid, r.requestId, {
        negotiationOffer: { ...r.negotiationOffer, status: 'rejected' },
      });
      pushNotification(r.customerUid, 'new_receipt', 'Offer declined', `${businessName} declined your offer. The original quote still stands.`);
    }
  };

  // Scan-to-complete — the reference id is encoded into the customer's
  // receipt QR the same way every other business type's is (see Front.tsx's
  // unified QR generation), so decoding just needs to match it against a
  // 'paid' request on this board.
  const handleScanCrosscheck = async (decoded: string) => {
    let refId = decoded;
    try {
      const parsed = JSON.parse(decoded);
      if (parsed?.referenceId) refId = parsed.referenceId;
    } catch {
      /* plain text code, not JSON — used as-is */
    }
    const match = requests.find((r) => r.referenceId === refId && r.status === 'paid');
    if (!match || !uid) {
      alert('No matching paid job found for that code.');
      return;
    }
    await syncServiceRequestStatus(uid, match.customerUid, match.requestId, {
      status: 'completed',
      completedAt: serverTimestamp(),
    });
    setIsScannerOpen(false);
    alert(`Marked "${match.problem.slice(0, 40)}" as completed.`);
  };

  const activeRequests = requests.filter((r) => ACTIVE_STATUSES.includes(r.status));
  const historyRequests = requests.filter((r) => HISTORY_STATUSES.includes(r.status));

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !formName.trim()) return;
    setIsSavingProfile(true);
    try {
      const coords = await geocodeAddress(formAddress.trim());
      await setDoc(
        doc(db, 'serviceProviders', uid),
        {
          businessName: formName.trim(),
          bio: formBio.trim(),
          address: formAddress.trim(),
          openingTime: formOpening,
          closingTime: formClosing,
          vinLink: `/service/${uid}`,
          ...(coords ? { latitude: coords.latitude, longitude: coords.longitude } : {}),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setBusinessName(formName.trim());
      if (coords) setHasCoords(true);
      setProfileOpen(false);
      if (!coords && formAddress.trim()) {
        alert("Saved — but that address couldn't be located, so you won't show under Nearby yet. Try a more specific address.");
      }
    } catch (err) {
      console.error('Failed to save service provider profile:', err);
      alert('Could not save your profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Toggling a category chip writes immediately — there's no "unsaved
  // changes" state for this section, since the whole point is the color
  // preview always reflecting what's actually live on the storefront.
  const toggleCategory = async (key: string) => {
    if (!uid) return;
    const next = categoriesOffered.includes(key)
      ? categoriesOffered.filter((k) => k !== key)
      : [...categoriesOffered, key];
    setCategoriesOffered(next); // optimistic
    setIsSavingCategories(true);
    try {
      await setDoc(doc(db, 'serviceProviders', uid), { categoriesOffered: next }, { merge: true });
    } catch (err) {
      console.error('Failed to save categories offered:', err);
      setCategoriesOffered(categoriesOffered); // roll back
    } finally {
      setIsSavingCategories(false);
    }
  };

  const toggleAllowNegotiation = async () => {
    if (!uid) return;
    const next = !allowNegotiation;
    setAllowNegotiation(next);
    try {
      await setDoc(doc(db, 'serviceProviders', uid), { allowNegotiation: next }, { merge: true });
    } catch (err) {
      console.error('Failed to save negotiation setting:', err);
      setAllowNegotiation(!next);
    }
  };

  const openAddItem = () => {
    setEditingItemId(null);
    setItemName('');
    setItemPrice('');
    setItemDescription('');
    setItemModalOpen(true);
  };

  const openEditItem = (item: ServiceLineItem) => {
    setEditingItemId(item.itemId);
    setItemName(item.name);
    setItemPrice(String(item.price));
    setItemDescription(item.description);
    setItemModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) return;
    const price = parseFloat(itemPrice);
    if (!itemName.trim() || isNaN(price) || price <= 0) {
      alert('Please fill in a valid name and price.');
      return;
    }
    setIsSavingItem(true);
    try {
      const targetId = editingItemId || `item_${Date.now()}`;
      await setDoc(
        doc(db, 'serviceProviders', uid, 'priceList', targetId),
        {
          name: itemName.trim(),
          price,
          description: itemDescription.trim(),
          ...(editingItemId ? {} : { createdAt: serverTimestamp() }),
        },
        { merge: true }
      );
      setItemModalOpen(false);
    } catch (err) {
      console.error('Failed to save price list item:', err);
      alert('Could not save this item. Please try again.');
    } finally {
      setIsSavingItem(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!uid || !window.confirm('Remove this item from your price list?')) return;
    await deleteDoc(doc(db, 'serviceProviders', uid, 'priceList', itemId));
  };

  // --- VINQR ---
  const vinLink = uid ? `${publicOrigin()}/service/${uid}` : '';

  useEffect(() => {
    if (!vinLink) return;
    QRCodeLib.toDataURL(vinLink, { width: 250, margin: 2, color: { dark: theme.color } })
      .then((url) => setQrCodeUrl(url))
      .catch((err) => console.error('Error generating VINQR code:', err));
  }, [vinLink, theme.color]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(vinLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  const handleShareLink = async () => {
    if (!canOpenShareSheet()) {
      handleCopyLink();
      return;
    }
    const result = await shareContent({ title: businessName, text: 'Book a service with us on Malvin', url: vinLink });
    if (result === 'failed' || result === 'unsupported') handleCopyLink();
  };

  const handleDownloadQr = () => {
    if (!qrCodeUrl) return;
    const anchor = document.createElement('a');
    anchor.href = qrCodeUrl;
    anchor.download = `${businessName.replace(/\s+/g, '-').toLowerCase() || 'service'}-qr.png`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  if (isBanned) return <Banned />;
  if (isSuspended) return <Suspended />;
  if (loading) {
    return <div style={{ ...dashboardStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading…</div>;
  }

  return (
    <div style={dashboardStyle}>
      {/* Header — background tints toward whatever category currently
          drives the theme, so the shift from "generic dashboard" to
          "branded workspace" is felt immediately after picking a category
          below, not just seen in a swatch. */}
      <div
        style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '20px', flexWrap: 'wrap', gap: '10px',
          padding: '18px', borderRadius: '16px',
          background: theme.gradient,
          transition: 'background 0.4s ease',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', display: 'flex', alignItems: 'center', gap: '8px', color: '#fff' }}>
            <span style={{ fontSize: '22px' }}>{theme.emoji}</span> {businessName}
            {isVerified && (
              <span
                title="Verified provider"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: '20px', padding: '4px 9px' }}
              >
                <BadgeCheck size={12} /> Verified
              </span>
            )}
          </h1>
          <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.85)', fontSize: '13px' }}>
            {categoriesOffered.length > 0
              ? categoriesOffered.map((k) => SERVICE_CATEGORIES.find((c) => c.key === k)?.label).filter(Boolean).join(' · ')
              : 'Pick your services below to brand your workspace'}
          </p>
        </div>
        <button onClick={() => setProfileOpen(true)} style={{ ...secondaryBtn, background: 'rgba(255,255,255,0.2)', color: '#fff' }}>
          Business Profile
          {!hasCoords && (
            <span
              title="Add an address so customers can find you under Nearby"
              style={{ marginLeft: 6, width: 7, height: 7, borderRadius: '50%', background: '#fbbf24', display: 'inline-block' }}
            />
          )}
        </button>
      </div>

      {/* VINQR / share card */}
      <div style={{ ...cardStyle, marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        {qrCodeUrl ? (
          <img src={qrCodeUrl} alt="Service VINQR" style={{ width: '110px', height: '110px', borderRadius: '10px', background: '#fff', padding: '6px', flexShrink: 0 }} />
        ) : (
          <div style={{ width: '110px', height: '110px', borderRadius: '10px', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <QrCode size={28} color="#475569" />
          </div>
        )}
        <div style={{ flex: 1, minWidth: '180px' }}>
          <p style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Your VINQR</p>
          <p style={{ margin: '0 0 12px', fontSize: '11px', color: '#64748b', wordBreak: 'break-all' }}>{vinLink}</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={handleCopyLink} style={{ ...secondaryBtn, background: theme.tint, color: theme.color }}>
              {copied ? <Check size={13} /> : <Copy size={13} />} {copied ? 'Copied' : 'Copy link'}
            </button>
            <button onClick={handleShareLink} style={{ ...secondaryBtn, background: theme.tint, color: theme.color }}>
              <Share2 size={13} /> Share
            </button>
            <button onClick={handleDownloadQr} disabled={!qrCodeUrl} style={{ ...secondaryBtn, opacity: qrCodeUrl ? 1 : 0.5, cursor: qrCodeUrl ? 'pointer' : 'not-allowed' }}>
              <Download size={13} /> Download QR
            </button>
          </div>
        </div>
      </div>

      {/* Requests job board — the operational heart of the dashboard.
          "Active" is anything not yet completed/cancelled/expired; History
          is exactly those three statuses. Nothing is ever deleted — see
          utils/serviceRequests.ts for why. */}
      <div style={{ ...cardStyle, marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setBoardTab('active')}
              style={{ ...secondaryBtn, background: boardTab === 'active' ? theme.color : '#334155' }}
            >
              <Inbox size={13} /> Active · {activeRequests.length}
            </button>
            <button
              onClick={() => setBoardTab('history')}
              style={{ ...secondaryBtn, background: boardTab === 'history' ? theme.color : '#334155' }}
            >
              <HistoryIcon size={13} /> History · {historyRequests.length}
            </button>
          </div>
          <button onClick={() => setIsScannerOpen((o) => !o)} style={{ ...secondaryBtn, background: theme.tint, color: theme.color }}>
            <ScanLine size={13} /> Scan to complete
          </button>
        </div>

        {isScannerOpen && (
          <div style={{ marginBottom: '14px', borderRadius: '12px', overflow: 'hidden' }}>
            <ConfirmQRScanner onCrosscheck={handleScanCrosscheck} onClose={() => setIsScannerOpen(false)} />
          </div>
        )}

        {(boardTab === 'active' ? activeRequests : historyRequests).length === 0 ? (
          <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
            {boardTab === 'active' ? 'No open requests right now.' : 'Nothing here yet.'}
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(boardTab === 'active' ? activeRequests : historyRequests).map((r) => (
              <div key={r.requestId} style={{ background: '#0b0f19', border: '1px solid #1e293b', borderRadius: '12px', padding: '12px 14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 700 }}>{r.problem}</p>
                    <p style={{ margin: '4px 0 0', fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={11} /> {r.address}
                    </p>
                    {r.photoUrl && (
                      <a href={r.photoUrl} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '6px', fontSize: '11px', color: theme.color, textDecoration: 'none' }}>
                        <ImageIcon size={12} /> View photo
                      </a>
                    )}
                  </div>
                  <span style={{
                    fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.4px',
                    padding: '3px 8px', borderRadius: '9999px', flexShrink: 0,
                    background: r.status === 'requested' ? '#334155'
                      : r.status === 'quoted' ? theme.tint
                      : r.status === 'paid' ? 'rgba(34,197,94,0.15)'
                      : r.status === 'completed' ? 'rgba(34,197,94,0.15)'
                      : 'rgba(248,113,113,0.15)',
                    color: r.status === 'requested' ? '#cbd5e1'
                      : r.status === 'quoted' ? theme.color
                      : r.status === 'paid' || r.status === 'completed' ? '#4ade80'
                      : '#f87171',
                  }}>
                    {r.status}
                  </span>
                </div>

                {r.quote && (
                  <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #1e293b' }}>
                    {r.quote.items.map((item, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginBottom: '2px' }}>
                        <span>{item.label}</span>
                        <span>€{item.amount.toFixed(2)}</span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', fontWeight: 800, marginTop: '4px' }}>
                      <span>Total</span>
                      <span style={{ color: theme.color }}>€{r.quote.total.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {r.negotiationOffer?.status === 'pending' && (
                  <div style={{ marginTop: '10px', padding: '10px', background: theme.tint, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: theme.color }}>
                      Customer offered €{r.negotiationOffer.amount.toFixed(2)}
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => handleNegotiationResponse(r, true)} style={{ ...secondaryBtn, background: theme.color }}>
                        <ThumbsUp size={12} /> Accept
                      </button>
                      <button onClick={() => handleNegotiationResponse(r, false)} style={{ ...secondaryBtn, background: '#334155' }}>
                        <ThumbsDown size={12} /> Reject
                      </button>
                    </div>
                  </div>
                )}

                {r.status === 'requested' && (
                  <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    <button onClick={() => openQuoteModal(r)} style={{ ...primaryBtn, background: theme.color, flex: 1 }}>
                      Send Quote
                    </button>
                    <button onClick={() => handleDeclineRequest(r)} style={{ ...secondaryBtn }}>
                      Decline
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Services offered — the category picker that drives everything */}
      <div style={{ ...cardStyle, marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={16} color={theme.color} /> Services Offered
          </h3>
          {isSavingCategories && <span style={{ fontSize: '11px', color: '#64748b' }}>Saving…</span>}
        </div>
        <p style={{ margin: '0 0 14px', fontSize: '12px', color: '#94a3b8' }}>
          Pick everything you do. Your dashboard, VINQR, and storefront theme automatically follow whichever category comes first below.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '8px' }}>
          {SERVICE_CATEGORIES.map((cat) => {
            const active = categoriesOffered.includes(cat.key);
            return (
              <button
                key={cat.key}
                onClick={() => toggleCategory(cat.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 12px', borderRadius: '10px',
                  border: active ? `1.5px solid ${cat.color}` : '1px solid #1e293b',
                  background: active ? cat.tint : '#0b0f19',
                  color: active ? cat.color : '#94a3b8',
                  fontSize: '13px', fontWeight: 700, cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ fontSize: '16px' }}>{cat.emoji}</span>
                {cat.label}
                {active && <Check size={13} style={{ marginLeft: 'auto' }} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Price list */}
      <div style={{ ...cardStyle, marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <DollarSign size={16} color={theme.color} /> Price List
          </h3>
          <button onClick={openAddItem} style={{ ...primaryBtn, background: theme.color }}>
            <Plus size={13} style={{ marginRight: '4px', verticalAlign: '-2px' }} /> Add
          </button>
        </div>
        {priceList.length === 0 ? (
          <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
            No priced items yet — add the basic jobs you do most, so customers see pricing before they request anything.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {priceList.map((item) => (
              <div key={item.itemId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', background: '#0b0f19', borderRadius: '10px', border: '1px solid #1e293b' }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 700 }}>{item.name}</p>
                  {item.description && <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748b' }}>{item.description}</p>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                  <span style={{ fontSize: '14px', fontWeight: 800, color: theme.color }}>€{item.price.toFixed(2)}</span>
                  <button onClick={() => openEditItem(item)} style={iconBtn}><Pencil size={13} /></button>
                  <button onClick={() => handleDeleteItem(item.itemId)} style={{ ...iconBtn, color: '#f87171' }}><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Negotiation setting */}
      <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Handshake size={18} color={theme.color} />
          <div>
            <p style={{ margin: 0, fontSize: '13px', fontWeight: 700 }}>Allow negotiation</p>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#64748b' }}>
              Lets a customer counter-offer your quote on their checkout receipt instead of only accept/decline.
            </p>
          </div>
        </div>
        <button
          onClick={toggleAllowNegotiation}
          style={{
            width: '46px', height: '26px', borderRadius: '9999px', border: 'none', cursor: 'pointer',
            background: allowNegotiation ? theme.color : '#334155',
            position: 'relative', flexShrink: 0, transition: 'background 0.2s ease',
          }}
        >
          <span
            style={{
              position: 'absolute', top: '3px', left: allowNegotiation ? '23px' : '3px',
              width: '20px', height: '20px', borderRadius: '50%', background: '#fff',
              transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }}
          />
        </button>
      </div>

      {/* Profile modal */}
      {profileOpen && (
        <div style={modalOverlayStyle} onClick={() => setProfileOpen(false)}>
          <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Business Profile</h3>
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={fieldLabel}>Business name</label>
              <input style={inputStyle} value={formName} onChange={(e) => setFormName(e.target.value)} required />
              <label style={fieldLabel}>Bio</label>
              <textarea style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }} value={formBio} onChange={(e) => setFormBio(e.target.value)} />
              <label style={fieldLabel}>Address</label>
              <input style={inputStyle} value={formAddress} onChange={(e) => setFormAddress(e.target.value)} placeholder="Street, city — used for Nearby" />
              <div style={{ display: 'flex', gap: '10px' }}>
                <div style={{ flex: 1 }}>
                  <label style={fieldLabel}><Clock size={11} style={{ verticalAlign: '-2px' }} /> Opens</label>
                  <input type="time" style={inputStyle} value={formOpening} onChange={(e) => setFormOpening(e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={fieldLabel}>Closes</label>
                  <input type="time" style={inputStyle} value={formClosing} onChange={(e) => setFormClosing(e.target.value)} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setProfileOpen(false)} style={secondaryBtn}>Cancel</button>
                <button type="submit" disabled={isSavingProfile} style={{ ...primaryBtn, background: theme.color, opacity: isSavingProfile ? 0.6 : 1 }}>
                  {isSavingProfile ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Price list item modal */}
      {itemModalOpen && (
        <div style={modalOverlayStyle} onClick={() => setItemModalOpen(false)}>
          <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>{editingItemId ? 'Edit Item' : 'Add Item'}</h3>
            <form onSubmit={handleSaveItem} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label style={fieldLabel}>Name</label>
              <input style={inputStyle} value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="e.g. Leak diagnosis" required />
              <label style={fieldLabel}>Price (€)</label>
              <input style={inputStyle} type="number" min="0" step="0.01" value={itemPrice} onChange={(e) => setItemPrice(e.target.value)} required />
              <label style={fieldLabel}>Description (optional)</label>
              <textarea style={{ ...inputStyle, minHeight: '60px', resize: 'vertical' }} value={itemDescription} onChange={(e) => setItemDescription(e.target.value)} />
              <div style={{ display: 'flex', gap: '8px', marginTop: '8px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setItemModalOpen(false)} style={secondaryBtn}>Cancel</button>
                <button type="submit" disabled={isSavingItem} style={{ ...primaryBtn, background: theme.color, opacity: isSavingItem ? 0.6 : 1 }}>
                  {isSavingItem ? 'Saving…' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Quote composer modal — dynamic line items, running total computed
          live from quoteTotal above. */}
      {quotingRequest && (
        <div style={modalOverlayStyle} onClick={() => setQuotingRequest(null)}>
          <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>Send Quote</h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', marginTop: '-6px' }}>{quotingRequest.problem}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
              {quoteItems.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <input
                    style={{ ...inputStyle, flex: 1 }}
                    placeholder="e.g. Leak diagnosis"
                    value={item.label}
                    onChange={(e) => {
                      const next = [...quoteItems];
                      next[i] = { ...next[i], label: e.target.value };
                      setQuoteItems(next);
                    }}
                  />
                  <input
                    style={{ ...inputStyle, width: '90px' }}
                    type="number" min="0" step="0.01" placeholder="€"
                    value={item.amount || ''}
                    onChange={(e) => {
                      const next = [...quoteItems];
                      next[i] = { ...next[i], amount: parseFloat(e.target.value) || 0 };
                      setQuoteItems(next);
                    }}
                  />
                  {quoteItems.length > 1 && (
                    <button type="button" onClick={() => setQuoteItems(quoteItems.filter((_, idx) => idx !== i))} style={{ ...iconBtn, color: '#f87171' }}>
                      <X size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setQuoteItems([...quoteItems, { label: '', amount: 0 }])}
              style={{ ...secondaryBtn, marginBottom: '14px' }}
            >
              <Plus size={12} /> Add line
            </button>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 800, padding: '10px 0', borderTop: '1px solid #1e293b', marginBottom: '14px' }}>
              <span>Total</span>
              <span style={{ color: theme.color }}>€{quoteTotal.toFixed(2)}</span>
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setQuotingRequest(null)} style={secondaryBtn}>Cancel</button>
              <button
                type="button"
                onClick={handleSendQuote}
                disabled={isSendingQuote}
                style={{ ...primaryBtn, background: theme.color, opacity: isSendingQuote ? 0.6 : 1 }}
              >
                {isSendingQuote ? 'Sending…' : 'Send Quote'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles — same vocabulary as the other dashboards (dark, card-based), with
// the accent color swapped out for the resolved theme wherever it's used
// inline above rather than baked into these shared constants.
const dashboardStyle: React.CSSProperties = { padding: '20px', maxWidth: '1000px', margin: '0 auto', background: '#0b0f19', minHeight: '100vh', color: '#f8fafc', fontFamily: 'sans-serif' };
const cardStyle: React.CSSProperties = { background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #1e293b' };
const secondaryBtn: React.CSSProperties = { background: '#334155', color: '#f8fafc', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' };
const primaryBtn: React.CSSProperties = { color: '#fff', border: 'none', padding: '7px 14px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 700 };
const iconBtn: React.CSSProperties = { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' };
const inputStyle: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: '#020617', border: '1px solid #1e293b', color: '#f8fafc', borderRadius: '8px', padding: '9px 11px', fontSize: '13px', outline: 'none' };
const fieldLabel: React.CSSProperties = { fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px' };
const modalOverlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 };
const modalCardStyle: React.CSSProperties = { background: '#0f172a', padding: '20px', borderRadius: '12px', border: '1px solid #334155', width: '90%', maxWidth: '400px', maxHeight: '85vh', overflowY: 'auto' };
