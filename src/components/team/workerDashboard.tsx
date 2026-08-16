import React, { useState, useEffect } from 'react';
import { firestore as db } from '../../firebase'; 
import { auth } from "../../firebase"; // Adjust paths as needed
import { signOut } from 'firebase/auth'; // Imported native Firebase authentication signout method
import { clearPushToken } from '../../services/pushNotifications';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  doc, 
  updateDoc,
  addDoc,
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { WorkerAccess, DEFAULT_WORKER_ACCESS } from './WorkerPermissionsModal';

// --- Interfaces ---
interface Appointment {
  id: string;
  customerName: string;
  customerUid: string;
  time: string;
  services: string[];
  duration: string;
  status: 'Scheduled' | 'Checked In' | 'Completed' | 'Cancelled';
  notes?: string[];
}

interface Task {
  id: string;
  title: string;
  priority: 'Low' | 'Medium' | 'High';
  dueDate: string;
  status: 'Pending' | 'Completed';
}

interface Announcement {
  id: string;
  content: string;
  isUrgent?: boolean;
}

interface MessagePreview {
  senderName: string;
  text: string;
}

interface WorkerDashboardProps {
  businessUid: string;
  onNavigate: (screen: 'chat' | 'appointments' | 'search' | 'qr') => void;
}

