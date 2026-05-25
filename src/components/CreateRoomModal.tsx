import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Radio, Shield, Users, Loader2 } from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './firebase';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoomCreated: (room: any) => void;
}

const CATEGORIES = [
  { id: 'chat', label: '💬 Chill Lounge', desc: 'Social chat & meeting new faces' },
  { id: 'music', label: '🎵 Music Jam', desc: 'DJ mixes, live singing & acoustics' },
  { id: 'gaming', label: '🎮 Game Arena', desc: 'Mobile/console streaming & discord' },
  { id: 'vip', label: '👑 Presidential VIP', desc: 'Restricted premium high-tier talks' }
];

export default function CreateRoomModal({ isOpen, onClose, onRoomCreated }: CreateRoomModalProps) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('chat');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const submitRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Broadcasting node title is required.');
      return;
    }
    
    setErrorMsg('');
    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      const hostName = currentUser?.displayName || currentUser?.email || 'Anonymous Host';
      
      const newRoom = {
        title: title.trim(),
        category,
        host: hostName,
        viewers: '1',
        likes: 0,
        createdAt: serverTimestamp(),
        activeUsersList: [hostName]
      };

      // Add to Firestore database
      const ref = await addDoc(collection(db, 'rooms'), newRoom);

      onRoomCreated({
        id: ref.id,
        ...newRoom,
        createdAt: new Date()
      });
      setTitle('');
    } catch (e: any) {
      console.error(e);
      setErrorMsg('Failed to instantiate broadcasting node in cloud registries.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
      />

      <div className="relative w-full max-w-md bg-zinc-950 border border-white/5 rounded-[3rem] px-6 py-8 shadow-2xl text-left overflow-hidden z-10">
        {/* Glow */}
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-amber-400 via-orange-500 to-red-500" />

        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Radio className="w-5 h-5 text-amber-400 animate-pulse" />
            <h3 className="text-white font-black uppercase italic tracking-tighter text-lg">Spawn Live Room</h3>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors cursor-pointer border-0 bg-transparent"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submitRoom} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Room Audio Name / Pitch</label>
            <input 
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. 🌍 Addis Ababa Chillout Sessions"
              className="w-full bg-black border border-white/5 rounded-2xl p-4 text-xs font-bold text-white outline-none focus:border-amber-400/50 transition-colors"
              maxLength={40}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Select Channel Category</label>
            <div className="grid grid-cols-2 gap-3">
              {CATEGORIES.map(cat => {
                const isSelected = category === cat.id;
                return (
                  <div 
                    key={cat.id}
                    onClick={() => setCategory(cat.id)}
                    className={`p-3 rounded-2xl border text-center cursor-pointer transition-all select-none flex flex-col justify-center gap-1 ${
                      isSelected 
                        ? 'bg-amber-400/10 border-amber-400' 
                        : 'bg-black/40 border-white/5 hover:border-white/10'
                    }`}
                  >
                    <span className="text-xs font-black text-white">{cat.label}</span>
                    <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-tight leading-none leading-relaxed">{cat.desc}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {errorMsg && (
            <div className="bg-red-500/15 border border-red-500/20 text-red-500 text-xs p-4 rounded-xl font-bold flex items-center gap-2">
              {errorMsg}
            </div>
          )}

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-amber-400 hover:bg-amber-300 text-black py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.98] border-0"
          >
            {loading ? (
              <Loader2 className="w-4.5 h-4.5 animate-spin text-black" />
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Establish Broadcasting Node
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
