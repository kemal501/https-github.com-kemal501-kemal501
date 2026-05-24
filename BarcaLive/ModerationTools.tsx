/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MicOff, UserMinus, Ban, ShieldCheck, History, MoreVertical, X, Slash } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface User {
  id: string;
  name: string;
  avatar: string;
  isMuted?: boolean;
}

const MOCK_ROOM_USERS: User[] = [
  { id: 'u1', name: 'Zekarias', avatar: 'https://i.pravatar.cc/150?u=1', isMuted: false },
  { id: 'u2', name: 'Hana_T', avatar: 'https://i.pravatar.cc/150?u=2', isMuted: true },
  { id: 'u3', name: 'Desta_K', avatar: 'https://i.pravatar.cc/150?u=3', isMuted: false },
  { id: 'u4', name: 'Melat', avatar: 'https://i.pravatar.cc/150?u=4', isMuted: false },
];

export default function ModerationTools() {
  const [showLogs, setShowLogs] = React.useState(false);
  const [selectedUser, setSelectedUser] = React.useState<User | null>(null);

  const handleAction = (type: string, userId: string) => {
    console.log(`Moderation: ${type} user ${userId}`);
    // In a real app: addDoc(collection(db, `rooms/${roomId}/moderation_logs`), { ... })
    setSelectedUser(null);
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-[2.5rem] p-6 space-y-6" id="moderation-tools">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-red-500/10 p-2 rounded-xl text-red-500">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight italic">Moderation</h2>
        </div>
        <button 
          onClick={() => setShowLogs(!showLogs)}
          className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 px-4 py-2 rounded-xl transition-all"
        >
          <History className="w-4 h-4 text-zinc-400" />
          <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Logs</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {showLogs ? (
          <motion.div 
            key="logs"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-3"
          >
            {[
              { id: 1, action: 'Kicked', user: 'Guest_99', time: '5m ago' },
              { id: 2, action: 'Muted', user: 'Spammer_X', time: '12m ago' },
              { id: 3, action: 'Banned', user: 'Bot_01', time: '1h ago' }
            ].map(log => (
              <div key={log.id} className="bg-black/40 border border-zinc-800/50 p-3 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                  <p className="text-zinc-200 text-xs font-medium">
                    <span className="font-black text-red-500">{log.action}:</span> {log.user}
                  </p>
                </div>
                <span className="text-[10px] text-zinc-600 font-bold uppercase">{log.time}</span>
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div 
            key="users"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-2 gap-3"
          >
            {MOCK_ROOM_USERS.map(user => (
              <div 
                key={user.id} 
                className="bg-zinc-800/30 border border-zinc-700/30 p-3 rounded-2xl flex items-center justify-between hover:border-zinc-600 transition-all cursor-pointer relative"
                onClick={() => setSelectedUser(user)}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full border border-zinc-700 overflow-hidden">
                    <img src={user.avatar} alt={user.name} />
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-white text-xs font-bold truncate">{user.name}</p>
                    {user.isMuted && <span className="text-[8px] text-red-500 font-black uppercase">Muted</span>}
                  </div>
                </div>
                <MoreVertical className="w-4 h-4 text-zinc-600" />
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Overlay */}
      <AnimatePresence>
        {selectedUser && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-zinc-900 border border-zinc-700 rounded-[2.5rem] w-full max-w-sm overflow-hidden"
              >
                <div className="p-8 text-center border-b border-zinc-800">
                  <div className="w-20 h-20 rounded-full border-4 border-red-500/20 mx-auto mb-4 overflow-hidden">
                    <img src={selectedUser.avatar} alt={selectedUser.name} className="w-full h-full object-cover" />
                  </div>
                  <h3 className="text-xl font-black text-white">{selectedUser.name}</h3>
                  <p className="text-zinc-500 text-xs mt-1">Select action to perform</p>
                </div>

                <div className="grid grid-cols-4 divide-x divide-zinc-800">
                  <button 
                    onClick={() => handleAction('mute', selectedUser.id)}
                    className="p-4 flex flex-col items-center gap-2 hover:bg-zinc-800 transition-colors group"
                  >
                    <MicOff className="w-5 h-5 text-zinc-400 group-hover:text-amber-400 transition-colors" />
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Mute</span>
                  </button>
                  <button 
                    onClick={() => handleAction('kick', selectedUser.id)}
                    className="p-4 flex flex-col items-center gap-2 hover:bg-zinc-800 transition-colors group"
                  >
                    <UserMinus className="w-5 h-5 text-zinc-400 group-hover:text-orange-500 transition-colors" />
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Kick</span>
                  </button>
                  <button 
                    onClick={() => handleAction('ban', selectedUser.id)}
                    className="p-4 flex flex-col items-center gap-2 hover:bg-zinc-800 transition-colors group"
                  >
                    <Ban className="w-5 h-5 text-zinc-400 group-hover:text-red-500 transition-colors" />
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Ban</span>
                  </button>
                  <button 
                    onClick={() => handleAction('block', selectedUser.id)}
                    className="p-4 flex flex-col items-center gap-2 hover:bg-zinc-800 transition-colors group"
                  >
                    <Slash className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" />
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">Block</span>
                  </button>
                </div>

                <button 
                  onClick={() => setSelectedUser(null)}
                  className="w-full py-4 bg-zinc-800 text-zinc-400 font-bold uppercase tracking-widest text-[10px] hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
