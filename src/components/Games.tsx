import React from 'react';
import { Trophy, Crown, Bookmark, Package, Flower, Fish, Diamond, Gem, Sword, Dna, User, Heart, Mountain, Star, Target, Zap, Waves, Flame, Ghost, Music, Radio, Trash2, Palette, Smile } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { auth, db } from '../lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

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
  { icon: Trophy, name: "OAH Champion", minBet: 10, maxBet: 10000 },
  { icon: Crown, name: "Prince", minBet: 20, maxBet: 20000 },
  { icon: Bookmark, name: "Mark", minBet: 5, maxBet: 5000 },
  { icon: Package, name: "Burafam", minBet: 10, maxBet: 8000 },
  { icon: Flower, name: "Fekertdegu", minBet: 15, maxBet: 15000 },
  { icon: Fish, name: "Abdi Maki", minBet: 10, maxBet: 10000 },
  { icon: Crown, name: "Meseretze", minBet: 25, maxBet: 25000 },
  { icon: Diamond, name: "Meski", minBet: 10, maxBet: 12000 },
  { icon: User, name: "Messele", minBet: 10, maxBet: 10000 },
  { icon: Sword, name: "Sultan Murad", minBet: 30, maxBet: 30000 },
  { icon: Dna, name: "Genet Meko", minBet: 15, maxBet: 15000 },
  { icon: Fish, name: "5 Maki", minBet: 5, maxBet: 5000 },
  { icon: User, name: "Kemal Mohamed", minBet: 20, maxBet: 20000 },
  { icon: Heart, name: "Hayatyeke", minBet: 10, maxBet: 10000 },
  { icon: Mountain, name: "Abayinesh", minBet: 10, maxBet: 10000 },
  { icon: Star, name: "Masri", minBet: 15, maxBet: 15000 },
  { icon: Smile, name: "Afsyna", minBet: 10, maxBet: 10000 },
  { icon: Target, name: "Feti", minBet: 20, maxBet: 20000 },
  { icon: Package, name: "PyramidSlots", minBet: 10, maxBet: 10000 },
  { icon: Target, name: "ChickenRoad", minBet: 5, maxBet: 5000 },
  { icon: Target, name: "FishingStar", minBet: 10, maxBet: 8000 },
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
  { icon: Target, name: "Jungle Hunt", minBet: 10, maxBet: 10000 },
  { icon: Crown, name: "Royal Battle", minBet: 15, maxBet: 15000 },
  { icon: Target, name: "Fruit Party", minBet: 5, maxBet: 5000 },
  { icon: Fish, name: "Fishing Tycoon", minBet: 20, maxBet: 20000 },
  { icon: Gem, name: "Gems Sky", minBet: 10, maxBet: 12000 },
  { icon: Target, name: "Crazy 777", minBet: 7, maxBet: 7777 },
  { icon: Waves, name: "Deep Sea", minBet: 10, maxBet: 10000 },
  { icon: Flame, name: "FirestormJoker", minBet: 10, maxBet: 15000 },
  { icon: Ghost, name: "Dragon Ball", minBet: 25, maxBet: 25000 },
  { icon: Target, name: "Classic Slots", minBet: 10, maxBet: 10000 },
  { icon: Target, name: "Dice Roll", minBet: 5, maxBet: 5000, isDice: true },
  { icon: Target, name: "Roulette", minBet: 10, maxBet: 10000, isRoulette: true },
  { icon: Target, name: "Daily Free Spin", minBet: 0, maxBet: 0, isFree: true }
];

export default function Games() {
  const [balance, setBalance] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchBalance() {
      if (!auth.currentUser) return;
      try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setBalance(userSnap.data().coins || 0);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchBalance();
  }, []);

  return (
    <div className="space-y-8 p-6">
      <header className="space-y-4">
        <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">Games</h2>
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2.5rem] text-center shadow-xl">
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-1">Your Balance</p>
          <p className="text-4xl font-black text-amber-400 italic">
            {loading ? '...' : balance.toLocaleString()}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {gamesList.map((game, i) => (
          <motion.div
            key={i}
            whileHover={{ y: -5 }}
            className={cn(
              "p-6 rounded-[2rem] flex flex-col items-center text-center gap-3 transition-colors",
              game.isFree ? "bg-amber-400 text-black" : "bg-zinc-900 border border-zinc-800 text-white"
            )}
          >
            <game.icon className="w-12 h-12" />
            <h3 className="font-black uppercase text-sm tracking-tighter italic">{game.name}</h3>
            {!game.isFree && <p className={cn("text-[10px] font-bold uppercase", game.isFree ? "text-black/70" : "text-zinc-500")}>Min: {game.minBet}</p>}
            <button className={cn(
                "w-full py-3 rounded-xl font-black uppercase text-[10px] tracking-widest mt-auto",
                game.isFree ? "bg-black text-white" : "bg-amber-400 text-black"
            )}>
              {game.isFree ? 'Claim' : 'Play'}
            </button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
