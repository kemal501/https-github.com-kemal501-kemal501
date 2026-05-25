import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Briefcase, Users, Star, Trophy, ArrowUpRight, TrendingUp, Sparkles, Plus, Check } from 'lucide-react';

export default function AgentDashboard() {
  const [agencyLevel, setAgencyLevel] = useState('Platinum Premium');
  const [hostsCount, setHostsCount] = useState(14);
  const [commissionRate, setCommissionRate] = useState(12.5); // %
  const [recruitsList, setRecruitsList] = useState([
    { id: 'r1', name: 'Zekarias_Abebe', country: 'Ethiopia', status: 'online', hoursThisWeek: 18.5, revenue: '$2,450' },
    { id: 'r2', name: 'Bethel_S', country: 'Kenya', status: 'online', hoursThisWeek: 21.2, revenue: '$3,800' },
    { id: 'r3', name: 'Ziyad_K', country: 'Ethiopia', status: 'offline', hoursThisWeek: 9.0, revenue: '$950' },
    { id: 'r4', name: 'Meron_Lounge', country: 'Germany', status: 'online', hoursThisWeek: 31.0, revenue: '$5,100' }
  ]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newHostName, setNewHostName] = useState('');
  const [newHostCountry, setNewHostCountry] = useState('Ethiopia');

  const handleAddHost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHostName.trim()) return;
    const newHost = {
      id: 'r' + (recruitsList.length + 1),
      name: newHostName.trim(),
      country: newHostCountry,
      status: 'offline',
      hoursThisWeek: 0,
      revenue: '$0'
    };
    setRecruitsList(prev => [...prev, newHost]);
    setHostsCount(prev => prev + 1);
    setNewHostName('');
    setShowAddModal(false);
  };

  return (
    <div className="bg-zinc-950 rounded-[3rem] border border-white/5 p-6 md:p-8 space-y-8 text-left max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-zinc-550 text-[10px] font-black uppercase tracking-[0.2em] font-mono">Recruitment Network</span>
          <h2 className="text-2xl font-black text-white italic uppercase tracking-tight">Barca Host Agency</h2>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-amber-400 hover:bg-amber-300 text-black px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-amber-400/10 cursor-pointer border-0"
        >
          <Plus className="w-4 h-4" /> Contract New Host
        </button>
      </div>

      {/* Grid statistics cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900/50 border border-white/5 p-5 rounded-[2rem] space-y-1 relative overflow-hidden">
          <div className="flex justify-between items-center text-zinc-550">
            <span className="text-[9px] font-black uppercase tracking-widest">Agency Rank</span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-lg font-black text-white uppercase italic">{agencyLevel}</p>
          <p className="text-zinc-650 text-[8px] font-bold uppercase tracking-widest leading-none">Global Tier Level</p>
        </div>

        <div className="bg-zinc-900/50 border border-white/5 p-5 rounded-[2rem] space-y-1 relative overflow-hidden">
          <div className="flex justify-between items-center text-zinc-550">
            <span className="text-[9px] font-black uppercase tracking-widest">Contracted Hosts</span>
            <Users className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-black text-white">{hostsCount}</p>
          <p className="text-zinc-650 text-[8px] font-bold uppercase tracking-widest leading-none">Active Broadcasters</p>
        </div>

        <div className="bg-zinc-900/50 border border-white/5 p-5 rounded-[2rem] space-y-1 relative overflow-hidden">
          <div className="flex justify-between items-center text-zinc-550">
            <span className="text-[9px] font-black uppercase tracking-widest">Commission Scale</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-black text-emerald-400 font-mono">{commissionRate}%</p>
          <p className="text-zinc-650 text-[8px] font-bold uppercase tracking-widest leading-none">Recruitment Split Cut</p>
        </div>

        <div className="bg-zinc-900/50 border border-white/5 p-5 rounded-[2rem] space-y-1 relative overflow-hidden">
          <div className="flex justify-between items-center text-zinc-550">
            <span className="text-[9px] font-black uppercase tracking-widest">Weekly Revenue Pool</span>
            <Star className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-black text-white font-mono">$12,300</p>
          <p className="text-zinc-650 text-[8px] font-bold uppercase tracking-widest leading-none">Consolidated Gross</p>
        </div>
      </div>

      {/* Recruits list */}
      <div className="space-y-4">
        <h3 className="text-xs font-black text-zinc-450 uppercase tracking-widest">Managed Host Entities</h3>
        
        <div className="bg-zinc-900/30 border border-white/5 rounded-[2.5rem] overflow-hidden divide-y divide-white/5">
          {recruitsList.map(rec => (
            <div key={rec.id} className="p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 group">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full border border-white/5 bg-zinc-805 flex items-center justify-center font-black text-zinc-400 text-sm relative">
                  {rec.name.substring(0, 2).toUpperCase()}
                  <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-zinc-950 ${
                    rec.status === 'online' ? 'bg-emerald-500' : 'bg-zinc-650'
                  }`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-zinc-200">{rec.name}</p>
                    <span className="bg-white/5 text-zinc-450 px-2 py-0.5 rounded-md text-[8px] font-bold uppercase">{rec.country}</span>
                  </div>
                  <p className="text-zinc-505 text-[9px] font-black uppercase tracking-widest">Broadcasting Status: {rec.status}</p>
                </div>
              </div>

              <div className="flex gap-8 items-center justify-between sm:justify-end">
                <div className="text-left sm:text-right">
                  <p className="text-zinc-500 text-[8px] font-black uppercase tracking-widest">Stream Time (Week)</p>
                  <p className="text-xs font-black text-white font-mono">{rec.hoursThisWeek} hrs</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-zinc-500 text-[8px] font-black uppercase tracking-widest">Gross Revenue</p>
                  <p className="text-xs font-black text-amber-400 font-mono">{rec.revenue}</p>
                </div>
                <button className="bg-zinc-900 hover:bg-zinc-850 p-2 text-zinc-500 hover:text-white rounded-xl border border-white/5 cursor-pointer">
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom recruiter invite modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div onClick={() => setShowAddModal(false)} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
          <div className="relative w-full max-w-sm bg-zinc-950 border border-white/5 rounded-[3rem] p-6 shadow-2xl space-y-5 text-left z-10">
            <h3 className="text-base font-black text-white uppercase italic tracking-tight">Contract Host Recruit</h3>
            
            <form onSubmit={handleAddHost} className="space-y-4">
              <div className="space-y-1.5 home">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Host Display Name</label>
                <input 
                  type="text"
                  value={newHostName}
                  onChange={(e) => setNewHostName(e.target.value)}
                  placeholder="e.g. Martha_Lounge"
                  className="w-full bg-black border border-white/5 rounded-xl p-3.5 text-xs text-white uppercase font-black outline-none focus:border-amber-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Regional Jurisdiction</label>
                <select 
                  value={newHostCountry}
                  onChange={(e) => setNewHostCountry(e.target.value)}
                  className="w-full bg-black border border-white/5 rounded-xl p-3.5 text-xs text-white font-bold outline-none"
                >
                  <option value="Ethiopia">Ethiopia</option>
                  <option value="Kenya">Kenya</option>
                  <option value="Germany">Germany</option>
                  <option value="UAE">United Arab Emirates</option>
                </select>
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="bg-zinc-900 text-zinc-400 px-4 py-3 rounded-xl text-[10px] font-black uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-amber-400 text-black px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer border-0"
                >
                  Register Contract
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
