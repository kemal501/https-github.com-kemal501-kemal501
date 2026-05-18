/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Diamond, Coins, Heart, Flame, Star, Zap, Trophy, Plus, CreditCard, ChevronLeft, Loader2, X } from 'lucide-react';
import { cn } from '../lib/utils';

const GIFTS = [
  { id: '1', name: 'Love', price: 10, icon: Heart, color: 'text-red-500' },
  { id: '2', name: 'Star', price: 50, icon: Star, color: 'text-yellow-400' },
  { id: '3', name: 'Zap', price: 100, icon: Zap, color: 'text-blue-400' },
  { id: '4', name: 'Diamond', price: 500, icon: Diamond, color: 'text-cyan-400' },
  { id: '5', name: 'Trophy', price: 1000, icon: Trophy, color: 'text-amber-500' },
  { id: '6', name: 'Royal', price: 5000, icon: Sparkles, color: 'text-purple-500' },
  { id: '7', name: 'Flame', price: 10000, icon: Flame, color: 'text-orange-500' },
  { id: '8', name: 'VIP', price: 50000, icon: Coins, color: 'text-emerald-400' },
];

const PACKAGES = [
  { id: 'p1', coins: 1000, price: 'ETB 50', label: 'Starter' },
  { id: 'p2', coins: 5000, price: 'ETB 200', label: 'Popular' },
  { id: 'p3', coins: 25000, price: 'ETB 800', label: 'Best Value' },
  { id: 'p4', coins: 100000, price: 'ETB 3000', label: 'Whale' },
];

