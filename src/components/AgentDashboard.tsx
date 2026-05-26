import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Briefcase, Users, Star, Trophy, ArrowUpRight, TrendingUp, Sparkles, Plus, Check, Send, X } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import HostPerformance from './HostPerformance';
import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const earningsData = [
  { day: 'Mon', earnings: 1200 },
  { day: 'Tue', earnings: 1900 },
  { day: 'Wed', earnings: 1500 },
  { day: 'Thu', earnings: 2100 },
  { day: 'Fri', earnings: 2500 },
  { day: 'Sat', earnings: 3200 },
  { day: 'Sun', earnings: 2900 },
];

export default function AgentDashboard() {
  const [agencyLevel, setAgencyLevel] = useState('Platinum Premium');
  const [hostsCount, setHostsCount] = useState(14);
  const [commissionRate, setCommissionRate] = useState(12.5); // %
  const [recruitsList, setRecruitsList] = useState([
    { id: 'r1', name: 'Zekarias_Abebe', country: 'Ethiopia', status: 'online', hoursThisWeek: 18.5, revenue: '$2,450', revenueTrend: [1000, 1200, 1100, 1500, 1800] },
    { id: 'r2', name: 'Bethel_S', country: 'Kenya', status: 'online', hoursThisWeek: 21.2, revenue: '$3,800', revenueTrend: [2000, 2200, 2100, 2500, 3000] },
    { id: 'r3', name: 'Ziyad_K', country: 'Ethiopia', status: 'offline', hoursThisWeek: 9.0, revenue: '$950', revenueTrend: [500, 600, 400, 700, 850] },
    { id: 'r4', name: 'Meron_Lounge', country: 'Germany', status: 'online', hoursThisWeek: 31.0, revenue: '$5,100', revenueTrend: [3000, 3200, 2800, 3500, 4000] }
  ]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isRecruitmentOpen, setIsRecruitmentOpen] = useState(false);
  const [newHostName, setNewHostName] = useState('');
  const [newHostCountry, setNewHostCountry] = useState('Ethiopia');
  const [recruitEmail, setRecruitEmail] = useState('');

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

  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recruitEmail.trim()) return;
    try {
      await addDoc(collection(db, 'recruitment_invites'), {
        email: recruitEmail,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setRecruitEmail('');
      setIsRecruitmentOpen(false);
    } catch (error) {
      console.error(error);
    }
  };

  const currentLevelGoal = 25; // Tier goal
  const progress = Math.min((hostsCount / currentLevelGoal) * 100, 100);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const cardVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <div className="bg-zinc-950 rounded-[3rem] border border-white/5 p-6 md:p-8 space-y-8 text-left max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-zinc-550 text-[10px] font-black uppercase tracking-[0.2em] font-mono">Recruitment Network</span>
          <h2 className="text-2xl font-black text-white italic uppercase tracking-tight">Barca Host Agency</h2>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setIsRecruitmentOpen(true)}
            className="bg-zinc-850 hover:bg-zinc-800 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 cursor-pointer border border-white/5"
          >
            <Send className="w-4 h-4" /> Send Invite
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="bg-amber-400 hover:bg-amber-300 text-black px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-amber-400/10 cursor-pointer border-0"
          >
            <Plus className="w-4 h-4" /> Contract New Host
          </button>
        </div>
      </div>

      {/* Chart and Progress Area */}
      <div className="grid lg:grid-cols-2 gap-6" as={motion.div} variants={containerVariants} initial="hidden" animate="visible">
        {/* Agency Tier Progress */}
        <div className="bg-zinc-900/50 p-6 rounded-[2rem] border border-white/5 space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between items-center text-zinc-500">
                <span className="text-[10px] font-black uppercase tracking-widest">Agency Advancement Progress</span>
                <span className="text-[10px] font-black font-mono">{hostsCount} / {currentLevelGoal} Hosts</span>
              </div>
              <div className="w-full bg-zinc-950 h-3 rounded-full overflow-hidden border border-white/5">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  className="h-full bg-gradient-to-r from-blue-500 to-amber-400"
                />
              </div>
            </div>
            {/* Chart */}
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={earningsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="day" stroke="#666" tick={{fill: '#666', fontSize: 10}} />
                  <YAxis stroke="#666" tick={{fill: '#666', fontSize: 10}} />
                  <Tooltip contentStyle={{backgroundColor: '#111', border: '1px solid #333'}} itemStyle={{color: '#fff'}} />
                  <Line type="monotone" dataKey="earnings" stroke="#fbbf24" strokeWidth={3} dot={{r: 4, fill: '#fbbf24'}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
        </div>

        {/* Grid statistics cards */}
        <motion.div className="grid grid-cols-2 gap-4" variants={containerVariants}>
          <motion.div variants={cardVariants} className="bg-zinc-900/50 border border-white/5 p-5 rounded-[2rem] space-y-1 relative overflow-hidden">
            <div className="flex justify-between items-center text-zinc-550">
              <span className="text-[9px] font-black uppercase tracking-widest">Agency Rank</span>
              <Trophy className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-sm font-black text-white uppercase italic">{agencyLevel}</p>
          </motion.div>
  
          <motion.div variants={cardVariants} className="bg-zinc-900/50 border border-white/5 p-5 rounded-[2rem] space-y-1 relative overflow-hidden">
            <div className="flex justify-between items-center text-zinc-550">
              <span className="text-[9px] font-black uppercase tracking-widest">Contracted Hosts</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-xl font-black text-white">{hostsCount}</p>
          </motion.div>
  
          <motion.div variants={cardVariants} className="bg-zinc-900/50 border border-white/5 p-5 rounded-[2rem] space-y-1 relative overflow-hidden">
            <div className="flex justify-between items-center text-zinc-550">
              <span className="text-[9px] font-black uppercase tracking-widest">Commission Scale</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-xl font-black text-emerald-400 font-mono">{commissionRate}%</p>
          </motion.div>
  
          <motion.div variants={cardVariants} className="bg-zinc-900/50 border border-white/5 p-5 rounded-[2rem] space-y-1 relative overflow-hidden">
            <div className="flex justify-between items-center text-zinc-550">
              <span className="text-[9px] font-black uppercase tracking-widest">Revenue Pool</span>
              <Star className="w-4 h-4 text-purple-400" />
            </div>
            <p className="text-xl font-black text-white font-mono">$12,300</p>
          </motion.div>
        </motion.div>
      </div>


      {/* Recruits list */}
      <HostPerformance recruits={recruitsList} />

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

      {/* Host recruitment drawer */}
      <AnimatePresence>
        {isRecruitmentOpen && (
          <motion.div 
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed inset-y-0 right-0 z-[200] w-full max-w-sm bg-zinc-950 border-l border-white/5 p-6 shadow-2xl space-y-5 text-left"
          >
            <div className="flex justify-between items-center">
              <h3 className="text-base font-black text-white uppercase italic tracking-tight">Send Invite</h3>
              <button onClick={() => setIsRecruitmentOpen(false)} className="text-zinc-500 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSendInvitation} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Recruit Email</label>
                <input 
                  type="email"
                  value={recruitEmail}
                  onChange={(e) => setRecruitEmail(e.target.value)}
                  placeholder="e.g. recruit@example.com"
                  className="w-full bg-black border border-white/5 rounded-xl p-3.5 text-xs text-white outline-none focus:border-amber-400"
                />
              </div>
              <button 
                type="submit"
                className="w-full bg-amber-400 text-black px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer border-0"
              >
                Send Digital Invitation
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
