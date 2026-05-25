import React, { useState } from 'react';
import { Shield, Hammer, AlertTriangle, UserX, EyeOff, Radio, Plus, Check } from 'lucide-react';

export default function ModerationTools() {
  const [filterEnabled, setFilterEnabled] = useState(true);
  const [activeMuteList, setActiveMuteList] = useState<string[]>([
    'Spammer_Bot_1', 'BadWord_UserXYZ'
  ]);
  const [newMuteUserName, setNewMuteUserName] = useState('');

  const handleAddMute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMuteUserName.trim()) return;
    setActiveMuteList(prev => [...prev, newMuteUserName.trim()]);
    setNewMuteUserName('');
  };

  return (
    <div className="bg-zinc-900 border border-white/5 rounded-[2.5rem] p-6 text-left space-y-6">
      <div className="flex gap-3 items-center">
        <div className="w-10 h-10 bg-red-500/10 rounded-2xl border border-red-500/20 flex items-center justify-center text-red-400">
          <Shield className="w-5 h-5" />
        </div>
        <div>
          <span className="text-zinc-500 text-[9px] font-black uppercase tracking-widest font-sans">Active channel enforcement</span>
          <h3 className="text-lg font-black text-white italic uppercase tracking-tighter">Moderator Arsenal</h3>
        </div>
      </div>

      <div className="space-y-4">
        {/* Anti-toxicity chat filter */}
        <div className="bg-black/40 border border-white/5 p-4 rounded-2xl flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-white uppercase tracking-wider flex items-center gap-1.5/5">
              <EyeOff className="w-3.5 h-3.5 text-red-500" />
              Automated Chat Censorship
            </span>
            <p className="text-zinc-650 text-[8px] font-bold uppercase tracking-widest leading-none">Auto-mute profanity & link leaks</p>
          </div>
          <button 
            type="button"
            onClick={() => setFilterEnabled(!filterEnabled)}
            className="w-10 h-6 bg-zinc-805 rounded-full relative p-1 cursor-pointer border-0"
          >
            <div className={`w-4 h-4 rounded-full transition-all shadow-md ${filterEnabled ? 'bg-red-500 ml-4' : 'bg-zinc-600'}`} />
          </button>
        </div>

        {/* Live dynamic mute list */}
        <div className="space-y-2">
          <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest px-1">Active Channel Muted Entities ({activeMuteList.length})</label>
          <div className="flex flex-wrap gap-2">
            {activeMuteList.map(name => (
              <span key={name} className="bg-black/60 border border-white/5 text-zinc-350 text-[10px] px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5">
                <UserX className="w-3.5 h-3.5 text-zinc-500" />
                {name}
                <button 
                  onClick={() => setActiveMuteList(prev => prev.filter(n => n !== name))}
                  className="text-white hover:text-red-400 bg-transparent border-0 cursor-pointer text-[10px] font-black font-sans ml-1"
                >
                  ×
                </button>
              </span>
            ))}
          </div>

          <form onSubmit={handleAddMute} className="flex gap-2 pt-2">
            <input 
              type="text"
              value={newMuteUserName}
              onChange={(e) => setNewMuteUserName(e.target.value)}
              placeholder="e.g. TrollGamer99"
              className="bg-black border border-white/5 rounded-xl px-4 py-2.5 text-xs font-bold text-white outline-none focus:border-red-500/50 flex-1"
            />
            <button 
              type="submit"
              className="bg-red-650 hover:bg-red-700 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer border-0"
            >
              Mute
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
