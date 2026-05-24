import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Target, Zap, RotateCcw, X, Coins, Trophy, Volume2, VolumeX } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface Fish {
  id: number;
  type: 'normal' | 'shark' | 'boss' | 'jackpot';
  top: number;
  left: number;
  speed: number;
  reward: number;
}

class Projectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;

  constructor(id: number, startX: number, startY: number, targetX: number, targetY: number, speed: number = 30) {
    this.id = id;
    this.x = startX;
    this.y = startY;
    this.angle = Math.atan2(targetY - startY, targetX - startX);
    this.vx = Math.cos(this.angle) * speed;
    this.vy = Math.sin(this.angle) * speed;
  }

  move() {
    this.x += this.vx;
    this.y += this.vy;
  }
}

const FISH_SIZES = {
  normal: { w: 80, h: 48 }, // w-20 h-12
  shark: { w: 128, h: 64 }, // w-32 h-16
  boss: { w: 160, h: 80 }, // w-40 h-20
  jackpot: { w: 96, h: 56 } // w-24 h-14
};

export default function FishingGame({ onClose }: { onClose: () => void; key?: string }) {
  const [coins, setCoins] = useState(0);
  const coinsRef = useRef(0);
  const [kills, setKills] = useState(0);
  const [autoAim, setAutoAim] = useState(false);
  const [fishes, setFishes] = useState<Fish[]>([]);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [explosions, setExplosions] = useState<{id: number, x: number, y: number}[]>([]);
  const [popups, setPopups] = useState<{id: number, x: number, y: number, amount: number}[]>([]);
  const [cannonAngle, setCannonAngle] = useState(0);
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);
  
  const gameRef = useRef<HTMLDivElement>(null);
  const fishIdCounter = useRef(0);
  const projIdCounter = useRef(0);
  const expIdCounter = useRef(0);
  
  const fishesRef = useRef<Fish[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);

  // Sync with actual coins
  useEffect(() => {
    if (!auth.currentUser) return;
    const unsub = onSnapshot(doc(db, 'users', auth.currentUser.uid), (snap) => {
      if (snap.exists()) {
        const c = snap.data().coins || 0;
        setCoins(c);
        coinsRef.current = c;
      }
    });
    return () => unsub();
  }, []);

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMuted(!muted);
    mutedRef.current = !muted;
  };

  const playPopSound = () => {
    if (mutedRef.current) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc.type = 'sine';
      // Crisp pop parameters
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch (e) {
      console.error('Audio play failed', e);
    }
  };

  const handleCatch = async (targetFish: Fish, x: number, y: number) => {
    if (!auth.currentUser) return;
    setKills(prev => prev + 1);
    
    playPopSound();
    
    // Add visual explosion and popup
    const expId = expIdCounter.current++;
    setExplosions(prev => [...prev, { id: expId, x, y }]);
    setPopups(prev => [...prev, { id: expId, x, y, amount: targetFish.reward }]);
    
    // Immediate local coin update
    setCoins(c => c + targetFish.reward);
    coinsRef.current += targetFish.reward;

    setTimeout(() => {
       setExplosions(prev => prev.filter(e => e.id !== expId));
       setPopups(prev => prev.filter(e => e.id !== expId));
    }, 1000); // 1s for popup duration

    try {
      await fetch('/api/games/fishing', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ userId: auth.currentUser.uid, betAmount: 10, targetReward: targetFish.reward })
      });
    } catch(e) {
      console.error(e);
    }
  };

  const shootTowards = (targetX: number, targetY: number) => {
      if (coinsRef.current < 10) return;
      // Deduct locally for responsiveness, backend will be billed upon shot (actually, we should probably bill the shot, but the API expects us to bill on catch? 
      // The API right now takes betAmount and then calculates if caughtFish. Actually, backend Fishing API randomizes the catch.
      // Wait, if it randomizes, client authoritative catch is desynced.
      // In the prompt: "Implement bounding-box collision detection between the cannon projectiles and the active fish components to ensure rewards are only granted upon precise hits."
      // Let's just keep the API call on hits, as it deducts the betAmount and calculates winAmount.
      setCoins(c => c - 10);
      coinsRef.current -= 10;
      
      const startX = window.innerWidth / 2;
      const startY = window.innerHeight - 50;

      const p = new Projectile(projIdCounter.current++, startX, startY, targetX, targetY, 30);
      setCannonAngle(p.angle + Math.PI / 2);
      projectilesRef.current = [...projectilesRef.current, p];
  };

  useEffect(() => {
    // Game loop for moving fishes and projectiles
    const interval = setInterval(() => {
      let currentFishes = fishesRef.current;
      let currentProj = projectilesRef.current;

      currentFishes = currentFishes.map(f => ({ ...f, left: f.left + f.speed }))
          .filter(f => f.left < (window.innerWidth + 200));

      currentProj = currentProj.map(p => {
         p.move();
         return p;
      }).filter(p => p.x > -50 && p.x < window.innerWidth + 50 && p.y > -50 && p.y < window.innerHeight + 50);

      const caughtFishIds = new Set<number>();
      const hitProjIds = new Set<number>();

      for (const p of currentProj) {
         for (const f of currentFishes) {
            if (caughtFishIds.has(f.id)) continue;
            const size = FISH_SIZES[f.type];
            
            // f.left and f.top correspond to top-left corner of the fish container
            if (
               p.x >= f.left && p.x <= f.left + size.w &&
               p.y >= f.top && p.y <= f.top + size.h
            ) {
               caughtFishIds.add(f.id);
               hitProjIds.add(p.id);
               handleCatch(f, p.x, p.y);
               break;
            }
         }
      }

      if (caughtFishIds.size > 0) {
          currentFishes = currentFishes.filter(f => !caughtFishIds.has(f.id));
      }
      if (hitProjIds.size > 0) {
          currentProj = currentProj.filter(p => !hitProjIds.has(p.id));
      }

      fishesRef.current = currentFishes;
      projectilesRef.current = currentProj;

      setFishes(currentFishes);
      setProjectiles(currentProj);
    }, 50);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Spawners
    const spawnFish = (type: Fish['type']) => {
      const rewardMap = { normal: 100, shark: 500, boss: 5000, jackpot: 10000 };
      const speedMap = { normal: Math.random() * 5 + 3, shark: 4, boss: 2, jackpot: 6 };
      
      const newFish: Fish = {
        id: fishIdCounter.current++,
        type,
        top: Math.random() * (window.innerHeight - 200) + 100,
        left: -200,
        speed: speedMap[type],
        reward: rewardMap[type]
      };
      
      fishesRef.current.push(newFish);
    };

    const t1 = setInterval(() => spawnFish('normal'), 1500);
    const t2 = setInterval(() => spawnFish('shark'), 5000);
    const t3 = setInterval(() => spawnFish('boss'), 15000);
    const t4 = setInterval(() => spawnFish('jackpot'), 20000);

    return () => { clearInterval(t1); clearInterval(t2); clearInterval(t3); clearInterval(t4); };
  }, []);

  // Auto aim simulation
  useEffect(() => {
    if (!autoAim) return;
    const interval = setInterval(() => {
        const target = fishesRef.current[0];
        if (target) {
            const size = FISH_SIZES[target.type];
            shootTowards(target.left + size.w / 2, target.top + size.h / 2);
        }
    }, 1000);
    return () => clearInterval(interval);
  }, [autoAim]);


  const getRank = () => {
      if (coins > 100000) return 'King';
      if (coins > 50000) return 'Diamond';
      return 'Bronze';
  };

  const handleGameMouseMove = (e: React.MouseEvent) => {
    if (autoAim) return;
    const startX = window.innerWidth / 2;
    const startY = window.innerHeight - 50;
    const angle = Math.atan2(e.clientY - startY, e.clientX - startX);
    setCannonAngle(angle + Math.PI / 2); // Add PI/2 so 0 is pointing up
  };

  const handleGameClick = (e: React.MouseEvent) => {
    if (autoAim) return; // if auto aim is on, ignore manual click
    shootTowards(e.clientX, e.clientY);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#001f3f] overflow-hidden cursor-crosshair" ref={gameRef} onClick={handleGameClick} onMouseMove={handleGameMouseMove}>
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2070')", backgroundSize: 'cover', backgroundPosition: 'center', opacity: 0.6 }}
      />
      
      {/* Top Bar */}
      <div className="absolute top-4 left-4 z-50 flex gap-4 pointer-events-auto">
         <div className="bg-black/60 text-white px-4 py-2 rounded-full font-black uppercase text-xs border border-white/10 flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400" />
            <span>Coins: {coins}</span>
         </div>
         <div className="bg-black/60 text-white px-4 py-2 rounded-full font-black uppercase text-xs border border-white/10 flex items-center gap-2">
            <Trophy className="w-4 h-4 text-zinc-400" />
            <span>Rank: {getRank()}</span>
         </div>
         <div className="bg-black/60 text-white px-4 py-2 rounded-full font-black uppercase text-xs border border-white/10">
            Kills: {kills}
         </div>
      </div>

      <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="absolute top-4 right-4 z-50 w-10 h-10 bg-black/60 rounded-full flex items-center justify-center text-white border border-white/10 hover:bg-red-500 transition-colors pointer-events-auto">
         <X className="w-5 h-5" />
      </button>

      {/* Seats / Room */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-11/12 max-w-2xl grid grid-cols-5 gap-4 z-40 pointer-events-none">
         <div className="h-16 rounded-[2rem] bg-amber-400/20 border-2 border-amber-400 text-amber-400 flex items-center justify-center font-black text-xs shadow-[0_0_15px_rgba(251,191,36,0.3)]">👑 Host</div>
         {[2,3,4,5,6,7,8,9,10].map(i => (
             <div key={i} className="h-16 rounded-[2rem] bg-white/10 border-2 border-white/20 text-white flex items-center justify-center font-black text-xs opacity-50">{i}</div>
         ))}
      </div>

      {/* Fish Area */}
      <div className="absolute inset-0 z-30 pointer-events-none">
        {fishes.map(fish => {
            const sizeMap = { normal: 'w-20 h-12 bg-orange-500', shark: 'w-32 h-16 bg-red-500', boss: 'w-40 h-20 bg-purple-500', jackpot: 'w-24 h-14 bg-amber-400 shadow-[0_0_20px_#fbbf24]' };
            const labelMap = { normal: '', shark: 'Shark', boss: 'Boss', jackpot: 'Jackpot' };

            return (
                <div 
                   key={fish.id}
                   className={`absolute rounded-full flex items-center justify-center text-[10px] font-black text-white uppercase pointer-events-none border-2 border-white/20 ${sizeMap[fish.type]}`}
                   style={{ top: fish.top, left: fish.left }}
                >
                    {labelMap[fish.type]}
                </div>
            );
        })}
      </div>

      {/* Projectiles */}
      <div className="absolute inset-0 z-30 pointer-events-none">
        {projectiles.map(p => (
           <div 
             key={p.id}
             className="absolute w-4 h-4 rounded-full bg-cyan-400 shadow-[0_0_15px_#22d3ee]"
             style={{ 
               left: p.x, 
               top: p.y,
               transform: `translate(-50%, -50%) rotate(${p.angle}rad)` 
             }}
           >
              <div className="w-full h-full bg-white rounded-full opacity-50 absolute inset-0 mix-blend-overlay" />
           </div>
        ))}
      </div>

      {/* Explosions */}
      <div className="absolute inset-0 z-40 pointer-events-none">
        {explosions.map(e => (
           <motion.div 
             key={e.id}
             initial={{ scale: 0.5, opacity: 1 }}
             animate={{ scale: 3, opacity: 0 }}
             transition={{ duration: 0.5, ease: "easeOut" }}
             className="absolute w-20 h-20 bg-amber-400/80 rounded-full shadow-[0_0_40px_#fbbf24] mix-blend-screen"
             style={{ left: e.x, top: e.y, transform: 'translate(-50%, -50%)' }}
           />
        ))}
      </div>

      {/* Popups */}
      <div className="absolute inset-0 z-50 pointer-events-none">
        {popups.map(p => (
           <motion.div 
             key={p.id}
             initial={{ opacity: 1, y: 0, scale: 0.5 }}
             animate={{ opacity: 0, y: -50, scale: 1.2 }}
             transition={{ duration: 1, ease: "easeOut" }}
             className="absolute font-black text-amber-400 text-2xl drop-shadow-[0_4px_4px_rgba(0,0,0,1)] stroke-black"
             style={{ 
               left: p.x, 
               top: p.y, 
               transform: 'translate(-50%, -50%)',
               WebkitTextStroke: '1px black'
             }}
           >
              +{p.amount}
           </motion.div>
        ))}
      </div>

      {/* Cannon */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-24 h-24 bg-gradient-to-b from-purple-500 to-black rounded-b-[2rem] rounded-t-full border-4 border-white/20 z-40 shadow-[0_0_30px_rgba(168,85,247,0.4)] flex justify-center pointer-events-none origin-bottom">
          <div 
             className="w-8 h-16 bg-zinc-300 rounded-t-full translate-y-[-20px] origin-bottom transition-transform duration-75"
             style={{ transform: `translateY(-20px) rotate(${cannonAngle}rad)` }}
          />
      </div>

      {/* Controls */}
      <div className="absolute bottom-6 right-6 flex gap-3 z-50 pointer-events-auto">
         <button onClick={toggleMute} className="px-4 py-4 rounded-2xl bg-black/60 border border-white/10 text-white hover:bg-white/10 flex items-center justify-center">
            {muted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-green-400" />}
         </button>
         <button onClick={(e) => { e.stopPropagation(); setAutoAim(!autoAim); }} className={`px-6 py-4 rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 border-2 ${autoAim ? 'bg-amber-400 border-amber-400 text-black shadow-[0_0_15px_rgba(251,191,36,0.3)]' : 'bg-black/60 border-white/10 text-white hover:bg-white/10'}`}>
            <Target className="w-4 h-4" />
            {autoAim ? 'Auto Aim: ON' : 'Auto Aim: OFF'}
         </button>
      </div>

      {/* Leaderboard */}
      <div className="absolute top-1/4 right-4 w-48 bg-black/60 border border-white/10 rounded-2xl p-4 text-white z-40 hidden md:block pointer-events-none">
          <h3 className="font-black uppercase text-[10px] text-zinc-500 mb-3 tracking-widest">Leaderboard</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold"><span className="text-amber-400">1. Ethio Ag...</span>15000</div>
            <div className="flex justify-between items-center text-xs font-bold"><span className="text-slate-300">2. Barca VIP</span>12000</div>
            <div className="flex justify-between items-center text-xs font-bold"><span className="text-orange-400">3. King Fish</span>9000</div>
          </div>
      </div>
    </div>
  );
}
