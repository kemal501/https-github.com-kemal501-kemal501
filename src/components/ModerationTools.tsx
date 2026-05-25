import React, { useState } from 'react';
import { Shield, Hammer, AlertTriangle, UserX, EyeOff, Radio, Plus, Check, Flag } from 'lucide-react';
import { db, auth } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export default function ModerationTools() {
  const [filterEnabled, setFilterEnabled] = useState(true);
  const [activeMuteList, setActiveMuteList] = useState<string[]>([
    'Spammer_Bot_1', 'BadWord_UserXYZ'
  ]);
  const [newMuteUserName, setNewMuteUserName] = useState('');
  const [reportingUser, setReportingUser] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');

  const users = ['Zekarias_Abebe', 'Bethel_S', 'Alem_Ethio', 'Guest_1', 'TrollGamer99'];

  const handleAddMute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMuteUserName.trim()) return;
    setActiveMuteList(prev => [...prev, newMuteUserName.trim()]);
    setNewMuteUserName('');
  };

  const submitReport = async () => {
    if (!reportingUser || !reportReason) return;
    try {
      await addDoc(collection(db, 'reports'), {
        reporterId: auth.currentUser?.uid || 'anonymous',
        reporterName: auth.currentUser?.displayName || 'Unknown',
        targetId: reportingUser,
        reason: reportReason,
        timestamp: Date.now()
      });
      setReportingUser(null);
      setReportReason('');
      alert('Report submitted!');
    } catch (e) {
      console.error(e);
      alert('Error submitting report.');
    }
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
      
      {/* Reporting Modal */}
      {reportingUser && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
          <div onClick={() => setReportingUser(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
          <div className="bg-zinc-900 border border-white/10 p-6 rounded-[2rem] w-full max-w-sm relative z-10">
            <h3 className="text-white font-black uppercase text-sm mb-4">Report @{reportingUser}</h3>
            <select 
              value={reportReason} 
              onChange={(e) => setReportReason(e.target.value)}
              className="w-full bg-black/40 border border-white/10 p-3 rounded-xl text-xs text-white mb-4"
            >
              <option value="">Select reason</option>
              <option value="Inappropriate behavior">Inappropriate behavior</option>
              <option value="Spam">Spam</option>
              <option value="Harassment">Harassment</option>
            </select>
            <div className="flex gap-2">
              <button onClick={() => setReportingUser(null)} className="flex-1 bg-zinc-800 text-white py-2 rounded-xl text-xs font-bold">Cancel</button>
              <button onClick={submitReport} className="flex-1 bg-red-600 text-white py-2 rounded-xl text-xs font-bold">Submit</button>
            </div>
          </div>
        </div>
      )}

      {/* User list with report buttons */}
      <div className="space-y-2">
        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest px-1">Room Participants</label>
        {users.map(u => (
          <div key={u} className="flex items-center justify-between bg-black/40 p-2 rounded-xl">
            <span className="text-xs font-bold text-zinc-300">@{u}</span>
            <button onClick={() => setReportingUser(u)} className="p-2 text-red-400 hover:text-red-300 border-0 bg-transparent cursor-pointer">
              <Flag className="w-4 h-4" />
            </button>
          </div>
        ))}
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
