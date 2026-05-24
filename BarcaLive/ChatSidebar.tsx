/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Send, Trash2, AtSign, User, Sparkles, ChevronDown, Settings, Users, Shield, Lock, Bell, Ghost, Sparkle, Coins } from 'lucide-react';
import { cn } from '../lib/utils';
import { auth } from '../lib/firebase';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: any;
}

interface ChatSidebarProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  onDeleteMessage?: (id: string) => void;
  isHost?: boolean;
  users: { name: string, avatar: string | null }[];
  roomHost: string;
  seats?: { id: number, occupied: boolean, user: any, isLocked?: boolean }[];
  onUpdateRoom?: (updates: any) => void;
  onSeatClick?: (seat: any) => void;
  roomData?: any;
}

export default function ChatSidebar({ 
  messages, 
  onSendMessage, 
  onDeleteMessage, 
  isHost, 
  users, 
  roomHost,
  seats = [],
  onUpdateRoom,
  onSeatClick,
  roomData
}: ChatSidebarProps) {
  const [text, setText] = React.useState('');
  const [showMentions, setShowMentions] = React.useState(false);
  const [mentionFilter, setMentionFilter] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<'chat' | 'settings'>('chat');
  const chatEndRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    if (activeTab === 'chat') {
      scrollToBottom();
    }
  }, [messages, activeTab]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendMessage(text.trim());
    setText('');
    setShowMentions(false);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setText(val);

    const lastAt = val.lastIndexOf('@');
    if (lastAt !== -1 && (lastAt === 0 || val[lastAt - 1] === ' ')) {
      const query = val.slice(lastAt + 1);
      if (!query.includes(' ')) {
        setMentionFilter(query);
        setShowMentions(true);
        return;
      }
    }
    setShowMentions(false);
  };

  const insertMention = (userName: string) => {
    const lastAt = text.lastIndexOf('@');
    const newText = text.slice(0, lastAt) + '@' + userName + ' ';
    setText(newText);
    setShowMentions(false);
    inputRef.current?.focus();
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(mentionFilter.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-black/40 backdrop-blur-md border-l border-zinc-900 w-full max-w-sm">
      {/* Tab Switcher */}
      <div className="flex bg-black/60 p-1 border-b border-zinc-900">
        <button 
          onClick={() => setActiveTab('chat')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest",
            activeTab === 'chat' ? "bg-zinc-800 text-white shadow-lg" : "text-zinc-500 hover:text-zinc-400"
          )}
        >
          <AtSign className="w-3.5 h-3.5" />
          Discussion
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest",
            activeTab === 'settings' ? "bg-amber-400 text-black shadow-lg" : "text-zinc-500 hover:text-zinc-400"
          )}
        >
          <Settings className="w-3.5 h-3.5" />
          Room Control
        </button>
      </div>

      {activeTab === 'chat' ? (
        <>
          {/* Discussion Header */}
          <div className="p-4 border-b border-zinc-900/50 flex items-center justify-between bg-black/20">
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Messages</span>
              <div className="bg-zinc-800 h-[1px] w-8" />
            </div>
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-500/10 border border-green-500/20">
              <div className="w-1 h-1 bg-green-500 rounded-full animate-pulse" />
              <span className="text-[8px] font-black text-green-500 uppercase">Live</span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => {
                const isMe = msg.senderId === auth.currentUser?.uid;
                const isHostMsg = msg.senderName === roomHost;
                const isSystem = msg.senderId === 'system';

                return (
                  <motion.div
                    key={msg.id || idx}
                    initial={{ opacity: 0, x: 10, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    className={cn(
                      "flex flex-col gap-1",
                      isMe ? "items-end" : "items-start"
                    )}
                  >
                    {!isSystem && (
                      <div className="flex items-center gap-1.5 px-1">
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-tighter",
                          isMe ? "text-amber-400" : (isHostMsg ? "text-blue-400" : "text-zinc-500")
                        )}>
                          {msg.senderName}
                        </span>
                        {isHostMsg && <Sparkles className="w-2.5 h-2.5 text-blue-400" />}
                      </div>
                    )}

                    <div className={cn(
                      "relative group max-w-[85%] px-4 py-2.5 rounded-2xl text-xs transition-all",
                      isSystem 
                        ? "bg-zinc-800/20 border border-zinc-800/50 text-zinc-500 italic w-full text-center rounded-lg" 
                        : (isMe 
                            ? "bg-amber-400 text-black font-medium rounded-tr-none shadow-lg shadow-amber-400/10" 
                            : "bg-zinc-900 text-zinc-300 rounded-tl-none border border-zinc-800")
                    )}>
                      {msg.text}

                      {isHost && !isSystem && onDeleteMessage && (
                        <button 
                          onClick={() => onDeleteMessage(msg.id)}
                          className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1.5 hover:text-red-500 transition-all text-zinc-600"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-zinc-900 relative">
            <AnimatePresence>
              {showMentions && filteredUsers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute bottom-full left-4 right-4 mb-2 bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl z-50"
                >
                  <div className="p-2 border-b border-zinc-800 bg-black/20">
                    <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest px-2">Mention User</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto no-scrollbar">
                    {filteredUsers.map((u) => (
                      <button
                        key={u.name}
                        onClick={() => insertMention(u.name)}
                        className="w-full flex items-center gap-3 p-3 hover:bg-zinc-800 transition-colors border-b border-zinc-800/50 last:border-0"
                      >
                        <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center overflow-hidden">
                          {u.avatar ? <img src={u.avatar} alt="Avatar" className="w-full h-full object-cover" /> : <User className="w-3 h-3 text-zinc-600" />}
                        </div>
                        <span className="text-[10px] font-bold text-white uppercase tracking-tight">{u.name}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={text}
                  onChange={handleTextChange}
                  placeholder="Type message... (use @ for mentions)"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-3 px-4 text-white text-xs focus:outline-none focus:border-amber-400 outline-none transition-all placeholder:text-zinc-700"
                />
              </div>
              <button
                type="submit"
                disabled={!text.trim()}
                className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                  text.trim() ? "bg-amber-400 text-black shadow-lg shadow-amber-400/20" : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                )}
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </>
      ) : (
        <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar bg-black/20">
          {/* Sitting Box (Compact Seat List) */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-white">Sitting Box</h3>
              </div>
              <span className="text-[8px] font-black text-zinc-500 uppercase bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800">
                {seats.filter(s => s.occupied).length}/24
              </span>
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              {seats.map((seat) => (
                <button 
                  key={seat.id}
                  onClick={() => onSeatClick?.(seat)}
                  className={cn(
                    "aspect-square rounded-xl border flex items-center justify-center relative transition-all group overflow-hidden",
                    seat.occupied ? "bg-zinc-900 border-zinc-800" : "bg-black/40 border-zinc-900 border-dashed hover:border-zinc-700 hover:bg-zinc-900/50"
                  )}
                >
                  {seat.occupied ? (
                    <img 
                      src={seat.user?.avatar || `https://i.pravatar.cc/100?u=${seat.id}`} 
                      alt="User" 
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[10px] font-black text-zinc-700 group-hover:text-amber-400 transition-colors uppercase italic">{seat.id + 1}</span>
                      {seat.isLocked && <Lock className="w-2 h-2 text-zinc-800" />}
                    </div>
                  )}
                  {seat.occupied && (
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* Room Settings (Host Only) */}
          {isHost && (
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-amber-400" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-white">Management</h3>
              </div>
              
              <div className="space-y-2">
                {[
                  { label: 'Room Privacy', icon: <Lock className="w-3.5 h-3.5" />, value: roomData?.settings?.isPrivate ? 'Private' : 'Public', onClick: () => onUpdateRoom?.({ 'settings.isPrivate': !roomData?.settings?.isPrivate }) },
                  { label: 'Entry Effects', icon: <Sparkle className="w-3.5 h-3.5" />, value: roomData?.settings?.entryEffectsEnabled ? 'ON' : 'OFF', onClick: () => onUpdateRoom?.({ 'settings.entryEffectsEnabled': !roomData?.settings?.entryEffectsEnabled }) },
                  { label: 'Room BGM', icon: <Ghost className="w-3.5 h-3.5" />, value: roomData?.settings?.isBgmEnabled ? 'ON' : 'OFF', onClick: () => onUpdateRoom?.({ 'settings.isBgmEnabled': !roomData?.settings?.isBgmEnabled }) },
                  { label: 'Entry Fee', icon: <Coins className="w-3.5 h-3.5" />, value: `${roomData?.settings?.entryFee || 100}`, onClick: () => {
                    const current = roomData?.settings?.entryFee || 100;
                    const next = current === 100 ? 500 : (current === 500 ? 1000 : 100);
                    onUpdateRoom?.({ 'settings.entryFee': next });
                  } },
                ].map((item, i) => (
                  <button
                    key={i}
                    onClick={item.onClick}
                    className="w-full flex items-center justify-between p-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl hover:bg-zinc-800 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-zinc-500">{item.icon}</div>
                      <span className="text-[10px] font-bold text-white uppercase tracking-tight">{item.label}</span>
                    </div>
                    <span className={cn(
                      "text-[8px] font-black uppercase px-2 py-0.5 rounded-md border",
                      item.value === 'ON' || item.value === 'Public' ? "text-green-500 border-green-500/20 bg-green-500/10" : "text-amber-500 border-amber-500/20 bg-amber-400/10"
                    )}>
                      {item.value}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* User List */}
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-zinc-500" />
              <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Viewers</h3>
            </div>
            <div className="space-y-1">
              {users.slice(0, 5).map((user, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <img src={user.avatar || `https://i.pravatar.cc/100?u=${user.name}`} alt="" className="w-6 h-6 rounded-full border border-zinc-800" />
                    <span className="text-[10px] font-bold text-white uppercase tracking-tight">{user.name}</span>
                  </div>
                  {isHost && (
                    <button className="text-zinc-600 hover:text-red-500 transition-colors">
                      <Shield className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {users.length > 5 && (
                <button className="w-full py-2 text-[8px] font-black text-zinc-600 uppercase tracking-widest hover:text-white transition-colors">
                  + {users.length - 5} more viewers
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
