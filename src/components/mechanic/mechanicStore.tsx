import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { firestore as db, auth } from '../../firebase';
import { doc, getDoc, setDoc, updateDoc, onSnapshot, collection, serverTimestamp, query, where } from 'firebase/firestore';
import QRCode from 'qrcode';
import Report from "../addons/report";
import { Star, AlertTriangle, Wrench, ShieldCheck, Clock, Camera, Car, CheckCircle2, AlertCircle } from 'lucide-react';
import { getDatabase, ref, onValue } from 'firebase/database';
import Banned from '../addons/Banned';
import Suspended from '../addons/Suspended';

interface GarageProfile {
  garageName: string;
  bio: string;
  address: string;
  openingTime: string;
  closingTime: string;
  offDays: string[];
  isVerified?: boolean;
  heroImage?: string;
}

interface MechanicService {
  serviceId: string;
  serviceName: string;
  price: number;
  estimatedHours: number;
  description: string;
  category: string;
}

interface RepairTracker {
  id: string;
  vehicleMake: string;
  vehicleModel: string;
  status: 'Received' | 'Inspection' | 'Waiting Parts' | 'Repairing' | 'Ready' | 'Completed';
  urgency: 'Low' | 'Medium' | 'High';
  problemCategory: string;
  updatedAt: any;
}

const VerifiedBadge = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="#38bdf8" style={{ display: 'inline-block', marginLeft: '6px' }}>
    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
  </svg>
);

const STATUS_STEPS = ['Received', 'Inspection', 'Waiting Parts', 'Repairing', 'Ready', 'Completed'] as const;

