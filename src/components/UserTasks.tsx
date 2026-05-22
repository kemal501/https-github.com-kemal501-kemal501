import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, ShieldCheck, Timer, Coins, Camera, ArrowRight, UserPlus, Star, Info, Zap, Loader2, History, TrendingUp, ArrowUpRight, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc, setDoc, serverTimestamp, increment, getDoc, collection, addDoc, onSnapshot } from 'firebase/firestore';
import FaceVerification from './FaceVerification';

interface Task {
  id: string;
  title: string;
  description: string;
  reward: number;
  progress: number;
  target: number;
  type: 'onboarding' | 'daily';
  status: 'locked' | 'available' | 'in-progress' | 'completed';
}

export default function UserTasks() {
  const [isFaceVerified, setIsFaceVerified] = React.useState(false);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [isFaceModalOpen, setIsFaceModalOpen] = React.useState(false);
  const [claimingId, setClaimingId] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<'all' | 'available' | 'in-progress' | 'completed' | 'locked'>('all');
  const [earningsSort, setEarningsSort] = React.useState<{ field: 'date' | 'amount', order: 'asc' | 'desc' }>({ field: 'date', order: 'desc' });
  const [registrationDate, setRegistrationDate] = React.useState<Date>(new Date());
  const isNewUser = (new Date().getTime() - registrationDate.getTime()) < (8 * 24 * 60 * 60 * 1000);

  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [userCoins, setUserCoins] = React.useState(0);
  const [minutesInRoom, setMinutesInRoom] = React.useState(0);

  const [sitRewardState, setSitRewardState] = React.useState({
    durationSeconds: 0,
    claimedHalf: false,
    claimedFull: false
  });
  const todayStr = React.useMemo(() => new Date().toISOString().split('T')[0], []);

  React.useEffect(() => {
    if (!auth.currentUser) return;
    const sitRef = doc(db, 'users', auth.currentUser.uid, 'sitting_rewards', todayStr);
    const unsub = onSnapshot(sitRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSitRewardState({
          durationSeconds: data.durationSeconds || 0,
          claimedHalf: data.claimedHalf || false,
          claimedFull: data.claimedFull || false
        });
      } else {
        setSitRewardState({
          durationSeconds: 0,
          claimedHalf: false,
          claimedFull: false
        });
      }
    });
    return () => unsub();
  }, [todayStr]);

  const claimTasksSittingReward = async (isHalf: boolean) => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const typeStr = isHalf ? 'half' : 'full';
    
    setClaimingId(`sit-${typeStr}`);
    
    try {
      const sitRef = doc(db, 'users', userId, 'sitting_rewards', todayStr);
      
      const snap = await getDoc(sitRef);
      const data = snap.data() || {};
      if (isHalf && data.claimedHalf) return;
      if (!isHalf && data.claimedFull) return;

      const rewardCoins = isNewUser
        ? 10000000
        : 5000000;

      await setDoc(sitRef, {
        [isHalf ? 'claimedHalf' : 'claimedFull']: true,
        durationSeconds: sitRewardState.durationSeconds,
        lastUpdated: serverTimestamp()
      }, { merge: true });

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        coins: increment(rewardCoins)
      });

      await addDoc(collection(db, 'users', userId, 'transactions'), {
        type: 'reward',
        amount: rewardCoins,
        description: `Claimed Sit & Earn (${isHalf ? '1 Hour' : '2 Hours'} milestone) as ${isNewUser ? 'New User' : 'Established User'}`,
        createdAt: serverTimestamp(),
        status: 'completed'
      });

      alert(`Success! Deposited +${rewardCoins.toLocaleString()} Coins directly into your balance.`);
    } catch (err) {
      console.error("Error claiming reward", err);
    } finally {
      setClaimingId(null);
    }
  };

  React.useEffect(() => {
    if (!auth.currentUser) return;

    // Listen to user coins and registration
    const unsubUser = onSnapshot(doc(db, 'users', auth.currentUser.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setUserCoins(data.coins || 0);
        setIsFaceVerified(data.isFaceVerified || false);
        setMinutesInRoom(data.minutesInRoomToday || 0);
        if (data.createdAt) {
          setRegistrationDate(data.createdAt.toDate());
        }
      }
    });

    // Listen to tasks
    const tasksRef = collection(db, 'tasks');
    const unsubTasks = onSnapshot(tasksRef, async (snap) => {
      const allTasks = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      
      // Check completions for each task
      const tasksWithStatus = await Promise.all(allTasks.map(async (task) => {
        const completionRef = doc(db, 'users', auth.currentUser!.uid, 'task_completions', task.id);
        const completionSnap = await getDoc(completionRef);
        
        let status = task.status;
        let progress = task.progress || 0;

        if (task.id === 'engagement') {
          progress = minutesInRoom;
        }

        if (completionSnap.exists()) {
          status = 'completed';
          progress = task.target;
        } else if (task.id === 'engagement' && !isFaceVerified) {
          status = 'locked';
        }

        return {
          ...task,
          status,
          progress
        } as Task;
      }));

      // Add local default tasks if they don't exist in DB yet
      const defaultTasks: Task[] = [
        {
          id: 'daily-bonus',
          title: 'Daily Bonus',
          description: 'Claim your daily free coins!',
          reward: 500,
          progress: 0,
          target: 1,
          type: 'daily',
          status: 'available'
        },
        {
          id: 'engagement',
          title: 'Active Host/Listener',
          description: 'Stay active in room for 1 hour.',
          reward: isNewUser ? 2000 : 1000,
          progress: minutesInRoom,
          target: 60,
          type: 'daily',
          status: isFaceVerified ? 'available' : 'locked'
        }
      ];

      // Merge and filter
      const merged = [...tasksWithStatus];
      defaultTasks.forEach(dt => {
        if (!merged.find(m => m.id === dt.id)) merged.push(dt);
      });

      setTasks(merged);
    });

    return () => {
      unsubUser();
      unsubTasks();
    };
  }, [isFaceVerified, minutesInRoom]);

  const claimReward = async (task: Task) => {
    if (!auth.currentUser) return;
    setClaimingId(task.id);
    const userId = auth.currentUser.uid;
    
    try {
      // Check if already claimed today for certain tasks
      const completionRef = doc(db, 'users', userId, 'task_completions', task.id);
      const completionSnap = await getDoc(completionRef);
      
      if (completionSnap.exists()) {
        const data = completionSnap.data();
        const lastClaimed = data.completedAt?.toDate();
        const today = new Date();
        if (lastClaimed && lastClaimed.toDateString() === today.toDateString()) {
           // If it's a non-recurring task or already claimed today
           return;
        }
      }

      await setDoc(completionRef, {
        completedAt: serverTimestamp(),
        rewardClaimed: task.reward
      });

      await updateDoc(doc(db, 'users', userId), {
        coins: increment(task.reward)
      });

      // Record transaction
      await addDoc(collection(db, 'users', userId, 'transactions'), {
        type: 'reward',
        amount: task.reward,
        description: `Completed: ${task.title}`,
        createdAt: serverTimestamp(),
        status: 'completed'
      });

    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}/task_completions/${task.id}`);
    } finally {
      setClaimingId(null);
    }
  };

  const handleFaceVerified = async () => {
    setIsFaceVerified(true);
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    try {
      const completionRef = doc(db, 'users', userId, 'task_completions', 'verification');
      const snap = await getDoc(completionRef);
      if (!snap.exists()) {
        const rewardAmt = 5000; // Standard premium identity verification bonus
        
        await setDoc(completionRef, {
          completedAt: serverTimestamp(),
          rewardClaimed: rewardAmt
        });
        
        await updateDoc(doc(db, 'users', userId), {
          coins: increment(rewardAmt),
          isFaceVerified: true,
          faceVerifiedAt: serverTimestamp()
        });

        await addDoc(collection(db, 'users', userId, 'transactions'), {
          type: 'reward',
          amount: rewardAmt,
          description: `Completed: Identity Verification`,
          createdAt: serverTimestamp(),
          status: 'completed'
        });
      }

      setTasks(prev => prev.map(t => {
        if (t.id === 'verification') return { ...t, progress: 1, status: 'completed' };
        if (t.id === 'engagement') return { ...t, status: 'available' };
        return t;
      }));
    } catch (err) {
      console.error("Error setting verification task completion:", err);
    }
  };

  // Remove auto-claim logic
  const [taskToConfirm, setTaskToConfirm] = React.useState<Task | null>(null);
  const [transactions, setTransactions] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (!auth.currentUser) return;
    const transRef = collection(db, 'users', auth.currentUser.uid, 'transactions');
    const unsub = onSnapshot(transRef, (snap) => {
      setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data(), date: d.data().createdAt?.toDate() || new Date() })));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${auth.currentUser?.uid}/transactions`);
    });
    return () => unsub();
  }, []);

  return (
    <div className="space-y-8 p-6">
      <header className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="text-amber-400 text-[10px] font-black uppercase tracking-[0.2em]">Mission Center</span>
          </div>
          <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Tasks & Rewards</h2>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest leading-relaxed">
            Complete daily challenges to earn Coins and grow your status.
          </p>
        </div>

        {/* Task Filters */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {['all', 'available', 'in-progress', 'completed', 'locked'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={cn(
                "px-4 py-2 rounded-full border transition-all text-[9px] font-black uppercase tracking-widest flex-shrink-0",
                filter === f 
                  ? "bg-amber-400 border-amber-400 text-black shadow-lg shadow-amber-400/20" 
                  : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"
              )}
            >
              {f.replace('-', ' ')}
            </button>
          ))}
        </div>
      </header>

      {/* Task List */}
      <div className="space-y-4">
        <AnimatePresence mode="popLayout">
          {/* Identity Verification Status Card */}
          {(filter === 'all' || filter === 'available' || filter === 'completed') && (
            !isFaceVerified ? (
              <motion.div 
                layout
                key="verification-banner-unverified"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="p-6 rounded-[2.5rem] border bg-gradient-to-br from-amber-950/10 via-zinc-900 to-zinc-900 border-amber-500/20 shadow-xl shadow-amber-950/5 text-left flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
                    <h3 className="text-white font-black italic uppercase text-sm tracking-tight flex items-center gap-2">
                      Identity Verification Protocol
                    </h3>
                  </div>
                  <p className="text-zinc-500 text-[10px] font-medium leading-relaxed max-w-[420px]">
                    Unlock exclusive Host channels, stream audio directly inside private seats, and qualify for high-tier agency assignments through our dual biometric verification standard.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsFaceModalOpen(true)}
                  className="bg-amber-400 hover:bg-amber-300 text-black font-black uppercase text-[10px] tracking-widest px-6 py-4 rounded-2xl shadow-lg shadow-amber-400/10 active:scale-95 transition-all self-start md:self-center flex items-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Verify Identity
                </button>
              </motion.div>
            ) : (
              <motion.div 
                layout
                key="verification-banner-verified"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="p-6 rounded-[2.5rem] border bg-gradient-to-br from-green-950/10 via-zinc-900 to-zinc-900 border-green-500/20 shadow-xl shadow-green-950/5 text-left flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-green-400" />
                    <h3 className="text-white font-black italic uppercase text-sm tracking-tight flex items-center gap-2">
                      Identity Verified Securely
                    </h3>
                  </div>
                  <p className="text-zinc-500 text-[10px] font-medium leading-relaxed max-w-[420px]">
                    Your biometric profile has been verified successfully. Your status is secured for all host modules, and task progression is fully active.
                  </p>
                </div>
                <div className="bg-green-500/10 border border-green-500/20 px-4 py-2.5 rounded-xl flex items-center gap-1.5 self-start md:self-center">
                  <span className="h-1.5 w-1.5 bg-green-400 rounded-full animate-ping" />
                  <span className="text-green-400 text-[8px] font-bold uppercase tracking-widest">Active Verified Protocol</span>
                </div>
              </motion.div>
            )
          )}

          {/* Custom Sit & Earn Card */}
          {(filter === 'all' || filter === 'in-progress' || (filter === 'available' && (!sitRewardState.claimedHalf || !sitRewardState.claimedFull))) && (
            <motion.div 
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="p-6 rounded-[2.5rem] border bg-gradient-to-br from-purple-950/10 via-zinc-900 to-zinc-900 border-purple-900/30 shadow-xl shadow-purple-950/10 text-left"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-black italic uppercase text-sm tracking-tight flex items-center gap-1.5">
                      Barca Sit & Join Quest
                      <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
                    </h3>
                    <span className={cn(
                      "text-[8px] font-black px-2 py-0.5 rounded-full border",
                      isNewUser ? "text-amber-400 border-amber-400/20" : "text-blue-400 border-blue-400/20"
                    )}>
                      {isNewUser ? 'NEW USER BONUS' : 'ESTABLISHED USER'}
                    </span>
                  </div>
                  <p className="text-zinc-500 text-[10px] font-medium leading-relaxed max-w-[280px]">
                    Sit down on any seat inside any room. Earn massive coins for active sitting. Claim half with 1 hour and continue for next reward up to 2 hours!
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1 text-amber-400">
                    <Coins className="w-4 h-4" />
                    <span className="text-sm font-black italic">+{isNewUser ? "20,000k" : "10,000k"}</span>
                  </div>
                  <span className="text-zinc-600 text-[8px] font-black uppercase tracking-widest">COINS</span>
                </div>
              </div>

              {/* Progress & Time */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-[9px] font-black uppercase text-zinc-500 tracking-widest">
                    <span>Active Sitting Time</span>
                    <span className="font-mono text-zinc-300">
                      {Math.floor(sitRewardState.durationSeconds / 3600).toString().padStart(2, '0')}h{' '}
                      {Math.floor((sitRewardState.durationSeconds % 3600) / 60).toString().padStart(2, '0')}m / 2h
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (sitRewardState.durationSeconds / 7200) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Sub Milestone Claims */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="p-4 bg-black/30 border border-zinc-900 rounded-2xl flex flex-col justify-between">
                    <div>
                      <span className="text-[8px] font-black text-purple-400 uppercase tracking-widest">1 Hour (Half)</span>
                      <p className="text-[10px] font-medium text-zinc-400 mt-1 uppercase">+{isNewUser ? "10,000,000" : "5,000,000"} Coins</p>
                    </div>
                    <div className="mt-3">
                      {sitRewardState.claimedHalf ? (
                        <div className="bg-green-500/10 border border-green-500/20 text-green-400 py-1.5 rounded-xl text-[8px] font-black uppercase text-center">
                          Claimed ✓
                        </div>
                      ) : sitRewardState.durationSeconds >= 3600 ? (
                        <button
                          type="button"
                          onClick={() => claimTasksSittingReward(true)}
                          disabled={claimingId !== null}
                          className="w-full bg-amber-400 text-black py-1.5 rounded-xl text-[8px] font-black uppercase text-center hover:bg-amber-300 transition-colors"
                        >
                          {claimingId === 'sit-half' ? 'Claiming...' : 'Claim'}
                        </button>
                      ) : (
                        <div className="bg-zinc-900 border border-zinc-800 text-zinc-600 py-1.5 rounded-xl text-[8px] font-bold uppercase text-center">
                          Locked ({Math.floor(sitRewardState.durationSeconds / 60)}/60m)
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-4 bg-black/30 border border-zinc-900 rounded-2xl flex flex-col justify-between">
                    <div>
                      <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">2 Hour (Full)</span>
                      <p className="text-[10px] font-medium text-zinc-400 mt-1 uppercase">+{isNewUser ? "10,000,000" : "5,000,000"} Coins</p>
                    </div>
                    <div className="mt-3">
                      {sitRewardState.claimedFull ? (
                        <div className="bg-green-500/10 border border-green-500/20 text-green-400 py-1.5 rounded-xl text-[8px] font-black uppercase text-center">
                          Claimed ✓
                        </div>
                      ) : sitRewardState.durationSeconds >= 7200 ? (
                        <button
                          type="button"
                          onClick={() => claimTasksSittingReward(false)}
                          disabled={claimingId !== null}
                          className="w-full bg-amber-400 text-black py-1.5 rounded-xl text-[8px] font-black uppercase text-center hover:bg-amber-300 transition-colors"
                        >
                          {claimingId === 'sit-full' ? 'Claiming...' : 'Claim'}
                        </button>
                      ) : (
                        <div className="bg-zinc-900 border border-zinc-800 text-zinc-600 py-1.5 rounded-xl text-[8px] font-bold uppercase text-center">
                          Locked ({Math.floor(sitRewardState.durationSeconds / 60)}/120m)
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {tasks.filter(t => filter === 'all' || t.status === filter).map(task => (
            <motion.div 
              key={task.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={cn(
              "p-6 rounded-[2.5rem] border transition-all duration-500",
              task.status === 'locked' ? "bg-zinc-900/20 border-zinc-900 opacity-50 grayscale" : "bg-zinc-900 border-zinc-800",
              task.status === 'completed' && "border-green-500/20 bg-green-500/5"
            )}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-white font-black italic uppercase text-sm tracking-tight">{task.title}</h3>
                  {task.id === 'engagement' && (
                    <span className={cn(
                      "text-[8px] font-black px-2 py-0.5 rounded-full border",
                      isNewUser ? "text-amber-400 border-amber-400/20" : "text-blue-400 border-blue-400/20"
                    )}>
                      {isNewUser ? 'NEW USER BONUS' : 'ESTABLISHED USER'}
                    </span>
                  )}
                </div>
                <p className="text-zinc-500 text-[10px] font-medium leading-relaxed max-w-[200px]">{task.description}</p>
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end gap-1 text-amber-400">
                  <Coins className="w-3 h-3" />
                  <span className="text-sm font-black italic">+{task.reward.toLocaleString()}</span>
                </div>
                <span className="text-zinc-600 text-[8px] font-black uppercase tracking-widest">COINS</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-[9px] font-black uppercase text-zinc-500 tracking-widest">
                  <span>{task.status === 'completed' ? 'Mission Success' : 'Activity Progress'}</span>
                  <span>{task.progress}/{task.target} {task.id === 'engagement' ? 'MIN' : ''}</span>
                </div>
                <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(task.progress / task.target) * 100}%` }}
                    className={cn(
                      "h-full transition-all",
                      task.status === 'completed' ? "bg-green-500" : "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                    )}
                  />
                </div>
              </div>

              {task.id === 'verification' && task.status === 'available' && task.progress < task.target && (
                <div className="space-y-4">
                  <button 
                    type="button"
                    onClick={() => setIsFaceModalOpen(true)}
                    className="w-full bg-white hover:bg-amber-400 text-black font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2"
                  >
                    <Camera className="w-4 h-4" />
                    Verify Identity Scanner
                  </button>
                </div>
              )}

              {task.status !== 'completed' && task.id !== 'verification' && task.id !== 'daily-bonus' && (
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="number"
                    min="0"
                    max={task.target}
                    value={task.progress}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 0;
                      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, progress: Math.min(Math.max(0, val), t.target), status: val >= t.target ? 'available' : 'in-progress' } : t));
                    }}
                    className="flex-1 bg-black/40 border border-zinc-800 rounded-xl p-2 text-white text-[10px] w-20"
                  />
                  <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest leading-none">/ {task.target}</span>
                </div>
              )}

              {task.id === 'engagement' && task.status === 'locked' && (
                <div className="flex items-center gap-2 text-red-500 text-[9px] font-black uppercase tracking-widest">
                  <ShieldCheck className="w-3 h-3" />
                  Required: Face Verification
                </div>
              )}

              {task.id === 'engagement' && task.status === 'available' && (task.progress < task.target || task.progress === undefined) && (
                <div className="w-full bg-zinc-800 text-zinc-400 font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] flex items-center justify-center gap-2">
                  <Timer className="w-4 h-4" />
                  Auto-completes at 60 mins
                </div>
              )}

              {task.status === 'available' && (task.progress >= task.target || task.id === 'daily-bonus') && (
                <button 
                  onClick={() => setTaskToConfirm(task)}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-green-500/20 active:scale-95 transition-all uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
                >
                  <Coins className="w-4 h-4" />
                  {task.id === 'daily-bonus' ? 'Claim Bonus' : 'Claim Reward'}
                </button>
              )}

              {task.status === 'completed' && (
                <div className="flex items-center gap-2 text-green-500 text-[9px] font-black uppercase tracking-widest">
                  <CheckCircle2 className="w-3 h-3" />
                  Reward Credited
                </div>
              )}
            </div>
          </motion.div>
        ))}
        </AnimatePresence>
      </div>

      {/* Info Card */}
      <div className="bg-blue-400/5 border border-blue-400/10 p-6 rounded-[2.5rem] flex items-start gap-4">
        <div className="bg-blue-400/20 p-2 rounded-xl text-blue-400 mt-1">
          <Info className="w-4 h-4" />
        </div>
        <div className="space-y-1" id="earning-rules">
          <p className="text-white text-xs font-bold uppercase tracking-tight">Earning Rules</p>
          <p className="text-zinc-500 text-[9px] font-medium leading-relaxed italic">
            New users (joined within 8 days) earn 2X bonus on task completion. 
            Verification must be completed using a clear, real-time face scan. 
            One task reward per user per day.
          </p>
        </div>
      </div>

      {/* Host Earnings Section */}
      <section className="space-y-6 pt-8 border-t border-zinc-900" id="host-earnings">
        <header className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-400" />
              <span className="text-green-400 text-[10px] font-black uppercase tracking-[0.2em]">Host Revenue</span>
            </div>
            <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Earnings History</h3>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setEarningsSort({ field: 'date', order: earningsSort.order === 'desc' ? 'asc' : 'desc' })}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all",
                earningsSort.field === 'date' ? "bg-white text-black" : "bg-zinc-900 text-zinc-500 border border-zinc-800"
              )}
            >
              Date {earningsSort.field === 'date' && (earningsSort.order === 'desc' ? '↓' : '↑')}
            </button>
            <button 
              onClick={() => setEarningsSort({ field: 'amount', order: earningsSort.order === 'desc' ? 'asc' : 'desc' })}
              className={cn(
                "px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all",
                earningsSort.field === 'amount' ? "bg-white text-black" : "bg-zinc-900 text-zinc-500 border border-zinc-800"
              )}
            >
              Amount {earningsSort.field === 'amount' && (earningsSort.order === 'desc' ? '↓' : '↑')}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4">
          {transactions.sort((a, b) => {
            const factor = earningsSort.order === 'desc' ? -1 : 1;
            if (earningsSort.field === 'date') return (a.date.getTime() - b.date.getTime()) * factor;
            return (a.amount - b.amount) * factor;
          }).map(earning => (
            <div key={earning.id} className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl flex items-center justify-between group hover:border-zinc-700 transition-all">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center",
                  earning.type === 'gift' ? "bg-purple-500/10 text-purple-400" : "bg-blue-500/10 text-blue-400"
                )}>
                  {earning.type === 'gift' ? <Star className="w-5 h-5" /> : <TrendingUp className="w-5 h-5" />}
                </div>
                <div>
                  <h4 className="text-white text-[11px] font-black uppercase italic tracking-tight">{earning.source || earning.description}</h4>
                  <p className="text-zinc-500 text-[8px] font-black uppercase tracking-widest">{earning.type.replace('_', ' ')}</p>
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center justify-end gap-1 text-amber-400 font-black italic">
                  <Coins className="w-3 h-3" />
                  <span>+{earning.amount.toLocaleString()}</span>
                </div>
                <p className="text-zinc-600 text-[8px] font-bold uppercase">{earning.date.toLocaleDateString()}</p>
              </div>
            </div>
          ))}
          {transactions.length === 0 && (
            <div className="text-center py-12 bg-zinc-900/10 rounded-[2.5rem] border border-dashed border-zinc-800">
               <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest">No transactions yet</p>
            </div>
          )}
        </div>
      </section>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {taskToConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setTaskToConfirm(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 w-full max-w-sm relative z-10 shadow-2xl flex flex-col items-center text-center space-y-6"
            >
              <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-orange-500/20">
                <Coins className="w-8 h-8 text-black" />
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Claim Reward?</h3>
                <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                  You are about to claim the reward for "{taskToConfirm.title}".
                </p>
              </div>
              <div className="flex bg-black/40 border border-zinc-800 rounded-2xl px-6 py-3 items-center gap-2">
                <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Reward:</span>
                <Coins className="w-3 h-3 text-amber-400" />
                <span className="text-amber-400 text-lg font-black italic">+{taskToConfirm.reward.toLocaleString()}</span>
              </div>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setTaskToConfirm(null)}
                  className="flex-1 bg-zinc-800 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[10px] hover:bg-zinc-700 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    await claimReward(taskToConfirm);
                    setTaskToConfirm(null);
                  }}
                  disabled={claimingId === taskToConfirm.id}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-black py-4 rounded-2xl shadow-xl shadow-green-500/20 active:scale-95 transition-all uppercase tracking-widest text-[10px] flex items-center justify-center gap-2"
                >
                  {claimingId === taskToConfirm.id ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Claiming...
                    </>
                  ) : (
                    'Confirm'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* Face Biometric Verification Modal */}
      <FaceVerification 
        isOpen={isFaceModalOpen}
        onClose={() => setIsFaceModalOpen(false)}
        onVerified={handleFaceVerified}
      />
    </div>
  );
}
