import React from 'react';
import { Trophy, Crown, Bookmark, Package, Flower, Fish, Diamond, Gem, Sword, Dna, User, Heart, Mountain, Star, Target, Zap, Waves, Flame, Ghost, Music, Radio, Trash2, Palette, Smile, X, Play, RotateCcw, Coins } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { auth, db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface Game {
  icon: React.ElementType;
  name: string;
  minBet: number;
  maxBet: number;
  isDice?: boolean;
  isRoulette?: boolean;
  isFree?: boolean;
}

const gamesList: Game[] = [
  { icon: Trophy, name: "PyramidSlots", minBet: 10, maxBet: 10000 },
  { icon: Target, name: "ChickenRoad", minBet: 5, maxBet: 5000 },
  { icon: Fish, name: "FishingStar", minBet: 10, maxBet: 8000 },
  { icon: Zap, name: "MagicSlot", minBet: 20, maxBet: 20000 },
  { icon: Target, name: "Yummy", minBet: 5, maxBet: 3000 },
  { icon: Diamond, name: "CrazyGems", minBet: 15, maxBet: 15000 },
  { icon: Target, name: "Olympus", minBet: 25, maxBet: 25000 },
  { icon: Music, name: "DJLive", minBet: 10, maxBet: 10000 },
  { icon: Target, name: "Lucky77Pro", minBet: 7, maxBet: 7777 },
  { icon: Target, name: "GoldenPinata", minBet: 10, maxBet: 12000 },
  { icon: Flower, name: "GoldenFlower", minBet: 10, maxBet: 10000 },
  { icon: Target, name: "FortuneTiger", minBet: 20, maxBet: 20000 },
  { icon: Waves, name: "Ocean Hunt", minBet: 10, maxBet: 10000 },
  { icon: Target, name: "Dice Roll", minBet: 5, maxBet: 5000, isDice: true },
  { icon: Radio, name: "Roulette", minBet: 10, maxBet: 10000, isRoulette: true },
  { icon: Star, name: "Daily Free Spin", minBet: 0, maxBet: 0, isFree: true }
];

export default function Games() {
  const [balance, setBalance] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const [selectedGame, setSelectedGame] = React.useState<Game | null>(null);
  const [betAmount, setBetAmount] = React.useState(10);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [gameResult, setGameResult] = React.useState<any>(null);

  const [dicePrediction, setDicePrediction] = React.useState("over");
  const [diceValue, setDiceValue] = React.useState(1);
  const [rouletteBetType, setRouletteBetType] = React.useState("color");
  const [rouletteBetValue, setRouletteBetValue] = React.useState("red");

  React.useEffect(() => {
    if (!auth.currentUser) return;

    const unsub = onSnapshot(doc(db, 'users', auth.currentUser.uid), (snap) => {
      if (snap.exists()) {
        setBalance(snap.data().coins || 0);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handlePlay = async () => {
    if (!selectedGame || !auth.currentUser) return;
    if (balance < betAmount) {
      alert("Insufficient coins!");
      return;
    }

    setIsPlaying(true);
    setGameResult(null);

    try {
      let endpoint = "/api/games/slots";
      let body: any = { userId: auth.currentUser.uid, betAmount };

      if (selectedGame.isDice) {
        endpoint = "/api/games/dice";
        body.prediction = dicePrediction;
        if (dicePrediction === 'number') {
          body.value = diceValue;
        }
      } else if (selectedGame.isRoulette) {
        endpoint = "/api/games/roulette";
        body.betType = rouletteBetType;
        body.betValue = rouletteBetValue;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      
      // Simulate real-time delay for excitement
      setTimeout(() => {
        setGameResult(data);
        setIsPlaying(false);
      }, 1000);
    } catch (error) {
      console.error(error);
      setIsPlaying(false);
    }
  };

  const handleClaimFree = async () => {
    if (!auth.currentUser) return;
    try {
      const res = await fetch("/api/bonus/claim", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: auth.currentUser.uid })
      });
      const data = await res.json();
      if (data.success) {
        alert(`Claimed ${data.amount} coins!`);
      } else {
        alert(data.error);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-8 p-6 pb-32">
      <header className="space-y-4">
        <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Games</h2>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2.5rem] flex items-center justify-between shadow-xl px-10">
          <div>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mb-1">Live Balance</p>
            <p className="text-3xl font-black text-amber-400 italic">
              {loading ? '...' : balance.toLocaleString()}
            </p>
          </div>
          <div className="bg-amber-400/10 p-4 rounded-3xl border border-amber-400/20">
            <Coins className="w-8 h-8 text-amber-400" />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {gamesList.map((game, i) => (
          <motion.div
            key={i}
            whileHover={{ y: -5 }}
            onClick={() => game.isFree ? handleClaimFree() : setSelectedGame(game)}
            className={cn(
              "p-6 rounded-[2.5rem] flex flex-col items-center text-center gap-3 transition-all cursor-pointer border relative overflow-hidden group",
              game.isFree ? "bg-amber-400 border-amber-500 text-black shadow-lg shadow-amber-400/20" : "bg-zinc-900 border-zinc-800 text-white hover:border-amber-400/50"
            )}
          >
             <div className={cn(
               "w-16 h-16 rounded-3xl flex items-center justify-center mb-2 transition-transform group-hover:scale-110",
               game.isFree ? "bg-black/10" : "bg-zinc-950 border border-zinc-800"
             )}>
              <game.icon className={cn("w-8 h-8", game.isFree ? "text-black" : "text-amber-400")} />
            </div>
            <h3 className="font-black uppercase text-xs tracking-widest italic">{game.name}</h3>
            {!game.isFree && <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">BET: {game.minBet}-{game.maxBet}</p>}
            {game.isFree && <p className="text-[10px] font-black text-black/70 uppercase tracking-widest">CLAIM BONUS</p>}
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selectedGame && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedGame(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.95 }}
              className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-[3rem] p-8 space-y-8 overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-8">
                <button onClick={() => setSelectedGame(null)} className="text-zinc-500 hover:text-white transition-colors">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-20 h-20 bg-amber-400/10 rounded-[2rem] flex items-center justify-center border border-amber-400/20">
                  <selectedGame.icon className="w-10 h-10 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">{selectedGame.name}</h3>
                  <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Multi-Channel Betting Engine</p>
                </div>
              </div>

              <div className="space-y-6">
                
                {/* Dice Options */}
                {selectedGame.isDice && (
                  <div className="bg-black/40 rounded-[2rem] p-6 border border-zinc-800 space-y-4">
                    <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest text-center">Prediction</p>
                    <div className="flex gap-2 justify-center">
                      {["over", "under", "number"].map(p => (
                        <button 
                          key={p} 
                          onClick={() => setDicePrediction(p)} 
                          className={cn("px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", dicePrediction === p ? "bg-amber-400 text-black shadow-lg shadow-amber-400/20" : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700")}
                        >
                          {p === "over" ? "Over (4-6)" : p === "under" ? "Under (1-3)" : "Exact #"}
                        </button>
                      ))}
                    </div>
                    {dicePrediction === "number" && (
                      <div className="flex gap-2 justify-center mt-2">
                         {[1, 2, 3, 4, 5, 6].map(n => (
                           <button 
                             key={n} 
                             onClick={() => setDiceValue(n)} 
                             className={cn("w-10 h-10 rounded-lg text-sm font-black transition-all", diceValue === n ? "bg-amber-400 text-black shadow-lg shadow-amber-400/20" : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700")}
                           >
                             {n}
                           </button>
                         ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Roulette Options */}
                {selectedGame.isRoulette && (
                  <div className="bg-black/40 rounded-[2rem] p-6 border border-zinc-800 space-y-4">
                    <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest text-center">Bet Type</p>
                    <div className="flex gap-2 justify-center flex-wrap">
                      {[
                        { type: "color", label: "Color" },
                        { type: "even_odd", label: "Even / Odd" },
                        { type: "number", label: "Number" }
                      ].map(t => (
                        <button 
                          key={t.type} 
                          onClick={() => { setRouletteBetType(t.type); setRouletteBetValue(t.type === 'color' ? 'red' : t.type === 'even_odd' ? 'even' : '0'); }} 
                          className={cn("px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", rouletteBetType === t.type ? "bg-amber-400 text-black shadow-lg shadow-amber-400/20" : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700")}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                    
                    {rouletteBetType === "color" && (
                      <div className="flex gap-2 justify-center mt-2">
                        <button onClick={() => setRouletteBetValue("red")} className={cn("px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", rouletteBetValue === "red" ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : "bg-zinc-800 text-red-500 opacity-50 hover:opacity-100")}>Red</button>
                        <button onClick={() => setRouletteBetValue("black")} className={cn("px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", rouletteBetValue === "black" ? "bg-zinc-950 text-white shadow-lg shadow-black/20 border border-zinc-800" : "bg-zinc-800 text-zinc-400 opacity-50 hover:opacity-100")}>Black</button>
                      </div>
                    )}

                    {rouletteBetType === "even_odd" && (
                      <div className="flex gap-2 justify-center mt-2">
                        <button onClick={() => setRouletteBetValue("even")} className={cn("px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", rouletteBetValue === "even" ? "bg-amber-400 text-black shadow-lg shadow-amber-400/20" : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700")}>Even</button>
                        <button onClick={() => setRouletteBetValue("odd")} className={cn("px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all", rouletteBetValue === "odd" ? "bg-amber-400 text-black shadow-lg shadow-amber-400/20" : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700")}>Odd</button>
                      </div>
                    )}

                    {rouletteBetType === "number" && (
                      <div className="flex justify-center mt-2">
                        <div className="flex items-center justify-center gap-6">
                           <button onClick={() => setRouletteBetValue(String(Math.max(0, parseInt(rouletteBetValue as string || '0') - 1)))} className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-white active:scale-90 transition-all">-</button>
                           <span className="text-2xl font-black text-white italic">{rouletteBetValue}</span>
                           <button onClick={() => setRouletteBetValue(String(Math.min(36, parseInt(rouletteBetValue as string || '0') + 1)))} className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-white active:scale-90 transition-all">+</button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-black/40 rounded-[2rem] p-6 border border-zinc-800 space-y-4">
                  <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest text-center">Place Your Bet</p>
                  <div className="flex items-center justify-center gap-6">
                    <button onClick={() => setBetAmount(Math.max(selectedGame.minBet, betAmount - 10))} className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-white active:scale-90 transition-all">-</button>
                    <span className="text-3xl font-black text-white italic">{betAmount}</span>
                    <button onClick={() => setBetAmount(Math.min(selectedGame.maxBet, betAmount + 10))} className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center text-white active:scale-90 transition-all">+</button>
                  </div>
                  <div className="flex gap-2 justify-center">
                    {[100, 500, 1000].map(amt => (
                      <button key={amt} onClick={() => setBetAmount(amt)} className="px-4 py-2 rounded-lg bg-zinc-800 text-[10px] font-black text-zinc-400 hover:text-white hover:bg-zinc-700 transition-all">{amt}</button>
                    ))}
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {gameResult && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className={cn(
                        "p-6 rounded-[2rem] text-center space-y-3",
                        gameResult.win || gameResult.winAmount > 0 ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20"
                      )}
                    >
                      {gameResult.reels && (
                        <div className="flex justify-center gap-4 text-4xl mb-2">
                          {gameResult.reels.map((r: string, idx: number) => (
                            <motion.span key={idx} initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: idx * 0.1 }}>{r}</motion.span>
                          ))}
                        </div>
                      )}
                      <p className={cn("text-lg font-black uppercase italic", gameResult.win || gameResult.winAmount > 0 ? "text-green-500" : "text-red-500")}>
                        {gameResult.message}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                <button
                  disabled={isPlaying}
                  onClick={handlePlay}
                  className={cn(
                    "w-full py-6 rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] transition-all relative overflow-hidden",
                    isPlaying ? "bg-zinc-800 text-zinc-500" : "bg-amber-400 text-black shadow-xl shadow-amber-400/20 active:scale-95"
                  )}
                >
                  {isPlaying ? (
                    <div className="flex items-center justify-center gap-2">
                      <RotateCcw className="w-4 h-4 animate-spin" />
                      SPINNING...
                    </div>
                  ) : (
                    "PLACE BET NOW"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
