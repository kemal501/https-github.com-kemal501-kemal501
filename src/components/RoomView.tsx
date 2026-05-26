import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mic, MicOff, Camera, VideoOff, Users, Heart, Share2, Send, HelpCircle, Gift } from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from './firebase';
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy } from 'firebase/firestore';
import Gifts from './Gifts';
import AgoraRTC, { IAgoraRTCClient, ILocalAudioTrack } from 'agora-rtc-sdk-ng';

interface RoomViewProps {
  room: {
    id: string;
    title: string;
    host: string;
    category?: string;
    viewers?: string;
  };
  isHost: boolean;
  onLeave: () => void;
}

export default function RoomView({ room, isHost, onLeave }: RoomViewProps) {
  const [micActive, setMicActive] = useState(false);
  const [videoActive, setVideoActive] = useState(false);
  const [chatMessages, setChatMessages] = useState<{ id: string, sender: string, text: string, timestamp: Date }[]>([]);
  const [remoteEvents, setRemoteEvents] = useState<{ id: string, sender: string, text: string, timestamp: Date }[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [likesCount, setLikesCount] = useState(0);
  const [showGifting, setShowGifting] = useState(false);
  const [floatingGifts, setFloatingGifts] = useState<{ id: string, icon: string }[]>([]);
  const [showListeners, setShowListeners] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  
  // Tab/Left-Menu States
  const [activeTab, setActiveTab] = useState<'All' | 'Room' | 'Chat'>('Room');
  const [showChatPanel, setShowChatPanel] = useState(true);

  // Dynamic user seat map
  const [speakers, setSpeakers] = useState<(string | null)[]>([
    room.host, // Seat 1 (Host)
    'Zekarias_Abebe', // Seat 2 (VIP)
    'Bethel_S', // Seat 3 (VIP)
    'Alem_Ethio', // Seat 4 (VIP)
    null, // Seat 5
    null, // Seat 6
    null, // Seat 7
    null, // Seat 8
    null  // Seat 9
  ]);

  // Handle joining/leaving seats and logging activities
  const handleSeatClick = (index: number) => {
    const currentUserName = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Guest_User';
    const userId = auth.currentUser?.uid || '1068462';
    const eventsRef = collection(db, 'rooms', room.id, 'events');

    setSpeakers(prev => {
      const next = [...prev];
      if (next[index] === currentUserName) {
        next[index] = null; // Leave seat

        // Log seat-leave event persistently
        addDoc(eventsRef, {
          userId,
          userName: currentUserName,
          type: 'seat-leave',
          timestamp: serverTimestamp()
        }).catch(err => {
          handleFirestoreError(err, OperationType.CREATE, `rooms/${room.id}/events`);
        });

      } else if (!next[index]) {
        // Leave any other seat first
        const cleanArr = next.map(val => val === currentUserName ? null : val);
        cleanArr[index] = currentUserName;

        // Log seat-join event persistently
        addDoc(eventsRef, {
          userId,
          userName: currentUserName,
          type: 'seat-join',
          timestamp: serverTimestamp()
        }).catch(err => {
          handleFirestoreError(err, OperationType.CREATE, `rooms/${room.id}/events`);
        });

        return cleanArr;
      }
      return next;
    });
  };

  const [ping, setPing] = useState(48);
  const [connectionQuality, setConnectionQuality] = useState<'Good' | 'Fair' | 'Poor' | 'Critical'>('Good');

  // Agora refs
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const localAudioTrackRef = useRef<ILocalAudioTrack | null>(null);
  const [appId, setAppId] = useState<string | null>(null);
  const [agoraState, setAgoraState] = useState<'connecting' | 'connected' | 'error'>('connecting');

  useEffect(() => {
    fetch('/api/agora-config')
      .then(res => res.json())
      .then(data => setAppId(data.appId))
      .catch(() => setAgoraState('error'));
  }, []);

  useEffect(() => {
    if (!appId) return;

    setAgoraState('connecting');
    
    // Fetch token
    fetch(`/api/agora-token?channelName=room_${room.id}`)
      .then(res => res.json())
      .then(async data => {
        try {
          clientRef.current = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

          clientRef.current.on("user-published", async (user, mediaType) => {
            try {
              await clientRef.current?.subscribe(user, mediaType);
              if (mediaType === "audio") {
                user.audioTrack?.play();
              }
            } catch (err) {
              console.error("Subscription or play failure:", err);
            }
          });

          clientRef.current.on("connection-state-change", (curState) => {
            if (curState === "CONNECTED") {
              setAgoraState('connected');
            } else if (curState === "CONNECTING" || curState === "RECONNECTING") {
              setAgoraState('connecting');
            } else if (curState === "DISCONNECTED") {
              setAgoraState('connecting');
            }
          });

          await clientRef.current.join(appId, "room_" + room.id, data.token, null);
          setAgoraState('connected');
        } catch (err) {
          console.error("Agora join error:", err);
          setAgoraState('error');
        }
      })
      .catch(err => {
        console.error("Agora token fetch error:", err);
        setAgoraState('error');
      });

    return () => {
      clientRef.current?.leave().catch(err => console.error("Error leaving agora client:", err));
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.close();
      }
    };
  }, [appId, room.id]);

  const toggleMic = async () => {
    if (!clientRef.current) return;
    if (!micActive) {
      try {
        localAudioTrackRef.current = await AgoraRTC.createMicrophoneAudioTrack();
        await clientRef.current.publish(localAudioTrackRef.current);
        setMicActive(true);
      } catch (err) { console.error("Error activating mic:", err); }
    } else {
      if (localAudioTrackRef.current) {
        await clientRef.current.unpublish(localAudioTrackRef.current);
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
      }
      setMicActive(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const basePing = Math.floor(Math.random() * 55) + 32;
      const spike = Math.random() > 0.88 ? Math.floor(Math.random() * 190) + 110 : 0;
      const currentPing = basePing + spike;
      setPing(currentPing);
      if (currentPing < 80) setConnectionQuality('Good');
      else if (currentPing < 140) setConnectionQuality('Fair');
      else if (currentPing < 210) setConnectionQuality('Poor');
      else setConnectionQuality('Critical');
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setShowCopiedToast(true);
    setTimeout(() => setShowCopiedToast(false), 2000);
  };

  const handleTriggerFloatingGift = (icon: string) => {
    const id = Math.random().toString();
    setFloatingGifts(prev => [...prev, { id, icon }]);
    setTimeout(() => setFloatingGifts(prev => prev.filter(g => g.id !== id)), 2200);
  };

  const msgScrollRef = useRef<HTMLDivElement>(null);

  // Dynamic random speaker talking effect state simulation
  const [talkingUserIndex, setTalkingUserIndex] = useState<number | null>(null);
  useEffect(() => {
    const interval = setInterval(() => {
      // randomly pick a speaker seat index to be "talking"
      const occupiedIndices = speakers
        .map((sp, idx) => (sp !== null ? idx : -1))
        .filter(idx => idx !== -1);
      if (occupiedIndices.length > 0) {
        const randIndex = occupiedIndices[Math.floor(Math.random() * occupiedIndices.length)];
        // Host (index 0) only has talking state if local mic is on
        if (randIndex === 0) {
          setTalkingUserIndex(micActive ? 0 : null);
        } else {
          setTalkingUserIndex(randIndex);
        }
      } else {
        setTalkingUserIndex(null);
      }
    }, 3800);
    return () => clearInterval(interval);
  }, [speakers, micActive]);

  useEffect(() => {
    // Initial static chat messages
    setChatMessages([
      { id: '1', sender: 'System_Bot_Live', text: 'Welcome to the Live Social Room! Ensure respectful interactions.', timestamp: new Date(Date.now() - 30000) },
      { id: '2', sender: 'Zekarias_Abebe', text: 'Stellar stream quality today! High-Fidelity Opus voice sounds great.', timestamp: new Date(Date.now() - 20000) },
      { id: '3', sender: 'Bethel_S', text: 'Sending roses to the host 🌹', timestamp: new Date(Date.now() - 10000) }
    ]);
  }, [room.id]);

  // Firestore path for error logging
  const eventsSubcollectionPath = `rooms/${room.id}/events`;

  // Write join/leave activity to subcollection
  useEffect(() => {
    if (!room.id || !auth.currentUser) return;
    
    const userId = auth.currentUser.uid;
    const userName = auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || 'Guest_User';
    
    // Add real event 'join'
    const eventsRef = collection(db, 'rooms', room.id, 'events');
    addDoc(eventsRef, {
      userId,
      userName,
      type: 'join',
      timestamp: serverTimestamp()
    }).catch(err => {
      handleFirestoreError(err, OperationType.CREATE, eventsSubcollectionPath);
    });

    return () => {
      // Add real event 'leave'
      addDoc(eventsRef, {
        userId,
        userName,
        type: 'leave',
        timestamp: serverTimestamp()
      }).catch(err => {
        handleFirestoreError(err, OperationType.CREATE, eventsSubcollectionPath);
      });
    };
  }, [room.id]);

  // Realtime subscription to events subcollection
  useEffect(() => {
    if (!room.id) return;

    const eventsRef = collection(db, 'rooms', room.id, 'events');
    const q = query(eventsRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveEvents = snapshot.docs.map(doc => {
        const data = doc.data();
        let text = '';
        const userLabel = `@${data.userName}`;

        switch (data.type) {
          case 'join':
            text = `📢 ${userLabel} joined the room`;
            break;
          case 'leave':
            text = `👋 ${userLabel} left the room`;
            break;
          case 'seat-join':
            text = `🎤 ${userLabel} sat on the mic stage`;
            break;
          case 'seat-leave':
            text = `🛋 ${userLabel} stepped down from the mic stage`;
            break;
          default:
            text = `⚡ ${userLabel} triggered action: ${data.type}`;
        }

        return {
          id: doc.id,
          sender: 'System_Bot_Live',
          text,
          timestamp: data.timestamp?.toDate ? data.timestamp.toDate() : new Date()
        };
      });

      setRemoteEvents(liveEvents);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, eventsSubcollectionPath);
    });

    return () => unsubscribe();
  }, [room.id]);

  // Computed combined visual list
  const combinedMessages = [...chatMessages, ...remoteEvents].sort((a, b) => {
    return a.timestamp.getTime() - b.timestamp.getTime();
  });

  useEffect(() => {
    if (msgScrollRef.current) msgScrollRef.current.scrollTop = msgScrollRef.current.scrollHeight;
  }, [combinedMessages, showChatPanel]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    const currentUserName = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Guest';
    setChatMessages(prev => [
      ...prev, 
      { 
        id: Math.random().toString(), 
        sender: currentUserName, 
        text: newMsg.trim(),
        timestamp: new Date()
      }
    ]);
    setNewMsg('');
  };

  // Profile icon helper
  const currentUserPhoto = auth.currentUser?.photoURL || "https://cdn-icons-png.flaticon.com/512/149/149071.png";
  const currentUserName = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'User';
  const currentUserId = auth.currentUser?.uid?.substring(0, 7).toUpperCase() || '1068462';

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }}
      id="roomContainer"
      className="fixed inset-0 z-[120] bg-cover bg-center select-none overflow-hidden"
      style={{ backgroundImage: `url('https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1200')` }}
    >
      {/* Wave animation styles */}
      <style>{`
        @keyframes wave {
          from { transform: scale(1); opacity: 1; }
          to { transform: scale(1.6); opacity: 0; }
        }
        .avatar-pulsing::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          border: 3px solid #00ffd5;
          animation: wave 1.5s infinite;
        }
      `}</style>

      {/* Background Masking & Blur Overlay */}
      <div className="absolute inset-0 bg-black/65 backdrop-blur-[5px] z-0 pointer-events-none" />

      {/* Float notifications */}
      {showCopiedToast && (
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
          className="fixed top-20 z-[300] left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-5 py-2 rounded-full text-xs font-black tracking-wide shadow-lg shadow-emerald-500/20"
        >
          Link Copied!
        </motion.div>
      )}

      {/* Floating Gift Animations */}
      <div className="absolute inset-x-0 bottom-32 top-32 pointer-events-none z-50 flex items-center justify-center overflow-hidden">
        <AnimatePresence>
          {floatingGifts.map(gift => (
            <motion.div
              key={gift.id}
              initial={{ opacity: 0, scale: 0.3, y: 150 }}
              animate={{ opacity: 1, scale: 1.5, y: -200, rotate: 12 }}
              exit={{ opacity: 0, scale: 2 }}
              transition={{ duration: 1.8, ease: "easeOut" }}
              className="absolute text-5xl font-extrabold filter drop-shadow-[0_0_15px_rgba(251,191,36,0.8)]"
            >
              {gift.icon}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* TOP BAR */}
      <div id="roomTopBar" className="relative z-10 px-6 py-4 flex items-center justify-between bg-black/30 backdrop-blur-md border-b border-white/5">
        
        {/* User Profile Info */}
        <div className="flex items-center gap-3">
          <img 
            src={currentUserPhoto} 
            alt="profile" 
            className="w-12 h-12 rounded-full object-cover border-2 border-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.3)] cursor-pointer hover:scale-105 transition-all"
          />
          <div>
            <h3 className="text-white font-bold text-sm tracking-tight">{currentUserName}</h3>
            <p className="text-[10px] text-amber-450 font-mono tracking-widest uppercase">ID: {currentUserId}</p>
          </div>
        </div>

        {/* Room Title / Status */}
        <div className="hidden md:flex flex-col items-center">
          <span className="text-xs font-extrabold text-amber-500 font-mono tracking-widest bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20 shadow-sm animate-pulse">
            ★ {room.title || "LIVE VOICE ROOM"} ★
          </span>
        </div>

        {/* Agora Connection & Stats */}
        <div className="flex items-center gap-3">
          
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[9px] font-mono font-black tracking-tight ${
            agoraState === 'connected' ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-400' :
            agoraState === 'connecting' ? 'bg-amber-500/15 border-amber-500/25 text-amber-400 animate-pulse' :
            'bg-red-500/15 border-red-500/35 text-red-400'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              agoraState === 'connected' ? 'bg-emerald-400' :
              agoraState === 'connecting' ? 'bg-amber-400 animate-pulse' :
              'bg-red-500 animate-ping'
            }`} />
            <span className="uppercase">STREAM: {agoraState}</span>
          </div>

          <div className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-[9px] font-mono font-black ${
            connectionQuality === 'Good' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/15 border-red-500/35 text-red-400 animate-pulse'
          }`}>
            <span>📶 {ping} MS</span>
          </div>

          <button onClick={handleShare} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white flex items-center justify-center border-0 transition-colors cursor-pointer">
            <Share2 className="w-4 h-4" />
          </button>

          <button onClick={onLeave} className="bg-red-650 hover:bg-red-700 text-white rounded-xl px-4 py-2 text-[10px] font-extrabold uppercase tracking-widest transition-all cursor-pointer border-0 shadow-[0_4px_12px_rgba(239,68,68,0.2)]">
            ✖
          </button>
        </div>
      </div>

      {/* SEATS STAGE CONTAINER */}
      <div id="roomSeatsStage" className="relative z-10 w-full max-w-4xl mx-auto px-6 pt-16 pb-2">
        
        {/* ROW 1: Seat 1 (Key Host Seat) */}
        <div className="flex justify-center mb-10">
          <div className="text-center group" onClick={() => handleSeatClick(0)}>
            <div className={`w-20 h-20 rounded-full bg-zinc-850/80 backdrop-blur-md flex items-center justify-center text-4xl position-relative cursor-pointer transition-all hover:scale-105 border-2 ${
              speakers[0] ? 'border-amber-400 ring-4 ring-amber-400/20 text-zinc-200' : 'border-dashed border-white/20 text-zinc-500 hover:border-white/40'
            } ${talkingUserIndex === 0 || (micActive && speakers[0] === currentUserName) ? 'scale-108 ring-4 ring-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.4)] avatar-pulsing' : ''}`}>
              {speakers[0] ? (
                speakers[0].substring(0, 2).toUpperCase()
              ) : '🎤'}
              {speakers[0] && (
                <div className="absolute -bottom-1 -right-1 bg-black text-[10px] rounded-full p-1 border border-white/10">
                  {micActive ? '🔊' : '🔇'}
                </div>
              )}
            </div>
            <p className="text-xs font-black tracking-wide mt-2 text-amber-400 uppercase drop-shadow">
              {speakers[0] ? `@${speakers[0]}` : 'Seat 1 (Host)'}
            </p>
          </div>
        </div>

        {/* ROW 2: Seats 2, 3, 4 (👑 VIP Seats), Seat 5 */}
        <div className="flex justify-center gap-6 md:gap-10 mb-10 overflow-x-auto no-scrollbar py-2">
          
          {/* Seat 2 (VIP) */}
          <div className="text-center group shrink-0" onClick={() => handleSeatClick(1)}>
            <div className={`w-[74px] h-[74px] rounded-full flex items-center justify-center text-3xl position-relative cursor-pointer transition-all hover:scale-105 border-2 bg-gradient-to-tr from-amber-400 to-orange-500 shadow-[0_0_15px_rgba(245,158,11,0.4)] ${
              speakers[1] ? 'border-amber-300 text-zinc-100' : 'border-amber-500/40 text-amber-200'
            } ${talkingUserIndex === 1 || (micActive && speakers[1] === currentUserName) ? 'scale-108 ring-4 ring-cyan-400 shadow-[0_0_20px_#00ffd5] avatar-pulsing' : ''}`}>
              {speakers[1] ? speakers[1].substring(0, 2).toUpperCase() : '👑'}
            </div>
            <p className="text-[10px] font-black mt-2 text-amber-100 drop-shadow">
              {speakers[1] ? `@${speakers[1]}` : '2 👑'}
            </p>
          </div>

          {/* Seat 3 (VIP) */}
          <div className="text-center group shrink-0" onClick={() => handleSeatClick(2)}>
            <div className={`w-[74px] h-[74px] rounded-full flex items-center justify-center text-3xl position-relative cursor-pointer transition-all hover:scale-105 border-2 bg-gradient-to-tr from-amber-400 to-orange-500 shadow-[0_0_15px_rgba(245,158,11,0.4)] ${
              speakers[2] ? 'border-amber-300 text-zinc-100' : 'border-amber-500/40 text-amber-200'
            } ${talkingUserIndex === 2 || (micActive && speakers[2] === currentUserName) ? 'scale-108 ring-4 ring-cyan-400 shadow-[0_0_20px_#00ffd5] avatar-pulsing' : ''}`}>
              {speakers[2] ? speakers[2].substring(0, 2).toUpperCase() : '👑'}
            </div>
            <p className="text-[10px] font-black mt-2 text-amber-100 drop-shadow">
              {speakers[2] ? `@${speakers[2]}` : '3 👑'}
            </p>
          </div>

          {/* Seat 4 (VIP) */}
          <div className="text-center group shrink-0" onClick={() => handleSeatClick(3)}>
            <div className={`w-[74px] h-[74px] rounded-full flex items-center justify-center text-3xl position-relative cursor-pointer transition-all hover:scale-105 border-2 bg-gradient-to-tr from-amber-400 to-orange-500 shadow-[0_0_15px_rgba(245,158,11,0.4)] ${
              speakers[3] ? 'border-amber-300 text-zinc-100' : 'border-amber-500/40 text-amber-200'
            } ${talkingUserIndex === 3 || (micActive && speakers[3] === currentUserName) ? 'scale-108 ring-4 ring-cyan-400 shadow-[0_0_20px_#00ffd5] avatar-pulsing' : ''}`}>
              {speakers[3] ? speakers[3].substring(0, 2).toUpperCase() : '👑'}
            </div>
            <p className="text-[10px] font-black mt-2 text-amber-100 drop-shadow">
              {speakers[3] ? `@${speakers[3]}` : '4 👑'}
            </p>
          </div>

          {/* Seat 5 (Normal Sofa seat) */}
          <div className="text-center group shrink-0" onClick={() => handleSeatClick(4)}>
            <div className={`w-[74px] h-[74px] rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-3xl position-relative cursor-pointer transition-all hover:scale-105 border-2 ${
              speakers[4] ? 'border-white/30 text-zinc-200' : 'border-white/10 text-zinc-400 hover:border-white/20'
            } ${talkingUserIndex === 4 || (micActive && speakers[4] === currentUserName) ? 'scale-108 ring-4 ring-cyan-400 shadow-[0_0_20px_#00ffd5] avatar-pulsing' : ''}`}>
              {speakers[4] ? speakers[4].substring(0, 2).toUpperCase() : '🛋'}
            </div>
            <p className="text-[10px] font-black mt-2 text-zinc-400 drop-shadow">
              {speakers[4] ? `@${speakers[4]}` : '5 🛋'}
            </p>
          </div>

        </div>

        {/* ROW 3: Seats 6, 7, 8, 9 (All Normal Sofa seats) */}
        <div className="flex justify-center gap-6 md:gap-10 mb-4 overflow-x-auto no-scrollbar py-2">
          
          {/* Seat 6 */}
          <div className="text-center group shrink-0" onClick={() => handleSeatClick(5)}>
            <div className={`w-[74px] h-[74px] rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-3xl position-relative cursor-pointer transition-all hover:scale-105 border-2 ${
              speakers[5] ? 'border-white/30 text-zinc-200' : 'border-white/10 text-zinc-400 hover:border-white/20'
            } ${talkingUserIndex === 5 || (micActive && speakers[5] === currentUserName) ? 'scale-108 ring-4 ring-cyan-400 shadow-[0_0_20px_#00ffd5] avatar-pulsing' : ''}`}>
              {speakers[5] ? speakers[5].substring(0, 2).toUpperCase() : '🛋'}
            </div>
            <p className="text-[10px] font-black mt-2 text-zinc-400 drop-shadow">
              {speakers[5] ? `@${speakers[5]}` : '6 🛋'}
            </p>
          </div>

          {/* Seat 7 */}
          <div className="text-center group shrink-0" onClick={() => handleSeatClick(6)}>
            <div className={`w-[74px] h-[74px] rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-3xl position-relative cursor-pointer transition-all hover:scale-105 border-2 ${
              speakers[6] ? 'border-white/30 text-zinc-200' : 'border-white/10 text-zinc-400 hover:border-white/20'
            } ${talkingUserIndex === 6 || (micActive && speakers[6] === currentUserName) ? 'scale-108 ring-4 ring-cyan-400 shadow-[0_0_20px_#00ffd5] avatar-pulsing' : ''}`}>
              {speakers[6] ? speakers[6].substring(0, 2).toUpperCase() : '🛋'}
            </div>
            <p className="text-[10px] font-black mt-2 text-zinc-400 drop-shadow">
              {speakers[6] ? `@${speakers[6]}` : '7 🛋'}
            </p>
          </div>

          {/* Seat 8 */}
          <div className="text-center group shrink-0" onClick={() => handleSeatClick(7)}>
            <div className={`w-[74px] h-[74px] rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-3xl position-relative cursor-pointer transition-all hover:scale-105 border-2 ${
              speakers[7] ? 'border-white/30 text-zinc-200' : 'border-white/10 text-zinc-400 hover:border-white/20'
            } ${talkingUserIndex === 7 || (micActive && speakers[7] === currentUserName) ? 'scale-108 ring-4 ring-cyan-400 shadow-[0_0_20px_#00ffd5] avatar-pulsing' : ''}`}>
              {speakers[7] ? speakers[7].substring(0, 2).toUpperCase() : '🛋'}
            </div>
            <p className="text-[10px] font-black mt-2 text-zinc-400 drop-shadow">
              {speakers[7] ? `@${speakers[7]}` : '8 🛋'}
            </p>
          </div>

          {/* Seat 9 */}
          <div className="text-center group shrink-0" onClick={() => handleSeatClick(8)}>
            <div className={`w-[74px] h-[74px] rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-3xl position-relative cursor-pointer transition-all hover:scale-105 border-2 ${
              speakers[8] ? 'border-white/30 text-zinc-200' : 'border-white/10 text-zinc-400 hover:border-white/20'
            } ${talkingUserIndex === 8 || (micActive && speakers[8] === currentUserName) ? 'scale-108 ring-4 ring-cyan-400 shadow-[0_0_20px_#00ffd5] avatar-pulsing' : ''}`}>
              {speakers[8] ? speakers[8].substring(0, 2).toUpperCase() : '🛋'}
            </div>
            <p className="text-[10px] font-black mt-2 text-zinc-400 drop-shadow">
              {speakers[8] ? `@${speakers[8]}` : '9 🛋'}
            </p>
          </div>

        </div>

      </div>

      {/* LEFT MENU (RAIL RAIL) */}
      <div id="roomLeftMenu" className="absolute left-4 top-1/2 -translate-y-1/2 z-25 flex flex-col gap-3">
        <button 
          onClick={() => { setActiveTab('All'); setShowChatPanel(true); }}
          className={`w-14 h-20 rounded-3xl border-0 font-extrabold uppercase transition-all tracking-wider text-xs cursor-pointer shadow-lg active:scale-95 ${
            activeTab === 'All' ? 'bg-[#11d9d2] text-white shadow-[#11d9d2]/30' : 'bg-black/60 text-zinc-400 hover:text-white'
          }`}
        >
          All
        </button>
        <button 
          onClick={() => { setActiveTab('Room'); setShowChatPanel(false); }}
          className={`w-14 h-20 rounded-3xl border-0 font-extrabold uppercase transition-all tracking-wider text-xs cursor-pointer shadow-lg active:scale-95 ${
            activeTab === 'Room' ? 'bg-[#11d9d2] text-white shadow-[#11d9d2]/30' : 'bg-black/60 text-zinc-400 hover:text-white'
          }`}
        >
          Room
        </button>
        <button 
          onClick={() => { setActiveTab('Chat'); setShowChatPanel(true); }}
          className={`w-14 h-20 rounded-3xl border-0 font-extrabold uppercase transition-all tracking-wider text-xs cursor-pointer shadow-lg active:scale-95 ${
            activeTab === 'Chat' ? 'bg-[#11d9d2] text-white shadow-[#11d9d2]/30' : 'bg-black/60 text-zinc-400 hover:text-white'
          }`}
        >
          Chat
        </button>
      </div>

      {/* RIGHT ACTION ICONS */}
      <div id="roomRightMenu" className="absolute right-4 top-1/2 -translate-y-1/2 z-25 flex flex-col gap-3">
        <button 
          title="Battle"
          className="w-14 h-14 rounded-2xl bg-white/10 hover:bg-white/15 text-white flex items-center justify-center font-extrabold text-2xl cursor-pointer border-0 transition-transform active:scale-90"
        >
          ⚔
        </button>
        <button 
          title="Gifts"
          onClick={() => setShowGifting(true)}
          className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 shadow-md text-slate-900 flex items-center justify-center font-extrabold text-2xl cursor-pointer border-0 transition-transform active:scale-90"
        >
          🎁
        </button>
        <button 
          title="Wallet"
          className="w-14 h-14 rounded-2xl bg-white/10 hover:bg-white/15 text-yellow-400 flex items-center justify-center font-extrabold text-2xl cursor-pointer border-0 transition-transform active:scale-90"
        >
          💰
        </button>
      </div>

      {/* SYSTEM NOTICE BANNER */}
      <div id="roomWelcomeNotice" className="absolute left-6 right-6 md:left-24 md:right-24 bottom-32 z-10 bg-black/55 backdrop-blur-md border border-white/5 rounded-2xl p-4">
        <h3 className="text-red-500 font-extrabold text-xs uppercase tracking-widest mb-1.5 flex items-center gap-1">
          📢 Welcome to Barca-Live
        </h3>
        <p className="text-zinc-300 text-[10.5px] font-medium leading-relaxed">
          Welcome to Barca-live voice room. Open your microphone and start talking with your friends live. Keep conversations respectful and follow community rules.
        </p>
      </div>

      {/* CHAT CHANT PANEL OVERLAY (If chat is visible via bottom bar toggle or buttons) */}
      <AnimatePresence>
        {showChatPanel && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="absolute left-6 md:left-24 bottom-52 z-30 max-w-sm w-full bg-black/60 border border-white/10 rounded-[2rem] overflow-hidden flex flex-col justify-between max-h-[180px] shadow-2xl backdrop-blur-xl"
          >
            <div ref={msgScrollRef} className="flex-1 p-4 overflow-y-auto space-y-2 no-scrollbar max-h-[120px]">
              {combinedMessages.map(msg => (
                <div key={msg.id} className="text-left text-[11px] leading-snug">
                  <span className={`${msg.sender === 'System_Bot_Live' ? 'text-cyan-400' : 'text-amber-400'} font-bold block`}>@{msg.sender}</span>
                  <span className="text-zinc-200">{msg.text}</span>
                </div>
              ))}
            </div>

            <form onSubmit={handleSendMessage} className="p-2 border-t border-white/5 bg-black/40 flex items-center gap-2">
              <input 
                type="text" 
                value={newMsg} 
                onChange={(e) => setNewMsg(e.target.value)} 
                placeholder="Type inside room chat..."
                className="bg-black/40 border border-white/10 rounded-full px-3 py-1.5 text-[10px] text-white outline-none flex-1 focus:border-cyan-400 transition-colors"
              />
              <button type="submit" className="bg-cyan-500 hover:bg-cyan-600 text-white rounded-full p-2 border-0 cursor-pointer active:scale-90">
                <Send className="w-3 h-3" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* BOTTOM CONTROL NAVIGATION BAR */}
      <div id="roomBottomControls" className="relative z-10 px-6 py-4 flex items-center justify-between bg-black/45 backdrop-blur-lg border-t border-white/5">
        
        {/* Large Premium Main Mic Toggle Button */}
        <button 
          onClick={toggleMic} 
          className={`mic-btn w-16 h-16 rounded-full flex items-center justify-center border-0 text-3xl font-extrabold cursor-pointer transition-all shadow-xl shadow-red-500/20 active:scale-95 ${
            micActive ? 'active bg-[#00c853] text-white shadow-emerald-500/30 font-bold micStatePulse' : 'bg-[#ff004c] text-white'
          }`}
          style={{
            animation: micActive ? 'micPulse 1.2s infinite' : 'none'
          }}
        >
          {micActive ? '🔊' : '🎤'}
        </button>

        {/* Pulse Animations script helper styling inside button */}
        <style>{`
          @keyframes micPulse {
            0% { transform: scale(1); box-shadow: 0 0 10px rgba(0, 200, 83, 0.4); }
            50% { transform: scale(1.08); box-shadow: 0 0 25px rgba(0, 200, 83, 0.7); }
            100% { transform: scale(1); box-shadow: 0 0 10px rgba(0, 200, 83, 0.4); }
          }
        `}</style>

        {/* Right side extra shortcuts */}
        <div className="flex gap-2.5">
          <div 
            title="Play Game" 
            className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/15 text-white flex items-center justify-center text-xl cursor-pointer backdrop-blur-md border border-white/5 active:scale-90 transition-transform"
          >
            🎮
          </div>
          <div 
            title="Toggle Chat"
            onClick={() => setShowChatPanel(!showChatPanel)}
            className={`w-12 h-12 rounded-full text-white flex items-center justify-center text-xl cursor-pointer backdrop-blur-md border active:scale-90 transition-transform ${
              showChatPanel ? 'bg-cyan-500/20 border-cyan-400' : 'bg-white/10 border-white/5 hover:bg-white/15'
            }`}
          >
            💬
          </div>
          <div 
            title="Send Gift"
            onClick={() => setShowGifting(true)}
            className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/15 text-white flex items-center justify-center text-xl cursor-pointer backdrop-blur-md border border-white/5 active:scale-90 transition-transform"
          >
            🎁
          </div>
          <div 
            title="Rules"
            onClick={() => setShowRules(true)}
            className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/15 text-white flex items-center justify-center text-xl cursor-pointer backdrop-blur-md border border-white/5 active:scale-90 transition-transform"
          >
            ☰
          </div>
        </div>
      </div>

      {/* Rules Modal (If expanded rules/status requested) */}
      <AnimatePresence>
        {showRules && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-white/15 p-6 rounded-3xl max-w-sm w-full shadow-2xl"
            >
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-amber-400 font-extrabold text-sm uppercase tracking-wide">Community Guidelines</h3>
                <button onClick={() => setShowRules(false)} className="text-zinc-400 hover:text-white bg-transparent border-0 cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <ul className="space-y-3 text-zinc-300 text-xs list-disc list-inside">
                <li>Respect all room participants and the active host.</li>
                <li>Hate speech, discrimination, and bullying are strictly banned.</li>
                <li>No spamming or disruptive audio broadcasting.</li>
                <li>Follow the safety instructions of the live moderators.</li>
              </ul>
              <button 
                onClick={() => setShowRules(false)}
                className="w-full mt-6 bg-gradient-to-tr from-amber-400 to-orange-500 text-slate-900 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider border-0 cursor-pointer"
              >
                Understood & Agree
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Gifting panel Component overlay */}
      <AnimatePresence>
        {showGifting && (
          <Gifts 
            onClose={() => setShowGifting(false)} 
            onGiftSent={(giftIcon) => {
              handleTriggerFloatingGift(giftIcon);
              // append custom system notification
              const sender = auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'User';
              setChatMessages(prev => [...prev, {
                id: Math.random().toString(),
                sender: 'System_Bot_Live',
                text: `🎉 @${sender} gifted ${giftIcon} to the Voice Stage!`,
                timestamp: new Date()
              }]);
            }} 
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

