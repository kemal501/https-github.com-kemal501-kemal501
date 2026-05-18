/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Home, Radio, Wallet as WalletIcon, User, Settings, Plus, Search, Bell, Menu, Mic, ShieldAlert, X, Slash, UserX, Shield, Trophy, Briefcase, Users, Star, Video, Music, Gamepad2, Theater, Sparkles, CheckCircle2, ShieldCheck, Camera, Coins } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Wallet from './components/WalletWithdrawal';
import RoomSettings from './components/RoomSettings';
import AdminPanel from './components/AdminPanel';
import Gifts from './components/Gifts';
import ModerationTools from './components/ModerationTools';
import RoomView from './components/RoomView';
import AgentDashboard from './components/AgentDashboard';
import UserTasks from './components/UserTasks';
import Games from './components/Games';
import AuthForm from './components/AuthForm';
import CreateRoomModal from './components/CreateRoomModal';
import FaceVerification from './components/FaceVerification';
import { cn } from './lib/utils';
import { db, auth, handleFirestoreError, OperationType } from './lib/firebase';
import { doc, onSnapshot, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove, serverTimestamp, collection, query as firestoreQuery, orderBy as firestoreOrderBy, limit as firestoreLimit, where } from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';

// --- MOCK COMPONENTS ---

const RoomCard = ({ title, host, viewers, type, onJoin, onShowProfile }: { key?: any, title: string, host: string, viewers: string, type: 'voice' | 'video', onJoin: () => void, onShowProfile: (host: string) => void }) => (
  <motion.div 
    whileHover={{ 
      y: -8, 
      scale: 1.02,
      transition: { duration: 0.3, ease: "easeOut" }
    }}
    onClick={onJoin}
    className="relative group cursor-pointer overflow-hidden rounded-3xl bg-zinc-900 border border-zinc-800 aspect-[4/5] shadow-xl hover:shadow-2xl hover:shadow-amber-400/5 transition-all duration-300"
  >
    <img 
      src={`https://picsum.photos/seed/${host}/400/500`} 
      alt={title}
      className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700"
      referrerPolicy="no-referrer"
    />
    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
    
    <div className="absolute top-4 left-4 flex gap-2">
      <div className="bg-red-600/90 backdrop-blur-md px-2 py-0.5 rounded-lg flex items-center gap-1">
        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
        <span className="text-white text-[10px] font-black uppercase tracking-tighter">Live</span>
      </div>
      <div className="bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-lg flex items-center gap-1">
        <Users className="w-3 h-3 text-white" />
        <span className="text-white text-[10px] font-black">{viewers}</span>
      </div>
    </div>

    <div className="absolute bottom-4 left-4 right-4">
      <div className="flex items-center gap-2 mb-2">
        {type === 'voice' ? <Mic className="w-4 h-4 text-amber-400" /> : <Radio className="w-4 h-4 text-blue-400" />}
        <h3 className="text-white font-bold truncate text-sm">{title}</h3>
      </div>
      <div className="flex items-center gap-2">
        <div 
          onClick={(e) => { e.stopPropagation(); onShowProfile(host); }}
          className="w-6 h-6 rounded-full border border-white/20 overflow-hidden hover:scale-110 transition-transform active:scale-95 z-20 relative"
        >
          <img src={`https://i.pravatar.cc/100?u=${host}`} alt={host} />
        </div>
        <div className="flex items-center gap-1 min-w-0">
          <p className="text-white/70 text-xs font-medium truncate">@{host}</p>
          {host === 'Abebe' && <CheckCircle2 className="w-3 h-3 text-blue-400 flex-shrink-0" />}
        </div>
      </div>
    </div>
  </motion.div>
);

const NAVIGATION = [
  { id: 'discover', icon: Home, label: 'Discover' },
  { id: 'live', icon: Radio, label: 'Live' },
  { id: 'tasks', icon: Trophy, label: 'Tasks' },
  { id: 'agency', icon: Briefcase, label: 'Agency' },
  { id: 'wallet', icon: WalletIcon, label: 'Wallet' },
  { id: 'games', icon: Gamepad2, label: 'Games' },
  { id: 'me', icon: User, label: 'Me' },
];

