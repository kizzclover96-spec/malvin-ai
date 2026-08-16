import React, { useState, useEffect, useRef } from 'react';
import { signOut } from 'firebase/auth';
import { clearPushToken } from '../../services/pushNotifications';
import { 
  Box, PlusCircle, ShoppingCart, Trash2, Edit3, 
  Copy, Search, ArrowUpDown, Layers, CheckSquare, 
  Square, Download, Upload, Camera, X, RefreshCw, 
  Save, History, Wifi, WifiOff, AlertCircle, QrCode, 
  Printer, Check, Package
} from 'lucide-react';

// Import your Firebase configuration setup
import { firestore as db } from '../../firebase'; 
import { auth } from "../../firebase";  // Adjust this path to match your project setup
import { 
  collection, doc, setDoc, addDoc, getDocs, 
  deleteDoc, updateDoc, query, orderBy, onSnapshot 
} from 'firebase/firestore';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================
interface ProductHistoryEvent {
  id: string;
  timestamp: string;
  eventType: 'Created' | 'Edited' | 'Restocked' | 'Sold' | 'Archived';
  user: string;
  oldValue: string;
  newValue: string;
}

interface Product {
  id: string;
  productName: string;
  sku: string;
  barcode: string;
  category: string;
  brand: string;
  description: string;
  supplier: string;
  purchasePrice: number;
  sellingPrice: number;
  tax: number;
  quantity: number;
  minimumStock: number;
  warehouse: string;
  shelfLocation: string;
  status: 'Active' | 'Archived' | 'Low Stock' | 'Out of Stock';
  notes: string;
  history: ProductHistoryEvent[];
}

