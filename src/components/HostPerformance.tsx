import React from 'react';
import { ArrowUpRight } from 'lucide-react';

interface Recruit {
  id: string;
  name: string;
  country: string;
  status: string;
  hoursThisWeek: number;
  revenue: string;
  revenueTrend?: number[];
}

interface HostPerformanceProps {
  recruits: Recruit[];
}

import { LineChart, Line, ResponsiveContainer } from 'recharts';

export default function HostPerformance({ recruits }: HostPerformanceProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-black text-zinc-450 uppercase tracking-widest">Managed Host Entities</h3>
      
      <div className="bg-zinc-900/30 border border-white/5 rounded-[2.5rem] overflow-hidden divide-y divide-white/5">
        {recruits.map(rec => (
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
              {rec.revenueTrend && (
                <div className="w-20 h-8">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={rec.revenueTrend.map((v, i) => ({ value: v }))}>
                      <Line type="monotone" dataKey="value" stroke="#fbbf24" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
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
  );
}
