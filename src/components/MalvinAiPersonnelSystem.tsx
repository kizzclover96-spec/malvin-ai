import React, { useState, useEffect } from 'react';
import { 
  Shield, Users, User, ArrowLeft, MoreVertical, Plus, Trash2, 
  Search, Download, Eye, FileText, Upload, Calendar, Phone, 
  Mail, Briefcase, IdCard, Lock, ChevronLeft, ChevronRight, 
  Camera, X, Check, AlertCircle, Sparkles, FileCheck, Award
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

// ============================================================================
// EXTERNAL FIREBASE ROUTER IMPORTS
// ============================================================================
import { firestore as db } from '../firebase'; 
import { auth } from "../firebase";  // Adjust this relative directory path to match your project tree
import { 
  collection, onSnapshot, addDoc, deleteDoc, doc, query, orderBy 
} from 'firebase/firestore';

// ============================================================================
// STRUCTURAL INTERFACES & SCHEMAS
// ============================================================================
type UserRole = 'ADMIN' | 'MANAGER' | 'WORKER';

interface PersonaDocument {
  id: string;
  name: string;
  type: 'Contract' | 'Application' | 'Certificate' | 'Other';
  uploadedAt: string;
  fileSize: string;
}

interface Member {
  id: string; // Document ID / Generated Employee ID
  fullName: string;
  contactNumber: string;
  email: string;
  role: string;
  startingDate: string;
  profileImage?: string;
  documents: PersonaDocument[];
}

interface SecureFile {
  id: string;
  employeeId: string;
  employeeName: string;
  fileName: string;
  fileCategory: string;
  uploadedBy: string;
  uploadedAt: string;
  fileSize: string;
}

export const MalvinAiPersonnelSystem: React.FC = () => {
  // Application Global Core State
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>('ADMIN');
  const [members, setMembers] = useState<Member[]>([]);
  const [secureFiles, setSecureFiles] = useState<SecureFile[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Navigation & Sub-views State
  const [currentView, setCurrentView] = useState<'dashboard' | 'secure_files' | 'public_summary'>('dashboard');
  const [scannedSummaryId, setScannedSummaryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Form Modals Toggles
  const [isEditDropdownOpen, setIsEditDropdownOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSecureUploadModalOpen, setIsSecureUploadModalOpen] = useState(false);
  const [isQrScannerModalOpen, setIsQrScannerModalOpen] = useState(false);
  const [scannedCardMember, setScannedCardMember] = useState<Member | null>(null);

  // Form Fields Buffers
  const [newMemberForm, setNewMemberForm] = useState({
    fullName: '', contactNumber: '', email: '', role: '', startingDate: '',
    contractName: '', applicationName: '', certificateName: ''
  });
  const [deleteTargetQuery, setDeleteTargetQuery] = useState('');
  const [deleteSelectedId, setDeleteSelectedId] = useState('');
  const [secureFileForm, setSecureFileForm] = useState({
    employeeId: '', fileName: '', fileCategory: 'Contract'
  });

  // UI Notification Toast Simulation
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // --------------------------------------------------------------------------
  // LIVE FIRESTORE SYNCHRONIZATION
  // --------------------------------------------------------------------------
  useEffect(() => {
    const qMembers = query(collection(db, "members"), orderBy("fullName", "asc"));
    const unsubscribeMembers = onSnapshot(qMembers, (snapshot) => {
      const fetchedMembers: Member[] = [];
      snapshot.forEach((doc) => {
        fetchedMembers.push({ id: doc.id, ...doc.data() } as Member);
      });
      setMembers(fetchedMembers);
      if (fetchedMembers.length > 0 && !selectedMember) {
        setSelectedMember(fetchedMembers[0]);
      }
      setLoading(false);
    });

    const qFiles = query(collection(db, "secureFiles"), orderBy("uploadedAt", "desc"));
    const unsubscribeFiles = onSnapshot(qFiles, (snapshot) => {
      const fetchedFiles: SecureFile[] = [];
      snapshot.forEach((doc) => {
        fetchedFiles.push({ id: doc.id, ...doc.data() } as SecureFile);
      });
      setSecureFiles(fetchedFiles);
    });

    // Check if URL has a query parameter for scanning view
    const urlParams = new URLSearchParams(window.location.search);
    const scanId = urlParams.get('scanId');
    if (scanId) {
      setScannedSummaryId(scanId);
      setCurrentView('public_summary');
    }

    return () => {
      unsubscribeMembers();
      unsubscribeFiles();
    };
  }, []);

  // Enforce Role Permissions constraints onto UI state selection
  useEffect(() => {
    if (currentUserRole === 'WORKER' && members.length > 0) {
      const workerAccount = members.find(m => m.email.includes('kaelen')) || members[0];
      setSelectedMember(workerAccount);
      setCurrentView('dashboard');
    }
  }, [currentUserRole, members]);

  // --------------------------------------------------------------------------
  // GENUINE SCANNABLE TARGET URL & DOWNLOAD MATRIX GENERATOR
  // --------------------------------------------------------------------------
  const getScanningUrl = (memberId: string) => {
    const base = window.location.origin + window.location.pathname + "/verify";
    return `${base}?scanId=${memberId}`;
  };

  const triggerQrDownload = (member: Member) => {
    const svgElement = document.getElementById(`qr-svg-${member.id}`);
    if (!svgElement) return;

    const svgString = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const URL = window.URL || window.webkitURL || window;
    const blobURL = URL.createObjectURL(svgBlob);
    
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 300;
      canvas.height = 300;
      const context = canvas.getContext('2d');
      if (context) {
        context.fillStyle = '#FFFFFF';
        context.fillRect(0, 0, 300, 300);
        context.drawImage(image, 10, 10, 280, 280);
        
        const pngUrl = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `MalvinAI_ID_${member.fullName.replace(/\s+/g, '_')}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        showToast(`Downloaded scannable QR Code for ${member.fullName}`);
      }
    };
    image.src = blobURL;
  };

  // --------------------------------------------------------------------------
  // DATABASE MUTATION PIPELINE HANDLERS
  // --------------------------------------------------------------------------
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberForm.fullName || !newMemberForm.email || !newMemberForm.role) return;

    const preparedDocs: PersonaDocument[] = [];
    const today = new Date().toISOString().split('T')[0];

    if (newMemberForm.contractName) {
      preparedDocs.push({ id: `DOC-${Math.floor(Math.random()*900)}`, name: newMemberForm.contractName, type: 'Contract', uploadedAt: today, fileSize: '1.5 MB' });
    }
    if (newMemberForm.applicationName) {
      preparedDocs.push({ id: `DOC-${Math.floor(Math.random()*900)}`, name: newMemberForm.applicationName, type: 'Application', uploadedAt: today, fileSize: '2.1 MB' });
    }
    if (newMemberForm.certificateName) {
      preparedDocs.push({ id: `DOC-${Math.floor(Math.random()*900)}`, name: newMemberForm.certificateName, type: 'Certificate', uploadedAt: today, fileSize: '950 KB' });
    }

    try {
      await addDoc(collection(db, "members"), {
        fullName: newMemberForm.fullName,
        contactNumber: newMemberForm.contactNumber || "+1 (555) 000-0000",
        email: newMemberForm.email,
        role: newMemberForm.role,
        startingDate: newMemberForm.startingDate || today,
        profileImage: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
        documents: preparedDocs
      });

      setIsAddModalOpen(false);
      setNewMemberForm({ fullName: '', contactNumber: '', email: '', role: '', startingDate: '', contractName: '', applicationName: '', certificateName: '' });
      showToast(`Successfully saved ${newMemberForm.fullName} to Firestore.`);
    } catch (err) {
      alert("Error adding document to Firestore: " + err);
    }
  };

  const handleDeleteMember = async () => {
    if (!deleteSelectedId) return;
    const targetsName = members.find(m => m.id === deleteSelectedId)?.fullName || "Target Member";
    
    if (confirm(`CRITICAL ACTION:\nPurge ${targetsName} from global data indices?`)) {
      try {
        await deleteDoc(doc(db, "members", deleteSelectedId));
        if (selectedMember?.id === deleteSelectedId) {
          setSelectedMember(null);
        }
        setDeleteSelectedId('');
        setIsDeleteModalOpen(false);
        showToast(`Purged remote data logs for ${targetsName}.`);
      } catch (err) {
        alert("Firestore error executing delete: " + err);
      }
    }
  };

  const handleSecureUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!secureFileForm.employeeId || !secureFileForm.fileName) return;

    const matchedEmp = members.find(m => m.id === secureFileForm.employeeId);
    if (!matchedEmp) return;

    try {
      await addDoc(collection(db, "secureFiles"), {
        employeeId: matchedEmp.id,
        employeeName: matchedEmp.fullName,
        fileName: secureFileForm.fileName,
        fileCategory: secureFileForm.fileCategory,
        uploadedBy: `Session Auth (${currentUserRole})`,
        uploadedAt: new Date().toISOString().split('T')[0],
        fileSize: `${(Math.random() * 4 + 0.5).toFixed(1)} MB`
      });

      setIsSecureUploadModalOpen(false);
      setSecureFileForm({ employeeId: '', fileName: '', fileCategory: 'Contract' });
      showToast(`Encrypted documentation cataloged in Firestore secure locker.`);
    } catch (err) {
      alert("Error uploading vault record: " + err);
    }
  };

  const handlePurgeSecureFile = async (id: string) => {
    if (confirm("Confirm permanent deletion of securely cataloged file node?")) {
      try {
        await deleteDoc(doc(db, "secureFiles", id));
        showToast("Vault record node detached successfully.");
      } catch (err) {
        alert("Firestore deletion failed: " + err);
      }
    }
  };

  const simulateHardwareQrScan = (member: Member) => {
    setScannedCardMember(member);
    setIsQrScannerModalOpen(true);
  };

  // Operational filters
  const filteredMembers = members.filter(m => {
    const term = searchQuery.toLowerCase();
    return (
      m.fullName.toLowerCase().includes(term) ||
      m.id.toLowerCase().includes(term) ||
      m.role.toLowerCase().includes(term) ||
      m.email.toLowerCase().includes(term)
    );
  });

  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
  const paginatedMembers = filteredMembers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // --------------------------------------------------------------------------
  // CONDITIONAL LANDING DESIGN FOR SCANNED PROFILE REDIRECTS
  // --------------------------------------------------------------------------
  if (currentView === 'public_summary') {
    const activeScannedPerson = members.find(m => m.id === scannedSummaryId);
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-gray-100 flex flex-col items-center justify-center p-4">
        {activeScannedPerson ? (
          <div className="w-full max-w-md bg-[#111111] border border-blue-500/30 rounded-2xl p-6 shadow-[0_0_50px_rgba(14,165,233,0.15)] backdrop-blur-xl relative overflow-hidden text-center animate-in zoom-in-95 duration-300">
            <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-2 border-blue-500 mb-4">
              <img src={activeScannedPerson.profileImage} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="inline-block px-3 py-0.5 bg-blue-500/10 text-blue-400 text-[10px] font-mono tracking-widest uppercase rounded-full mb-2">Verified Corporate Matrix Profile</div>
            <h2 className="text-xl font-black tracking-tight text-white">{activeScannedPerson.fullName}</h2>
            <p className="text-sm text-red-500 font-bold mb-4">{activeScannedPerson.role}</p>
            
            <div className="bg-black/40 border border-white/5 rounded-xl p-4 text-left space-y-2 text-xs text-gray-300 font-mono">
              <div className="flex justify-between border-b border-white/5 pb-1.5"><span className="text-gray-500">Unique Matrix ID:</span> <span className="text-white font-bold">{activeScannedPerson.id}</span></div>
              <div className="flex justify-between border-b border-white/5 pb-1.5"><span className="text-gray-500">Corporate Email:</span> <span className="text-white">{activeScannedPerson.email}</span></div>
              <div className="flex justify-between border-b border-white/5 pb-1.5"><span className="text-gray-500">Commencement Date:</span> <span className="text-white">{activeScannedPerson.startingDate}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Contact Coordinate:</span> <span className="text-white">{activeScannedPerson.contactNumber}</span></div>
            </div>
            
            <button onClick={() => { window.location.href = window.location.origin + window.location.pathname; }} className="mt-6 w-full py-2.5 bg-neutral-900 border border-white/10 hover:bg-white/5 rounded-xl text-xs font-bold transition-all text-gray-400 hover:text-white">
              Launch Primary Management Gateway
            </button>
          </div>
        ) : (
          <div className="text-center space-y-2 max-w-sm">
            <AlertCircle size={36} className="text-red-500 mx-auto animate-pulse" />
            <h3 className="text-md font-bold">Index Target Missing</h3>
            <p className="text-xs text-gray-500">The scanned personnel identity tag sequence does not correspond to an established document configuration item inside Firestore node clusters.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-gray-100 flex flex-col font-sans antialiased selection:bg-red-600 selection:text-white">
      
      {/* GLOBAL TOAST ALERTS POPUP */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#121212]/90 backdrop-blur-xl border-l-4 border-red-600 px-5 py-4 rounded-xl shadow-2xl flex items-center space-x-3 text-sm">
          <Sparkles size={16} className="text-red-500 animate-pulse" />
          <span className="font-semibold text-gray-200">{toastMessage}</span>
        </div>
      )}

      {/* ADMINISTRATIVE TOP BAR BRANDING */}
      <header className="bg-[#111111] border-b border-white/5 px-4 lg:px-8 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => { setCurrentView('dashboard'); }}
            className="p-2 bg-[#1A1A1A] hover:bg-red-600/10 text-gray-400 hover:text-red-500 border border-white/5 rounded-xl transition-all"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#D60000] flex items-center justify-center text-white font-black">M</div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-wider text-white">MalvinAI</h1>
              <p className="text-[10px] text-gray-400 font-bold font-mono tracking-widest uppercase">Live Firestore System</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex bg-[#161616] border border-white/5 p-1 rounded-xl items-center">
            <span className="text-[10px] uppercase text-gray-500 font-extrabold px-2 tracking-wider flex items-center gap-1">
              <Shield size={10} className="text-red-500" /> Clear:
            </span>
            {(['ADMIN', 'MANAGER', 'WORKER'] as UserRole[]).map((role) => (
              <button
                key={role}
                onClick={() => setCurrentUserRole(role)}
                className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${currentUserRole === role ? 'bg-[#D60000] text-white shadow-sm' : 'text-gray-400 hover:text-white'}`}
              >
                {role}
              </button>
            ))}
          </div>

          {currentUserRole === 'ADMIN' && (
            <button
              onClick={() => setCurrentView(currentView === 'secure_files' ? 'dashboard' : 'secure_files')}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center space-x-2 ${currentView === 'secure_files' ? 'bg-[#D60000] border-transparent text-white' : 'bg-[#161616] border-white/5 text-gray-300 hover:bg-white/5'}`}
            >
              <Lock size={13} />
              <span>Secure Vault</span>
            </button>
          )}

          <div className="relative">
            <button
              onClick={() => {
                if (currentUserRole !== 'ADMIN') return showToast("Access Denied: Admin credentials required.");
                setIsEditDropdownOpen(!isEditDropdownOpen);
              }}
              className="px-4 py-1.5 bg-[#D60000] text-white text-xs font-bold rounded-xl flex items-center space-x-1.5 hover:bg-[#B50000]"
            >
              <span>Edit Records</span>
              <MoreVertical size={13} />
            </button>

            {isEditDropdownOpen && currentUserRole === 'ADMIN' && (
              <div className="absolute right-0 mt-2 w-48 bg-[#121212] border border-white/10 rounded-xl shadow-2xl z-50">
                <button
                  onClick={() => { setIsAddModalOpen(true); setIsEditDropdownOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-xs text-gray-300 hover:bg-white/5 flex items-center space-x-2 font-semibold border-b border-white/5"
                >
                  <Plus size={14} className="text-red-500" />
                  <span>Add Member Node</span>
                </button>
                <button
                  onClick={() => { setIsDeleteModalOpen(true); setIsEditDropdownOpen(false); }}
                  className="w-full text-left px-4 py-2.5 text-xs text-red-400 hover:bg-red-600/10 flex items-center space-x-2 font-semibold"
                >
                  <Trash2 size={14} />
                  <span>Delete Member Node</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center font-mono text-xs text-gray-500">Synchronizing with Firebase Cluster Node Index...</div>
      ) : currentView === 'secure_files' && currentUserRole === 'ADMIN' ? (
        <main className="flex-1 p-4 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          <div className="flex justify-between items-center bg-[#111111] border border-white/5 rounded-2xl p-6 shadow-xl">
            <div>
              <div className="flex items-center space-x-2 text-red-500 mb-1"><Lock size={16} /><h2 className="text-xs uppercase tracking-widest font-black">MalvinAI Vault</h2></div>
              <h3 className="text-xl font-black text-white tracking-tight">Confidential Documents Locker</h3>
            </div>
            <button onClick={() => setIsSecureUploadModalOpen(true)} className="px-4 py-2 bg-neutral-900 border border-white/5 rounded-xl text-xs font-bold flex items-center space-x-2 text-white"><Upload size={14} className="text-red-500" /><span>Upload File Record</span></button>
          </div>

          <div className="bg-[#111111] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#161616] text-[10px] uppercase font-bold text-gray-500 border-b border-white/5 tracking-wider">
                  <th className="p-4">Vault ID</th>
                  <th className="p-4">Employee</th>
                  <th className="p-4">File Name</th>
                  <th className="p-4">Classification</th>
                  <th className="p-4">Stamp</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs text-gray-300">
                {secureFiles.map((file) => (
                  <tr key={file.id}>
                    <td className="p-4 font-mono font-bold text-red-500">{file.id.substring(0,6)}...</td>
                    <td className="p-4"><div>{file.employeeName}</div></td>
                    <td className="p-4 font-mono">{file.fileName}</td>
                    <td className="p-4"><span className="px-2 py-0.5 bg-neutral-900 text-gray-400 border text-[10px] font-bold uppercase rounded-md">{file.fileCategory}</span></td>
                    <td className="p-4 text-[11px] text-gray-400"><div>{file.uploadedAt}</div></td>
                    <td className="p-4 text-right">
                      <button onClick={() => handlePurgeSecureFile(file.id)} className="p-1.5 bg-red-950/40 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-600 hover:text-white transition-all"><Trash2 size={13} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      ) : (
        <main className="flex-1 p-4 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          <div className="relative max-w-2xl mx-auto w-full my-4">
            <div className="absolute inset-y-0 left-4 flex items-center text-gray-500"><Search size={16} /></div>
            <input type="text" placeholder="Search parameters..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="w-full bg-[#111111] border border-white/5 rounded-2xl pl-12 pr-4 py-3.5 text-xs text-white" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
            <div className="xl:col-span-2 space-y-4">
              <div className="bg-[#111111] border border-white/5 rounded-2xl shadow-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#161616] text-[10px] uppercase font-bold text-gray-500 border-b border-white/5 tracking-wider">
                      <th className="p-4">Personnel Identity</th>
                      <th className="p-4">Contact</th>
                      <th className="p-4">Role Title</th>
                      <th className="p-4 text-center">Interactive ID Tag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs">
                    {paginatedMembers.map((member) => (
                      <tr key={member.id} onClick={() => setSelectedMember(member)} className={`cursor-pointer transition-all ${selectedMember?.id === member.id ? 'bg-red-600/[0.03]' : ''}`}>
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <img src={member.profileImage} alt="" className="w-8 h-8 rounded-lg object-cover" />
                            <div><div className="font-bold text-white">{member.fullName}</div><div className="text-[10px] text-gray-500 font-mono">{member.email}</div></div>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-[11px] text-gray-400">{member.contactNumber}</td>
                        <td className="p-4 font-bold text-gray-300">{member.role}</td>
                        <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center space-x-3">
                            <button onClick={() => simulateHardwareQrScan(member)} className="p-1 bg-neutral-900 border border-white/5 rounded-md text-gray-400 hover:text-red-500"><Eye size={12} /></button>
                            <button onClick={() => triggerQrDownload(member)} className="p-1 bg-neutral-900 border border-white/5 rounded-md text-gray-400 hover:text-emerald-400"><Download size={12} /></button>
                            
                            <div className="hidden">
                              <QRCodeSVG id={`qr-svg-${member.id}`} value={getScanningUrl(member.id)} size={250} level="H" />
                            </div>
                            <QRCodeSVG value={getScanningUrl(member.id)} size={22} level="M" className="bg-white p-0.5 rounded" />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* INSPECTOR PROFILE SIDEBAR */}
            <div className="xl:col-span-1">
              <div className="bg-[#111111] border border-white/5 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
                <h3 className="text-xs uppercase tracking-widest font-black text-gray-500 mb-4 border-b border-white/5 pb-2">Record Inspector</h3>
                {selectedMember ? (
                  <div className="space-y-6">
                    <div className="flex items-center space-x-4">
                      <img src={selectedMember.profileImage} alt="" className="w-14 h-14 rounded-2xl object-cover" />
                      <div>
                        <h4 className="text-base font-black text-white leading-tight">{selectedMember.fullName}</h4>
                        <p className="text-xs text-red-500 font-bold mt-0.5">{selectedMember.role}</p>
                      </div>
                    </div>

                    <div className="space-y-2 text-xs bg-black/40 border border-white/5 p-4 rounded-xl font-mono">
                      <div className="flex justify-between"><span className="text-gray-500">Contact:</span><span className="text-gray-300 font-bold">{selectedMember.contactNumber}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Email:</span><span className="text-gray-300">{selectedMember.email}</span></div>
                    </div>

                    <div className="border border-white/5 p-4 bg-black/30 rounded-xl flex items-center justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-black text-gray-500 block">ID QR Access Badge</span>
                        <p className="text-[9px] text-gray-400 leading-snug">Standard target verification path link.</p>
                      </div>
                      <div className="p-1 bg-white rounded-lg cursor-pointer" onClick={() => triggerQrDownload(selectedMember)}>
                        <QRCodeSVG value={getScanningUrl(selectedMember.id)} size={64} level="M" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="py-16 text-center text-gray-600 text-xs">Select an active row workspace mapping node.</div>
                )}
              </div>
            </div>
          </div>
        </main>
      )}

      {/* FOOTER */}
      <footer className="mt-auto bg-[#0E0E0E] border-t border-white/5 px-4 py-3 text-center text-[10px] font-mono text-gray-600 tracking-widest uppercase">
        MalvinAI Network Platform Platform Engine Core System
      </footer>

      {/* MODALS (ADD MEMBER) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-white/10 w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            <div className="p-4 bg-[#141414] border-b border-white/5 flex justify-between items-center">
              <h3 className="text-sm font-black uppercase text-white tracking-wider">Provision New Personnel Member File</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="p-1 text-gray-400 bg-white/5 rounded-lg"><X size={14} /></button>
            </div>
            <form onSubmit={handleAddMember} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <input required type="text" value={newMemberForm.fullName} onChange={e => setNewMemberForm({...newMemberForm, fullName: e.target.value})} placeholder="Full Legal Name" className="w-full bg-black border border-white/5 rounded-xl px-3 py-2 text-white focus:outline-none" />
                <input required type="text" value={newMemberForm.role} onChange={e => setNewMemberForm({...newMemberForm, role: e.target.value})} placeholder="Role / Title" className="w-full bg-black border border-white/5 rounded-xl px-3 py-2 text-white focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <input required type="email" value={newMemberForm.email} onChange={e => setNewMemberForm({...newMemberForm, email: e.target.value})} placeholder="Digital Mail Coordinate" className="w-full bg-black border border-white/5 rounded-xl px-3 py-2 text-white focus:outline-none" />
                <input type="text" value={newMemberForm.contactNumber} onChange={e => setNewMemberForm({...newMemberForm, contactNumber: e.target.value})} placeholder="Contact Phone" className="w-full bg-black border border-white/5 rounded-xl px-3 py-2 text-white focus:outline-none" />
              </div>
              <button type="submit" className="w-full py-2 bg-[#D60000] text-white font-bold rounded-xl">Commit File Node to Firestore</button>
            </form>
          </div>
        </div>
      )}

      {/* SECURE LOCKER UPLOAD POPUP MODAL */}
      {isSecureUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-white/10 w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-4 bg-[#141414] border-b border-white/5 flex justify-between items-center">
              <h3 className="text-sm font-black uppercase text-white tracking-wider">Catalog Encrypted Vault Record</h3>
              <button onClick={() => setIsSecureUploadModalOpen(false)} className="p-1 text-gray-400 bg-white/5 rounded-lg"><X size={14} /></button>
            </div>
            <form onSubmit={handleSecureUpload} className="p-5 space-y-4 text-xs">
              <select required value={secureFileForm.employeeId} onChange={e => setSecureFileForm({...secureFileForm, employeeId: e.target.value})} className="w-full bg-black border border-white/5 rounded-xl px-3 py-2 text-white focus:outline-none">
                <option value="">-- Choose Target File --</option>
                {members.map(m => <option key={m.id} value={m.id}>{m.fullName}</option>)}
              </select>
              <input required type="text" placeholder="Document File Name" value={secureFileForm.fileName} onChange={e => setSecureFileForm({...secureFileForm, fileName: e.target.value})} className="w-full bg-black border border-white/5 rounded-xl px-3 py-2 text-white focus:outline-none" />
              <button type="submit" className="w-full py-2 bg-[#D60000] text-white font-bold rounded-xl">Lock Vault Asset</button>
            </form>
          </div>
        </div>
      )}

      {/* DETACH DELETE MEMBER MODAL */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-white/10 w-full max-w-md rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-black uppercase text-red-400">Purge Personnel Document Nodes</h3>
            <input type="text" placeholder="Type ID to match..." value={deleteTargetQuery} onChange={(e) => setDeleteTargetQuery(e.target.value)} className="w-full bg-black border border-white/5 rounded-xl px-3 py-2 text-white text-xs" />
            <div className="max-h-32 overflow-y-auto space-y-1">
              {members.filter(m => m.fullName.toLowerCase().includes(deleteTargetQuery.toLowerCase())).map(m => (
                <div key={m.id} onClick={() => setDeleteSelectedId(m.id)} className={`p-2 text-xs cursor-pointer ${deleteSelectedId === m.id ? 'bg-red-600/20' : ''}`}>{m.fullName} ({m.id})</div>
              ))}
            </div>
            <button disabled={!deleteSelectedId} onClick={handleDeleteMember} className="w-full py-2 bg-red-600 text-white text-xs font-bold rounded-xl disabled:opacity-40">Execute Permanent Purge</button>
          </div>
        </div>
      )}

      {/* SCANNED POPUP CARD SIMULATOR MODAL */}
      {isQrScannerModalOpen && scannedCardMember && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-lg flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
          <button onClick={() => { setIsQrScannerModalOpen(false); setScannedCardMember(null); }} className="absolute top-4 right-4 p-2 bg-neutral-900 text-gray-400 rounded-xl border border-white/10"><X size={16} /></button>
          <div className="w-full max-w-xs aspect-[1.586/1] bg-gradient-to-br from-blue-600/20 to-neutral-900 border border-blue-400/30 rounded-2xl p-5 shadow-2xl text-center flex flex-col justify-between">
            <div className="flex items-center space-x-3 text-left">
              <img src={scannedCardMember.profileImage} alt="" className="w-12 h-12 rounded-xl object-cover ring-2 ring-blue-400/30" />
              <div>
                <h4 className="text-sm font-black text-white">{scannedCardMember.fullName}</h4>
                <p className="text-[10px] text-blue-400 font-extrabold uppercase">{scannedCardMember.role}</p>
              </div>
            </div>
            <div className="text-[10px] font-mono text-gray-400 text-left border-t border-blue-400/10 pt-2">
              ID: {scannedCardMember.id}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};