export default function MechanicStore() {
  const { uid } = useParams<{ uid: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [garage, setGarage] = useState<GarageProfile | null>(null);
  const [services, setServices] = useState<MechanicService[]>([
    { serviceId: 's1', serviceName: 'Engine Repair', price: 150, estimatedHours: 3, description: 'Complete diagnostic and mechanical overhaul', category: 'Engine' },
    { serviceId: 's2', serviceName: 'Oil Change', price: 45, estimatedHours: 1, description: 'Full synthetic oil replacement & filter check', category: 'Maintenance' },
    { serviceId: 's3', serviceName: 'Brake Repair', price: 120, estimatedHours: 2, description: 'Pads, rotors, and brake fluid pressure tune', category: 'Brakes' },
    { serviceId: 's4', serviceName: 'Battery Replacement', price: 90, estimatedHours: 1, description: 'Heavy-duty AGM battery install & alternator scan', category: 'Battery' },
    { serviceId: 's5', serviceName: 'Tire Service', price: 60, estimatedHours: 1, description: 'Rotation, balancing, and alignment calibration', category: 'Tires' },
    { serviceId: 's6', serviceName: 'Full Diagnostics', price: 80, estimatedHours: 1, description: 'Comprehensive OBD-II scan & electrical check', category: 'Diagnostics' },
  ]);

  const [customerUid, setCustomerUid] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);

  // Ratings & Report
  const [averageRating, setAverageRating] = useState<number>(4.9);
  const [totalRatingsCount, setTotalRatingsCount] = useState<number>(128);
  const [userRating, setUserRating] = useState<number>(0);
  const [showRateModal, setShowRateModal] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [hoveredStar, setHoveredStar] = useState<number>(0);

  // Active Repairs Tracker
  const [customerRepairs, setCustomerRepairs] = useState<RepairTracker[]>([]);

  // Request Service Modal Form State
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [vehicleMake, setVehicleMake] = useState('BMW');
  const [customMake, setCustomMake] = useState('');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehicleYear, setVehicleYear] = useState('2021');
  const [mileage, setMileage] = useState('');
  const [problemCategory, setProblemCategory] = useState('Engine');
  const [urgency, setUrgency] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [preferredDate, setPreferredDate] = useState('');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) setCustomerUid(user.uid);
    });
    return () => unsub();
  }, []);

  // Fetch Garage Details & Status
  useEffect(() => {
    if (!uid) return;
    const docRef = doc(db, 'mechanics', uid);
    getDoc(docRef).then((snap) => {
      if (snap.exists()) {
        setGarage(snap.data() as GarageProfile);
      } else {
        setGarage({
          garageName: "Apex Auto Repair & Engineering",
          bio: "Certified precision mechanics specializing in diagnostics, engine builds, brake service, and standard vehicle maintenance.",
          address: "742 Industrial Tech Way, Bay 4",
          openingTime: "08:00",
          closingTime: "18:00",
          offDays: ["Sunday"],
          isVerified: true,
          heroImage: "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80"
        });
      }
      setLoading(false);
    });

    const rtdb = getDatabase();
    const userRef = ref(rtdb, `users/${uid}`);
    onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setIsVerified(data.profile?.isVerified || false);
        setIsBanned(data.status === "Banned" || data.banned === true);
        setIsSuspended(data.status === "Suspended" || data.suspended === true);
      }
    });
  }, [uid]);

  // Fetch Customer Live Repair Statuses
  useEffect(() => {
    if (!uid || !customerUid) return;
    const q = query(
      collection(db, 'mechanics', uid, 'repair_requests'),
      where('customerUid', '==', customerUid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const repairs: RepairTracker[] = [];
      snap.forEach((doc) => {
        repairs.push({ id: doc.id, ...doc.data() } as RepairTracker);
      });
      setCustomerRepairs(repairs);
    });
    return () => unsub();
  }, [uid, customerUid]);

  const handleRateStore = async (stars: number) => {
    if (!customerUid || !uid) return;
    setUserRating(stars);
    const ratingRef = doc(db, 'store_ratings', uid, 'user_ratings', customerUid);
    await setDoc(ratingRef, { stars, updatedAt: new Date().toISOString() });
    setShowRateModal(false);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid) return;
    setIsSubmitting(true);
    try {
      const requestId = `rep_${Date.now()}`;
      const finalMake = vehicleMake === 'Other' ? customMake : vehicleMake;
      const payload = {
        requestId,
        customerUid: customerUid || 'guest_user',
        vehicleMake: finalMake,
        vehicleModel,
        vehicleYear,
        mileage,
        problemCategory,
        urgency,
        preferredDate,
        description,
        photoUrl,
        status: 'Received',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'mechanics', uid, 'repair_requests', requestId), payload);
      alert("✅ Service Request Submitted! You can track your car status live below.");
      setIsRequestModalOpen(false);
      setDescription('');
      setPhotoUrl('');
    } catch (err) {
      console.error(err);
      alert("Failed to submit request.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isBanned) return <Banned />;
  if (isSuspended) return <Suspended />;

  return (
    <div style={containerStyle}>
      {/* Garage Hero Section */}
      <div style={heroCardStyle}>
        <div style={{ position: 'relative', width: '100%', height: '220px', borderRadius: '16px', overflow: 'hidden', marginBottom: '16px' }}>
          <img 
            src={garage?.heroImage || "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80"} 
            alt="Garage Hero" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
          <div style={overlayStyle} />
          <div style={heroContentStyle}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0, display: 'flex', alignItems: 'center' }}>
              {garage?.garageName || "Garage Hero"} {isVerified && <VerifiedBadge />}
            </h1>
            <p style={{ margin: '6px 0 0', color: '#94a3b8', fontSize: '13px' }}>{garage?.address}</p>
          </div>
        </div>

        {/* Status Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', padding: '12px 16px', borderRadius: '12px', border: '1px solid #334155' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '16px' }}>⭐ {averageRating}</span>
            <span style={{ color: '#64748b', fontSize: '12px' }}>({totalRatingsCount} reviews)</span>
          </div>
          <span style={openBadgeStyle}>🟢 Open Now</span>
          <button onClick={() => setShowRateModal(true)} style={smallButtonStyle}>Rate Garage</button>
        </div>
      </div>

      {/* Live Repair Tracker Section */}
      {customerRepairs.length > 0 && (
        <div style={sectionCardStyle}>
          <h2 style={sectionTitleStyle}>
            <Wrench size={18} color="#0284c7" /> Live Repair Tracker
          </h2>
          {customerRepairs.map((repair) => {
            const currentIdx = STATUS_STEPS.indexOf(repair.status);
            return (
              <div key={repair.id} style={{ background: '#0f172a', padding: '16px', borderRadius: '12px', marginBottom: '12px', border: '1px solid #1e293b' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontWeight: 'bold', color: '#f8fafc' }}>🚘 {repair.vehicleMake} {repair.vehicleModel}</span>
                  <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '6px', background: repair.urgency === 'High' ? '#7f1d1d' : '#1e293b', color: '#f87171' }}>
                    {repair.urgency} Urgency
                  </span>
                </div>

                {/* Status Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', marginTop: '16px' }}>
                  {STATUS_STEPS.map((step, idx) => {
                    const isPassed = idx <= currentIdx;
                    return (
                      <div key={step} style={{ textAlign: 'center', flex: 1, position: 'relative', zIndex: 2 }}>
                        <div style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          background: isPassed ? '#0284c7' : '#334155',
                          color: '#fff',
                          margin: '0 auto 6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 'bold'
                        }}>
                          {isPassed ? '✓' : idx + 1}
                        </div>
                        <span style={{ fontSize: '10px', color: isPassed ? '#e2e8f0' : '#64748b', display: 'block' }}>
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Services List */}
      <div style={sectionCardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={sectionTitleStyle}>Available Garage Services</h2>
          <button onClick={() => setIsRequestModalOpen(true)} style={actionButtonStyle}>
            🔧 Request Service
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
          {services.map((s) => (
            <div key={s.serviceId} style={serviceCardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h3 style={{ margin: 0, fontSize: '15px', color: '#f8fafc' }}>• {s.serviceName}</h3>
                <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>€{s.price}</span>
              </div>
              <p style={{ margin: '6px 0', fontSize: '12px', color: '#94a3b8' }}>{s.description}</p>
              <span style={{ fontSize: '11px', color: '#64748b' }}>⏱ Approx ~{s.estimatedHours} hrs</span>
            </div>
          ))}
        </div>
      </div>

      {/* Request Service Modal */}
      {isRequestModalOpen && (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <h2 style={{ margin: '0 0 16px', fontSize: '18px', color: '#f8fafc' }}>🔧 Request Garage Service</h2>
            <form onSubmit={handleSubmitRequest} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Vehicle Make</label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                  {['BMW', 'Mercedes', 'Toyota', 'Other'].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setVehicleMake(m)}
                      style={vehicleMake === m ? activePillStyle : pillStyle}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {vehicleMake === 'Other' && (
                <input
                  type="text"
                  placeholder="Specify Vehicle Make"
                  value={customMake}
                  onChange={(e) => setCustomMake(e.target.value)}
                  style={inputStyle}
                  required
                />
              )}

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder="Model (e.g. 320i)"
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  style={inputStyle}
                  required
                />
                <input
                  type="text"
                  placeholder="Year (e.g. 2020)"
                  value={vehicleYear}
                  onChange={(e) => setVehicleYear(e.target.value)}
                  style={inputStyle}
                />
              </div>

              <input
                type="text"
                placeholder="Mileage (e.g. 85,000 km)"
                value={mileage}
                onChange={(e) => setMileage(e.target.value)}
                style={inputStyle}
              />

              <div>
                <label style={labelStyle}>Problem Category</label>
                <select value={problemCategory} onChange={(e) => setProblemCategory(e.target.value)} style={inputStyle}>
                  <option value="Engine">Engine</option>
                  <option value="Brakes">Brakes</option>
                  <option value="Battery">Battery</option>
                  <option value="Tires">Tires</option>
                  <option value="AC">AC / Climate</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label style={labelStyle}>Urgency Level</label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  {(['Low', 'Medium', 'High'] as const).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUrgency(u)}
                      style={urgency === u ? activeUrgencyStyle(u) : pillStyle}
                    >
                      {u === 'Low' ? '🟢' : u === 'Medium' ? '🟡' : '🔴'} {u}
                    </button>
                  ))}
                </div>
              </div>

              <input
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                style={inputStyle}
                required
              />

              <textarea
                placeholder="Describe the problem or sound..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                style={{ ...inputStyle, height: '70px' }}
              />

              <input
                type="url"
                placeholder="Upload Photos (Image Link)"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                style={inputStyle}
              />

              <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                <button type="button" onClick={() => setIsRequestModalOpen(false)} style={cancelButtonStyle}>Cancel</button>
                <button type="submit" disabled={isSubmitting} style={actionButtonStyle}>
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rating Modal */}
      {showRateModal && (
        <div style={modalOverlayStyle}>
          <div style={{ ...modalCardStyle, textAlign: 'center' }}>
            <h3>Rate Garage Service</h3>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', margin: '16px 0' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRateStore(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                >
                  <Star size={28} fill={(hoveredStar || userRating) >= star ? "#eab308" : "none"} color="#eab308" />
                </button>
              ))}
            </div>
            <button onClick={() => setShowRateModal(false)} style={cancelButtonStyle}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Styles (Industrial Dark Theme)
const containerStyle: React.CSSProperties = { padding: '20px', maxWidth: '800px', margin: '0 auto', color: '#f8fafc', background: '#0b0f19', minHeight: '100vh', fontFamily: 'sans-serif' };
const heroCardStyle: React.CSSProperties = { background: '#0f172a', padding: '16px', borderRadius: '16px', border: '1px solid #1e293b', marginBottom: '20px' };
const overlayStyle: React.CSSProperties = { position: 'absolute', inset: 0, background: 'linear-gradient(to top, #0f172a 10%, transparent 80%)' };
const heroContentStyle: React.CSSProperties = { position: 'absolute', bottom: '16px', left: '16px', zIndex: 2 };
const openBadgeStyle: React.CSSProperties = { background: '#064e3b', color: '#34d399', fontSize: '12px', padding: '4px 10px', borderRadius: '20px', fontWeight: 'bold' };
const sectionCardStyle: React.CSSProperties = { background: '#0f172a', padding: '20px', borderRadius: '16px', border: '1px solid #1e293b', marginBottom: '20px' };
const sectionTitleStyle: React.CSSProperties = { margin: 0, fontSize: '16px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' };
const serviceCardStyle: React.CSSProperties = { background: '#1e293b', padding: '12px', borderRadius: '12px', border: '1px solid #334155' };
const actionButtonStyle: React.CSSProperties = { background: '#0284c7', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', flex: 1 };
const cancelButtonStyle: React.CSSProperties = { background: '#334155', color: '#f8fafc', border: 'none', padding: '10px 16px', borderRadius: '8px', cursor: 'pointer', flex: 1 };
const smallButtonStyle: React.CSSProperties = { background: '#334155', color: '#e2e8f0', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' };
const modalOverlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999, padding: '16px' };
const modalCardStyle: React.CSSProperties = { background: '#0f172a', padding: '24px', borderRadius: '16px', border: '1px solid #334155', maxWidth: '480px', width: '100%' };
const inputStyle: React.CSSProperties = { width: '100%', padding: '10px', borderRadius: '8px', background: '#1e293b', border: '1px solid #334155', color: '#fff', fontSize: '13px', boxSizing: 'border-box' };
const labelStyle: React.CSSProperties = { fontSize: '12px', color: '#94a3b8', fontWeight: 'bold' };
const pillStyle: React.CSSProperties = { padding: '6px 12px', borderRadius: '6px', background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', fontSize: '12px', cursor: 'pointer' };
const activePillStyle: React.CSSProperties = { ...pillStyle, background: '#0284c7', color: '#fff', borderColor: '#38bdf8' };
const activeUrgencyStyle = (u: string): React.CSSProperties => ({
  ...pillStyle,
  background: u === 'High' ? '#991b1b' : u === 'Medium' ? '#854d0e' : '#166534',
  color: '#fff',
});