export const SystemInventory: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [userId, setUserId] = useState<string | null>(null);
  
  // UI Panels
  const [activePanel, setActivePanel] = useState<'inventory' | 'add' | 'sell'>('inventory');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [viewingHistory, setViewingHistory] = useState<Product | null>(null);
  
  // Camera State
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerTargetMode, setScannerTargetMode] = useState<'lookup' | 'autofill' | 'sell'>('lookup');
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streamActive, setStreamActive] = useState(false);

  // Search & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState<keyof Product>('productName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Sale & Restock fields
  const [checkoutQty, setCheckoutQty] = useState(1);
  const [checkoutDiscount, setCheckoutDiscount] = useState(0);
  const [checkoutTax, setCheckoutTax] = useState(15);
  const [paymentMethod, setPaymentMethod] = useState('Card');
  const [restockQty, setRestockQty] = useState(1);

  // Form Fields
  const [formProduct, setFormProduct] = useState<Partial<Product>>({
    productName: '', barcode: '', category: '', brand: '', description: '', 
    supplier: '', purchasePrice: 0, sellingPrice: 0, tax: 15, quantity: 0, 
    minimumStock: 5, warehouse: '', shelfLocation: '', notes: ''
  });

    const handleLogout = async () => {
        if (confirm("Are you sure you want to sign out?")) {
            try {
            // Must run before signOut() — see App.jsx's onAuthStateChanged
            // comment for why this fails every time if called after.
            if (auth.currentUser?.uid) await clearPushToken(auth.currentUser.uid);
            await signOut(auth);
            alert("You have signed out successfully.");
            } catch (err) {
            console.error("Error signing out: ", err);
            }
        }
    };
  // ============================================================================
  // DATABASE SYNC & AUTHENTICATION
  // ============================================================================
  useEffect(() => {
    // Listen for connection changes
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Get current authenticated user
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
        setProducts([]);
      }
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubscribeAuth();
    };
  }, []);

  // Listen to Firestore updates in real-time when userId changes
  useEffect(() => {
    if (!userId) return;

    const productsCollectionRef = collection(db, 'users', userId, 'products');
    const q = query(productsCollectionRef, orderBy('productName', 'asc'));

    const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
      const items: Product[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Product);
      });
      setProducts(items);
    });

    return () => unsubscribeSnapshot();
  }, [userId]);

  const createHistoryEvent = (type: ProductHistoryEvent['eventType'], oldVal: string, newVal: string): ProductHistoryEvent => {
    return {
      id: `HIST-${Math.floor(100000 + Math.random() * 900000)}`,
      timestamp: new Date().toISOString(),
      eventType: type,
      user: auth.currentUser?.email || "Unknown User",
      oldValue: oldVal,
      newValue: newVal
    };
  };

  // ============================================================================
  // HARDWARE SCANNER UTILITIES
  // ============================================================================
  useEffect(() => {
    if (scannerOpen) {
      navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setStreamActive(true);
          }
        })
        .catch((err) => console.error("Camera could not open: ", err));
    }
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
      setStreamActive(false);
    };
  }, [scannerOpen]);

  const handleBarcodeScan = (scannedCode: string) => {
    setScannerOpen(false);
    const matched = products.find(p => p.barcode === scannedCode || p.id === scannedCode || p.sku === scannedCode);
    
    if (scannerTargetMode === 'lookup') {
      if (matched) setSelectedProduct(matched);
      else alert("Product not found in system.");
    } else if (scannerTargetMode === 'autofill') {
      if (matched) {
        setFormProduct({ ...matched });
        setIsEditMode(true);
        setActivePanel('add');
      } else {
        setFormProduct({ productName: "Scanned Item", barcode: scannedCode, quantity: 1, purchasePrice: 0, sellingPrice: 0 });
        setIsEditMode(false);
        setActivePanel('add');
      }
    } else if (scannerTargetMode === 'sell') {
      if (matched) {
        setSelectedProduct(matched);
        setActivePanel('sell');
      } else {
        alert("Product not found. Cannot proceed with checkout.");
      }
    }
  };

  // ============================================================================
  // FIRESTORE WRITE ACTIONS
  // ============================================================================
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return alert("Please log in first.");
    
    const calculatedStatus = (formProduct.quantity || 0) <= 0 ? 'Out of Stock' : (formProduct.quantity || 0) <= (formProduct.minimumStock || 5) ? 'Low Stock' : 'Active';

    try {
      if (isEditMode && formProduct.id) {
        // Edit Existing Item
        const docRef = doc(db, 'users', userId, 'products', formProduct.id);
        const originalProduct = products.find(p => p.id === formProduct.id);
        const newHistory = createHistoryEvent('Edited', `Qty: ${originalProduct?.quantity}`, `Qty: ${formProduct.quantity}`);
        
        await updateDoc(docRef, {
          ...formProduct,
          status: calculatedStatus,
          history: [newHistory, ...(originalProduct?.history || [])]
        });
      } else {
        // Add Brand New Item
        const newId = `PROD-${Math.floor(1000 + Math.random() * 9000)}`;
        const generatedSku = `SKU-${formProduct.category?.toUpperCase().slice(0,3) || 'GEN'}-${Math.floor(100 + Math.random() * 899)}`;
        const docRef = doc(db, 'users', userId, 'products', newId);
        const startHistory = createHistoryEvent('Created', 'None', 'Product introduced to inventory');

        const newProductData = {
          ...formProduct,
          id: newId,
          sku: generatedSku,
          status: calculatedStatus,
          history: [startHistory]
        };
        await setDoc(docRef, newProductData);
      }

      setActivePanel('inventory');
      setFormProduct({});
      setSelectedProduct(null);
    } catch (err) {
      console.error("Error saving to database: ", err);
    }
  };

  const handleDuplicate = async (product: Product) => {
    if (!userId) return;
    const dupId = `PROD-${Math.floor(1000 + Math.random() * 9000)}`;
    const docRef = doc(db, 'users', userId, 'products', dupId);
    const startHistory = createHistoryEvent('Created', product.id, 'Duplicated record copy');

    await setDoc(docRef, {
      ...product,
      id: dupId,
      productName: `${product.productName} (Copy)`,
      history: [startHistory]
    });
  };

  const handleArchive = async (product: Product) => {
    if (!userId) return;
    const docRef = doc(db, 'users', userId, 'products', product.id);
    const log = createHistoryEvent('Archived', product.status, 'Archived');
    await updateDoc(docRef, { status: 'Archived', history: [log, ...product.history] });
    setSelectedProduct(null);
  };

  const handleDelete = async (id: string) => {
    if (!userId) return;
    if (confirm("Are you sure you want to delete this product? This action cannot be reversed.")) {
      await deleteDoc(doc(db, 'users', userId, 'products', id));
      setSelectedProduct(null);
    }
  };

  // ============================================================================
  // SALES AND INBOUND FLOWS
  // ============================================================================
  const handleProcessSale = async () => {
    if (!selectedProduct || !userId) return;
    if (selectedProduct.quantity < checkoutQty) return alert("Error: Not enough physical stock available.");

    try {
      const remainingQty = selectedProduct.quantity - checkoutQty;
      const nextStatus = remainingQty <= 0 ? 'Out of Stock' : remainingQty <= selectedProduct.minimumStock ? 'Low Stock' : 'Active';
      const saleLog = createHistoryEvent('Sold', `Units: ${selectedProduct.quantity}`, `Units: ${remainingQty} via Checkout`);

      // 1. Update Inventory Level
      const productDocRef = doc(db, 'users', userId, 'products', selectedProduct.id);
      await updateDoc(productDocRef, {
        quantity: remainingQty,
        status: nextStatus,
        history: [saleLog, ...selectedProduct.history]
      });

      // 2. Add Transaction Log to separate sales subcollection
      const salesCollectionRef = collection(db, 'users', userId, 'sales');
      await addDoc(salesCollectionRef, {
        productId: selectedProduct.id,
        productName: selectedProduct.productName,
        quantitySold: checkoutQty,
        totalAmount: calculatedTotal,
        paymentMethod: paymentMethod,
        timestamp: new Date().toISOString()
      });

      alert("Sale finished successfully.");
      setActivePanel('inventory');
      setSelectedProduct(null);
    } catch (err) {
      console.error("Sale processing failed: ", err);
    }
  };

  const handleRestock = async () => {
    if (!selectedProduct || !userId) return;
    const finalQty = selectedProduct.quantity + restockQty;
    const nextStatus = finalQty <= selectedProduct.minimumStock ? 'Low Stock' : 'Active';
    const restockLog = createHistoryEvent('Restocked', `Units: ${selectedProduct.quantity}`, `Units: ${finalQty}`);

    const docRef = doc(db, 'users', userId, 'products', selectedProduct.id);
    await updateDoc(docRef, {
      quantity: finalQty,
      status: nextStatus,
      history: [restockLog, ...selectedProduct.history]
    });

    alert("Stock added successfully.");
    setRestockQty(1);
  };

  // ============================================================================
  // CLIENT CONDITIONAL SORT FILTERS
  // ============================================================================
  const filteredAndSortedProducts = products
    .filter(p => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = p.productName.toLowerCase().includes(query) || p.id.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query) || p.barcode.includes(query);
      const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
      const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      let fieldA = a[sortBy];
      let fieldB = b[sortBy];
      if (typeof fieldA === 'string') fieldA = (fieldA as string).toLowerCase();
      if (typeof fieldB === 'string') fieldB = (fieldB as string).toLowerCase();
      if (fieldA < fieldB) return sortDirection === 'asc' ? -1 : 1;
      if (fieldA > fieldB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  const toggleSort = (field: keyof Product) => {
    if (sortBy === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDirection('asc');
    }
  };

  const calculatedSubtotal = selectedProduct ? selectedProduct.sellingPrice * checkoutQty : 0;
  const calculatedDiscountAmount = (calculatedSubtotal * checkoutDiscount) / 100;
  const calculatedTaxAmount = ((calculatedSubtotal - calculatedDiscountAmount) * checkoutTax) / 100;
  const calculatedTotal = calculatedSubtotal - calculatedDiscountAmount + calculatedTaxAmount;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-gray-100 font-sans p-4 md:p-8">
      
      {/* HEADER COMPONENT */}
      <div className="mb-6 flex flex-wrap gap-4 items-center justify-between bg-[#111] border border-white/5 rounded-2xl p-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center font-bold text-lg">M</div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-tight text-white leading-none">Malvin Inventory</h1>
            <p className="text-[10px] text-gray-500 font-bold tracking-wider mt-0.5">DASHBOARD WORKSPACE</p>
          </div>
        </div>

        <div className="flex items-center space-x-4 text-xs">
          <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-full border ${isOnline ? 'bg-emerald-950/30 border-emerald-500/20 text-emerald-400' : 'bg-amber-950/30 border-amber-500/20 text-amber-400'}`}>
            {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
            <span className="font-semibold">{isOnline ? 'Online Grid Connected' : 'Offline Mode Active'}</span>
          </div>
            {userId && (
                <div className="flex items-center space-x-3 border-l border-white/10 pl-4">
                    <div className="text-right hidden sm:block">
                        <p className="text-gray-400 font-medium">My Account</p>
                        <p className="text-[10px] text-gray-600 font-mono">ID: {userId.slice(0, 6)}...</p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="px-3 py-1.5 bg-red-950/40 hover:bg-red-900 border border-red-500/30 text-red-400 hover:text-white transition-all text-[11px] font-bold rounded-xl"
                    >
                        Sign Out
                    </button>
                </div>
            )}
          <div className="text-right hidden sm:block">
            <p className="text-gray-400 font-medium">User Storage Node</p>
            <p className="text-[10px] text-gray-600 font-mono">{userId ? `UID: ${userId.slice(0, 8)}...` : 'Not Signed In'}</p>
          </div>
        </div>
      </div>

      {/* ACTION TABS */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-white/5 pb-4">
        <button 
          onClick={() => { setActivePanel('inventory'); setSelectedProduct(null); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${activePanel === 'inventory' ? 'bg-red-600 text-white' : 'bg-[#141414] text-gray-400 hover:bg-white/5'}`}
        >
          <Box size={14} /> <span>All Products ({products.length})</span>
        </button>
        <button 
          onClick={() => { setIsEditMode(false); setFormProduct({}); setActivePanel('add'); }}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center space-x-2 ${activePanel === 'add' && !isEditMode ? 'bg-red-600 text-white' : 'bg-[#141414] text-gray-400 hover:bg-white/5'}`}
        >
          <PlusCircle size={14} /> <span>Add Product</span>
        </button>
        <button 
          onClick={() => { setScannerTargetMode('sell'); setScannerOpen(true); }}
          className="px-4 py-2 rounded-xl bg-neutral-900 border border-white/5 text-gray-300 text-xs font-bold flex items-center space-x-2"
        >
          <ShoppingCart size={14} /> <span>Sell Item</span>
        </button>
        <button 
          onClick={() => { setScannerTargetMode('lookup'); setScannerOpen(true); }}
          className="px-4 py-2 bg-neutral-900 border border-white/5 text-red-500 text-xs font-bold ml-auto flex items-center space-x-2 rounded-xl"
        >
          <Camera size={14} /> <span>Open Scanner Camera</span>
        </button>
      </div>

      {/* DASHBOARD LAYOUT GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* MAIN PANEL CONTEXT */}
        <div className="xl:col-span-2 space-y-6">
          
          {activePanel === 'inventory' && (
            <div className="bg-[#111] border border-white/5 rounded-2xl overflow-hidden shadow-xl">
              
              {/* FILTERS */}
              <div className="p-4 border-b border-white/5 bg-[#141414] flex flex-wrap gap-3 items-center justify-between">
                <div className="relative flex-1 min-w-[240px]">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input 
                    type="text" 
                    placeholder="Search by ID, name, SKU or barcode..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-black border border-white/5 rounded-xl text-xs font-medium text-white focus:outline-none focus:border-red-600"
                  />
                </div>
                
                <div className="flex gap-2">
                  <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="bg-black border border-white/5 rounded-xl px-3 py-2 text-xs text-gray-400">
                    <option value="All">All Categories</option>
                    <option value="Electronics">Electronics</option>
                  </select>

                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-black border border-white/5 rounded-xl px-3 py-2 text-xs text-gray-400">
                    <option value="All">All Status Options</option>
                    <option value="Active">Active</option>
                    <option value="Low Stock">Low Stock</option>
                    <option value="Out of Stock">Out of Stock</option>
                    <option value="Archived">Archived</option>
                  </select>
                </div>
              </div>

              {/* TABLE LIST */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/5 bg-[#131313] text-[10px] uppercase tracking-wider text-gray-500 font-extrabold">
                      <th className="p-4 w-10">Select</th>
                      <th className="p-4 cursor-pointer" onClick={() => toggleSort('productName')}>Product Name</th>
                      <th className="p-4 cursor-pointer" onClick={() => toggleSort('sku')}>SKU</th>
                      <th className="p-4 cursor-pointer" onClick={() => toggleSort('category')}>Category</th>
                      <th className="p-4 cursor-pointer text-right" onClick={() => toggleSort('quantity')}>Stock Qty</th>
                      <th className="p-4 cursor-pointer text-right" onClick={() => toggleSort('sellingPrice')}>Selling Price</th>
                      <th className="p-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-xs">
                    {filteredAndSortedProducts.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-12 text-center text-gray-600 font-medium">No inventory products found matching those choices.</td>
                      </tr>
                    ) : (
                      filteredAndSortedProducts.map(product => (
                        <tr 
                          key={product.id}
                          onClick={() => setSelectedProduct(product)}
                          className={`hover:bg-white/[0.02] cursor-pointer transition-colors ${selectedProduct?.id === product.id ? 'bg-red-600/5 border-l-2 border-l-red-600' : ''}`}
                        >
                          <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                            <input 
                              type="checkbox" 
                              checked={selectedProductIds.includes(product.id)} 
                              onChange={() => {
                                setSelectedProductIds(prev => prev.includes(product.id) ? prev.filter(i => i !== product.id) : [...prev, product.id])
                              }}
                            />
                          </td>
                          <td className="p-4 font-bold text-white">
                            <div>{product.productName}</div>
                            <div className="text-[10px] text-gray-500 font-mono mt-0.5">{product.id}</div>
                          </td>
                          <td className="p-4 font-mono text-gray-400">{product.sku}</td>
                          <td className="p-4 text-gray-400">{product.category}</td>
                          <td className={`p-4 text-right font-bold ${product.quantity <= product.minimumStock ? 'text-amber-400' : 'text-gray-200'}`}>
                            {product.quantity} <span className="text-[10px] text-gray-600 font-normal">units</span>
                          </td>
                          <td className="p-4 text-right font-mono font-bold text-emerald-400">${product.sellingPrice.toFixed(2)}</td>
                          <td className="p-4 text-center">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              product.status === 'Active' ? 'bg-emerald-950/60 text-emerald-400' :
                              product.status === 'Low Stock' ? 'bg-amber-950/60 text-amber-400' :
                              product.status === 'Archived' ? 'bg-neutral-800 text-neutral-400' : 'bg-red-950/60 text-red-400'
                            }`}>
                              {product.status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ADD PRODUCT FORM */}
          {activePanel === 'add' && (
            <div className="bg-[#111] border border-white/5 rounded-2xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-lg font-black tracking-tight text-white">{isEditMode ? 'Edit Product Fields' : 'Add New Product Record'}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Fill out your item details. Sku numbers and internal ID numbers create automatically.</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => { setScannerTargetMode('autofill'); setScannerOpen(true); }}
                  className="px-3 py-1.5 bg-neutral-900 border border-white/5 rounded-xl text-xs font-bold text-gray-300 flex items-center space-x-1.5"
                >
                  <Camera size={12} /> <span>Scan Autofill Barcode</span>
                </button>
              </div>

              <form onSubmit={handleSaveProduct} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase font-bold text-gray-500">Product Name *</label>
                    <input required type="text" value={formProduct.productName || ''} onChange={e => setFormProduct(p => ({...p, productName: e.target.value}))} className="w-full bg-black border border-white/5 rounded-xl px-3 py-2 text-xs text-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase font-bold text-gray-500">Barcode Value</label>
                    <input type="text" value={formProduct.barcode || ''} onChange={e => setFormProduct(p => ({...p, barcode: e.target.value}))} className="w-full bg-black border border-white/5 rounded-xl px-3 py-2 text-xs text-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase font-bold text-gray-500">Category Selection</label>
                    <input type="text" value={formProduct.category || ''} onChange={e => setFormProduct(p => ({...p, category: e.target.value}))} placeholder="e.g. Electronics, Clothes" className="w-full bg-black border border-white/5 rounded-xl px-3 py-2 text-xs text-white" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase font-bold text-gray-500">Brand Name</label>
                    <input type="text" value={formProduct.brand || ''} onChange={e => setFormProduct(p => ({...p, brand: e.target.value}))} className="w-full bg-black border border-white/5 rounded-xl px-3 py-2 text-xs text-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase font-bold text-gray-500">Supplier Name</label>
                    <input type="text" value={formProduct.supplier || ''} onChange={e => setFormProduct(p => ({...p, supplier: e.target.value}))} className="w-full bg-black border border-white/5 rounded-xl px-3 py-2 text-xs text-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase font-bold text-gray-500">Warehouse Location</label>
                    <input type="text" value={formProduct.warehouse || ''} onChange={e => setFormProduct(p => ({...p, warehouse: e.target.value}))} className="w-full bg-black border border-white/5 rounded-xl px-3 py-2 text-xs text-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase font-bold text-gray-500">Shelf Coordinates</label>
                    <input type="text" value={formProduct.shelfLocation || ''} onChange={e => setFormProduct(p => ({...p, shelfLocation: e.target.value}))} className="w-full bg-black border border-white/5 rounded-xl px-3 py-2 text-xs text-white" />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase font-bold text-gray-500">Purchase Price ($)</label>
                    <input type="number" step="0.01" value={formProduct.purchasePrice || 0} onChange={e => setFormProduct(p => ({...p, purchasePrice: parseFloat(e.target.value) || 0}))} className="w-full bg-black border border-white/5 rounded-xl px-3 py-2 text-xs text-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase font-bold text-gray-500">Selling Price ($)</label>
                    <input type="number" step="0.01" value={formProduct.sellingPrice || 0} onChange={e => setFormProduct(p => ({...p, sellingPrice: parseFloat(e.target.value) || 0}))} className="w-full bg-black border border-white/5 rounded-xl px-3 py-2 text-xs text-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase font-bold text-gray-500">Tax Percent (%)</label>
                    <input type="number" value={formProduct.tax || 0} onChange={e => setFormProduct(p => ({...p, tax: parseInt(e.target.value) || 0}))} className="w-full bg-black border border-white/5 rounded-xl px-3 py-2 text-xs text-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase font-bold text-gray-500">Initial Total Stock Qty</label>
                    <input disabled={isEditMode} type="number" value={formProduct.quantity || 0} onChange={e => setFormProduct(p => ({...p, quantity: parseInt(e.target.value) || 0}))} className="w-full bg-black border border-white/5 rounded-xl px-3 py-2 text-xs text-white disabled:opacity-40" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase font-bold text-gray-500">Low Stock Alert Level</label>
                    <input type="number" value={formProduct.minimumStock || 5} onChange={e => setFormProduct(p => ({...p, minimumStock: parseInt(e.target.value) || 5}))} className="w-full bg-black border border-white/5 rounded-xl px-3 py-2 text-xs text-white" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] uppercase font-bold text-gray-500">Product Notes</label>
                    <input type="text" value={formProduct.notes || ''} onChange={e => setFormProduct(p => ({...p, notes: e.target.value}))} className="w-full bg-black border border-white/5 rounded-xl px-3 py-2 text-xs text-white" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] uppercase font-bold text-gray-500">Item Description</label>
                  <textarea rows={2} value={formProduct.description || ''} onChange={e => setFormProduct(p => ({...p, description: e.target.value}))} className="w-full bg-black border border-white/5 rounded-xl px-3 py-2 text-xs text-white resize-none" />
                </div>

                <div className="flex justify-end space-x-2 pt-4 border-t border-white/5">
                  <button type="button" onClick={() => { setActivePanel('inventory'); setFormProduct({}); }} className="px-4 py-2 bg-neutral-900 rounded-xl text-xs font-bold text-gray-400">Cancel</button>
                  <button type="submit" className="px-5 py-2 bg-red-600 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5">
                    <Save size={14} /> <span>Save Product Details</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* SELL PRODUCT TRANSACTION CHECKOUT */}
          {activePanel === 'sell' && selectedProduct && (
            <div className="bg-[#111] border border-white/5 rounded-2xl p-6 shadow-xl">
              <h3 className="text-lg font-black tracking-tight text-white mb-6 flex items-center space-x-2">
                <ShoppingCart className="text-red-500" size={18} /> <span>New Item Sale Checkout</span>
              </h3>

              <div className="bg-black/50 border border-white/5 rounded-xl p-4 flex gap-4 items-center mb-6">
                <div className="p-3 bg-neutral-900 text-gray-400 rounded-xl"><Package size={24} /></div>
                <div>
                  <h4 className="text-sm font-bold text-white">{selectedProduct.productName}</h4>
                  <p className="text-xs text-gray-500 font-mono mt-0.5">SKU: {selectedProduct.sku} • Stock Available: {selectedProduct.quantity} units</p>
                </div>
                <div className="ml-auto font-mono text-xl font-black text-emerald-400">${selectedProduct.sellingPrice.toFixed(2)}</div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="space-y-1">
                  <label className="text-[11px] uppercase font-bold text-gray-500">Checkout Quantity</label>
                  <input type="number" min="1" max={selectedProduct.quantity} value={checkoutQty} onChange={e => setCheckoutQty(Math.max(1, parseInt(e.target.value) || 1))} className="w-full bg-black border border-white/5 rounded-xl px-3 py-2 text-xs font-bold text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] uppercase font-bold text-gray-500">Discount Percentage (%)</label>
                  <input type="number" min="0" max="100" value={checkoutDiscount} onChange={e => setCheckoutDiscount(Math.max(0, parseInt(e.target.value) || 0))} className="w-full bg-black border border-white/5 rounded-xl px-3 py-2 text-xs font-bold text-white" />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] uppercase font-bold text-gray-500">Payment Type</label>
                  <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full bg-black border border-white/5 rounded-xl px-3 py-2 text-xs font-bold text-white">
                    <option value="Card">Credit / Debit Card</option>
                    <option value="Cash">Cash Handed</option>
                    <option value="Invoice">Send Later Invoice</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-white/5 pt-4 space-y-2 font-mono text-xs">
                <div className="flex justify-between text-gray-500"><span>Subtotal Amount</span><span>${calculatedSubtotal.toFixed(2)}</span></div>
                <div className="flex justify-between text-red-400"><span>Subtracted Discount Savings</span><span>-${calculatedDiscountAmount.toFixed(2)}</span></div>
                <div className="flex justify-between text-gray-500"><span>Estimated Tax ({checkoutTax}%)</span><span>+${calculatedTaxAmount.toFixed(2)}</span></div>
                <div className="flex justify-between text-base font-bold text-white border-t border-white/5 pt-2"><span>Total Checkout Due</span><span className="text-emerald-400">${calculatedTotal.toFixed(2)}</span></div>
              </div>

              <div className="flex justify-end space-x-2 pt-6 mt-6 border-t border-white/5">
                <button type="button" onClick={() => { setActivePanel('inventory'); setSelectedProduct(null); }} className="px-4 py-2 bg-neutral-900 text-gray-400 rounded-xl text-xs font-bold">Cancel</button>
                <button type="button" onClick={handleProcessSale} className="px-5 py-2 bg-emerald-500 text-black rounded-xl text-xs font-black flex items-center space-x-1.5">
                  <Check size={14} /> <span>Complete Sale Order</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT INSIGHT PANEL INSPECTOR */}
        <div className="space-y-6">
          <div className="bg-[#111] border border-white/5 rounded-2xl p-5 shadow-xl">
            <h3 className="text-xs uppercase tracking-widest font-black text-gray-500 mb-4 border-b border-white/5 pb-2">Selected Product Details</h3>
            
            {selectedProduct ? (
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between items-start">
                    <h4 className="text-base font-black tracking-tight text-white">{selectedProduct.productName}</h4>
                    <span className="text-[10px] font-mono bg-neutral-900 border border-white/5 px-2 py-0.5 rounded text-gray-400">{selectedProduct.id}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5 leading-relaxed bg-black/30 border border-white/5 rounded-xl p-3">{selectedProduct.description || 'No detailed descriptive lines saved.'}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs bg-black/40 p-3 rounded-xl border border-white/5">
                  <div><span className="text-[10px] uppercase font-bold text-gray-500 block">SKU Code</span><span className="font-mono text-gray-300 font-bold">{selectedProduct.sku}</span></div>
                  <div><span className="text-[10px] uppercase font-bold text-gray-500 block">Barcode String</span><span className="font-mono text-gray-300 font-bold">{selectedProduct.barcode || 'None'}</span></div>
                  <div><span className="text-[10px] uppercase font-bold text-gray-500 block">Warehouse Room</span><span className="text-gray-300 font-semibold">{selectedProduct.warehouse || 'Unassigned'}</span></div>
                  <div><span className="text-[10px] uppercase font-bold text-gray-500 block">Shelf Slot</span><span className="text-gray-300 font-semibold">{selectedProduct.shelfLocation || 'Unassigned'}</span></div>
                  <div><span className="text-[10px] uppercase font-bold text-gray-500 block">Supplier Cost</span><span className="font-mono text-gray-300 font-bold">${selectedProduct.purchasePrice.toFixed(2)}</span></div>
                  <div><span className="text-[10px] uppercase font-bold text-gray-500 block">Store Price</span><span className="font-mono text-emerald-400 font-bold">${selectedProduct.sellingPrice.toFixed(2)}</span></div>
                </div>

                {/* QR LABEL ACTION */}
                <div className="border border-white/5 rounded-xl p-4 bg-black/40 flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-1 text-red-500">
                      <QrCode size={14} />
                      <span className="text-xs font-bold uppercase tracking-wide">Product QR Code Tag</span>
                    </div>
                    <p className="text-[10px] text-gray-500">Scannable reference code.</p>
                    <div className="pt-2">
                      <button onClick={() => alert("Sending print signal to label equipment...")} className="px-2 py-1 bg-neutral-900 border border-white/5 text-[10px] font-bold text-gray-300 rounded flex items-center space-x-1">
                        <Printer size={10} /> <span>Print Barcode Label</span>
                      </button>
                    </div>
                  </div>
                  <div className="w-16 h-16 bg-white rounded-lg p-1.5 flex items-center justify-center">
                    <QrCode size={56} className="text-black" strokeWidth={2.5} />
                  </div>
                </div>

                {/* RESTOCK FIELD */}
                <div className="bg-neutral-900/40 border border-white/5 rounded-xl p-4 space-y-3">
                  <div className="flex items-center space-x-1 text-amber-500 font-bold text-xs uppercase tracking-wide">
                    <RefreshCw size={12} />
                    <span>Quick Inventory Restock Order</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" min="1" value={restockQty} onChange={e => setRestockQty(Math.max(1, parseInt(e.target.value) || 1))} className="bg-black border border-white/5 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none" placeholder="Qty" />
                    <button onClick={handleRestock} className="bg-amber-500 text-black font-black text-xs rounded-lg py-1.5">Receive Qty</button>
                  </div>
                </div>

                {/* UTILITY ACTION MANAGEMENT GRID */}
                <div className="grid grid-cols-2 gap-2 pt-4 border-t border-white/5">
                  <button onClick={() => { setCheckoutQty(1); setActivePanel('sell'); }} className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 font-bold rounded-xl text-xs flex items-center justify-center space-x-1">
                    <ShoppingCart size={12} /> <span>Open Cashier Sale</span>
                  </button>
                  <button onClick={() => { setFormProduct({...selectedProduct}); setIsEditMode(true); setActivePanel('add'); }} className="p-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 font-bold rounded-xl text-xs flex items-center justify-center space-x-1 session">
                    <Edit3 size={12} /> <span>Modify Parameters</span>
                  </button>
                  <button onClick={() => handleDuplicate(selectedProduct)} className="p-2 bg-neutral-900 text-gray-300 font-bold rounded-xl text-xs flex items-center justify-center space-x-1">
                    <Copy size={12} /> <span>Duplicate Item</span>
                  </button>
                  <button onClick={() => handleArchive(selectedProduct)} className="p-2 bg-neutral-900 text-amber-500 font-bold rounded-xl text-xs flex items-center justify-center space-x-1">
                    <Box size={12} /> <span>Archive Item</span>
                  </button>
                  <button onClick={() => setViewingHistory(selectedProduct)} className="col-span-2 p-2 bg-neutral-900 text-purple-400 font-bold rounded-xl text-xs flex items-center justify-center space-x-1">
                    <History size={12} /> <span>Show Item Action Audit Log</span>
                  </button>
                  <button onClick={() => handleDelete(selectedProduct.id)} className="col-span-2 p-2 bg-red-950/30 border border-red-500/20 text-red-400 font-bold rounded-xl text-xs flex items-center justify-center space-x-1">
                    <Trash2 size={12} /> <span>Delete Completely From Database</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-gray-600 text-xs font-semibold flex flex-col items-center justify-center space-y-2">
                <AlertCircle size={20} className="text-neutral-700" />
                <span>Choose a row item above to view parameters in the sidebar inspector.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* HISTORY TIMELINE SHEET MODAL */}
      {viewingHistory && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-white/10 w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-[#151515]">
              <div className="flex items-center space-x-2 text-purple-400">
                <History size={16} />
                <h3 className="text-sm font-black tracking-tight text-white">History Timeline Log ({viewingHistory.productName})</h3>
              </div>
              <button onClick={() => setViewingHistory(null)} className="p-1.5 bg-white/5 rounded-lg text-gray-400 hover:text-white">
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto space-y-4 bg-black/30">
              {viewingHistory.history?.map((event) => (
                <div key={event.id} className="relative pl-6 border-l border-white/5 last:border-0 pb-2">
                  <div className="absolute left-[-4px] top-1 w-2 h-2 rounded-full bg-red-500" />
                  <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-gray-500">
                    <span className="font-bold text-gray-400 bg-white/5 px-2 py-0.5 rounded">{event.eventType}</span>
                    <span>{new Date(event.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 font-mono mt-1">
                    Done by user: <span className="text-gray-200">{event.user}</span>
                  </div>
                  <div className="mt-1 font-mono text-[11px] grid grid-cols-1 md:grid-cols-2 gap-1 text-gray-400">
                    <div>Previous State: <span className="text-red-400">{event.oldValue}</span></div>
                    <div>Updated State: <span className="text-emerald-400">{event.newValue}</span></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* HARDWARE CAMERA TERMINAL MODAL */}
      {scannerOpen && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
          <div className="bg-[#111] border border-white/10 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-white/5 flex justify-between items-center bg-[#151515]">
              <div className="flex items-center space-x-2">
                <Camera size={16} className="text-red-500 animate-pulse" />
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Live Barcode Camera Lens</h3>
              </div>
              <button onClick={() => setScannerOpen(false)} className="p-1.5 bg-white/5 rounded-lg text-gray-400 hover:text-white">
                <X size={16} />
              </button>
            </div>

            <div className="relative aspect-video bg-black flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover opacity-80" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-64 h-32 border-2 border-dashed border-red-500 rounded-xl relative">
                  <div className="absolute inset-x-0 top-1/2 h-0.5 bg-red-500 animate-bounce" />
                </div>
              </div>
              {!streamActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#0A0A0A]">
                  <RefreshCw size={24} className="text-neutral-700 animate-spin" />
                </div>
              )}
            </div>

            <div className="p-4 bg-[#141414] border-t border-white/5 space-y-3">
              <div className="text-[11px] font-mono text-gray-500 text-center uppercase tracking-wider">Test Manual Barcode Inputs</div>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => handleBarcodeScan('4006381333931')} className="p-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-mono text-[10px] font-bold rounded-xl border border-white/5">
                  Scan Registered Test Barcode
                </button>
                <button onClick={() => handleBarcodeScan(`MOCK-${Math.floor(1000 + Math.random() * 9000)}`)} className="p-2.5 bg-neutral-900 hover:bg-neutral-800 text-red-400 font-mono text-[10px] font-bold rounded-xl border border-white/5">
                  Scan Fake Unknown Barcode
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};