import React from 'react';
import { cn } from '../lib/utils';
import { Mic, Video, Volume2, MessageSquare, Gift, ShieldAlert, User, Tv, X, Crown, Armchair, Sword, Coins, Gamepad, Menu, Settings } from 'lucide-react';
import { motion } from 'motion/react';

const SEAT_CONFIG = [
  { id: 1, type: 'normal', voiceEffect: null },
  { id: 2, type: 'vip', voiceEffect: 'deep' },
  { id: 3, type: 'vip', voiceEffect: 'helium' },
  { id: 4, type: 'vip', voiceEffect: 'robotic' },
  { id: 5, type: 'normal', voiceEffect: null },
  { id: 6, type: 'normal', voiceEffect: null },
  { id: 7, type: 'normal', voiceEffect: null },
  { id: 8, type: 'normal', voiceEffect: null },
  { id: 9, type: 'normal', voiceEffect: null },
];

export default function RoomSittingUI() {
  const getSeatDisplay = (seat: typeof SEAT_CONFIG[0]) => {
    if (seat.type === 'vip') return <Crown className="text-amber-400 w-8 h-8" />;
    return <Armchair className="w-8 h-8 opacity-70" />;
  };

  return (
    <div className="relative w-full h-screen bg-zinc-950 text-white overflow-hidden">
      {/* Room Background */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1200')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-black/45 backdrop-blur-sm" />

      {/* Top Bar */}
      <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <img src="https://i.pravatar.cc/150?img=12" alt="Host" className="w-14 h-14 rounded-full border-2 border-amber-500" />
          <div className="text-sm">
            <h3 className="font-bold">Ethio Agency</h3>
            <p className="opacity-80 text-xs">ID: 1068462</p>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="w-10 h-10 bg-white/15 rounded-full flex justify-center items-center backdrop-blur-sm"><Tv className="w-5 h-5"/></div>
          <div className="w-10 h-10 bg-white/15 rounded-full flex justify-center items-center backdrop-blur-sm"><X className="w-5 h-5"/></div>
        </div>
      </div>

      {/* Seats */}
      <div className="absolute top-28 left-0 right-0 z-5 flex flex-col items-center gap-9">
        <div className="flex justify-center flex-wrap gap-10 max-w-4xl px-4">
          {SEAT_CONFIG.map((seat) => (
            <motion.div 
              key={seat.id}
              whileHover={{ scale: 1.05 }}
              className="text-center cursor-pointer relative"
            >
              <div className={cn(
                "w-20 h-20 rounded-full border-2 flex justify-center items-center backdrop-blur-lg transition-all duration-300 relative",
                seat.type === 'vip' 
                  ? "bg-amber-500/20 border-amber-400/50 shadow-[0_0_15px_rgba(251,191,36,0.3)]"
                  : "bg-white/10 border-white/20 hover:border-white/40"
              )}>
                {getSeatDisplay(seat)}
                
                {seat.voiceEffect && (
                  <div className="absolute -top-1 -right-1 bg-purple-600 rounded-full p-1 border-2 border-zinc-950 shadow-md">
                    <Volume2 className="w-3 h-3 text-white" />
                  </div>
                )}
              </div>
              <p className={cn(
                "mt-2 text-sm font-semibold",
                seat.type === 'vip' ? "text-amber-300" : "text-zinc-100"
              )}>{seat.id}</p>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Announcement */}
      <div className="absolute bottom-32 left-4 right-4 bg-black/55 p-6 rounded-3xl z-10 backdrop-blur-lg border border-white/10">
        <h3 className="text-red-500 mb-2 font-bold">Announcement</h3>
        <p className="text-sm">Welcome to the voice chat room! Please follow room rules. Be respectful and enjoy chatting together.</p>
      </div>

      {/* Bottom Bar */}
      <div className="absolute bottom-4 left-4 right-4 z-10 flex justify-between items-center">
        <button className="bg-red-800 text-white px-6 py-4 rounded-full text-lg font-bold">Say Hello</button>
        <div className="flex gap-4">
          <div className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-sm flex justify-center items-center"><Gamepad /></div>
          <div className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-sm flex justify-center items-center"><Gift /></div>
          <div className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-sm flex justify-center items-center"><MessageSquare /></div>
          <div className="w-14 h-14 rounded-full bg-white/15 backdrop-blur-sm flex justify-center items-center"><Menu /></div>
        </div>
      </div>
    </div>
  );
}
