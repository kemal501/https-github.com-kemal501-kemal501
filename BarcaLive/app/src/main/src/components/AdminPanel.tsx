/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Shield, Zap, RefreshCw, Users, Terminal, Database, 
  Search, UserCog, Coins, ShoppingBag, ArrowRightLeft, 
  Loader2, History, Check, AlertCircle, TrendingUp, BarChart3, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import RoomAnalytics from './RoomAnalytics';
import NetworkQualityDashboard from './NetworkQualityDashboard';
import ResellerCoinSystem from './ResellerCoinSystem';

// Module-level cache to prevent rapid API polling / rate limit issues
let cachedUsers: any[] | null = null;
let cachedUsersTime = 0;
let cachedTxs: any[] | null = null;
let cachedTxsTime = 0;

export default function AdminPanel() {
  const currentUserId = auth.currentUser?.uid;

  // Real-time synchronization of the current logged-in user
  const [myProfile, setMyProfile] = React.useState<any>(null);
  
  // App views and role simulation states
  const [simulatedRole, setSimulatedRole] = React.useState<'admin' | 'seller' | 'user'>('admin');
  const [activeTab, setActiveTab] = React.useState<'admin' | 'seller' | 'network' | 'reseller_system'>('admin');

  // Directory & ledgers
  const [users, setUsers] = React.useState<any[]>([]);
  const [transactions, setTransactions] = React.useState<any[]>([]);
  const [audits, setAudits] = React.useState<any[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
  
  // Forms & Loading
  const [loadingUsers, setLoadingUsers] = React.useState(false);
  const [loadingTxs, setLoadingTxs] = React.useState(false);
  const [loadingAudits, setLoadingAudits] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Analytics Modal
  const [selectedAnalyticsUser, setSelectedAnalyticsUser] = React.useState<any>(null);

  // Minting Form inputs
  const [selectedMintUser, setSelectedMintUser] = React.useState<any>(null);
  const [mintAmount, setMintAmount] = React.useState('');
  const [mintReason, setMintReason] = React.useState('');

  // Reselling Form inputs
  const [selectedResellUser, setSelectedResellUser] = React.useState<any>(null);
  const [resellAmount, setResellAmount] = React.useState('');
  const [resellPrice, setResellPrice] = React.useState('');

  // Real-time listener for current user data
  React.useEffect(() => {
    if (!currentUserId) return;
    const unsub = onSnapshot(doc(db, 'users', currentUserId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setMyProfile(data);
        // Automatically align simulated role with real database role on setup
        if (data.role === 'admin' || data.role === 'seller') {
          setSimulatedRole(data.role);
          setActiveTab(data.role as any);
        }
      }
    });
    return () => unsub();
  }, [currentUserId]);

  // Fetch users list
  const fetchUsers = async (force = false) => {
    const now = Date.now();
    if (!force && cachedUsers && (now - cachedUsersTime < 15000)) {
      setUsers(cachedUsers);
      return;
    }
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/admin/users");
      const data = await res.json();
      if (data.success && data.users) {
        cachedUsers = data.users;
        cachedUsersTime = now;
        setUsers(data.users);
      } else {
        throw new Error(data.error || "Failed to fetch platform users from backend");
      }
    } catch (error) {
      console.error("Failed to fetch users from backend:", error);
      if (cachedUsers) {
        setUsers(cachedUsers);
      }
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch ledger transactions
  const fetchLedger = async (force = false) => {
    const now = Date.now();
    if (!force && cachedTxs && (now - cachedTxsTime < 15000)) {
      setTransactions(cachedTxs);
      return;
    }
    setLoadingTxs(true);
    try {
      const res = await fetch("/api/coin/transactions");
      const data = await res.json();
      if (data.success && data.transactions) {
        cachedTxs = data.transactions;
        cachedTxsTime = now;
        setTransactions(data.transactions);
      } else {
        throw new Error(data.error || "Failed to fetch ledger transactions");
      }
    } catch (error) {
      console.error("Failed to fetch transactions from backend:", error);
      if (cachedTxs) {
        setTransactions(cachedTxs);
      }
    } finally {
      setLoadingTxs(false);
    }
  };

  const fetchAudits = async () => {
    setLoadingAudits(true);
    try {
      const res = await fetch("/api/admin/role-audits");
      const data = await res.json();
      if (data.success && data.audits) {
        setAudits(data.audits);
      } else {
        throw new Error(data.error || "Failed to fetch role audits");
      }
    } catch (error) {
      console.error("Failed to fetch role audits from backend:", error);
    } finally {
      setLoadingAudits(false);
    }
  };

  React.useEffect(() => {
    if (currentUserId) {
      fetchUsers();
      fetchLedger();
      fetchAudits();
    }
  }, [currentUserId]);

  // Set real role in database for full sync verification
  const syncDatabaseRole = async (targetRole: 'admin' | 'seller' | 'user') => {
    if (!currentUserId) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/update-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUserId,
          role: targetRole,
          changedById: currentUserId
        })
      });
      const data = await res.json();
      if (data.success) {
        setSimulatedRole(targetRole);
        setActiveTab(targetRole === 'admin' ? 'admin' : 'seller');
        fetchUsers(true);
        fetchAudits();
      } else {
        throw new Error(data.error || "Failed to sync role");
      }
    } catch (error) {
      console.error("Error setting role in DB:", error);
      alert(error instanceof Error ? error.message : "Error setting role");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Change user role
  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch("/api/admin/update-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          role: newRole,
          changedById: currentUserId
        })
      });
      const data = await res.json();
      if (data.success) {
        if (userId === currentUserId) {
          setSimulatedRole(newRole as any);
        }
        fetchUsers(true);
        fetchAudits();
      } else {
        throw new Error(data.error || "Failed to update role");
      }
    } catch (error) {
      console.error("Failed to change user role:", error);
      alert(error instanceof Error ? error.message : "Error changing user role");
    }
  };

  // Admin Coin Minting submit
  const handleMintCoins = async () => {
    if (!selectedMintUser || !mintAmount) return;
    setIsSubmitting(true);
    try {
      const amount = parseInt(mintAmount);
      const res = await fetch("/api/admin/generate-coins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: selectedMintUser.id,
          amount,
          reason: mintReason || "Admin Minting",
          adminSecret: "TEMPORARY_SECRET"
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Success: Forged & Synced ${amount.toLocaleString()} coins for ${selectedMintUser.displayName}`);
        setMintAmount('');
        setMintReason('');
        setSelectedMintUser(null);
        fetchUsers(true);
        fetchLedger(true);
      } else {
        throw new Error(data.error || "Failed to generate coins from server");
      }
    } catch (error) {
      console.error("Failed to mint coins via API:", error);
      alert(`Error minting: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Coin Reseller Wholesale purchasing logic
  const handleWholesalePurchase = async (amount: number, costETB: number) => {
    if (!currentUserId) return;
    setIsSubmitting(true);
    try {
      const { doc, updateDoc, collection, addDoc, increment } = await import('firebase/firestore');
      const sellerRef = doc(db, "users", currentUserId);
      await updateDoc(sellerRef, {
        coins: increment(amount)
      });
      
      const txRef = collection(db, "coin_transactions");
      await addDoc(txRef, {
        type: "wholesale_purchase",
        sellerId: currentUserId,
        sellerName: myProfile?.displayName || "Coin Seller",
        amount,
        costETB,
        createdAt: new Date().toISOString()
      });
      
      alert(`Wholesale Purchase Successful! Added ${amount.toLocaleString()} coins to your Seller Account.`);
      fetchUsers(true);
      fetchLedger(true);
    } catch (err) {
      console.error("Wholesale err client-side:", err);
      alert(`Wholesale Purchase Failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Coin Reseller Transfer/Resell execution
  const handleResellCoins = async () => {
    if (!currentUserId || !selectedResellUser || !resellAmount) return;
    const amount = parseInt(resellAmount);
    const priceETB = parseInt(resellPrice) || 0;
    
    setIsSubmitting(true);
    try {
      const { doc, runTransaction, collection } = await import('firebase/firestore');
      const sellerRef = doc(db, "users", currentUserId);
      const targetRef = doc(db, "users", selectedResellUser.id);
      
      await runTransaction(db, async (transaction) => {
        const sellerDoc = await transaction.get(sellerRef);
        if (!sellerDoc.exists()) throw new Error("Seller profile not found");
        
        const sellerCoins = sellerDoc.data().coins || 0;
        if (sellerCoins < amount) throw new Error("Insufficient coin balance for resell");
        
        const targetDoc = await transaction.get(targetRef);
        if (!targetDoc.exists()) throw new Error("Target platform user not found");
        
        transaction.update(sellerRef, { coins: sellerCoins - amount });
        transaction.update(targetRef, { coins: (targetDoc.data().coins || 0) + amount });
        
        const txRef = doc(collection(db, "coin_transactions"));
        transaction.set(txRef, {
          type: "seller_resell",
          sellerId: currentUserId,
          sellerName: sellerDoc.data().displayName || "Coin Seller",
          targetUserId: selectedResellUser.id,
          targetUserName: targetDoc.data().displayName || "Platform User",
          amount,
          priceETB,
          createdAt: new Date().toISOString()
        });
      });
      
      alert(`Resell Complete: Sent ${amount.toLocaleString()} coins to ${selectedResellUser.displayName}`);
      setResellAmount('');
      setResellPrice('');
      setSelectedResellUser(null);
      fetchUsers(true);
      fetchLedger(true);
    } catch (error) {
      console.error("Resell error client-side:", error);
      alert(`Failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dynamic search/filtered users based on searchQuery string
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      (u.displayName || u.id).toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6" id="admin-panel">
      {/* Simulation Hub HUD Panel */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-[2rem] p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-emerald-400" />
              <h4 className="text-[10px] font-black text-white uppercase tracking-wider">Operator Identity Switcher</h4>
            </div>
            <p className="text-[9px] text-zinc-500 font-semibold uppercase tracking-wider">
              Swap roles instantly in Firestore to interactively test both consoles.
            </p>
          </div>

          <div className="flex items-center bg-zinc-900/60 border border-zinc-800 rounded-xl p-1 shrink-0">
            {[
              { id: 'admin', label: 'Administrator', icon: Shield },
              { id: 'seller', label: 'Coin Seller', icon: Coins },
              { id: 'user', label: 'Host/User', icon: Users }
            ].map((role) => (
              <button
                key={role.id}
                type="button"
                onClick={() => syncDatabaseRole(role.id as any)}
                disabled={isSubmitting}
                className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider px-3.5 py-2.5 rounded-lg transition-all cursor-pointer ${
                  simulatedRole === role.id 
                    ? "bg-amber-400 text-black font-black" 
                    : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                }`}
              >
                <role.icon className="w-3.5 h-3.5 shrink-0" />
                {role.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sync Balance Meter Banner */}
        <div className="bg-zinc-900 border border-zinc-850 p-4 rounded-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center shrink-0">
              <Coins className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Your Live Balance</p>
              <h2 className="text-white text-base font-black font-mono">
                {(myProfile?.coins || 0).toLocaleString()} <span className="text-amber-400 text-[10px]">COINS</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-[8px] font-black uppercase tracking-wider px-2 py-1 rounded ${
              myProfile?.role === 'admin' 
                ? 'bg-red-500/10 text-red-400 border border-red-500/15'
                : myProfile?.role === 'seller'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                : 'bg-zinc-800 text-zinc-400'
            }`}>
              {myProfile?.role ? `${myProfile.role} (Synced)` : 'Syncing...'}
            </span>
            <button 
              onClick={() => { fetchUsers(true); fetchLedger(true); }}
              className="p-2 bg-zinc-850 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white rounded-lg transition-all cursor-pointer"
              title="Refresh Directory"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Primary Dashboard Navigation Tabs */}
      <div className="flex border-b border-zinc-800/80">
        {simulatedRole === 'admin' && (
          <button
            onClick={() => setActiveTab('admin')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
              activeTab === 'admin' 
                ? 'border-amber-400 text-white font-black' 
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            System Administration
          </button>
        )}
        
        {(simulatedRole === 'seller' || simulatedRole === 'admin') && (
          <button
            onClick={() => setActiveTab('seller')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
              activeTab === 'seller' 
                ? 'border-amber-400 text-white font-black' 
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            Coin Reseller Hub
          </button>
        )}

        {simulatedRole === 'admin' && (
          <button
            onClick={() => setActiveTab('network')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
              activeTab === 'network' 
                ? 'border-amber-400 text-white font-black' 
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Diagnostics Room Console
          </button>
        )}

        {simulatedRole === 'admin' && (
          <button
            onClick={() => setActiveTab('reseller_system')}
            className={`flex items-center gap-2 px-5 py-3 border-b-2 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${
              activeTab === 'reseller_system' 
                ? 'border-amber-400 text-white font-black' 
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Coins className="w-3.5 h-3.5 text-amber-450" />
            Reseller Coin Portal
          </button>
        )}
      </div>

      {/* Main Panel Content Render Panels */}
      <div className="space-y-6">

        {/* Tab 1: System Administration (Admin Role) */}
        {activeTab === 'admin' && simulatedRole === 'admin' && (
          <div className="space-y-6">
            
            {/* Split controls layout: Users List vs Mint module */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Register Search & directory */}
              <div className="lg:col-span-2 bg-zinc-900/40 border border-zinc-850 p-6 rounded-[2rem] space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <UserCog className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-white font-black uppercase text-xs tracking-wider">User Balance & Role Administration</h3>
                  </div>
                  <span className="text-[8px] bg-zinc-800 text-zinc-500 font-mono px-2 py-0.5 rounded font-black">
                    {filteredUsers.length} ENTITIES OUT OF {users.length}
                  </span>
                </div>

                {/* Directory Search & Filters */}
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Search className="h-3.5 w-3.5 text-zinc-500" />
                  </span>
                  <input
                    type="text"
                    placeholder="Search by name, uid, role or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 w-full bg-zinc-950 border border-zinc-800 rounded-xl p-2.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-amber-400/40 transition-colors"
                  />
                </div>

                {/* Directory Table Grid representation */}
                <div className="max-h-[300px] overflow-y-auto border border-zinc-850 rounded-xl divide-y divide-zinc-900 bg-zinc-950">
                  {loadingUsers ? (
                    <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-zinc-500">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-[9px] font-bold uppercase tracking-widest">Scanning Firestore Base...</span>
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="p-8 text-center text-zinc-550 text-[10px] uppercase font-black tracking-widest">
                      No matching user records detected
                    </div>
                  ) : (
                    filteredUsers.map((user) => (
                      <div key={user.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-zinc-900 border-zinc-900 transition-colors">
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold text-xs truncate uppercase">{user.displayName || "Anonymous User"}</span>
                            <span className="bg-zinc-900 text-zinc-500 text-[8px] font-mono border border-zinc-850/60 px-1 rounded">
                              {user.id.substring(0, 8)}...
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-zinc-500 font-mono text-[9px]">
                            <span>Email: {user.email || "No Email Email"}</span>
                            <span>•</span>
                            <span className="text-amber-400 font-bold">Coins: {(user.coins || 0).toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Inline Role Modifier & Forge Prefill actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <select
                            value={user.role || 'user'}
                            onChange={(e) => handleUpdateUserRole(user.id, e.target.value)}
                            className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 text-[10px] font-black tracking-wider uppercase rounded-lg px-2.5 py-1.5 focus:outline-none cursor-pointer"
                          >
                            <option value="user font-black">USER</option>
                            <option value="host">HOST</option>
                            <option value="agent">AGENT</option>
                            <option value="seller">SELLER (Coin Reseller)</option>
                            <option value="admin">ADMIN</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => setSelectedAnalyticsUser(user)}
                            className="bg-blue-950/40 hover:bg-blue-900/30 border border-blue-800/20 hover:border-blue-600/30 text-blue-400 text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <BarChart3 className="w-3 h-3" />
                            Analytics
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMintUser(user);
                              setMintAmount('');
                            }}
                            className="bg-purple-950/40 hover:bg-purple-900/30 border border-purple-800/20 hover:border-purple-600/30 text-purple-400 text-[9px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                          >
                            Fund User
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Right Column: Secure Forge Forms */}
              <div className="bg-zinc-900/40 border border-zinc-850 p-6 rounded-[2rem] space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="bg-red-500/10 p-1.5 rounded-lg">
                    <Shield className="w-4 h-4 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-black uppercase text-xs">Authority Forge</h3>
                    <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Generate revenue coins securely</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest block px-1 mb-1.5">Selected Target</span>
                    {selectedMintUser ? (
                      <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="text-white text-xs font-bold uppercase select-none">{selectedMintUser.displayName}</p>
                          <p className="text-zinc-500 font-mono text-[8px] uppercase select-all">UUID: {selectedMintUser.id}</p>
                        </div>
                        <button 
                          onClick={() => setSelectedMintUser(null)}
                          className="text-[9px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 px-2 py-1 uppercase font-black tracking-wider text-rose-400 rounded-md transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                    ) : (
                      <div className="bg-zinc-950 border border-zinc-850 border-dashed rounded-xl p-4 text-center">
                        <p className="text-[9.5px] text-zinc-500 uppercase font-black tracking-wider">No User Selected</p>
                        <p className="text-[8px] text-zinc-650 mt-1">Select any user directories on the left to prefills automatically.</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest block px-1 mb-1.5">Coin Mint Quantity</span>
                    <input
                      type="number"
                      placeholder="e.g. 50000"
                      value={mintAmount}
                      onChange={(e) => setMintAmount(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-400/30 rounded-xl p-3 text-xs text-white placeholder-zinc-700 outline-none font-mono font-medium"
                    />
                  </div>

                  <div>
                    <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest block px-1 mb-1.5">Generation Log Reason</span>
                    <input
                      type="text"
                      placeholder="Platform launch grant / Support payout..."
                      value={mintReason}
                      onChange={(e) => setMintReason(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-400/30 rounded-xl p-3 text-xs text-white placeholder-zinc-700 outline-none"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleMintCoins}
                    disabled={isSubmitting || !selectedMintUser || !mintAmount}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-zinc-850 disabled:text-zinc-650 text-white font-black py-3.5 rounded-xl text-[10px] uppercase tracking-wider transition-all shadow-lg hover:shadow-red-600/10 cursor-pointer hover:scale-[1.01]"
                  >
                    {isSubmitting ? "Generating Assets..." : "Execute & Mint Coins"}
                  </button>
                </div>
              </div>
            </div>

            {/* Audit Logs Row */}
            <div className="bg-zinc-900/40 border border-zinc-850 p-6 rounded-[2rem] space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="bg-zinc-800 p-1.5 rounded-lg">
                    <History className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-black uppercase text-xs">Role Audit Logs</h3>
                    <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">A secure log of all role update events</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={fetchAudits}
                  disabled={loadingAudits}
                  className="bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 px-3 py-1.5 text-zinc-400 hover:text-white rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingAudits ? 'animate-spin' : ''}`} />
                  <span className="text-[8px] font-black uppercase tracking-wider px-1">Refresh</span>
                </button>
              </div>

              <div className="overflow-x-auto border border-zinc-850 rounded-xl bg-zinc-950">
                <div className="max-h-[300px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-zinc-900 bg-zinc-900/40 text-[9px] text-zinc-500 font-black uppercase tracking-wider">
                        <th className="px-4 py-3">Operator</th>
                        <th className="px-4 py-3">Target User</th>
                        <th className="px-4 py-3">Transition</th>
                        <th className="px-4 py-3 text-right">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900/50">
                      {loadingAudits ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-zinc-500">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span className="text-[9px] font-bold uppercase tracking-widest">Querying Audit Ledger...</span>
                            </div>
                          </td>
                        </tr>
                      ) : audits.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-zinc-550 text-[10px] uppercase font-black tracking-widest">
                            No role change audits found
                          </td>
                        </tr>
                      ) : (
                        audits.map((audit) => (
                          <tr key={audit.id} className="hover:bg-zinc-900/40 border-zinc-900/50 transition-colors">
                            <td className="px-4 py-3.5">
                              <div className="font-bold text-white uppercase">{audit.changedByName || 'System'}</div>
                              <div className="text-[8px] text-zinc-550 font-mono">UID: {audit.changedById}</div>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="font-bold text-zinc-300 uppercase">{audit.targetUserName}</div>
                              <div className="text-[8px] text-zinc-550 font-mono">UID: {audit.targetUserId}</div>
                            </td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-1.5 font-mono text-[10px]">
                                <span className="bg-zinc-900 border border-zinc-850 px-1.5 py-0.5 rounded text-zinc-400 text-[8px] font-black uppercase">
                                  {audit.oldRole}
                                </span>
                                <span className="text-zinc-600">→</span>
                                <span className="bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded text-amber-400 text-[8px] font-black uppercase">
                                  {audit.newRole}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-right font-mono text-[9px] text-zinc-400">
                              {audit.createdAt ? new Date(audit.createdAt).toLocaleString() : 'Pending/Just now'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Network Quality Diagnostics (Admin Role) */}
        {activeTab === 'network' && simulatedRole === 'admin' && (
          <div className="space-y-6 animate-fadeIn text-white">
            <NetworkQualityDashboard />
          </div>
        )}

        {/* Tab 4: Barca-live Reseller Coin System */}
        {activeTab === 'reseller_system' && simulatedRole === 'admin' && (
          <div className="space-y-6 animate-fadeIn text-white">
            <ResellerCoinSystem />
          </div>
        )}

        {/* Tab 2: Coin Reseller Hub (Seller Role or Admin) */}
        {activeTab === 'seller' && (simulatedRole === 'seller' || simulatedRole === 'admin') && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Split layout: Wholesale store vs resell transfer panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Wholesale packages grid */}
              <div className="lg:col-span-2 bg-zinc-900/40 border border-zinc-850 p-6 rounded-[2rem] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 text-amber-400" />
                    <h3 className="text-white font-black uppercase text-xs">Wholesale Package Store</h3>
                  </div>
                  <span className="text-[8px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/15 font-bold uppercase tracking-wider px-2 py-0.5 rounded">
                    Wholesale Discount Pricing Enabled
                  </span>
                </div>
                <p className="text-[9.5px] text-zinc-500">
                  Bulk purchase coins from the main system treasury directly at steep distributor-grade rates, then resell them locally to players and hosts!
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  {[
                    { coins: 150000, priceETB: 400, label: "Bronze wholesale", discount: "Save 15%" },
                    { coins: 850000, priceETB: 2000, label: "Silver wholesale", discount: "Save 25%" },
                    { coins: 5000000, priceETB: 10000, label: "Gold wholesale", discount: "Save 40%" }
                  ].map((pkg, idx) => (
                    <div key={idx} className="bg-zinc-950 border border-zinc-850 hover:border-zinc-750 p-4.5 rounded-2xl flex flex-col justify-between space-y-4 transition-all hover:translate-y-[-2px]">
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[7.5px] bg-amber-400/10 text-amber-400 font-black tracking-widest uppercase px-1.5 py-0.5 rounded">
                            {pkg.discount}
                          </span>
                        </div>
                        <h4 className="text-white text-lg font-black font-mono">
                          {pkg.coins.toLocaleString()}
                        </h4>
                        <span className="text-[8.5px] text-zinc-450 uppercase font-black tracking-wider block">
                          {pkg.label}
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-baseline justify-between">
                          <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Rate</span>
                          <span className="text-white font-black text-sm">ETB {pkg.priceETB}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleWholesalePurchase(pkg.coins, pkg.priceETB)}
                          disabled={isSubmitting}
                          className="w-full bg-amber-400 hover:bg-amber-300 text-black font-black text-[9.5px] py-2 rounded-lg transition-all uppercase tracking-wider cursor-pointer"
                        >
                          Wholesale Buy
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Column: Resell Coins Form */}
              <div className="bg-zinc-900/40 border border-zinc-850 p-6 rounded-[2rem] space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="bg-amber-400/10 p-1.5 rounded-lg">
                    <ArrowRightLeft className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-black uppercase text-xs">Resell & Transfer</h3>
                    <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest">Sell to any platform player</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Select target input list with pre-fetched search panel */}
                  <div>
                    <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest block px-1 mb-1.5">Select Buyer</span>
                    <div className="relative mb-2">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Search className="h-3 w-3 text-zinc-650" />
                      </span>
                      <input
                        type="text"
                        placeholder="Type platform user name..."
                        className="pl-8.5 w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2 text-[10.5px] text-white placeholder-zinc-700 outline-none"
                        onChange={(e) => {
                          const matched = users.find(u => u.displayName?.toLowerCase().includes(e.target.value.toLowerCase()));
                          if (matched && e.target.value.length > 2) {
                            setSelectedResellUser(matched);
                          }
                        }}
                      />
                    </div>

                    {selectedResellUser ? (
                      <div className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl flex items-center justify-between">
                        <div>
                          <p className="text-white text-xs font-bold uppercase">{selectedResellUser.displayName}</p>
                          <p className="text-emerald-400 font-mono text-[8px] uppercase">
                            Current balance: {(selectedResellUser.coins || 0).toLocaleString()} coins
                          </p>
                        </div>
                        <button 
                          onClick={() => setSelectedResellUser(null)}
                          className="text-[9px] bg-zinc-900 border border-zinc-800 px-2 py-1 uppercase text-zinc-500 hover:text-white rounded transition-colors"
                        >
                          Clear
                        </button>
                      </div>
                    ) : (
                      <div className="bg-zinc-950/60 border border-dashed border-zinc-850 rounded-xl p-3.5 text-center text-[10px] text-zinc-600">
                        Type search keyword to auto-match buyers instantly
                      </div>
                    )}
                  </div>

                  <div>
                    <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest block px-1 mb-1.5">Coins to Transfer</span>
                    <input
                      type="number"
                      placeholder="e.g. 10000"
                      value={resellAmount}
                      onChange={(e) => setResellAmount(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-400/30 rounded-xl p-3 text-xs text-white placeholder-zinc-700 outline-none font-mono"
                    />
                  </div>

                  <div>
                    <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest block px-1 mb-1.5">Agreed Selling Price (ETB)</span>
                    <input
                      type="number"
                      placeholder="e.g. 150"
                      value={resellPrice}
                      onChange={(e) => setResellPrice(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-400/30 rounded-xl p-3 text-xs text-white placeholder-zinc-700 outline-none font-mono"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleResellCoins}
                    disabled={isSubmitting || !selectedResellUser || !resellAmount}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-zinc-850 disabled:text-zinc-600 text-white font-black py-4 rounded-xl text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                  >
                    {isSubmitting ? "Processing transfer..." : "Complete Sell & Resell"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Unified Platform Ledger Database Audit Log */}
      <div className="bg-zinc-950 border border-zinc-900/60 rounded-[2rem] overflow-hidden shadow-2xl">
        <div className="bg-zinc-900/90 p-4.5 flex items-center justify-between border-b border-zinc-950">
          <div className="flex items-center gap-2">
            <History className="text-zinc-400 w-4 h-4 shrink-0" />
            <h4 className="text-white text-[10px] font-black uppercase tracking-wider">Unification Transaction Ledger Logs</h4>
          </div>
          <button 
            type="button"
            onClick={fetchLedger}
            className="text-[8.5px] bg-zinc-800 hover:bg-zinc-750 text-zinc-400 hover:text-white border border-zinc-750 font-black px-2.5 py-1.5 rounded-lg flex items-center gap-1 uppercase transition-all"
          >
            {loadingTxs ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            Reload Logs
          </button>
        </div>

        <div className="p-6">
          <div className="max-h-[220px] overflow-y-auto space-y-2 pr-1">
            {transactions.length === 0 ? (
              <div className="p-8 text-center bg-zinc-900/40 border border-dashed border-zinc-900 rounded-xl text-zinc-600 text-[10px] font-black uppercase tracking-widest">
                No recent transactions detected in unified log database
              </div>
            ) : (
              transactions.map((tx) => (
                <div key={tx.id} className="bg-zinc-900/70 border border-zinc-850/80 p-3 h-auto rounded-xl flex items-center justify-between gap-3 text-xs">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`text-[7.5px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                        tx.type === 'admin_mint' 
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/15'
                          : tx.type === 'wholesale_purchase'
                          ? 'bg-amber-400/10 text-amber-400 border border-amber-400/15'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                      }`}>
                        {tx.type === 'admin_mint' ? 'SYSTEM MINT' : tx.type === 'wholesale_purchase' ? 'WHOLESALE PURCHASE' : 'SELLER RESELL'}
                      </span>
                      <span className="text-white font-black text-[10px] font-mono">
                        {tx.amount?.toLocaleString()} COINS
                      </span>
                    </div>

                    <div className="text-[9.5px] font-semibold text-zinc-500 leading-normal">
                      {tx.type === 'admin_mint' && (
                        <span>Admin forged and synced to {tx.targetUserName || `UID: ${tx.targetUserId}`} • Reason: "{tx.reason}"</span>
                      )}
                      {tx.type === 'wholesale_purchase' && (
                        <span>Seller {tx.sellerName} purchased wholesale package for ETB {tx.costETB}</span>
                      )}
                      {tx.type === 'seller_resell' && (
                        <span>Seller {tx.sellerName} resold to {tx.targetUserName || `UID: ${tx.targetUserId}`} for ETB {tx.priceETB}</span>
                      )}
                    </div>
                  </div>

                  <span className="text-zinc-600 text-[8.5px] font-mono whitespace-nowrap shrink-0">
                    {tx.createdAt ? new Date(tx.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'Unknown'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      
      {/* Analytics Modal */}
      <AnimatePresence>
        {selectedAnalyticsUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedAnalyticsUser(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-950 border border-zinc-800 rounded-3xl p-6 w-full max-w-4xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto relative"
            >
              <button 
                onClick={() => setSelectedAnalyticsUser(null)}
                className="absolute top-6 right-6 p-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-xl text-zinc-400 hover:text-white transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>
              
              <div className="mb-6">
                <h2 className="text-xl font-black text-white uppercase tracking-tight">Host Analytics Diagnostics</h2>
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">Live metrics for <span className="text-amber-400">{selectedAnalyticsUser.displayName}</span></p>
              </div>

              <div className="bg-zinc-900/50 rounded-[2rem] border border-zinc-800/80 p-2">
                <RoomAnalytics roomTitle={`${selectedAnalyticsUser.displayName} Live Diagnostics`} />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
