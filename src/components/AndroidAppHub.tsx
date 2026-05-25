import React from 'react';
import { Smartphone, Download, QrCode, ShieldCheck, Heart, Users } from 'lucide-react';

export default function AndroidAppHub() {
  return (
    <div className="bg-zinc-950 rounded-[3rem] border border-white/5 p-6 md:p-8 space-y-8 text-left max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-zinc-550 text-[10px] font-black uppercase tracking-[0.2em] font-mono">Mobile Ecosystem</span>
          <h2 className="text-2xl font-black text-white italic uppercase tracking-tight">Android Interconnect</h2>
        </div>
        
        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
          <ShieldCheck className="w-3.5 h-3.5" /> Google Play Protect Verified
        </span>
      </div>

      <div className="grid md:grid-cols-12 gap-6 items-center">
        {/* Left Column: APK Download / Pairing */}
        <div className="md:col-span-8 space-y-6">
          <div className="bg-zinc-900/40 border border-white/5 p-6 rounded-[2rem] space-y-4">
            <h3 className="text-sm font-black text-white uppercase italic">Barca Live Native APK</h3>
            <p className="text-zinc-500 text-xs leading-relaxed">
              Experience zero-latency voice streams with full hardware acceleration, background listening support, and integration with local address verified profiles.
            </p>
            <div className="flex flex-wrap gap-4">
              <button className="bg-amber-400 hover:bg-amber-300 text-black px-6 py-3.5 rounded-2xl font-black uppercase tracking-wider text-[10px] flex items-center gap-2 cursor-pointer border-0 shadow-lg shadow-amber-400/10">
                <Download className="w-4 h-4" /> Download Production APK
              </button>
              <div className="text-[10px] text-zinc-500 font-mono flex flex-col justify-center leading-tight">
                <span>Version: v3.12.0_arm64-v8a</span>
                <span>SHA-256 Verified: 4a2d8f...</span>
              </div>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="bg-zinc-905/30 border border-white/5 p-5 rounded-2xl space-y-2">
              <Users className="w-5 h-5 text-blue-400" />
              <h4 className="text-xs font-black text-white uppercase">Mobile Recruiter Links</h4>
              <p className="text-[10px] text-zinc-500 leading-normal">
                Contract live streamer candidates directly through the app using referral deep links.
              </p>
            </div>
            <div className="bg-zinc-905/30 border border-white/5 p-5 rounded-2xl space-y-2">
              <Heart className="w-5 h-5 text-pink-500" />
              <h4 className="text-xs font-black text-white uppercase">Background Audio Playback</h4>
              <p className="text-[10px] text-zinc-500 leading-normal">
                Lock your screen and remain active on stage inside voice lounges without losing link.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Pairing QR Code */}
        <div className="md:col-span-4 flex flex-col items-center bg-zinc-900/50 border border-white/5 p-6 rounded-[2.5rem] text-center space-y-4">
          <QrCode className="w-24 h-24 text-white p-2 bg-white/5 border border-white/10 rounded-2xl filter drop-shadow-[0_4px_10px_rgba(255,255,255,0.05)]" />
          <div className="space-y-1">
            <h4 className="text-xs font-black text-white uppercase">Instant Device Pairing</h4>
            <p className="text-[9px] text-zinc-505 font-bold uppercase tracking-wide leading-relaxed px-4">
              Scan this Pairing vector in your Android App to authorize biometric handshake.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
