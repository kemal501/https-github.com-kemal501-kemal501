import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Gift, Flame, Trophy, Coins, Check, AlertCircle, Send } from 'lucide-react';
import { db, auth } from './firebase';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';

interface GiftItem {
  id: string;
  name: string;
  cost: number;
  icon: string;
  tier: 'Common' | 'Rare' | 'Epic' | 'Legendary';
  color: string;
}

const GIFT_LIST: GiftItem[] = [
  { id: 'g1', name: 'Macchiato Espresso', cost: 10, icon: '☕', tier: 'Common', color: 'text-amber-600' },
  { id: 'g2', name: 'Barca Rose', cost: 50, icon: '🌹', tier: 'Common', color: 'text-red-500' },
  { id: 'g3', name: 'Flaming Fire', cost: 200, icon: '🔥', tier: 'Rare', color: 'text-orange-500' },
  { id: 'g4', name: 'Mic Champion', cost: 500, icon: '🎤', tier: 'Rare', color: 'text-blue-400' },
  { id: 'g5', name: 'Ethiopia Star', cost: 1500, icon: '🇪🇹', tier: 'Epic', color: 'text-yellow-400' },
  { id: 'g6', name: 'Golden Lion Cub', cost: 5000, icon: '🦁', tier: 'Epic', color: 'text-amber-500' },
  { id: 'g7', name: 'Sovereign Crown', cost: 15000, icon: '👑', tier: 'Legendary', color: 'text-amber-300' },
  { id: 'g8', name: 'Pegasus Supercar', cost: 50000, icon: '🏎️', tier: 'Legendary', color: 'text-fuchsia-400' }
];

interface GiftsProps {
  onGiftSent?: (icon: string) => void;
}

export default function Gifts({ onGiftSent }: GiftsProps) {
  const [selectedGift, setSelectedGift] = useState<GiftItem | null>(null);
  const [coinsBalance, setCoinsBalance] = useState(0);
  const [sending, setSending] = useState(false);
  const [successAnimation, setSuccessAnimation] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    // Read user's current coin balance in real-time or via lookup
    const fetchBalance = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      try {
        const snap = await getDoc(doc(db, 'users', currentUser.uid));
        if (snap.exists()) {
          setCoinsBalance(snap.data().coins || 0);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchBalance();
  }, []);

  const handleSendGift = async () => {
    if (!selectedGift) return;
    setErrorMsg('');
    setSuccessMsg('');
    
    if (coinsBalance < selectedGift.cost) {
      setErrorMsg('Insufficient Coins balance. Visit the coin vault.');
      return;
    }

    setSending(true);
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          coins: increment(-selectedGift.cost)
        });
        
        setCoinsBalance(prev => prev - selectedGift.cost);
        setSuccessAnimation(true);
        if (onGiftSent) {
          onGiftSent(selectedGift.icon);
        }
        setTimeout(() => setSuccessAnimation(false), 2000);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to process gift transfer.');
    } finally {
      setSending(false);
    }
  };

  const [successMsg, setSuccessMsg] = useState('');

  return (
    <div className="bg-zinc-950 border-t border-white/10 rounded-t-[3.5rem] p-6 text-left space-y-6 pb-12 w-full max-w-md mx-auto">
      <div className="flex justify-between items-center px-2">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-amber-400 animate-pulse" />
          <h3 className="text-white font-black uppercase italic tracking-tighter text-base">Select Broadcaster Gift</h3>
        </div>
        
        <div className="flex items-center gap-1.5 bg-black/60 px-3 py-1.5 rounded-full border border-white/5 font-mono">
          <Coins className="w-4 h-4 text-amber-400" />
          <span className="text-amber-450 text-xs font-black">{coinsBalance.toLocaleString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 max-h-[240px] overflow-y-auto no-scrollbar py-2">
        {GIFT_LIST.map((gift) => {
          const isSelected = selectedGift?.id === gift.id;
          return (
            <div 
              key={gift.id}
              onClick={() => setSelectedGift(gift)}
              className={`p-2.5 rounded-2xl border text-center cursor-pointer transition-all flex flex-col justify-between h-[100px] select-none ${
                isSelected 
                  ? 'bg-amber-400/10 border-amber-400 scale-[1.03]' 
                  : 'bg-black/40 border-white/5 hover:border-white/10'
              }`}
            >
              <div className="text-3xl filter drop-shadow-[0_4px_6px_rgba(0,0,0,0.5)] mb-1">
                {gift.icon}
              </div>
              <div className="space-y-0.5">
                <p className="text-[8px] font-black text-white/90 truncate leading-none uppercase">{gift.name}</p>
                <div className="flex items-center justify-center gap-0.5 mt-1">
                  <Coins className="w-2.5 h-2.5 text-amber-400" />
                  <span className="text-[9px] font-black text-amber-400 font-mono leading-none">{gift.cost}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {errorMsg && (
        <div className="bg-red-500/15 border border-red-500/20 text-red-500 text-[10px] p-3 rounded-xl font-bold flex items-center gap-2 uppercase tracking-wide">
          <AlertCircle className="w-3.5 h-3.5" />
          {errorMsg}
        </div>
      )}

      {successAnimation && selectedGift && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] p-3 rounded-xl font-bold flex items-center justify-center gap-1.5 uppercase tracking-wide font-mono"
        >
          <Sparkles className="w-3.5 h-3.5 text-green-400 animate-spin" />
          Delivered {selectedGift.name}! {selectedGift.icon}
        </motion.div>
      )}

      {selectedGift ? (
        <button 
          onClick={handleSendGift}
          disabled={sending || coinsBalance < selectedGift.cost}
          className="w-full bg-amber-400 text-black py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-xl shadow-amber-400/15 border-0 hover:bg-amber-300 cursor-pointer active:scale-95 transition-all"
        >
          <Send className="w-3.5 h-3.5" />
          Transmit {selectedGift.name} (-{selectedGift.cost} Coins)
        </button>
      ) : (
        <div className="w-full bg-zinc-900 border border-white/5 text-zinc-505 text-center py-4 rounded-2xl text-[10px] font-black uppercase tracking-wider italic">
          Choose a gift token to engage broadcaster
        </div>
      )}
    </div>
  );
}
