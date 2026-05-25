import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Settings, Shield, Volume2, Users, Sliders, Lock, Globe, HardDrive } from 'lucide-react';

export default function RoomSettings() {
  const [isPrivate, setIsPrivate] = useState(false);
  const [maxSeats, setMaxSeats] = useState(12);
  const [audioFormat, setAudioFormat] = useState('HD_Voice');
  const [noiseSuppression, setNoiseSuppression] = useState(true);

  return (
    <div className="bg-zinc-900 border border-white/5 rounded-[2.5rem] p-6 text-left space-y-6">
      <div className="flex gap-3 items-center">
        <div className="w-10 h-10 bg-amber-400/10 rounded-2xl border border-amber-400/20 flex items-center justify-center text-amber-400">
          <Settings className="w-5 h-5 animate-spin-slow" />
        </div>
        <div>
          <span className="text-zinc-500 text-[9px] font-black uppercase tracking-widest font-sans">Active broadcast config</span>
          <h3 className="text-lg font-black text-white italic uppercase tracking-tighter">Channel Architect</h3>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Toggle Mode */}
        <div className="bg-black/40 border border-white/5 p-4 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              {isPrivate ? <Lock className="w-3.5 h-3.5 text-orange-500" /> : <Globe className="w-3.5 h-3.5 text-emerald-500" />}
              {isPrivate ? 'Private Room' : 'Public Discovery'}
            </span>
            <p className="text-zinc-650 text-[8px] font-bold uppercase tracking-widest leading-none">Limit channel access</p>
          </div>
          <button 
            type="button"
            onClick={() => setIsPrivate(!isPrivate)}
            className="w-10 h-6 bg-zinc-800 rounded-full relative p-1 cursor-pointer border-0"
          >
            <div className={`w-4 h-4 rounded-full transition-all shadow-md ${isPrivate ? 'bg-amber-400 ml-4' : 'bg-zinc-600'}`} />
          </button>
        </div>

        {/* Max Seats selection */}
        <div className="bg-black/40 border border-white/5 p-4 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-blue-400" />
              Stage Capacity
            </span>
            <p className="text-zinc-650 text-[8px] font-bold uppercase tracking-widest leading-none">{maxSeats} slots total</p>
          </div>
          <select 
            value={maxSeats} 
            onChange={(e) => setMaxSeats(parseInt(e.target.value))}
            className="bg-zinc-805 border border-white/10 text-white rounded-xl text-[10px] font-black p-2 outline-none font-sans"
          >
            <option value={4}>4 Seats</option>
            <option value={8}>8 Seats</option>
            <option value={12}>12 Seats</option>
            <option value={16}>16 Seats</option>
            <option value={24}>24 Seats</option>
          </select>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Audio profile */}
        <div className="bg-black/40 border border-white/5 p-4 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-purple-400" />
              Acoustic Profile
            </span>
            <p className="text-zinc-650 text-[8px] font-bold uppercase tracking-widest leading-none">Change mic bitrate</p>
          </div>
          <select 
            value={audioFormat} 
            onChange={(e) => setAudioFormat(e.target.value)}
            className="bg-zinc-805 border border-white/10 text-white rounded-xl text-[10px] font-black p-2 outline-none font-sans"
          >
            <option value="Standard">Standard (24kbps)</option>
            <option value="HD_Voice">HD Voice (128kbps)</option>
            <option value="Concert_Master">Concert Stereo (320kbps)</option>
          </select>
        </div>

        {/* Noise suppression toggle */}
        <div className="bg-black/40 border border-white/5 p-4 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-white uppercase tracking-wider flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-teal-400" />
              AI ANC Filter
            </span>
            <p className="text-zinc-650 text-[8px] font-bold uppercase tracking-widest leading-none">Smart background mute</p>
          </div>
          <button 
            type="button"
            onClick={() => setNoiseSuppression(!noiseSuppression)}
            className="w-10 h-6 bg-zinc-800 rounded-full relative p-1 cursor-pointer border-0"
          >
            <div className={`w-4 h-4 rounded-full transition-all shadow-md ${noiseSuppression ? 'bg-amber-400 ml-4' : 'bg-zinc-600'}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
