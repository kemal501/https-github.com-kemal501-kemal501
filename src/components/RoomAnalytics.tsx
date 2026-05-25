import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { ArrowUpRight, BarChart3, Users, Volume2, ShieldCheck, Zap } from 'lucide-react';

export default function RoomAnalytics({ roomTitle }: { roomTitle: string }) {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    // Generate beautiful real-time data ticks for viewer peaks
    const generated = Array.from({ length: 15 }, (_, i) => ({
      tick: `${i * 4}s`,
      viewers: 120 + Math.floor(Math.sin(i * 0.5) * 40) + Math.floor(Math.random() * 20),
      bitrate: (4.5 + Math.sin(i * 0.8) * 0.3 + Math.random() * 0.1).toFixed(2)
    }));
    setData(generated);
  }, [roomTitle]);

  return (
    <div className="bg-zinc-950 rounded-[2.2rem] p-6 space-y-6 text-left">
      <div className="flex md:flex-row flex-col justify-between items-start md:items-center gap-4 border-b border-white/5 pb-4">
        <div>
          <span className="text-zinc-550 text-[9px] font-black uppercase tracking-widest font-mono">Dynamic Channel Diagnostics</span>
          <h3 className="text-lg font-black text-white italic uppercase tracking-tight">{roomTitle}</h3>
        </div>
        <div className="flex bg-black p-1 rounded-xl border border-white/5 font-mono">
          <span className="px-3 py-1 text-[9px] font-black bg-zinc-805 text-white rounded-lg">Real-time</span>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-black/40 border border-white/5 p-4 rounded-2xl space-y-2">
          <div className="flex justify-between items-center text-zinc-500">
            <span className="text-[9px] font-black uppercase tracking-widest">Active Streamers</span>
            <Users className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-xl font-black text-white">24 / 24 <span className="text-[10px] text-zinc-500 font-bold uppercase italic tracking-tighter ml-1">On Stage</span></div>
        </div>

        <div className="bg-black/40 border border-white/5 p-4 rounded-2xl space-y-2">
          <div className="flex justify-between items-center text-zinc-500">
            <span className="text-[9px] font-black uppercase tracking-widest">Voice Audio Codec</span>
            <Volume2 className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-xl font-black text-white">Opus Fullband <span className="text-[10px] text-emerald-400 font-bold uppercase ml-1">48kHz</span></div>
        </div>

        <div className="bg-black/40 border border-white/5 p-4 rounded-2xl space-y-2">
          <div className="flex justify-between items-center text-zinc-500">
            <span className="text-[9px] font-black uppercase tracking-widest">Stream Bitrate</span>
            <Zap className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-black text-white">4.82 <span className="text-xs text-zinc-500 font-normal">Mbps</span></div>
        </div>

        <div className="bg-black/40 border border-white/5 p-4 rounded-2xl space-y-2">
          <div className="flex justify-between items-center text-zinc-500">
            <span className="text-[9px] font-black uppercase tracking-widest">TLS Protocol</span>
            <ShieldCheck className="w-3.5 h-3.5 text-green-400" />
          </div>
          <div className="text-xl font-black text-white">v1.3 <span className="text-emerald-400 text-[10px] font-black uppercase tracking-tight ml-1">Encrypted</span></div>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Live Audience Peak Vectors</h4>
        <div className="h-44 w-full bg-black/20 border border-white/5 rounded-2xl p-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="colorAudience" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="tick" stroke="#525252" fontSize={10} tickLine={false} />
              <YAxis stroke="#525252" fontSize={10} tickLine={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                labelStyle={{ color: '#fff', fontSize: '11px', fontWeight: 'bold' }}
                itemStyle={{ color: '#3b82f6', fontSize: '11px' }}
              />
              <Area type="monotone" dataKey="viewers" stroke="#3b82f6" fillOpacity={1} fill="url(#colorAudience)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
