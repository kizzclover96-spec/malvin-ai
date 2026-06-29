import React, { useState, useEffect } from 'react';
import { firestore as db } from '../firebase'; 
import { auth } from "../firebase"; // Adjust paths as needed
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  doc, 
  updateDoc,
  getDocs
} from 'firebase/firestore';

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

  const currentUserId = auth.currentUser?.uid;
  const workerName = auth.currentUser?.displayName || 'Emma';

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

  // --- Transaction State Mutations ---
  const handleUpdateStatus = async (apptId: string, newStatus: Appointment['status']) => {
    const docRef = doc(db, 'businesses', businessUid, 'appointments', apptId);
    await updateDoc(docRef, { status: newStatus });
  };

  const handleCompleteTask = async (taskId: string) => {
    const docRef = doc(db, 'teamHub', businessUid, 'tasks', taskId);
    await updateDoc(docRef, { status: 'Completed' });
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

  // --- Performance Calculations ---
  const completedTodayCount = appointments.filter(a => a.status === 'Completed').length;

  return (
    <div style={styles.dashboardContainer}>
      <div style={styles.glassView}>
        
        {/* Dynamic Context Greeting Header */}
        <header style={styles.welcomeHeader}>
          <div>
            <h1 style={styles.greetingText}>Good Morning, {workerName}</h1>
            <p style={styles.dateLabel}>{todayDateString}</p>
          </div>
          <div style={styles.onlineBadge}>Live Workspace</div>
        </header>

        <div style={styles.scrollContainer}>
          
          {/* Urgent Announcement Alert banner */}
          {announcement && (
            <div style={{...styles.alertBanner, borderColor: announcement.isUrgent ? '#ef4444' : 'rgba(255,255,255,0.2)'}}>
              <span style={styles.alertTag}>{announcement.isUrgent ? 'URGENT NOTICE' : 'UPDATE'}</span>
              <p style={styles.alertBody}>{announcement.content}</p>
            </div>
          )}

          {/* Real-time Incoming Message Hub Bridge */}
          {messagePreview && (
            <div style={styles.msgCard} onClick={() => onNavigate('chat')}>
              <div style={styles.msgHeader}>
                <span style={styles.msgTitle}>Internal Comms Link</span>
                <span style={styles.msgAction}>Tap to Open Hub →</span>
              </div>
              <p style={styles.msgSnippet}><strong>{messagePreview.senderName}:</strong> "{messagePreview.text}"</p>
            </div>
          )}

          {/* Fast-access Tactical Quick Actions Control Matrix */}
          <section style={styles.gridSection}>
            <button style={styles.quickButton} onClick={() => onNavigate('chat')}>💬 Open Chat</button>
            <button style={styles.quickButton} onClick={() => onNavigate('appointments')}>📅 Today's Bookings</button>
            <button style={styles.quickButton} onClick={() => onNavigate('search')}>🔍 Customer Lookup</button>
            <button style={styles.quickButton} onClick={() => onNavigate('qr')}>🔲 Scan Client QR</button>
          </section>

          {/* Core Master Schedule Content Area */}
          <section style={styles.blockSection}>
            <h2 style={styles.sectionHeading}>Today's Schedule</h2>
            {appointments.length === 0 ? (
              <p style={styles.emptyPrompt}>No scheduled bookings for today.</p>
            ) : (
              appointments.map((appt) => (
                <div key={appt.id} style={styles.appointmentCard} onClick={() => setSelectedAppointment(appt)}>
                  <div style={styles.apptHeaderRow}>
                    <span style={styles.clientName}>{appt.customerName}</span>
                    <span style={styles.apptTime}>{appt.time} ({appt.duration})</span>
                  </div>
                  <div style={styles.serviceTagsRow}>
                    {appt.services.map((s, idx) => (
                      <span key={idx} style={styles.serviceTag}>{s}</span>
                    ))}
                  </div>
                  <div style={styles.statusIndicatorLine}>Status: <strong style={{color: '#fff'}}>{appt.status}</strong></div>
                  
                  {/* Action Targets Execution Layer */}
                  <div style={styles.apptActionsGrid} onClick={(e) => e.stopPropagation()}>
                    {appt.status === 'Scheduled' && (
                      <button style={{...styles.apptBtn, backgroundColor: '#3b82f6'}} onClick={() => handleUpdateStatus(appt.id, 'Checked In')}>Check In</button>
                    )}
                    {appt.status !== 'Completed' && appt.status !== 'Cancelled' && (
                      <button style={{...styles.apptBtn, backgroundColor: '#10b981'}} onClick={() => handleUpdateStatus(appt.id, 'Completed')}>Complete</button>
                    )}
                    {appt.status !== 'Cancelled' && appt.status !== 'Completed' && (
                      <button style={{...styles.apptBtn, backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171'}} onClick={() => handleUpdateStatus(appt.id, 'Cancelled')}>Cancel</button>
                    )}
                  </div>
                </div>
              ))
            )}
          </section>

          {/* Action-Item Task Tracker */}
          <section style={styles.blockSection}>
            <h2 style={styles.sectionHeading}>Pending Tasks</h2>
            {tasks.length === 0 ? (
              <p style={styles.emptyPrompt}>All clear! No remaining tasks.</p>
            ) : (
              tasks.map((task) => (
                <div key={task.id} style={styles.taskCard}>
                  <div>
                    <span style={{...styles.priorityIndicator, backgroundColor: task.priority === 'High' ? '#ef4444' : '#f59e0b'}}>{task.priority}</span>
                    <p style={styles.taskTitle}>{task.title}</p>
                    <span style={styles.taskDue}>Due: {task.dueDate}</span>
                  </div>
                  <button style={styles.taskCompleteBtn} onClick={() => handleCompleteTask(task.id)}>✓ Done</button>
                </div>
              ))
            )}
          </section>

          {/* Analytical Metrics Performance Summary */}
          <section style={styles.blockSection}>
            <h2 style={styles.sectionHeading}>Performance Metrics</h2>
            <div style={styles.metricsContainer}>
              <div style={styles.metricItem}>
                <span style={styles.metricVal}>{completedTodayCount}</span>
                <span style={styles.metricLbl}>Completed Today</span>
              </div>
              <div style={styles.metricItem}>
                <span style={styles.metricVal}>4.9★</span>
                <span style={styles.metricLbl}>Avg Rating</span>
              </div>
              <div style={styles.metricItem}>
                <span style={styles.metricVal}>Active</span>
                <span style={styles.metricLbl}>Work Status</span>
              </div>
            </div>
          </section>

        </div>

        {/* Floating Modal Layer: Customer Profile & Historic Notes */}
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
              <button style={styles.closeModalBtn} onClick={() => setSelectedAppointment(null)}>Return to Dashboard</button>
            </div>
          </div>
        )}

        {/* Floating Intelligent AI Utility Panel */}
        <div style={styles.aiWidget}>
          <button style={styles.aiToggleBtn} onClick={() => setIsAiOpen(!isAiOpen)}>🤖 Ask Copilot</button>
          {isAiOpen && (
            <div style={styles.aiBox}>
              <div style={styles.aiHeader}>Malvin Workspace AI</div>
              {aiResponse && <p style={styles.aiReply}>{aiResponse}</p>}
              <form onSubmit={handleAiQuerySubmit} style={styles.aiForm}>
                <input 
                  type="text" 
                  value={aiQuery}
                  onChange={(e) => setAiQuery(e.target.value)}
                  placeholder="e.g., Who is my next customer?" 
                  style={styles.aiInput}
                  required
                />
                <button type="submit" style={styles.aiSubmit}>Ask</button>
              </form>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

// --- Specialized High-Fidelity Glassmorphic Structural Rules ---
const styles: { [key: string]: React.CSSProperties } = {
  dashboardContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #020617 0%, #0f172a 100%)',
    padding: '12px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    boxSizing: 'border-box',
  },
  glassView: {
    display: 'flex',
    flexDirection: 'column',
    width: '100%',
    maxWidth: '480px',
    height: '880px',
    maxHeight: '94vh',
    background: 'rgba(255, 255, 255, 0.04)',
    backdropFilter: 'blur(30px)',
    WebkitBackdropFilter: 'blur(30px)',
    borderRadius: '32px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.4)',
    overflow: 'hidden',
    position: 'relative',
  },
  welcomeHeader: {
    padding: '24px 20px 16px 20px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greetingText: {
    margin: 0,
    fontSize: '24px',
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: '-0.5px',
  },
  dateLabel: {
    margin: '4px 0 0 0',
    fontSize: '13px',
    color: '#94a3b8',
  },
  onlineBadge: {
    fontSize: '11px',
    fontWeight: '600',
    color: '#34d399',
    background: 'rgba(52, 211, 153, 0.1)',
    padding: '4px 10px',
    borderRadius: '20px',
  },
  scrollContainer: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  alertBanner: {
    background: 'rgba(255, 255, 255, 0.05)',
    borderLeft: '4px solid',
    borderRadius: '12px',
    padding: '12px',
  },
  alertTag: {
    fontSize: '10px',
    fontWeight: '800',
    color: '#cbd5e1',
    letterSpacing: '0.5px',
  },
  alertBody: {
    margin: '4px 0 0 0',
    fontSize: '13px',
    color: '#f1f5f9',
    lineHeight: '1.4',
  },
  msgCard: {
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: '16px',
    padding: '12px 14px',
    cursor: 'pointer',
  },
  msgHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: '#94a3b8',
    marginBottom: '6px',
  },
  msgTitle: {
    fontWeight: '600',
  },
  msgAction: {
    color: '#cbd5e1',
  },
  msgSnippet: {
    margin: 0,
    fontSize: '13px',
    color: '#f8fafc',
  },
  gridSection: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px',
  },
  quickButton: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '14px',
    padding: '14px',
    color: '#ffffff',
    fontSize: '13px',
    fontWeight: '500',
    textAlign: 'left',
    cursor: 'pointer',
    transition: 'background 0.2s',
  },
  blockSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  sectionHeading: {
    margin: '0 0 4px 0',
    fontSize: '16px',
    fontWeight: '600',
    color: '#f8fafc',
  },
  emptyPrompt: {
    margin: 0,
    fontSize: '13px',
    color: '#64748b',
    fontStyle: 'italic',
  },
  appointmentCard: {
    background: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '16px',
    padding: '14px',
    cursor: 'pointer',
  },
  apptHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clientName: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: '15px',
  },
  apptTime: {
    color: '#cbd5e1',
    fontSize: '12px',
  },
  serviceTagsRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    margin: '8px 0',
  },
  serviceTag: {
    fontSize: '11px',
    background: 'rgba(255, 255, 255, 0.12)',
    padding: '3px 8px',
    borderRadius: '8px',
    color: '#e2e8f0',
  },
  statusIndicatorLine: {
    fontSize: '12px',
    color: '#94a3b8',
    marginBottom: '10px',
  },
  apptActionsGrid: {
    display: 'flex',
    gap: '8px',
  },
  apptBtn: {
    flex: 1,
    border: 'none',
    borderRadius: '10px',
    padding: '8px 0',
    fontSize: '12px',
    fontWeight: '600',
    color: '#fff',
    cursor: 'pointer',
  },
  taskCard: {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '14px',
    padding: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priorityIndicator: {
    fontSize: '9px',
    fontWeight: '700',
    color: '#fff',
    padding: '2px 6px',
    borderRadius: '6px',
    textTransform: 'uppercase',
  },
  taskTitle: {
    margin: '6px 0 2px 0',
    fontSize: '14px',
    fontWeight: '500',
    color: '#fff',
  },
  taskDue: {
    fontSize: '11px',
    color: '#94a3b8',
  },
  taskCompleteBtn: {
    background: 'rgba(255,255,255,0.15)',
    border: 'none',
    borderRadius: '8px',
    padding: '6px 12px',
    color: '#fff',
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  metricsContainer: {
    display: 'flex',
    gap: '10px',
  },
  metricItem: {
    flex: 1,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '12px',
    padding: '12px',
    textAlign: 'center',
  },
  metricVal: {
    display: 'block',
    fontSize: '18px',
    fontWeight: '700',
    color: '#fff',
  },
  metricLbl: {
    fontSize: '11px',
    color: '#64748b',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    zIndex: 100,
  },
  modalContent: {
    background: '#0f172a',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '24px',
    padding: '20px',
    width: '100%',
    maxWidth: '360px',
  },
  modalHeading: {
    margin: 0,
    fontSize: '16px',
    color: '#94a3b8',
  },
  modalSubheading: {
    margin: '4px 0 16px 0',
    fontSize: '20px',
    fontWeight: '700',
    color: '#fff',
  },
  notesSection: {
    background: 'rgba(255,255,255,0.05)',
    padding: '12px',
    borderRadius: '12px',
    marginBottom: '16px',
  },
  notesTitle: {
    margin: '0 0 8px 0',
    fontSize: '13px',
    color: '#cbd5e1',
  },
  notesList: {
    margin: 0,
    paddingLeft: '16px',
    color: '#94a3b8',
    fontSize: '12px',
    lineHeight: '1.6',
  },
  closeModalBtn: {
    width: '100%',
    background: '#fff',
    color: '#000',
    border: 'none',
    padding: '12px 0',
    borderRadius: '12px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  aiWidget: {
    position: 'absolute',
    bottom: '20px',
    right: '20px',
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  aiToggleBtn: {
    background: '#ffffff',
    color: '#0f172a',
    border: 'none',
    borderRadius: '30px',
    padding: '10px 18px',
    fontWeight: '600',
    fontSize: '13px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
    cursor: 'pointer',
  },
  aiBox: {
    marginTop: '10px',
    width: '280px',
    background: 'rgba(15, 23, 42, 0.95)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '16px',
    padding: '12px',
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
  },
  aiHeader: {
    fontSize: '12px',
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: '8px',
  },
  aiReply: {
    margin: '0 0 10px 0',
    fontSize: '12px',
    color: '#f1f5f9',
    background: 'rgba(255,255,255,0.08)',
    padding: '8px',
    borderRadius: '8px',
    lineHeight: '1.4',
  },
  aiForm: {
    display: 'flex',
    gap: '6px',
  },
  aiInput: {
    flex: 1,
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '8px',
    padding: '6px 10px',
    color: '#fff',
    fontSize: '12px',
    outline: 'none',
  },
  aiSubmit: {
    background: 'rgba(255,255,255,0.2)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '0 10px',
    fontSize: '12px',
    cursor: 'pointer',
  }
};