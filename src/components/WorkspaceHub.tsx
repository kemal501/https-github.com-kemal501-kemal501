import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Database, FileSpreadsheet, Calendar, Sparkles, LogIn, CheckCircle, RefreshCw } from 'lucide-react';

export default function WorkspaceHub() {
  const [syncedCalendar, setSyncedCalendar] = useState(false);
  const [syncedSheets, setSyncedSheets] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);

  const handleOAuthSync = (hubType: 'calendar' | 'sheets') => {
    setSyncing(hubType);
    setTimeout(() => {
      if (hubType === 'calendar') setSyncedCalendar(true);
      if (hubType === 'sheets') setSyncedSheets(true);
      setSyncing(null);
    }, 1500);
  };

  return (
    <div className="bg-zinc-900 border border-white/5 rounded-[2.5rem] p-6 text-left space-y-6">
      <div className="flex gap-3 items-center">
        <div className="w-10 h-10 bg-amber-400/10 rounded-2xl border border-amber-400/20 flex items-center justify-center text-amber-400">
          <Database className="w-5 h-5" />
        </div>
        <div>
          <span className="text-zinc-500 text-[9px] font-black uppercase tracking-widest font-sans">Active Enterprise Integrations</span>
          <h3 className="text-lg font-black text-white italic uppercase tracking-tighter">Workspace Sync</h3>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Calendar Card */}
        <div className="bg-black/40 border border-white/5 p-5 rounded-2xl space-y-4">
          <div className="flex justify-between items-start">
            <div className="w-8 h-8 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400">
              <Calendar className="w-4.5 h-4.5" />
            </div>
            {syncedCalendar ? (
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-md text-[8px] font-black uppercase">Linked</span>
            ) : (
              <span className="bg-zinc-805 text-zinc-500 px-2 py-0.5 rounded-md text-[8px] font-black uppercase">Unlinked</span>
            )}
          </div>
          <div>
            <h4 className="text-xs font-black text-white uppercase">Broadcasting Scheduler</h4>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wide leading-relaxed">
              Overlay stream calendars directly onto Google Calendar. Notify host recruits.
            </p>
          </div>
          <button 
            type="button"
            disabled={syncing !== null}
            onClick={() => handleOAuthSync('calendar')}
            className="w-full bg-zinc-850 hover:bg-zinc-800 text-white rounded-xl py-3 text-[10px] font-black uppercase tracking-widest cursor-pointer border-0 flex items-center justify-center gap-1.5"
          >
            {syncing === 'calendar' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : syncedCalendar ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                Resync Calendar
              </>
            ) : (
              'Connect Google Calendar'
            )}
          </button>
        </div>

        {/* Sheets Card */}
        <div className="bg-black/40 border border-white/5 p-5 rounded-2xl space-y-4">
          <div className="flex justify-between items-start">
            <div className="w-8 h-8 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-4.5 h-4.5" />
            </div>
            {syncedSheets ? (
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded-md text-[8px] font-black uppercase">Linked</span>
            ) : (
              <span className="bg-zinc-805 text-zinc-500 px-2 py-0.5 rounded-md text-[8px] font-black uppercase">Unlinked</span>
            )}
          </div>
          <div>
            <h4 className="text-xs font-black text-white uppercase">Ledger Export</h4>
            <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-wide leading-relaxed">
              Export high-level reseller ledgers & recruiter commissions directly to Sheets.
            </p>
          </div>
          <button 
            type="button"
            disabled={syncing !== null}
            onClick={() => handleOAuthSync('sheets')}
            className="w-full bg-zinc-850 hover:bg-zinc-800 text-white rounded-xl py-3 text-[10px] font-black uppercase tracking-widest cursor-pointer border-0 flex items-center justify-center gap-1.5"
          >
            {syncing === 'sheets' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : syncedSheets ? (
              <>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                Resync Sheets Ledger
              </>
            ) : (
              'Connect Google Sheets'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
