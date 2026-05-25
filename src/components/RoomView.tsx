import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mic, MicOff, Camera, VideoOff, Users, Heart, Share2, Send, HelpCircle, Gift } from 'lucide-react';
import { db, auth } from './firebase';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import Gifts from './Gifts';

interface RoomViewProps {
  room: {
    id: string;
    title: string;
    host: string;
    category?: string;
    viewers?: string;
  };
  isHost: boolean;
  onLeave: () => void;
}

export default function RoomView({ room, isHost, onLeave }: RoomViewProps) {
  const [micActive, setMicActive] = useState(true);
  const [videoActive, setVideoActive] = useState(false);
  const [messages, setMessages] = useState<{ id: string, sender: string, text: string }[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [likesCount, setLikesCount] = useState(0);
  const [showGifting, setShowGifting] = useState(false);
  const [floatingGifts, setFloatingGifts] = useState<{ id: string, icon: string }[]>([]);
  const [showListeners, setShowListeners] = useState(false);
  const [showCopiedToast, setShowCopiedToast] = useState(false);

  const [ping, setPing] = useState(48);
  const [connectionQuality, setConnectionQuality] = useState<'Good' | 'Fair' | 'Poor' | 'Critical'>('Good');

  useEffect(() => {
    const timer = setInterval(() => {
      const basePing = Math.floor(Math.random() * 55) + 32;
      const spike = Math.random() > 0.88 ? Math.floor(Math.random() * 190) + 110 : 0;
      const currentPing = basePing + spike;
      setPing(currentPing);
      if (currentPing < 80) setConnectionQuality('Good');
      else if (currentPing < 140) setConnectionQuality('Fair');
      else if (currentPing < 210) setConnectionQuality('Poor');
      else setConnectionQuality('Critical');
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setShowCopiedToast(true);
    setTimeout(() => setShowCopiedToast(false), 2000);
  };

  const handleTriggerFloatingGift = (icon: string) => {
    const id = Math.random().toString();
    setFloatingGifts(prev => [...prev, { id, icon }]);
    setTimeout(() => {
      setFloatingGifts(prev => prev.filter(g => g.id !== id));
    }, 2200);
  };
  
  // Custom stage seat speakers
  const [speakers, setSpeakers] = useState<string[]>([
    room.host, 'Zekarias_Abebe', 'Bethel_S', 'Alem_Ethio'
  ]);

  const msgScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Generate some starter chat activity messages
    setMessages([
      { id: '1', sender: 'System_Bot_Live', text: 'Welcome to the Live Social Room! Ensure respectful interactions.' },
      { id: '2', sender: 'Zekarias_Abebe', text: 'Stellar stream quality today! High-Fidelity Opus voice sounds great.' },
      { id: '3', sender: 'Bethel_S', text: 'Sending roses to the host 🌹' }
    ]);
  }, [room.id]);

  useEffect(() => {
    if (msgScrollRef.current) {
      msgScrollRef.current.scrollTop = msgScrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    const currentUserName = auth.currentUser?.displayName || auth.currentUser?.email || 'Guest';
    setMessages(prev => [...prev, {
      id: Math.random().toString(),
      sender: currentUserName,
      text: newMsg.trim()
    }]);
    setNewMsg('');
  };

  const handleLike = () => {
    setLikesCount(prev => prev + 1);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 50 }} 
      animate={{ opacity: 1, y: 0 }} 
      exit={{ opacity: 0, y: 50 }}
      className="fixed inset-0 z-[120] bg-zinc-950 flex flex-col justify-between overflow-hidden"
    >
      {/* Background Ambience Glows */}
      <div className="absolute top-10 left-12 w-64 h-64 rounded-full bg-blue-600/15 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-10 right-12 w-64 h-64 rounded-full bg-amber-400/10 blur-[100px] pointer-events-none" />

      {/* Share Toast */}
      {showCopiedToast && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-20 z-[300] left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-2 rounded-full text-xs font-black"
        >
          Link Copied!
        </motion.div>
      )}

      {/* Header Panel */}
      <div className="bg-black/40 backdrop-blur-md border-b border-white/5 px-6 py-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-400/10 rounded-2xl border border-amber-400/20 flex items-center justify-center font-black text-amber-500 font-mono text-xl">
            {room.title ? room.title.substring(0, 1).toUpperCase() : 'B'}
          </div>
          <div>
            <h3 className="text-white font-black text-sm uppercase tracking-tight truncate max-w-[180px]">{room.title}</h3>
            <p className="text-zinc-550 text-[9px] font-black uppercase tracking-widest">Host: @{room.host} • Live</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Connection quality warning & ping reading badge */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] font-mono font-black tracking-tight ${
            connectionQuality === 'Good'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : connectionQuality === 'Fair'
                ? 'bg-yellow-500/12 border-yellow-550/20 text-yellow-500'
                : connectionQuality === 'Poor'
                  ? 'bg-orange-500/12 border-orange-550/20 text-orange-400'
                  : 'bg-red-500/15 border-red-500/35 text-red-400 animate-pulse'
          }`}>
            <span className="text-[11px] leading-none">
              {connectionQuality === 'Good' || connectionQuality === 'Fair' ? '📶' : '⚠️'}
            </span>
            <span>{ping} MS</span>
          </div>

          <div className="flex items-center gap-1.5 bg-black/50 border border-white/5 px-3 py-1.5 rounded-full font-mono text-zinc-400 text-[10px] font-bold">
            <Users className="w-3.5 h-3.5 text-amber-400 cursor-pointer hover:text-amber-300" onClick={() => setShowListeners(true)} />
            <span className="cursor-pointer" onClick={() => setShowListeners(true)}>{room.viewers || '420'}</span>
          </div>

          <button 
            onClick={handleShare}
            className="text-zinc-400 hover:text-white p-2 border-0 bg-transparent cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
          </button>

          <button 
            onClick={onLeave}
            className="bg-red-650 hover:bg-red-700 text-white rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer border-0"
          >
            Leave
          </button>
        </div>
      </div>


      {/* Main Grid View */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-6 grid lg:grid-cols-12 gap-6 z-10">
        {/* Stage seats section */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          <div className="bg-black/30 border border-white/5 rounded-[2.5rem] p-6 space-y-6 flex-1 flex flex-col justify-center">
            <h4 className="text-center text-[10px] font-black text-zinc-650 uppercase tracking-[0.2em] mb-4">Mic Stage Seats</h4>
            
            <div className="grid grid-cols-4 gap-4 justify-items-center">
              {Array.from({ length: 8 }).map((_, i) => {
                const speakerName = speakers[i];
                const activeSpeaking = micActive && i === 0; // Simulate host talking
                return (
                  <div key={i} className="flex flex-col items-center space-y-2 select-none">
                    <div className={`w-14 h-14 rounded-full border flex items-center justify-center font-black relative transition-all ${
                      speakerName 
                        ? 'bg-zinc-900 text-zinc-300' 
                        : 'bg-black/40 border-dashed border-white/10 text-zinc-650 hover:border-white/20'
                    } ${activeSpeaking ? 'ring-4 ring-amber-400 ring-offset-4 ring-offset-zinc-950 scale-[1.05]' : 'border-white/5'}`}>
                      {speakerName ? speakerName.substring(0, 2).toUpperCase() : '+'}
                      
                      {speakerName && (
                        <div className="absolute -bottom-1 -right-1 bg-black rounded-full p-1 border border-white/5">
                          {activeSpeaking ? (
                            <Mic className="w-3 h-3 text-amber-400" />
                          ) : (
                            <MicOff className="w-3 h-3 text-zinc-650" />
                          )}
                        </div>
                      )}
                    </div>
                    <span className="text-[8px] font-black text-zinc-400 max-w-[60px] truncate uppercase font-sans">
                      {speakerName ? speakerName : 'Empty Seat'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick controls bar */}
          <div className="bg-black/35 border border-white/5 rounded-2xl p-4 flex gap-4 justify-center items-center">
            <button 
              onClick={() => setMicActive(!micActive)}
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors cursor-pointer border-0 ${
                micActive ? 'bg-amber-400 text-black' : 'bg-zinc-805 text-zinc-400'
              }`}
            >
              {micActive ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
            </button>

            <button 
              onClick={() => setVideoActive(!videoActive)}
              className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors cursor-pointer border-0 ${
                videoActive ? 'bg-amber-400 text-black' : 'bg-zinc-850 text-zinc-400'
              }`}
            >
              {videoActive ? <Camera className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
            </button>

            <button 
              onClick={handleLike}
              className="w-12 h-12 rounded-xl bg-zinc-850 text-zinc-300 hover:text-red-500 flex items-center justify-center transition-colors cursor-pointer border-0"
            >
              <Heart className={`w-5 h-5 ${likesCount > 0 ? 'fill-red-500 text-red-500 animate-pulse' : ''}`} />
            </button>

            <button 
              onClick={() => setShowGifting(true)}
              className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-400 to-orange-500 text-black flex items-center justify-center pointer cursor-pointer border-0 font-bold hover:scale-105 transition-transform"
            >
              <Gift className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messaging Chat Column */}
        <div className="lg:col-span-5 flex flex-col justify-between bg-black/40 border border-white/5 rounded-[2.5rem] overflow-hidden min-h-[350px]">
          {/* Messages scrollarea */}
          <div ref={msgScrollRef} className="flex-1 p-5 overflow-y-auto space-y-3 max-h-[300px] no-scrollbar">
            {messages.map(msg => (
              <div key={msg.id} className="text-xs space-y-0.5">
                <span className="text-amber-450 font-black uppercase text-[9px] tracking-wide block hover:underline cursor-pointer">
                  @{msg.sender}
                </span>
                <p className="text-zinc-300 font-sans leading-relaxed text-left bg-zinc-900/30 p-2.5 rounded-2xl border border-white/5 inline-block max-w-full">
                  {msg.text}
                </p>
              </div>
            ))}
          </div>

          {/* Form write comments */}
          <form onSubmit={handleSendMessage} className="p-4 bg-black/40 border-t border-white/5 flex gap-2">
            <input 
              type="text"
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              placeholder="Send message inside room..."
              className="bg-black/60 border border-white/5 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none flex-1 focus:border-amber-400 transition-colors"
            />
            <button 
              type="submit"
              className="bg-zinc-805 hover:bg-zinc-750 text-white p-3.5 rounded-xl transition-all cursor-pointer border-0 active:scale-95"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Active Listeners Modal */}
      <AnimatePresence>
        {showListeners && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div onClick={() => setShowListeners(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-zinc-900 border border-white/10 p-6 rounded-[2rem] w-full max-w-sm relative z-10"
            >
              <h3 className="text-white font-black uppercase text-sm mb-4">Active Listeners</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {[...speakers, 'Guest_1', 'Guest_2', 'Ethio_Fan'].map((user, i) => (
                  <div key={i} className="flex items-center justify-between bg-black/40 p-3 rounded-xl border border-white/5">
                    <span className="text-zinc-300 font-bold text-xs">@{user}</span>
                    <button className="text-[9px] bg-red-950/50 text-red-400 px-2 py-1 rounded border border-red-900/50">Mute</button>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => setShowListeners(false)}
                className="w-full mt-4 bg-zinc-800 text-white py-2 rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Gift presentation drawer overlay */}
      <AnimatePresence>
        {showGifting && (
          <div className="fixed inset-0 z-[200]">
            <div onClick={() => setShowGifting(false)} className="absolute inset-0 bg-black/70 backdrop-blur-xs" />
            <div className="absolute bottom-0 left-0 right-0 max-w-md mx-auto z-10">
              <div className="bg-zinc-950 border-t border-white/10 rounded-t-[3.5rem] p-2 relative overflow-hidden">
                <Gifts onGiftSent={handleTriggerFloatingGift} />
                <button 
                  onClick={() => setShowGifting(false)}
                  className="absolute top-6 right-6 p-2 bg-zinc-900 border border-white/5 rounded-full text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Gifts Overlay - moves chosen icons from simulated avatar/controls point to viewport center */}
      <div className="absolute inset-0 pointer-events-none z-[250] overflow-hidden">
        <AnimatePresence>
          {floatingGifts.map((gift) => (
            <motion.div
              key={gift.id}
              initial={{ 
                x: window.innerWidth > 768 ? '35%' : '15%', 
                y: '40%', 
                scale: 0.1, 
                opacity: 0,
                rotate: 0 
              }}
              animate={{ 
                x: '0%', 
                y: '0%', 
                scale: [0.1, 2.5, 4.2, 3.2], 
                opacity: [0, 1, 1, 0],
                rotate: [0, 15, -15, 360],
              }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: 2.3, 
                ease: "easeOut"
              }}
              className="absolute left-[54%] top-[50%] -translate-x-1/2 -translate-y-1/2 text-7xl filter drop-shadow-[0_12px_30px_rgba(245,158,11,0.65)] flex items-center justify-center pointer-events-none"
            >
              <div className="relative pointer-events-none flex items-center justify-center">
                <span className="text-8xl">{gift.icon}</span>
                {/* Glow ring backing */}
                <span className="absolute w-24 h-24 bg-amber-400/20 rounded-full blur-xl -z-10 animate-ping" />
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      </motion.div>
  );
}
