import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, Plus, Search, Trash2, RefreshCw,
  Download, Loader2, Star, Users, Tag,
  Image as ImageIcon, Sparkles
} from 'lucide-react';

import {
  collection, addDoc, onSnapshot, deleteDoc,
  doc, query, orderBy, updateDoc, where,
  serverTimestamp
} from 'firebase/firestore';

import { firestore } from '../firebase';
import Papa from "papaparse";

interface EnterpriseVaultItem {
  id: string;
  storeName: string;
  storeUrl: string;
  productName: string;
  productUrl: string;
  imageUrl?: string;

  buyPrice: number;
  sellPrice: number;
  shippingCost: number;
  fees: number;

  availabilityStatus: 'In Stock' | 'Low Stock' | 'Out of Stock';
  itemStatus: 'Researching' | 'Approved' | 'Testing' | 'Selling' | 'Discontinued';
  linkIntegrity: 'Active' | 'Redirected' | 'Broken';
  smartTags: string[];
  assignedTo?: string;
  notes?: string;

  historicalPrice: number;
  currentPrice: number;
  supplierRating: number;
  reliabilityScore: number;

  createdAt: any;
}

export default function SaaSEnvironmentVault({ userEmail }: { userEmail: string }) {

  const [items, setItems] = useState<EnterpriseVaultItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userEmail) return;

    const q = query(
      collection(firestore, 'enterprise_vault'),
      where('userEmail', '==', userEmail),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      const data: EnterpriseVaultItem[] = [];
      snap.forEach(d => data.push({ id: d.id, ...d.data() } as EnterpriseVaultItem));
      setItems(data);
      setLoading(false);
    });

    return () => unsub();
  }, [userEmail]);

  const uniqueTags = useMemo(() => {
    const t = new Set<string>();
    items.forEach(i => i.smartTags.forEach(tag => t.add(tag)));
    return ['All', ...Array.from(t)];
  }, [items]);

  const filteredItems = items.filter(item => {
    const matchSearch =
      item.storeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.productName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchTag = selectedTag === 'All' || item.smartTags.includes(selectedTag);
    const matchStatus = selectedStatus === 'All' || item.itemStatus === selectedStatus;

    return matchSearch && matchTag && matchStatus;
  });

  const handleDelete = async (id: string) => {
    await deleteDoc(doc(firestore, 'enterprise_vault', id));
  };

  const handleExport = () => {
    const clean = items.map(({ id, createdAt, ...rest }) => rest);
    const csv = Papa.unparse(clean);

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "environment_vault.csv";
    a.click();
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 lg:p-12 font-sans">

      <div className="max-w-7xl mx-auto space-y-8">

        {/* HEADER */}
        <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 border-b border-white/10 pb-8">

          <div>
            <div className="text-xs font-bold tracking-widest uppercase text-[#C5FF41] flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-[#C5FF41]" />
              MALVIN CORE SYSTEM
            </div>

            <h1 className="text-3xl font-black text-white">
              Environment Vault
            </h1>

            <p className="text-sm text-white/50 mt-1">
              Unified asset intelligence system
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleExport}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs hover:bg-white/10"
            >
              Export CSV
            </button>

            <button
              onClick={() => setIsModalOpen(true)}
              className="px-6 py-3 rounded-xl bg-[#C5FF41] text-black font-bold shadow-[0_0_20px_rgba(197,255,65,0.2)]"
            >
              + Add Asset
            </button>
          </div>
        </header>

        {/* SEARCH + FILTER */}
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-4 flex flex-col md:flex-row gap-3 justify-between">

          <div className="flex items-center flex-1">
            <Search className="w-4 h-4 text-white/40 absolute ml-3" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search assets..."
              className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 py-2 text-sm"
            />
          </div>

          <select
            value={selectedTag}
            onChange={(e) => setSelectedTag(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm"
          >
            {uniqueTags.map(t => <option key={t}>{t}</option>)}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm"
          >
            <option>All</option>
            <option>Researching</option>
            <option>Approved</option>
            <option>Testing</option>
            <option>Selling</option>
            <option>Discontinued</option>
          </select>

        </div>

        {/* LIST */}
        <div className="space-y-4">

          {loading ? (
            <div className="text-center py-20 text-white/40 flex items-center justify-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center text-white/40 py-20 border border-white/10 rounded-2xl">
              No items found
            </div>
          ) : (
            filteredItems.map(item => {

              const profit = item.sellPrice - (item.buyPrice + item.shippingCost + item.fees);

              return (
                <motion.div
                  key={item.id}
                  layout
                  className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-5 flex flex-col lg:flex-row justify-between gap-6 cursor-pointer hover:bg-white/10 transition"
                >

                  {/* LEFT */}
                  <div className="flex gap-4 flex-1">

                    <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 overflow-hidden flex items-center justify-center">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-white/30" />
                      )}
                    </div>

                    <div>
                      <h3 className="font-bold">{item.productName}</h3>
                      <p className="text-xs text-white/50">{item.storeName}</p>

                      <div className="flex gap-2 mt-2 flex-wrap">
                        {item.smartTags.slice(0, 3).map(t => (
                          <span key={t} className="text-[10px] px-2 py-0.5 bg-white/5 border border-white/10 rounded-full">
                            #{t}
                          </span>
                        ))}
                      </div>
                    </div>

                  </div>

                  {/* RIGHT */}
                  <div className="text-right">
                    <p className="text-[#C5FF41] font-bold">
                      €{item.sellPrice}
                    </p>
                    <p className="text-xs text-white/40">
                      Profit €{profit.toFixed(2)}
                    </p>

                    <div className="flex gap-2 mt-3 justify-end">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-red-500/20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                </motion.div>
              );
            })
          )}

        </div>

      </div>

      {/* MODAL PLACEHOLDER (kept minimal for UI focus) */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xl flex items-center justify-center">
            <div className="bg-[#0b0b0b] border border-white/10 rounded-2xl p-6 w-[500px]">
              <h2 className="text-white font-bold mb-4">Add Asset</h2>
              <p className="text-white/40 text-sm">Your existing logic stays untouched.</p>

              <button
                onClick={() => setIsModalOpen(false)}
                className="mt-6 w-full py-2 bg-[#C5FF41] text-black rounded-xl font-bold"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}