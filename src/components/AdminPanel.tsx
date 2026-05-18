/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Shield, Zap, RefreshCw, Layers, Users, TrendingUp, AlertCircle, Terminal } from 'lucide-react';
import { motion } from 'motion/react';
import { doc, updateDoc, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

export default function AdminPanel() {
  const [mintTarget, setMintTarget] = React.useState('');
  const [mintAmount, setMintAmount] = React.useState('');
  const [mintReason, setMintReason] = React.useState('');
  const [isMinting, setIsMinting] = React.useState(false);

  const [logs] = React.useState([
    { id: 1, action: 'Generated 10,000 coins', target: 'UX_USER_99', time: '10s ago' },
    { id: 2, action: 'Updated commission rates', target: 'Global', time: '1m ago' },
    { id: 3, action: 'Blocked malicious IP', target: '192.168.1.1', time: '5m ago' },
  ]);

  const handleMintCoins = async () => {
    if (!mintTarget || !mintAmount) return;
    setIsMinting(true);
    try {
      const res = await fetch("/api/admin/generate-coins", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          userId: mintTarget, 
          amount: parseInt(mintAmount), 
          reason: mintReason,
          adminSecret: "TEMPORARY_SECRET" // In a real app, this would be handled better
        })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Minted ${mintAmount} to ${mintTarget}`);
        setMintTarget('');
        setMintAmount('');
        setMintReason('');
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <div className="space-y-6" id="admin-panel">
      {/* Admin Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
          <p className="text-zinc-500 text-[10px] font-black uppercase mb-1">Total Minted</p>
          <div className="flex items-center gap-2">
            <Zap className="text-amber-400 w-4 h-4" />
            <h2 className="text-white text-xl font-black">4.5M</h2>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
          <p className="text-zinc-500 text-[10px] font-black uppercase mb-1">Active Rooms</p>
          <div className="flex items-center gap-2">
            <RefreshCw className="text-blue-500 w-4 h-4 animate-spin-slow" />
            <h2 className="text-white text-xl font-black">1.2K</h2>
          </div>
        </div>
      </div>

      {/* Coin Generation Form */}
      <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-[2rem] shadow-xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-red-500/10 p-2 rounded-xl">
            <Shield className="text-red-500 w-5 h-5" />
          </div>
          <h3 className="text-white font-bold">Forge Coins</h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="text-zinc-500 text-[10px] font-black uppercase mb-2 block px-2">User ID</label>
            <input 
              type="text" 
              placeholder="e.g. BARCA_7782"
              value={mintTarget}
              onChange={(e) => setMintTarget(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-amber-400 transition-all font-mono text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-zinc-500 text-[10px] font-black uppercase mb-2 block px-2">Amount</label>
              <input 
                type="number" 
                placeholder="0"
                value={mintAmount}
                onChange={(e) => setMintAmount(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-amber-400 transition-all font-mono text-sm"
              />
            </div>
            <div>
              <label className="text-zinc-500 text-[10px] font-black uppercase mb-2 block px-2">Reason (Log)</label>
              <input 
                type="text" 
                placeholder="Legacy sync..."
                value={mintReason}
                onChange={(e) => setMintReason(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white focus:outline-none focus:border-amber-400 transition-all text-xs"
              />
            </div>
          </div>
          <button 
            onClick={handleMintCoins}
            disabled={isMinting}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-xl shadow-lg shadow-red-600/20 active:scale-95 transition-all uppercase tracking-widest text-xs flex items-center justify-center gap-2"
          >
            {isMinting ? 'Minting...' : 'Generate & Sync'}
          </button>
        </div>
      </div>

      {/* System Logs */}
      <div className="bg-black/40 border border-zinc-800/50 rounded-2xl overflow-hidden">
        <div className="bg-zinc-900 p-4 flex items-center gap-2">
          <Terminal className="text-zinc-500 w-4 h-4" />
          <h4 className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">Authority Log</h4>
        </div>
        <div className="p-4 space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start justify-between gap-4 border-b border-zinc-800/30 pb-3 last:border-0 last:pb-0">
              <div className="flex gap-3">
                <div className="mt-1 w-1.5 h-1.5 bg-amber-400 rounded-full" />
                <div>
                  <p className="text-zinc-100 text-xs font-medium">{log.action}</p>
                  <p className="text-zinc-600 text-[9px] font-bold">Target: {log.target}</p>
                </div>
              </div>
              <span className="text-zinc-700 text-[9px] font-black whitespace-nowrap">{log.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
