import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, 
  Globe, 
  ArrowUpRight, 
  History, 
  Settings2, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Loader2,
  Building2,
  Bitcoin,
  Flame,
  CalendarCheck
} from 'lucide-react';
import { cn } from '../lib/utils';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc, onSnapshot, query as firestoreQuery, collection, where } from 'firebase/firestore';

const CONVERSION_RATE = 1000; // 1000 coins = $1
const MIN_WITHDRAWAL_USD = 10;
const MIN_WITHDRAWAL_COINS = MIN_WITHDRAWAL_USD * CONVERSION_RATE;

const DailyLoginStreak = ({ user }: { user: any }) => {
  const [claiming, setClaiming] = React.useState(false);
  const [justClaimed, setJustClaimed] = React.useState(false);
  
  const today = new Date().toISOString().split('T')[0];
  const isClaimedToday = user?.lastStreakClaimedDate === today;
  const currentStreak = user?.loginStreak || 0;
  
  const handleClaim = async () => {
    if (!auth.currentUser || isClaimedToday || claiming) return;
    setClaiming(true);
    try {
      const res = await fetch('/api/bonus/streak/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: auth.currentUser.uid })
      });
      const data = await res.json();
      if (data.success) {
        setJustClaimed(true);
        setTimeout(() => setJustClaimed(false), 3000);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setClaiming(false);
    }
  };

  const streakDays = [1, 2, 3, 4, 5, 6, 7];
  const rewards = [100, 200, 300, 400, 500, 750, 1500];

  return (
    <div className="bg-zinc-900 border border-white/5 rounded-3xl p-6 mb-8 relative overflow-hidden group text-left">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-amber-400 opacity-50" />
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Flame className={cn("w-5 h-5", currentStreak > 0 ? "text-orange-500" : "text-zinc-500")} />
            <h3 className="text-white font-black italic tracking-tighter text-lg uppercase">Daily Streak</h3>
          </div>
          <p className="text-zinc-500 text-[10px] uppercase tracking-widest font-bold font-sans">Login consecutive days for higher rewards</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black text-amber-400 font-sans">{currentStreak} <span className="text-sm text-zinc-500 uppercase tracking-widest">Days</span></div>
        </div>
      </div>

      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none snap-x">
        {streakDays.map((day, ix) => {
          const isCompleted = day <= currentStreak && (day < currentStreak || isClaimedToday);
          const isTodayBox = day === (isClaimedToday ? currentStreak : currentStreak + 1);

          return (
            <div 
              key={day}
              className={cn(
                "relative snap-center shrink-0 w-[4.5rem] rounded-2xl flex flex-col items-center justify-center py-3 border transition-all duration-300",
                isCompleted 
                  ? "bg-amber-400/10 border-amber-400/30 text-amber-400" 
                  : isTodayBox && !isClaimedToday 
                    ? "bg-orange-500/20 border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)] text-orange-400" 
                    : "bg-black/40 border-white/5 text-zinc-650 grayscale opacity-70"
              )}
            >
              {isCompleted && (
                <div className="absolute top-1 right-1">
                  <CheckCircle2 className="w-3 h-3 text-amber-500" />
                </div>
              )}
              <span className="text-[9px] font-black uppercase tracking-widest mb-1 font-sans">Day {day}</span>
              <div className="flex items-center gap-1 font-black text-xs font-mono">
                <span>{rewards[ix]}</span>
              </div>
            </div>
          );
        })}
      </div>

      {!isClaimedToday ? (
        <button 
          onClick={handleClaim}
          disabled={claiming}
          className="w-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-black py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer border-0"
        >
          {claiming ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : (
            <>
              <CalendarCheck className="w-4 h-4" />
              Claim Day {currentStreak + 1} Reward
            </>
          )}
        </button>
      ) : (
        <div className="w-full bg-green-500/10 border border-green-500/20 text-green-400 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 font-mono">
          <CheckCircle2 className="w-4 h-4" />
          {justClaimed ? "Successfully Claimed!" : "Come back tomorrow"}
        </div>
      )}
    </div>
  );
};

interface WithdrawalRecord {
  id: string;
  amountCoins: number;
  amountUSD: number;
  method: 'bank' | 'wallet';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: any;
}

