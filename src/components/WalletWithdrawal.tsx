import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wallet, 
  Banknote, 
  Globe, 
  ArrowUpRight, 
  History, 
  Settings2, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ArrowRight,
  Loader2,
  Building2,
  Bitcoin
} from 'lucide-react';
import { cn } from '../lib/utils';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, updateDoc, setDoc, serverTimestamp, increment, getDoc, collection, query as firestoreQuery, orderBy as firestoreOrderBy, onSnapshot, addDoc, where } from 'firebase/firestore';

const CONVERSION_RATE = 1000; // 1000 coins = $1
const MIN_WITHDRAWAL_USD = 10;
const MIN_WITHDRAWAL_COINS = MIN_WITHDRAWAL_USD * CONVERSION_RATE;

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
      where('userId', '==', userId),
      firestoreOrderBy('createdAt', 'desc')
    );

    const withdrawalsUnsub = onSnapshot(withdrawalsQuery, (snap) => {
      const records = snap.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as WithdrawalRecord))
        .filter(r => (r as any).userId === userId);
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
      // Small delay to prevent infinite loops or accidental triggers
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
    <div className="p-6 space-y-8 pb-32">
      <header className="space-y-2">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-amber-400" />
          <span className="text-amber-400 text-[10px] font-black uppercase tracking-[0.2em]">Global Payout Protocol</span>
        </div>
        <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Worldwide Wallet</h2>
        <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest leading-relaxed">
          Withdraw your earnings to any bank or wallet globally. $10 minimum.
        </p>
      </header>

      {/* Balance Card */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-amber-400/20 to-orange-600/20 rounded-[3rem] blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
        <div className="relative bg-zinc-900 border border-white/5 rounded-[3rem] p-8 space-y-6">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Available Balance</span>
              <div className="flex items-center gap-3">
                <span className="text-4xl font-black text-white">{user?.coins?.toLocaleString()}</span>
                <div className="bg-amber-400/10 text-amber-400 px-3 py-1 rounded-full text-[10px] font-black tracking-tighter uppercase">
                  Coins
                </div>
              </div>
            </div>
            <div className="text-right space-y-1">
              <span className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Estimated Value</span>
              <div className="text-2xl font-black text-amber-400 italic">
                ${currentUSD.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <div className="space-y-1">
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
              className="w-full bg-zinc-800 hover:bg-zinc-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 border border-white/5"
            >
              <Plus className="w-4 h-4" />
              Setup Withdrawal Method
            </button>
          ) : (
            <button 
              onClick={triggerWithdrawal}
              disabled={user.coins < MIN_WITHDRAWAL_COINS || requesting}
              className={cn(
                "w-full py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2 shadow-xl",
                user.coins >= MIN_WITHDRAWAL_COINS 
                  ? "bg-amber-400 text-black hover:bg-amber-300 shadow-amber-400/10" 
                  : "bg-zinc-800 text-zinc-500 cursor-not-allowed grayscale"
              )}
            >
              {requesting ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <>
                  <ArrowUpRight className="w-4 h-4" />
                  Withdraw to {user.paymentMethod.type.toUpperCase()}
                </>
              )}
            </button>
          )}

          {user?.autoWithdrawEnabled && (
            <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase text-green-500/60 bg-green-500/5 py-2 rounded-xl border border-green-500/10">
              <CheckCircle2 className="w-3 h-3" />
              Auto-Withdraw Enabled
            </div>
          )}
        </div>
      </div>

      {/* Main UI Layout */}
      <div className="grid md:grid-cols-2 gap-8">
        {/* Settings / Config */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white italic uppercase tracking-widest flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-zinc-500" />
              Payment Setup
            </h3>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="text-amber-400 text-[10px] font-black uppercase tracking-widest hover:underline"
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
                className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 space-y-6"
              >
                <div className="flex p-1 bg-black gap-1 rounded-2xl border border-white/5">
                  <button 
                    onClick={() => setPaymentType('bank')}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all",
                      paymentType === 'bank' ? "bg-zinc-800 text-white" : "text-zinc-600 hover:bg-zinc-900"
                    )}
                  >
                    <Building2 className="w-3 h-3" />
                    Bank Account
                  </button>
                  <button 
                    onClick={() => setPaymentType('wallet')}
                    className={cn(
                      "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all",
                      paymentType === 'wallet' ? "bg-zinc-800 text-white" : "text-zinc-600 hover:bg-zinc-900"
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
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-2">Bank Name <span className="text-amber-400">*</span></label>
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
                            showBankNameError ? "border-red-500" : "border-white/10 focus:border-amber-400"
                          )}
                        />
                        {showBankNameError && <p className="text-[9px] text-red-500 px-2 italic">Bank name is required.</p>}
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-2">Account Number / IBAN <span className="text-amber-400">*</span></label>
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
                            showAccountNumberError ? "border-red-500" : "border-white/10 focus:border-amber-400"
                          )}
                        />
                        {showAccountNumberError && <p className="text-[9px] text-red-500 px-2 italic">Account number must be at least 7 characters.</p>}
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest px-2">Wallet Address (TRC20/ERC20) <span className="text-amber-400">*</span></label>
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
                          showWalletAddressError ? "border-red-500" : "border-white/10 focus:border-amber-400"
                        )}
                      />
                      {showWalletAddressError && <p className="text-[9px] text-red-500 px-2 italic">Invalid wallet address length.</p>}
                    </div>
                  )}

                  <div className="flex items-center justify-between p-4 bg-black rounded-2xl border border-white/5">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Auto-Withdraw on $10</label>
                    <button 
                      onClick={() => setAutoWithdraw(!autoWithdraw)}
                      className="w-10 h-6 bg-zinc-800 rounded-full relative p-1"
                    >
                      <div className={cn("w-4 h-4 rounded-full transition-all shadow-md", autoWithdraw ? "bg-amber-400 ml-4" : "bg-zinc-600")} />
                    </button>
                  </div>

                  <button 
                    onClick={saveSettings}
                    disabled={!isFormValid}
                    className={cn(
                      "w-full bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2",
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
                  {user?.paymentMethod?.type === 'bank' ? <Building2 className="w-8 h-8" /> : (user?.paymentMethod?.type === 'wallet' ? <Bitcoin className="w-8 h-8" /> : <Wallet className="w-8 h-8" />)}
                </div>
                {user?.paymentMethod?.type ? (
                  <div className="space-y-1">
                    <p className="text-white text-sm font-black uppercase italic tracking-tight">
                      {user.paymentMethod.type === 'bank' ? user.paymentMethod.bankName : 'USDT Wallet'}
                    </p>
                    <p className="text-zinc-500 text-[10px] font-medium break-all max-w-[200px]">
                      {user.paymentMethod.type === 'bank' ? user.paymentMethod.accountNumber : user.paymentMethod.walletAddress}
                    </p>
                  </div>
                ) : (
                  <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest italic">No payment method configured</p>
                )}
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Withdrawal History */}
        <div className="space-y-6">
          <h3 className="text-sm font-black text-white italic uppercase tracking-widest flex items-center gap-2">
            <History className="w-4 h-4 text-zinc-500" />
            Payout History
          </h3>
          <div className="space-y-4">
            {withdrawals.length === 0 ? (
              <div className="bg-zinc-900/40 border border-dashed border-zinc-800 rounded-[2.5rem] p-12 text-center">
                <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest italic">Your history will appear here once you make your first withdrawal.</p>
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
                        <span className="text-zinc-500 text-[8px] font-black uppercase tracking-widest">{record.method}</span>
                      </div>
                      <p className="text-zinc-600 text-[8px] font-bold uppercase tracking-widest">
                        {record.createdAt?.toDate ? record.createdAt.toDate().toLocaleDateString() : 'Processing...'}
                      </p>
                    </div>
                  </div>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border",
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