export default function App() {
  const [activeTab, setActiveTab] = React.useState('discover');
  const [showGiftPanel, setShowGiftPanel] = React.useState(false);
  const [isJoining, setIsJoining] = React.useState(false);
  const [activeRoom, setActiveRoom] = React.useState<{ id: string, title: string, host: string, type: 'voice' | 'video', tier?: string } | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [viewingProfile, setViewingProfile] = React.useState<string | null>(null);
  const [hostSearchQuery, setHostSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('All');
  const [showCreateRoom, setShowCreateRoom] = React.useState(false);
  const [showFaceVerification, setShowFaceVerification] = React.useState(false);
  const [rooms, setRooms] = React.useState<any[]>([]);
  const [authReady, setAuthReady] = React.useState(false);
  const [currentUser, setCurrentUser] = React.useState<any>(null);

  const [userProfile, setUserProfile] = React.useState({
    displayName: 'Guest User',
    photoURL: 'https://i.pravatar.cc/300',
    bio: 'No bio yet',
    coins: 0,
    isVerified: false,
    following: [] as string[]
  });

  const [theme, setTheme] = React.useState<'light' | 'dark'>('dark');

  React.useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Auth & Profile Sync
  React.useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setAuthReady(true);

      if (user) {
        // Sync/Create profile
        const userRef = doc(db, 'users', user.uid);
        try {
          const userSnap = await getDoc(userRef);
          if (!userSnap.exists()) {
            await setDoc(userRef, {
              uid: user.uid,
              displayName: user.displayName || 'User_' + user.uid.slice(0, 5),
              photoURL: user.photoURL || 'https://i.pravatar.cc/300',
              role: 'user',
              coins: 1000, // Welcome gift matching rules
              isVerified: false,
              createdAt: serverTimestamp(),
              category: 'Social',
              bio: 'New explorer on Barca-live'
            });
          }
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  React.useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(doc(db, 'users', currentUser.uid), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setUserProfile({
          displayName: data.displayName || currentUser?.displayName || 'User',
          photoURL: data.photoURL || currentUser?.photoURL || 'https://i.pravatar.cc/300',
          bio: data.bio || 'No bio yet',
          coins: data.coins || 0,
          isVerified: data.isVerified || false,
          following: data.following || []
        });
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${currentUser?.uid}`);
    });
    return () => unsub();
  }, [currentUser]);

  // Sync Rooms from Firestore
  React.useEffect(() => {
    if (!currentUser) return;
    const q = firestoreQuery(
      collection(db, 'rooms'), 
      where('isPrivate', '==', false),
      firestoreOrderBy('createdAt', 'desc'), 
      firestoreLimit(20)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const dbRooms = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).filter((room: any) => !room.isPrivate);
      setRooms(dbRooms);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'rooms');
    });
    return () => unsub();
  }, [currentUser]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setViewingProfile(null);
      setActiveTab('discover');
    } catch (err) {
      setError('Logout failed');
    }
  };

  const [popularHosts, setPopularHosts] = React.useState([
    { name: 'Yonas', followers: '102K', category: 'Music', verified: true },
    { name: 'Zara_Gold', followers: '89.1K', category: 'Comedy', verified: true },
    { name: 'Lion_ETH', followers: '45.2K', category: 'Gaming', verified: false },
    { name: 'Melat', followers: '33.2K', category: 'Music', verified: true },
    { name: 'Betty', followers: '21.5K', category: 'Social', verified: false },
    { name: 'Solomon', followers: '12.8K', category: 'Gaming', verified: false },
    { name: 'Abush', followers: '5.4K', category: 'Comedy', verified: false }
  ]);

  // Sync popular hosts verified status from DB
  React.useEffect(() => {
    if (!currentUser) return;
    const unsub = onSnapshot(
      firestoreQuery(collection(db, 'users'), where('isVerified', '==', true)), 
      (snapshot) => {
        const dbUsers = snapshot.docs.map(doc => doc.data());
      setPopularHosts(prevHosts => prevHosts.map(host => {
        const dbUser = dbUsers.find(u => u.displayName === host.name || u.uid === host.name);
        if (dbUser) {
          return { ...host, verified: dbUser.isVerified || false };
        }
        return host;
      }));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });
    return () => unsub();
  }, [currentUser]);

  const categories = [
    { name: 'All', icon: Sparkles },
    { name: 'Music', icon: Music },
    { name: 'Gaming', icon: Gamepad2 },
    { name: 'Comedy', icon: Theater },
    { name: 'Social', icon: Users }
  ];

  const filteredHosts = popularHosts.filter(host => {
    const matchesSearch = host.name.toLowerCase().includes(hostSearchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || host.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const joinRoom = (room: { id: string, title: string, host: string, type: 'voice' | 'video', tier?: string }) => {
    setIsJoining(true);
    setError(null);
    
    // Simulating secure node handshake
    setTimeout(() => {
      // 10% chance of simulation error (e.g. room full or connection issue)
      if (Math.random() < 0.1) {
        setError("Connection timeout. The room might be full or private.");
        setIsJoining(false);
      } else {
        setActiveRoom(room);
        setIsJoining(false);
      }
    }, 1500);
  };

  if (!authReady) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!currentUser) {
    return <AuthForm />;
  }

  return (
    <div className="min-h-screen bg-black font-sans text-zinc-100 selection:bg-amber-400 selection:text-black">
      {/* Global Transition Overlay */}
      <AnimatePresence>
        {isJoining && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-center p-8"
          >
            <motion.div 
              animate={{ 
                rotate: 360,
                scale: [1, 1.2, 1],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-24 h-24 rounded-full border-4 border-amber-400/20 border-t-amber-400"
            />
            <div className="mt-8 text-center space-y-2">
              <h3 className="text-xl font-black text-white italic uppercase tracking-widest">Bridging Secure Line</h3>
              <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Barca-live Protocol v2.4 ...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Global Error Toast */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[110] px-6"
          >
            <div className="max-w-md mx-auto bg-red-500 text-white p-4 rounded-2xl flex items-center gap-4 shadow-2xl shadow-red-500/20">
              <ShieldAlert className="w-6 h-6 flex-shrink-0" />
              <p className="text-sm font-black italic">{error}</p>
              <button onClick={() => setError(null)} className="ml-auto bg-white/20 p-2 rounded-xl">
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Room View */}
      <AnimatePresence>
        {activeRoom && (
          <RoomView 
            room={activeRoom} 
            isHost={activeRoom.host === userProfile.displayName}
            onLeave={() => setActiveRoom(null)} 
          />
        )}
      </AnimatePresence>

      {/* Create Room Modal */}
      <CreateRoomModal 
        isOpen={showCreateRoom} 
        onClose={() => setShowCreateRoom(false)} 
        onRoomCreated={(room) => {
          setActiveRoom(room);
          setShowCreateRoom(false);
        }}
      />

      {/* Dynamic Header */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-xl border-b border-zinc-900 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-600 rounded-xl flex items-center justify-center font-black text-2xl shadow-lg shadow-orange-600/20">
            B
          </div>
          <h1 className="text-xl font-black tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-500 uppercase">
            Barca-live
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 bg-zinc-900 px-4 py-2 rounded-xl border border-zinc-800 mr-2 shadow-inner">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-black italic text-amber-400">
              {userProfile.coins.toLocaleString()}
            </span>
          </div>
          <button className="bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl hover:bg-zinc-800 transition-colors">
            <Search className="w-5 h-5 text-zinc-400" />
          </button>
          <button className="bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl hover:bg-zinc-800 transition-colors relative">
            <Bell className="w-5 h-5 text-zinc-400" />
            <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-black" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-6 pt-6 pb-32">
        <AnimatePresence mode="wait">
          {activeTab === 'discover' && (
            <motion.div 
              key="discover"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-white">Popular Rooms</h2>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setActiveTab('tasks')}
                    className="flex items-center gap-2 bg-amber-400/10 border border-amber-400/20 px-4 py-1.5 rounded-xl group hover:bg-amber-400 transition-all"
                  >
                    <Star className="w-3.5 h-3.5 text-amber-400 group-hover:text-black" />
                    <span className="text-amber-400 group-hover:text-black text-[9px] font-black uppercase tracking-widest">Earn 20K Coins</span>
                  </button>
                  <div className="flex gap-2 bg-zinc-900/50 p-1.5 rounded-2xl border border-zinc-800">
                    <button className="px-4 py-1.5 rounded-xl bg-zinc-800 text-xs font-bold text-white shadow-xl italic">Hot</button>
                    <button className="px-4 py-1.5 rounded-xl text-xs font-bold text-zinc-500 hover:text-zinc-300">New</button>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                {rooms.length > 0 ? (
                  rooms.map((roomData, i) => (
                    <RoomCard 
                      key={roomData.id} 
                      title={roomData.title}
                      host={roomData.host}
                      viewers={roomData.viewerCount?.toString() || "0"}
                      type={roomData.type}
                      onJoin={() => joinRoom(roomData)}
                      onShowProfile={(host) => setViewingProfile(host)}
                    />
                  ))
                ) : (
                  [...Array(4)].map((_, i) => {
                    const roomData = {
                      id: `room_${i}`,
                      title: ["Night Vibes 🌙", "Ethiopia Stars 🇪🇹", "Voice Party!", "Chitchat Room"][i],
                      host: ["Abebe", "Sara", "Khalid", "Elena"][i],
                      viewers: ["1.2K", "890", "2.4K", "150"][i],
                      type: (i % 2 === 0 ? 'video' : 'voice') as 'video' | 'voice',
                      tier: i === 0 ? 'Gold Agency' : 'Standard'
                    };
                    return (
                      <RoomCard 
                        key={i} 
                        title={roomData.title}
                        host={roomData.host}
                        viewers={roomData.viewers}
                        type={roomData.type}
                        onJoin={() => joinRoom(roomData)}
                        onShowProfile={(host) => setViewingProfile(host)}
                      />
                    );
                  })
                )}
              </div>

              {/* Popular Hosts Section */}
              <div className="pt-4 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="text-xl font-black text-white">Popular Hosts</h2>
                  <div className="flex items-center gap-4 flex-1 sm:max-w-xs">
                    <div className="relative flex-1 group">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600 group-focus-within:text-amber-400 transition-colors" />
                      <input 
                        type="text" 
                        placeholder="Search hosts..."
                        value={hostSearchQuery}
                        onChange={(e) => setHostSearchQuery(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs font-bold text-white focus:border-amber-400 outline-none transition-all placeholder:text-zinc-700"
                      />
                      {hostSearchQuery && (
                        <button 
                          onClick={() => setHostSearchQuery('')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <button className="text-zinc-500 text-[10px] font-black uppercase tracking-widest hover:text-zinc-300 flex-shrink-0">See All</button>
                  </div>
                </div>

                {/* Category Tags Filter */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                  {categories.map((cat) => (
                    <button
                      key={cat.name}
                      onClick={() => setSelectedCategory(cat.name)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-full border transition-all text-[9px] font-black uppercase tracking-widest flex-shrink-0",
                        selectedCategory === cat.name 
                          ? "bg-amber-400 border-amber-400 text-black shadow-lg shadow-amber-400/20" 
                          : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                      )}
                    >
                      <cat.icon className="w-3 h-3" />
                      {cat.name}
                    </button>
                  ))}
                </div>
                
                <div className="relative">
                  <div className="flex gap-6 overflow-x-auto pb-4 no-scrollbar scroll-smooth min-h-[100px]">
                    <AnimatePresence mode="popLayout">
                      {filteredHosts.length > 0 ? (
                        filteredHosts.map((host, i) => {
                          // Find original index for rank logic
                          const originalIndex = popularHosts.findIndex(h => h.name === host.name);
                          return (
                            <motion.div 
                              key={host.name} 
                              layout
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => setViewingProfile(host.name)}
                              className="flex-shrink-0 flex flex-col items-center gap-2 group cursor-pointer relative"
                            >
                              <div className={cn(
                                "w-16 h-16 rounded-full border-2 p-0.5 transition-all relative",
                                originalIndex === 0 ? "border-amber-400" : 
                                originalIndex === 1 ? "border-zinc-300" :
                                originalIndex === 2 ? "border-orange-600" : "border-zinc-800"
                              )}>
                                <img 
                                  src={`https://i.pravatar.cc/150?u=${host.name}`} 
                                  className="w-full h-full rounded-full object-cover" 
                                  alt={host.name} 
                                />
                                {/* Rank Badge */}
                                <div className={cn(
                                  "absolute -top-1 -right-1 w-6 h-6 rounded-lg flex items-center justify-center shadow-lg border border-black/50 overflow-hidden",
                                  originalIndex === 0 ? "bg-amber-400 text-black" :
                                  originalIndex === 1 ? "bg-zinc-300 text-black" :
                                  originalIndex === 2 ? "bg-orange-600 text-white" : "bg-zinc-900 text-zinc-400"
                                )}>
                                  {originalIndex === 0 ? <Trophy className="w-3.5 h-3.5" /> : <span className="text-[10px] font-black italic">#{originalIndex + 1}</span>}
                                </div>
                                {/* Category Badge */}
                                <div className="absolute -bottom-1 -right-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1 shadow-lg">
                                  {host.category === 'Music' && <Music className="w-2.5 h-2.5 text-blue-400" />}
                                  {host.category === 'Comedy' && <Theater className="w-2.5 h-2.5 text-purple-400" />}
                                  {host.category === 'Gaming' && <Gamepad2 className="w-2.5 h-2.5 text-green-400" />}
                                  {host.category === 'Social' && <Users className="w-2.5 h-2.5 text-amber-400" />}
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <p className="text-[10px] font-bold text-zinc-300 group-hover:text-white truncate max-w-[50px]">{host.name}</p>
                                  {host.verified && <CheckCircle2 className="w-2.5 h-2.5 text-blue-400" />}
                                </div>
                                <p className="text-[8px] font-black text-zinc-600 uppercase tracking-tighter">{host.followers}</p>
                              </div>
                            </motion.div>
                          );
                        })
                      ) : (
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="w-full py-8 text-center"
                        >
                          <p className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.2em]">No hosts found Matching your search</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Interaction Demo */}
              <div className="pt-8">
                <button 
                  onClick={() => setShowGiftPanel(!showGiftPanel)}
                  className="bg-amber-400 text-black px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-amber-400/20 active:scale-95 transition-all"
                >
                  Test Gift Overlay
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'live' && (
            <motion.div 
              key="live"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[3rem] space-y-8 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-400/5 to-transparent pointer-events-none" />
                
                <div className="flex flex-col items-center text-center space-y-4 relative z-10">
                  <div className="w-24 h-24 bg-amber-400/10 rounded-full flex items-center justify-center border border-amber-400/20 shadow-2xl shadow-amber-400/10 mb-2">
                    <Radio className="w-12 h-12 text-amber-400 animate-pulse" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter">Ready to Lead?</h3>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-[0.2em] max-w-sm mx-auto leading-relaxed">
                      Create your own exclusive digital space. Host talk shows, concerts, or gaming sessions with up to 24 users on stage.
                    </p>
                  </div>

                  <button 
                    onClick={() => setShowCreateRoom(true)}
                    className="bg-gradient-to-r from-amber-400 to-orange-600 text-white px-12 py-5 rounded-[2.5rem] font-black uppercase tracking-[0.3em] shadow-2xl shadow-orange-600/30 hover:scale-[1.05] active:scale-[0.95] transition-all text-xs border border-white/10"
                  >
                    Launch New Room
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 relative z-10 pt-4">
                  <div className="bg-black/40 border border-zinc-800 p-6 rounded-[2rem] flex items-center gap-4 hover:border-amber-400/30 transition-colors">
                    <div className="w-12 h-12 bg-amber-400/5 rounded-2xl flex items-center justify-center border border-amber-400/10">
                      <Mic className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-white font-black text-[10px] uppercase tracking-widest">Audio First</p>
                      <p className="text-zinc-600 text-[8px] font-bold uppercase tracking-tighter">Ultra Low Latency</p>
                    </div>
                  </div>
                  <div className="bg-black/40 border border-zinc-800 p-6 rounded-[2rem] flex items-center gap-4 hover:border-blue-400/30 transition-colors">
                    <div className="w-12 h-12 bg-blue-400/5 rounded-2xl flex items-center justify-center border border-blue-400/10">
                      <Video className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white font-black text-[10px] uppercase tracking-widest">Video HD</p>
                      <p className="text-zinc-600 text-[8px] font-bold uppercase tracking-tighter">4K 60FPS Support</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-3 px-4">
                  <ShieldCheck className="w-4 h-4 text-zinc-600" />
                  <h3 className="text-zinc-600 font-black uppercase tracking-[0.3em] text-[10px]">Security Frameworks</h3>
                </div>
                <RoomSettings />
                <ModerationTools />
              </div>
            </motion.div>
          )}

          {activeTab === 'tasks' && (
            <motion.div 
              key="tasks"
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="max-w-xl mx-auto"
            >
              <UserTasks />
            </motion.div>
          )}

          {activeTab === 'agency' && (
            <motion.div 
              key="agency"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <AgentDashboard />
            </motion.div>
          )}

          {activeTab === 'wallet' && (
            <motion.div 
              key="wallet"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="max-w-xl mx-auto"
            >
              <Wallet />
            </motion.div>
          )}

          {activeTab === 'games' && (
            <motion.div 
              key="games"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Games />
            </motion.div>
          )}

          {activeTab === 'me' && (
            <motion.div 
              key="me"
              initial={{ opacity: 0, rotateY: 10 }}
              animate={{ opacity: 1, rotateY: 0 }}
              exit={{ opacity: 0, rotateY: -10 }}
              className="max-w-2xl mx-auto space-y-12"
            >
              {/* Profile Header */}
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-r from-amber-400 to-orange-600 animate-spin-slow">
                    <div className="w-full h-full rounded-full bg-black flex items-center justify-center p-1">
                      <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-full h-full rounded-full object-cover" />
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-2 bg-amber-400 p-2 rounded-xl shadow-lg">
                    <Shield className="w-4 h-4 text-black" />
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <h2 className="text-3xl font-black text-white italic">{userProfile.displayName}</h2>
                  {userProfile.isVerified && <CheckCircle2 className="w-6 h-6 text-blue-400" />}
                </div>
                <p className="text-zinc-500 text-xs mt-2 max-w-sm italic">"{userProfile.bio}"</p>
                
                <div className="flex gap-4 mt-8">
                  <div className="bg-zinc-900 border border-zinc-800 px-6 py-3 rounded-2xl">
                    <span className="text-amber-400 font-black block">1.5M</span>
                    <span className="text-zinc-500 text-[9px] uppercase font-bold tracking-widest">Fans</span>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 px-6 py-3 rounded-2xl">
                    <span className="text-blue-400 font-black block">458</span>
                    <span className="text-zinc-500 text-[9px] uppercase font-bold tracking-widest">Following</span>
                  </div>
                </div>

                <div className="mt-8 flex gap-3">
                  {!userProfile.isVerified && (
                    <button 
                      onClick={() => setShowFaceVerification(true)}
                      className="bg-red-500 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-red-500/20 active:scale-95 transition-all flex items-center gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      Verify Face
                    </button>
                  )}
                  <button 
                    onClick={() => setActiveTab('agency')}
                    className="bg-zinc-900 border border-zinc-800 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-zinc-800 transition-all flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    Edit Profile
                  </button>
                  <button className="bg-amber-400 text-black px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-amber-400/20 active:scale-95 transition-all">
                    View Public Page
                  </button>
                </div>
              </div>

              {/* Theme Settings */}
              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2.5rem] flex items-center justify-between">
                <div>
                  <h3 className="text-white font-black uppercase text-sm">Theme</h3>
                  <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">Enable {theme === 'dark' ? 'Light' : 'Dark'} Mode</p>
                </div>
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className={cn(
                    "w-14 h-8 rounded-full p-1 transition-all flex items-center",
                    theme === 'dark' ? "bg-amber-400 justify-end" : "bg-zinc-700 justify-start"
                  )}
                >
                  <div className="w-6 h-6 rounded-full bg-black" />
                </button>
              </div>

              {/* Admin Panel for demo */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 px-2">
                  <Settings className="w-5 h-5 text-zinc-500" />
                  <h3 className="text-zinc-500 font-black uppercase tracking-widest text-sm">Authority Dashboard</h3>
                </div>
                <AdminPanel />
              </div>

              {/* Blocked Users Section */}
              <div className="space-y-6 pb-12">
                <div className="flex items-center gap-3 px-2">
                  <UserX className="w-5 h-5 text-zinc-500" />
                  <h3 className="text-zinc-500 font-black uppercase tracking-widest text-sm">Blocked Entities</h3>
                </div>
                <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-[2rem] overflow-hidden divide-y divide-zinc-800/50">
                  {[
                    { id: 'b1', name: 'Spam_User_42', avatar: 'https://i.pravatar.cc/100?u=b1' },
                    { id: 'b2', name: 'Bot_Handshake', avatar: 'https://i.pravatar.cc/100?u=b2' }
                  ].map(user => (
                    <div key={user.id} className="p-5 flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full grayscale group-hover:grayscale-0 transition-all border border-zinc-800 overflow-hidden">
                          <img src={user.avatar} alt={user.name} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-zinc-300">{user.name}</p>
                          <p className="text-[10px] text-zinc-600 font-black uppercase">Blocked on May 15</p>
                        </div>
                      </div>
                      <button className="bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all">
                        Unblock
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Profile Modal Overlay */}
      <AnimatePresence>
        {viewingProfile && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setViewingProfile(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[120]"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="fixed inset-0 flex items-center justify-center p-6 z-[130] pointer-events-none"
            >
              <div className="bg-zinc-900 border border-zinc-800 rounded-[3rem] w-full max-w-sm overflow-hidden pointer-events-auto shadow-2xl relative">
                <button 
                  onClick={() => setViewingProfile(null)}
                  className="absolute top-6 right-6 bg-zinc-800 p-2 rounded-xl text-zinc-400 hover:text-white transition-all z-10"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Cover Image */}
                <div className="h-32 bg-gradient-to-br from-amber-400 to-orange-600 relative">
                  <div className="absolute inset-0 bg-black/20" />
                </div>

                <div className="px-8 pb-8 -mt-12 relative">
                  <div className="w-24 h-24 rounded-full border-4 border-zinc-900 overflow-hidden mb-4 shadow-xl">
                    <img src={`https://i.pravatar.cc/300?u=${viewingProfile}`} alt={viewingProfile} className="w-full h-full object-cover" />
                  </div>
                  
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-2xl font-black text-white italic">{viewingProfile}</h3>
                    {popularHosts.find(h => h.name === viewingProfile)?.verified && (
                      <CheckCircle2 className="w-5 h-5 text-blue-400" />
                    )}
                    <div className="bg-amber-400 p-1 rounded-md">
                      <Shield className="w-3 h-3 text-black" />
                    </div>
                  </div>
                  <p className="text-zinc-500 text-xs font-medium">Barca Gold Contributor</p>

                  <div className="grid grid-cols-2 gap-4 mt-8">
                    <div className="bg-zinc-800/50 p-4 rounded-2xl text-center border border-zinc-700/30">
                      <span className="text-white font-black block">12.4K</span>
                      <span className="text-zinc-500 text-[10px] uppercase font-black tracking-widest">Followers</span>
                    </div>
                    <div className="bg-zinc-800/50 p-4 rounded-2xl text-center border border-zinc-700/30">
                      <span className="text-amber-400 font-black block">8.2K</span>
                      <span className="text-zinc-500 text-[10px] uppercase font-black tracking-widest">Coins Shared</span>
                    </div>
                  </div>

                  <div className="space-y-3 mt-8">
                    <button 
                      onClick={async () => {
                        if (!currentUser || !viewingProfile) return;
                        try {
                          const isFollowing = userProfile.following.includes(viewingProfile);
                          await updateDoc(doc(db, 'users', currentUser.uid), {
                            following: isFollowing ? arrayRemove(viewingProfile) : arrayUnion(viewingProfile)
                          });
                        } catch (err) {
                          handleFirestoreError(err, OperationType.UPDATE, `users/${currentUser.uid}`);
                        }
                      }}
                      className={cn(
                        "w-full font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all uppercase tracking-widest text-xs",
                        userProfile.following.includes(viewingProfile) ? "bg-zinc-800 text-white hover:bg-zinc-700" : "bg-amber-400 text-black shadow-amber-400/20 hover:bg-amber-300"
                      )}
                    >
                      {userProfile.following.includes(viewingProfile) ? 'Following' : 'Follow Host'}
                    </button>
                    <div className="flex gap-3">
                      <button className="flex-1 bg-zinc-800 text-white font-black py-4 rounded-2xl active:scale-95 transition-all uppercase tracking-widest text-[10px]">
                        Send Message
                      </button>
                      <button className="flex-1 bg-zinc-800 text-white font-black py-4 rounded-2xl active:scale-95 transition-all uppercase tracking-widest text-[10px]">
                        Gift Support
                      </button>
                    </div>
                    <button className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold py-3 rounded-2xl active:scale-95 transition-all uppercase tracking-widest text-[9px] border border-red-500/20">
                      Block User
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Gift Panel Overlay */}
      <AnimatePresence>
        {showGiftPanel && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGiftPanel(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
            >
              <div className="max-w-md mx-auto pointer-events-auto">
                <Gifts />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modern Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 px-6 pb-2 pt-4 bg-gradient-to-t from-black via-black/95 to-transparent">
        <div className="max-w-md mx-auto bg-zinc-900/90 backdrop-blur-2xl border border-zinc-800 p-2 rounded-[2.5rem] flex items-center justify-between shadow-2xl relative overflow-hidden">
          {/* Active Highlight */}
          <div 
            className="absolute transition-all duration-300"
            style={{ 
              left: `${NAVIGATION.findIndex(n => n.id === activeTab) * (100 / NAVIGATION.length)}%`,
              width: `${100 / NAVIGATION.length}%`,
              padding: '8px'
            }}
          >
            <div className="w-full h-12 bg-amber-400 rounded-[2rem] shadow-lg shadow-amber-400/20" />
          </div>

          {NAVIGATION.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full h-12 flex flex-col items-center justify-center gap-0.5 relative z-10 transition-all duration-300",
                activeTab === item.id ? "text-black scale-110" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <item.icon className={cn("w-5 h-5", activeTab === item.id ? "stroke-[3px]" : "stroke-[2px]")} />
              <span className="text-[8px] font-black uppercase tracking-tighter">{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <button 
        onClick={handleLogout}
        className="fixed bottom-32 right-8 hidden lg:flex bg-red-600 text-white w-14 h-14 rounded-2xl items-center justify-center shadow-2xl shadow-red-600/30 z-40"
      >
        <UserX className="w-8 h-8 font-black" />
      </button>

      <FaceVerification 
        isOpen={showFaceVerification} 
        onClose={() => setShowFaceVerification(false)} 
        onVerified={() => {
          // Profile is synced via onSnapshot
        }}
      />
    </div>
  );
}
