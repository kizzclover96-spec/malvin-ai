import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, firestore as db, storage } from '../firebase'; 
import { 
  doc, 
  setDoc, 
  collection,
  onSnapshot, 
  deleteDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject 
} from 'firebase/storage';
import styles from './salonStation.module.css';

// --- Interfaces & Types ---
interface Worker {
  workerId: string;
  name: string;
  availability: string;
  pictureURL: string;
  catchyPhrase: string;
}

interface Service {
  serviceId: string;
  serviceName: string;
  price: number;
  duration: number;
  description: string;
  category: string;
}

interface StationData {
  salonWorkers: Worker[];
  services: Service[];
}

interface SalonStationProps {
  onBack: () => void;
}

export default function SalonStation({ onBack }: SalonStationProps) {
  const navigate = useNavigate();

  // Auth, Hydration & Sync States
  const [uid, setUid] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [stationData, setStationData] = useState<StationData>({ salonWorkers: [], services: [] });

  // Operation Actions
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [toast, setToast] = useState<string | null>(null);

  // Modals Framework Management
  const [workerModalOpen, setWorkerModalOpen] = useState<boolean>(false);
  const [serviceModalOpen, setServiceModalOpen] = useState<boolean>(false);
  
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  // Form State Containers - Workers
  const [workerName, setWorkerName] = useState('');
  const [workerAvailability, setWorkerAvailability] = useState('');
  const [workerPhrase, setWorkerPhrase] = useState('');
  const [workerFile, setWorkerFile] = useState<File | null>(null);
  const [workerImgPreview, setWorkerImgPreview] = useState<string>('');

  // Form State Containers - Services
  const [serviceName, setServiceName] = useState('');
  const [servicePrice, setServicePrice] = useState<string>('');
  const [serviceDuration, setServiceDuration] = useState<string>('');
  const [serviceDesc, setServiceDesc] = useState('');
  const [serviceCategory, setServiceCategory] = useState('');

  // Elements References for Scrolling Effects
  const workersEndRef = useRef<HTMLDivElement>(null);
  const servicesEndRef = useRef<HTMLDivElement>(null);

  // 1. Authenticate Identity State
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUid(user.uid);
      } else {
        setLoading(false);
        navigate('/login');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  // 2. Subcollection Data Streams Loading Loop
  useEffect(() => {
    if (!uid) return;

    // Stream workers subcollection
    const workersRef = collection(db, 'salonstation', uid, 'salonWorkers');
    const unsubscribeWorkers = onSnapshot(workersRef, (snapshot) => {
      const workersList = snapshot.docs.map(doc => doc.data() as Worker);
      setStationData(prev => ({
        ...prev,
        salonWorkers: workersList
      }));
      setLoading(false);
    }, (err) => {
      console.error("Workers error:", err);
      triggerToast("Error loading document streams.");
      setLoading(false);
    });

    // Stream services subcollection
    const servicesRef = collection(db, 'salonstation', uid, 'services');
    const unsubscribeServices = onSnapshot(servicesRef, (snapshot) => {
      const servicesList = snapshot.docs.map(doc => doc.data() as Service);
      setStationData(prev => ({
        ...prev,
        services: servicesList
      }));
    }, (err) => {
      console.error("Services error:", err);
      triggerToast("Error loading document streams.");
    });

    return () => {
      unsubscribeWorkers();
      unsubscribeServices();
    };
  }, [uid]);

  // 3. Prevent Background Viewport Scrolling Under Active Modals
  useEffect(() => {
    if (workerModalOpen || serviceModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [workerModalOpen, serviceModalOpen]);

  // --- Helper Routines ---
  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setWorkerFile(file);
      setWorkerImgPreview(URL.createObjectURL(file));
    }
  };

  // --- Worker Actions CRUD ---
  const openAddWorker = () => {
    setEditingWorkerId(null);
    setWorkerName('');
    setWorkerAvailability('');
    setWorkerPhrase('');
    setWorkerFile(null);
    setWorkerImgPreview('');
    setWorkerModalOpen(true);
  };

  const openEditWorker = (w: Worker) => {
    setEditingWorkerId(w.workerId);
    setWorkerName(w.name);
    setWorkerAvailability(w.availability);
    setWorkerPhrase(w.catchyPhrase);
    setWorkerFile(null);
    setWorkerImgPreview(w.pictureURL);
    setWorkerModalOpen(true);
  };

  const handleSaveWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !workerName.trim() || !workerAvailability.trim()) {
      triggerToast("Please populate required elements.");
      return;
    }

    setIsSaving(true);
    try {
      const targetId = editingWorkerId || `worker_${Date.now()}`;
      let finalImgUrl = workerImgPreview;

      if (workerFile) {
        const fileRef = ref(storage, `workers/${uid}/${targetId}.jpg`);
        const snapshot = await uploadBytes(fileRef, workerFile);
        finalImgUrl = await getDownloadURL(snapshot.ref);
      }

      const workerPayload: Worker = {
        workerId: targetId,
        name: workerName.trim(),
        availability: workerAvailability.trim(),
        pictureURL: finalImgUrl,
        catchyPhrase: workerPhrase.trim()
      };

      // Save directly into subcollection document
      const workerDocRef = doc(db, 'salonstation', uid, 'salonWorkers', targetId);
      await setDoc(workerDocRef, workerPayload);

      // Touch parent layout timestamp
      await setDoc(doc(db, 'salonstation', uid), { updatedAt: serverTimestamp() }, { merge: true });

      triggerToast(editingWorkerId ? "Worker profile adjusted!" : "New team member attached!");
      setWorkerModalOpen(false);
      
      if (!editingWorkerId) {
        setTimeout(() => workersEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 500);
      }
    } catch (err) {
      console.error(err);
      triggerToast("Error saving updates.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteWorker = async (workerId: string, imageURL: string) => {
    if (!uid || !window.confirm("Confirm deletion of worker?")) return;
    
    try {
      const workerDocRef = doc(db, 'salonstation', uid, 'salonWorkers', workerId);
      await deleteDoc(workerDocRef);

      if (imageURL && imageURL.includes("firebasestorage.googleapis.com")) {
        try {
          const storageRef = ref(storage, `workers/${uid}/${workerId}.jpg`);
          await deleteObject(storageRef);
        } catch (storageErr) {
          // Fall through safely if file was missing
        }
      }
      triggerToast("Worker removed.");
    } catch (err) {
      console.error(err);
      triggerToast("Deletions configuration failed.");
    }
  };

  // --- Service Actions CRUD ---
  const openAddService = () => {
    setEditingServiceId(null);
    setServiceName('');
    setServicePrice('');
    setServiceDuration('');
    setServiceDesc('');
    setServiceCategory('');
    setServiceModalOpen(true);
  };

  const openEditService = (s: Service) => {
    setEditingServiceId(s.serviceId);
    setServiceName(s.serviceName);
    setServicePrice(s.price.toString());
    setServiceDuration(s.duration.toString());
    setServiceDesc(s.description);
    setServiceCategory(s.category);
    setServiceModalOpen(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    const formattedPrice = parseFloat(servicePrice);
    const formattedDuration = parseInt(serviceDuration);

    if (!uid || !serviceName.trim() || isNaN(formattedPrice) || formattedPrice <= 0 || isNaN(formattedDuration) || formattedDuration <= 0) {
      triggerToast("Ensure names, pricing, and duration bounds are valid.");
      return;
    }

    setIsSaving(true);
    try {
      const targetId = editingServiceId || `service_${Date.now()}`;

      const servicePayload: Service = {
        serviceId: targetId,
        serviceName: serviceName.trim(),
        price: formattedPrice,
        duration: formattedDuration,
        description: serviceDesc.trim(),
        category: serviceCategory.trim()
      };

      // Save straight into nested collection path document
      const serviceDocRef = doc(db, 'salonstation', uid, 'services', targetId);
      await setDoc(serviceDocRef, servicePayload);

      // Refresh parent updated marker
      await setDoc(doc(db, 'salonstation', uid), { updatedAt: serverTimestamp() }, { merge: true });

      triggerToast(editingServiceId ? "Service configurations scaled!" : "Service linked to terminal!");
      setServiceModalOpen(false);

      if (!editingServiceId) {
        setTimeout(() => servicesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 500);
      }
    } catch (err) {
      console.error(err);
      triggerToast("Error handling service configurations.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    if (!uid || !window.confirm("Permanently erase service choice?")) return;
    try {
      const serviceDocRef = doc(db, 'salonstation', uid, 'services', serviceId);
      await deleteDoc(serviceDocRef);
      triggerToast("Service cleared.");
    } catch (err) {
      console.error(err);
      triggerToast("Failed service entry purging.");
    }
  };

  // --- Memoized Sorting Optimization Modules ---
  const sortedWorkers = useMemo(() => {
    return [...stationData.salonWorkers].sort((a, b) => a.name.localeCompare(b.name));
  }, [stationData.salonWorkers]);

  const sortedServices = useMemo(() => {
    return [...stationData.services].sort((a, b) => a.serviceName.localeCompare(b.serviceName));
  }, [stationData.services]);


  if (loading) {
    return (
      <div className={styles.stationContainer}>
        <div className={styles.skeletonHeader}></div>
        <div className={styles.skeletonCard}></div>
        <div className={styles.skeletonCard}></div>
      </div>
    );
  }

  return (
    <div className={styles.stationContainer}>
      {toast && <div className={styles.toast}>{toast}</div>}

      {/* --- STICKY APPBAR HEADER --- */}
      <header className={styles.stickyHeader}>
        <div className={styles.headerLimit}>
          <button className={styles.backNavButton} onClick={() => navigate(-1)}>
            &larr; Back
          </button>
          <div>
            <h1 className={styles.mainTitle}>Salon Station</h1>
            <p className={styles.subTitle}>Manage your workers and services</p>
          </div>
        </div>
      </header>

      <main className={styles.contentWrap}>
        
        {/* --- WORKERS SUB-MODULE SECTION --- */}
        <section className={styles.moduleSection}>
          <div className={styles.moduleSectionHeader}>
            <h2>Salon Workers</h2>
            <button className={styles.addButtonInline} onClick={openAddWorker}>
              <span>+ Add Worker</span>
            </button>
          </div>

          <div className={styles.cardsStack}>
            {sortedWorkers.length === 0 ? (
              <p className={styles.emptyText}>No registered workers located. Assign team members above.</p>
            ) : (
              sortedWorkers.map(worker => (
                <div key={worker.workerId} className={styles.glassCard}>
                  <div className={styles.workerRowLayout}>
                    <img 
                      src={worker.pictureURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'} 
                      alt={worker.name} 
                      className={styles.workerAvatar} 
                    />
                    <div className={styles.workerDetails}>
                      <h3>{worker.name}</h3>
                      <span className={styles.badgeAvailability}>{worker.availability}</span>
                      {worker.catchyPhrase && <p className={styles.catchyText}>&ldquo;{worker.catchyPhrase}&rdquo;</p>}
                    </div>
                  </div>
                  <div className={styles.cardActionsRow}>
                    <button className={styles.actionBtnEdit} onClick={() => openEditWorker(worker)}>Edit</button>
                    <button className={styles.actionBtnDelete} onClick={() => handleDeleteWorker(worker.workerId, worker.pictureURL)}>Delete</button>
                  </div>
                </div>
              ))
            )}
            <div ref={workersEndRef} />
          </div>
        </section>

        {/* --- SERVICES SUB-MODULE SECTION --- */}
        <section className={styles.moduleSection}>
          <div className={styles.moduleSectionHeader}>
            <h2>Salon Services</h2>
            <button className={styles.addButtonInline} onClick={openAddService}>
              <span>+ Add Service</span>
            </button>
          </div>

          <div className={styles.cardsStack}>
            {sortedServices.length === 0 ? (
              <p className={styles.emptyText}>No premium services active yet. Deploy alternatives using the link above.</p>
            ) : (
              sortedServices.map(service => (
                <div key={service.serviceId} className={styles.glassCard}>
                  <div className={styles.serviceHeadline}>
                    <h3>{service.serviceName}</h3>
                    <span className={styles.servicePriceTag}>€{service.price.toFixed(2)}</span>
                  </div>
                  <div className={styles.serviceMetaRow}>
                    <span className={styles.metaLabel}>⏱ {service.duration} Mins</span>
                    {service.category && <span className={styles.categoryBadge}>{service.category}</span>}
                  </div>
                  {service.description && <p className={styles.serviceDescriptionText}>{service.description}</p>}
                  <div className={styles.cardActionsRow}>
                    <button className={styles.actionBtnEdit} onClick={() => openEditService(service)}>Edit</button>
                    <button className={styles.actionBtnDelete} onClick={() => handleDeleteService(service.serviceId)}>Delete</button>
                  </div>
                </div>
              ))
            )}
            <div ref={servicesEndRef} />
          </div>
        </section>
      </main>

      {/* --- ADD/EDIT WORKER MODAL COMPONENT SHEET --- */}
      {workerModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>{editingWorkerId ? "Modify Worker" : "Add Worker Profile"}</h2>
              <button className={styles.closeBtnX} onClick={() => setWorkerModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleSaveWorker} className={styles.modalForm}>
              <div className={styles.formField}>
                <label>Worker Name *</label>
                <input 
                  type="text" 
                  value={workerName} 
                  onChange={(e) => setWorkerName(e.target.value)} 
                  placeholder="e.g., Alexander Cole" 
                  required 
                />
              </div>

              <div className={styles.formField}>
                <label>Availability *</label>
                <input 
                  type="text" 
                  value={workerAvailability} 
                  onChange={(e) => setWorkerAvailability(e.target.value)} 
                  placeholder="e.g., Monday-Friday or Weekends" 
                  required 
                />
              </div>

              <div className={styles.formField}>
                <label>Profile Picture</label>
                <div className={styles.imageUploadWrapper}>
                  {workerImgPreview && (
                    <img src={workerImgPreview} alt="Preview" className={styles.uploadPreviewCircle} />
                  )}
                  <input type="file" accept="image/*" onChange={handleImageChange} className={styles.fileInputHidden} id="workerPicFile" />
                  <label htmlFor="workerPicFile" className={styles.fileInputLabel}>
                    {workerImgPreview ? "Change Image" : "Upload Image Asset"}
                  </label>
                </div>
              </div>

              <div className={styles.formField}>
                <label>Catchy Phrase (Max 100 characters)</label>
                <textarea 
                  maxLength={100} 
                  rows={2} 
                  value={workerPhrase} 
                  onChange={(e) => setWorkerPhrase(e.target.value)}
                  placeholder="Premium fades, high attention to details..."
                />
                <span className={styles.charCountCounter}>{workerPhrase.length}/100</span>
              </div>

              <div className={styles.formActionSubmissionRow}>
                <button type="button" className={styles.btnCancelForm} onClick={() => setWorkerModalOpen(false)}>Cancel</button>
                <button type="submit" className={styles.btnConfirmForm} disabled={isSaving}>
                  {isSaving ? "Saving Entry..." : "Save Worker"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD/EDIT SERVICE MODAL COMPONENT SHEET --- */}
      {serviceModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2>{editingServiceId ? "Edit Service Parameters" : "Add Service Package"}</h2>
              <button className={styles.closeBtnX} onClick={() => setServiceModalOpen(false)}>&times;</button>
            </div>
            <form onSubmit={handleSaveService} className={styles.modalForm}>
              <div className={styles.formField}>
                <label>Service Name *</label>
                <input 
                  type="text" 
                  value={serviceName} 
                  onChange={(e) => setServiceName(e.target.value)} 
                  placeholder="e.g., Executive Scissor Cut" 
                  required 
                />
              </div>

              <div className={styles.formRowSplit}>
                <div className={styles.formField}>
                  <label>Price (€) *</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0.01" 
                    value={servicePrice} 
                    onChange={(e) => setServicePrice(e.target.value)} 
                    placeholder="35.00" 
                    required 
                  />
                </div>
                <div className={styles.formField}>
                  <label>Duration (Minutes) *</label>
                  <input 
                    type="number" 
                    min="1" 
                    value={serviceDuration} 
                    onChange={(e) => setServiceDuration(e.target.value)} 
                    placeholder="30" 
                    required 
                  />
                </div>
              </div>

              <div className={styles.formField}>
                <label>Category Tag</label>
                <input 
                  type="text" 
                  value={serviceCategory} 
                  onChange={(e) => setServiceCategory(e.target.value)} 
                  placeholder="e.g., Haircut, Fade, Nails, Spa" 
                />
              </div>

              <div className={styles.formField}>
                <label>Description</label>
                <textarea 
                  rows={3} 
                  value={serviceDesc} 
                  onChange={(e) => setServiceDesc(e.target.value)}
                  placeholder="Includes dynamic premium rinse, line treatment up and styling ointment application..."
                />
              </div>

              <div className={styles.formActionSubmissionRow}>
                <button type="button" className={styles.btnCancelForm} onClick={() => setServiceModalOpen(false)}>Cancel</button>
                <button type="submit" className={styles.btnConfirmForm} disabled={isSaving}>
                  {isSaving ? "Saving Setup..." : "Save Service"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}