import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { 
  Activity, 
  Wifi, 
  AlertTriangle, 
  ShieldAlert, 
  Server, 
  RefreshCw, 
  Cpu, 
  Clock, 
  Download, 
  Upload, 
  Sparkles, 
  Bug, 
  PlusCircle, 
  Terminal, 
  Zap,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface MetricPoint {
  time: string;
  latency: number;
  packetLoss: number;
  jitter: number;
  serverSyncErrors: number;
}

interface ServerSyncError {
  id: string;
  timestamp: string;
  roomId: string;
  roomName: string;
  severity: 'high' | 'warning' | 'info' | 'resolved';
  errorMsg: string;
  module: 'webrtc-signaling' | 'firestore-state' | 'audio-codec' | 'voice-auth';
}

export default function NetworkQualityDashboard() {
  const [metrics, setMetrics] = useState<MetricPoint[]>([]);
  const [latencySurge, setLatencySurge] = useState(false);
  const [packetLossSurge, setPacketLossSurge] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [diagnosticMode, setDiagnosticMode] = useState<'normal' | 'congested' | 'recovery'>('normal');

  // Logs state
  const [logs, setLogs] = useState<ServerSyncError[]>([
    {
      id: "err-4820",
      timestamp: new Date(Date.now() - 40000).toLocaleTimeString(),
      roomId: "ethiopia-lounge-77",
      roomName: "Ethiopian Lounge Live",
      severity: "warning",
      errorMsg: "ICE connection state changed to failed, attempting WebRTC ICE restart",
      module: "webrtc-signaling"
    },
    {
      id: "err-3921",
      timestamp: new Date(Date.now() - 120000).toLocaleTimeString(),
      roomId: "addis-beats-music",
      roomName: "Addis Beats 24/7",
      severity: "high",
      errorMsg: "Audio codec bit-rate mismatch (opus vs standard). High jitter drift > 140ms",
      module: "audio-codec"
    },
    {
      id: "err-2104",
      timestamp: new Date(Date.now() - 320000).toLocaleTimeString(),
      roomId: "global-english",
      roomName: "Global English Lounge",
      severity: "info",
      errorMsg: "Firestore document version drift: auto-synchronized document with server lease ID #992ab",
      module: "firestore-state"
    },
    {
      id: "err-1049",
      timestamp: new Date(Date.now() - 640000).toLocaleTimeString(),
      roomId: "vip-room-alpha",
      roomName: "VIP Club Lounge",
      severity: "resolved",
      errorMsg: "Voice room seat authority lease expired. Host seat released.",
      module: "voice-auth"
    }
  ]);

  // Generate initial historical metrics
  useEffect(() => {
    const initialMetrics: MetricPoint[] = [];
    const now = Date.now();
    for (let i = 15; i >= 0; i--) {
      const timeOffset = now - i * 4000;
      const t = new Date(timeOffset);
      const timeStr = `${t.getHours()}:${t.getMinutes().toString().padStart(2, '0')}:${t.getSeconds().toString().padStart(2, '0')}`;
      
      initialMetrics.push({
        time: timeStr,
        latency: 18 + Math.floor(Math.random() * 12),
        packetLoss: Math.random() < 0.2 ? Number((Math.random() * 0.4).toFixed(2)) : 0,
        jitter: 2 + Math.floor(Math.random() * 5),
        serverSyncErrors: 0
      });
    }
    setMetrics(initialMetrics);
  }, []);

  // Live simulation telemetry loop
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => {
        const nextList = [...prev];
        const now = new Date();
        const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

        // Dynamic baselines based on selected diagnostics / simulation modifiers
        let baseLatency = 20;
        let baseLoss = 0.05;
        let baseJitter = 4;

        if (latencySurge) {
          baseLatency = 220 + Math.floor(Math.random() * 110);
          baseJitter = 35 + Math.floor(Math.random() * 25);
        } else if (diagnosticMode === 'congested') {
          baseLatency = 145 + Math.floor(Math.random() * 45);
          baseJitter = 18 + Math.floor(Math.random() * 12);
        } else {
          baseLatency = 16 + Math.floor(Math.random() * 14);
          baseJitter = 2 + Math.floor(Math.random() * 5);
        }

        if (packetLossSurge) {
          baseLoss = 4.5 + Number((Math.random() * 6).toFixed(2));
        } else if (diagnosticMode === 'congested') {
          baseLoss = 1.2 + Number((Math.random() * 1.5).toFixed(2));
        } else {
          baseLoss = Math.random() < 0.15 ? Number((Math.random() * 0.35).toFixed(2)) : 0.01;
        }

        const newPoint: MetricPoint = {
          time: timeStr,
          latency: Number(baseLatency.toFixed(0)),
          packetLoss: Number(baseLoss.toFixed(2)),
          jitter: Number(baseJitter.toFixed(0)),
          serverSyncErrors: latencySurge || packetLossSurge ? 1 : (Math.random() > 0.94 ? 1 : 0)
        };

        // If a simulated error occurs, add it to logs
        if (newPoint.serverSyncErrors > 0 && Math.random() > 0.4) {
          triggerRandomError();
        }

        nextList.push(newPoint);
        return nextList.length > 20 ? nextList.slice(-20) : nextList;
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [latencySurge, packetLossSurge, diagnosticMode]);

  const triggerRandomError = () => {
    const errorMessages = [
      "WebRTC RTCDataChannel sync timeout, cycling state manager",
      "Gossip Protocol warning: peer node cluster latency exceeded 300ms",
      "Dual channel cross-fade audio buffering overflow in slot #3A",
      "Seat lease security token signature verification refresh failed, auto-correcting",
      "Network packet congestion detected in Ethio Lounge: automatic multiplex compression enabled",
      "Firestore server-side lock contention resolution completed successfully"
    ];

    const modules: ('webrtc-signaling' | 'firestore-state' | 'audio-codec' | 'voice-auth')[] = [
      'webrtc-signaling',
      'firestore-state',
      'audio-codec',
      'voice-auth'
    ];

    const roomNames = [
      { id: "jazz-lounge-1", name: "Sheger Jazz Lounge" },
      { id: "starlight-vibes-20", name: "Starlight Coffee Chills" },
      { id: "ethiopia-lounge-77", name: "Ethiopian Lounge Live" },
      { id: "addis-beats-music", name: "Addis Beats 24/7" }
    ];

    const severities: ('high' | 'warning' | 'info')[] = ['high', 'warning', 'info'];

    const pickRoom = roomNames[Math.floor(Math.random() * roomNames.length)];
    const pickSeverity = severities[Math.floor(Math.random() * severities.length)];
    const pickMessage = errorMessages[Math.floor(Math.random() * errorMessages.length)];
    const pickModule = modules[Math.floor(Math.random() * modules.length)];

    const newErr: ServerSyncError = {
      id: `err-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: new Date().toLocaleTimeString(),
      roomId: pickRoom.id,
      roomName: pickRoom.name,
      severity: pickSeverity,
      errorMsg: pickMessage,
      module: pickModule
    };

    setLogs(prev => [newErr, ...prev.slice(0, 39)]);
  };

  const manualSyncCheck = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      triggerRandomError();
    }, 1000);
  };

  const currentPoint = metrics[metrics.length - 1] || { latency: 22, packetLoss: 0.05, jitter: 3 };

  // Determine overall status colors and ratings
  const getNetworkHealth = () => {
    if (latencySurge || packetLossSurge || diagnosticMode === 'congested') {
      return { status: "CRITICAL", color: "text-red-400 font-black", border: "border-red-500/20", bg: "bg-red-500/10", barColor: "#ef4444" };
    }
    if (currentPoint.latency > 50 || currentPoint.packetLoss > 0.5) {
      return { status: "WARNING", color: "text-amber-400 font-black", border: "border-amber-500/20", bg: "bg-amber-400/10", barColor: "#f59e0b" };
    }
    return { status: "EXCELLENT", color: "text-emerald-400 font-black", border: "border-emerald-500/20", bg: "bg-emerald-500/10", barColor: "#10b981" };
  };

  const health = getNetworkHealth();

  return (
    <div className="space-y-6">
      
      {/* Header telemetry Overview toolbar */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-[2rem] p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-black text-white uppercase italic tracking-tighter">Real-Time Quality Diagnostics</h2>
            </div>
            <p className="text-[10px] text-zinc-550 font-semibold uppercase tracking-widest mt-1">
              Active voice stream telemetry, roundtrip signal monitoring & packet performance
            </p>
          </div>

          {/* Simulation Toggle Pills */}
          <div className="flex flex-wrap items-center gap-2 bg-zinc-900/40 p-1.5 border border-zinc-850 rounded-2xl">
            <button
              onClick={() => {
                setLatencySurge(!latencySurge);
                setDiagnosticMode('normal');
              }}
              className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                latencySurge 
                ? 'bg-red-500 text-white shadow-[0_0_12px_rgba(239,68,68,0.2)]' 
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <AlertTriangle className="w-3" />
              Surge Latency
            </button>
            <button
              onClick={() => {
                setPacketLossSurge(!packetLossSurge);
                setDiagnosticMode('normal');
              }}
              className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                packetLossSurge 
                ? 'bg-orange-500 text-white shadow-[0_0_12px_rgba(249,115,22,0.2)]' 
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <ShieldAlert className="w-3" />
              Simulate Packet Drops
            </button>

            <button
              onClick={() => {
                const nextMode = diagnosticMode === 'normal' ? 'congested' : 'normal';
                setDiagnosticMode(nextMode);
                setLatencySurge(false);
                setPacketLossSurge(false);
              }}
              className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                diagnosticMode === 'congested'
                ? 'bg-yellow-500 text-black font-semibold' 
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
              }`}
            >
              <Server className="w-3" />
              {diagnosticMode === 'congested' ? 'Congestion: Active' : 'Apply Congest'}
            </button>
          </div>
        </div>

        {/* Live status indicators grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
          
          <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-850 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[8px] text-zinc-500 font-black uppercase tracking-wider block">Roundtrip Latency</span>
              <div className="flex items-baseline gap-1.5">
                <h3 className="text-xl font-black font-mono text-white">{currentPoint.latency}</h3>
                <span className="text-[10px] text-zinc-500 font-bold uppercase font-mono">ms</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-cyan-400/5 border border-cyan-400/10 flex items-center justify-center">
              <Wifi className={`w-5 h-5 ${currentPoint.latency > 100 ? 'text-red-400 animate-pulse' : 'text-cyan-400'}`} />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-850 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[8px] text-zinc-500 font-black uppercase tracking-wider block">Packet Loss Ratio</span>
              <div className="flex items-baseline gap-1.5">
                <h3 className="text-xl font-black font-mono text-white">{currentPoint.packetLoss}%</h3>
                <span className="text-[10px] text-zinc-500 font-bold uppercase font-mono">loss</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-orange-400/5 border border-orange-400/10 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-orange-400" />
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-850 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[8px] text-zinc-500 font-black uppercase tracking-wider block">Jitter / Variance</span>
              <div className="flex items-baseline gap-1.5">
                <h3 className="text-xl font-black font-mono text-white">{currentPoint.jitter}</h3>
                <span className="text-[10px] text-zinc-500 font-bold uppercase font-mono">ms</span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-400/5 border border-amber-400/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
          </div>

          <div className={`p-4 rounded-2xl border ${health.border} ${health.bg} flex items-center justify-between`}>
            <div className="space-y-0.5">
              <span className="text-[8px] text-zinc-500 font-black uppercase tracking-wider block">Channel Sync Health</span>
              <h3 className={`text-base font-black ${health.color}`}>{health.status}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center">
              <div className="relative flex h-2 w-2">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  health.status === 'CRITICAL' ? 'bg-red-400' : health.status === 'WARNING' ? 'bg-amber-400' : 'bg-emerald-400'
                }`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${
                  health.status === 'CRITICAL' ? 'bg-red-500' : health.status === 'WARNING' ? 'bg-amber-500' : 'bg-emerald-500'
                }`}></span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Network Graphs Panels Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Graph 1: Live Latency Trace */}
        <div className="bg-zinc-900/40 border border-zinc-850 p-6 rounded-[2rem] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-black uppercase text-xs">Voice Channel Latency Trace (RTT)</h4>
              <p className="text-[8px] text-zinc-500 font-black uppercase tracking-wider">Historical sparkline mapping (4-second interval)</p>
            </div>
            <span className="bg-cyan-500/10 hover:bg-cyan-500/15 text-cyan-400 border border-cyan-500/2 transition-colors rounded-lg text-[8px] font-black uppercase px-2 py-0.5">
              WebRTC Audio Seat Sync
            </span>
          </div>

          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={metrics}>
                <defs>
                  <linearGradient id="latencyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="time" stroke="#52525b" style={{ fontSize: '8px', fontFamily: 'monospace' }} />
                <YAxis stroke="#52525b" style={{ fontSize: '8px', fontFamily: 'monospace' }} unit="ms" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '1rem' }}
                  labelStyle={{ color: '#a1a1aa', fontSize: '9px', fontWeight: 'bold' }}
                  itemStyle={{ color: '#ffffff', fontSize: '10px' }}
                />
                <Area type="monotone" dataKey="latency" name="Ping" stroke="#22d3ee" strokeWidth={2} fillOpacity={1} fill="url(#latencyGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Graph 2: Jitter & Packet Loss Trace */}
        <div className="bg-zinc-900/40 border border-zinc-850 p-6 rounded-[2rem] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-white font-black uppercase text-xs">Segment Packet Drops & Jitter Analysis</h4>
              <p className="text-[8px] text-zinc-500 font-black uppercase tracking-wider">Tracking frame losses and audio-buffer variance</p>
            </div>
            <span className="bg-orange-500/10 hover:bg-orange-500/15 text-orange-400 border border-orange-500/2 transition-colors rounded-lg text-[8px] font-black uppercase px-2 py-0.5">
              QoS Stream Metrics
            </span>
          </div>

          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metrics}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="time" stroke="#52525b" style={{ fontSize: '8px', fontFamily: 'monospace' }} />
                <YAxis stroke="#52525b" style={{ fontSize: '8px', fontFamily: 'monospace' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '1rem' }}
                  labelStyle={{ color: '#a1a1aa', fontSize: '9px', fontWeight: 'bold' }}
                  itemStyle={{ fontSize: '10px' }}
                />
                <Legend style={{ fontSize: '9px' }} />
                <Line type="monotone" dataKey="packetLoss" name="Packet Loss (%)" stroke="#f97316" strokeWidth={2} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="jitter" name="Jitter (ms)" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="3 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Real-time Server Sync Error Log Feed */}
      <div className="bg-zinc-900/40 border border-zinc-850 p-6 rounded-[2rem] space-y-4">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-rose-400" />
            <div>
              <h3 className="text-white font-black uppercase text-xs">Server-Side Sync Error Ledger</h3>
              <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest leading-none mt-1">
                Real-time Firebase listener capture of stream anomalies, WebSockets, or replication drifts
              </p>
            </div>
          </div>

          <button
            onClick={manualSyncCheck}
            disabled={isRefreshing}
            type="button"
            className="bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 px-3.5 py-2 hover:border-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-all flex items-center justify-center gap-1 cursor-pointer font-black text-[9px] uppercase tracking-wider"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            Scan Sync Pipeline
          </button>
        </div>

        {/* List of server-side sync logs */}
        <div className="border border-zinc-850 rounded-2xl bg-zinc-950 overflow-hidden">
          <div className="max-h-[350px] overflow-y-auto divide-y divide-zinc-900/60">
            {logs.length === 0 ? (
              <div className="p-8 text-center text-zinc-550 text-[10px] font-black uppercase tracking-widest">
                No pipeline errors logged in this session
              </div>
            ) : (
              logs.map((log) => {
                const getSeverityStyles = (sev: string) => {
                  switch (sev) {
                    case 'high':
                      return { bg: 'bg-rose-500/10 border border-rose-500/20 text-rose-400', label: 'CRITICAL SHIELD' };
                    case 'warning':
                      return { bg: 'bg-amber-500/10 border border-amber-500/20 text-amber-400', label: 'WARNING DETECT' };
                    case 'resolved':
                      return { bg: 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400', label: 'RESOLVED SAFE' };
                    default:
                      return { bg: 'bg-zinc-800 border border-zinc-700 text-zinc-400', label: 'TELEMETRY' };
                  }
                };

                const styled = getSeverityStyles(log.severity);

                return (
                  <div key={log.id} className="p-4 hover:bg-zinc-900/30 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
                    
                    {/* Left: Indicator Tag + Msg details */}
                    <div className="flex items-start gap-3">
                      <div className="mt-1 shrink-0">
                        <span className={`text-[7px] font-black tracking-widest px-1.5 py-0.5 rounded ${styled.bg}`}>
                          {styled.label}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="text-zinc-300 font-bold text-[11px] leading-relaxed select-all">
                          {log.errorMsg}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-2 text-[8px] text-zinc-500 font-bold uppercase tracking-wider">
                          <span>Room: <strong className="text-zinc-400">{log.roomName} (ID: {log.roomId})</strong></span>
                          <span>•</span>
                          <span>Module: <strong className="text-amber-400/90 font-mono tracking-normal text-[9px]">{log.module}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Log Timestamp Details */}
                    <div className="flex items-center gap-3 md:text-right shrink-0">
                      <div className="font-mono text-[9px] text-zinc-500">
                        <span className="block text-[8px] text-zinc-650 uppercase font-sans font-black tracking-widest">Received</span>
                        {log.timestamp}
                      </div>
                      <div className="bg-zinc-900 border border-zinc-850 px-2.5 py-1.5 rounded-lg text-[8px] font-black uppercase text-zinc-400 font-mono">
                        {log.id}
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
