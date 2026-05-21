import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Users, Clock, AlertCircle, Bell, BellOff, Volume2, VolumeX, Hourglass, CheckCircle2, Sparkles, Activity } from 'lucide-react';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, onSnapshot } from 'firebase/firestore';

// Web synth dual-tone modern notification chime player
const playChime = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;
    
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now); // C5
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
    
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(659.25, now); // E5
    osc2.frequency.exponentialRampToValueAtTime(1046.50, now + 0.15); // C6
    
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.2, now + 0.05);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
    
    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc1.start(now);
    osc2.start(now);
    
    osc1.stop(now + 0.9);
    osc2.stop(now + 0.9);
  } catch (err) {
    console.warn("Audio chime block fallback:", err);
  }
};

const triggerBrowserNotification = (title: string, options?: NotificationOptions) => {
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, options);
    } catch (e) {
      console.warn("Did not trigger standard Notification constructor:", e);
    }
  }
};

export default function WaitlistModal({ room, onClose }: { room: any, onClose: () => void }) {
  const [waitlist, setWaitlist] = React.useState<any[]>([]);
  const [position, setPosition] = React.useState<number | null>(null);
  const [isJoining, setIsJoining] = React.useState(false);

  // Advanced Alert States
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [audioEnabled, setAudioEnabled] = React.useState(true);
  const [alertTriggered, setAlertTriggered] = React.useState(false);
  const [isSimulated, setIsSimulated] = React.useState(false);
  const [simulatedWaitlist, setSimulatedWaitlist] = React.useState<any[]>([]);
  
  const chimePlayedRef = React.useRef(false);

  // Initialize and check database vs simulation
  React.useEffect(() => {
    const isMock = !room || !room.id || room.id.startsWith('room_');
    setIsSimulated(isMock);

    if (isMock) {
      // Seed rich virtual entries so user has something ahead of them
      const mockPeers = [
        { userId: 'sim_1', name: 'Sandro Rosell', joinedAt: new Date(Date.now() - 60000).toISOString() },
        { userId: 'sim_2', name: 'Xavi H.', joinedAt: new Date(Date.now() - 45000).toISOString() },
        { userId: 'sim_3', name: 'Dani Alves', joinedAt: new Date(Date.now() - 30000).toISOString() },
        { userId: 'sim_4', name: 'Carles Puyol', joinedAt: new Date(Date.now() - 15000).toISOString() }
      ];
      setSimulatedWaitlist(mockPeers);
      setWaitlist(mockPeers);
    } else {
      // Dynamic real-time listening for database room queues
      const unsub = onSnapshot(doc(db, 'rooms', room.id), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          const currentWaitlist = data.waitlist || [];
          setWaitlist(currentWaitlist);
          
          if (auth.currentUser) {
            const myIndex = currentWaitlist.findIndex((w: any) => w.userId === auth.currentUser?.uid);
            if (myIndex !== -1) {
              setPosition(myIndex + 1);
            } else {
              setPosition(null);
            }
          }
        }
      });
      return () => unsub();
    }
  }, [room]);

  // Handle active position check and trigger next-in-line chime/pings
  React.useEffect(() => {
    if (position === 1 && !chimePlayedRef.current) {
      chimePlayedRef.current = true;
      setAlertTriggered(true);

      // Web Audio sound tone
      if (audioEnabled) {
        playChime();
      }

      // Modern OS Web Notifications push alert
      if (notificationsEnabled) {
        if ("Notification" in window) {
          if (Notification.permission === "default") {
            Notification.requestPermission().then(permission => {
              if (permission === 'granted') {
                triggerBrowserNotification("🎁 You are next in line!", {
                  body: `Your seat in "${room.title || 'the lounge'}" is now ready! Claim it immediately.`,
                  tag: "waitlist-ready"
                });
              }
            });
          } else if (Notification.permission === "granted") {
            triggerBrowserNotification("🎁 You are next in line!", {
              body: `Your seat in "${room.title || 'the lounge'}" is now ready! Claim it immediately.`,
              tag: "waitlist-ready"
            });
          }
        }
      }
    } else if (position === null || position > 1) {
      chimePlayedRef.current = false;
      setAlertTriggered(false);
    }
  }, [position, audioEnabled, notificationsEnabled, room.title]);

  // Simulated queue ticking effect
  React.useEffect(() => {
    if (!isSimulated || position === null) return;

    // Shift queue members every 10 seconds to showcase live movement in mock envs
    const queueInterval = setInterval(() => {
      setSimulatedWaitlist((prev) => {
        if (prev.length <= 1) return prev; // Keep the active user in line
        const shifted = prev.slice(1);
        setWaitlist(shifted);
        
        const myUid = auth.currentUser?.uid || 'guest_user';
        const myIndex = shifted.findIndex(w => w.userId === myUid);
        if (myIndex !== -1) {
          setPosition(myIndex + 1);
        } else {
          setPosition(null);
        }
        return shifted;
      });
    }, 10000);

    return () => clearInterval(queueInterval);
  }, [isSimulated, position]);

  const handleJoinWaitlist = async () => {
    setIsJoining(true);
    // Mimic secure connection latency
    await new Promise(resolve => setTimeout(resolve, 600));

    if (isSimulated) {
      const myUid = auth.currentUser?.uid || 'guest_user';
      const myName = auth.currentUser?.displayName || 'Guest User';
      const newEntry = {
        userId: myUid,
        name: myName,
        joinedAt: new Date().toISOString()
      };
      const updated = [...simulatedWaitlist, newEntry];
      setSimulatedWaitlist(updated);
      setWaitlist(updated);
      setPosition(updated.length);
      setIsJoining(false);
      return;
    }

    if (!auth.currentUser || !room.id) return;
    try {
      await updateDoc(doc(db, 'rooms', room.id), {
        waitlist: arrayUnion({
          userId: auth.currentUser.uid,
          name: auth.currentUser.displayName || 'Guest',
          joinedAt: new Date().toISOString()
        })
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${room.id}`);
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveWaitlist = async () => {
    setIsJoining(true);
    await new Promise(resolve => setTimeout(resolve, 400));

    if (isSimulated) {
      const myUid = auth.currentUser?.uid || 'guest_user';
      const filtered = simulatedWaitlist.filter(w => w.userId !== myUid);
      setSimulatedWaitlist(filtered);
      setWaitlist(filtered);
      setPosition(null);
      setIsJoining(false);
      chimePlayedRef.current = false;
      setAlertTriggered(false);
      return;
    }

    if (!auth.currentUser || !room.id) return;
    try {
      const myEntry = waitlist.find((w: any) => w.userId === auth.currentUser?.uid);
      if (myEntry) {
         await updateDoc(doc(db, 'rooms', room.id), {
           waitlist: arrayRemove(myEntry)
         });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${room.id}`);
    } finally {
      setIsJoining(false);
    }
  };

  const toggleBrowserNotifications = async () => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      const perm = await Notification.requestPermission();
      setNotificationsEnabled(perm === "granted");
    } else {
      setNotificationsEnabled(!notificationsEnabled);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md" onClick={onClose} />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.93, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.93, y: 15 }}
        className="relative w-full max-w-md bg-zinc-950 border border-zinc-805 rounded-[2.5rem] p-6 shadow-2xl overflow-hidden text-left"
      >
        {/* Glow backdrop design */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-amber-400/5 rounded-full blur-[60px]" />
        
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 p-2.5 bg-zinc-900/80 hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-white transition-all cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center justify-center text-center mt-3 mb-6">
          <div className="w-14 h-14 bg-amber-400/10 rounded-2xl flex items-center justify-center mb-4 border border-amber-400/25 relative">
            <Users className="w-6 h-6 text-amber-400" />
            <div className="absolute -bottom-1 -right-1 w-4.5 h-4.5 bg-zinc-950 border border-zinc-800 rounded-full flex items-center justify-center">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
            </div>
          </div>
          <h2 className="text-xl font-black text-white italic uppercase tracking-tighter mb-1.5 flex items-center gap-2">
            Queue Gate
          </h2>
          <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest max-w-xs mx-auto leading-normal">
            {room.title} Is full • Verified Queue Line
          </p>
        </div>

        {position !== null ? (
          <div className="space-y-4 text-left">
            {/* ALERT BOX WHEN NEXT IN LINE */}
            <AnimatePresence>
              {alertTriggered && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-emerald-500/15 border border-emerald-500/30 rounded-2xl p-4 text-left flex items-start gap-3 shadow-lg shadow-emerald-500/5 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent pointer-events-none animate-pulse-slow" />
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 relative">
                    <Sparkles className="w-4 h-4 animate-spin-slow" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">You are next in line!</h4>
                    <p className="text-[9px] text-zinc-400 font-bold uppercase tracking-wide leading-relaxed mt-0.5">
                      Your seat is opening up right now. Prepare to automatically claim with AI Live handshakes!
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* PROGRESS AND TIME INDICATOR CONTAINER */}
            <div className="bg-zinc-900 border border-zinc-805 rounded-2xl p-5 relative overflow-hidden flex flex-col items-center">
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-zinc-955 border border-zinc-800/80 rounded-lg px-2 py-0.5 text-[7px] font-black uppercase text-zinc-500 tracking-widest">
                <Activity className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                <span>Live Feed</span>
              </div>

              <div className="flex items-center gap-6 w-full justify-around py-2 text-center">
                {/* Radial visual ring */}
                <div className="relative w-20 h-20 flex items-center justify-center bg-zinc-955 rounded-full border border-zinc-850 shadow-inner">
                  {/* Outer circle layout */}
                  <div className="flex flex-col items-center">
                    <p className="text-[7px] font-black text-zinc-500 uppercase tracking-widest leading-none">Position</p>
                    <span className="text-3xl font-black text-amber-400 tracking-tighter mt-1">{position}</span>
                    <span className="text-[8px] font-bold text-zinc-500 leading-none">of {waitlist.length}</span>
                  </div>
                </div>

                {/* Estimate Detail Gauge */}
                <div className="flex-1 max-w-[160px] flex flex-col items-start text-left space-y-2">
                  <div className="flex items-start gap-1.5 justify-start">
                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-[8px] font-black text-zinc-400 uppercase tracking-widest leading-none">ESTIMATED WAIT</h4>
                      <p className="text-[12px] font-black text-amber-400 uppercase tracking-tight leading-none mt-1.5">
                        ~{Math.max(1, position * 1.5).toFixed(0)} MINS
                      </p>
                    </div>
                  </div>
                  <div className="h-[1px] w-full bg-zinc-800/60" />
                  <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-wide leading-relaxed">
                    Fast Lane active. Average peer rotation is 90s.
                  </p>
                </div>
              </div>
            </div>

            {/* NOTIFICATION CHANNELS CONTROLS */}
            <div className="bg-zinc-955 border border-zinc-900 rounded-2xl p-4 space-y-3">
              <p className="text-[8px] font-black text-zinc-500 uppercase tracking-wider text-left border-b border-zinc-900 pb-1.5.5">
                ALERT NOTIFICATION CHANNELS
              </p>
              
              <div className="grid grid-cols-2 gap-2 text-left">
                {/* Browser Push alerts button */}
                <button
                  type="button"
                  onClick={toggleBrowserNotifications}
                  className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-2.5 flex items-center gap-2 hover:bg-zinc-855 transition-colors text-left w-full cursor-pointer"
                >
                  {notificationsEnabled ? (
                    <Bell className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-bounce-slow" />
                  ) : (
                    <BellOff className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-[8px] font-black uppercase text-zinc-300 tracking-wide leading-none">Push Alert</p>
                    <p className="text-[7px] font-bold uppercase text-zinc-500 tracking-normal mt-1 leading-none">
                      {notificationsEnabled ? "Active" : "Disabled"}
                    </p>
                  </div>
                </button>

                {/* Local audio chime toggle */}
                <button
                  type="button"
                  onClick={() => setAudioEnabled(!audioEnabled)}
                  className="bg-zinc-900 border border-zinc-800/80 rounded-xl p-2.5 flex items-center gap-2 hover:bg-zinc-855 transition-colors text-left w-full cursor-pointer"
                >
                  {audioEnabled ? (
                    <Volume2 className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className="text-[8px] font-black uppercase text-zinc-300 tracking-wide leading-none">Audio Chime</p>
                    <p className="text-[7px] font-bold uppercase text-zinc-500 tracking-normal mt-1 leading-none">
                      {audioEnabled ? "Armed" : "Silent"}
                    </p>
                  </div>
                </button>
              </div>

              <div className="bg-zinc-90 w-full rounded-xl p-2 flex items-center gap-2 justify-start border border-dashed border-zinc-850">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="text-[7px] font-bold uppercase text-zinc-400 tracking-wide">
                  Background Syncing with Active Lounge Handshakes
                </span>
              </div>
            </div>

            {/* LEAVE BUTTON */}
            <button 
              onClick={handleLeaveWaitlist}
              disabled={isJoining}
              className="w-full bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/20 py-3.5 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] transition-all duration-200 disabled:opacity-50 cursor-pointer"
            >
              Leave Waitlist Setup
            </button>
          </div>
        ) : (
          <div className="space-y-4 text-left">
            <div className="bg-zinc-900/50 rounded-2xl p-4 flex items-start gap-3 border border-zinc-805 text-left">
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-left">
                 <h4 className="text-xs font-black text-white uppercase tracking-wider mb-1">Interactive Queue Gate</h4>
                 <p className="text-[9px] text-zinc-400 uppercase tracking-wide leading-relaxed font-bold">
                   When a seat becomes available, the next person on the waitlist will be given a chance to join. Enable alert sound & notifications to stay updated!
                 </p>
              </div>
            </div>
            
            <button
              onClick={handleJoinWaitlist}
              disabled={isJoining}
              className="w-full bg-amber-400 hover:bg-amber-300 text-black font-black uppercase tracking-widest text-[10px] py-4 rounded-2xl transition-all shadow-xl shadow-amber-400/10 active:scale-95 disabled:opacity-50 cursor-pointer text-center"
            >
              {isJoining ? 'REGISTERING TICKET...' : 'SECURE QUEUE POSITION / JOIN WAITLIST'}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
