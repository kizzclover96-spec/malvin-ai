import React, { useState, useEffect, useRef } from 'react';
import { firestore as db } from '../firebase'; 
import { auth } from "../firebase";  
import { 
  collection, 
  doc, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  addDoc, 
  setDoc, 
  deleteDoc,
  serverTimestamp,
  getDoc,
  updateDoc,
  where
} from 'firebase/firestore';

type UserRole = 'Manager' | 'Worker' | 'Receptionist';

interface Member {
  uid: string;
  email: string;
  role: UserRole;
  status: 'pending' | 'active';
  workerUid?: string | null;
  joinedAt?: any;
  isOnline?: boolean;
}

interface Message {
  id: string;
  senderUid: string;
  senderName: string;
  senderEmail?: string; // Included senderEmail inside the Interface
  text: string;
  createdAt: any;
  replyToText?: string;
  isRead?: boolean;
}

interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: 'Low' | 'Medium' | 'High';
  assignedTo: string;
  status: 'Pending' | 'Completed';
  progress?: string;
}

interface Alert {
  id: string;
  content: string;
  isPinned?: boolean;
  createdAt: any;
}

interface TeamHubProps {
  managerUid: string;
}

export const TeamHub: React.FC<TeamHubProps> = ({ managerUid }) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'tasks' | 'alerts' | 'team'>('chat');
  const [userRole, setUserRole] = useState<UserRole>('Manager');
  const [members, setMembers] = useState<Member[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  
  // Interface Component State Managers
  const [inputText, setInputText] = useState('');
  const [replyTarget, setReplyTarget] = useState<Message | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Administrative Input Forms State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('Worker');
  const [taskTitle, setTaskTitle] = useState('');
  const [taskDesc, setTaskDesc] = useState('');
  const [taskDue, setTaskDue] = useState('');
  const [taskPriority, setTaskPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [taskAssignee, setTaskAssignee] = useState('');
  const [alertText, setAlertText] = useState('');
  const [alertPinned, setAlertPinned] = useState(false);

  const threadEndRef = useRef<HTMLDivElement>(null);
  const currentUserId = auth.currentUser?.uid;
  const shortUid = currentUserId ? `${currentUserId.substring(0, 5)}...` : '-----';
  const isManager = userRole === 'Manager';

  // --- Real-time Firestore Stream Subscriptions ---
  useEffect(() => {
    if (!managerUid || !currentUserId) return;

    // Sub 1: Message Thread Channel
    const msgQuery = query(collection(db, 'managerMembers', managerUid, 'messages'), orderBy('createdAt', 'asc'), limit(120));
    const unsubMsgs = onSnapshot(msgQuery, (snapshot) => {
      const list: Message[] = [];
      snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as Message));
      setMessages(list);
      setTimeout(() => threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    });

    // Sub 2: Dynamic Management Workspace Roster
    const unsubMembers = onSnapshot(
        collection(db, "managerMembers", managerUid, "members"),
        (snapshot) => {
            const list: Member[] = [];
            snapshot.forEach((d) => {
              list.push({
                  ...(d.data() as Member),
                  uid: d.id,
              });
            });
            setMembers(list);

            if (managerUid === currentUserId) {
              setUserRole("Manager");
              return;
            }

            const me = list.find(
              m => m.workerUid === currentUserId || m.uid === currentUserId
            );

            if (me) {
              setUserRole(me.role);
            } else {
              setUserRole("Worker");
            }
        }
    );

    // Sub 3: Tasks Tracking Index
    const unsubTasks = onSnapshot(collection(db, 'managerMembers', managerUid, 'tasks'), (snapshot) => {
      const list: Task[] = [];
      snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as Task));
      setTasks(list);
    });

    // Sub 4: Announcements Notices Stream
    const unsubAlerts = onSnapshot(
        query(collection(db, 'managerMembers', managerUid, 'announcements'), orderBy('createdAt', 'desc')), 
        (snapshot) => {
            const list: Alert[] = [];
            snapshot.forEach((d) => list.push({ id: d.id, ...d.data() } as Alert));
            setAlerts(list);
        }
    );

    return () => {
      unsubMsgs();
      unsubMembers();
      unsubTasks();
      unsubAlerts();
    };
  }, [managerUid, currentUserId]);

  // --- Native Text Mentions Engine Parse Layer ---
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const textVal = e.target.value;
    setInputText(textVal);

    const matchToken = textVal.match(/@(\S*)$/);
    if (matchToken) {
      setShowMentions(true);
      setMentionFilter(matchToken[1].toLowerCase());
    } else {
      setShowMentions(false);
    }
  };

  const applyMentionSelection = (email: string) => {
    const index = inputText.lastIndexOf('@');
    const rootText = inputText.substring(0, index);
    setInputText(`${rootText}@${email} `);
    setShowMentions(false);
  };

  // --- Real-time Transaction Handlers ---
  const executeSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !currentUserId || !managerUid) return;

    const messagePayload: any = {
      senderUid: currentUserId,
      senderName: auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'User',
      senderEmail: auth.currentUser?.email || '', // Storing sender's email securely in DB payload
      text: inputText,
      createdAt: serverTimestamp(),
      isRead: false
    };

    if (replyTarget) {
      messagePayload.replyToText = replyTarget.text;
      setReplyTarget(null);
    }

    try {
      await addDoc(collection(db, 'managerMembers', managerUid, 'messages'), messagePayload);
      setInputText('');
    } catch (error) {
      console.error("Failed to transmit message payload:", error);
    }
  };

  const executeDeleteMessage = async (msgId: string) => {
    await deleteDoc(doc(db, 'managerMembers', managerUid, 'messages', msgId));
  };

  const executeCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || !isManager) return;

    await addDoc(collection(db, 'managerMembers', managerUid, 'tasks'), {
      title: taskTitle,
      description: taskDesc,
      dueDate: taskDue,
      priority: taskPriority,
      assignedTo: taskAssignee,
      status: 'Pending',
      progress: ''
    });

    setTaskTitle('');
    setTaskDesc('');
    setTaskDue('');
  };

  const toggleTaskStatus = async (taskId: string, status: 'Pending' | 'Completed') => {
    try {
        const taskDocRef = doc(db, 'managerMembers', managerUid, 'tasks', taskId);
        await updateDoc(taskDocRef, {
          status: status === 'Pending' ? 'Completed' : 'Pending'
        });
    } catch (error) {
        console.error("Task update failed:", error);
    }
  };

  const executePostAlert = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!alertText.trim() || !isManager || !managerUid) return;

      try {
          await addDoc(collection(db, 'managerMembers', managerUid, 'announcements'), {
            content: alertText,
            isPinned: alertPinned,
            createdAt: serverTimestamp()
          });

          setAlertText('');
          setAlertPinned(false);
      } catch (error) {
          console.error("Failed to post alert:", error);
      }
  };

  const executeSaveMemberInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !isManager || !currentUserId || !managerUid) return;

    const cleanEmail = inviteEmail.toLowerCase();
    
    try {
      const managerDocRef = doc(db, 'managerMembers', managerUid, 'members', currentUserId);
      await setDoc(managerDocRef, {
        uid: currentUserId,
        email: auth.currentUser?.email || 'manager@test.com',
        role: 'Manager',
        status: 'active',
        joinedAt: serverTimestamp()
      });

      const newMemberId = "mem_" + Math.random().toString(36).substring(2, 11); 
      await setDoc(doc(db, 'managerMembers', managerUid, 'members', newMemberId), {
        uid: "", 
        email: cleanEmail,
        role: inviteRole,
        status: 'pending',
        workerUid: null,
        joinedAt: serverTimestamp()
      });

      setInviteEmail('');
      setIsInviteModalOpen(false);
    } catch (error) {
      console.error("Failed to save member invitation node:", error);
    }
  };

  return (
    <div style={styles.nativeFrame}>
      <header style={styles.chatHeader}>
        <div>
          <h1 style={styles.headerTitle}>Team Hub</h1>
          <p style={styles.headerUidLabel}>uid: {shortUid} ({userRole})</p>
        </div>
        <button style={styles.headerActionBtn}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="1"></circle>
            <circle cx="12" cy="5" r="1"></circle>
            <circle cx="12" cy="19" r="1"></circle>
          </svg>
        </button>
      </header>

      <main style={styles.viewportArea}>
        {activeTab === 'chat' && (
          <div style={styles.chatContainer}>
            <div style={styles.threadScroll}>
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  style={{
                    ...styles.messageRow,
                    justifyContent: msg.senderUid === currentUserId ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div style={{ maxWidth: '85%' }}>
                    {msg.senderUid !== currentUserId && (
                      <span style={styles.senderSubtext}>
                        {msg.senderName} {msg.senderEmail ? `(${msg.senderEmail})` : ''}
                      </span>
                    )}
                    {msg.replyToText && (
                      <div style={styles.replyBubbleContext}>
                        <p style={styles.replyContextBody}>{msg.replyToText}</p>
                      </div>
                    )}
                    <div 
                      style={{
                        ...styles.chatBubble,
                        backgroundColor: msg.senderUid === currentUserId ? '#0066FF' : '#F2F2F7',
                        color: msg.senderUid === currentUserId ? '#FFFFFF' : '#000000',
                        borderRadius: msg.senderUid === currentUserId ? '18px 18px 4px 18px' : '18px 18px 18px 4px'
                      }}
                    >
                      <p style={styles.bubbleMessageText}>{msg.text}</p>
                      <div style={styles.bubbleActionLinks}>
                        <button style={{...styles.inlineLink, color: msg.senderUid === currentUserId ? 'rgba(255,255,255,0.7)' : '#8E8E93'}} onClick={() => setReplyTarget(msg)}>Reply</button>
                        {msg.senderUid === currentUserId && (
                          <button style={{...styles.inlineLink, color: msg.senderUid === currentUserId ? 'rgba(255,255,255,0.7)' : '#8E8E93'}} onClick={() => executeDeleteMessage(msg.id)}>Delete</button>
                        )}
                        <span style={{...styles.msgTimeLabel, color: msg.senderUid === currentUserId ? 'rgba(255,255,255,0.6)' : '#AEAEB2'}}>
                          {msg.isRead ? 'Read' : 'Delivered'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={threadEndRef} />
            </div>

            <form onSubmit={executeSendMessage} style={styles.inputTrayForm}>
              {replyTarget && (
                <div style={styles.replyTargetContextLine}>
                  <span style={styles.replyTargetContextText}>Replying to thread reference...</span>
                  <button type="button" onClick={() => setReplyTarget(null)} style={styles.abortReplyBtn}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                  </button>
                </div>
              )}

              {showMentions && (
                <div style={styles.mentionsPopupContainer}>
                  {members.filter(m => m.email.toLowerCase().includes(mentionFilter)).map(m => (
                    <div key={m.uid} style={styles.mentionRowItem} onClick={() => applyMentionSelection(m.email)}>
                      {m.email}
                    </div>
                  ))}
                </div>
              )}

              <div style={styles.inputFieldStructuralRow}>
                <button type="button" style={styles.inputActionButton}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#8E8E93" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                </button>
                <input
                  type="text"
                  placeholder={managerUid ? "Send message..." : "Loading session workspace..."}
                  value={inputText}
                  onChange={handleTextChange}
                  disabled={!managerUid}
                  style={styles.cleanNativeInput}
                />
                <button type="submit" style={styles.inputActionButton}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#0066FF" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div style={styles.tabContentFrame}>
            {isManager && (
              <form onSubmit={executeCreateTask} style={styles.managementControlCard}>
                <input type="text" placeholder="Task Assignment Title" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} style={styles.nativeField} required />
                <textarea placeholder="Task Description Details" value={taskDesc} onChange={e => setTaskDesc(e.target.value)} style={{...styles.nativeField, height: '54px', resize: 'none'}} />
                <div style={styles.nativeFieldDoubleRow}>
                  <input type="date" value={taskDue} onChange={e => setTaskDue(e.target.value)} style={styles.nativeField} />
                  <select value={taskPriority} onChange={e => setTaskPriority(e.target.value as any)} style={styles.nativeField}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                <select value={taskAssignee} onChange={e => setTaskAssignee(e.target.value)} style={styles.nativeField} required>
                  <option value="">Select Assignee...</option>
                  {members.map(m => <option key={m.uid} value={m.uid}>{m.email}</option>)}
                </select>
                <button type="submit" style={styles.primeActionSubmitBtn}>Delegate Task</button>
              </form>
            )}

            <div style={styles.tabPanelScrollable}>
              {tasks.map(task => (
                <div key={task.id} style={styles.itemContainerRow}>
                  <div style={{ opacity: task.status === 'Completed' ? 0.4 : 1 }}>
                    <div style={styles.taskTitleLayoutRow}>
                      <span style={{...styles.priorityIndicatorDot, backgroundColor: task.priority === 'High' ? '#FF3B30' : '#FF9500'}} />
                      <strong style={styles.cardHeaderBoldTitle}>{task.title}</strong>
                    </div>
                    <p style={styles.cardBodyDescriptionText}>{task.description}</p>
                    <span style={styles.cardSubTextTimestamp}>Due: {task.dueDate}</span>
                  </div>
                  <button 
                    onClick={() => toggleTaskStatus(task.id, task.status)}
                    style={{...styles.cardActionToggleButton, backgroundColor: task.status === 'Completed' ? '#34C759' : '#0066FF'}}
                  >
                    {task.status === 'Completed' ? 'Done' : 'Pending'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div style={styles.tabContentFrame}>
            {isManager && (
              <form onSubmit={executePostAlert} style={styles.managementControlCard}>
                <input type="text" placeholder="Publish updates to workspace..." value={alertText} onChange={e => setAlertText(e.target.value)} style={styles.nativeField} required />
                <label style={styles.checkboxWrapperLabel}>
                  <input type="checkbox" checked={alertPinned} onChange={e => setAlertPinned(e.target.checked)} />
                  Pin Notice
                </label>
                <button type="submit" style={styles.primeActionSubmitBtn}>Publish Alert</button>
              </form>
            )}

            <div style={styles.tabPanelScrollable}>
              {alerts.map(alert => (
                <div key={alert.id} style={{
                  ...styles.alertBroadcastCard,
                  borderLeft: alert.isPinned ? '3px solid #FF3B30' : '3px solid #0066FF'
                }}>
                  <p style={styles.alertBroadcastBodyText}>{alert.content}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div style={styles.tabContentFrame}>
            <div style={styles.rosterActionRowLayout}>
              <h3 style={styles.rosterSectionTitle}>Active Workspace Staff</h3>
              {isManager && (
                <button onClick={() => setIsInviteModalOpen(true)} style={styles.addMemberTriggerBtn}>Add Member</button>
              )}
            </div>

            <div style={styles.tabPanelScrollable}>
              {members.map(member => (
                <div key={member.uid} style={styles.memberCardLayoutRow}>
                  <div>
                    <p style={styles.memberCardEmailTitle}>{member.email}</p>
                    <span style={styles.memberCardMetaSubtext}>Role: {member.role} | Status: {member.status}</span>
                  </div>
                  <div style={styles.statusBlockInline}>
                    <span style={{...styles.statusStatusDotIndicator, backgroundColor: member.isOnline ? '#34C759' : '#AEAEB2'}} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {isInviteModalOpen && (
        <div style={styles.modalBackdropMask}>
          <div style={styles.modalContentWrapper}>
            <div style={styles.modalHeaderRow}>
              <h3 style={styles.modalTitleText}>Add Member</h3>
              <button onClick={() => setIsInviteModalOpen(false)} style={styles.closeTriggerBtn}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>
            <form onSubmit={executeSaveMemberInvitation} style={styles.modalFormBody}>
              <input 
                type="email" 
                placeholder="Enter staff email address" 
                value={inviteEmail} 
                onChange={e => setInviteEmail(e.target.value)} 
                style={styles.nativeField} 
                required 
              />
              <select 
                value={inviteRole} 
                onChange={e => setInviteRole(e.target.value as UserRole)} 
                style={styles.nativeField}
              >
                <option value="Manager">Manager</option>
                <option value="Worker">Worker</option>
                <option value="Receptionist">Receptionist</option>
              </select>
              <button type="submit" style={styles.primeActionSubmitBtn}>Save Member</button>
            </form>
          </div>
        </div>
      )}

      <nav style={styles.glassNavigationPillContainer}>
        <button onClick={() => setActiveTab('chat')} style={styles.navActionButtonItem}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={activeTab === 'chat' ? '#0066FF' : '#8E8E93'} strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          {activeTab === 'chat' && <span style={styles.activePillIndicatorDot} />}
        </button>
        <button onClick={() => setActiveTab('tasks')} style={styles.navActionButtonItem}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={activeTab === 'tasks' ? '#0066FF' : '#8E8E93'} strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          {activeTab === 'tasks' && <span style={styles.activePillIndicatorDot} />}
        </button>
        <button onClick={() => setActiveTab('alerts')} style={styles.navActionButtonItem}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={activeTab === 'alerts' ? '#0066FF' : '#8E8E93'} strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          {activeTab === 'alerts' && <span style={styles.activePillIndicatorDot} />}
        </button>
        <button onClick={() => setActiveTab('team')} style={styles.navActionButtonItem}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={activeTab === 'team' ? '#0066FF' : '#8E8E93'} strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          {activeTab === 'team' && <span style={styles.activePillIndicatorDot} />}
        </button>
      </nav>
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  // Expanded width configuration added here
  nativeFrame: { display: 'flex', flexDirection: 'column', height: '100vh', width: '100%', maxWidth: '600px', margin: '0 auto', borderLeft: '1px solid #F2F2F7', borderRight: '1px solid #F2F2F7', backgroundColor: '#FFFFFF', color: '#000000', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', overflow: 'hidden' },
  chatHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid #F2F2F7', backgroundColor: '#FFFFFF' },
  headerTitle: { fontSize: '18px', fontWeight: '700', letterSpacing: '-0.4px', margin: 0 },
  headerUidLabel: { fontSize: '11px', color: '#8E8E93', margin: '2px 0 0 0' },
  headerActionBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px' },
  viewportArea: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' },
  chatContainer: { display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' },
  threadScroll: { flex: 1, overflowY: 'auto', padding: '16px 16px 12px 16px', display: 'flex', flexDirection: 'column', gap: '12px' },
  messageRow: { display: 'flex', width: '100%' },
  senderSubtext: { fontSize: '11px', fontWeight: '600', color: '#8E8E93', marginBottom: '2px', display: 'block', paddingLeft: '4px' },
  replyBubbleContext: { backgroundColor: '#E5E5EA', padding: '6px 10px', borderRadius: '8px', marginBottom: '-6px', borderLeft: '2px solid #0066FF', opacity: 0.8 },
  replyContextBody: { margin: 0, fontSize: '12px', color: '#000000', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  chatBubble: { padding: '10px 14px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' },
  bubbleMessageText: { margin: 0, fontSize: '14px', lineHeight: '1.4', wordBreak: 'break-word' },
  bubbleActionLinks: { display: 'flex', gap: '8px', marginTop: '4px', justifyContent: 'flex-end', alignItems: 'center' },
  inlineLink: { background: 'none', border: 'none', fontSize: '10px', cursor: 'pointer', padding: 0 },
  msgTimeLabel: { fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.3px' },
  inputTrayForm: { borderTop: '1px solid #F2F2F7', padding: '12px 16px 80px 16px', backgroundColor: '#FFFFFF', position: 'relative', zIndex: 5 },
  replyTargetContextLine: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F2F2F7', padding: '6px 12px', borderRadius: '8px', marginBottom: '8px' },
  replyTargetContextText: { fontSize: '12px', color: '#8E8E93' },
  abortReplyBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '2px' },
  mentionsPopupContainer: { position: 'absolute', bottom: '100%', left: '16px', right: '16px', backgroundColor: '#FFFFFF', border: '1px solid #E5E5EA', borderRadius: '12px', boxShadow: '0 -4px 16px rgba(0,0,0,0.08)', maxHeight: '140px', overflowY: 'auto', zIndex: 10 },
  mentionRowItem: { padding: '10px 14px', borderBottom: '1px solid #F2F2F7', cursor: 'pointer', fontSize: '13px', color: '#000000' },
  inputFieldStructuralRow: { display: 'flex', alignItems: 'center', gap: '10px' },
  inputActionButton: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  cleanNativeInput: { flex: 1, backgroundColor: '#F2F2F7', border: 'none', borderRadius: '20px', padding: '10px 16px', fontSize: '14px', outline: 'none', color: '#000000' },
  tabContentFrame: { display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#FFFFFF', padding: '16px 16px 80px 16px' },
  managementControlCard: { display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#F2F2F7', padding: '12px', borderRadius: '12px', marginBottom: '14px' },
  nativeField: { width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #E5E5EA', backgroundColor: '#FFFFFF', fontSize: '13px', boxSizing: 'border-box', outline: 'none', color: '#000000' },
  nativeFieldDoubleRow: { display: 'flex', gap: '8px' },
  primeActionSubmitBtn: { backgroundColor: '#0066FF', color: '#FFFFFF', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: '600', fontSize: '13px', cursor: 'pointer' },
  checkboxWrapperLabel: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#3A3A3C', cursor: 'pointer' },
  tabPanelScrollable: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' },
  itemContainerRow: { backgroundColor: '#FFFFFF', border: '1px solid #F2F2F7', borderRadius: '12px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' },
  taskTitleLayoutRow: { display: 'flex', alignItems: 'center', gap: '6px' },
  priorityIndicatorDot: { width: '6px', height: '6px', borderRadius: '50%' },
  cardHeaderBoldTitle: { fontSize: '14px', color: '#000000' },
  cardBodyDescriptionText: { margin: '4px 0', fontSize: '12px', color: '#3A3A3C', lineHeight: '1.4' },
  cardSubTextTimestamp: { fontSize: '11px', color: '#8E8E93' },
  cardActionToggleButton: { border: 'none', color: '#FFFFFF', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: '600', cursor: 'pointer' },
  alertBroadcastCard: { padding: '12px', backgroundColor: '#F2F2F7', borderRadius: '0 8px 8px 0' },
  alertBroadcastBodyText: { margin: 0, fontSize: '13px', color: '#000000', lineHeight: '1.4' },
  rosterActionRowLayout: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' },
  rosterSectionTitle: { fontSize: '15px', fontWeight: '700', color: '#000000', margin: 0 },
  addMemberTriggerBtn: { backgroundColor: '#FFFFFF', border: '1px solid #0066FF', color: '#0066FF', padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', cursor: 'pointer' },
  memberCardLayoutRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 4px', borderBottom: '1px solid #F2F2F7' },
  memberCardEmailTitle: { margin: 0, fontSize: '14px', fontWeight: '500', color: '#000000' },
  memberCardMetaSubtext: { fontSize: '11px', color: '#8E8E93', marginTop: '2px', display: 'block' },
  statusBlockInline: { display: 'flex', alignItems: 'center' },
  statusStatusDotIndicator: { width: '8px', height: '8px', borderRadius: '50%' },
  modalBackdropMask: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' },
  modalContentWrapper: { backgroundColor: '#FFFFFF', borderRadius: '16px', width: '100%', maxWidth: '340px', padding: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' },
  modalHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F2F2F7', paddingBottom: '8px' },
  modalTitleText: { margin: 0, fontSize: '16px', fontWeight: '600' },
  closeTriggerBtn: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px' },
  modalFormBody: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' },
  glassNavigationPillContainer: { position: 'fixed', bottom: '16px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '24px', backgroundColor: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)', padding: '12px 24px', borderRadius: '30px', boxShadow: '0 8px 32px rgba(0,0,0,0.08)', border: '1px solid rgba(255,255,255,0.4)', zIndex: 999 },
  navActionButtonItem: { background: 'none', border: 'none', cursor: 'pointer', padding: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' },
  activePillIndicatorDot: { position: 'absolute', bottom: '-4px', width: '4px', height: '4px', backgroundColor: '#0066FF', borderRadius: '50%' }
};