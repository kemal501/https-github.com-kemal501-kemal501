import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, UserPlus, ClipboardList, TrendingUp, Search, X, CheckCircle2, ShieldCheck, QrCode, Share2, Briefcase, Star, Settings, Plus, Camera, Sparkles, Crown, Medal, Diamond, Award, Activity, Zap } from 'lucide-react';
import { cn } from '../lib/utils';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, getDoc, updateDoc, onSnapshot, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import DatePicker from './DatePicker';
import NetworkQualityDashboard from './NetworkQualityDashboard';
import AgentSystemRoom from './AgentSystemRoom';

interface Host {
  id: string;
  name: string;
  avatar: string;
  status: 'active' | 'pending';
  performance: number;
  isVerified?: boolean;
}

interface AgencyTask {
  id: string;
  title: string;
  reward: number;
  rewardType: 'coins' | 'usd';
  progress: number;
  deadline: string;
  status: 'available' | 'in-progress' | 'completed';
  assignedTo?: string;
  agencyId?: string;
  creatorId?: string;
}

export default function AgentDashboard() {
  const [userRole, setUserRole] = React.useState<'none' | 'agent' | 'host'>('none');
  const [showInviteModal, setShowInviteModal] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const [showProfileEdit, setShowProfileEdit] = React.useState(false);
  const [showTaskModal, setShowTaskModal] = React.useState(false);
  const [showVerificationModal, setShowVerificationModal] = React.useState(false);
  const [verificationStatus, setVerificationStatus] = React.useState<'none' | 'pending' | 'verified'>('none');
  const [inviteCode, setInviteCode] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<'team' | 'tasks' | 'stats' | 'earnings' | 'network'>('team');
  const [subTab, setSubTab] = React.useState<'list' | 'system'>('list');
  const [isLoading, setIsLoading] = React.useState(true);
  const [earningsSort, setEarningsSort] = React.useState<{ field: 'date' | 'amount', order: 'asc' | 'desc' }>({ field: 'date', order: 'desc' });

  const [hostProfile, setHostProfile] = React.useState({
    displayName: 'User',
    bio: '',
    photoURL: '',
    category: 'Social'
  });

  const [agencyInfo, setAgencyInfo] = React.useState({
    id: '',
    name: '',
    description: '',
    tier: 'Bronze Agency'
  });

  const [hosts, setHosts] = React.useState<Host[]>([]);
  const [tasks, setTasks] = React.useState<AgencyTask[]>([]);

  // Sync Profile and Agency info
  React.useEffect(() => {
    if (!auth.currentUser) return;
    
    const userRef = doc(db, 'users', auth.currentUser.uid);
    const unsubUser = onSnapshot(userRef, async (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setHostProfile({
          displayName: data.displayName || auth.currentUser?.displayName || 'User',
          bio: data.bio || '',
          photoURL: data.photoURL || auth.currentUser?.photoURL || '',
          category: data.category || 'Social'
        });
        setUserRole(data.role || 'none');
        setVerificationStatus(data.isFaceVerified ? 'verified' : 'none');
        
        if (data.agencyId) {
          const agencySnap = await getDoc(doc(db, 'agencies', data.agencyId));
          if (agencySnap.exists()) {
            setAgencyInfo({ id: agencySnap.id, ...agencySnap.data() } as any);
          }
        }
      }
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `users/${auth.currentUser?.uid}`);
      setIsLoading(false);
    });

    return () => unsubUser();
  }, []);

  // Sync Tasks
  React.useEffect(() => {
    if (!auth.currentUser || userRole === 'none') return;

    // Build query for tasks
    // If agent, show all tasks for their agency
    // If host, show tasks for their agency
    const tasksRef = collection(db, 'tasks');
    const unsubTasks = onSnapshot(tasksRef, (snap) => {
      const allTasks = snap.docs.map(d => ({ id: d.id, ...d.data() } as AgencyTask));
      // Filter by agency if needed, but for now we'll show tasks creator by this agent OR global tasks
      setTasks(allTasks.filter(t => t.agencyId === agencyInfo.id || !t.agencyId));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'tasks');
    });

    return () => unsubTasks();
  }, [userRole, agencyInfo.id]);

  // Sync Team (for Agents)
  React.useEffect(() => {
    if (userRole !== 'agent' || !agencyInfo.id) return;

    const usersRef = collection(db, 'users');
    const unsubUsers = onSnapshot(usersRef, (snap) => {
      const team = snap.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .filter(u => u.agencyId === agencyInfo.id && u.role === 'host')
        .map(u => ({
          id: u.id,
          name: u.displayName || 'Unknown',
          avatar: u.photoURL || `https://i.pravatar.cc/150?u=${u.id}`,
          status: 'active' as const,
          performance: u.performance || 0,
          isVerified: u.isFaceVerified
        }));
      setHosts(team);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'users');
    });

    return () => unsubUsers();
  }, [userRole, agencyInfo.id]);

  const saveProfile = async () => {
    if (!auth.currentUser) return;
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        displayName: hostProfile.displayName,
        bio: hostProfile.bio,
        photoURL: hostProfile.photoURL,
        category: hostProfile.category
      });
      setShowProfileEdit(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
    }
  };

  const [newTask, setNewTask] = React.useState({
    title: '',
    reward: 1000,
    rewardType: 'coins' as 'coins' | 'usd',
    deadline: '7 days',
    assignedTo: ''
  });

  const [customDeadlineDate, setCustomDeadlineDate] = React.useState('');
  const [deadlineError, setDeadlineError] = React.useState('');

  const validateDeadlineDate = (dateVal: string): boolean => {
    if (!dateVal) {
      setDeadlineError('Date is required');
      return false;
    }
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) {
      setDeadlineError('Invalid date format');
      return false;
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(d);
    selectedDate.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      setDeadlineError('Deadline cannot be in the past');
      return false;
    }
    setDeadlineError('');
    return true;
  };

  const handleCreateTask = async () => {
    if (!newTask.title || !auth.currentUser) return;
    
    let taskDeadline = newTask.deadline;
    if (newTask.deadline === 'custom') {
      if (!validateDeadlineDate(customDeadlineDate)) {
        return;
      }
      taskDeadline = customDeadlineDate;
    }

    try {
      const taskData = {
        title: newTask.title,
        reward: newTask.reward,
        rewardType: newTask.rewardType,
        progress: 0,
        deadline: taskDeadline,
        status: 'available',
        assignedTo: newTask.assignedTo || null,
        agencyId: agencyInfo.id,
        creatorId: auth.currentUser.uid,
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'tasks'), taskData);
      setShowTaskModal(false);
      setNewTask({ title: '', reward: 1000, rewardType: 'coins', deadline: '7 days', assignedTo: '' });
      setCustomDeadlineDate('');
      setDeadlineError('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'tasks');
    }
  };

  const startTask = async (taskId: string) => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), {
        status: 'in-progress',
        progress: 5,
        assignedTo: auth.currentUser?.uid
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `tasks/${taskId}`);
    }
  };

  const [registrationStep, setRegistrationStep] = React.useState(1);
  const [regForm, setRegForm] = React.useState({
    name: '',
    email: '',
    country: 'Ethiopia',
    experience: 'None'
  });

  const handleRegister = async () => {
    if (!auth.currentUser) return;
    try {
      const agencyData = {
        name: regForm.name || 'New Agency',
        description: `Professional agency by ${auth.currentUser.displayName}`,
        ownerId: auth.currentUser.uid,
        tier: 'Bronze Agency',
        createdAt: serverTimestamp()
      };
      const agencyRef = await addDoc(collection(db, 'agencies'), agencyData);
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        role: 'agent',
        agencyId: agencyRef.id
      });
      setUserRole('agent');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'agencies');
    }
  };

  const submitVerification = async () => {
    if (!auth.currentUser) return;
    setVerificationStatus('pending');
    setShowVerificationModal(false);
    
    // In a real app, this would trigger face verification
    // Since we have a real face verification in UserTasks, we can just point there
    // But let's allow "Manual Verification Request" for Hosts here
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        verificationRequest: {
          status: 'pending',
          requestedAt: serverTimestamp()
        }
      });
      // Simulate auto-approval for demo
      setTimeout(async () => {
        await updateDoc(doc(db, 'users', auth.currentUser?.uid || ''), {
          isFaceVerified: true,
          role: 'host'
        });
      }, 5000);
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="w-8 h-8 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (userRole === 'none') {
    return (
      <div className="flex flex-col items-center justify-center p-6 space-y-12">
        {/* Agent/Agency Split View */}
        <div className="w-full space-y-8 mt-10">
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Agency Network</h2>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em]">Join or Create your team</p>
          </div>

          <AnimatePresence mode="wait">
            {registrationStep === 1 ? (
              <motion.div 
                key="step-1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="grid grid-cols-1 gap-6"
              >
                {/* For Agents */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 space-y-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <ShieldCheck className="w-24 h-24 text-amber-400" />
                  </div>
                  <div className="space-y-4 relative">
                    <div className="w-12 h-12 bg-amber-400/10 rounded-2xl flex items-center justify-center border border-amber-400/20">
                      <Briefcase className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white uppercase italic">I am an Agent</h3>
                      <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Start recruiting & earn 15%</p>
                    </div>
                    <button 
                      onClick={() => setRegistrationStep(2)}
                      className="w-full bg-amber-400 text-black font-black py-4 rounded-xl uppercase tracking-widest text-[10px] active:scale-95 transition-all"
                    >
                      Register Agency
                    </button>
                  </div>
                </div>

                {/* For Hosts */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 space-y-6 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                    <Users className="w-24 h-24 text-blue-400" />
                  </div>
                  <div className="space-y-4 relative">
                    <div className="w-12 h-12 bg-blue-400/10 rounded-2xl flex items-center justify-center border border-blue-400/20">
                      <UserPlus className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white uppercase italic">I am a Host</h3>
                      <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Join a team to unlock tasks</p>
                    </div>
                    <div className="space-y-3">
                      <div className="bg-black/40 rounded-xl border border-zinc-800 p-1 flex items-center">
                        <input 
                          type="text" 
                          value={inviteCode}
                          onChange={(e) => setInviteCode(e.target.value)}
                          placeholder="ENTER INVITE CODE..." 
                          className="bg-transparent flex-1 px-4 py-3 text-[10px] font-black uppercase tracking-widest text-white outline-none placeholder:text-zinc-700" 
                        />
                        <button 
                          onClick={() => inviteCode && setUserRole('host')}
                          className="bg-blue-400 text-black px-4 py-3 rounded-lg font-black text-[9px] uppercase tracking-widest"
                        >
                          Apply
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="step-2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 space-y-8 relative overflow-hidden"
              >
                <button 
                  onClick={() => setRegistrationStep(1)}
                  className="text-zinc-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                >
                  <X className="w-3 h-3" /> Back
                </button>

                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Agency Registration</h3>
                  <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">Complete your professional profile</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-zinc-500 text-[9px] font-black uppercase tracking-widest ml-1">Agency Name</label>
                    <input 
                      type="text"
                      value={regForm.name}
                      onChange={(e) => setRegForm({...regForm, name: e.target.value})}
                      placeholder="e.g. Star Ethiopia"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-4 text-white text-xs font-bold focus:border-amber-400 outline-none transition-all placeholder:text-zinc-800"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-zinc-500 text-[9px] font-black uppercase tracking-widest ml-1">Business Email</label>
                    <input 
                      type="email"
                      value={regForm.email}
                      onChange={(e) => setRegForm({...regForm, email: e.target.value})}
                      placeholder="contact@agency.com"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-4 text-white text-xs font-bold focus:border-amber-400 outline-none transition-all placeholder:text-zinc-800"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-zinc-500 text-[9px] font-black uppercase tracking-widest ml-1">Experience</label>
                      <select 
                        value={regForm.experience}
                        onChange={(e) => setRegForm({...regForm, experience: e.target.value})}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-4 text-white text-xs font-bold focus:border-amber-400 outline-none transition-all appearance-none"
                      >
                        <option>None</option>
                        <option>1-2 Years</option>
                        <option>3+ Years</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-zinc-500 text-[9px] font-black uppercase tracking-widest ml-1">Region</label>
                      <select 
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-4 text-white text-xs font-bold focus:border-amber-400 outline-none transition-all appearance-none"
                      >
                        <option>Addis Ababa</option>
                        <option>Dire Dawa</option>
                        <option>Gondar</option>
                      </select>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={handleRegister}
                  className="w-full bg-amber-400 text-black font-black py-5 rounded-xl uppercase tracking-widest text-[11px] active:scale-95 transition-all shadow-xl shadow-amber-400/20"
                >
                  Submit Registration
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  const getTierInfo = (earnings: number) => {
    if (earnings >= 500000) return { name: 'Diamond Agency', badgeName: 'Diamond', color: 'text-cyan-400', bg: 'bg-cyan-400/10', border: 'border-cyan-400/20', icon: Diamond };
    if (earnings >= 250000) return { name: 'Platinum Agency', badgeName: 'Platinum', color: 'text-slate-300', bg: 'bg-slate-300/10', border: 'border-slate-300/20', icon: Award };
    if (earnings >= 100000) return { name: 'Gold Agency', badgeName: 'Gold', color: 'text-amber-400', bg: 'bg-amber-400/10', border: 'border-amber-400/20', icon: Crown };
    if (earnings >= 50000) return { name: 'Silver Agency', badgeName: 'Silver', color: 'text-zinc-300', bg: 'bg-zinc-300/10', border: 'border-zinc-300/20', icon: Medal };
    return { name: 'Bronze Agency', badgeName: 'Bronze', color: 'text-orange-400', bg: 'bg-orange-400/10', border: 'border-orange-400/20', icon: ShieldCheck };
  };

  const agencyEarnings = (agencyInfo as any).totalEarnings || 142500;
  const tierInfo = userRole === 'agent' ? getTierInfo(agencyEarnings) : null;
  const TierIcon = tierInfo?.icon || ShieldCheck;

  return (
    <div className="p-6 space-y-10 pb-32">
      {/* Agency Header */}
      <header className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TierIcon className={cn("w-4 h-4", tierInfo?.color || "text-blue-400")} />
              <span className={cn("text-[10px] font-black uppercase tracking-widest", tierInfo?.color || "text-blue-400")}>
                {userRole === 'agent' ? tierInfo?.name : 'Verified Member'}
              </span>
            </div>
            <h1 
              onClick={() => userRole === 'agent' && setShowProfileEdit(true)}
              className={cn(
                "text-4xl font-black text-white italic uppercase tracking-tighter cursor-pointer hover:text-amber-400 transition-colors",
                userRole === 'agent' && "hover:underline underline-offset-4"
              )}
            >
              {userRole === 'agent' ? agencyInfo.name : 'My Agency'}
            </h1>
          </div>
          {userRole === 'agent' ? (
            <div className="flex gap-2">
              <button 
                onClick={() => setShowProfileEdit(true)}
                className="bg-zinc-900 text-zinc-400 border border-zinc-800 p-4 rounded-2xl hover:text-white active:scale-95 transition-all"
              >
                <Settings className="w-6 h-6" />
              </button>
              <button 
                onClick={() => setShowInviteModal(true)}
                className="bg-amber-400 text-black p-4 rounded-2xl shadow-lg shadow-amber-400/20 active:scale-95 transition-all"
              >
                <UserPlus className="w-6 h-6" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setShowProfileEdit(true)}
                className="bg-zinc-900 text-zinc-400 border border-zinc-800 p-4 rounded-2xl hover:text-white active:scale-95 transition-all"
              >
                <Settings className="w-6 h-6" />
              </button>
              <button 
                onClick={() => setShowVerificationModal(true)}
                className={cn(
                  "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                  verificationStatus === 'verified' ? "bg-blue-400/10 text-blue-400 border border-blue-400/20" :
                  verificationStatus === 'pending' ? "bg-amber-400/10 text-amber-400 border border-amber-400/20 animate-pulse" :
                  "bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-700"
                )}
              >
                {verificationStatus === 'verified' ? 'Verified Host' : 
                 verificationStatus === 'pending' ? 'Verification Pending' : 'Get Verified'}
              </button>
              <div className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800">
                <Star className="w-6 h-6 text-amber-400" />
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2.5rem]">
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mb-2">
              {userRole === 'agent' ? 'Team Revenue' : 'My Revenue'}
            </p>
            <p className="text-2xl font-black text-white">
              {userRole === 'agent' ? 'ETB 142.5K' : 'ETB 12.8K'}
            </p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2.5rem]">
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mb-2">
              {userRole === 'agent' ? 'Active Hosts' : 'Days Active'}
            </p>
            <p className="text-2xl font-black text-amber-400">
              {userRole === 'agent' ? '24 / 32' : '42'}
            </p>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-zinc-900 pb-4">
        {[
          { id: 'team', icon: Users, label: userRole === 'agent' ? 'My Team' : 'Team Feed' },
          { id: 'tasks', icon: ClipboardList, label: 'Tasks' },
          { id: 'earnings', icon: TrendingUp, label: 'Earnings' },
          { id: 'stats', icon: Star, label: 'Growth' },
          { id: 'network', icon: Activity, label: 'Quality Feed' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl transition-all font-black uppercase tracking-widest text-[9px]",
              activeTab === tab.id ? "bg-amber-400 text-black" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'team' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {hosts.map(host => (
              <div key={host.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-[2rem] flex items-center justify-between group hover:border-zinc-700 transition-all">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img src={host.avatar} className="w-12 h-12 rounded-2xl object-cover" alt={host.name} />
                    <div className={cn(
                      "absolute -bottom-1 -right-1 w-4 h-4 rounded-full border border-black flex items-center justify-center",
                      host.status === 'active' ? "bg-green-500" : "bg-amber-500"
                    )}>
                      {host.status === 'active' ? <CheckCircle2 className="w-2.5 h-2.5 text-white" /> : <Star className="w-2.5 h-2.5 text-white animate-pulse" />}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-white font-bold uppercase text-xs">{host.name}</h4>
                    <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest">Perf: {host.performance}%</p>
                  </div>
                </div>
                {userRole === 'agent' && (
                  <div className="flex items-center gap-2">
                    <button className="bg-zinc-800 text-zinc-400 p-2 rounded-xl hover:text-white transition-colors">
                      <TrendingUp className="w-4 h-4" />
                    </button>
                    <button className="bg-zinc-800 text-zinc-400 p-2 rounded-xl hover:text-amber-400 transition-colors">
                      <ClipboardList className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </motion.div>
        )}

        {activeTab === 'tasks' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Sub-tab Selection Header */}
            <div className="flex bg-zinc-950/80 p-1 rounded-2xl border border-zinc-900 self-start max-w-sm">
              <button 
                onClick={() => setSubTab('list')}
                className={cn(
                  "flex-1 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer text-center",
                  subTab === 'list' ? "bg-amber-400 text-black shadow-lg shadow-amber-400/10" : "text-zinc-500 hover:text-zinc-350"
                )}
              >
                Task Matrix
              </button>
              <button 
                onClick={() => setSubTab('system')}
                className={cn(
                  "flex-1 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer text-center flex items-center justify-center gap-1.5",
                  subTab === 'system' ? "bg-amber-400 text-black shadow-lg shadow-amber-400/10" : "text-zinc-500 hover:text-zinc-350"
                )}
              >
                <Zap className="w-3.5 h-3.5" />
                Agent Task Rooms System
              </button>
            </div>

            {subTab === 'system' ? (
              <AgentSystemRoom />
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {userRole === 'agent' && (
                  <button 
                    onClick={() => setShowTaskModal(true)}
                    className="bg-zinc-900 border border-zinc-800 border-dashed p-6 rounded-[2.5rem] flex items-center justify-center gap-3 group hover:border-amber-400/50 transition-all w-full text-left"
                  >
                    <div className="bg-zinc-800 p-2 rounded-xl group-hover:bg-amber-400/10 group-hover:text-amber-400 transition-all">
                      <Plus className="w-5 h-5" />
                    </div>
                    <span className="text-zinc-500 font-black uppercase tracking-widest text-[10px] group-hover:text-white">Create New Task</span>
                  </button>
                )}

                {tasks.map(task => (
                  <div key={task.id} className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2.5rem] space-y-4 text-left">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h4 className="text-white font-black italic uppercase text-sm tracking-tight">{task.title}</h4>
                        {task.assignedTo && (
                          <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            Assigned to: {hosts.find(h => h.id === task.assignedTo)?.name}
                          </p>
                        )}
                      </div>
                      <span className="text-amber-400 text-[10px] font-black uppercase bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
                        {task.rewardType === 'usd' ? '$' : ''}{task.reward.toLocaleString()} {task.rewardType === 'coins' ? 'COINS' : 'USD'}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-[9px] font-black uppercase text-zinc-500 tracking-widest">
                        <span>Progress</span>
                        <span>{task.progress}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${task.progress}%` }}
                          className="h-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-zinc-500">
                        <ClipboardList className="w-3 h-3" />
                        <span className="text-[8px] font-bold uppercase tracking-widest">Ends in {task.deadline}</span>
                      </div>
                      {userRole === 'host' && task.status === 'available' && (
                        <button 
                          onClick={() => startTask(task.id)}
                          className="bg-amber-400 text-black text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-xl hover:bg-amber-300 transition-all"
                        >
                          Start Task
                        </button>
                      )}
                      {userRole === 'host' && task.status === 'in-progress' && task.progress < 100 && (
                        <button className="text-amber-400 text-[10px] font-black uppercase tracking-widest hover:underline">
                          Resume
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'earnings' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Income Reports</h3>
              <div className="flex gap-2">
                <button 
                  onClick={() => setEarningsSort({ field: 'amount', order: earningsSort.order === 'desc' ? 'asc' : 'desc' })}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all",
                    earningsSort.field === 'amount' ? "bg-amber-400 text-black" : "bg-zinc-800 text-zinc-500"
                  )}
                >
                  Amount {earningsSort.field === 'amount' && (earningsSort.order === 'desc' ? '↓' : '↑')}
                </button>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800">
                      <th className="p-5 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Host</th>
                      <th className="p-5 text-[9px] font-black text-zinc-500 uppercase tracking-widest">Source</th>
                      <th 
                        className="p-5 text-[9px] font-black text-zinc-500 uppercase tracking-widest text-right cursor-pointer hover:text-white transition-colors"
                        onClick={() => setEarningsSort({ field: 'amount', order: earningsSort.field === 'amount' && earningsSort.order === 'desc' ? 'asc' : 'desc' })}
                      >
                        Amount {earningsSort.field === 'amount' && (earningsSort.order === 'desc' ? '↓' : '↑')}
                      </th>
                      <th 
                        className="p-5 text-[9px] font-black text-zinc-500 uppercase tracking-widest text-right cursor-pointer hover:text-white transition-colors"
                        onClick={() => setEarningsSort({ field: 'date', order: earningsSort.field === 'date' && earningsSort.order === 'desc' ? 'asc' : 'desc' })}
                      >
                        Date {earningsSort.field === 'date' && (earningsSort.order === 'desc' ? '↓' : '↑')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800">
                    {[
                      { id: '1', hostName: 'Zekarias', source: 'gift', amount: 5000, date: new Date('2024-03-15') },
                      { id: '2', hostName: 'Hana_T', source: 'entry_fee', amount: 1200, date: new Date('2024-03-16') },
                      { id: '3', hostName: 'Zekarias', source: 'gift', amount: 3500, date: new Date('2024-03-14') },
                      { id: '4', hostName: 'Abebe_Protocol', source: 'gift', amount: 8000, date: new Date('2024-03-17') },
                    ].sort((a, b) => {
                      const factor = earningsSort.order === 'desc' ? -1 : 1;
                      if (earningsSort.field === 'date') return (a.date.getTime() - b.date.getTime()) * factor;
                      return (a.amount - b.amount) * factor;
                    }).filter(e => userRole === 'agent' || e.hostName === hostProfile.displayName).map((record) => (
                      <tr key={record.id} className="hover:bg-white/5 transition-colors group">
                        <td className="p-5">
                          <div className="flex items-center gap-3">
                            <div className="w-6 h-6 rounded-lg bg-zinc-800 flex items-center justify-center text-[8px] font-black text-zinc-500">
                              {record.hostName[0]}
                            </div>
                            <span className="text-white text-xs font-bold uppercase">{record.hostName}</span>
                          </div>
                        </td>
                        <td className="p-5">
                          <span className={cn(
                            "text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter",
                            record.source === 'gift' ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          )}>
                            {record.source}
                          </span>
                        </td>
                        <td className="p-5 text-right font-black text-amber-400 text-xs">
                          +{record.amount.toLocaleString()}
                        </td>
                        <td className="p-5 text-right text-zinc-600 text-[10px] font-bold">
                          {record.date.toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'stats' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Growth Overview */}
            <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[3rem] space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-black text-white italic uppercase tracking-tighter">Growth Analytics</h3>
                  <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest mt-1">Last 30 Days Performance</p>
                </div>
                <div className="bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/20">
                  <span className="text-green-500 text-[10px] font-black">+24.5%</span>
                </div>
              </div>

              {/* Simple Chart Simulation */}
              <div className="h-32 flex items-end justify-between gap-2 px-2">
                {[40, 65, 45, 80, 55, 90, 75, 95, 60, 85].map((h, i) => (
                  <motion.div 
                    key={i}
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: i * 0.05 }}
                    className={cn(
                      "w-full rounded-t-lg transition-colors",
                      i === 9 ? "bg-amber-400" : "bg-zinc-800 group-hover:bg-zinc-700"
                    )}
                  />
                ))}
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-zinc-800">
                <div className="text-center">
                  <p className="text-zinc-500 text-[8px] font-black uppercase tracking-widest mb-1">Retention</p>
                  <p className="text-white font-black text-sm">92%</p>
                </div>
                <div className="text-center">
                  <p className="text-zinc-500 text-[8px] font-black uppercase tracking-widest mb-1">Conversion</p>
                  <p className="text-white font-black text-sm">18%</p>
                </div>
                <div className="text-center">
                  <p className="text-zinc-500 text-[8px] font-black uppercase tracking-widest mb-1">Avg Earn</p>
                  <p className="text-white font-black text-sm">$420</p>
                </div>
              </div>
            </div>

            {/* Top Performers */}
            <div className="space-y-4">
              <h4 className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] ml-2">Top Performers</h4>
              <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 divide-y divide-zinc-800">
                {hosts.sort((a, b) => b.performance - a.performance).map((host, i) => (
                  <div key={host.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-zinc-700 font-black italic text-xl w-6">#{i+1}</span>
                      <div>
                        <p className="text-white font-bold uppercase text-xs">{host.name}</p>
                        <p className="text-zinc-600 text-[8px] font-bold uppercase tracking-widest">Master Host</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-amber-400 font-black text-xs">{host.performance}%</p>
                      <p className="text-zinc-600 text-[7px] font-black uppercase tracking-widest">Efficiency</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'network' && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <NetworkQualityDashboard />
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={() => setUserRole('none')}
        className="text-[9px] font-black text-zinc-600 uppercase tracking-widest hover:text-zinc-400 transition-all flex items-center gap-2 mx-auto mt-10"
      >
        <X className="w-3 h-3" />
        Log out of Agency
      </button>

      {/* Profile Edit Modal */}
      <AnimatePresence>
        {showProfileEdit && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[200] flex items-center justify-center p-6"
            onClick={() => setShowProfileEdit(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="bg-zinc-950 border border-zinc-900 w-full max-w-sm rounded-[3rem] overflow-hidden shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-10 space-y-8">
                <div className="text-center space-y-4">
                  <div className="relative inline-block">
                    <div className="w-20 h-20 bg-blue-400/20 rounded-[2rem] flex items-center justify-center mx-auto mb-2 overflow-hidden border border-blue-400/30">
                      {userRole === 'host' ? (
                        <img src={hostProfile.photoURL} alt="Avatar" className="w-full h-full object-cover" />
                      ) : (
                        <ShieldCheck className="w-10 h-10 text-blue-400" />
                      )}
                    </div>
                    {userRole === 'host' && (
                      <button className="absolute -bottom-1 -right-1 bg-zinc-900 border border-zinc-800 p-1.5 rounded-lg text-amber-400 shadow-xl">
                        <Camera className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">
                    {userRole === 'host' ? 'Host Identity' : 'Agency Profile'}
                  </h3>
                  <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest italic">Management of your identity</p>
                </div>

                <div className="space-y-4">
                  {userRole === 'host' ? (
                    <>
                      <div className="space-y-2">
                        <label className="text-zinc-500 text-[10px] font-black uppercase ml-1">Username</label>
                        <input 
                          type="text" 
                          value={hostProfile.displayName}
                          onChange={(e) => setHostProfile({...hostProfile, displayName: e.target.value})}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-xs font-bold focus:border-blue-400 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-zinc-500 text-[10px] font-black uppercase ml-1">Profile Photo URL</label>
                        <input 
                          type="text" 
                          value={hostProfile.photoURL}
                          onChange={(e) => setHostProfile({...hostProfile, photoURL: e.target.value})}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-xs font-bold focus:border-blue-400 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-zinc-500 text-[10px] font-black uppercase ml-1">Bio</label>
                        <textarea 
                          value={hostProfile.bio}
                          onChange={(e) => setHostProfile({...hostProfile, bio: e.target.value})}
                          rows={3}
                          placeholder="Tell your fans about yourself..."
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-xs font-bold focus:border-blue-400 outline-none transition-all resize-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-zinc-500 text-[10px] font-black uppercase ml-1">Content Category</label>
                        <select 
                          value={hostProfile.category}
                          onChange={(e) => setHostProfile({...hostProfile, category: e.target.value})}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-xs font-bold focus:border-blue-400 outline-none transition-all appearance-none"
                        >
                          <option>Music</option>
                          <option>Gaming</option>
                          <option>Comedy</option>
                          <option>Social</option>
                          <option>Entertainment</option>
                        </select>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <label className="text-zinc-500 text-[10px] font-black uppercase ml-1">Agency Name</label>
                        <input 
                          type="text" 
                          value={agencyInfo.name}
                          onChange={(e) => setAgencyInfo({...agencyInfo, name: e.target.value})}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-xs font-bold focus:border-blue-400 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-zinc-500 text-[10px] font-black uppercase ml-1">Agency Description</label>
                        <textarea 
                          value={agencyInfo.description}
                          onChange={(e) => setAgencyInfo({...agencyInfo, description: e.target.value})}
                          rows={3}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-xs font-bold focus:border-blue-400 outline-none transition-all resize-none"
                        />
                      </div>
                    </>
                  )}
                </div>

                <button 
                  onClick={userRole === 'host' ? saveProfile : () => setShowProfileEdit(false)}
                  className="w-full bg-blue-400 text-black font-black py-4 rounded-xl uppercase tracking-widest text-[9px] active:scale-95 transition-all shadow-xl shadow-blue-400/20"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Create Task Modal */}
      <AnimatePresence>
        {showTaskModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[200] flex items-center justify-center p-6"
            onClick={() => setShowTaskModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-zinc-900 w-full max-w-sm rounded-[3rem] overflow-hidden shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-10 space-y-8">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-amber-400/20 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                    <ClipboardList className="w-10 h-10 text-amber-400" />
                  </div>
                  <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Assign Task</h3>
                  <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest italic">Drive performance with clear goals</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-zinc-500 text-[10px] font-black uppercase ml-1">Task Title</label>
                    <input 
                      type="text" 
                      placeholder="e.g., Reach 1M Diamonds"
                      value={newTask.title}
                      onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-xs font-bold focus:border-amber-400 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-zinc-500 text-[10px] font-black uppercase">Task Reward</label>
                      <div className="flex bg-zinc-900 rounded-lg p-0.5 border border-zinc-800">
                        <button 
                          onClick={() => setNewTask({...newTask, rewardType: 'coins'})}
                          className={cn(
                            "px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all",
                            newTask.rewardType === 'coins' ? "bg-amber-400 text-black" : "text-zinc-500 hover:text-white"
                          )}
                        >
                          Coins
                        </button>
                        <button 
                          onClick={() => setNewTask({...newTask, rewardType: 'usd'})}
                          className={cn(
                            "px-3 py-1 rounded-md text-[8px] font-black uppercase tracking-widest transition-all",
                            newTask.rewardType === 'usd' ? "bg-amber-400 text-black" : "text-zinc-500 hover:text-white"
                          )}
                        >
                          USD
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <input 
                          type="number" 
                          value={newTask.reward}
                          onChange={(e) => setNewTask({...newTask, reward: parseInt(e.target.value) || 0})}
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-4 text-white text-xs font-bold focus:border-amber-400 outline-none transition-all pl-10"
                        />
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-400">
                           {newTask.rewardType === 'usd' ? <span className="text-xs font-black">$</span> : <Sparkles className="w-4 h-4" />}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {[500, 1000, 5000, 10000].map(amt => (
                        <button
                          key={amt}
                          onClick={() => setNewTask({...newTask, reward: amt})}
                          className={cn(
                            "flex-1 py-2 rounded-lg border text-[9px] font-black uppercase tracking-tighter transition-all",
                            newTask.reward === amt ? "bg-amber-400/10 border-amber-400/50 text-amber-400" : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700"
                          )}
                        >
                          {newTask.rewardType === 'usd' ? '$' : ''}{amt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-zinc-500 text-[10px] font-black uppercase ml-1">Deadline</label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {['3 days', '7 days', '30 days'].map(d => (
                        <button
                          type="button"
                          key={d}
                          onClick={() => {
                            setNewTask({...newTask, deadline: d});
                            setCustomDeadlineDate('');
                            setDeadlineError('');
                          }}
                          className={cn(
                            "py-3 rounded-xl border text-[9px] font-black uppercase tracking-tighter transition-all",
                            newTask.deadline === d ? "bg-zinc-800 border-zinc-700 text-white" : "bg-zinc-950 border-zinc-900 text-zinc-600 hover:border-zinc-800"
                          )}
                        >
                          {d}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => {
                          setNewTask({...newTask, deadline: 'custom'});
                          const tomorrow = new Date();
                          tomorrow.setDate(tomorrow.getDate() + 1);
                          const dateStr = tomorrow.toISOString().split('T')[0];
                          setCustomDeadlineDate(dateStr);
                          setDeadlineError('');
                        }}
                        className={cn(
                          "py-3 rounded-xl border text-[9px] font-black uppercase tracking-tighter transition-all",
                          newTask.deadline === 'custom' ? "bg-zinc-800 border-zinc-700 text-white" : "bg-zinc-950 border-zinc-900 text-zinc-600 hover:border-zinc-800"
                        )}
                      >
                        Custom
                      </button>
                    </div>

                    {newTask.deadline === 'custom' && (
                      <div className="mt-2 space-y-1">
                        <DatePicker
                          value={customDeadlineDate}
                          onChange={(val) => {
                            setCustomDeadlineDate(val);
                            validateDeadlineDate(val);
                          }}
                          error={deadlineError}
                        />
                        {deadlineError ? (
                          <p className="text-red-500 text-[9px] font-bold uppercase tracking-wider pl-1 font-mono">{deadlineError}</p>
                        ) : (
                          <p className="text-zinc-500 text-[8px] font-medium uppercase tracking-wider pl-1">Specify a valid active future target date</p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-zinc-500 text-[10px] font-black uppercase ml-1">Assign to (Optional)</label>
                    <select 
                      value={newTask.assignedTo}
                      onChange={(e) => setNewTask({...newTask, assignedTo: e.target.value})}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-xs font-bold focus:border-amber-400 outline-none transition-all appearance-none"
                    >
                      <option value="">Public Task</option>
                      {hosts.map(h => (
                        <option key={h.id} value={h.id}>{h.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button 
                  onClick={handleCreateTask}
                  className="w-full bg-amber-400 text-black font-black py-4 rounded-xl uppercase tracking-widest text-[9px] active:scale-95 transition-all"
                >
                  Publish Task
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Verification Modal */}
      <AnimatePresence>
        {showVerificationModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[200] flex items-center justify-center p-6"
            onClick={() => setShowVerificationModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-zinc-900 w-full max-w-sm rounded-[3rem] overflow-hidden shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-10 space-y-8">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-blue-400/20 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="w-10 h-10 text-blue-400" />
                  </div>
                  <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Host Verification</h3>
                  <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest italic text-center">Get the blue checkmark & unlock exclusive task rewards</p>
                </div>

                {verificationStatus === 'none' ? (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-zinc-500 text-[10px] font-black uppercase ml-1">Official Name (on ID)</label>
                        <input 
                          type="text" 
                          placeholder="Full Name"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-xs font-bold focus:border-blue-400 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-zinc-500 text-[10px] font-black uppercase ml-1">Social Media Handle</label>
                        <input 
                          type="text" 
                          placeholder="@instagram_handle"
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white text-xs font-bold focus:border-blue-400 outline-none transition-all"
                        />
                      </div>
                      <div className="border-2 border-dashed border-zinc-800 rounded-2xl p-8 text-center space-y-2 hover:border-zinc-700 transition-all cursor-pointer">
                        <Plus className="w-6 h-6 text-zinc-600 mx-auto" />
                        <p className="text-[10px] font-black text-zinc-500 uppercase">Upload ID / Passport</p>
                      </div>
                    </div>
                    <button 
                      onClick={submitVerification}
                      className="w-full bg-blue-400 text-black font-black py-4 rounded-xl uppercase tracking-widest text-[9px] active:scale-95 transition-all shadow-xl shadow-blue-400/20"
                    >
                      Submit for Review
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-6 space-y-4">
                    <p className="text-zinc-400 text-xs font-medium">Your request is currently under review by the Barca Compliance Team.</p>
                    <button 
                      onClick={() => setShowVerificationModal(false)}
                      className="text-white text-[10px] font-black uppercase hover:underline"
                    >
                      Close Window
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Invite Modal (Only for Agents) */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[200] flex items-center justify-center p-6"
            onClick={() => setShowInviteModal(false)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-zinc-950 border border-zinc-900 w-full max-w-sm rounded-[3rem] overflow-hidden shadow-2xl relative"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-10 space-y-8">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-amber-400/20 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                    <QrCode className="w-10 h-10 text-amber-400" />
                  </div>
                  <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Invite New Host</h3>
                  <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest italic">Share this code or link with your recruits</p>
                </div>

                <div className="space-y-4">
                  <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl text-center relative">
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText("BARCA-ZARA");
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="absolute top-3 right-3 bg-zinc-800 p-2 rounded-lg text-zinc-400 hover:text-white transition-colors"
                      title="Copy Code"
                    >
                      {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <ClipboardList className="w-4 h-4" />}
                    </button>
                    <p className="text-amber-400 text-3xl font-black tracking-[0.2em] italic uppercase mt-2">BARCA-ZARA</p>
                    <p className="text-zinc-600 text-[8px] font-bold uppercase mt-2">Agent ID: Ethiopia-001</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <button className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col items-center gap-2 hover:bg-zinc-800/80 transition-all group">
                      <Share2 className="w-5 h-5 text-zinc-500 group-hover:text-amber-400" />
                      <span className="text-[8px] font-black text-zinc-600 uppercase group-hover:text-amber-400">Link</span>
                    </button>
                    <button className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex flex-col items-center gap-2 hover:bg-zinc-800/80 transition-all group">
                      <QrCode className="w-5 h-5 text-zinc-500 group-hover:text-amber-400" />
                      <span className="text-[8px] font-black text-zinc-600 uppercase group-hover:text-amber-400">QR Scan</span>
                    </button>
                  </div>
                </div>

                <button 
                  onClick={() => setShowInviteModal(false)}
                  className="w-full bg-zinc-900 text-zinc-400 font-black py-4 rounded-xl uppercase tracking-widest text-[9px] hover:text-white transition-colors"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