export default function WalletWithdrawal() {
  const [user, setUser] = React.useState<any>(null);
  const [withdrawals, setWithdrawals] = React.useState<WithdrawalRecord[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [requesting, setRequesting] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);

  // Form states for settings
  const [paymentType, setPaymentType] = React.useState<'bank' | 'wallet'>('bank');
  const [bankName, setBankName] = React.useState('');
  const [accountNumber, setAccountNumber] = React.useState('');
  const [walletAddress, setWalletAddress] = React.useState('');
  const [autoWithdraw, setAutoWithdraw] = React.useState(true);
  const [touched, setTouched] = React.useState({ bankName: false, accountNumber: false, walletAddress: false });

  const isBankNameValid = bankName.trim().length > 0;
  const isAccountNumberValid = accountNumber.trim().length > 6;
  const isWalletAddressValid = walletAddress.trim().length >= 34;

  const showBankNameError = touched.bankName && !isBankNameValid;
  const showAccountNumberError = touched.accountNumber && !isAccountNumberValid;
  const showWalletAddressError = touched.walletAddress && !isWalletAddressValid;
  const isFormValid = paymentType === 'bank' ? (isBankNameValid && isAccountNumberValid) : isWalletAddressValid;

  React.useEffect(() => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;

    const userUnsub = onSnapshot(doc(db, 'users', userId), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setUser(data);
        setPaymentType(data.paymentMethod?.type || 'bank');
        setBankName(data.paymentMethod?.bankName || '');
        setAccountNumber(data.paymentMethod?.accountNumber || '');
        setWalletAddress(data.paymentMethod?.walletAddress || '');
        setAutoWithdraw(data.autoWithdrawEnabled ?? true);
      }
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `users/${userId}`);
    });

    const withdrawalsQuery = firestoreQuery(
      collection(db, 'withdrawals'),
      where('userId', '==', userId)
    );

    const withdrawalsUnsub = onSnapshot(withdrawalsQuery, (snap) => {
      const records = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as WithdrawalRecord))
        .filter(r => (r as any).userId === userId)
        .sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });
      setWithdrawals(records);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'withdrawals');
    });

    return () => {
      userUnsub();
      withdrawalsUnsub();
    };
  }, []);

  const saveSettings = async () => {
    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        paymentMethod: {
          type: paymentType,
          bankName: paymentType === 'bank' ? bankName : '',
          accountNumber: paymentType === 'bank' ? accountNumber : '',
          walletAddress: paymentType === 'wallet' ? walletAddress : ''
        },
        autoWithdrawEnabled: autoWithdraw
      });
      setShowSettings(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
    }
  };

  const triggerWithdrawal = async () => {
    if (!auth.currentUser || !user) return;
    if (user.coins < MIN_WITHDRAWAL_COINS) return;

    setRequesting(true);
    try {
      const userId = auth.currentUser.uid;
      const res = await fetch("/api/withdraw/request", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amountUSD: user.coins / CONVERSION_RATE })
      });
      const data = await res.json();
      if (data.success) {
        alert("Withdrawal request submitted successfully!");
      } else {
        alert(data.error || "Withdrawal failed");
      }
    } catch (error) {
      console.error(error);
      alert("System error during withdrawal");
    } finally {
      setRequesting(false);
    }
  };

  // Auto withdrawal check
  React.useEffect(() => {
    if (user && user.autoWithdrawEnabled && user.coins >= MIN_WITHDRAWAL_COINS && user.paymentMethod?.type && !requesting) {
      const timer = setTimeout(() => {
        triggerWithdrawal();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [user?.coins, user?.autoWithdrawEnabled, user?.paymentMethod, requesting]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-amber-400 animate-spin" />
      </div>
    );
  }

  const currentUSD = (user?.coins || 0) / CONVERSION_RATE;
  const progressPercent = Math.min((user?.coins || 0) / MIN_WITHDRAWAL_COINS * 100, 100);

  return (
    <div className="p-6 space-y-8 pb-32" id="wallet-withdrawal">
      <header className="space-y-2 text-left">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-amber-400" />
          <span className="text-amber-400 text-[10px] font-black uppercase tracking-[0.2em] font-sans">Global Payout Protocol</span>
        </div>
        <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Worldwide Wallet</h2>
        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest leading-relaxed font-sans">
          Withdraw your earnings to any bank or wallet globally. $10 minimum.
        </p>
      </header>

      <DailyLoginStreak user={user} />

      {/* Balance Card */}
      <div className="relative group text-left">
        <div className="absolute -inset-1 bg-gradient-to-r from-amber-400/20 to-orange-600/20 rounded-[3rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
        <div className="relative bg-zinc-900 border border-white/5 rounded-[3rem] p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest font-sans">Available Balance</span>
              <div className="flex items-center gap-3">
                <span className="text-4xl font-black text-white font-sans">{user?.coins?.toLocaleString()}</span>
                <div className="bg-amber-400/10 text-amber-400 px-3 py-1 rounded-full text-[10px] font-black tracking-tighter uppercase font-sans">
                  Coins
                </div>
              </div>
            </div>
            <div className="text-right space-y-1">
              <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest font-sans">Estimated Value</span>
              <div className="text-2xl font-black text-amber-400 italic font-sans">
                ${currentUSD.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="space-y-4 font-sans">
            <div className="flex justify-between items-end">
              <div className="space-y-1 text-left">
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Withdrawal Threshold</p>
                <p className="text-white text-xs font-bold">${MIN_WITHDRAWAL_USD.toFixed(2)} USD Minimum</p>
              </div>
              <p className="text-zinc-400 text-[10px] font-black italic">{progressPercent.toFixed(0)}% Ready</p>
            </div>
            <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                className={cn(
                  "h-full transition-all",
                  progressPercent >= 100 ? "bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.5)]" : "bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.5)]"
                )}
              />
            </div>
          </div>

          {!user?.paymentMethod?.type ? (
            <button 
              onClick={() => setShowSettings(true)}
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 border border-white/5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Setup Withdrawal Method
            </button>
          ) : (
            <button 
              onClick={triggerWithdrawal}
              disabled={user.coins < MIN_WITHDRAWAL_COINS || requesting}
              className={cn(
                "w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 shadow-xl border-0 cursor-pointer",
                user.coins >= MIN_WITHDRAWAL_COINS 
                  ? "bg-amber-400 text-black hover:bg-amber-300 shadow-amber-400/10" 
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed grayscale"
              )}
            >
              {requesting ? <Loader2 className="w-4 h-4 animate-spin text-zinc-500" /> : (
                <>
                  <ArrowUpRight className="w-4 h-4" />
                  Withdraw to {user.paymentMethod.type.toUpperCase()}
                </>
              )}
            </button>
          )}

          {user?.autoWithdrawEnabled && (
            <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase text-green-500/60 bg-green-500/5 py-2 rounded-xl border border-green-500/10 font-mono">
              <CheckCircle2 className="w-3 h-3" />
              Auto-Withdraw Enabled
            </div>
          )}
        </div>
      </div>

      {/* Main UI Layout */}
      <div className="grid md:grid-cols-2 gap-8 text-left">
        {/* Settings / Config */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white italic uppercase tracking-widest flex items-center gap-2 font-sans">
              <Settings2 className="w-4 h-4 text-zinc-505" />
              Payment Setup
            </h3>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="text-amber-400 text-[10px] font-black uppercase tracking-widest hover:underline cursor-pointer border-0 bg-transparent outline-none"
            >
              {showSettings ? 'Cancel' : 'Edit Details'}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {showSettings ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 space-y-6 text-left"
              >
                <div className="flex p-1 bg-black gap-1 rounded-2xl border border-white/5">
                  <button 
                    onClick={() => setPaymentType('bank')}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer border-0",
                      paymentType === 'bank' ? "bg-zinc-800 text-white" : "text-zinc-650 bg-transparent hover:bg-zinc-900"
                    )}
                  >
                    <Building2 className="w-3 h-3" />
                    Bank Account
                  </button>
                  <button 
                    onClick={() => setPaymentType('wallet')}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer border-0",
                      paymentType === 'wallet' ? "bg-zinc-800 text-white" : "text-zinc-650 bg-transparent hover:bg-zinc-900"
                    )}
                  >
                    <Bitcoin className="w-3 h-3" />
                    Wallet (USDT)
                  </button>
                </div>

                <div className="space-y-4">
                  {paymentType === 'bank' ? (
                    <>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-2 font-sans">Bank Name <span className="text-amber-400">*</span></label>
                        <input 
                          value={bankName}
                          onChange={(e) => {
                            setBankName(e.target.value);
                            setTouched(prev => ({...prev, bankName: true}));
                          }}
                          onBlur={() => setTouched(prev => ({...prev, bankName: true}))}
                          placeholder="e.g. Chase, HSBC, Commercial Bank"
                          className={cn(
                            "w-full bg-black border rounded-2xl p-4 text-xs font-bold text-white outline-none transition-colors",
                            showBankNameError ? "border-red-500" : "border-white/10 focus:border-amber-400/50"
                          )}
                        />
                        {showBankNameError && <p className="text-[9px] text-red-500 px-2 italic font-mono uppercase">Bank name is required.</p>}
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-2 font-sans">Account Number / IBAN <span className="text-amber-400">*</span></label>
                        <input 
                          value={accountNumber}
                          onChange={(e) => {
                            setAccountNumber(e.target.value);
                            setTouched(prev => ({...prev, accountNumber: true}));
                          }}
                          onBlur={() => setTouched(prev => ({...prev, accountNumber: true}))}
                          placeholder="Enter global account number"
                          className={cn(
                            "w-full bg-black border rounded-2xl p-4 text-xs font-bold text-white outline-none transition-colors",
                            showAccountNumberError ? "border-red-500" : "border-white/10 focus:border-amber-400/50"
                          )}
                        />
                        {showAccountNumberError && <p className="text-[9px] text-red-500 px-2 italic font-mono uppercase">Account number must be at least 7 characters.</p>}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-2 font-sans">Wallet Address (TRC20/ERC20) <span className="text-amber-400">*</span></label>
                      <input 
                        value={walletAddress}
                        onChange={(e) => {
                          setWalletAddress(e.target.value);
                          setTouched(prev => ({...prev, walletAddress: true}));
                        }}
                        onBlur={() => setTouched(prev => ({...prev, walletAddress: true}))}
                        placeholder="Enter USDT wallet address"
                        className={cn(
                          "w-full bg-black border rounded-2xl p-4 text-xs font-bold text-white outline-none transition-colors",
                          showWalletAddressError ? "border-red-500" : "border-white/10 focus:border-amber-400/50"
                        )}
                      />
                      {showWalletAddressError && <p className="text-[9px] text-red-500 px-2 italic font-mono uppercase">Invalid wallet address length.</p>}
                    </div>
                  )}

                  <div className="flex items-center justify-between p-4 bg-black rounded-2xl border border-white/5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest font-sans">Auto-Withdraw on $10</label>
                    <button 
                      onClick={() => setAutoWithdraw(!autoWithdraw)}
                      className="w-10 h-6 bg-zinc-800 rounded-full relative p-1 cursor-pointer border-0"
                    >
                      <div className={cn("w-4 h-4 rounded-full transition-all shadow-md", autoWithdraw ? "bg-amber-400 ml-4" : "bg-zinc-600")} />
                    </button>
                  </div>

                  <button 
                    onClick={saveSettings}
                    disabled={!isFormValid}
                    className={cn(
                      "w-full bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 border-0 cursor-pointer",
                      !isFormValid ? "opacity-50 cursor-not-allowed" : "hover:bg-amber-400"
                    )}
                  >
                    Save Configuration
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center space-y-4 py-12">
                <div className="bg-zinc-800 p-4 rounded-3xl text-zinc-500">
                  {user?.paymentMethod?.type === 'bank' ? <Building2 className="w-8 h-8 text-white" /> : (user?.paymentMethod?.type === 'wallet' ? <Bitcoin className="w-8 h-8 text-white" /> : <Wallet className="w-8 h-8 text-white" />)}
                </div>
                {user?.paymentMethod?.type ? (
                  <div className="space-y-1">
                    <p className="text-white text-sm font-black uppercase italic tracking-tight font-sans">
                      {user.paymentMethod.type === 'bank' ? user.paymentMethod.bankName : 'USDT Wallet'}
                    </p>
                    <p className="text-zinc-500 text-[10px] font-medium break-all max-w-[200px] font-mono">
                      {user.paymentMethod.type === 'bank' ? user.paymentMethod.accountNumber : user.paymentMethod.walletAddress}
                    </p>
                  </div>
                ) : (
                  <p className="text-zinc-650 text-[10px] font-black uppercase tracking-widest italic font-sans">No payment method configured</p>
                )}
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Withdrawal History */}
        <div className="space-y-6 text-left">
          <h3 className="text-sm font-black text-white italic uppercase tracking-widest flex items-center gap-2 font-sans">
            <History className="w-4 h-4 text-zinc-505" />
            Payout History
          </h3>
          <div className="space-y-4">
            {withdrawals.length === 0 ? (
              <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-[2.5rem] p-12 text-center">
                <p className="text-zinc-650 text-[10px] font-black uppercase tracking-widest italic font-sans leading-relaxed">Your history will appear here once you make your first withdrawal.</p>
              </div>
            ) : (
              withdrawals.map(record => (
                <div key={record.id} className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "p-3 rounded-2xl",
                      record.status === 'completed' ? "bg-green-500/10 text-green-500" :
                      record.status === 'failed' ? "bg-red-500/10 text-red-500" : "bg-blue-500/10 text-blue-500"
                    )}>
                      {record.status === 'completed' ? <CheckCircle2 className="w-4 h-4" /> :
                       record.status === 'failed' ? <AlertCircle className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white uppercase italic tracking-tighter">${record.amountUSD}</span>
                        <span className="text-zinc-500 text-[8px] font-black uppercase tracking-widest font-sans">{record.method}</span>
                      </div>
                      <p className="text-zinc-600 text-[8px] font-bold uppercase tracking-widest font-mono">
                        {record.createdAt?.toDate ? record.createdAt.toDate().toLocaleDateString() : 'Processing...'}
                      </p>
                    </div>
                  </div>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border font-sans",
                    record.status === 'completed' ? "text-green-500 border-green-500/20" :
                    record.status === 'failed' ? "text-red-500 border-red-500/20" : "text-blue-500 border-blue-500/20"
                  )}>
                    {record.status}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
