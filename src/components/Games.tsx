import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gamepad2, Coins, Trophy, RefreshCw, Play, ShieldAlert, Award, Star } from 'lucide-react';
import { db, auth } from './firebase';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';

export default function Games() {
  const [activeMiniGame, setActiveMiniGame] = useState<'picker' | 'spinner' | null>(null);
  
  // Coin balance state
  const [coins, setCoins] = useState(1200);
  
  // Game 1: Choice Picker (Sports prediction)
  const [multiplier, setMultiplier] = useState(1.85);
  const [selectedMatch, setSelectedMatch] = useState('FC_Barcelona_vs_Real_Madrid');
  const [selectedOutcome, setSelectedOutcome] = useState<'barca' | 'draw' | 'rival'>('barca');
  const [betAmount, setBetAmount] = useState('100');
  const [pickerStatus, setPickerStatus] = useState<'idle' | 'running' | 'won' | 'lost'>('idle');
  const [outcomeResultText, setOutcomeResultText] = useState('');

  // Game 2: Coin Jackpot spinner
  const [spinnerDeg, setSpinnerDeg] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [jackpotPayout, setJackpotPayout] = useState(0);

  const handleRunPrediction = () => {
    const bet = parseInt(betAmount);
    if (isNaN(bet) || bet <= 0 || bet > coins) {
      alert('Specify positive bet input inside your current coin balance.');
      return;
    }

    setPickerStatus('running');
    setOutcomeResultText('Simulating dynamic match vectors on cloud nodes...');
    
    setTimeout(() => {
      // Determine Barca live odds match outcomes
      const rand = Math.random();
      const hasWon = rand < 0.6; // 60% win chance for Barça inside applet
      
      const multiplierPayout = Math.floor(bet * multiplier);
      
      if (hasWon) {
        setPickerStatus('won');
        setOutcomeResultText(`VICTORY! Match ended 3-1 Barça. Payout: +${multiplierPayout} Coins!`);
        setCoins(prev => prev + multiplierPayout - bet);
        // Sync coin state to Firestore if needed
        syncCoinsDb(multiplierPayout - bet);
      } else {
        setPickerStatus('lost');
        setOutcomeResultText(`DEFEAT! Real Madrid scored in 92nd minute. Deficit: -${bet} Coins.`);
        setCoins(prev => prev - bet);
        syncCoinsDb(-bet);
      }
    }, 1500);
  };

  const handleSpinJackpot = () => {
    if (isSpinning) return;
    if (coins < 250) {
      alert('Spinner ticket costs 250 coins!');
      return;
    }

    setIsSpinning(true);
    setJackpotPayout(0);
    const cost = 250;
    setCoins(prev => prev - cost);
    syncCoinsDb(-cost);

    const spinDegrees = spinnerDeg + 1440 + Math.floor(Math.random() * 360);
    setSpinnerDeg(spinDegrees);

    setTimeout(() => {
      setIsSpinning(false);
      // Determine payout based on angle
      const payouts = [0, 50, 500, 1000, 5000, 150, 0, 300];
      const win = payouts[Math.floor(Math.random() * payouts.length)];
      setJackpotPayout(win);
      if (win > 0) {
        setCoins(prev => prev + win);
        syncCoinsDb(win);
      }
    }, 3000);
  };

  const syncCoinsDb = async (delta: number) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    try {
      const ref = doc(db, 'users', currentUser.uid);
      await updateDoc(ref, {
        coins: increment(delta)
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="bg-zinc-950 border border-white/5 rounded-[3rem] p-6 text-left max-w-xl mx-auto space-y-6">
      <div className="flex justify-between items-center border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <Gamepad2 className="w-5 h-5 text-amber-400" />
          <h3 className="text-white font-black uppercase tracking-tight italic text-lg">Live Mini Arcade</h3>
        </div>
        
        <div className="flex items-center gap-1 bg-black/60 border border-white/5 px-3 py-1.5 rounded-full font-mono">
          <Coins className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
          <span className="text-amber-450 text-[10px] font-black">{coins.toLocaleString()}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div 
          onClick={() => setActiveMiniGame('picker')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            activeMiniGame === 'picker' 
              ? 'bg-amber-400/5 border-amber-400' 
              : 'bg-zinc-900/50 border-white/5 hover:border-white/10'
          }`}
        >
          <Award className="w-6 h-6 text-amber-400 mb-2" />
          <p className="text-white text-xs font-black uppercase">FC Barca Predictions</p>
          <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-wider">Predict match outcome & win coins</p>
        </div>

        <div 
          onClick={() => setActiveMiniGame('spinner')}
          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
            activeMiniGame === 'spinner' 
              ? 'bg-amber-400/5 border-amber-400' 
              : 'bg-zinc-900/50 border-white/5 hover:border-white/10'
          }`}
        >
          <Star className="w-6 h-6 text-pink-400 mb-2" />
          <p className="text-white text-xs font-black uppercase">Vegas Wheel Spin</p>
          <p className="text-zinc-500 text-[9px] font-bold uppercase tracking-wider">Spin jackpot wheel, win multipliers</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeMiniGame === 'picker' && (
          <motion.div 
            key="picker"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-zinc-900/40 border border-white/5 rounded-3xl p-5 space-y-4"
          >
            <div>
              <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest">Active Match Matchup</p>
              <h4 className="text-sm font-black text-white uppercase italic">FC Barcelona vs Real Madrid CF</h4>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'barca', label: '🔵 FCB Win', odds: '1.85' },
                { id: 'draw', label: '⚪ Draw', odds: '3.40' },
                { id: 'rival', label: '⚪ RMD Win', odds: '2.95' }
              ].map(opt => (
                <div 
                  key={opt.id}
                  onClick={() => {
                    setSelectedOutcome(opt.id as any);
                    setMultiplier(parseFloat(opt.odds));
                  }}
                  className={`p-3 rounded-xl border text-center cursor-pointer transition-colors ${
                    selectedOutcome === opt.id 
                      ? 'bg-amber-400 text-black border-amber-400' 
                      : 'bg-black/40 border-white/5 text-zinc-400'
                  }`}
                >
                  <p className="text-[10px] font-black uppercase">{opt.label}</p>
                  <p className="text-[9px] font-bold font-mono mt-0.5">{opt.odds}x</p>
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-zinc-550 uppercase tracking-widest">Wager Coin Value</label>
              <input 
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                className="w-full bg-black border border-white/5 rounded-xl p-3 text-xs text-white font-mono outline-none"
              />
            </div>

            {pickerStatus !== 'idle' && (
              <p className={`text-[10px] font-black uppercase text-center p-3 rounded-xl ${
                pickerStatus === 'running' ? 'bg-zinc-900 border border-white/5 text-zinc-400 animate-pulse' :
                pickerStatus === 'won' ? 'bg-green-500/10 border border-green-500/20 text-green-400' :
                'bg-red-500/10 border border-red-500/20 text-red-500'
              }`}>
                {outcomeResultText}
              </p>
            )}

            <button 
              onClick={handleRunPrediction}
              disabled={pickerStatus === 'running'}
              className="w-full bg-amber-400 hover:bg-amber-300 text-black py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] cursor-pointer"
            >
              Dispatch Prediction Bet
            </button>
          </motion.div>
        )}

        {activeMiniGame === 'spinner' && (
          <motion.div 
            key="spinner"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="bg-zinc-900/40 border border-white/5 rounded-3xl p-5 text-center space-y-6"
          >
            <div>
              <p className="text-[9px] font-black text-pink-400 uppercase tracking-widest">Mega Spin Jackpot</p>
              <h4 className="text-sm font-black text-white uppercase italic">Costs 250 Coins • Instant Resolution</h4>
            </div>

            {/* Spinner Wheel Visual representation */}
            <div className="relative w-40 h-40 mx-auto rounded-full border-4 border-zinc-800 shadow-xl overflow-hidden flex items-center justify-center bg-black">
              <div 
                className="w-full h-full absolute transition-transform duration-[3000ms] ease-out flex items-center justify-center"
                style={{ transform: `rotate(${spinnerDeg}deg)` }}
              >
                {/* Visual segments */}
                <div className="absolute w-full h-1 bg-gradient-to-r from-red-500 to-transparent" />
                <div className="absolute w-full h-1 bg-gradient-to-r from-blue-500 to-transparent rotate-45" />
                <div className="absolute w-full h-1 bg-gradient-to-r from-zinc-500 to-transparent rotate-90" />
                <div className="absolute w-full h-1 bg-gradient-to-r from-pink-500 to-transparent rotate-135" />
                
                <div className="text-white text-[9px] font-black absolute top-2 uppercase tracking-tight">Jackpot!</div>
                <div className="text-white text-[9px] font-black absolute bottom-2 uppercase tracking-tight">Zero</div>
                <div className="text-white text-[9px] font-black absolute left-2 uppercase tracking-tight">1000</div>
                <div className="text-white text-[9px] font-black absolute right-2 uppercase tracking-tight">50</div>
              </div>
              
              {/* Pointer */}
              <div className="absolute z-10 w-4 h-4 rounded-full bg-amber-400 border border-black shadow" />
            </div>

            {jackpotPayout > 0 ? (
              <p className="text-xs font-black text-green-400 uppercase">Jackpot pay! Won +{jackpotPayout} Coins!</p>
            ) : jackpotPayout === 0 && !isSpinning && spinnerDeg > 0 ? (
              <p className="text-xs font-black text-red-500 uppercase">Better luck next spin!</p>
            ) : null}

            <button 
              onClick={handleSpinJackpot}
              disabled={isSpinning || coins < 250}
              className="w-full bg-gradient-to-r from-pink-500 to-rose-600 text-white py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] cursor-pointer"
            >
              {isSpinning ? 'Jackpot Spinning...' : 'Spin Vegas Ticket (-250 Coins)'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
