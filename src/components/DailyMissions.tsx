import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Coins, CheckCircle2, Flame, Trophy, Waves, MessageSquare, Loader2, Sparkles, Check, X } from 'lucide-react';
import { db, auth } from './firebase';
import { doc, onSnapshot, updateDoc, increment } from 'firebase/firestore';

interface Mission {
  id: string;
  title: string;
  description: string;
  reward: number;
  target: number;
  icon: React.ElementType;
  iconColor: string;
  bgGradient: string;
}

const MISSIONS: Mission[] = [
  {
    id: "kill10",
    title: "Daily Fish Harvest",
    description: "Catch 10 fish in our interactive Fishing Game",
    reward: 500,
    target: 10,
    icon: Waves,
    iconColor: "text-sky-400",
    bgGradient: "from-sky-500/10 via-zinc-900 to-zinc-900"
  },
  {
    id: "boss",
    title: "Abyssal Giant Slayer",
    description: "Snare the rare legendary Boss Fish from the deep sea",
    reward: 5000,
    target: 1,
    icon: Trophy,
    iconColor: "text-amber-400",
    bgGradient: "from-amber-500/10 via-zinc-900 to-zinc-900"
  },
  {
    id: "room",
    title: "Broadcasting Resident",
    description: "Host or speak inside a room session for 30 minutes",
    reward: 1000,
    target: 30,
    icon: MessageSquare,
    iconColor: "text-purple-400",
    bgGradient: "from-purple-500/10 via-zinc-900 to-zinc-900"
  }
];

