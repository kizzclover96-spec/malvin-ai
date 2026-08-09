import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { firestore as db, auth } from "../../firebase";
import { getDatabase, ref, onValue } from 'firebase/database';
import { 
  doc, getDoc, setDoc, updateDoc, onSnapshot, collection, query, where, deleteDoc, serverTimestamp 
} from 'firebase/firestore';
import { Wrench, Car, Clock, CheckCircle, AlertTriangle, QrCode, Trash2, DollarSign, Image as ImageIcon, Copy, Share2, Download, BadgeCheck, Plus, Pencil } from 'lucide-react';
import QRCodeLib from 'qrcode';
import { shareContent, canOpenShareSheet } from '../../services/share';
import { publicOrigin, storeOrigin } from '../../services/vinLink';
import { useBusinessWallet } from "../../hooks/useBusinessWallet";
import ConfirmQRScanner from '../addons/ConfirmQRScanner';
import Banned from '../addons/Banned';
import Suspended from '../addons/Suspended';
import IntakeLimitBanner from '../addons/IntakeLimitBanner';
import { TranslateControl } from '../addons/TranslateControl';
import { geocodeAddress } from '../../utils/geocoding';
import { writeMechanicReceipt, buildMechanicReferenceId } from '../../utils/mechanicAppointments';
import { useAccountStanding } from '../../hooks/useAccountStanding';
import {
  evaluateIntakeLimit,
  syncIntakeLimitState,
  formatCooldownRemaining,
  FREE_TIER_INTAKE_LIMIT,
} from '../../utils/businessLimits';

interface MechanicService {
  serviceId: string;
  serviceName: string;
  price: number;
  estimatedHours: number;
  description: string;
  category: string;
}

interface RepairRequest {
  id: string;
  customerUid: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  problemCategory: string;
  urgency: 'Low' | 'Medium' | 'High';
  preferredDate: string;
  description: string;
  photoUrl?: string;
  status: 'Received' | 'Inspection' | 'Waiting Parts' | 'Repairing' | 'Ready' | 'Completed';
  suggestedTime?: string;
  /** Set when the garage accepts; shared with the customer's receipt. */
  referenceId?: string;
  accepted?: boolean;
  createdAt: any;
}

