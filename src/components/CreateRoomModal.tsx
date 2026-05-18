/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Mic, Video, Lock, Globe, Camera, ArrowRight, Sparkles, ShieldCheck, Coins, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRoomCreated: (roomData: any) => void;
}

export default function CreateRoomModal({ isOpen, onClose, onRoomCreated }: CreateRoomModalProps) {
  const [title, setTitle] = React.useState('');
  const [type, setType] = React.useState<'voice' | 'video'>('voice');
  const [privacy, setPrivacy] = React.useState<'public' | 'private'>('public');
  const [entryFee, setEntryFee] = React.useState<number>(0);
  const [password, setPassword] = React.useState('');
  const [isCreating, setIsCreating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const PROHIBITED_WORDS = ['scam', 'abuse', 'spam', 'hack', 'admin', 'official', 'support', 'owner', 'system', 'root'];

  const validate = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return 'Room title is required';
    if (trimmedTitle.length < 3) return 'Title must be at least 3 characters';
    
    const hasProhibited = PROHIBITED_WORDS.some(word => 
      trimmedTitle.toLowerCase().includes(word.toLowerCase())
    );
    if (hasProhibited) return 'Title contains restricted words';

    if (privacy === 'private') {
      if (!password) return 'Password is required for private rooms';
      if (password.length < 4) return 'Password must be at least 4 characters';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    if (!auth.currentUser) return;

    setIsCreating(true);
    const roomId = 'room_' + Math.random().toString(36).slice(2, 9);
    
    const roomData = {
      id: roomId,
      title: title.trim(),
      host: auth.currentUser.displayName || 'Host',
      hostId: auth.currentUser.uid,
      type: type,
      status: 'live',
      viewerCount: 0,
      isPrivate: privacy === 'private',
      password: privacy === 'private' ? password : null,
      createdAt: serverTimestamp(),
      seats: Array.from({ length: 24 }).map((_, i) => ({
        id: i,
        occupied: i === 0,
        user: i === 0 ? {
          name: auth.currentUser?.displayName || 'Host',
          avatar: auth.currentUser?.photoURL || `https://i.pravatar.cc/100?u=${auth.currentUser?.uid}`,
          videoEnabled: type === 'video',
          isMuted: false,
          voiceEffect: 'none'
        } : null,
        isLocked: false
      })),
      settings: {
        entryEffectsEnabled: true,
        voiceFXEnabled: true,
        isBgmEnabled: true,
        isPrivate: privacy === 'private',
        entryFee: entryFee
      }
    };

    try {
      await setDoc(doc(db, 'rooms', roomId), roomData);
      onRoomCreated(roomData);
      onClose();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `rooms/${roomId}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150]"
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="fixed inset-0 flex items-center justify-center p-6 z-[160] pointer-events-none"
          >
            <div className="bg-zinc-900 border border-zinc-800 rounded-[3rem] w-full max-w-md overflow-hidden pointer-events-auto shadow-2xl relative">
              <button
                onClick={onClose}
                className="absolute top-6 right-6 bg-zinc-800 p-2 rounded-xl text-zinc-400 hover:text-white transition-all z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="p-8">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-12 h-12 bg-amber-400/10 rounded-2xl flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-white italic uppercase tracking-tight">Create Room</h2>
                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Start your journey</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Room Title */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Room Title</label>
                      <span className={cn("text-[9px] font-bold uppercase", title.length > 35 ? "text-amber-500" : "text-zinc-700")}>
                        {title.length}/40
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. My Chill Zone 🌙"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value);
                        if (error) setError(null);
                      }}
                      className="w-full bg-black border border-zinc-800 rounded-2xl py-4 px-6 text-white text-sm focus:outline-none focus:border-amber-400 transition-all placeholder:text-zinc-800"
                      maxLength={40}
                      autoFocus
                    />
                  </div>

                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-red-500/10 border border-red-500/20 py-2 px-4 rounded-xl flex items-center gap-2"
                      >
                        <div className="w-1 h-1 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">{error}</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Room Type */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Broadcast Type</label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setType('voice')}
                        className={cn(
                          "flex flex-col items-center gap-3 p-6 rounded-3xl border transition-all",
                          type === 'voice' 
                            ? "bg-amber-400/10 border-amber-400 text-amber-400 shadow-lg shadow-amber-400/10" 
                            : "bg-black border-zinc-800 text-zinc-600 hover:border-zinc-700"
                        )}
                      >
                        <Mic className="w-6 h-6" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Voice Room</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setType('video')}
                        className={cn(
                          "flex flex-col items-center gap-3 p-6 rounded-3xl border transition-all",
                          type === 'video' 
                            ? "bg-blue-400/10 border-blue-400 text-blue-400 shadow-lg shadow-blue-400/10" 
                            : "bg-black border-zinc-800 text-zinc-600 hover:border-zinc-700"
                        )}
                      >
                        <Video className="w-6 h-6" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Video Hub</span>
                      </button>
                    </div>
                  </div>

                  {/* Privacy & Fee */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Privacy</label>
                      <div className="flex bg-black border border-zinc-800 rounded-2xl p-1">
                        <button
                          type="button"
                          onClick={() => {
                            setPrivacy('public');
                            if (error) setError(null);
                          }}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest",
                            privacy === 'public' ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-600 hover:text-zinc-400"
                          )}
                        >
                          <Globe className="w-3 h-3" />
                          Public
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPrivacy('private');
                            if (error) setError(null);
                          }}
                          className={cn(
                            "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest",
                            privacy === 'private' ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "text-zinc-600 hover:text-zinc-400"
                          )}
                        >
                          <Lock className="w-3 h-3" />
                          Private
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-1">Entry Fee (Coins)</label>
                      <div className="relative">
                        <Coins className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400" />
                        <input
                          type="number"
                          min="0"
                          value={entryFee}
                          onChange={(e) => setEntryFee(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-full bg-black border border-zinc-800 rounded-2xl py-3 pl-11 pr-4 text-white text-xs font-black focus:outline-none focus:border-amber-400 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Password Protection (Conditional) */}
                  <AnimatePresence>
                    {privacy === 'private' && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-2"
                      >
                        <label className="text-[10px] font-black text-purple-400 uppercase tracking-widest px-1">Room Password</label>
                        <div className="relative">
                          <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-400" />
                          <input
                            type="password"
                            placeholder="Enter access code..."
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              if (error) setError(null);
                            }}
                            className="w-full bg-black border border-purple-500/20 rounded-2xl py-4 pl-11 pr-4 text-white text-sm focus:outline-none focus:border-purple-500 transition-all placeholder:text-zinc-800"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isCreating}
                      className={cn(
                        "w-full py-5 rounded-[2rem] font-black uppercase tracking-[0.3em] text-xs transition-all flex items-center justify-center gap-2 shadow-2xl",
                        "bg-gradient-to-r from-amber-400 to-orange-600 text-white shadow-orange-600/30 hover:scale-[1.02] active:scale-[0.98]",
                        isCreating && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {isCreating ? (
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <ArrowRight className="w-4 h-4" />
                          Initialize Broadcast
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-center gap-2 pt-2">
                    <ShieldCheck className="w-3 h-3 text-zinc-600" />
                    <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">Barca-live Protection v2.4 Enabled</p>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