export default function DailyMissions() {
  const currentUserId = auth.currentUser?.uid;
  const [profile, setProfile] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [claimingId, setClaimingId] = React.useState<string | null>(null);
  const [activeConfirmId, setActiveConfirmId] = React.useState<string | null>(null);
  const [claimedList, setClaimedList] = React.useState<Record<string, boolean>>({});

  // Dynamic user tracking states or simulated progress fallbacks if fields are unpopulated
  const [progressValues, setProgressValues] = React.useState<Record<string, number>>({
    kill10: 0,
    boss: 0,
    room: 0
  });

  React.useEffect(() => {
    if (!currentUserId) return;

    // Real-time synchronization of user progress metadata
    const unsub = onSnapshot(doc(db, 'users', currentUserId), (snap) => {
      setLoading(false);
      if (snap.exists()) {
        const data = snap.data();
        setProfile(data);
        
        // Match progress metrics from Firestore document properties or safe defaults
        setProgressValues({
          kill10: data.fishCaughtToday || 0,
          boss: data.bossFishCaughtToday ? 1 : 0,
          room: data.minutesHostingToday || 0
        });

        // Initialize state of claimed missions for the current day
        const todayStr = new Date().toISOString().split('T')[0];
        const claimedObj: Record<string, boolean> = {};
        if (data.claimedMissions && data.claimedMissions[todayStr]) {
          data.claimedMissions[todayStr].forEach((mId: string) => {
            claimedObj[mId] = true;
          });
        }
        setClaimedList(claimedObj);
      }
    }, (error) => {
      console.error("Error loading user in Daily Missions:", error);
      setLoading(false);
    });

    return () => unsub();
  }, [currentUserId]);

  const handleClaim = async (missionId: string) => {
    if (!currentUserId) return;
    setClaimingId(missionId);

    try {
      const res = await fetch("/api/claimMission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: currentUserId,
          missionId
        })
      });

      const data = await res.json();
      if (data.success) {
        // Record claim in user's profile under claimedMissions.YYYY-MM-DD
        const todayStr = new Date().toISOString().split('T')[0];
        const userRef = doc(db, 'users', currentUserId);
        
        const existingClaimed = profile?.claimedMissions?.[todayStr] || [];
        const updatedClaimed = [...new Set([...existingClaimed, missionId])];

        await updateDoc(userRef, {
          [`claimedMissions.${todayStr}`]: updatedClaimed
        });

        alert(`Success! Claimed +${data.reward.toLocaleString()} Coins for completing "${MISSIONS.find(m => m.id === missionId)?.title}"`);
      } else {
        throw new Error(data.message || "Failed to claim reward through server API");
      }
    } catch (error) {
      console.error("Claiming mission failed:", error);
      alert(error instanceof Error ? error.message : "Error claiming mission.");
    } finally {
      setClaimingId(null);
    }
  };

  /**
   * Safe interactive simulator for testing these specific backend tasks
   * directly within the UI if needed
   */
  const handleSimulateAction = async (metricKey: string, incrementValue: number, isBoss = false) => {
    if (!currentUserId) return;
    try {
      const userRef = doc(db, 'users', currentUserId);
      if (isBoss) {
        await updateDoc(userRef, {
          bossFishCaughtToday: true
        });
      } else {
        await updateDoc(userRef, {
          [metricKey]: increment((profile?.[metricKey] || 0) + incrementValue >= 100 ? 0 : incrementValue)
        });
      }
    } catch (err) {
      console.error("Simulation increment error:", err);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center flex flex-col items-center justify-center gap-2 text-zinc-500">
        <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
        <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Loading Daily Missions...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="daily-missions">
      <div className="p-5 rounded-[2rem] border bg-gradient-to-br from-amber-950/10 via-zinc-900 to-zinc-900 border-amber-500/20 shadow-xl shadow-amber-950/5 text-left">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-400 fill-amber-400/20 animate-pulse" />
              <h3 className="text-white font-black italic uppercase text-sm tracking-tight flex items-center gap-2">
                Daily Core Missions
              </h3>
            </div>
            <p className="text-zinc-500 text-[10px] font-semibold leading-relaxed max-w-[420px] uppercase">
              Earn high yield rewards by playing matches and hosting rooms on Barca-live! Claiming executes directly over safe state endpoints.
            </p>
          </div>
          <div className="bg-zinc-950/80 border border-zinc-850 px-4 py-2 rounded-xl flex items-center gap-2.5">
            <Coins className="w-4 h-4 text-amber-400" />
            <div>
              <p className="text-[7.5px] text-zinc-500 font-bold uppercase tracking-widest leading-none">Your Balance</p>
              <span className="text-xs font-black text-white font-mono">{(profile?.coins || 0).toLocaleString()} <span className="text-amber-400 text-[8px]">COINS</span></span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {MISSIONS.map((mission) => {
          const progress = Math.min(progressValues[mission.id] || 0, mission.target);
          const isCompleted = progress >= mission.target;
          const isClaimed = claimedList[mission.id] || false;
          const IconComponent = mission.icon;

          return (
            <div
              key={mission.id}
              className={`p-5 rounded-[2.5rem] border transition-all duration-300 flex flex-col justify-between space-y-4 text-left ${
                isClaimed 
                  ? "border-green-500/20 bg-green-500/5 opacity-80" 
                  : "bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:translate-y-[-2px] shadow-lg"
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className={`p-3 rounded-2xl bg-zinc-950/60 border border-zinc-850 ${mission.iconColor}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1 text-amber-400 font-black italic">
                      <Coins className="w-3 h-3" />
                      <span>+{mission.reward.toLocaleString()}</span>
                    </div>
                    <span className="text-zinc-650 text-[8px] font-black uppercase tracking-widest block font-mono">COINS</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="text-white font-black uppercase text-xs tracking-wide">{mission.title}</h4>
                  <p className="text-zinc-500 text-[9.5px] font-medium leading-relaxed">{mission.description}</p>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[8px] font-black uppercase text-zinc-500 tracking-wider">
                    <span>{isClaimed ? "Complete" : isCompleted ? "Ready to claim" : "Progress"}</span>
                    <span className="font-mono text-zinc-400">{progress} / {mission.target}</span>
                  </div>
                  <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full ${isClaimed ? 'bg-green-500' : isCompleted ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.3)]' : 'bg-sky-400'}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${(progress / mission.target) * 100}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>

                {isClaimed ? (
                  <div className="w-full bg-green-500/10 border border-green-500/15 text-green-400 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest text-center flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Reward Claimed ✓
                  </div>
                ) : isCompleted ? (
                  activeConfirmId === mission.id ? (
                    <div className="space-y-2.5 p-3.5 bg-zinc-950/60 border border-amber-500/20 rounded-2xl">
                      <p className="text-[10px] uppercase tracking-wider font-extrabold text-amber-300 text-center animate-pulse flex items-center justify-center gap-1 w-full shrink-0">
                        ⚠️ Claim +{mission.reward} Coins?
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            handleClaim(mission.id);
                            setActiveConfirmId(null);
                          }}
                          disabled={claimingId !== null}
                          className="flex-1 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black py-2.5 rounded-xl uppercase tracking-widest text-[8.5px] transition-all cursor-pointer flex items-center justify-center gap-1 shadow-md shadow-emerald-500/10 border-0"
                        >
                          <Check className="w-3 h-3" />
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveConfirmId(null)}
                          disabled={claimingId !== null}
                          className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-extrabold py-2.5 rounded-xl uppercase tracking-widest text-[8.5px] transition-all cursor-pointer flex items-center justify-center gap-1 border border-zinc-700"
                        >
                          <X className="w-3 h-3" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveConfirmId(mission.id)}
                      disabled={claimingId !== null}
                      className="w-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black py-3 rounded-xl uppercase tracking-widest text-[9.5px] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-amber-400/10 hover:scale-[1.01] border-0"
                    >
                      {claimingId === mission.id ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Executing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 fill-black/10 animate-pulse" />
                          Claim reward
                        </>
                      )}
                    </button>
                  )
                ) : (
                  <div className="flex flex-col gap-2">
                    <div className="w-full bg-zinc-950 border border-zinc-850 text-zinc-500 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest text-center">
                      Locked ({progress}/{mission.target})
                    </div>
                    
                    {/* Simulator Action Controls for direct testing of each action */}
                    <div className="flex justify-center items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (mission.id === 'kill15' || mission.id === 'kill10') {
                            handleSimulateAction('fishCaughtToday', 1);
                          } else if (mission.id === 'boss') {
                            handleSimulateAction('bossFishCaughtToday', 1, true);
                          } else if (mission.id === 'room') {
                            handleSimulateAction('minutesHostingToday', 5);
                          }
                        }}
                        className="text-[7.5px] bg-zinc-950/60 hover:bg-zinc-800 text-zinc-500 hover:text-white px-2.5 py-1 border border-zinc-850 hover:border-zinc-700 rounded-lg uppercase font-bold tracking-wider cursor-pointer"
                      >
                        + Simulate Task
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