export default function MechanicDashboard() {
  const navigate = useNavigate();
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { balance } = useBusinessWallet({ merchantType: "mechanic" });

  const [requests, setRequests] = useState<RepairRequest[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [suggestTimeModal, setSuggestTimeModal] = useState<RepairRequest | null>(null);
  const [newSuggestedTime, setNewSuggestedTime] = useState('');
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [garageName, setGarageName] = useState('Mechanic');

  // Garage profile editor. This exists mainly so the address can be geocoded
  // — without latitude/longitude on the mechanics document a garage can never
  // appear in the customer's "Nearby" strip, which filters on coordinates.
  const [profileOpen, setProfileOpen] = useState(false);
  const [formName, setFormName] = useState('');
  const [formBio, setFormBio] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formOpening, setFormOpening] = useState('08:00');
  const [formClosing, setFormClosing] = useState('18:00');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [hasCoords, setHasCoords] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [copied, setCopied] = useState(false);

  // Services this garage offers — managed here, no longer hardcoded on the
  // customer side.
  const [services, setServices] = useState<MechanicService[]>([]);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [svcName, setSvcName] = useState('');
  const [svcPrice, setSvcPrice] = useState('');
  const [svcHours, setSvcHours] = useState('1');
  const [svcCategory, setSvcCategory] = useState('Engine');
  const [svcDescription, setSvcDescription] = useState('');
  const [isSavingService, setIsSavingService] = useState(false);

  // Free-tier intake cap, shared with every other business category.
  const { isPremium, isVerified, unlimited } = useAccountStanding(uid);
  const [cooldownExpiresAt, setCooldownExpiresAt] = useState<string | null>(null);
  const [cooldownLabel, setCooldownLabel] = useState<string | null>(null);

  // Ban / Suspended RTDB States
  const [isBanned, setIsBanned] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) setUid(user.uid);
      else navigate('/login');
    });
    return () => unsub();
  }, [navigate]);

  useEffect(() => {
    if (!uid) return;

    // Listen to garage requests
    const q = query(collection(db, 'mechanics', uid, 'repair_requests'));
    const unsubSnap = onSnapshot(q, (snap) => {
      const items: RepairRequest[] = [];
      snap.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as RepairRequest);
      });
      setRequests(items);
      setLoading(false);
    });

    // Listen to the services this garage publishes
    const unsubServices = onSnapshot(
      collection(db, 'mechanics', uid, 'services'),
      (snap) => {
        const items: MechanicService[] = [];
        snap.forEach((d) => items.push({ serviceId: d.id, ...d.data() } as MechanicService));
        items.sort((a, b) => a.serviceName.localeCompare(b.serviceName));
        setServices(items);
      },
      (err) => console.error('Failed to load garage services:', err)
    );

    // Realtime Database Ban/Suspensions
    const rtdb = getDatabase();
    const userRef = ref(rtdb, `users/${uid}`);
    onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setIsBanned(data.status === "Banned" || data.banned === true);
        setIsSuspended(data.status === "Suspended" || data.suspended === true);
      }
    });

    // Garage profile — the name goes onto every receipt the customer
    // receives, and the address/coordinates decide whether this garage can
    // ever surface under "Nearby".
    getDoc(doc(db, 'mechanics', uid))
      .then((snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        const name = data.garageName || data.businessName || data.name || 'Mechanic';
        setGarageName(name);
        setCooldownExpiresAt(data.cooldownExpiresAt || null);
        setFormName(name);
        setFormBio(data.bio || '');
        setFormAddress(data.address || '');
        setFormOpening(data.openingTime || '08:00');
        setFormClosing(data.closingTime || '18:00');
        setHasCoords(Boolean(data.latitude && data.longitude));
      })
      .catch((err) => console.error('Failed to read garage profile:', err));

    return () => {
      unsubSnap();
      unsubServices();
    };
  }, [uid]);

  // --- Free-tier intake cap (shared rule, see utils/businessLimits.ts) ---
  // Counts jobs that are still live. Completed repairs don't hold a slot
  // open, so a garage that finishes its work keeps taking new bookings.
  const activeJobCount = requests.filter((r) => r.status !== 'Completed').length;

  useEffect(() => {
    if (!uid) return;
    const state = evaluateIntakeLimit(activeJobCount, { isPremium, isVerified }, cooldownExpiresAt);
    if (state.cooldownExpiresAt !== cooldownExpiresAt) {
      setCooldownExpiresAt(state.cooldownExpiresAt);
    }
    syncIntakeLimitState('mechanic', uid, state, { isPremium, isVerified });
  }, [uid, activeJobCount, isPremium, isVerified, cooldownExpiresAt]);

  const intakeState = evaluateIntakeLimit(activeJobCount, { isPremium, isVerified }, cooldownExpiresAt);

  // Ticks the "unlocks in" label while a cooldown is running.
  useEffect(() => {
    if (!intakeState.cooldownExpiresAt) {
      setCooldownLabel(null);
      return;
    }
    const tick = () => setCooldownLabel(formatCooldownRemaining(intakeState.cooldownExpiresAt));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [intakeState.cooldownExpiresAt]);

  // Card Counters
  const pendingRequests = requests.filter(r => r.status === 'Received');
  const carsInService = requests.filter(r => ['Inspection', 'Waiting Parts', 'Repairing'].includes(r.status));
  const completedRepairs = requests.filter(r => ['Ready', 'Completed'].includes(r.status));

  const handleUpdateStatus = async (requestId: string, status: RepairRequest['status']) => {
    if (!uid) return;
    await updateDoc(doc(db, 'mechanics', uid, 'repair_requests', requestId), {
      status,
      updatedAt: serverTimestamp()
    });
  };

  /**
   * Accepting is what turns a request into a customer-visible receipt. It
   * moves the job into the pipeline AND writes the customer's copy — see
   * utils/mechanicAppointments.ts for why the copy is needed.
   *
   * The reference id is generated once and stored on the garage's record, so
   * re-accepting doesn't hand the customer a different code than the one the
   * workbench is showing.
   */
  const handleAcceptRequest = async (r: RepairRequest) => {
    if (!uid || acceptingId) return;

    if (!r.customerUid || r.customerUid === 'guest_user') {
      alert("This request has no linked customer account, so no receipt can be issued. Accept it on the board and contact them directly.");
    }

    setAcceptingId(r.id);
    try {
      const referenceId = r.referenceId || buildMechanicReferenceId();

      await writeMechanicReceipt({
        requestId: r.id,
        customerUid: r.customerUid,
        businessUid: uid,
        businessName: garageName,
        vehicleMake: r.vehicleMake,
        vehicleModel: r.vehicleModel,
        vehicleYear: r.vehicleYear,
        problemCategory: r.problemCategory,
        urgency: r.urgency,
        preferredDate: r.preferredDate,
        suggestedTime: r.suggestedTime,
        description: r.description,
        referenceId,
      });

      await updateDoc(doc(db, 'mechanics', uid, 'repair_requests', r.id), {
        status: 'Inspection',
        accepted: true,
        referenceId,
        acceptedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Failed to accept repair request:', err);
      alert('Could not accept this request. Please try again.');
    } finally {
      setAcceptingId(null);
    }
  };

  const handleSuggestTime = async () => {
    if (!uid || !suggestTimeModal) return;
    await updateDoc(doc(db, 'mechanics', uid, 'repair_requests', suggestTimeModal.id), {
      suggestedTime: newSuggestedTime,
      updatedAt: serverTimestamp()
    });
    setSuggestTimeModal(null);
    setNewSuggestedTime('');
    alert("New time proposal sent to customer.");
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !formName.trim()) return;
    setIsSavingProfile(true);
    try {
      // Geocoding the typed address is the whole point of this form — the
      // Nearby strip filters on latitude/longitude, so a garage without them
      // is invisible to customers no matter how complete its profile is.
      const coords = await geocodeAddress(formAddress.trim());

      await setDoc(
        doc(db, 'mechanics', uid),
        {
          garageName: formName.trim(),
          bio: formBio.trim(),
          address: formAddress.trim(),
          openingTime: formOpening,
          closingTime: formClosing,
          vinLink: `/mechanic/${uid}`,
          // Only overwrite on a successful lookup — writing 0/0 after a
          // transient geocoder failure would drop a previously locatable
          // garage off the map.
          ...(coords ? { latitude: coords.latitude, longitude: coords.longitude } : {}),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setGarageName(formName.trim());
      if (coords) setHasCoords(true);
      setProfileOpen(false);

      if (!coords && formAddress.trim()) {
        alert("Saved — but that address couldn't be located, so the garage won't show under Nearby yet. Try a more specific address.");
      }
    } catch (err) {
      console.error('Failed to save garage profile:', err);
      alert('Could not save the garage profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleDeleteRequest = async (id: string) => {
    if (!uid || !window.confirm("Remove repair record?")) return;
    await deleteDoc(doc(db, 'mechanics', uid, 'repair_requests', id));
  };

  // --- VINQR: same link customers scan to land on this garage's storefront ---
  const vinLink = uid ? `${storeOrigin()}/mechanic/${uid}` : '';

  useEffect(() => {
    if (!vinLink) return;
    QRCodeLib.toDataURL(vinLink, { width: 250, margin: 2 })
      .then((url) => setQrCodeUrl(url))
      .catch((err) => console.error('Error generating garage QR code:', err));
  }, [vinLink]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(vinLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy garage link:', err);
    }
  };

  const handleShareLink = async () => {
    if (!canOpenShareSheet()) {
      handleCopyLink();
      return;
    }
    const result = await shareContent({ title: garageName, text: 'Book a repair with us on Malvin', url: vinLink });
    if (result === 'failed' || result === 'unsupported') handleCopyLink();
  };

  const handleDownloadQr = () => {
    if (!qrCodeUrl) return;
    const anchor = document.createElement('a');
    anchor.href = qrCodeUrl;
    anchor.download = `${garageName.replace(/\s+/g, '-').toLowerCase() || 'garage'}-qr.png`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  const openAddService = () => {
    setEditingServiceId(null);
    setSvcName('');
    setSvcPrice('');
    setSvcHours('1');
    setSvcCategory('Engine');
    setSvcDescription('');
    setServiceModalOpen(true);
  };

  const openEditService = (s: MechanicService) => {
    setEditingServiceId(s.serviceId);
    setSvcName(s.serviceName);
    setSvcPrice(String(s.price));
    setSvcHours(String(s.estimatedHours));
    setSvcCategory(s.category);
    setSvcDescription(s.description);
    setServiceModalOpen(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) return;
    const price = parseFloat(svcPrice);
    const estimatedHours = parseFloat(svcHours);
    if (!svcName.trim() || isNaN(price) || price <= 0 || isNaN(estimatedHours) || estimatedHours <= 0) {
      alert('Please fill in a valid service name, price, and estimated hours.');
      return;
    }
    setIsSavingService(true);
    try {
      const targetId = editingServiceId || `svc_${Date.now()}`;
      await setDoc(
        doc(db, 'mechanics', uid, 'services', targetId),
        {
          serviceName: svcName.trim(),
          price,
          estimatedHours,
          category: svcCategory,
          description: svcDescription.trim(),
          ...(editingServiceId ? {} : { createdAt: serverTimestamp() }),
        },
        { merge: true }
      );
      setServiceModalOpen(false);
    } catch (err) {
      console.error('Failed to save service:', err);
      alert('Could not save this service. Please try again.');
    } finally {
      setIsSavingService(false);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!uid || !window.confirm('Remove this service from your garage listing?')) return;
    await deleteDoc(doc(db, 'mechanics', uid, 'services', serviceId));
  };

  if (isBanned) return <Banned />;
  if (isSuspended) return <Suspended />;

  return (
    <div style={dashboardStyle}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wrench color="#0284c7" /> Mechanic Workbench Dashboard
            {isVerified && (
              <span
                title="Verified garage"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', background: 'rgba(56,189,248,0.14)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.35)', borderRadius: '20px', padding: '4px 9px' }}
              >
                <BadgeCheck size={12} /> Verified
              </span>
            )}
          </h1>
          <p style={{ margin: '4px 0 0', color: '#94a3b8', fontSize: '13px' }}>Garage Repair Management & Pipeline</p>
        </div>
        <button onClick={() => setProfileOpen(true)} style={secondaryBtn}>
          Garage Profile
          {!hasCoords && (
            <span
              title="Add an address so customers can find you under Nearby"
              style={{ marginLeft: 6, width: 7, height: 7, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }}
            />
          )}
        </button>
      </div>

      {/* VINQR / share card — same link customers scan to reach this garage */}
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: '16px', padding: '18px', marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        {qrCodeUrl ? (
          <img src={qrCodeUrl} alt="Garage VINQR" style={{ width: '110px', height: '110px', borderRadius: '10px', background: '#fff', padding: '6px', flexShrink: 0 }} />
        ) : (
          <div style={{ width: '110px', height: '110px', borderRadius: '10px', background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <QrCode size={28} color="#475569" />
          </div>
        )}
        <div style={{ flex: 1, minWidth: '180px' }}>
          <p style={{ margin: '0 0 4px', fontSize: '12px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Your garage's VINQR</p>
          <p style={{ margin: '0 0 12px', fontSize: '12px', color: '#64748b', wordBreak: 'break-all' }}>{vinLink}</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button onClick={handleCopyLink} style={secondaryBtn}>
              <Copy size={13} /> {copied ? 'Copied' : 'Copy link'}
            </button>
            <button onClick={handleShareLink} style={secondaryBtn}>
              <Share2 size={13} /> Share
            </button>
            <button onClick={handleDownloadQr} disabled={!qrCodeUrl} style={{ ...secondaryBtn, opacity: qrCodeUrl ? 1 : 0.5, cursor: qrCodeUrl ? 'pointer' : 'not-allowed' }}>
              <Download size={13} /> Download QR
            </button>
          </div>
        </div>
      </div>

      {/* GARAGE PROFILE MODAL */}
      {profileOpen && (
        <div
          onClick={() => setProfileOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 4000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSaveProfile}
            style={{ width: '100%', maxWidth: '440px', background: '#0f172a', border: '1px solid #1e293b', borderRadius: '20px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px', maxHeight: '88vh', overflowY: 'auto' }}
          >
            <h3 style={{ margin: 0, fontSize: '17px' }}>Garage Profile</h3>
            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>
              Your address is converted to map coordinates on save — that's what puts this garage in a customer's “Nearby” list.
            </p>

            <label style={mechFieldLabel}>Garage name *</label>
            <input value={formName} onChange={(e) => setFormName(e.target.value)} required style={mechInput} />

            <label style={mechFieldLabel}>Bio</label>
            <textarea value={formBio} onChange={(e) => setFormBio(e.target.value)} rows={3} style={{ ...mechInput, resize: 'vertical' }} />

            <label style={mechFieldLabel}>Address</label>
            <input value={formAddress} onChange={(e) => setFormAddress(e.target.value)} placeholder="Street, city" style={mechInput} />

            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={mechFieldLabel}>Opens</label>
                <input type="time" value={formOpening} onChange={(e) => setFormOpening(e.target.value)} style={mechInput} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={mechFieldLabel}>Closes</label>
                <input type="time" value={formClosing} onChange={(e) => setFormClosing(e.target.value)} style={mechInput} />
              </div>
            </div>

            <TranslateControl label="Language" description="" variant="dark" />

            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button type="button" onClick={() => setProfileOpen(false)} style={{ ...secondaryBtn, flex: 1, justifyContent: 'center' }}>
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingProfile}
                style={{ flex: 1, border: 'none', borderRadius: '10px', padding: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', background: '#0284c7', color: '#fff', opacity: isSavingProfile ? 0.6 : 1 }}
              >
                {isSavingProfile ? 'Saving…' : 'Save profile'}
              </button>
            </div>
          </form>
        </div>
      )}

      <IntakeLimitBanner
        merchantType="mechanic"
        state={intakeState}
        cooldownLabel={cooldownLabel}
        isPremium={isPremium}
        isVerified={isVerified}
        onUpgrade={() => navigate('/', { state: { flowStep: 'premiumView' } })}
      />

      {/* Top Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <div style={cardStyle}>
          <span style={cardLabelStyle}>Pending Requests</span>
          <h2 style={{ ...cardValueStyle, color: '#f59e0b' }}>{pendingRequests.length}</h2>
        </div>
        <div style={cardStyle}>
          <span style={cardLabelStyle}>Cars In Service</span>
          <h2 style={{ ...cardValueStyle, color: '#38bdf8' }}>{carsInService.length}</h2>
        </div>
        <div style={cardStyle}>
          <span style={cardLabelStyle}>Completed Repairs</span>
          <h2 style={{ ...cardValueStyle, color: '#34d399' }}>{completedRepairs.length}</h2>
        </div>
        <div style={cardStyle}>
          <span style={cardLabelStyle}>Garage Revenue</span>
          <h2 style={{ ...cardValueStyle, color: '#a78bfa' }}>€{balance || 0}</h2>
        </div>
      </div>

      {/* Services & Pricing */}
      <div style={{ background: '#0f172a', padding: '20px', borderRadius: '16px', border: '1px solid #1e293b', marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: '#f8fafc' }}>Services & Pricing</h3>
          <button onClick={openAddService} style={{ ...secondaryBtn, background: '#0284c7', color: '#fff' }}>
            <Plus size={13} /> Add service
          </button>
        </div>

        {services.length === 0 ? (
          <p style={{ color: '#64748b', textAlign: 'center', padding: '16px', fontSize: '13px' }}>
            No services published yet — customers can't request work until you add at least one.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
            {services.map((s) => (
              <div key={s.serviceId} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '13px', color: '#f8fafc' }}>{s.serviceName}</h4>
                  <span style={{ color: '#38bdf8', fontWeight: 700, fontSize: '13px', whiteSpace: 'nowrap' }}>€{s.price}</span>
                </div>
                <p style={{ margin: '6px 0', fontSize: '11px', color: '#94a3b8' }}>{s.description}</p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', color: '#64748b' }}>~{s.estimatedHours}h · {s.category}</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => openEditService(s)} style={{ ...secondaryBtn, padding: '4px 8px' }}><Pencil size={12} /></button>
                    <button onClick={() => handleDeleteService(s.serviceId)} style={{ ...secondaryBtn, padding: '4px 8px', color: '#f87171' }}><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Service Add/Edit Modal */}
      {serviceModalOpen && (
        <div style={modalOverlayStyle} onClick={() => setServiceModalOpen(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={handleSaveService} style={{ ...modalCardStyle, display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3 style={{ margin: 0 }}>{editingServiceId ? 'Edit service' : 'Add service'}</h3>

            <label style={mechFieldLabel}>Service name *</label>
            <input value={svcName} onChange={(e) => setSvcName(e.target.value)} required style={mechInput} placeholder="e.g., Oil Change" />

            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flex: 1 }}>
                <label style={mechFieldLabel}>Price (€) *</label>
                <input type="number" min="0" step="0.01" value={svcPrice} onChange={(e) => setSvcPrice(e.target.value)} required style={mechInput} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={mechFieldLabel}>Est. hours *</label>
                <input type="number" min="0" step="0.5" value={svcHours} onChange={(e) => setSvcHours(e.target.value)} required style={mechInput} />
              </div>
            </div>

            <label style={mechFieldLabel}>Category</label>
            <select value={svcCategory} onChange={(e) => setSvcCategory(e.target.value)} style={mechInput}>
              <option value="Engine">Engine</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Brakes">Brakes</option>
              <option value="Battery">Battery</option>
              <option value="Tires">Tires</option>
              <option value="AC">AC / Climate</option>
              <option value="Electrical">Electrical</option>
              <option value="Diagnostics">Diagnostics</option>
              <option value="Other">Other</option>
            </select>

            <label style={mechFieldLabel}>Description</label>
            <textarea value={svcDescription} onChange={(e) => setSvcDescription(e.target.value)} rows={2} style={{ ...mechInput, resize: 'vertical' }} />

            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              <button type="button" onClick={() => setServiceModalOpen(false)} style={{ ...secondaryBtn, flex: 1, justifyContent: 'center' }}>Cancel</button>
              <button
                type="submit"
                disabled={isSavingService}
                style={{ flex: 1, border: 'none', borderRadius: '10px', padding: '10px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', background: '#0284c7', color: '#fff', opacity: isSavingService ? 0.6 : 1 }}
              >
                {isSavingService ? 'Saving…' : editingServiceId ? 'Save changes' : 'Add service'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Requests & Repair Pipeline */}
      <div style={{ background: '#0f172a', padding: '20px', borderRadius: '16px', border: '1px solid #1e293b' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#f8fafc' }}>Active Vehicle Service Queue</h3>

        {requests.length === 0 ? (
          <p style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>No active vehicle repair requests.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {requests.map((r) => (
              <div key={r.id} style={{ background: '#1e293b', padding: '16px', borderRadius: '12px', border: '1px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '16px', color: '#f8fafc' }}>
                      🚘 {r.vehicleMake} {r.vehicleModel} ({r.vehicleYear})
                    </h4>
                    <p style={{ margin: '4px 0', fontSize: '13px', color: '#94a3b8' }}>
                      Category: <strong>{r.problemCategory}</strong> | Preferred Date: {r.preferredDate}
                    </p>
                  </div>
                  <span style={priorityBadge(r.urgency)}>Priority: {r.urgency}</span>
                </div>

                {r.description && <p style={{ fontSize: '12px', color: '#cbd5e1', background: '#0f172a', padding: '8px', borderRadius: '6px' }}>"{r.description}"</p>}

                {/* Status Pipeline Controller */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', margin: '12px 0' }}>
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>Repair Status:</span>
                  <select 
                    value={r.status} 
                    onChange={(e) => handleUpdateStatus(r.id, e.target.value as RepairRequest['status'])}
                    style={selectStyle}
                  >
                    <option value="Received">Received</option>
                    <option value="Inspection">Inspection</option>
                    <option value="Waiting Parts">Waiting Parts</option>
                    <option value="Repairing">Repairing</option>
                    <option value="Ready">Ready</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {/* Accepting is what issues the customer's receipt. Once
                      accepted the button becomes a static confirmation
                      showing the shared reference code. */}
                  {r.accepted ? (
                    <span style={{ ...secondaryBtn, color: '#4ade80', borderColor: '#166534', cursor: 'default' }}>
                      <CheckCircle size={14} /> Accepted · {r.referenceId}
                    </span>
                  ) : (
                    <button
                      onClick={() => handleAcceptRequest(r)}
                      disabled={acceptingId === r.id || intakeState.limitReached}
                      title={intakeState.limitReached ? 'Free plan intake limit reached' : 'Accept and issue the customer their receipt'}
                      style={{
                        ...secondaryBtn,
                        color: '#0f172a',
                        background: intakeState.limitReached ? '#334155' : '#4ade80',
                        borderColor: 'transparent',
                        fontWeight: 700,
                        opacity: acceptingId === r.id ? 0.6 : 1,
                      }}
                    >
                      <CheckCircle size={14} />
                      {acceptingId === r.id ? 'Accepting…' : 'Accept Request'}
                    </button>
                  )}
                  {r.photoUrl && (
                    <button onClick={() => setSelectedPhoto(r.photoUrl!)} style={secondaryBtn}>
                      <ImageIcon size={14} /> View Photos
                    </button>
                  )}
                  <button onClick={() => setSuggestTimeModal(r)} style={secondaryBtn}>
                    Suggest Time
                  </button>
                  <button onClick={() => handleDeleteRequest(r.id)} style={{ ...secondaryBtn, color: '#f87171' }}>
                    <Trash2 size={14} /> Decline / Erase
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Suggest Time Modal */}
      {suggestTimeModal && (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <h3>Suggest New Repair Slot</h3>
            <input 
              type="text" 
              placeholder="e.g. Tomorrow 14:00" 
              value={newSuggestedTime} 
              onChange={(e) => setNewSuggestedTime(e.target.value)}
              style={inputStyle}
            />
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              <button onClick={() => setSuggestTimeModal(null)} style={secondaryBtn}>Cancel</button>
              <button onClick={handleSuggestTime} style={primaryBtn}>Send Proposal</button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Viewer Modal */}
      {selectedPhoto && (
        <div style={modalOverlayStyle} onClick={() => setSelectedPhoto(null)}>
          <div style={{ ...modalCardStyle, maxWidth: '600px' }}>
            <img src={selectedPhoto} alt="Vehicle Inspection Issue" style={{ width: '100%', borderRadius: '8px' }} />
            <button onClick={() => setSelectedPhoto(null)} style={{ ...secondaryBtn, marginTop: '12px', width: '100%' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles
const dashboardStyle: React.CSSProperties = { padding: '20px', maxWidth: '1000px', margin: '0 auto', background: '#0b0f19', minHeight: '100vh', color: '#f8fafc', fontFamily: 'sans-serif' };
const cardStyle: React.CSSProperties = { background: '#0f172a', padding: '16px', borderRadius: '12px', border: '1px solid #1e293b' };
const cardLabelStyle: React.CSSProperties = { fontSize: '12px', color: '#94a3b8' };
const cardValueStyle: React.CSSProperties = { margin: '8px 0 0', fontSize: '22px' };
const secondaryBtn: React.CSSProperties = { background: '#334155', color: '#f8fafc', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' };

const mechFieldLabel: React.CSSProperties = { fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px' };

const mechInput: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: '#020617', border: '1px solid #1e293b', color: '#f8fafc', borderRadius: '8px', padding: '9px 11px', fontSize: '13px', outline: 'none' };
const primaryBtn: React.CSSProperties = { background: '#0284c7', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' };
const selectStyle: React.CSSProperties = { background: '#0f172a', color: '#38bdf8', border: '1px solid #334155', padding: '6px 10px', borderRadius: '6px', fontWeight: 'bold' };
const modalOverlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 };
const modalCardStyle: React.CSSProperties = { background: '#0f172a', padding: '20px', borderRadius: '12px', border: '1px solid #334155', width: '90%', maxWidth: '400px' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px', borderRadius: '6px', background: '#1e293b', border: '1px solid #334155', color: '#fff', boxSizing: 'border-box' };
const priorityBadge = (p: string): React.CSSProperties => ({
  fontSize: '11px',
  fontWeight: 'bold',
  padding: '4px 8px',
  borderRadius: '6px',
  background: p === 'High' ? '#7f1d1d' : p === 'Medium' ? '#713f12' : '#14532d',
  color: p === 'High' ? '#fca5a5' : p === 'Medium' ? '#fde047' : '#86efac',
});