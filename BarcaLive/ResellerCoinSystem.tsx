import React, { useState, useEffect } from 'react';
import { Coins, User, Key, Plus, ShieldAlert, History as HistoryIcon, LogIn, LayoutGrid } from 'lucide-react';

interface CoinPackage {
  id: string;
  title: string;
  coins: number;
  priceETB: number;
}

interface LocalTransaction {
  type: string;
  coins: number;
  amount?: number;
  date: string;
}

interface LocalReseller {
  email: string;
  balance: number;
  transactions: LocalTransaction[];
  role: string;
}

export default function ResellerCoinSystem() {
  // Theme Toggle: Styled Barca-live vs. Classic HTML rendering
  const [styleTheme, setStyleTheme] = useState<'app' | 'classic'>('app');

  // Input States
  const [loginUserId, setLoginUserId] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginStatus, setLoginStatus] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' });

  // Admin key inputs
  const [adminKey, setAdminKey] = useState('');
  const [targetUser, setTargetUser] = useState('');
  const [adminCoins, setAdminCoins] = useState('');
  const [adminResult, setAdminResult] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' });

  // Create Package inputs
  const [pkgTitle, setPkgTitle] = useState('');
  const [pkgCoins, setPkgCoins] = useState('');
  const [pkgPrice, setPkgPrice] = useState('');
  const [packageResult, setPackageResult] = useState<{ text: string; type: 'success' | 'error' | '' }>({ text: '', type: '' });

  // Database states
  const [users, setUsers] = useState<Record<string, LocalReseller>>({});
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  // Constants
  const ADMIN_SECRET = "BARCA_ADMIN_2026";

  // Bootstrap initial database from localStorage or default template
  useEffect(() => {
    const savedUsers = localStorage.getItem("users");
    const savedPackages = localStorage.getItem("packages");
    const savedCurrentUser = localStorage.getItem("currentUser");

    if (savedUsers) {
      setUsers(JSON.parse(savedUsers));
    } else {
      setUsers({});
    }

    if (savedPackages) {
      setPackages(JSON.parse(savedPackages));
    } else {
      const defaultPkgs: CoinPackage[] = [
        { id: "pkg1", title: "100K Coins", coins: 100000, priceETB: 500 },
        { id: "pkg2", title: "1 Million Coins", coins: 1000000, priceETB: 5000 },
        { id: "pkg3", title: "10 Million Coins", coins: 10000000, priceETB: 45000 }
      ];
      setPackages(defaultPkgs);
      localStorage.setItem("packages", JSON.stringify(defaultPkgs));
    }

    if (savedCurrentUser) {
      setCurrentUser(savedCurrentUser);
    }
  }, []);

  // Sync state back to LocalStorage
  const saveDatabase = (updatedUsers: Record<string, LocalReseller>, updatedPackages?: CoinPackage[]) => {
    localStorage.setItem("users", JSON.stringify(updatedUsers));
    if (updatedPackages) {
      localStorage.setItem("packages", JSON.stringify(updatedPackages));
    }
  };

  // Login handler
  const handleLogin = () => {
    if (!loginUserId.trim() || !loginEmail.trim()) {
      alert("Please fill all fields");
      return;
    }

    const updatedUsers = { ...users };
    if (!updatedUsers[loginUserId]) {
      updatedUsers[loginUserId] = {
        email: loginEmail,
        balance: 0,
        transactions: [],
        role: "reseller"
      };
    }

    setUsers(updatedUsers);
    setCurrentUser(loginUserId);
    localStorage.setItem("currentUser", loginUserId);
    saveDatabase(updatedUsers);

    setLoginStatus({ text: "Login Successful", type: "success" });
    setTimeout(() => {
      setLoginStatus({ text: "", type: "" });
    }, 4000);
  };

  // Logout / Switch Account
  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("currentUser");
  };

  // Buy package handler
  const handleBuyPackage = (pkg: CoinPackage) => {
    if (!currentUser) {
      alert("Please login first");
      return;
    }

    const paymentSuccess = window.confirm(
      `Pay ${pkg.priceETB} ETB for ${pkg.coins.toLocaleString()} coins?`
    );

    if (!paymentSuccess) {
      return;
    }

    const updatedUsers = { ...users };
    if (updatedUsers[currentUser]) {
      updatedUsers[currentUser].balance += pkg.coins;
      updatedUsers[currentUser].transactions.push({
        type: "purchase",
        coins: pkg.coins,
        amount: pkg.priceETB,
        date: new Date().toLocaleString()
      });

      setUsers(updatedUsers);
      saveDatabase(updatedUsers);
      alert(`${pkg.coins.toLocaleString()} Coins Added Successfully`);
    } else {
      alert("Active session error. Please log in again.");
    }
  };

  // Admin add massive coins with verification
  const handleAdminAddCoins = () => {
    if (adminKey !== ADMIN_SECRET) {
      setAdminResult({ text: "Unauthorized: Invalid Secret Key", type: "error" });
      return;
    }

    const coinsToDeposit = Number(adminCoins);
    if (!targetUser.trim() || isNaN(coinsToDeposit) || coinsToDeposit <= 0) {
      setAdminResult({ text: "Please enter valid Target ID and Coin Amount", type: "error" });
      return;
    }

    const updatedUsers = { ...users };
    if (!updatedUsers[targetUser]) {
      updatedUsers[targetUser] = {
        email: "admin_generated@barca.live",
        balance: 0,
        transactions: [],
        role: "reseller"
      };
    }

    updatedUsers[targetUser].balance += coinsToDeposit;
    updatedUsers[targetUser].transactions.push({
      type: "admin_deposit",
      coins: coinsToDeposit,
      date: new Date().toLocaleString()
    });

    setUsers(updatedUsers);
    saveDatabase(updatedUsers);

    setAdminResult({ text: "Huge Coins Generated Successfully", type: "success" });
    setTargetUser('');
    setAdminCoins('');

    setTimeout(() => {
      setAdminResult({ text: "", type: "" });
    }, 5000);
  };

  // Admin create custom packages
  const handleCreatePackage = () => {
    if (adminKey !== ADMIN_SECRET) {
      setPackageResult({ text: "Unauthorized: Invalid Secret Key", type: "error" });
      return;
    }

    const amountOfCoins = Number(pkgCoins);
    const amountOfPrice = Number(pkgPrice);

    if (!pkgTitle.trim() || isNaN(amountOfCoins) || isNaN(amountOfPrice) || amountOfCoins <= 0 || amountOfPrice <= 0) {
      setPackageResult({ text: "Invalid Package setup parameters", type: "error" });
      return;
    }

    const newPackage: CoinPackage = {
      id: "pkg" + Date.now(),
      title: pkgTitle,
      coins: amountOfCoins,
      priceETB: amountOfPrice
    };

    const updatedPackages = [...packages, newPackage];
    setPackages(updatedPackages);
    saveDatabase(users, updatedPackages);

    setPackageResult({ text: "Package Created Successfully", type: "success" });
    setPkgTitle('');
    setPkgCoins('');
    setPkgPrice('');

    setTimeout(() => {
      setPackageResult({ text: "", type: "" });
    }, 5000);
  };

  // Profile fields helper
  const profile = currentUser ? users[currentUser] : null;
  const history = profile?.transactions || [];

  return (
    <div className="space-y-6">
      {/* Visual Mode Selector Panel */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-[2rem] p-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <LayoutGrid className="w-4 h-4 text-rose-400" />
          </div>
          <div>
            <h4 className="text-[10px] text-white font-black uppercase tracking-wider">Visual Aesthetic Switcher</h4>
            <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">Toggle design frame for this integrated asset system</p>
          </div>
        </div>
        <div className="flex bg-zinc-900 p-1 border border-zinc-800 rounded-xl">
          <button
            onClick={() => setStyleTheme('app')}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              styleTheme === 'app'
                ? 'bg-amber-400 text-black font-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Barca-live Sport Theme
          </button>
          <button
            onClick={() => setStyleTheme('classic')}
            className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              styleTheme === 'classic'
                ? 'bg-amber-400 text-black font-black'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Classic HTML Styling
          </button>
        </div>
      </div>

      {styleTheme === 'app' ? (
        // ==========================================
        // MODERN SPORT DARK THEME (HIGH FIDELITY)
        // ==========================================
        <div className="space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl font-black italic uppercase tracking-tight text-white flex items-center justify-center gap-2">
              <Coins className="text-amber-400 w-6 h-6 animate-pulse" />
              Barca-live Reseller Coin System
            </h2>
            <p className="text-[8.5px] text-zinc-500 font-bold uppercase tracking-widest">
              Secure virtual currency bulk distribution and retail portal
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Frame: Authentication and Balances */}
            <div className="lg:col-span-4 space-y-6">
              {/* Authenticator View */}
              <div className="bg-zinc-900/40 border border-zinc-850 p-6 rounded-[2rem] space-y-4">
                <div className="flex items-center gap-2">
                  <div className="bg-amber-400/10 p-1.5 rounded-lg">
                    <LogIn className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-white text-xs font-black uppercase">Reseller Session Authenticator</h3>
                    <p className="text-[7.5px] text-zinc-500 font-bold uppercase mt-0.5">Mock portal sign-in</p>
                  </div>
                </div>

                {currentUser ? (
                  <div className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl space-y-3">
                    <div className="space-y-0.5">
                      <span className="text-[7.5px] text-zinc-500 font-bold uppercase block">ACTIVE MEMBER STATUS</span>
                      <p className="text-white text-xs font-black uppercase select-all truncate">Reseller ID: {currentUser}</p>
                      <p className="text-[8.5px] text-zinc-400 font-semibold truncate">{profile?.email}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full py-2 border border-rose-500/20 hover:border-rose-500/40 bg-rose-500/5 hover:bg-rose-500/10 text-rose-400 text-[8.5px] font-black uppercase tracking-widest rounded-xl transition-all"
                    >
                      Logout Session
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[7.5px] text-zinc-500 font-black uppercase block px-1">Reseller Account ID</label>
                      <input
                        type="text"
                        placeholder="e.g. reseller_addis_9"
                        value={loginUserId}
                        onChange={(e) => setLoginUserId(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-400/30 text-white font-mono text-xs rounded-xl p-3 outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[7.5px] text-zinc-500 font-black uppercase block px-1">Email Address</label>
                      <input
                        type="email"
                        placeholder="reseller@barca.live"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 focus:border-amber-400/30 text-white font-mono text-xs rounded-xl p-3 outline-none"
                      />
                    </div>
                    <button
                      onClick={handleLogin}
                      className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-black font-black text-[9.5px] uppercase tracking-wider rounded-xl transition-all hover:scale-[1.01]"
                    >
                      Login Account
                    </button>
                    {loginStatus.text && (
                      <p className={`text-center font-bold text-[8.5px] uppercase tracking-wider ${loginStatus.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        ● {loginStatus.text}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Wallet Card */}
              <div className="bg-zinc-900/40 border border-zinc-850 p-6 rounded-[2rem] space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[7px] text-zinc-500 font-mono font-black uppercase tracking-widest block">SYSTEM METRICS</span>
                    <h3 className="text-white text-xs font-black uppercase">Wallet Balance</h3>
                  </div>
                  <div className="bg-yellow-400 text-black px-2 py-0.5 rounded-full text-[7.5px] font-black tracking-widest uppercase">
                    VIP RESELLER
                  </div>
                </div>

                <div className="bg-zinc-950 border border-zinc-850/60 p-5 rounded-2xl flex flex-col items-center justify-center space-y-1 min-h-[100px]">
                  <span className="text-[25px] leading-none text-emerald-400 font-mono font-black animate-pulse">
                    🪙 {(profile?.balance || 0).toLocaleString()}
                  </span>
                  <span className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest mt-1">AVAILABLE LOCAL BALANCE</span>
                </div>
              </div>
            </div>

            {/* Center Frame: Buy Packages store */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-zinc-900/40 border border-zinc-850 p-6 rounded-[2rem] space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="bg-emerald-500/10 p-1.5 rounded-lg">
                      <Coins className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="text-white text-xs font-black uppercase">Buy Coin Packages</h3>
                      <p className="text-[7.5px] text-zinc-500 font-bold uppercase">Predefined retail coin packages</p>
                    </div>
                  </div>
                  <span className="text-[8px] bg-emerald-500/15 text-emerald-400 font-mono px-2 py-0.5 rounded font-black border border-emerald-500/10">
                    SIMULATED WALLET PAY
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {packages.map((pkg) => (
                    <div key={pkg.id} className="bg-zinc-950 border border-zinc-805 hover:border-zinc-800 p-4.5 rounded-2xl flex flex-col justify-between space-y-4 transition-all">
                      <div>
                        <h4 className="text-white text-base font-black uppercase tracking-tight">{pkg.title}</h4>
                        <p className="text-[9.5px] font-mono text-zinc-500 mt-0.5">Coins: <span className="text-amber-400 font-bold font-mono">{pkg.coins.toLocaleString()}</span></p>
                        <p className="text-[9.5px] font-mono text-zinc-500">Price: <span className="text-zinc-300 font-bold font-mono">{pkg.priceETB} ETB</span></p>
                      </div>

                      <button
                        onClick={() => handleBuyPackage(pkg)}
                        className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-black text-[9px] uppercase tracking-wider rounded-lg transition-all"
                      >
                        Buy Now
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Transactions Ledger */}
              <div className="bg-zinc-900/40 border border-zinc-850 p-6 rounded-[2rem] space-y-4">
                <div className="flex items-center gap-2">
                  <div className="bg-zinc-800 p-1.5 rounded-lg">
                    <HistoryIcon className="w-4 h-4 text-zinc-400" />
                  </div>
                  <div>
                    <h3 className="text-white text-xs font-black uppercase">Transaction History</h3>
                    <p className="text-[7.5px] text-zinc-500 font-bold uppercase">Historic portal orders</p>
                  </div>
                </div>

                <div className="max-h-[150px] overflow-y-auto border border-zinc-850 rounded-xl divide-y divide-zinc-900 bg-zinc-950 p-1">
                  {history.length === 0 ? (
                    <div className="p-8 text-center text-zinc-600 text-[9px] uppercase font-black tracking-widest font-mono">
                      No transactions yet
                    </div>
                  ) : (
                    [...history].reverse().map((tx, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between text-[10px] font-mono">
                        <div className="space-y-0.5">
                          <span className={`text-[7.5px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            tx.type === 'purchase' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/10' : 'bg-purple-500/10 text-purple-400 border border-purple-500/10'
                          }`}>
                            {tx.type}
                          </span>
                          <span className="text-zinc-550 block text-[8.5px] mt-0.5">Date: {tx.date}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-white font-bold block">+{tx.coins.toLocaleString()} COINS</span>
                          {tx.amount && <span className="text-zinc-500 text-[8px] block">{tx.amount} ETB PAID</span>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Red Admin Border console */}
              <div className="bg-zinc-900/40 border-2 border-red-500/50 p-6 rounded-[2rem] space-y-6">
                <div className="flex items-center gap-2">
                  <div className="bg-red-500/15 p-1.5 rounded-lg border border-red-500/20">
                    <ShieldAlert className="w-4 h-4 text-red-400 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-white text-xs font-black uppercase tracking-tight">System Admin Console</h3>
                    <p className="text-[7.5px] text-rose-500 font-bold uppercase">Authorized minting & configuration panel</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Column Forge coins */}
                  <div className="space-y-3.5">
                    <h4 className="text-white text-[10.5px] font-bold uppercase tracking-tight">Mass Assets Minting</h4>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[7.5px] text-zinc-500 font-bold uppercase px-0.5 block">Admin Secret Key</label>
                        <input
                          type="password"
                          placeholder="Secret Pass"
                          value={adminKey}
                          onChange={(e) => setAdminKey(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-500/30 text-white font-mono text-xs rounded-xl p-2.5 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[7.5px] text-zinc-500 font-bold uppercase px-0.5 block">Target Reseller ID</label>
                        <input
                          type="text"
                          placeholder="e.g. reseller_addis_9"
                          value={targetUser}
                          onChange={(e) => setTargetUser(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-500/30 text-white font-mono text-xs rounded-xl p-2.5 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[7.5px] text-zinc-500 font-bold uppercase px-0.5 block">Coins Amount</label>
                        <input
                          type="number"
                          placeholder="Mass Balance"
                          value={adminCoins}
                          onChange={(e) => setAdminCoins(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-500/30 text-white font-mono text-xs rounded-xl p-2.5 outline-none"
                        />
                      </div>

                      <button
                        onClick={handleAdminAddCoins}
                        className="w-full py-2.5 bg-red-650 hover:bg-red-700 text-white font-black text-[9px] uppercase tracking-wider rounded-xl transition-all"
                      >
                        Generate Huge Coins
                      </button>

                      {adminResult.text && (
                        <p className={`text-[8.5px] text-center font-bold uppercase tracking-wider ${adminResult.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          ● {adminResult.text}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Create Package */}
                  <div className="space-y-3.5 border-t md:border-t-0 md:border-l border-zinc-850 pt-4 md:pt-0 md:pl-6">
                    <h4 className="text-white text-[10.5px] font-bold uppercase tracking-tight">Create Custom Pack</h4>
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[7.5px] text-zinc-500 font-bold uppercase px-0.5 block">Package Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Platinum wholesale"
                          value={pkgTitle}
                          onChange={(e) => setPkgTitle(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-500/30 text-white text-xs rounded-xl p-2.5 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[7.5px] text-zinc-500 font-bold uppercase px-0.5 block">Coin Amount</label>
                        <input
                          type="number"
                          placeholder="e.g. 50000000"
                          value={pkgCoins}
                          onChange={(e) => setPkgCoins(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-500/30 text-white font-mono text-xs rounded-xl p-2.5 outline-none"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[7.5px] text-zinc-500 font-bold uppercase px-0.5 block">Price ETB</label>
                        <input
                          type="number"
                          placeholder="e.g. 150000"
                          value={pkgPrice}
                          onChange={(e) => setPkgPrice(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-500/30 text-white font-mono text-xs rounded-xl p-2.5 outline-none"
                        />
                      </div>

                      <button
                        onClick={handleCreatePackage}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-black text-[9px] uppercase tracking-wider rounded-xl transition-all"
                      >
                        Create Package
                      </button>

                      {packageResult.text && (
                        <p className={`text-[8.5px] text-center font-bold uppercase tracking-wider ${packageResult.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          ● {packageResult.text}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // ==========================================
        // CLASSIC HTML LITERAL VERSION requested
        // ==========================================
        <div className="p-5 font-sans bg-[#0f172a] text-white rounded-[2rem] border border-zinc-800">
          <div className="text-center bg-[#111827] py-5 px-3 text-2xl md:text-3xl font-bold rounded-2xl select-none mb-6">
            Barca-live Reseller Coin System
          </div>

          <div className="max-w-4xl mx-auto space-y-6 text-left">
            {/* Login card */}
            <div className="bg-[#1e293b] p-5 rounded-2xl">
              <h2 className="text-lg font-bold border-b border-zinc-700/50 pb-2 mb-4">Reseller Login</h2>
              {currentUser ? (
                <div className="space-y-3">
                  <p className="text-emerald-400 font-bold text-sm">Session state: Logged in!</p>
                  <p className="text-xs text-zinc-300">Reseller Account ID: <span className="font-mono">{currentUser}</span></p>
                  <p className="text-xs text-zinc-300">Email: <span className="font-mono">{profile?.email}</span></p>
                  <button 
                    onClick={handleLogout}
                    className="w-full md:w-auto px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors text-xs font-bold uppercase tracking-wider"
                  >
                    Logout Reseller
                  </button>
                </div>
              ) : (
                <div className="space-y-1">
                  <input
                    type="text"
                    value={loginUserId}
                    onChange={(e) => setLoginUserId(e.target.value)}
                    placeholder="Enter Reseller Account ID"
                    className="w-full p-3 bg-[#0f172a] border border-zinc-800 text-white rounded-xl text-sm placeholder-zinc-500 focus:outline-none mb-3"
                  />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="Enter Email"
                    className="w-full p-3 bg-[#0f172a] border border-zinc-800 text-white rounded-xl text-sm placeholder-zinc-500 focus:outline-none mb-4"
                  />
                  <button
                    onClick={handleLogin}
                    className="w-full p-3.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold rounded-xl text-sm tracking-wider"
                  >
                    Login
                  </button>
                  {loginStatus.text && (
                    <p className={`mt-3 text-xs font-bold ${loginStatus.type === 'success' ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                      {loginStatus.text}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Balance Card */}
            <div className="bg-[#1e293b] p-5 rounded-2xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold">Wallet Balance</h2>
                <div className="bg-yellow-400 text-black font-bold text-[10px] px-2.5 py-1 rounded-full uppercase tracking-widest animate-pulse">
                  VIP RESELLER
                </div>
              </div>

              <div className="text-[35px] text-[#22c55e] text-center font-bold font-mono">
                🪙 <span>{(profile?.balance || 0).toLocaleString()}</span>
              </div>
            </div>

            {/* Buy Packages Card */}
            <div className="bg-[#1e293b] p-5 rounded-2xl">
              <h2 className="text-lg font-bold border-b border-zinc-700/50 pb-2 mb-4">Buy Coin Packages</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {packages.map((pkg) => (
                  <div key={pkg.id} className="bg-[#334155] p-4 rounded-xl space-y-3">
                    <h3 className="text-base font-bold text-white">{pkg.title}</h3>
                    <p className="text-xs text-zinc-300">Coins: {pkg.coins.toLocaleString()}</p>
                    <p className="text-xs text-zinc-300">Price: {pkg.priceETB} ETB</p>
                    <button
                      onClick={() => handleBuyPackage(pkg)}
                      className="w-full p-2.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold rounded-lg text-xs"
                    >
                      Buy Now
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Transaction history card */}
            <div className="bg-[#1e293b] p-5 rounded-2xl">
              <h2 className="text-lg font-bold border-b border-zinc-700/50 pb-2 mb-4">Transaction History</h2>
              <div className="space-y-2 max-h-[160px] overflow-y-auto">
                {history.length === 0 ? (
                  <p className="text-zinc-500 font-mono text-xs italic text-center py-4">No Transactions Yet</p>
                ) : (
                  [...history].reverse().map((tx, idx) => (
                    <div key={idx} className="bg-[#0f172a] p-3 rounded-lg text-xs font-mono space-y-1">
                      <p className="text-zinc-300">Type: <span className="uppercase text-amber-400 font-bold">{tx.type}</span></p>
                      <p className="text-zinc-300">Coins: <span className="text-emerald-400">{tx.coins.toLocaleString()}</span></p>
                      <p className="text-zinc-400 text-[10px]">Date: {tx.date}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Admin controller card */}
            <div className="bg-[#1e293b] p-5 rounded-[2rem] border-2 border-[#ef4444]">
              <h2 className="text-lg font-bold text-[#ef4444] border-b border-red-500/20 pb-2 mb-4">Admin Panel</h2>

              <input
                type="password"
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="Admin Secret Key"
                className="w-full p-3 bg-[#0f172a] border border-zinc-800 text-white rounded-xl text-sm placeholder-zinc-500 mb-3"
              />

              <input
                type="text"
                value={targetUser}
                onChange={(e) => setTargetUser(e.target.value)}
                placeholder="Target Reseller ID"
                className="w-full p-3 bg-[#0f172a] border border-zinc-800 text-white rounded-xl text-sm placeholder-zinc-500 mb-3"
              />

              <input
                type="number"
                value={adminCoins}
                onChange={(e) => setAdminCoins(e.target.value)}
                placeholder="Coins Amount"
                className="w-full p-3 bg-[#0f172a] border border-zinc-800 text-white rounded-xl text-sm placeholder-zinc-500 mb-4"
              />

              <button
                onClick={handleAdminAddCoins}
                className="w-full p-3.5 bg-[#ef4444] hover:bg-red-700 text-white font-bold rounded-xl text-sm"
              >
                Generate Huge Coins
              </button>

              {adminResult.text && (
                <p className={`mt-3 text-xs font-bold ${adminResult.type === 'success' ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                  {adminResult.text}
                </p>
              )}

              <hr className="my-6 border-zinc-700/50" />

              <h3 className="text-base font-bold mb-3">Create Coin Package</h3>

              <input
                type="text"
                value={pkgTitle}
                onChange={(e) => setPkgTitle(e.target.value)}
                placeholder="Package Name"
                className="w-full p-3 bg-[#0f172a] border border-zinc-800 text-white rounded-xl text-sm placeholder-zinc-500 mb-3"
              />

              <input
                type="number"
                value={pkgCoins}
                onChange={(e) => setPkgCoins(e.target.value)}
                placeholder="Coin Amount"
                className="w-full p-3 bg-[#0f172a] border border-zinc-800 text-white rounded-xl text-sm placeholder-zinc-500 mb-3"
              />

              <input
                type="number"
                value={pkgPrice}
                onChange={(e) => setPkgPrice(e.target.value)}
                placeholder="Price ETB"
                className="w-full p-3 bg-[#0f172a] border border-zinc-800 text-white rounded-xl text-sm placeholder-zinc-500 mb-4"
              />

              <button
                onClick={handleCreatePackage}
                className="w-full p-3.5 bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold rounded-xl text-sm"
              >
                Create Package
              </button>

              {packageResult.text && (
                <p className={`mt-3 text-xs font-bold ${packageResult.type === 'success' ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                  {packageResult.text}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
