import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Wifi, Signal, Cpu, Server, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

export default function NetworkQualityDashboard() {
  const [latency, setLatency] = useState<any[]>([]);
  const [activeNode, setActiveNode] = useState('Addis_Ababa_Core_1');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    // Populate mock historic latency data
    const list = Array.from({ length: 12 }, (_, i) => ({
      time: `${i * 5}m ago`,
      latency: Math.floor(Math.random() * 45) + 30,
      packetLoss: Math.random() < 0.1 ? (Math.random() * 0.4).toFixed(2) : 0
    }));
    setLatency(list);
  }, []);

  const triggerRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setLatency(prev => {
        return prev.map(item => ({
          ...item,
          latency: Math.floor(Math.random() * 45) + 30,
          packetLoss: Math.random() < 0.08 ? (Math.random() * 0.3).toFixed(2) : 0
        }));
      });
      setIsRefreshing(false);
    }, 1000);
  };

  const nodes = [
    { id: 'Addis_Ababa_Core_1', name: 'Ethiopia Core (Addis Ababa)', ping: '34ms', status: 'optimal', load: '42%' },
    { id: 'Nairobi_Hub_East', name: 'Kenya Edge (Nairobi)', ping: '48ms', status: 'optimal', load: '28%' },
    { id: 'Frankfurt_Proxy', name: 'Europe Transit (Frankfurt)', ping: '112ms', status: 'normal', load: '67%' },
    { id: 'Dubai_Edge_1', name: 'Middle East Gateway (Dubai)', ping: '78ms', status: 'optimal', load: '51%' }
  ];

  return (
    <div className="bg-zinc-900 border border-white/5 rounded-[2.5rem] p-6 text-left space-y-6">
      <div className="flex justify-between items-center sm:flex-row flex-col gap-4">
        <div>
          <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest font-sans">Barca-live Protocol</span>
          <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Network Edge Diagnostics</h3>
        </div>
        <button 
          onClick={triggerRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 bg-zinc-800 border border-white/5 hover:bg-zinc-700 text-white rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Measuring...' : 'Refresh Network Stats'}
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-black/30 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest">Global CDN Avg</p>
            <p className="text-2xl font-black text-white">41 <span className="text-xs text-zinc-500 font-normal">ms</span></p>
          </div>
          <Wifi className="w-8 h-8 text-emerald-500" />
        </div>
        <div className="bg-black/30 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest">VRT Stream Jitter</p>
            <p className="text-2xl font-black text-white">1.2 <span className="text-xs text-zinc-500 font-normal">ms</span></p>
          </div>
          <Signal className="w-8 h-8 text-amber-400" />
        </div>
        <div className="bg-black/30 border border-white/5 rounded-2xl p-4 flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest">Packet Drop</p>
            <p className="text-2xl font-black text-white">0.02 <span className="text-xs text-zinc-500 font-normal">%</span></p>
          </div>
          <Cpu className="w-8 h-8 text-emerald-400" />
        </div>
      </div>

      <div className="bg-black/40 border border-white/5 rounded-[2rem] p-6">
        <h4 className="text-xs font-black text-zinc-450 uppercase tracking-widest mb-4">Stream Latency History</h4>
        <div className="h-44 w-full">
          {latency.length > 0 && (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={latency} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorLatency" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#525252" fontSize={10} tickLine={false} />
                <YAxis stroke="#525252" fontSize={10} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                  labelStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                  itemStyle={{ color: '#f59e0b', fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="latency" stroke="#f59e0b" fillOpacity={1} fill="url(#colorLatency)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-xs font-black text-zinc-450 uppercase tracking-widest">Active RTC Servers</h4>
        <div className="grid sm:grid-cols-2 gap-4">
          {nodes.map(node => (
            <div 
              key={node.id}
              onClick={() => setActiveNode(node.id)}
              className={`p-4 rounded-[1.5rem] border cursor-pointer transition-all ${
                activeNode === node.id 
                  ? 'bg-amber-400/5 border-amber-400/30' 
                  : 'bg-black/30 border-white/5 hover:border-white/10'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <Server className={`w-4 h-4 ${activeNode === node.id ? 'text-amber-400' : 'text-zinc-500'}`} />
                  <span className="text-white text-xs font-bold">{node.name}</span>
                </div>
                <span className="text-amber-400 text-xs font-black font-mono">{node.ping}</span>
              </div>
              <div className="flex justify-between items-center text-[10px] font-mono leading-none">
                <span className="text-zinc-500 uppercase font-black">Memory Load: {node.load}</span>
                <span className="text-emerald-500 uppercase font-black flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Optimum
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
