import React, { useState, useEffect } from 'react';
// FIX: Import 'firestore' directly (which you configured as Cloud Firestore) 
import { firestore, storage, auth } from "../../firebase";
import {
  ref,
  onValue
} from "firebase/database";
// FIX: Firestore core functions were completely missing from your imports!
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  onSnapshot, 
  updateDoc, 
  addDoc, 
  deleteDoc, 
  serverTimestamp 
} from "firebase/firestore";
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { onAuthStateChanged, User } from 'firebase/auth';

// --- Types & Interfaces ---
interface Product {
  id?: string;
  imageUrl: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  discount: number;
  available: boolean;
  preparationTime: string;
  category: string;
  ingredients: string[];
  calories: number;
  tags: string[];
  featured: boolean;
}
interface RestaurantCatalogueProps {
  onBack: () => void;
}

// Expanded list of Stripe-supported global and regional currencies
const CURRENCY_OPTIONS = [
  { code: 'USD', label: 'USD ($) - US Dollar' },
  { code: 'EUR', label: 'EUR (€) - Euro' },
  { code: 'GBP', label: 'GBP (£) - British Pound' },
  { code: 'NGN', label: 'NGN (₦) - Nigerian Naira' },
  { code: 'TRY', label: 'TRY (₺) - Turkish Lira' },
  { code: 'GMD', label: 'GMD (D) - Gambian Dalasi' },
  { code: 'CAD', label: 'CAD (C$) - Canadian Dollar' },
  { code: 'AUD', label: 'AUD (A$) - Australian Dollar' },
  { code: 'JPY', label: 'JPY (¥) - Japanese Yen' },
  { code: 'INR', label: 'INR (₹) - Indian Rupee' },
  { code: 'ZAR', label: 'ZAR (R) - South African Rand' },
  { code: 'AED', label: 'AED (د.إ) - UAE Dirham' }
];

