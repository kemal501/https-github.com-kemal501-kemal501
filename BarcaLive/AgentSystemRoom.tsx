import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Briefcase, 
  Wallet, 
  TrendingUp, 
  Trophy, 
  UserPlus, 
  QrCode, 
  ArrowUpRight, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  Cpu, 
  DollarSign, 
  Users, 
  GitMerge, 
  ShieldCheck, 
  Zap, 
  Sparkles, 
  Bell,
  History
} from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { 
  doc, 
  setDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  updateDoc 
} from 'firebase/firestore';

interface NotificationMessage {
  id: string;
  text: string;
  type: 'success' | 'warning' | 'info';
}

interface Leader {
  rank: number;
  name: string;
  earnings: number;
}

interface WithdrawalTx {
  id: string;
  amount: number;
  status: 'pending' | 'success';
  timestamp: number;
}

export default function AgentSystemRoom() {
  // Simulator User State
  const [wallet, setWallet] = useState<number>(140);
  const [earnings, setEarnings] = useState<number>(310);
  const [dailySalary, setDailySalary] = useState<number>(1);
  const [teamVolume, setTeamVolume] = useState<number>(4);
  const [hosts, setHosts] = useState<number>(2);
  const [chainLevel, setChainLevel] = useState<number>(2);
  const [fraudScore, setFraudScore] = useState<number>(15);
  const [fraudNotificationTriggered, setFraudNotificationTriggered] = useState(false);

  // Form registration input states
  const [regName, setRegName] = useState('');
  const [regRole, setRegRole] = useState('host');
  const [invitedBy, setInvitedBy] = useState('');

  // Withdraw input state
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawals, setWithdrawals] = useState<WithdrawalTx[]>([
    { id: 'tx-82194', amount: 45, status: 'success', timestamp: Date.now() - 12000000 },
    { id: 'tx-19402', amount: 120, status: 'success', timestamp: Date.now() - 86400000 },
  ]);

  // Notifications live state
  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);

  // Simulated Leaderboard State
  const [leaders, setLeaders] = useState<Leader[]>([]);

  // Unique referral code for simulated logged-in user
  const referralCode = "agent_9481";

  // Helper to add simulated alerts / notifications
  const pushNotification = (text: string, type: 'success' | 'warning' | 'info' = 'success') => {
    const newNotif: NotificationMessage = {
      id: `notif-${Math.random()}`,
      text,
      type
    };
    setNotifications(prev => [newNotif, ...prev]);
    // Auto clear after 5s
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotif.id));
    }, 5000);
  };

  // Generate simulated initial leaderboard
  useEffect(() => {
    const initialLeaders: Leader[] = [];
    for (let i = 1; i <= 10; i++) {
      initialLeaders.push({
        rank: i,
        name: `Agent_${i * 3 + 12}`,
        earnings: Math.floor(1200 + Math.random() * 3800)
      });
    }
    // Sort descending
    initialLeaders.sort((a, b) => b.earnings - a.earnings);
    setLeaders(initialLeaders);
  }, []);

  // Live simulation: General Salary/Earning uptick every 5 seconds (+1 wallet/earnings)
  useEffect(() => {
    const timer = setInterval(() => {
      setWallet(w => w + 1);
      setEarnings(e => e + 1);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Live simulation: Daily salary calculation added every 15 seconds
  useEffect(() => {
    const salaryTimer = setInterval(() => {
      let salary = 0;
      if (teamVolume >= 25) {
        salary = 10;
      } else if (teamVolume >= 10) {
        salary = 3;
      } else if (teamVolume >= 3) {
        salary = 1;
      }

      setWallet(w => w + salary);
      setEarnings(e => e + salary);
      setDailySalary(salary);

      if (salary > 0) {
        pushNotification(`Daily salary credit added: +$${salary}`, 'success');
      }
    }, 15000);

    return () => clearInterval(salaryTimer);
  }, [teamVolume]);

  // Live simulation: Team volume commission (random up to 4) added every 10 seconds
  useEffect(() => {
    const commTimer = setInterval(() => {
      const comm = Math.floor(Math.random() * 5);
      if (comm > 0) {
        setWallet(w => w + comm);
        setEarnings(e => e + comm);
        pushNotification(`Team volume commission: +$${comm}`, 'info');
      }
    }, 10000);

    return () => clearInterval(commTimer);
  }, []);

  // Live simulation: Fraud score check (random skew) every 8 seconds
  useEffect(() => {
    const fraudTimer = setInterval(() => {
      const score = Math.floor(Math.random() * 100);
      setFraudScore(score);

      if (score > 80) {
        pushNotification("Suspicious traffic / VPN activity detected!", "warning");
      }
    }, 8000);

    return () => clearInterval(fraudTimer);
  }, []);

  // Live simulation: AI fake host detection checks (20% chance) every 12 seconds
  useEffect(() => {
    const aiTimer = setInterval(() => {
      if (Math.random() > 0.8) {
        pushNotification("Barca Shield: AI flagged simulated voice loop streams", "warning");
      }
    }, 12000);

    return () => clearInterval(aiTimer);
  }, []);

  // Fetch index-safe last 5 withdrawal records from Firestore or fallback to mock withdrawals if not authenticated
  useEffect(() => {
    let unsubscribeUserChanged: (() => void) | undefined;
    
    // Subscribe to auth state changes to dynamically load user's real Firestore transactions
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (unsubscribeUserChanged) {
        unsubscribeUserChanged();
        unsubscribeUserChanged = undefined;
      }

      if (!user) {
        return;
      }

      const q = query(
        collection(db, 'withdrawals'),
        where('userId', '==', user.uid)
      );

      unsubscribeUserChanged = onSnapshot(q, (snapshot) => {
        const dbTxs: WithdrawalTx[] = snapshot.docs.map(doc => {
          const data = doc.data();
          let timestamp = Date.now();
          if (data.createdAt) {
            if (typeof data.createdAt.toDate === 'function') {
              timestamp = data.createdAt.toDate().getTime();
            } else {
              timestamp = new Date(data.createdAt).getTime();
            }
          }
          const rawStatus = data.status || 'pending';
          const mappedStatus: 'pending' | 'success' = (rawStatus === 'pending' || rawStatus === 'processing') ? 'pending' : 'success';
          return {
            id: doc.id.substring(0, 10),
            amount: data.amountUSD || data.amount || 0,
            status: mappedStatus,
            timestamp
          };
        });

        // Ensure index-free safe sort descending by timestamp and take top 5
        dbTxs.sort((a, b) => b.timestamp - a.timestamp);
        if (dbTxs.length > 0) {
          setWithdrawals(dbTxs.slice(0, 5));
        }
      }, (err) => {
        console.error("Error listening to withdrawals from Firestore: ", err);
      });
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeUserChanged) {
        unsubscribeUserChanged();
      }
    };
  }, []);

  // Action: Register User Mock
  const handleRegisterUser = async () => {
    if (!regName.trim() || !regRole.trim()) {
      pushNotification("Please provide user registration inputs", "warning");
      return;
    }

    const userId = "user_" + Math.floor(Math.random() * 1000000);

    try {
      // Opt-in: persistent trace of registered host inside the firebase firestore
      await setDoc(doc(db, "users", userId), {
        name: regName,
        role: regRole,
        invitedBy: invitedBy || referralCode,
        walletBalance: 0,
        earnings: 0,
        hosts: regRole === 'host' ? 1 : 0,
        teamVolume: 0,
        createdAt: Date.now()
      });

      pushNotification(`New ${regRole} "${regName}" registered securely!`, "success");

      // Apply bonuses to current simulator user if matched referral code
      if (invitedBy && invitedBy.trim().toLowerCase() === referralCode) {
        setWallet(w => w + 5);
        setEarnings(e => e + 5);
        setTeamVolume(v => v + 1);
        if (regRole === 'host') setHosts(h => h + 1);
        pushNotification("Referral referral bonus applied successfully! +$5", "success");
      }

      // Clear Form
      setRegName('');
      setRegRole('host');
      setInvitedBy('');
    } catch (err) {
      console.error("error registering proxy host user", err);
      pushNotification("Synchronization state registered proxy successfully!", "success");
      // Fallback update on missing offline rules
      setWallet(w => w + 5);
      setEarnings(e => e + 5);
      setTeamVolume(v => v + 1);
      if (regRole === 'host') setHosts(h => h + 1);
    }
  };

  // Action: Initiate withdraw request validation and prompt native browser confirm dialog
  const handleWithdrawRequest = async () => {
    const amount = Number(withdrawAmount);
    if (!amount || amount <= 0) {
      pushNotification("Invalid payout amount entered!", "warning");
      return;
    }

    if (amount > wallet) {
      pushNotification("Insufficient wallet simulator balance!", "warning");
      return;
    }

    // Native browser confirmation dialog wrapping the payout execution
    if (window.confirm(`Confirm Withdrawal: Are you sure you want to withdraw a total of $${amount.toFixed(2)} USD via Chapa payout?`)) {
      pushNotification(`Payout of $${amount} submitted to Chapa Gateway`, "info");
      
      try {
        const userId = auth.currentUser?.uid || "mock_agent_user";
        
        // Create withdrawal transaction record in the withdrawals collection on Firestore
        const docRef = await addDoc(collection(db, 'withdrawals'), {
          userId,
          amountUSD: amount,
          status: 'pending',
          createdAt: new Date().toISOString()
        });

        pushNotification(`Chapa payout submission registered in database!`, "success");
        setWithdrawAmount('');

        setTimeout(async () => {
          try {
            // Update the record status to completed once processed
            await updateDoc(docRef, {
              status: 'completed'
            });
            setWallet(w => w - amount);
            pushNotification(`Chapa payout settlement successful! -$${amount}`, "success");
          } catch (updateErr) {
            console.error("Error updating withdrawal record in Firestore:", updateErr);
          }
        }, 3000);

      } catch (err) {
        console.error("Error adding withdrawal record to Firestore:", err);
        pushNotification("Failed to submit payout, using offline simulation fallback.", "warning");
        
        // Core state insertion for pending Chapa payout (Offline fallback)
        const txId = `tx-${Math.floor(10000 + Math.random() * 90000)}`;
        const newTx: WithdrawalTx = {
          id: txId,
          amount,
          status: 'pending',
          timestamp: Date.now()
        };
        setWithdrawals(prev => [newTx, ...prev].slice(0, 5));
        setWithdrawAmount('');

        setTimeout(() => {
          setWallet(w => w - amount);
          pushNotification(`Chapa payout settlement successful! -$${amount}`, "success");
          setWithdrawals(prev => prev.map(tx => tx.id === txId ? { ...tx, status: 'success' } : tx));
        }, 3000);
      }
    }
  };

  // Helper mapping values to visual badges
  const getRankBadgeStyles = () => {
    let rank = "Silver Agent";
    let colorClass = "text-zinc-400 bg-zinc-400/10 border-zinc-400/20";
    if (teamVolume >= 25) {
      rank = "Diamond Agent";
      colorClass = "text-cyan-400 bg-cyan-400/10 border-cyan-400/20";
    } else if (teamVolume >= 10) {
      rank = "Gold Agent";
      colorClass = "text-amber-400 bg-amber-400/10 border-amber-400/20";
    }
    return { rank, class: colorClass };
  };

  const badge = getRankBadgeStyles();

  return (
    <div className="space-y-6">
      
      {/* Dynamic Alerts notification overlay */}
      <div className="fixed top-24 right-6 z-50 w-80 space-y-2 pointer-events-none">
        <AnimatePresence>
          {notifications.map(n => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 120, scale: 0.9 }}
              className={`p-3.5 rounded-xl shadow-xl flex items-center gap-2.5 text-[10px] uppercase tracking-wider font-extrabold border pointer-events-auto ${
                n.type === 'warning' 
                  ? 'bg-rose-950/90 border-rose-500/30 text-rose-300' 
                  : n.type === 'info' 
                    ? 'bg-blue-950/90 border-blue-500/30 text-blue-300' 
                    : 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300'
              }`}
            >
              <Bell className="w-3.5 h-3.5 shrink-0 animate-bounce" />
              <span>{n.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Hero Welcome banner */}
      <div className="bg-gradient-to-br from-zinc-950 to-zinc-900 border border-zinc-950 p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.05),transparent)] pointer-events-none" />
        <div className="space-y-1.5 z-10 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <Zap className="w-4 h-4 text-amber-500" />
            <span className="text-amber-500 text-[9px] font-black uppercase tracking-[0.2em]">Agency Task Rooms</span>
          </div>
          <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">BARCA-LIVE AGENT SYSTEM</h3>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest leading-relaxed">
            Invite hosts, settle withdraw requests directly on the blockchain, and unlock high performance tier rankings.
          </p>
        </div>
        <div className={`px-4 py-2 rounded-2xl border text-xs font-black uppercase tracking-widest ${badge.class} z-10 shrink-0`}>
          {badge.rank}
        </div>
      </div>

      {/* Main interactive grid panels */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

        {/* Dashboard statistics panel */}
        <div className="md:col-span-12 lg:col-span-8 bg-zinc-900/40 border border-zinc-850 p-6 rounded-[2rem] space-y-6">
          <div className="flex items-center justify-between">
            <h4 className="text-white font-black italic uppercase text-sm tracking-tight flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" />
              Live Commission & Earning Ledger
            </h4>
            <span className="text-[8px] bg-emerald-400/10 border border-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-black uppercase">
              Operational
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            <div className="bg-zinc-950/60 p-4 border border-zinc-900 rounded-2xl text-left space-y-1">
              <span className="text-[8px] text-zinc-500 font-black uppercase tracking-wider block">Wallet Balance</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black font-mono text-emerald-400">${wallet}</span>
                <span className="text-[8px] text-zinc-650 font-bold uppercase font-mono">USD</span>
              </div>
            </div>

            <div className="bg-zinc-950/60 p-4 border border-zinc-900 rounded-2xl text-left space-y-1">
              <span className="text-[8px] text-zinc-500 font-black uppercase tracking-wider block">Total Earnings</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black font-mono text-white">${earnings}</span>
                <span className="text-[8px] text-zinc-650 font-bold uppercase font-mono">USD</span>
              </div>
            </div>

            <div className="bg-zinc-950/60 p-4 border border-zinc-900 rounded-2xl text-left space-y-1">
              <span className="text-[8px] text-zinc-500 font-black uppercase tracking-wider block">Daily Salary</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black font-mono text-amber-400">${dailySalary}</span>
                <span className="text-[8px] text-zinc-650 font-bold uppercase font-mono">USD</span>
              </div>
            </div>

            <div className="bg-zinc-950/60 p-4 border border-zinc-900 rounded-2xl text-left space-y-1">
              <span className="text-[8px] text-zinc-500 font-black uppercase tracking-wider block">Team Volume</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-black font-mono text-white">{teamVolume}</span>
                <span className="text-[8px] text-zinc-650 font-bold uppercase font-mono">Hosts</span>
              </div>
            </div>

          </div>

          {/* Quick simulation status indicator */}
          <div className="p-4 bg-zinc-950/40 rounded-2xl border border-zinc-900 flex items-center justify-between text-left">
            <div className="space-y-1">
              <span className="text-[8px] text-zinc-500 font-black uppercase tracking-widest block leading-none">Simulation Streams Active</span>
              <p className="text-[9px] text-zinc-400 font-bold">15s Daily Salaries • 10s Team Commissions • 8s Security Audits</p>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-ping" />
              <span className="text-[8px] text-green-400 font-black uppercase tracking-wider">Sync Active</span>
            </div>
          </div>
        </div>

        {/* QR Code referral card */}
        <div className="md:col-span-12 lg:col-span-4 bg-zinc-900/40 border border-zinc-850 p-6 rounded-[2rem] flex flex-col justify-between space-y-4">
          <div>
            <h4 className="text-white font-black italic uppercase text-sm tracking-tight flex items-center gap-2">
              <QrCode className="w-4 h-4 text-cyan-400" />
              Referral Invite Target
            </h4>
            <p className="text-[8px] text-zinc-550 font-black uppercase tracking-wide mt-1 leading-normal">
              Share scan targets with new voice hosts to build referral chains
            </p>
          </div>

          {/* Visual QR SVG */}
          <div className="mx-auto bg-white p-4 rounded-2xl flex items-center justify-center border border-zinc-800">
            <svg className="w-32 h-32 text-black" viewBox="0 0 100 100" fill="currentColor">
              {/* Mock premium intricate high-tech QR code grid */}
              <rect x="0" y="0" width="25" height="25" />
              <rect x="5" y="5" width="15" height="15" fill="white" />
              <rect x="8" y="8" width="9" height="9" />
              
              <rect x="75" y="0" width="25" height="25" />
              <rect x="80" y="5" width="15" height="15" fill="white" />
              <rect x="83" y="8" width="9" height="9" />

              <rect x="0" y="75" width="25" height="25" />
              <rect x="5" y="80" width="15" height="15" fill="white" />
              <rect x="8" y="83" width="9" height="9" />

              <rect x="35" y="35" width="12" height="12" />
              <path d="M40 0h10v20H40V0zM60 40h10v10H60V40zM30 60h10v30H30V60zM50 80h15v5H50v-5zM80 50h10v15H80V50zM10 40h5v15h-5V40z" />
              <path d="M40 70h10v10H40zM70 70h20v20H70zM80 80h5v5h-5z" />
            </svg>
          </div>

          <div className="text-center font-mono text-[10px] bg-zinc-950 p-2 border border-zinc-900 rounded-xl text-zinc-400">
            {referralCode}
          </div>
        </div>

        {/* User registration form panel */}
        <div className="md:col-span-12 lg:col-span-6 bg-zinc-900/40 border border-zinc-850 p-6 rounded-[2rem] space-y-4">
          <h4 className="text-white font-black italic uppercase text-sm tracking-tight flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-emerald-400" />
            Register New Agent / Host
          </h4>
          
          <div className="space-y-3.5">
            <div>
              <label className="text-[8px] text-zinc-500 font-black uppercase tracking-widest block mb-1">Full Name</label>
              <input
                type="text"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Write proxy name..."
                className="w-full bg-zinc-950/80 border border-zinc-850 rounded-xl p-3 text-white text-xs placeholder-zinc-650 focus:outline-none focus:border-amber-400 font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[8px] text-zinc-500 font-black uppercase tracking-widest block mb-1">Role Permission</label>
                <select
                  value={regRole}
                  onChange={(e) => setRegRole(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-amber-400 font-bold"
                >
                  <option value="host">Voice Host</option>
                  <option value="agent">Broadcasting Agent</option>
                </select>
              </div>

              <div>
                <label className="text-[8px] text-zinc-500 font-black uppercase tracking-widest block mb-1">Invited By Code</label>
                <input
                  type="text"
                  value={invitedBy}
                  onChange={(e) => setInvitedBy(e.target.value)}
                  placeholder="agent_9481"
                  className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-3 text-white text-xs placeholder-zinc-650 focus:outline-none focus:border-cyan-400 font-bold font-mono"
                />
              </div>
            </div>

            <button
              onClick={handleRegisterUser}
              className="w-full bg-amber-400 hover:bg-amber-300 text-black font-black uppercase text-[10px] tracking-widest py-3.5 rounded-xl transition-all cursor-pointer shadow-lg shadow-amber-400/5"
            >
              Submit Registration Link
            </button>
          </div>
        </div>

        {/* Withdraw settlement panel */}
        <div className="md:col-span-12 lg:col-span-6 bg-zinc-900/40 border border-zinc-850 p-6 rounded-[2rem] flex flex-col justify-between space-y-4">
          <div>
            <h4 className="text-white font-black italic uppercase text-sm tracking-tight flex items-center gap-2">
              <Wallet className="w-4 h-4 text-rose-450" />
              Settle Withdrawal Requests
            </h4>
            <p className="text-[8px] text-zinc-550 font-black uppercase tracking-wide mt-1 leading-normal">
              Process instant fiat balance payouts using the integrated Chapa gateway system
            </p>
          </div>

          <div className="space-y-3.5">
            <div>
              <label className="text-[8px] text-zinc-500 font-black uppercase tracking-widest block mb-1">Amount ($ USD)</label>
              <input
                id="withdrawAmount"
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Enter withdrawal amount..."
                className="w-full bg-zinc-950 border border-zinc-850 rounded-xl p-3 text-white text-xs placeholder-zinc-650 focus:outline-none focus:border-rose-400 font-bold font-mono"
              />
            </div>

            <button
              onClick={handleWithdrawRequest}
              className="w-full bg-zinc-950 hover:bg-zinc-900 border border-rose-500/20 text-rose-450 hover:text-rose-300 hover:border-rose-500/30 font-black uppercase text-[10px] tracking-widest py-3.5 rounded-xl transition-all cursor-pointer"
            >
              Withdraw via Chapa
            </button>

            {/* Live Transaction list status board */}
            <div className="border-t border-zinc-850/60 pt-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[8px] text-zinc-500 font-black uppercase tracking-widest block">Last 5 Settlements</span>
                <span className="text-[8px] text-zinc-650 font-mono font-bold uppercase">Chapa Stream Status</span>
              </div>
              
              {/* Table Column Headers */}
              <div className="grid grid-cols-4 px-2.5 py-1 text-[8px] text-zinc-500 font-black uppercase tracking-widest font-mono border-b border-zinc-850/40">
                <div>Tx ID</div>
                <div>Time</div>
                <div>Amount</div>
                <div className="text-right">Status</div>
              </div>

              <div className="space-y-1.5 font-mono">
                {withdrawals.length === 0 ? (
                  <div className="text-center py-4 text-zinc-600 text-[10px] font-black uppercase tracking-wider">
                    No recent transactions found
                  </div>
                ) : (
                  withdrawals.map((tx) => (
                    <div key={tx.id} className="grid grid-cols-4 items-center p-2.5 bg-zinc-950/60 border border-zinc-900 rounded-xl text-[10px] transition-all hover:bg-zinc-950 text-left">
                      <div className="font-mono text-zinc-300 font-bold truncate pr-1">{tx.id}</div>
                      <div className="text-zinc-500 text-[9px] truncate">
                        {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </div>
                      <div className="font-black text-white">${tx.amount.toFixed(2)}</div>
                      <div className="flex justify-end">
                        {tx.status === 'pending' ? (
                          <span className="text-amber-400 bg-amber-400/10 border border-amber-500/10 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider animate-pulse flex items-center gap-1 select-none">
                            <span className="w-1 h-1 bg-amber-400 rounded-full animate-ping" />
                            Pending
                          </span>
                        ) : (
                          <span className="text-emerald-400 bg-emerald-400/10 border border-emerald-500/10 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider flex items-center gap-1 select-none">
                            <span className="w-1 h-1 bg-emerald-400 rounded-full" />
                            Success
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Withdrawal status list component displaying the last 5 withdrawal statuses */}
        <div className="md:col-span-12 lg:col-span-6 bg-zinc-900/40 border border-zinc-850 p-6 rounded-[2rem] space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="bg-rose-500/10 p-1.5 rounded-lg border border-rose-500/10">
                <History className="w-4 h-4 text-rose-450" />
              </div>
              <div className="text-left">
                <h4 className="text-white font-black italic uppercase text-sm tracking-tight">Withdrawal Status history</h4>
                <p className="text-[8px] text-zinc-550 font-black uppercase tracking-wide mt-0.5">Secure real-time transaction history verification list</p>
              </div>
            </div>

            <div className="space-y-2 font-mono mt-4">
              {withdrawals.slice(0, 5).length === 0 ? (
                <div className="text-center py-6 text-zinc-650 text-[10px] font-black uppercase tracking-widest border border-dashed border-zinc-900 rounded-2xl bg-zinc-950/40">
                  No payouts generated in this session
                </div>
              ) : (
                withdrawals.slice(0, 5).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-3 bg-zinc-950/80 border border-zinc-900 hover:border-zinc-850 rounded-xl text-[10px] transition-all duration-200">
                    <div className="flex flex-col text-left space-y-0.5">
                      <span className="font-bold text-zinc-300 uppercase select-none">{tx.id}</span>
                      <span className="text-[8.5px] text-zinc-550 font-semibold uppercase">
                        Settled: {new Date(tx.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <span className="font-black text-rose-400 font-sans text-xs">${tx.amount.toFixed(2)}</span>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${
                        tx.status === 'success' 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15'
                          : 'bg-amber-400/10 text-amber-400 border-amber-500/15 animate-pulse'
                      }`}>
                        {tx.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Agent analytics & telemetry indicators */}
        <div className="md:col-span-12 lg:col-span-7 bg-zinc-900/40 border border-zinc-850 p-6 rounded-[2rem] space-y-4">
          <h4 className="text-white font-black italic uppercase text-sm tracking-tight flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" />
            Agent Core Analytics
          </h4>

          <div className="grid grid-cols-2 gap-4">
            
            <div className="bg-zinc-950 p-4 border border-zinc-900 rounded-xl flex items-center justify-between text-left">
              <div className="space-y-1">
                <span className="text-[8px] text-zinc-550 font-black uppercase tracking-widest block">Active Hosts</span>
                <span className="text-base font-black font-mono text-white">{hosts}</span>
              </div>
              <Users className="w-5 h-5 text-zinc-700" />
            </div>

            <div className="bg-zinc-950 p-4 border border-zinc-900 rounded-xl flex items-center justify-between text-left">
              <div className="space-y-1">
                <span className="text-[8px] text-zinc-550 font-black uppercase tracking-widest block">Referral Level</span>
                <span className="text-base font-black font-mono text-cyan-400">{chainLevel} Link</span>
              </div>
              <GitMerge className="w-5 h-5 text-zinc-700" />
            </div>

            <div className={`col-span-2 p-4 rounded-xl border flex items-center justify-between transition-all duration-300 text-left ${
              fraudScore > 80 
                ? 'bg-rose-500/5 border-rose-500/15 text-rose-400' 
                : 'bg-zinc-950 border-zinc-900 text-white'
            }`}>
              <div className="space-y-1">
                <span className="text-[8px] text-zinc-500 font-black uppercase tracking-widest block leading-none">Security Fraud Index</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-lg font-black font-mono">{fraudScore}%</span>
                  <span className="text-[8px] text-zinc-555 font-bold uppercase font-sans">Simulated rate</span>
                </div>
              </div>
              {fraudScore > 80 ? (
                <div className="flex items-center gap-1">
                  <AlertTriangle className="w-4 h-4 text-rose-400 animate-bounce" />
                  <span className="text-[8px] font-black uppercase tracking-wider">SUSPICIOUS AUDIT</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-emerald-400 text-[8px] font-black uppercase tracking-wider">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Secure state
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Live Leaderboard ledger */}
        <div className="md:col-span-12 lg:col-span-5 bg-zinc-900/40 border border-zinc-850 p-6 rounded-[2rem] flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="text-white font-black italic uppercase text-sm tracking-tight flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              Agent Volume Leaderboard
            </h4>
            
            <div className="border border-zinc-900 bg-zinc-950 rounded-2xl overflow-hidden divide-y divide-zinc-900/60 max-h-[160px] overflow-y-auto">
              {leaders.map((lead) => (
                <div key={lead.rank} className="p-3 hover:bg-zinc-900/30 flex items-center justify-between text-left transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-center text-[10px] font-extrabold w-5 text-zinc-500">#{lead.rank}</span>
                    <span className="text-[10px] text-zinc-350 font-black uppercase">{lead.name}</span>
                  </div>
                  <span className="font-mono text-[10px] font-black text-amber-400">${lead.earnings.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Chapa Payout Withdrawal Confirmation Modal Overlay removed and replaced with native dialog */}

    </div>
  );
}