export default function Gifts({ initialIsPurchasing = false, onSendGift, onClose }: { initialIsPurchasing?: boolean, onSendGift?: (gift: any, target: 'host' | 'self') => void, onClose?: () => void }) {
  const [selected, setSelected] = React.useState<string | null>(null);
  const [isPurchasing, setIsPurchasing] = React.useState(initialIsPurchasing);
  const [loading, setLoading] = React.useState(false);
  const [loadingPkgId, setLoadingPkgId] = React.useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = React.useState<'host' | 'self' | null>(null);

  const [userCoins, setUserCoins] = React.useState(0);

  React.useEffect(() => {
    if (!auth.currentUser) return;
    const unsub = onSnapshot(doc(db, 'users', auth.currentUser.uid), (snap) => {
      if (snap.exists()) {
        setUserCoins(snap.data().coins || 0);
      }
    });
    return () => unsub();
  }, []);

  const handlePurchase = async (pkgId: string) => {
    setLoadingPkgId(pkgId);
    setLoading(true);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate redirection
    console.log("Redirecting to placeholder payment URL for package:", pkgId);
    
    // After delay, reset purchase state
    setTimeout(() => {
        setLoading(false);
        setLoadingPkgId(null);
        setIsPurchasing(false);
    }, 1000);
  };

  const handleConfirm = () => {
    const gift = GIFTS.find(g => g.id === selected);
    if (gift && onSendGift && confirmTarget) {
      onSendGift(gift, confirmTarget);
      setConfirmTarget(null);
      if (onClose) onClose();
    }
  };

  const selectedGiftObj = GIFTS.find(g => g.id === selected);

  return (
    <div className="bg-zinc-950/95 backdrop-blur-3xl border-t border-zinc-800 p-6 rounded-t-[3rem] shadow-2xl relative overflow-hidden min-h-[450px]" id="gift-panel">
      <AnimatePresence mode="wait">
        {confirmTarget && selectedGiftObj ? (
          <motion.div
            key="confirm-gift"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col h-full inset-0 absolute bg-zinc-950/95 backdrop-blur-3xl p-6 z-20 items-center justify-center text-center"
          >
            <div className="flex-1 flex flex-col items-center justify-center space-y-6">
              <div className="bg-amber-400/20 p-6 rounded-full shadow-[0_0_50px_rgba(251,191,36,0.3)]">
                <selectedGiftObj.icon className={cn("w-20 h-20", selectedGiftObj.color, "animate-pulse")} />
              </div>
              <div>
                <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter mb-2">Send {selectedGiftObj.name}?</h3>
                <p className="text-zinc-400 text-xs font-bold uppercase tracking-widest">
                  Target: {confirmTarget === 'host' ? 'The Host' : 'Yourself'}
                </p>
              </div>
              <div className="flex bg-black/40 border border-zinc-800 rounded-2xl px-6 py-3 items-center gap-2">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Cost:</span>
                <Coins className="w-4 h-4 text-amber-400" />
                <span className="text-white font-black text-lg">{selectedGiftObj.price}</span>
              </div>
            </div>
            
            <div className="flex gap-3 w-full mt-auto">
              <button 
                onClick={() => setConfirmTarget(null)}
                className="flex-1 bg-zinc-900 border border-zinc-800 text-zinc-400 font-black py-4 rounded-2xl active:scale-95 transition-all text-xs hover:text-white uppercase tracking-widest"
              >
                Cancel
              </button>
              <button 
                onClick={handleConfirm}
                className="flex-[2] bg-gradient-to-r from-amber-400 to-orange-500 text-black font-black py-4 rounded-2xl shadow-xl shadow-orange-500/20 active:scale-95 transition-all uppercase tracking-widest text-xs"
              >
                Confirm Send
              </button>
            </div>
          </motion.div>
        ) : !isPurchasing ? (
          <motion.div
            key="gift-grid"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex flex-col h-full"
          >
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="bg-amber-400/10 p-2 rounded-xl">
                  <Coins className="text-amber-400 w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Send Gifts</h3>
                  <p className="text-zinc-500 text-xs">Support the host</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-zinc-800 px-3 py-1.5 rounded-full flex items-center gap-2">
                  <Coins className="text-amber-400 w-3 h-3" />
                  <span className="text-white font-black text-xs">{userCoins.toLocaleString()}</span>
                </div>
                <button 
                  onClick={() => setIsPurchasing(true)}
                  className="bg-amber-400 text-black p-1.5 rounded-full hover:scale-110 transition-transform shadow-lg shadow-amber-400/20"
                >
                  <Plus className="w-4 h-4" />
                </button>
                {onClose && (
                  <button 
                    onClick={onClose}
                    className="bg-zinc-900 text-zinc-400 p-1.5 rounded-full hover:text-white transition-colors ml-2 border border-zinc-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 overflow-y-auto no-scrollbar pb-6 flex-1">
              {GIFTS.map((gift) => (
                <button
                  key={gift.id}
                  onClick={() => setSelected(gift.id)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-300",
                    selected === gift.id 
                      ? "bg-zinc-800 scale-105 shadow-lg border border-zinc-700" 
                      : "hover:bg-zinc-900/50 border border-transparent"
                  )}
                >
                  <div className={cn("w-12 h-12 rounded-2xl bg-zinc-900 flex items-center justify-center", gift.color)}>
                    <gift.icon className="w-7 h-7" />
                  </div>
                  <div className="text-center">
                    <p className="text-white text-[10px] font-bold uppercase tracking-wide">{gift.name}</p>
                    <div className="flex items-center justify-center gap-1 mt-0.5">
                      <Coins className="text-amber-400 w-2 h-2" />
                      <span className="text-zinc-400 text-[10px] font-black">{gift.price}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex gap-2 mt-auto pt-4">
              <button 
                onClick={() => setConfirmTarget('self')}
                disabled={!selected}
                className="flex-1 bg-zinc-800 disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all uppercase tracking-widest text-sm hover:bg-zinc-700"
              >
                Self Gift
              </button>
              <button 
                onClick={() => setConfirmTarget('host')}
                disabled={!selected}
                className="flex-1 bg-gradient-to-r from-amber-400 to-orange-600 disabled:opacity-50 text-white font-black py-4 rounded-2xl shadow-xl shadow-orange-600/20 active:scale-95 transition-all uppercase tracking-widest text-sm"
              >
                Send to Host
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="purchase-flow"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <div className="flex items-center gap-4 mb-8">
              <button 
                onClick={() => setIsPurchasing(false)}
                className="bg-zinc-900 p-2 rounded-xl text-zinc-400"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <h3 className="text-white font-bold text-lg">Purchase Coins</h3>
                <p className="text-zinc-500 text-xs">Ethiopia Payment active (Chapa)</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pb-6">
              {PACKAGES.map((pkg) => (
                <button
                  key={pkg.id}
                  onClick={() => handlePurchase(pkg.id)}
                  disabled={loading}
                  className="bg-zinc-900 border border-zinc-800 p-4 rounded-3xl text-left hover:border-amber-400/50 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-2 opacity-5 text-amber-400">
                    <Coins className="w-12 h-12" />
                  </div>
                  <div className="relative z-10">
                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">{pkg.label}</span>
                    <div className="flex items-center gap-1 my-1">
                      <Coins className="text-white w-4 h-4" />
                      <h4 className="text-white font-black text-xl">{pkg.coins.toLocaleString()}</h4>
                    </div>
                    <p className="text-zinc-500 font-bold text-sm tracking-tight">{pkg.price}</p>
                  </div>
                </button>
              ))}
            </div>

            <div className="bg-amber-400/5 border border-amber-400/10 p-4 rounded-2xl flex items-center gap-4 mb-6">
              <div className="bg-amber-400 p-2 rounded-xl text-black">
                <CreditCard className="w-5 h-5" />
              </div>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Secure checkout via <span className="text-white font-bold">Chapa Payment Gateway</span>. Supports CBE, Telebirr, and Bank transfers.
              </p>
            </div>

            {loading && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-t-[3rem]">
                <Loader2 className="w-12 h-12 text-amber-400 animate-spin mb-4" />
                <p className="text-white font-black uppercase tracking-[0.2em] text-xs">Initializing Secure Link...</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