export default function RestaurantCatalogue({ onBack }: RestaurantCatalogueProps) {
  const [user, setUser] = useState<User | null>(null);
  const [brandName, setBrandName] = useState<string>('Loading Brand...');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // Global Currency Selector State
  const [globalCurrency, setGlobalCurrency] = useState<string>('USD');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  // Form Field States
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formPrice, setFormPrice] = useState<number>(0);
  const [formCurrency, setFormCurrency] = useState('USD');
  const [formAvailable, setFormAvailable] = useState(true);
  const [formPrepTime, setFormPrepTime] = useState('');
  const [formDiscount, setFormDiscount] = useState<number>(0);
  const [formCategory, setFormCategory] = useState('');
  const [formIngredients, setFormIngredients] = useState('');
  const [formCalories, setFormCalories] = useState<number>(0);
  const [formTags, setFormTags] = useState('');
  const [formFeatured, setFormFeatured] = useState(false);

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Initialize Catalogue Document & Fetch Stream Data
  useEffect(() => {
    if (!user) return;

    // FIX: Swapped "db" to "firestore" to match your Firestore configuration
    const initCatalogue = async () => {
      const catalogueDocRef = doc(firestore, 'Restaurantcatalogue', user.uid);
      const docSnap = await getDoc(catalogueDocRef);
      if (!docSnap.exists()) {
        await setDoc(catalogueDocRef, {
          ownerId: user.uid,
          createdAt: serverTimestamp()
        });
      }
    };
    initCatalogue();

    // Live Stream Profile Brand Name from Firestore
    const profileDocRef = doc(firestore, 'restaurantprofile', user.uid);
    const unsubProfile = onSnapshot(profileDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setBrandName(docSnap.data().brandName || 'Unnamed Brand');
      } else {
        setBrandName('My Premium Restaurant');
      }
    });

    // Live Stream Catalogue Products Subcollection
    const productsSubcolRef = collection(firestore, 'Restaurantcatalogue', user.uid, 'products');
    const unsubProducts = onSnapshot(productsSubcolRef, (snapshot) => {
      const items: Product[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as Product);
      });
      setProducts(items);
      setLoading(false);
    }, (error) => {
      console.error("Error loading products: ", error);
      setLoading(false);
    });

    return () => {
      unsubProfile();
      unsubProducts();
    };
  }, [user]);

  // Back Navigation Handler
  const handleBack = () => {
    window.history.back();
  };

  // Open Modal Helpers
  const handleOpenCreate = () => {
    setEditingProduct(null);
    setImagePreview('');
    setImageFile(null);
    setFormName('');
    setFormDescription('');
    setFormPrice(0);
    // Presets the modal currency selector to match the global layout active choice instantly
    setFormCurrency(globalCurrency);
    setFormAvailable(true);
    setFormPrepTime('');
    setFormDiscount(0);
    setFormCategory('');
    setFormIngredients('');
    setFormCalories(0);
    setFormTags('');
    setFormFeatured(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setImagePreview(product.imageUrl);
    setImageFile(null);
    setFormName(product.name);
    setFormDescription(product.description);
    setFormPrice(product.price);
    // Defaults to the global currency selection if chosen, or falls back to its existing database attribute
    setFormCurrency(globalCurrency || product.currency);
    setFormAvailable(product.available);
    setFormPrepTime(product.preparationTime);
    setFormDiscount(product.discount || 0);
    setFormCategory(product.category || '');
    setFormIngredients(product.ingredients ? product.ingredients.join(', ') : '');
    setFormCalories(product.calories || 0);
    setFormTags(product.tags ? product.tags.join(', ') : '');
    setFormFeatured(product.featured || false);
    setIsModalOpen(true);
  };

  // Image Preview Handler
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  // Save / Update Form Action
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return alert('Please log in first!');
    if (!formName || !formPrepTime || formPrice <= 0) {
      return alert('Please fill in all required fields.');
    }

    try {
      setUploading(true);
      let finalImageUrl = imagePreview;

      // Upload image if a new file was chosen
      if (imageFile) {
        const imgRef = storageRef(storage, `catalogues/${user.uid}/${Date.now()}_${imageFile.name}`);
        const snapshot = await uploadBytes(imgRef, imageFile);
        finalImageUrl = await getDownloadURL(snapshot.ref);
      }

      if (!finalImageUrl) {
        setUploading(false);
        return alert('Please upload or select an image for your product.');
      }

      const productPayload = {
        name: formName,
        description: formDescription,
        price: Number(formPrice),
        currency: formCurrency,
        available: formAvailable,
        preparationTime: formPrepTime,
        discount: Number(formDiscount),
        category: formCategory,
        calories: Number(formCalories),
        featured: formFeatured,
        ingredients: formIngredients.split(',').map((i) => i.trim()).filter((i) => i),
        tags: formTags.split(',').map((t) => t.trim()).filter((t) => t),
        imageUrl: finalImageUrl,
        updatedAt: serverTimestamp(),
      };

      const productsSubcolRef = collection(firestore, 'Restaurantcatalogue', user.uid, 'products');

      if (editingProduct && editingProduct.id) {
        const productDocRef = doc(firestore, 'Restaurantcatalogue', user.uid, 'products', editingProduct.id);
        await updateDoc(productDocRef, productPayload);
      } else {
        const newProductPayload = {
          ...productPayload,
          createdAt: serverTimestamp(),
        };
        await addDoc(productsSubcolRef, newProductPayload);
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error("Error saving product: ", err);
      alert("Failed to save product details.");
    } finally {
      setUploading(false);
    }
  };

  // Delete Action
  const handleDeleteProduct = async (productId: string) => {
    if (!user) return;
    if (confirm("Are you sure you want to delete this product from your catalogue?")) {
      try {
        const productDocRef = doc(firestore, 'Restaurantcatalogue', user.uid, 'products', productId);
        await deleteDoc(productDocRef);
      } catch (err) {
        console.error("Error deleting product: ", err);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white font-sans">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4 font-sans text-center">
        <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
        <p className="text-slate-400 max-w-sm">Please sign in to your restaurant operator account to view and manage your product catalogue.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100 font-sans antialiased pb-24 relative overflow-x-hidden">
      
      {/* Decorative Accents */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-gradient-to-br from-amber-500/20 to-pink-500/0 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-[20%] left-[-10%] w-[400px] h-[400px] bg-gradient-to-tr from-cyan-500/10 to-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* --- HEADER SECTION --- */}
      <header className="max-w-7xl mx-auto pt-8 px-4 sm:px-6 lg:px-8 mb-10">
        <div className="relative overflow-hidden rounded-3xl bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 p-6 md:p-10 shadow-2xl shadow-slate-950/50 flex flex-col md:flex-row items-center justify-between gap-6 transition-all duration-300">
          <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-amber-500 via-rose-500 to-indigo-500" />
          
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center md:text-left">
            {/* Added Back Button */}
            <button 
              onClick={onBack}
              className="p-3 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/50 rounded-2xl active:scale-95 transition-all text-slate-300 hover:text-white"
              aria-label="Go Back"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div>
              <h1 className="text-4xl md:text-6xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 drop-shadow-sm">
                CATALOGUE
              </h1>
              <p className="mt-2 text-lg md:text-xl font-medium tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-rose-400 uppercase">
                {brandName}
              </p>
            </div>
          </div>

          {/* Dynamic Global Currency Selection Element Layout */}
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
            <div className="flex items-center gap-2 bg-slate-950/50 border border-slate-800 rounded-2xl px-4 py-2 w-full sm:w-auto justify-between shadow-inner">
              <label htmlFor="catalogCurrencySelect" className="text-xs font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap">
                Active Currency:
              </label>
              <select
                id="catalogCurrencySelect"
                value={globalCurrency}
                onChange={(e) => setGlobalCurrency(e.target.value)}
                className="bg-transparent text-sm font-bold text-amber-400 focus:outline-none cursor-pointer p-1"
              >
                {CURRENCY_OPTIONS.map((curr) => (
                  <option key={curr.code} value={curr.code} className="bg-slate-900 text-slate-200 font-medium">
                    {curr.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleOpenCreate}
              className="w-full sm:w-auto active:scale-95 transition-transform duration-150 px-6 py-3.5 bg-gradient-to-r from-amber-500 via-rose-500 to-indigo-600 rounded-2xl font-bold text-white shadow-xl shadow-rose-500/20 hover:shadow-indigo-500/30 flex items-center justify-center gap-2 text-sm sm:text-base group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:rotate-90 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add New Product
            </button>
          </div>
        </div>
      </header>

      {/* --- MAIN CATALOGUE VIEW --- */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {products.length === 0 ? (
          <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl p-12 text-center max-w-md mx-auto mt-12 backdrop-blur-sm">
            <div className="p-4 bg-slate-800/60 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-200">Catalogue Empty</h3>
            <p className="text-slate-400 text-sm mt-1">Start initializing your menu layout by adding premium custom dishes and beverages above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {products.map((product) => (
              <div 
                key={product.id}
                className="group relative flex flex-col bg-slate-900/70 border border-slate-800/80 rounded-3xl overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 backdrop-blur-md"
              >
                <div className="relative w-full aspect-[4/3] bg-slate-950 overflow-hidden">
                  <img 
                    src={product.imageUrl} 
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  
                  {product.category && (
                    <span className="absolute top-4 left-4 z-10 text-[11px] font-bold tracking-wider uppercase bg-slate-900/90 text-amber-400 border border-amber-500/20 px-3 py-1.5 rounded-xl shadow-lg backdrop-blur-md">
                      {product.category}
                    </span>
                  )}

                  <span className={`absolute top-4 right-4 z-10 text-[11px] font-bold tracking-wider uppercase px-3 py-1.5 rounded-xl shadow-lg backdrop-blur-md border ${
                    product.available 
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                      : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  }`}>
                    {product.available ? 'Available' : 'Sold Out'}
                  </span>

                  {product.featured && (
                    <div className="absolute bottom-4 left-4 bg-gradient-to-r from-amber-500 to-rose-500 text-white font-extrabold tracking-widest text-[10px] px-2.5 py-1 rounded-lg shadow-md flex items-center gap-1 uppercase">
                      ★ Featured
                    </div>
                  )}
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-xl font-bold tracking-tight text-white line-clamp-1 group-hover:text-amber-400 transition-colors duration-200">
                        {product.name}
                      </h3>
                      <div className="text-right shrink-0">
                        <span className="text-xl font-extrabold text-white">
                          {/* Instantly maps the selected global currency unit mapping logic */}
                          {product.price} <span className="text-xs text-amber-400 font-bold align-middle">{globalCurrency}</span>
                        </span>
                        {product.discount > 0 && (
                          <p className="text-xs text-rose-400 font-semibold">-{product.discount}% Off</p>
                        )}
                      </div>
                    </div>

                    <p className="text-slate-400 text-xs leading-relaxed line-clamp-2 mb-4">
                      {product.description}
                    </p>

                    <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-950/40 rounded-2xl border border-slate-800/50 mb-4 text-[12px]">
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <span className="text-slate-500 font-medium">Prep:</span> {product.preparationTime}
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <span className="text-slate-500 font-medium">Cal:</span> {product.calories || 'N/A'} kcal
                      </div>
                    </div>

                    {product.tags && product.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        {product.tags.map((tag, idx) => (
                          <span key={idx} className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] px-2 py-0.5 rounded-lg">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/80">
                    <button
                      onClick={() => handleOpenEdit(product)}
                      className="py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-semibold text-xs transition-colors duration-150 flex items-center justify-center gap-1.5"
                    >
                      Edit Details
                    </button>
                    <button
                      onClick={() => product.id && handleDeleteProduct(product.id)}
                      className="py-2.5 px-4 bg-rose-950/40 hover:bg-rose-900/50 border border-rose-900/30 text-rose-300 rounded-xl font-semibold text-xs transition-colors duration-150 flex items-center justify-center gap-1.5"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* --- PREMIUM ADD/EDIT MODAL / BOTTOM SHEET --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="w-full h-full sm:h-auto sm:max-w-2xl bg-slate-900 border-t sm:border border-slate-800 shadow-2xl rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden max-h-[100vh] sm:max-h-[90vh]">
            
            <div className="p-5 border-b border-slate-800/80 bg-slate-950/40 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-white">
                  {editingProduct ? 'Edit Product Item' : 'Add Product to Catalogue'}
                </h2>
                <p className="text-xs text-slate-400">Complete item metrics for high-fidelity inventory records</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="flex-1 overflow-y-auto p-5 space-y-6">
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Product Image <span className="text-rose-500">*</span>
                </label>
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                  <div className="w-full sm:w-40 aspect-[4/3] rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden relative flex items-center justify-center">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-slate-600 text-center px-2">No Image Selected</span>
                    )}
                  </div>
                  <label className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-bold text-slate-200 cursor-pointer text-center border border-slate-700 transition-colors">
                    Choose Image File
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageChange} 
                      className="hidden" 
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Product Name <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Truffle Glazed Wagyu Ribeye"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500 text-sm transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Category
                  </label>
                  <input 
                    type="text"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    placeholder="e.g. Main Dishes, Beverages"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500 text-sm transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Product Description <span className="text-rose-500">*</span>
                </label>
                <textarea 
                  rows={3}
                  required
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Provide structured details outlining ingredients, textures, or portions..."
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500 text-sm transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Price <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="number"
                    step="0.01"
                    required
                    min="0.01"
                    value={formPrice || ''}
                    onChange={(e) => setFormPrice(parseFloat(e.target.value))}
                    placeholder="24.50"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500 text-sm transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Currency <span className="text-rose-500">*</span>
                  </label>
                  <select 
                    value={formCurrency}
                    onChange={(e) => setFormCurrency(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500 text-sm transition-colors"
                  >
                    {CURRENCY_OPTIONS.map((cur) => (
                      <option key={cur.code} value={cur.code}>{cur.code}</option>
                    ))}
                  </select>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Discount (%)
                  </label>
                  <input 
                    type="number"
                    min="0"
                    max="100"
                    value={formDiscount || ''}
                    onChange={(e) => setFormDiscount(parseInt(e.target.value) || 0)}
                    placeholder="0"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500 text-sm transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Prep Time <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text"
                    required
                    value={formPrepTime}
                    onChange={(e) => setFormPrepTime(e.target.value)}
                    placeholder="e.g. 15-20 mins"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500 text-sm transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Calories (kcal)
                  </label>
                  <input 
                    type="number"
                    min="0"
                    value={formCalories || ''}
                    onChange={(e) => setFormCalories(parseInt(e.target.value) || 0)}
                    placeholder="e.g. 450"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500 text-sm transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Ingredients
                  </label>
                  <input 
                    type="text"
                    value={formIngredients}
                    onChange={(e) => setFormIngredients(e.target.value)}
                    placeholder="Comma separated: Beef, Garlic, Olive Oil"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500 text-sm transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Product Tags
                  </label>
                  <input 
                    type="text"
                    value={formTags}
                    onChange={(e) => setFormTags(e.target.value)}
                    placeholder="Comma separated: Spicy, GlutenFree"
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-200 focus:outline-none focus:border-amber-500 text-sm transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-950/50 rounded-2xl border border-slate-800/80">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-200">Available Status</p>
                    <p className="text-[11px] text-slate-500">In stock for active routing</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={formAvailable}
                    onChange={(e) => setFormAvailable(e.target.checked)}
                    className="w-5 h-5 accent-amber-500 bg-slate-950 border-slate-800 rounded cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between border-l border-slate-800 pl-4">
                  <div>
                    <p className="text-sm font-bold text-slate-200">Featured Product</p>
                    <p className="text-[11px] text-slate-500">Highlight at top of menu</p>
                  </div>
                  <input 
                    type="checkbox" 
                    checked={formFeatured}
                    onChange={(e) => setFormFeatured(e.target.checked)}
                    className="w-5 h-5 accent-rose-500 bg-slate-950 border-slate-800 rounded cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm rounded-xl transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-6 py-3 bg-gradient-to-r from-amber-500 to-rose-500 text-white font-bold text-sm rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin" />
                      Saving Content...
                    </>
                  ) : (
                    'Confirm & Save Changes'
                  )}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}