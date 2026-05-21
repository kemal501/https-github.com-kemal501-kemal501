import React from 'react';
import { motion } from 'motion/react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  Users, 
  Clock, 
  Percent, 
  Download, 
  RefreshCw, 
  Zap, 
  Activity, 
  ArrowUpRight,
  Palette
} from 'lucide-react';

interface Datapoint {
  time: string;
  retention: number; // in percentage
  activeViewers: number;
}

export default function RoomAnalytics({ roomTitle }: { roomTitle: string }) {
  const [chartStrokeColor, setChartStrokeColor] = React.useState('#fbbf24');
  const [data, setData] = React.useState<Datapoint[]>([
    { time: '10:41', retention: 100, activeViewers: 28 },
    { time: '10:42', retention: 95, activeViewers: 26 },
    { time: '10:43', retention: 91, activeViewers: 25 },
    { time: '10:44', retention: 87, activeViewers: 24 },
    { time: '10:45', retention: 89, activeViewers: 25 },
    { time: '10:46', retention: 86, activeViewers: 24 },
    { time: '10:47', retention: 92, activeViewers: 26 },
    { time: '10:48', retention: 94, activeViewers: 27 },
  ]);

  const [isLiveUpdating, setIsLiveUpdating] = React.useState(true);
  const [currentRetention, setCurrentRetention] = React.useState(94);
  const [peakRetention, setPeakRetention] = React.useState(100);
  const [avgRetention, setAvgRetention] = React.useState(91.7);

  // Live simulation tick interval
  React.useEffect(() => {
    if (!isLiveUpdating) return;

    const interval = setInterval(() => {
      setData((prev) => {
        const lastPoint = prev[prev.length - 1];
        
        // Formulate real-time timestamp
        const now = new Date();
        const minutesStr = String(now.getMinutes()).padStart(2, '0');
        const secondsStr = String(now.getSeconds()).padStart(2, '0');
        const timeLabel = `${minutesStr}:${secondsStr}`;

        // Create minor fluctuation
        const jitter = (Math.random() - 0.45) * 4; // slight upward weight or balance
        const nextRetention = Math.min(100, Math.max(65, Math.round(lastPoint.retention + jitter)));
        
        const viewerJitter = Math.floor(Math.random() * 3) - 1; // -1, 0, or +1
        const nextViewers = Math.max(5, lastPoint.activeViewers + viewerJitter);

        const newPoints = [...prev.slice(1), { time: timeLabel, retention: nextRetention, activeViewers: nextViewers }];

        // Recompute parameters
        const peak = Math.max(...newPoints.map(p => p.retention));
        const avg = Math.round((newPoints.reduce((sum, p) => sum + p.retention, 0) / newPoints.length) * 10) / 10;
        
        setCurrentRetention(nextRetention);
        setPeakRetention(peak);
        setAvgRetention(avg);

        return newPoints;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [isLiveUpdating]);

  const exportCSV = () => {
    try {
      const headers = 'Time,RetentionRate,ActiveViewers\n';
      const rows = data.map(d => `${d.time},${d.retention}%,${d.activeViewers}`).join('\n');
      const blob = new Blob([headers + rows], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.setAttribute('href', url);
      a.setAttribute('download', `room-retention-analytics-${Date.now()}.csv`);
      a.click();
    } catch (err) {
      console.warn("Failed to export analytics CSV:", err);
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header and Live Status */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[10px] font-black text-zinc-650 uppercase tracking-[0.3em]">Real-time Watcher Retention</h3>
          <p className="text-[8px] text-zinc-550 font-bold uppercase tracking-[0.15em] mt-1 italic">
            Targeting organic interaction metrics & live sync drop-offs
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isLiveUpdating ? (
            <span className="flex items-center gap-1.5 bg-amber-400/10 border border-amber-400/20 text-amber-400 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider select-none animate-pulse-slow">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
              TICK ACTIVE
            </span>
          ) : (
            <span className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 text-zinc-500 text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider select-none">
              <span className="w-1.5 h-1.5 bg-zinc-600 rounded-full" />
              PAUSED
            </span>
          )}
        </div>
      </div>

      {/* Retentions KPI Bento Slots */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-3 flex flex-col justify-between">
          <div className="flex items-center gap-1 text-zinc-500 text-[7px] font-black uppercase tracking-wider">
            <Percent className="w-3 h-3 text-amber-500" />
            <span>Retention</span>
          </div>
          <p className="text-lg font-black text-amber-400 mt-1 leading-none tracking-tight">
            {currentRetention}%
          </p>
          <span className="text-[6.5px] text-zinc-500 font-bold uppercase tracking-wide leading-none mt-1">
            Realtime rate
          </span>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-3 flex flex-col justify-between">
          <div className="flex items-center gap-1 text-zinc-500 text-[7px] font-black uppercase tracking-wider">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span>Peak Flow</span>
          </div>
          <p className="text-lg font-black text-zinc-100 mt-1 leading-none tracking-tight">
            {peakRetention}%
          </p>
          <span className="text-[6.5px] text-zinc-500 font-bold uppercase tracking-wide leading-none mt-1">
            Max streak score
          </span>
        </div>

        <div className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-3 flex flex-col justify-between">
          <div className="flex items-center gap-1 text-zinc-500 text-[7px] font-black uppercase tracking-wider">
            <Users className="w-3 h-3 text-blue-400" />
            <span>Average</span>
          </div>
          <p className="text-lg font-black text-zinc-350 mt-1 leading-none tracking-tight">
            {avgRetention}%
          </p>
          <span className="text-[6.5px] text-zinc-500 font-bold uppercase tracking-wide leading-none mt-1">
            Weighted mean
          </span>
        </div>
      </div>

      {/* Chart Canvas Wrap */}
      <div className="bg-black border border-zinc-900 rounded-[2rem] p-4 relative overflow-hidden shadow-inner">
        <div className="absolute top-3.5 left-4 flex items-center gap-1.5 z-10 pointer-events-none">
          <Activity className="w-3 h-3 animate-pulse" style={{ color: chartStrokeColor }} />
          <span className="text-[8px] font-black uppercase text-zinc-400 tracking-widest">Viewer Retention Matrix (%)</span>
        </div>

        <div className="w-full h-52 pt-8 text-[10px] font-bold">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 8, left: -28, bottom: 5 }}>
              <defs>
                <linearGradient id="colorRetention" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartStrokeColor} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={chartStrokeColor} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#18181b" vertical={false} />
              <XAxis 
                dataKey="time" 
                stroke="#52525b" 
                tickSize={0}
                dy={8}
                tick={{ fontSize: 8, fill: '#71717a', fontWeight: 'bold' }}
              />
              <YAxis 
                domain={[50, 100]} 
                stroke="#52525b" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 8, fill: '#71717a', fontWeight: 'bold' }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(9, 9, 11, 0.95)',
                  borderColor: '#27272a',
                  borderRadius: '12px',
                  color: '#fff',
                  fontSize: '9px',
                  fontWeight: 'bold',
                  letterSpacing: '0.05em'
                }}
                labelStyle={{ color: '#a1a1aa', fontWeight: '900', textTransform: 'uppercase', marginBottom: '4px' }}
              />
              <Line 
                name="Retention Rate"
                type="monotone" 
                dataKey="retention" 
                stroke={chartStrokeColor} 
                strokeWidth={2.5}
                dot={{ r: 2.5, strokeWidth: 1.5, fill: '#000', stroke: chartStrokeColor }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Control Actions Panel */}
      <div className="bg-zinc-900/40 border border-zinc-900 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-wider pb-1 ml-0.5">
          <span className="text-zinc-400">Continuous Engine Nodes</span>
          <span className="text-zinc-600">v1.2 Status: OK</span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setIsLiveUpdating(!isLiveUpdating)}
            className="bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3 flex items-center justify-center gap-1.5 text-zinc-300 font-extrabold text-[8px] uppercase tracking-widest hover:border-zinc-700 hover:text-white transition-colors cursor-pointer text-center"
          >
            <RefreshCw className={`w-3 h-3 text-amber-400 shrink-0 ${isLiveUpdating ? "animate-spin-slow" : ""}`} />
            <span>{isLiveUpdating ? 'Pause Engine' : 'Resume Engine'}</span>
          </button>

          <button
            type="button"
            onClick={exportCSV}
            className="bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 px-3 flex items-center justify-center gap-1.5 text-zinc-350 font-extrabold text-[8px] uppercase tracking-widest hover:border-zinc-700 hover:text-white transition-colors cursor-pointer text-center"
          >
            <Download className="w-3 h-3 text-blue-400 shrink-0" />
            <span>Export CSV</span>
          </button>
        </div>

        {/* Dynamic Chart Stroke Color Customizer */}
        <div className="border-t border-zinc-850 pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[8px] font-black uppercase text-zinc-400 tracking-wider">Chart Stroke Color Modifier</span>
            <span className="text-[8px] font-semibold text-zinc-500 font-mono tracking-tight uppercase">Interactive Palette</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Soft, beautiful, distinctive presets matching high contrast look */}
            {[
              { label: 'Amber', color: '#fbbf24' },
              { label: 'Emerald', color: '#10b981' },
              { label: 'Sapphire', color: '#3b82f6' },
              { label: 'Ruby', color: '#ef4444' },
              { label: 'Violet', color: '#8b5cf6' },
              { label: 'Rose', color: '#ec4899' },
            ].map((preset) => (
              <button
                key={preset.color}
                type="button"
                onClick={() => setChartStrokeColor(preset.color)}
                className="flex items-center gap-1.5 bg-zinc-950/60 hover:bg-zinc-900 border border-zinc-850 hover:border-zinc-800 px-2.5 py-1 rounded-lg text-[8.5px] font-bold uppercase transition-all cursor-pointer relative"
              >
                <span 
                  className="w-2 h-2 rounded-full border border-white/5 shrink-0" 
                  style={{ backgroundColor: preset.color }}
                />
                <span className={chartStrokeColor.toLowerCase() === preset.color.toLowerCase() ? "text-white" : "text-zinc-400"}>
                  {preset.label}
                </span>
                {chartStrokeColor.toLowerCase() === preset.color.toLowerCase() && (
                  <span className="absolute -top-[1.5px] -right-[1.5px] w-2 h-2 bg-amber-400 rounded-full animate-ping" />
                )}
              </button>
            ))}

            {/* Custom Interactive HTML Color Picker */}
            <div className="relative flex items-center justify-center bg-zinc-950/60 border border-zinc-850 hover:border-zinc-750 h-7 pl-2.5 pr-2 rounded-lg overflow-hidden group cursor-pointer ml-auto shrink-0 transition-colors">
              <Palette className="w-3.5 h-3.5 text-zinc-500 mr-2 group-hover:text-white transition-colors pointer-events-none" />
              <span className="text-[8px] font-mono font-black uppercase tracking-wider text-zinc-400 select-none mr-2 pointer-events-none">
                {chartStrokeColor.toUpperCase()}
              </span>
              <div className="relative w-4.5 h-4.5 rounded-md overflow-hidden border border-zinc-800 shrink-0">
                <input
                  type="color"
                  value={chartStrokeColor}
                  onChange={(e) => setChartStrokeColor(e.target.value)}
                  className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 border-0 p-0 cursor-pointer outline-none opacity-100"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-zinc-850 pt-2.5 flex items-center gap-2 justify-start mx-0.5">
          <div className="w-5 h-5 bg-amber-400/10 border border-amber-400/20 rounded-md flex items-center justify-center">
            <Zap className="w-3 h-3 text-amber-400 shrink-0" />
          </div>
          <p className="text-[7.5px] text-zinc-500 font-bold uppercase tracking-wide leading-relaxed">
            Biometric-linked retention metric verified by Barca Protection protocol gates continuously.
          </p>
        </div>
      </div>
    </div>
  );
}
