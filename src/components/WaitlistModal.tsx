import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Mic, Users, CheckCircle, Clock, Sparkles } from 'lucide-react';

interface WaitlistModalProps {
  room: {
    id: string;
    title: string;
    host: string;
  };
  onClose: () => void;
}

export default function WaitlistModal({ room, onClose }: WaitlistModalProps) {
  const [hasJoined, setHasJoined] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRequestMic = () => {
    setLoading(true);
    setTimeout(() => {
      setHasJoined(true);
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-black/85 backdrop-blur-md"
      />

      <div className="relative w-full max-w-sm bg-zinc-950 border border-white/5 rounded-[3rem] p-6 shadow-2xl text-center overflow-hidden z-10">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500" />

        <div className="flex justify-end">
          <button 
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors cursor-pointer border-0 bg-transparent"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-4">
          <div className="w-16 h-16 bg-amber-400/10 border border-amber-400/20 rounded-full flex items-center justify-center text-amber-400 mx-auto">
            <Mic className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h3 className="text-white font-black uppercase text-base tracking-tight leading-normal">Request Speaking Slot</h3>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest px-4">{room.title}</p>
          </div>

          {hasJoined ? (
            <div className="space-y-4 pt-4">
              <div className="bg-amber-400/10 border border-amber-400/20 rounded-2xl p-4 text-left space-y-2">
                <div className="flex items-center gap-2 text-amber-400">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest font-sans">Queue Registered</span>
                </div>
                <p className="text-white text-xs font-bold font-mono">Position in Line: #3</p>
                <p className="text-zinc-550 text-[9px] font-bold uppercase tracking-wide leading-relaxed">
                  The host <span className="text-white">@{room.host}</span> has been pinged. You will join the speech podium as soon as they authorize.
                </p>
              </div>
              <button 
                onClick={onClose}
                className="w-full bg-zinc-850 hover:bg-zinc-800 text-white py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-pointer border-0"
              >
                Got It
              </button>
            </div>
          ) : (
            <div className="space-y-4 pt-4">
              <p className="text-zinc-505 text-[10px] font-black uppercase tracking-wide leading-relaxed max-w-[280px] mx-auto">
                Request a microphone connection to become an active speaker on stage. Live voice streams use Opus low latency codec.
              </p>

              <div className="flex items-center gap-2 justify-center py-2 text-zinc-600 font-mono text-[9px] uppercase font-bold">
                <Users className="w-3.5 h-3.5" /> 5 requestors in queue
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={onClose}
                  className="bg-black/40 hover:bg-zinc-900 border border-white/5 text-zinc-400 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleRequestMic}
                  disabled={loading}
                  className="bg-amber-400 hover:bg-amber-300 text-black py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-pointer shadow-lg shadow-amber-400/10 border-0 flex items-center justify-center gap-1"
                >
                  {loading ? 'Submitting...' : 'Queue Up'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
