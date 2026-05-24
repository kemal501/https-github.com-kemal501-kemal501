import React from 'react';
import { 
  Smartphone, Play, Plus, Coins, Download, Globe, FileCode, Settings, 
  Activity, Sparkles, Send, Database, Copy, CheckCircle2, Video, 
  Music, Menu, Mic, MicOff, Volume2, Shield, Heart, Trophy, UserCheck, 
  ArrowLeft, RefreshCw, SmartphoneIcon, CreditCard, Key, Languages
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Pre-defined static file view references matching what we created in physical workspace
const ANDROID_SOURCE_FILES = [
  {
    name: 'AndroidManifest.xml',
    path: 'app/src/main/AndroidManifest.xml',
    language: 'xml',
    code: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.barcalive.app">

    <!-- Permissions for Real Voice, Audio, and Verification Features -->
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" android:maxSdkVersion="32" />
    <uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
    <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />

    <application
        android:name=".BarcaLiveApp"
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="BarcaLive"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.Material3.DayNight.NoActionBar">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:theme="@style/Theme.Material3.DayNight.NoActionBar">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

    </application>

</manifest>`
  },
  {
    name: 'MainActivity.kt',
    path: 'app/src/main/java/com/barcalive/app/MainActivity.kt',
    language: 'kotlin',
    code: `package com.barcalive.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.barcalive.app.navigation.NavGraph
import com.barcalive.app.ui.theme.BarcaLiveTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            BarcaLiveTheme {
                NavGraph()
            }
        }
    }
}`
  },
  {
    name: 'AppDatabase.kt',
    path: 'app/src/main/java/com/barcalive/app/data/local/AppDatabase.kt',
    language: 'kotlin',
    code: `package com.barcalive.app.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import com.barcalive.app.data.model.*

@Database(
    entities = [
        User::class,
        Agent::class,
        Host::class,
        DailyTask::class,
        CoinTransaction::class,
        RoomActivity::class,
        Gift::class
    ],
    version = 1,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    
    abstract fun userDao(): UserDao
    abstract fun agentDao(): AgentDao
    abstract fun hostDao(): HostDao
    abstract fun taskDao(): TaskDao
    abstract fun earningDao(): EarningDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "barcalive_database"
                )
                .fallbackToDestructiveMigration()
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}`
  },
  {
    name: 'BarcaViewModel.kt',
    path: 'app/src/main/java/com/barcalive/app/viewmodel/BarcaViewModel.kt',
    language: 'kotlin',
    code: `package com.barcalive.app.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.barcalive.app.data.local.AppDatabase
import com.barcalive.app.data.model.*
import com.barcalive.app.data.repository.BarcaRepository
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

class BarcaViewModel(application: Application) : AndroidViewModel(application) {
    private val repository: BarcaRepository
    val agents: StateFlow<List<Agent>>
    val hosts: StateFlow<List<Host>>
    val tasks: StateFlow<List<DailyTask>>
    val transactions: StateFlow<List<CoinTransaction>>

    private val _currentUser = MutableStateFlow<User?>(null)
    val currentUser: StateFlow<User?> = _currentUser.asStateFlow()

    init {
        val database = AppDatabase.getDatabase(application)
        repository = BarcaRepository(
            userDao = database.userDao(),
            agentDao = database.agentDao(),
            hostDao = database.hostDao(),
            taskDao = database.taskDao(),
            earningDao = database.earningDao()
        )
        agents = repository.getAllAgents().stateIn(viewModelScope, SharingStarted.Lazily, emptyList())
        hosts = repository.getAllHosts().stateIn(viewModelScope, SharingStarted.Lazily, emptyList())
        tasks = repository.getAllTasks().stateIn(viewModelScope, SharingStarted.Lazily, emptyList())
        transactions = repository.getAllTransactions().stateIn(viewModelScope, SharingStarted.Lazily, emptyList())
    }

    fun loginLocally(username: String, pword: String, onFinished: (Boolean) -> Unit) {
        viewModelScope.launch {
            val matchedUser = repository.getUserByUsername(username)
            if (matchedUser != null && matchedUser.password == pword) {
                _currentUser.value = matchedUser
                onFinished(true)
            } else {
                val newUser = User(userCode = (100000..999999).random().toString(), username = username, password = pword, coins = 20000)
                repository.insertUser(newUser)
                _currentUser.value = newUser
                onFinished(true)
            }
        }
    }
}`
  },
  {
    name: 'VoiceRoomScreen.kt',
    path: 'app/src/main/java/com/barcalive/app/ui/screens/VoiceRoomScreen.kt',
    language: 'kotlin',
    code: `package com.barcalive.app.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import coil.compose.rememberAsyncImagePainter
import com.barcalive.app.viewmodel.BarcaViewModel