export const WorkerDashboard: React.FC<WorkerDashboardProps> = ({ businessUid, onNavigate }) => {
  // --- State Hooks ---
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [messagePreview, setMessagePreview] = useState<MessagePreview | null>(null);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  
  // AI Panel State
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');

  // --- What the manager has allowed workers to do (business/{businessUid}.profile) ---
  const [workerAccess, setWorkerAccess] = useState<WorkerAccess>(DEFAULT_WORKER_ACCESS);
  const [systemInventoryEnabled, setSystemInventoryEnabled] = useState(false);
  const [permissionsLoaded, setPermissionsLoaded] = useState(false);

  // Manual order entry panel
  const [manualOrderOpen, setManualOrderOpen] = useState(false);
  const [manualOrderText, setManualOrderText] = useState('');
  const [manualOrderSubmitting, setManualOrderSubmitting] = useState(false);
  const [manualOrderSent, setManualOrderSent] = useState(false);

  // Inventory scan / lookup panel
  const [stockLookupOpen, setStockLookupOpen] = useState(false);
  const [stockBarcode, setStockBarcode] = useState('');
  const [stockLookupBusy, setStockLookupBusy] = useState(false);
  const [stockResult, setStockResult] = useState<{ found: boolean; productName?: string; quantity?: number; sku?: string } | null>(null);

  const currentUserId = auth.currentUser?.uid;
  const workerName = auth.currentUser?.displayName || auth.currentUser?.email || 'Emma';

  // --- Dynamic System Date Formatter ---
  const todayDateString = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  // --- Firebase Real-time Data Synchronization ---
  useEffect(() => {
    if (!businessUid || !currentUserId) return;

    // 1. Fetch Today's Appointments for specific worker
    const apptQuery = query(
      collection(db, 'businesses', businessUid, 'appointments'),
      where('assignedWorkerUid', '==', currentUserId),
      orderBy('time', 'asc')
    );
    const unsubscribeAppts = onSnapshot(apptQuery, (snapshot) => {
      const appts: Appointment[] = [];
      snapshot.forEach((doc) => appts.push({ id: doc.id, ...doc.data() } as Appointment));
      setAppointments(appts);
    });

    // 2. Fetch Pending Tasks from Team Hub
    const taskQuery = query(
      collection(db, 'teamHub', businessUid, 'tasks'),
      where('assignedTo', '==', currentUserId),
      where('status', '==', 'Pending'),
      limit(5)
    );
    const unsubscribeTasks = onSnapshot(taskQuery, (snapshot) => {
      const tsks: Task[] = [];
      snapshot.forEach((doc) => tsks.push({ id: doc.id, ...doc.data() } as Task));
      setTasks(tsks);
    });

    // 3. Fetch Latest Broadcast Announcement
    const annQuery = query(
      collection(db, 'teamHub', businessUid, 'announcements'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    const unsubscribeAnn = onSnapshot(annQuery, (snapshot) => {
      if (!snapshot.empty) {
        const docData = snapshot.docs[0].data();
        setAnnouncement({ id: snapshot.docs[0].id, content: docData.content, isUrgent: docData.isUrgent });
      }
    });

    // 4. Fetch Last Message Preview
    const msgQuery = query(
      collection(db, 'teamHub', businessUid, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    const unsubscribeMsg = onSnapshot(msgQuery, (snapshot) => {
      if (!snapshot.empty) {
        const docData = snapshot.docs[0].data();
        setMessagePreview({ senderName: docData.senderName, text: docData.text });
      }
    });

    return () => {
      unsubscribeAppts();
      unsubscribeTasks();
      unsubscribeAnn();
      unsubscribeMsg();
    };
  }, [businessUid, currentUserId]);

  // --- What the manager has set from B-Vin (business/{businessUid}.profile) ---
  useEffect(() => {
    if (!businessUid) return;
    const unsub = onSnapshot(doc(db, 'business', businessUid), (snap) => {
      const profile = snap.data()?.profile;
      if (profile?.workerAccess) {
        setWorkerAccess({ ...DEFAULT_WORKER_ACCESS, ...profile.workerAccess });
      }
      setSystemInventoryEnabled(!!profile?.systemInventoryEnabled);
      setPermissionsLoaded(true);
    });
    return () => unsub();
  }, [businessUid]);

  // --- Transaction State Mutations ---
  const handleUpdateStatus = async (apptId: string, newStatus: Appointment['status']) => {
    const docRef = doc(db, 'businesses', businessUid, 'appointments', apptId);
    await updateDoc(docRef, { status: newStatus });
  };

  const handleCompleteTask = async (taskId: string) => {
    const docRef = doc(db, 'teamHub', businessUid, 'tasks', taskId);
    await updateDoc(docRef, { status: 'Completed' });
  };

  // --- Manual order entry: typed up by a worker when there's no QR to scan ---
  const handleSubmitManualOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualOrderText.trim() || !businessUid) return;
    setManualOrderSubmitting(true);
    try {
      await addDoc(collection(db, 'business', businessUid, 'manualOrders'), {
        text: manualOrderText.trim(),
        workerUid: currentUserId || '',
        workerName,
        createdAt: serverTimestamp(),
        status: 'Pending',
      });
      setManualOrderText('');
      setManualOrderSent(true);
      setTimeout(() => {
        setManualOrderSent(false);
        setManualOrderOpen(false);
      }, 1200);
    } catch (error) {
      console.error('Failed to submit manual order:', error);
    } finally {
      setManualOrderSubmitting(false);
    }
  };

  // --- Scan & check inventory: read-only stock lookup by barcode ---
  const handleStockLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stockBarcode.trim() || !businessUid) return;
    setStockLookupBusy(true);
    setStockResult(null);
    try {
      const q = query(
        collection(db, 'users', businessUid, 'products'),
        where('barcode', '==', stockBarcode.trim())
      );
      const snap = await getDocs(q);
      if (snap.empty) {
        setStockResult({ found: false });
      } else {
        const p = snap.docs[0].data() as any;
        setStockResult({ found: true, productName: p.productName, quantity: p.quantity, sku: p.sku });
      }
    } catch (error) {
      console.error('Stock lookup failed:', error);
      setStockResult({ found: false });
    } finally {
      setStockLookupBusy(false);
    }
  };

  // --- Firebase Session Destruction Call ---
  const handleLogout = async () => {
    try {
      // Must run before signOut() — see App.jsx's onAuthStateChanged
      // comment for why this fails every time if called after.
      if (currentUserId) await clearPushToken(currentUserId);
      await signOut(auth);
    } catch (error) {
      console.error("Error executing terminal logout sequence:", error);
    }
  };

  // --- Local Deterministic AI Responses Engine ---
  const handleAiQuerySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const queryTxt = aiQuery.toLowerCase();
    
    if (queryTxt.includes('appointment') || queryTxt.includes('next')) {
      const upcoming = appointments.find(a => a.status !== 'Completed' && a.status !== 'Cancelled');
      setAiResponse(upcoming 
        ? `Your next client is ${upcoming.customerName} at ${upcoming.time} for ${upcoming.services.join(', ')}.`
        : "You are all clear! No remaining appointments for today.");
    } else if (queryTxt.includes('task') || queryTxt.includes('remain')) {
      setAiResponse(tasks.length > 0 
        ? `You still have ${tasks.length} tasks pending completion. Focus on: "${tasks[0].title}".`
        : "Excellent work, you have completed all assigned tasks.");
    } else if (queryTxt.includes('announcement') || queryTxt.includes('broadcast')) {
      setAiResponse(announcement 
        ? `Latest workspace alert: "${announcement.content}"`
        : "There are no new management alerts posted today.");
    } else {
      setAiResponse("I can help you monitor schedules, tasks, and notifications. Try asking: 'Who is my next customer?'");
    }
    setAiQuery('');
  };

  return (
    <div style={styles.dashboardContainer}>
      
      {/* Top Professional Header Bar */}
      <header style={styles.welcomeHeader}>
        <div>
          <h1 style={styles.greetingText}>Hello, {workerName}</h1>
          <p style={styles.dateLabel}>{todayDateString}</p>
        </div>
        <div style={styles.headerControls}>
          <div style={styles.onlineBadge}>Terminal Active</div>
          {/* Logout Trigger Node Element */}
          <button style={styles.logoutBtn} onClick={handleLogout}>
            Logout
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main style={styles.mainContent}>
        
        {/* Urgent Announcement Alert banner (Hidden if empty) */}
        {announcement && (
          <div style={{...styles.alertBanner, borderColor: announcement.isUrgent ? '#ef4444' : '#3b82f6'}}>
            <span style={styles.alertTag}>{announcement.isUrgent ? 'CRITICAL SYSTEM NOTICE' : 'MANAGEMENT UPDATE'}</span>
            <p style={styles.alertBody}>{announcement.content}</p>
          </div>
        )}

        {/* Real-time Incoming Message Hub Bridge */}
        {messagePreview && (
          <div style={styles.msgCard} onClick={() => onNavigate('chat')}>
            <div style={styles.msgHeader}>
              <span style={styles.msgTitle}>Unread Team Communication</span>
              <span style={styles.msgAction}>Open Comms Link →</span>
            </div>
            <p style={styles.msgSnippet}><strong>{messagePreview.senderName}:</strong> "{messagePreview.text}"</p>
          </div>
        )}

        {/* Central Action Area — shows only what the manager has allowed */}
        <section style={styles.centerScannerSection}>
          {!permissionsLoaded ? null : !workerAccess.scanCustomerCard && !workerAccess.manualOrderEntry && !workerAccess.scanInventoryLookup ? (
            <div style={styles.noAccessBox}>
              <span style={{ fontSize: '32px', marginBottom: '10px' }}>🔒</span>
              <p style={styles.noAccessText}>Your manager hasn't turned on any tools for you yet. Ask them to enable this from Add Workers in B-Vin.</p>
            </div>
          ) : (
            <div style={styles.actionGrid}>
              {workerAccess.scanCustomerCard && (
                <button style={styles.actionTile} onClick={() => onNavigate('qr')}>
                  <span style={{ fontSize: '34px', marginBottom: '10px' }}>📷</span>
                  <span style={styles.actionTileTitle}>Scan Customer Card</span>
                  <span style={styles.actionTileSub}>Scan a customer's Malvin QR</span>
                </button>
              )}
              {workerAccess.manualOrderEntry && (
                <button style={styles.actionTile} onClick={() => setManualOrderOpen(true)}>
                  <span style={{ fontSize: '34px', marginBottom: '10px' }}>⌨️</span>
                  <span style={styles.actionTileTitle}>Type Order</span>
                  <span style={styles.actionTileSub}>No QR? Type what the customer wants</span>
                </button>
              )}
              {workerAccess.scanInventoryLookup && (
                <button
                  style={{ ...styles.actionTile, opacity: systemInventoryEnabled ? 1 : 0.5, cursor: systemInventoryEnabled ? 'pointer' : 'not-allowed' }}
                  onClick={() => { if (systemInventoryEnabled) { setStockResult(null); setStockBarcode(''); setStockLookupOpen(true); } }}
                >
                  <span style={{ fontSize: '34px', marginBottom: '10px' }}>📦</span>
                  <span style={styles.actionTileTitle}>Check Stock</span>
                  <span style={styles.actionTileSub}>
                    {systemInventoryEnabled ? 'Scan a barcode to see what\'s in stock' : 'Ask your manager to connect System Inventory'}
                  </span>
                </button>
              )}
            </div>
          )}
        </section>

      </main>

      {/* Floating Customer Modal Layer */}
      {selectedAppointment && (
        <div style={styles.modalOverlay} onClick={() => setSelectedAppointment(null)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalHeading}>Client Profile & History</h3>
            <p style={styles.modalSubheading}>{selectedAppointment.customerName}</p>
            
            <div style={styles.notesSection}>
              <h4 style={styles.notesTitle}>Preference Profile & Notes</h4>
              <ul style={styles.notesList}>
                <li>Prefers classic skin fade execution.</li>
                <li>Maintains routine appointments every 3 weeks.</li>
                <li>Hypersensitive skin; strictly avoid scented post-shave tonics.</li>
                <li>Requested assignment to current worker profile.</li>
              </ul>
            </div>
            <button style={styles.closeModalBtn} onClick={() => setSelectedAppointment(null)}>Return to Terminal</button>
          </div>
        </div>
      )}

      {/* Manual Order Entry Modal */}
      {manualOrderOpen && (
        <div style={styles.modalOverlay} onClick={() => setManualOrderOpen(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalHeading}>Type Order</h3>
            <p style={styles.modalSubheading}>What does the customer want?</p>
            {manualOrderSent ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#10b981', fontWeight: 600 }}>
                ✓ Sent to your team
              </div>
            ) : (
              <form onSubmit={handleSubmitManualOrder}>
                <textarea
                  value={manualOrderText}
                  onChange={(e) => setManualOrderText(e.target.value)}
                  placeholder="e.g. 2x cheeseburger, no onions, 1x cola..."
                  style={styles.manualOrderTextarea}
                  required
                />
                <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
                  <button type="button" onClick={() => setManualOrderOpen(false)} style={styles.secondaryModalBtn}>Cancel</button>
                  <button type="submit" disabled={manualOrderSubmitting} style={styles.closeModalBtn}>
                    {manualOrderSubmitting ? 'Sending...' : 'Send Order'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Check Stock Modal */}
      {stockLookupOpen && (
        <div style={styles.modalOverlay} onClick={() => setStockLookupOpen(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalHeading}>Check Stock</h3>
            <p style={styles.modalSubheading}>Scan or type a product barcode</p>
            <form onSubmit={handleStockLookup} style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={stockBarcode}
                onChange={(e) => setStockBarcode(e.target.value)}
                placeholder="Barcode / SKU"
                autoFocus
                style={styles.aiInput}
              />
              <button type="submit" disabled={stockLookupBusy} style={styles.aiSubmit}>
                {stockLookupBusy ? '...' : 'Check'}
              </button>
            </form>

            {stockResult && (
              <div style={styles.stockResultBox}>
                {stockResult.found ? (
                  <>
                    <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>{stockResult.productName}</div>
                    {stockResult.sku && <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>SKU: {stockResult.sku}</div>}
                    <div style={{ fontSize: '28px', fontWeight: 800, color: (stockResult.quantity ?? 0) > 0 ? '#10b981' : '#ef4444', marginTop: '8px' }}>
                      {stockResult.quantity ?? 0} in stock
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: '13px', color: '#f87171' }}>No product found with that barcode.</div>
                )}
              </div>
            )}

            <button onClick={() => setStockLookupOpen(false)} style={{ ...styles.closeModalBtn, marginTop: '16px' }}>Close</button>
          </div>
        </div>
      )}

      {/* Floating Intelligent AI Utility Panel */}
      <div style={styles.aiWidget}>
        <button style={styles.aiToggleBtn} onClick={() => setIsAiOpen(!isAiOpen)}>🤖 System Copilot</button>
        {isAiOpen && (
          <div style={styles.aiBox}>
            <div style={styles.aiHeader}>Malvin Workspace AI</div>
            {aiResponse && <p style={styles.aiReply}>{aiResponse}</p>}
            <form onSubmit={handleAiQuerySubmit} style={styles.aiForm}>
              <input 
                type="text" 
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                placeholder="Ask about data updates..." 
                style={styles.aiInput}
                required
              />
              <button type="submit" style={styles.aiSubmit}>Query</button>
            </form>
          </div>
        )}
      </div>

    </div>
  );
};

// --- Enterprise Clean Worker Interface Styles ---
const styles: { [key: string]: React.CSSProperties } = {
  dashboardContainer: {
    display: 'flex',
    flexDirection: 'column',
    minHeight: '100vh',
    backgroundColor: '#0b0f19',
    color: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    boxSizing: 'border-box',
  },
  welcomeHeader: {
    padding: '20px 24px',
    backgroundColor: '#111827',
    borderBottom: '1px solid #1f2937',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerControls: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  greetingText: {
    margin: 0,
    fontSize: '22px',
    fontWeight: '600',
    color: '#ffffff',
  },
  dateLabel: {
    margin: '4px 0 0 0',
    fontSize: '13px',
    color: '#9ca3af',
  },
  onlineBadge: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#10b981',
    background: 'rgba(16, 185, 129, 0.1)',
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid rgba(16, 185, 129, 0.2)',
  },
  logoutBtn: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#f8fafc',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    padding: '6px 14px',
    borderRadius: '6px',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  mainContent: {
    flex: 1,
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    maxWidth: '1200px',
    width: '100%',
    margin: '0 auto',
    boxSizing: 'border-box',
  },
  alertBanner: {
    background: '#111827',
    borderLeft: '4px solid',
    borderRadius: '8px',
    padding: '16px',
    border: '1px solid #1f2937',
    borderLeftWidth: '4px',
  },
  alertTag: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#9ca3af',
    display: 'block',
    marginBottom: '4px',
  },
  alertBody: {
    margin: 0,
    fontSize: '14px',
    color: '#e5e7eb',
    lineHeight: '1.5',
  },
  msgCard: {
    background: '#111827',
    border: '1px solid #1f2937',
    borderRadius: '8px',
    padding: '14px 16px',
    cursor: 'pointer',
  },
  msgHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#9ca3af',
    marginBottom: '6px',
  },
  msgTitle: {
    fontWeight: '600',
  },
  msgAction: {
    color: '#3b82f6',
    fontWeight: '500',
  },
  msgSnippet: {
    margin: 0,
    fontSize: '14px',
    color: '#f3f4f6',
  },
  centerScannerSection: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '380px',
    padding: '40px 0',
  },
  noAccessBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    maxWidth: '360px',
    padding: '24px',
  },
  noAccessText: {
    fontSize: '13px',
    color: '#9ca3af',
    lineHeight: '1.5',
    margin: 0,
  },
  actionGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '16px',
    width: '100%',
    maxWidth: '640px',
  },
  actionTile: {
    background: '#111827',
    border: '1px solid #1f2937',
    borderRadius: '16px',
    padding: '28px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    cursor: 'pointer',
    color: '#ffffff',
  },
  actionTileTitle: {
    fontWeight: 600,
    fontSize: '14px',
    letterSpacing: '0.3px',
  },
  actionTileSub: {
    fontSize: '11px',
    color: '#94a3b8',
    marginTop: '6px',
    lineHeight: '1.4',
  },
  manualOrderTextarea: {
    width: '100%',
    minHeight: '100px',
    background: '#0b0f19',
    border: '1px solid #1f2937',
    borderRadius: '8px',
    padding: '12px',
    color: '#fff',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  secondaryModalBtn: {
    flex: 1,
    background: 'transparent',
    color: '#9ca3af',
    border: '1px solid #1f2937',
    padding: '12px 0',
    borderRadius: '6px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  stockResultBox: {
    marginTop: '16px',
    background: '#0b0f19',
    border: '1px solid #1f2937',
    borderRadius: '10px',
    padding: '16px',
    textAlign: 'center',
  },
  scannerWrapper: {
    width: '100%',
    maxWidth: '400px',
    aspectRatio: '1 / 1',
    backgroundColor: '#111827',
    border: '1px solid #1f2937',
    borderRadius: '16px',
    padding: '24px',
    boxSizing: 'border-box',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerTargetBox: {
    width: '100%',
    height: '100%',
    position: 'relative',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0b0f19',
    borderRadius: '8px',
  },
  cornerBracket: {
    position: 'absolute',
    width: '24px',
    height: '24px',
  },
  scanTriggerBtn: {
    background: 'none',
    border: 'none',
    color: '#ffffff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    cursor: 'pointer',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    padding: '20px',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.75)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    zIndex: 100,
  },
  modalContent: {
    background: '#111827',
    border: '1px solid #1f2937',
    borderRadius: '12px',
    padding: '24px',
    width: '100%',
    maxWidth: '420px',
  },
  modalHeading: {
    margin: 0,
    fontSize: '14px',
    color: '#9ca3af',
  },
  modalSubheading: {
    margin: '4px 0 20px 0',
    fontSize: '22px',
    fontWeight: '700',
    color: '#fff',
  },
  notesSection: {
    background: '#0b0f19',
    padding: '16px',
    borderRadius: '8px',
    marginBottom: '20px',
    border: '1px solid #1f2937',
  },
  notesTitle: {
    margin: '0 0 10px 0',
    fontSize: '14px',
    color: '#e5e7eb',
  },
  notesList: {
    margin: 0,
    paddingLeft: '20px',
    color: '#9ca3af',
    fontSize: '13px',
    lineHeight: '1.6',
  },
  closeModalBtn: {
    width: '100%',
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    padding: '12px 0',
    borderRadius: '6px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  aiWidget: {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  aiToggleBtn: {
    background: '#1f2937',
    color: '#ffffff',
    border: '1px solid #374151',
    borderRadius: '8px',
    padding: '10px 16px',
    fontWeight: '500',
    fontSize: '13px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
    cursor: 'pointer',
  },
  aiBox: {
    marginTop: '10px',
    width: '300px',
    background: '#111827',
    border: '1px solid #1f2937',
    borderRadius: '8px',
    padding: '14px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
  },
  aiHeader: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#9ca3af',
    marginBottom: '10px',
  },
  aiReply: {
    margin: '0 0 12px 0',
    fontSize: '13px',
    color: '#e5e7eb',
    background: '#0b0f19',
    padding: '10px',
    borderRadius: '6px',
    lineHeight: '1.4',
    border: '1px solid #1f2937',
  },
  aiForm: {
    display: 'flex',
    gap: '6px',
  },
  aiInput: {
    flex: 1,
    background: '#0b0f19',
    border: '1px solid #1f2937',
    borderRadius: '6px',
    padding: '8px 12px',
    color: '#fff',
    fontSize: '13px',
    outline: 'none',
  },
  aiSubmit: {
    background: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    padding: '0 14px',
    fontSize: '13px',
    cursor: 'pointer',
    fontWeight: '500',
  }
};