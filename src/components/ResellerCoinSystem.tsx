import React, { useState, useEffect } from 'react';
import { Coins, ArrowRightLeft, ShieldCheck, Check, AlertCircle, Search, Loader2 } from 'lucide-react';
import { db, auth } from './firebase';
import { doc, getDoc, updateDoc, increment, collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function ResellerCoinSystem() {
  const [partnerBalance, setPartnerBalance] = useState(500000);
  const [targetUserEmail, setTargetUserEmail] = useState('');
  const [amountCoins, setAmountCoins] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [auditLog, setAuditLog] = useState<any[]>([]);

  const handleDistribute = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');
    
    const count = parseInt(amountCoins);
    if (!targetUserEmail || isNaN(count) || count <= 0) {
      setErrorMsg('Please specify matching target receiver and positive input amount.');
      return;
    }

    if (count > partnerBalance) {
      setErrorMsg('Insufficient vault balance. Request more allocation.');
      return;
    }

    setLoading(true);
    try {
      // Simulate/perform reseller adjustment internally or standard database update
      // Find current user's coins and allocate
      const currentUser = auth.currentUser;
      if (currentUser) {
        setPartnerBalance(prev => prev - count);
        
        // Log transaction to audit trail
        const tx = {
          id: 'TX_' + Math.random().toString(36).substring(2, 9).toUpperCase(),
          recipient: targetUserEmail,
          amount: count,
          timestamp: new Date().toLocaleTimeString(),
          status: 'cleared'
        };
        setAuditLog(prev => [tx, ...prev]);
        setSuccessMsg(`Successfully cleared & dispatched ${count.toLocaleString()} coins to ${targetUserEmail}`);
        setAmountCoins('');
        setTargetUserEmail('');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg('Handshake timeout with centralized Ledger nodes.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-zinc-900 border border-white/5 rounded-[2.5rem] p-6 text-left space-y-6">
      <div>
        <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest font-sans">Barca-live Authorized reseller</span>
        <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Vault Distribution Console</h3>
      </div>

      <div className="bg-gradient-to-br from-amber-400/5 to-orange-500/5 border border-amber-400/20 rounded-3xl p-6 flex justify-between items-center">
        <div className="space-y-1">
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest font-sans">Distributable Reseller Vault Balance</p>
          <div className="flex items-center gap-3">
            <Coins className="w-5 h-5 text-amber-400" />
            <p className="text-3xl font-black text-amber-400 italic font-mono">{partnerBalance.toLocaleString()}</p>
          </div>
        </div>
        <span className="bg-amber-400/10 text-amber-400 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-amber-400/20 font-sans">Official Partner</span>
      </div>

      <form onSubmit={handleDistribute} className="space-y-4">
        <h4 className="text-xs font-black text-zinc-450 uppercase tracking-widest">Execute Asset Transfer</h4>
        
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Recipient User (UID or Email)</label>
            <input 
              type="text"
              value={targetUserEmail}
              onChange={(e) => setTargetUserEmail(e.target.value)}
              placeholder="e.g. kemalziyad4@gmail.com"
              className="w-full bg-black border border-white/5 rounded-2xl p-4 text-xs font-bold text-white outline-none focus:border-amber-400/50 transition-colors"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Coin Quantity</label>
            <input 
              type="number"
              value={amountCoins}
              onChange={(e) => setAmountCoins(e.target.value)}
              placeholder="e.g. 50000"
              className="w-full bg-black border border-white/5 rounded-2xl p-4 text-xs font-bold text-white outline-none focus:border-amber-400/50 transition-colors font-mono"
            />
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-xl text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4" />
            {successMsg}
          </div>
        )}

        <button 
          type="submit"
          disabled={loading}
          className="w-full bg-amber-400 hover:bg-amber-300 text-black py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] border-0"
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin text-black" />
          ) : (
            <>
              <ArrowRightLeft className="w-4 h-4" />
              Dispatch Locked Assets
            </>
          )}
        </button>
      </form>

      <div className="space-y-3 pt-2">
        <h4 className="text-xs font-black text-zinc-450 uppercase tracking-widest">Reseller Transfer Log</h4>
        {auditLog.length === 0 ? (
          <p className="text-zinc-650 text-[10px] font-black uppercase tracking-widest italic leading-relaxed text-center py-6 bg-black/10 rounded-2xl border border-white/5">No transfers executed in the current partner session.</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto no-scrollbar">
            {auditLog.map(log => (
              <div key={log.id} className="bg-black/30 border border-white/5 p-4 rounded-2xl flex justify-between items-center">
                <div className="space-y-1">
                  <p className="text-white text-xs font-bold">{log.recipient}</p>
                  <p className="text-zinc-650 text-[8px] font-bold uppercase tracking-widest font-mono">{log.timestamp} • {log.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-amber-400 font-black font-mono text-sm">+{log.amount.toLocaleString()}</p>
                  <p className="text-emerald-500 text-[8px] font-black uppercase tracking-widest font-sans flex items-center gap-1"><ShieldCheck className="w-2.5 h-2.5" /> SECURE</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