@Composable
fun VoiceRoomScreen(viewModel: BarcaViewModel = viewModel()) {
    val user by viewModel.currentUser.collectAsState()
    val messages = remember { mutableStateListOf("Welcome to BarcaLive!") }
    
    Box(modifier = Modifier.fillMaxSize()) {
        Image(painter = rememberAsyncImagePainter("bg_url"), contentDescription = null, modifier = Modifier.fillMaxSize())
        Column(modifier = Modifier.fillMaxSize().background(Color.Black.copy(alpha = 0.5f)).padding(16.dp)) {
            // Header, Mic grid (3x3 setup), gift sending, mute controllers
            LazyVerticalGrid(columns = GridCells.Fixed(3)) {
                items(9) { index ->
                    Box(modifier = Modifier.size(80.dp).clip(CircleShape).background(Color.Gray))
                }
            }
        }
    }
}`
  }
];

const GIFT_ITEMS = [
  { id: 'rose', name: 'Rose', icon: '🌹', cost: 10, animColor: 'text-rose-500' },
  { id: 'heart', name: 'Heart', icon: '💖', cost: 50, animColor: 'text-pink-500' },
  { id: 'ring', name: 'Diamond Ring', icon: '💎', cost: 500, animColor: 'text-blue-400' },
  { id: 'car', name: 'Sports Car', icon: '🚗', cost: 1000, animColor: 'text-red-500' },
  { id: 'crown', name: 'Crown', icon: '👑', cost: 2500, animColor: 'text-amber-400' },
  { id: 'yacht', name: 'Luxury Yacht', icon: '🛳️', cost: 5000, animColor: 'text-cyan-400' },
  { id: 'lion', name: 'Lion', icon: '🦁', cost: 8000, animColor: 'text-orange-500' },
  { id: 'castle', name: 'Castle', icon: '🏰', cost: 12000, animColor: 'text-yellow-600' },
  { id: 'rocket', name: 'Rocket', icon: '🚀', cost: 15000, animColor: 'text-indigo-400' },
  { id: 'trophy', name: 'Golden Trophy', icon: '🏆', cost: 20000, animColor: 'text-yellow-400' },
];

const LOCALIZED_TEXTS: Record<string, Record<string, string>> = {
  English: {
    welcome: "Welcome to BarcaLive",
    tagline: "Live Social Hub & Voice Lounge",
    joinBtn: "Login / Register Offline",
    usernamePl: "Enter Username",
    passwordPl: "Enter Password",
    loggedAs: "Logged in as",
    coins: "Coins",
    dashboard: "BarcaLive Dashboard",
    openRoom: "Join Voice Lounge",
    settings: "App Settings & Translations",
    faceVerify: "Onboarding Face Verification",
    claimReward: "Claim 20,000 Coins Welcome Reward",
    kycStatus: "KYC VERIFIED",
    agents: "Offline Agents Manager",
    hosts: "Recruited Hosts",
    tasks: "Daily Tasks Tracker",
    earnings: "Earnings Simulator",
    rules: "Lounge Rules: Respect speakers, no abusive language.",
    backupSync: "JSON Local Database Exporter"
  },
  Amharic: {
    welcome: "ወደ ባርሳላይቭ እንኳን ደህና መጡ",
    tagline: "የቀጥታ ድምፅ ማህበራዊ አውታረ መረብ",
    joinBtn: "በአይነት ይግቡ / ይመዝገቡ",
    usernamePl: "የተጠቃሚ ስም",
    passwordPl: "የይለፍ ቃል",
    loggedAs: "በዚህ ስም ገብተዋል",
    coins: "ሳንቲሞች",
    dashboard: "የባርሳላይቭ ዳሽቦርድ",
    openRoom: "የድምፅ ክፍልን ክፈት",
    settings: "የመተግበሪያ ቅንጅቶች",
    faceVerify: "የፊት ማረጋገጫ",
    claimReward: "የ20,000 ሳንቲም ስጦታዎን ይቀበሉ",
    kycStatus: "የጸደቀ KYC",
    agents: "የወኪሎች አስተዳደሪ",
    hosts: "የተመዘገቡ አስተናጋጆች",
    tasks: "የእለት ተግባራት",
    earnings: "የገቢዎች ማስመሰያ",
    rules: "የክፍል ደንቦች: እባክዎን አባላትን ያክብሩ።",
    backupSync: "የውሂብ ጎታ በ JSON መላክ"
  },
  Arabic: {
    welcome: "مرحباً بك في بارسا لايف",
    tagline: "صالون غرف الصوت لوسائل التواصل الاجتماعى",
    joinBtn: "تسجيل الدخول / مستخدم جديد",
    usernamePl: "اسم المستخدم",
    passwordPl: "كلمة المرور",
    loggedAs: "متصل باسم",
    coins: "عملات ذهبية",
    dashboard: "لوحة تحكم بارسا لايف",
    openRoom: "دخول غرف الصوت",
    settings: "الاعدادات واللغات",
    faceVerify: "التحقق من الوجه",
    claimReward: "احصل على هدايا ترحيبية 20,000 عملة",
    kycStatus: "تم التحقق الكامل",
    agents: "ادارة الوكلاء",
    hosts: "ارباح المضيفين والمعلنين",
    tasks: "المهام اليومية والمكافآت",
    earnings: "محاكي السحب والتحويلات",
    rules: "قواعد الغرفة: يرجى احترام جميع المتحدثين.",
    backupSync: "تصدير قاعدة البيانات بصيغة JSON"
  }
};

interface Particle {
  id: number;
  icon: string;
  x: number;
  y: number;
}

export default function AndroidAppHub() {
  const [activeFileIndex, setActiveFileIndex] = React.useState(0);
  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);

  // Phone Emulator States
  const [phoneScreen, setPhoneScreen] = React.useState<'splash' | 'login' | 'home' | 'room' | 'settings'>('splash');
  const [appLanguage, setAppLanguage] = React.useState<string>('English');
  const [userName, setUserName] = React.useState<string>('');
  const [userPassword, setUserPassword] = React.useState<string>('');
  const [loggedInUser, setLoggedInUser] = React.useState<any>(null);
  const [userCoins, setUserCoins] = React.useState<number>(1000); // starts with matching welcome levels

  // Micro Seat States (true = active user on mic)
  const [seats, setSeats] = React.useState<boolean[]>([true, false, false, false, false, false, false, false, false]);
  const [micActive, setMicActive] = React.useState<boolean>(false);
  const [micStateError, setMicStateError] = React.useState<string | null>(null);
  const [audioStream, setAudioStream] = React.useState<MediaStream | null>(null);
  const [bounceValue, setBounceValue] = React.useState<number>(15);

  // Gifting effect state
  const [giftParticles, setGiftParticles] = React.useState<Particle[]>([]);
  const [loungeMessages, setLoungeMessages] = React.useState<string[]>([
    "🔥 Welcome to BarcaLive social room",
    "🎤 Room live stream session established"
  ]);
  const [customMsg, setCustomMsg] = React.useState<string>('');

  // Agents & Recruits database simulation
  const [simulatedAgents, setSimulatedAgents] = React.useState<any[]>([
    { code: '4821', name: 'Abebe Agency Helper', recruits: 14, earnings: 1757.0 },
    { code: '7734', name: 'Sara Golden Recruiting', recruits: 8, earnings: 1004.0 },
    { code: '1208', name: 'Khalid Agency Admin', recruits: 22, earnings: 2761.0 }
  ]);
  const [newAgentName, setNewAgentName] = React.useState<string>('');

  // Local Daily task claims state
  const [kycPassed, setKycPassed] = React.useState<boolean>(false);
  const [isVerifyingFace, setIsVerifyingFace] = React.useState<boolean>(false);
  const [roomCreatedFlag, setRoomCreatedFlag] = React.useState<boolean>(false);

  // Payment Sim options
  const [payoutOption, setPayoutOption] = React.useState<string>('Visa');
  const [rechargeAmt, setRechargeAmt] = React.useState<number>(500);

  // Sync state
  const [syncClipboardMsg, setSyncClipboardMsg] = React.useState<string>('');

  // Real-time voice frequency tracker for Mic feedback
  React.useEffect(() => {
    let animationId: number;
    let audioContext: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let dataArray: Uint8Array;

    if (micActive && audioStream) {
      try {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(audioStream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 64;
        source.connect(analyser);
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        const updateBounce = () => {
          if (analyser) {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            setBounceValue(Math.max(10, Math.min(100, Math.floor(average * 1.5))));
          }
          animationId = requestAnimationFrame(updateBounce);
        };
        updateBounce();
      } catch (err) {
        console.warn("Could not initiate frequencies analyser context", err);
      }
    } else {
      // Sim quiet bounce
      const interval = setInterval(() => {
        setBounceValue(Math.floor(10 + Math.random() * 15));
      }, 350);
      return () => clearInterval(interval);
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (audioContext) audioContext.close();
    };
  }, [micActive, audioStream]);

  // Request browser microphone
  const toggleMicrophone = async () => {
    if (micActive) {
      if (audioStream) {
        audioStream.getTracks().forEach(track => track.stop());
      }
      setAudioStream(null);
      setMicActive(false);
      setLoungeMessages(prev => [...prev, "🎤 Local microphone deactivated"]);
    } else {
      try {
        setMicStateError(null);
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setAudioStream(stream);
        setMicActive(true);
        setLoungeMessages(prev => [...prev, "🎤 Real microphone feed enabled - speaking live!"]);
      } catch (err: any) {
        console.error(err);
        setMicStateError("Permission denied click or verify settings");
        // fallback simulated microphone
        setMicActive(true);
        setLoungeMessages(prev => [...prev, "🎤 Simulated mic enabled (Browser permission blocked)"]);
      }
    }
  };

  const copyCode = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => {
      setCopiedIndex(null);
    }, 2000);
  };

  // Simulated login/register generates 6-digit user numbers
  const handleSimulatedLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return;

    const autoCode = Math.floor(100000 + Math.random() * 900000).toString();
    const newUser = {
      userCode: autoCode,
      username: userName,
      password: userPassword || 'pword123',
    };
    setLoggedInUser(newUser);
    setUserCoins(20000); // starts with user rewards welcome bundle 
    setPhoneScreen('home');
  };

  const handleSimulatedLogout = () => {
    setLoggedInUser(null);
    setUserName('');
    setUserPassword('');
    setPhoneScreen('splash');
  };

  // Face KYC reward system
  const triggerVerifyFace = () => {
    setIsVerifyingFace(true);
    setTimeout(() => {
      setIsVerifyingFace(false);
      setKycPassed(true);
      setUserCoins(prev => prev + 20000);
      setLoungeMessages(prev => [...prev, "📸 KYC Onboarding Face Verify passed! Reward 20K Claimed"]);
    }, 2000);
  };

  // Gift sender engine triggering canvas particles
  const triggerGift = (gift: typeof GIFT_ITEMS[0]) => {
    if (userCoins < gift.cost) {
      alert("Insufficient simulated Coins! Please recharge in the panel.");
      return;
    }

    setUserCoins(prev => prev - gift.cost);
    setLoungeMessages(prev => [...prev, `🎁 Sent ${gift.name} (${gift.cost} coins) to Host!`]);

    // Spawn 5 floating gift particles
    const newParticles = Array.from({ length: 4 }).map(() => ({
      id: Math.random(),
      icon: gift.icon,
      x: 10 + Math.random() * 80, // percentage x-axis
      y: 90, // starts at bottom
    }));

    setGiftParticles(prev => [...prev, ...newParticles]);

    // Animate item offsets upwards
    setTimeout(() => {
      setGiftParticles(prev => prev.filter(p => !newParticles.includes(p)));
    }, 1200);
  };

  // Send Custom text message
  const broadcastMsg = () => {
    if (!customMsg.trim()) return;
    setLoungeMessages(prev => [...prev, `🗨️ ${loggedInUser?.username || 'Guest'}: ${customMsg}`]);
    setCustomMsg('');
  };

  // Add agent with automatic 4-digit code
  const registerAgentLocally = () => {
    if (!newAgentName.trim()) return;
    const generatedAgentCode = Math.floor(1000 + Math.random() * 9000).toString();
    const newAgent = {
      code: generatedAgentCode,
      name: newAgentName,
      recruits: 0,
      earnings: 0.0
    };
    setSimulatedAgents(prev => [newAgent, ...prev]);
    setNewAgentName('');
  };

  // Get localized string key values
  const textVal = (key: string) => {
    const lang = appLanguage in LOCALIZED_TEXTS ? appLanguage : 'English';
    return LOCALIZED_TEXTS[lang][key] || LOCALIZED_TEXTS['English'][key] || '';
  };

  // Full SQLite database payload exporter
  const getDatabaseExportJson = () => {
    return JSON.stringify({
      schema: { version: 1, type: "SQLite Room" },
      users: loggedInUser ? [{ id: 1, userCode: loggedInUser.userCode, username: loggedInUser.username, coins: userCoins, isVerified: kycPassed }] : [],
      agents: simulatedAgents,
      hosts: [
        { id: 1, username: "Abebe", roomName: "Night Vibes 🌙", coins: 8900 },
        { id: 2, username: "Sara", roomName: "Ethiopia Stars 🇪🇹", coins: 2100 }
      ],
      timestamp: Date.now()
    }, null, 2);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setSyncClipboardMsg("JSON Backup Copied!");
    setTimeout(() => setSyncClipboardMsg(""), 3000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 lg:p-12 space-y-12 animate-fade-in" id="android-hub-main">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-zinc-800 pb-8">
        <div>
          <span className="bg-amber-400/10 text-amber-400 border border-amber-400/20 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
            SDK & Native Center
          </span>
          <h1 className="text-4xl lg:text-5xl font-black uppercase tracking-tight text-white mt-3 italic">
            BarcaLive Native Android
          </h1>
          <p className="text-zinc-500 text-xs font-medium max-w-xl mt-1 uppercase tracking-wider">
            Secure local persistence, Jetpack Compose layouts, real audio modules, and multi-language support.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <a
            href="https://developer.android.com/studio"
            target="_blank"
            rel="noreferrer"
            className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-white text-xs font-black uppercase tracking-widest px-6 py-4 rounded-full transition-all inline-flex items-center gap-2"
          >
            <SmartphoneIcon className="w-4 h-4 text-emerald-400" />
            Open Android Studio
          </a>
        </div>
      </div>

      {/* Grid Layout containing Interactive Simulator and Live Kotlin Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        
        {/* column 1: smartphone frame simulator (lg:col-span-5) */}
        <div className="lg:col-span-12 xl:col-span-5 flex flex-col items-center justify-start space-y-4">
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
            Live Statefully Simulated Sandbox Screen
          </p>

          <div className="relative w-full max-w-[370px] bg-[#0c0c0e] border-[8px] border-zinc-800 rounded-[3rem] shadow-2xl overflow-hidden aspect-[9/19.5]">
            
            {/* Speaker & camera slot */}
            <div className="absolute top-0 inset-x-0 h-6 bg-black z-40 flex items-center justify-center">
              <div className="w-16 h-3.5 bg-zinc-900 rounded-b-xl border-x border-b border-zinc-800"></div>
            </div>

            {/* Simulated Android Status Bar */}
            <div className="absolute top-6 inset-x-0 h-6 px-6 bg-black flex justify-between items-center z-30 text-[9px] uppercase tracking-wider text-zinc-500 font-mono">
              <span>barcalive 5G</span>
              <div className="flex items-center gap-1.5">
                <Globe className="w-2.5 h-2.5 text-amber-500" />
                <span>94%</span>
              </div>
            </div>

            {/* Inner Phone Content Area */}
            <div className="w-full h-full pt-12 pb-4 bg-zinc-900 flex flex-col relative text-zinc-300">
              
              <AnimatePresence mode="wait">
                {/* 1. PASS SPLASH SCREEN */}
                {phoneScreen === 'splash' && (
                  <motion.div 
                    key="splash"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex-1 flex flex-col items-center justify-center bg-black p-6 text-center space-y-6"
                  >
                    <div className="w-20 h-20 rounded-[2rem] bg-indigo-500/10 border border-amber-400/20 flex items-center justify-center shadow-lg animate-pulse">
                      <Trophy className="w-10 h-10 text-amber-400" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black tracking-tight text-white uppercase italic">BarcaLive</h2>
                      <p className="text-amber-400 text-[10px] font-mono font-bold uppercase tracking-widest mt-1">
                        {textVal('tagline')}
                      </p>
                    </div>

                    <p className="text-zinc-600 text-[9px] font-mono uppercase">
                      Room Database Initialized
                    </p>

                    <button 
                      onClick={() => setPhoneScreen('login')}
                      className="bg-amber-400 hover:bg-amber-500 text-zinc-950 text-[10px] font-black uppercase tracking-widest px-6 py-3 rounded-full transition-all"
                    >
                      {textVal('joinBtn')}
                    </button>
                  </motion.div>
                )}

                {/* 2. LOCAL LOGIN/OFFLINE REGISTER SCREEN */}
                {phoneScreen === 'login' && (
                  <motion.div 
                    key="login"
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex-1 flex flex-col justify-center p-6 space-y-6"
                  >
                    <div>
                      <h3 className="text-xl font-black text-amber-400 uppercase italic">Create Local Account</h3>
                      <p className="text-[10px] font-medium text-zinc-500 uppercase mt-1">This registers a Room Entity locally with 20K gift</p>
                    </div>

                    <form onSubmit={handleSimulatedLogin} className="space-y-4">
                      <div>
                        <label className="block text-[9px] font-mono uppercase text-zinc-500 mb-1">Username</label>
                        <input
                          type="text"
                          required
                          value={userName}
                          onChange={(e) => setUserName(e.target.value)}
                          placeholder={textVal('usernamePl')}
                          className="w-full bg-zinc-950 border border-zinc-800 text-xs p-3 rounded-xl focus:border-amber-400 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-mono uppercase text-zinc-500 mb-1">Pass Code</label>
                        <input
                          type="password"
                          required
                          value={userPassword}
                          onChange={(e) => setUserPassword(e.target.value)}
                          placeholder={textVal('passwordPl')}
                          className="w-full bg-zinc-950 border border-zinc-800 text-xs p-3 rounded-xl focus:border-amber-400 focus:outline-none"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-amber-400 text-zinc-950 font-black uppercase tracking-widest text-[10px] py-4 rounded-xl hover:bg-amber-500 transition-all active:scale-95"
                      >
                        Launch Applet (Offline-First)
                      </button>
                    </form>
                  </motion.div>
                )}

                {/* 3. HOME DASHBOARD SPLASH */}
                {phoneScreen === 'home' && (
                  <motion.div 
                    key="home"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex-1 flex flex-col p-5 overflow-y-auto space-y-6"
                  >
                    {/* Header bar */}
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                      <div>
                        <p className="text-[9px] uppercase tracking-wider text-zinc-500">{textVal('loggedAs')}</p>
                        <h4 className="text-white font-black uppercase text-xs italic">@{loggedInUser?.username}</h4>
                        <p className="text-[8px] font-mono text-zinc-500">ID: {loggedInUser?.userCode}</p>
                      </div>

                      <div className="bg-amber-400/10 border border-amber-400/20 text-amber-400 rounded-full px-3 py-1 font-black text-[10px] flex items-center gap-1">
                        <Coins className="w-3 h-3" />
                        {userCoins}
                      </div>
                    </div>

                    {/* Face Verification claim block */}
                    {!kycPassed ? (
                      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-2xl p-4 space-y-3">
                        <p className="text-zinc-300 text-[9px] font-black uppercase tracking-wider leading-relaxed">{textVal('faceVerify')}</p>
                        <button 
                          onClick={triggerVerifyFace}
                          disabled={isVerifyingFace}
                          className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 text-white text-[9px] font-black uppercase tracking-widest p-2.5 rounded-lg transition-all"
                        >
                          {isVerifyingFace ? "SCANNING FACE..." : "CLAIM WELCOME 20K GIFT"}
                        </button>
                      </div>
                    ) : (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-3 flex items-center justify-between">
                        <span className="text-emerald-400 text-[9px] font-black uppercase tracking-widest flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          {textVal('kycStatus')}
                        </span>
                        <span className="text-zinc-500 text-[8px] font-mono">Rewards claimed</span>
                      </div>
                    )}

                    {/* Navigation actions list */}
                    <div className="space-y-3">
                      <button 
                        onClick={() => setPhoneScreen('room')}
                        className="w-full bg-amber-400 hover:bg-amber-500 text-zinc-950 p-3 rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 shadow-md"
                      >
                        <Volume2 className="w-4 h-4 text-zinc-900" />
                        {textVal('openRoom')}
                      </button>

                      <button 
                        onClick={() => setPhoneScreen('settings')}
                        className="w-full bg-zinc-800 hover:bg-zinc-700 text-white p-3 rounded-2xl font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2 border border-zinc-700/50"
                      >
                        <Settings className="w-3.5 h-3.5" />
                        {textVal('settings')}
                      </button>
                    </div>

                    {/* Daily Tasks completion tracker */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{textVal('tasks')}</h4>
                      <div className="space-y-1.5 font-sans">
                        <div className="flex bg-zinc-950/70 p-2.5 rounded-xl justify-between items-center border border-zinc-800">
                          <span className="text-[10px]">Verify Face 📸</span>
                          <span className={kycPassed ? "text-emerald-400 font-bold text-[9px]" : "text-amber-500 text-[9px]"}>{kycPassed ? "+20K claimed" : "Pending (-)"}</span>
                        </div>
                        <div className="flex bg-zinc-950/70 p-2.5 rounded-xl justify-between items-center border border-zinc-800">
                          <span className="text-[10px]">Occupy Mic Seat 🎙️</span>
                          <span className={micActive ? "text-emerald-400 font-bold text-[9px]" : "text-amber-500 text-[9px]"}>{micActive ? "+6K claimed" : "Pending (-)"}</span>
                        </div>
                      </div>
                    </div>

                    {/* Agent manager setup drawer content */}
                    <div className="space-y-3 border-t border-zinc-800 pt-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{textVal('agents')}</h4>
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          value={newAgentName}
                          onChange={(e) => setNewAgentName(e.target.value)}
                          placeholder="New Agent Name"
                          className="flex-1 bg-zinc-950 border border-zinc-800 p-2 text-[10px] rounded-lg focus:outline-none"
                        />
                        <button 
                          onClick={registerAgentLocally}
                          className="bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 p-2.5 rounded-lg text-[9px] font-black uppercase"
                        >
                          Add
                        </button>
                      </div>

                      <div className="max-h-[120px] overflow-y-auto space-y-1 font-mono text-[9px]">
                        {simulatedAgents.map((ag) => (
                          <div key={ag.code} className="flex bg-black/40 p-2 rounded justify-between text-[9px] border border-zinc-800">
                            <div>
                              <span className="text-zinc-400 font-bold">Code: {ag.code}</span>
                              <p className="text-zinc-500 text-[7px]">{ag.name}</p>
                            </div>
                            <span className="text-amber-400">${ag.earnings.toFixed(1)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Backup & JSON Database viewer */}
                    <div className="space-y-3 border-t border-zinc-800 pt-4">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-zinc-400">{textVal('backupSync')}</h4>
                      <button 
                        onClick={() => copyToClipboard(getDatabaseExportJson())}
                        className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 p-3 rounded-xl text-[9px] font-black uppercase tracking-widest text-zinc-400 flex items-center justify-center gap-2"
                      >
                        <Database className="w-3.5 h-3.5 text-zinc-500" />
                        Dump Database to Clipboard
                      </button>
                      {syncClipboardMsg && (
                        <p className="text-center text-[9px] text-emerald-400 font-black uppercase">{syncClipboardMsg}</p>
                      )}
                    </div>

                    <button 
                      onClick={handleSimulatedLogout}
                      className="text-center w-full text-zinc-600 hover:text-red-500 text-[9px] font-black uppercase tracking-widest pt-4"
                    >
                      Logout Session
                    </button>
                  </motion.div>
                )}

                {/* 4. ACTIVE LOUNGE SIMULATED SCREEN */}
                {phoneScreen === 'room' && (
                  <motion.div 
                    key="room"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex-1 flex flex-col relative overflow-hidden"
                  >
                    {/* Simulated live background image block */}
                    <div className="absolute inset-0 z-0 bg-[url('https://images.unsplash.com/photo-1516280440614-37939bbacd81')] bg-cover bg-center brightness-[0.35]"></div>

                    {/* Real-time floating gift canvas animation overlay */}
                    <div className="absolute inset-0 z-10 pointer-events-none">
                      {giftParticles.map((pt) => (
                        <motion.div
                          key={pt.id}
                          initial={{ y: 350, x: `${pt.x}%`, scale: 0.6, opacity: 1 }}
                          animate={{ y: 80, scale: 1.5, opacity: 0 }}
                          transition={{ duration: 1.1, ease: "easeOut" }}
                          className="absolute text-3xl font-bold"
                        >
                          {pt.icon}
                        </motion.div>
                      ))}
                    </div>

                    <div className="relative z-20 flex-1 flex flex-col p-4 space-y-4 overflow-y-auto">
                      
                      {/* Lounge Header */}
                      <div className="flex items-center justify-between mt-2">
                        <button 
                          onClick={() => setPhoneScreen('home')}
                          className="bg-black/50 border border-zinc-800/80 p-2 rounded-full hover:bg-black/80"
                        >
                          <ArrowLeft className="w-3 h-3 text-white" />
                        </button>

                        <div className="bg-black/40 border border-zinc-800 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest flex items-center gap-1.5">
                          <Coins className="w-3 h-3 text-amber-400" />
                          Coins: {userCoins}
                        </div>
                      </div>

                      {/* 9 Seat mic grid */}
                      <div className="grid grid-cols-3 gap-3 pt-2">
                        {seats.map((occ, sIndex) => (
                          <div 
                            key={sIndex}
                            onClick={() => {
                              const newSeats = [...seats];
                              newSeats[sIndex] = !newSeats[sIndex];
                              setSeats(newSeats);
                            }}
                            className={`aspect-square rounded-full flex flex-col items-center justify-center cursor-pointer transition-all ${
                              occ 
                                ? "bg-amber-400/20 border-2 border-amber-400 shadow-md scale-105" 
                                : "bg-black/40 border border-zinc-800 hover:border-zinc-700"
                            }`}
                          >
                            <span className="text-xl">
                              {sIndex === 0 ? "🎙️" : (occ ? "🧔" : "➕")}
                            </span>
                            
                            {/* Speaking wave bouncing feedback */}
                            {occ && (
                              <div className="flex gap-1 items-center justify-center mt-1 h-3">
                                <div 
                                  className="w-0.5 bg-amber-400 rounded-full transition-all"
                                  style={{ height: sIndex === 0 && micActive ? `${bounceValue * 0.15}px` : `${Math.floor(4 + Math.random() * 8)}px` }}
                                ></div>
                                <div 
                                  className="w-0.5 bg-amber-400 rounded-full transition-all"
                                  style={{ height: sIndex === 0 && micActive ? `${bounceValue * 0.2}px` : `${Math.floor(4 + Math.random() * 8)}px` }}
                                ></div>
                                <div 
                                  className="w-0.5 bg-amber-400 rounded-full transition-all"
                                  style={{ height: sIndex === 0 && micActive ? `${bounceValue * 0.12}px` : `${Math.floor(4 + Math.random() * 8)}px` }}
                                ></div>
                              </div>
                            )}
                            
                            <span className="text-[7px] text-zinc-400 mt-1 uppercase truncate max-w-[45px]">
                              {sIndex === 0 ? "You (Speak)" : `Seat ${sIndex + 1}`}
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Microphones permission controller */}
                      <div className="bg-black/55 p-3 rounded-xl border border-zinc-800/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] font-black uppercase text-zinc-400 tracking-wider">Device Input Configuration</span>
                          <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded ${micActive ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-500"}`}>
                            {micActive ? "RECORDING" : "MUTED"}
                          </span>
                        </div>

                        <button 
                          onClick={toggleMicrophone}
                          className={`w-full text-[9px] font-black uppercase tracking-widest p-2 rounded-lg flex items-center justify-center gap-2 transition-all ${
                            micActive 
                              ? "bg-red-500 hover:bg-red-600 text-white" 
                              : "bg-amber-400 hover:bg-amber-500 text-zinc-950"
                          }`}
                        >
                          {micActive ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                          {micActive ? "DISABLE MICROPHONE" : "ENABLE LOCAL RECORDING"}
                        </button>
                        {micStateError && (
                          <p className="text-[7px] text-zinc-500 text-center font-mono uppercase">{micStateError}</p>
                        )}
                      </div>

                      {/* Live simulated messages feeds scroll */}
                      <div className="flex-1 bg-black/45 border border-zinc-800/75 rounded-xl p-3 overflow-y-auto max-h-[110px] space-y-1.5 text-[8px] font-sans">
                        {loungeMessages.map((msg, i) => (
                          <div key={i} className="text-zinc-300 leading-normal border-b border-zinc-900 pb-1">
                            {msg}
                          </div>
                        ))}
                      </div>

                      {/* Simulated virtual gifting catalog footer drawer */}
                      <div className="space-y-1 bg-black/60 p-2.5 rounded-xl border border-zinc-800/70">
                        <span className="text-[8px] font-mono font-bold uppercase text-zinc-500">Virtual Simulation Gifts</span>
                        <div className="grid grid-cols-5 gap-1 pt-1">
                          {GIFT_ITEMS.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => triggerGift(item)}
                              title={`${item.name} (${item.cost} coins)`}
                              className="bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded p-1 flex flex-col items-center justify-center transition-all hover:scale-110"
                            >
                              <span className="text-sm">{item.icon}</span>
                              <span className="text-[7px] font-mono text-amber-500">{item.cost}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Say message controller toolbar */}
                      <div className="flex gap-1.5 items-center">
                        <input 
                          type="text"
                          value={customMsg}
                          onChange={(e) => setCustomMsg(e.target.value)}
                          placeholder="Broadcast something..."
                          className="flex-1 bg-black/80 border border-zinc-800 p-2 rounded-lg text-[9px] focus:outline-none focus:border-amber-400"
                        />
                        <button 
                          onClick={broadcastMsg}
                          className="bg-amber-400 hover:bg-amber-500 p-3 rounded-lg text-zinc-950"
                        >
                          <Send className="w-3 h-3" />
                        </button>
                      </div>

                    </div>
                  </motion.div>
                )}

                {/* 5. LOCALE TRANSLATIONS & SETTINGS */}
                {phoneScreen === 'settings' && (
                  <motion.div 
                    key="settings"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex-1 flex flex-col p-5 space-y-6"
                  >
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setPhoneScreen('home')}
                        className="bg-black/50 p-2 border border-zinc-800/80 rounded-full"
                      >
                        <ArrowLeft className="w-3 h-3 text-white" />
                      </button>
                      <h4 className="text-white font-black uppercase text-xs">Settings & Locale</h4>
                    </div>

                    <div className="space-y-4">
                      <h5 className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Select Dialect (Simulated Resources)</h5>
                      
                      <div className="grid grid-cols-1 gap-2">
                        {['English', 'Amharic', 'Arabic'].map((lang) => (
                          <button
                            key={lang}
                            onClick={() => setAppLanguage(lang)}
                            className={`p-3 rounded-xl text-left text-[10px] font-black uppercase flex items-center justify-between transition-all ${
                              appLanguage === lang 
                                ? "bg-amber-400 text-zinc-950 shadow-md" 
                                : "bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white"
                            }`}
                          >
                            <span>{lang}</span>
                            {appLanguage === lang && <CheckCircle2 className="w-3.5 h-3.5" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4 border-t border-zinc-800 pt-4">
                      <h5 className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Simulation Recharge Wallet</h5>
                      <div className="flex gap-2">
                        <input 
                          type="number"
                          value={rechargeAmt}
                          onChange={(e) => setRechargeAmt(Number(e.target.value))}
                          className="bg-zinc-950 border border-zinc-800 p-2.5 rounded-lg text-[10px] w-24 focus:outline-none"
                        />
                        <button
                          onClick={() => {
                            setUserCoins(prev => prev + rechargeAmt);
                            setLoungeMessages(prev => [...prev, `💰 Recharged ${rechargeAmt} Coins via ${payoutOption}`]);
                            alert(`Simulated Payout: Approved! Added ${rechargeAmt} Coins to User Ledger.`);
                          }}
                          className="flex-1 bg-amber-400 hover:bg-amber-500 text-zinc-950 text-[9px] font-black uppercase rounded-lg"
                        >
                          Charge via {payoutOption}
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-1 font-mono text-[8px]">
                        {['Visa', 'PayPal', 'Telebirr', 'Chapa', 'Crypto'].map((opt) => (
                          <button
                            key={opt}
                            onClick={() => setPayoutOption(opt)}
                            className={`p-2 rounded border transition-all ${
                              payoutOption === opt 
                                ? "bg-zinc-800 border-amber-400 text-white" 
                                : "bg-black/40 border-zinc-900 text-zinc-500"
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-zinc-800 text-center font-mono text-[8px] text-zinc-600">
                      <p>BarcaLive Offline Native Applet</p>
                      <p>Version ID: build_v1.0.4-dev</p>
                    </div>

                  </motion.div>
                )}

              </AnimatePresence>

            </div>

            {/* Simulated home button segment */}
            <div className="absolute bottom-1 bg-zinc-700/60 w-32 h-1 rounded-full inset-x-0 mx-auto"></div>
          </div>
        </div>

        {/* column 2: kotlin code explorer and studio instructions (lg:col-span-7) */}
        <div className="lg:col-span-12 xl:col-span-7 flex flex-col space-y-6">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-3xl p-6 lg:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h3 className="text-white font-black text-xs uppercase tracking-wider">Android Studio Project Explorer</h3>
                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-1">Source Code Files Created physically in your workspace</p>
              </div>

              <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] font-black uppercase tracking-wider">
                <FileCode className="w-4 h-4 text-amber-400" />
                <span>Kotlin (Jetpack Compose)</span>
              </div>
            </div>

            {/* File navigator tabs */}
            <div className="flex flex-wrap gap-2">
              {ANDROID_SOURCE_FILES.map((f, i) => (
                <button
                  key={f.name}
                  onClick={() => setActiveFileIndex(i)}
                  className={`px-4 py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all ${
                    activeFileIndex === i 
                      ? "bg-amber-400 border-amber-400 text-zinc-950 font-black shadow-lg" 
                      : "bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>

            {/* Code viewing panel */}
            <div className="relative bg-black rounded-2xl border border-zinc-800 overflow-hidden">
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <span className="text-[9px] font-mono text-zinc-600 bg-zinc-950 px-2 py-1 rounded">
                  {ANDROID_SOURCE_FILES[activeFileIndex].path}
                </span>
                
                <button
                  onClick={() => copyCode(ANDROID_SOURCE_FILES[activeFileIndex].code, activeFileIndex)}
                  className="bg-zinc-900 hover:bg-zinc-800 p-2 rounded-lg text-zinc-400 hover:text-white transition-all flex items-center gap-1 text-[10px] uppercase font-mono font-bold border border-zinc-800"
                >
                  <Copy className="w-3 h-3" />
                  {copiedIndex === activeFileIndex ? "Copied!" : "Copy Code"}
                </button>
              </div>

              <pre className="p-5 font-mono text-xs text-zinc-300 overflow-x-auto overflow-y-auto max-h-[500px] leading-relaxed pt-14 selection:bg-amber-400/20 scrollbar-thin">
                <code>{ANDROID_SOURCE_FILES[activeFileIndex].code}</code>
              </pre>
            </div>
          </div>

          {/* Android Studio compilation & build guidelines card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 lg:p-8 space-y-4">
            <h3 className="text-white font-black text-xs uppercase tracking-wider flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-amber-400" />
              Build & Compile APK on your Local Machine
            </h3>
            <p className="text-zinc-400 text-[11px] font-medium leading-relaxed font-sans">
              Since all directories have been physically generated in your workspace, once you choose <strong className="text-white">Export to ZIP</strong> or <strong className="text-white">GitHub Project</strong> from the settings menu above:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 font-sans">
              <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-2">
                <span className="text-amber-400 text-xs font-black uppercase">1. Import to Android Studio</span>
                <p className="text-zinc-500 text-[10px] leading-relaxed">
                  Open Android Studio, click <strong className="text-zinc-300">Open Project</strong> and select the <strong className="text-zinc-300">BarcaLive/</strong> subdirectory. The IDE will automatically synchronize dependencies.
                </p>
              </div>

              <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-2">
                <span className="text-amber-400 text-xs font-black uppercase">2. Build APK</span>
                <p className="text-zinc-500 text-[10px] leading-relaxed">
                  Connect any Android device or launch an emulator, then click the green <strong className="text-zinc-300">Run App</strong> button or select <strong className="text-zinc-300">Build &gt; Build Bundle(s) / APK(s)</strong>.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
