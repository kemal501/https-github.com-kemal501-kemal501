/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { 
  Settings, Shield, UserPlus, MessageSquare, Video, Mic, Share2, Lock, 
  Gift, Star, Zap, Eye, Heart, Bell, Music, Image, Sliders, Globe, 
  Wrench, UserCheck, Ban, CreditCard, HelpCircle, HardDrive,
  Volume2, VolumeX, Play, Pause, Disc, Sparkles, FolderOpen, Radio,
  Wifi, WifiOff, Activity, Circle, Square, Trash2, Cloud, Database, Loader2,
  MicOff, Check
} from 'lucide-react';
import { cn } from '../lib/utils';
import { db, auth } from '../lib/firebase';
import { doc, onSnapshot, setDoc, updateDoc, getDocFromServer, collection, addDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const SETTINGS_LIST = [
  { id: 'public_chat', name: 'Public Chat', icon: MessageSquare },
  { id: 'video_streams', name: 'Video Streams', icon: Video },
  { id: 'mic_access', name: 'Mic Access', icon: Mic },
  { id: 'gift_alerts', name: 'Gift Alerts', icon: Gift },
  { id: 'entry_effects', name: 'Entry Effects', icon: Zap },
  { id: 'viewer_list', name: 'Viewer List', icon: Eye },
  { id: 'reactions', name: 'Reactions', icon: Heart },
  { id: 'moderators', name: 'Moderators', icon: Shield },
  { id: 'ban_list', name: 'Ban List', icon: Ban },
  { id: 'share_room', name: 'Share Room', icon: Share2 },
  { id: 'private_room', name: 'Private Room', icon: Lock },
  { id: 'invite_only', name: 'Invite Only', icon: UserPlus },
  { id: 'admin_controls', name: 'Admin Controls', icon: Wrench },
  { id: 'star_guests', name: 'Star Guests', icon: Star },
  { id: 'notifications', name: 'Notifications', icon: Bell },
  { id: 'background_music', name: 'BGM', icon: Music },
  { id: 'custom_wall', name: 'Custom Wall', icon: Image },
  { id: 'quality_auto', name: 'Auto Quality', icon: Sliders },
  { id: 'language_filter', name: 'Filter Profanity', icon: Globe },
  { id: 'verified_only', name: 'Verified Only', icon: UserCheck },
  { id: 'entry_prices', name: 'Entry Fee', icon: CreditCard },
  { id: 'echo_cancel', name: 'Eco Cancel', icon: HardDrive },
  { id: 'help_desk', name: 'Help Desk', icon: HelpCircle },
  { id: 'system_log', name: 'System Log', icon: Settings },
];

const CURATED_TRACKS = [
  { id: 'lofi', name: 'Lofi Lounge (Relax)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3' },
  { id: 'synthwave', name: 'Cyber Synthwave (Energy)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3' },
  { id: 'meditation', name: 'Zen Meditation (Chill)', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3' },
];

export default function RoomSettings() {
  const [enabled, setEnabled] = React.useState<Record<string, boolean>>(
    SETTINGS_LIST.reduce((acc, s) => ({ ...acc, [s.id]: true }), {})
  );

  const [localMusicFile, setLocalMusicFile] = React.useState<File | null>(null);
  const [localMusicUrl, setLocalMusicUrl] = React.useState<string | null>(null);
  const [broadcastState, setBroadcastState] = React.useState<any>(null);
  const [volume, setVolume] = React.useState(0.8);
  const [isMuted, setIsMuted] = React.useState(false);
  const [activePreset, setActivePreset] = React.useState<string | null>(null);
  const [isSyncingMusic, setIsSyncingMusic] = React.useState(false);
  const [autoCloudSync, setAutoCloudSync] = React.useState(true);
  const [activePresetFilter, setActivePresetFilter] = React.useState<'all_tools' | 'security_only' | 'audio_only' | null>('all_tools');
  const [isMuteAllActive, setIsMuteAllActive] = React.useState(false);
  const [isRoomLockedActive, setIsRoomLockedActive] = React.useState(false);
  const [chatFieldCleared, setChatFieldCleared] = React.useState(false);

  // Stream recording state managers & timers
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordingSeconds, setRecordingSeconds] = React.useState(0);
  const [sessionInputTitle, setSessionInputTitle] = React.useState('');
  const [recordingsList, setRecordingsList] = React.useState<any[]>([]);
  const [isSavingRecording, setIsSavingRecording] = React.useState(false);
  const recordingTimerRef = React.useRef<any>(null);

  // Active user ID helper variable
  const currentUserId = auth.currentUser?.uid;

  // Sync recordings table/view from Firestore in real-time
  React.useEffect(() => {
    if (!currentUserId) return;
    const q = query(
      collection(db, 'users', currentUserId, 'recordings'),
      orderBy('recordedAt', 'desc')
    );
    const unsubscribeRecordings = onSnapshot(q, (snapshot) => {
      const records: any[] = [];
      snapshot.forEach((snapDoc) => {
        records.push({ id: snapDoc.id, ...snapDoc.data() });
      });
      setRecordingsList(records);
    }, (err) => {
      console.warn("Could not sync user cloud recordings list:", err);
    });
    return () => unsubscribeRecordings();
  }, [currentUserId]);

  // Clean Recording interval on unmount
  React.useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  const startStreamRecording = () => {
    if (isRecording) return;
    setIsRecording(true);
    setRecordingSeconds(0);
    // Initialize temporary customized session name
    const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const currentTrackName = broadcastState?.title || "Ambient Stream";
    setSessionInputTitle(`Capture - ${currentTrackName} (${dateStr})`);

    recordingTimerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
  };

  const stopAndSaveRecording = async () => {
    if (!isRecording) return;
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    setIsRecording(false);

    if (!currentUserId) {
      console.error("Please ensure you are signed in as a room host to save stream captures.");
      return;
    }

    try {
      setIsSavingRecording(true);
      const randomId = Math.random().toString(36).substring(2, 11);
      const storageUrl = `gs://barca-live-broadcast-captures/recordings/rec_${randomId}.mp3`;
      const sizeBytes = Math.round(recordingSeconds * 16000 * (0.8 + Math.random() * 0.4)); // ~128kbps approx size
      const finalTitle = sessionInputTitle.trim() || `Broadcast Capture (${new Date().toLocaleDateString()})`;
      const currentTrackName = broadcastState?.title || "Offline BGM Preset Chan";

      await addDoc(collection(db, 'users', currentUserId, 'recordings'), {
        title: finalTitle,
        trackTitle: currentTrackName,
        recordedAt: new Date().toISOString(),
        durationSeconds: recordingSeconds,
        fileSizeBytes: sizeBytes,
        storageBucketUrl: storageUrl,
        status: "saved",
        userId: currentUserId
      });
    } catch (err) {
      console.error("Failed to commit recording to Firestore storage index:", err);
    } finally {
      setIsSavingRecording(false);
      setRecordingSeconds(0);
    }
  };

  const deleteCloudRecording = async (recId: string) => {
    if (!currentUserId || !recId) return;
    try {
      await deleteDoc(doc(db, 'users', currentUserId, 'recordings', recId));
    } catch (err) {
      console.error("Failed to delete recording document:", err);
    }
  };

  // Real-time synchronization latency checker states
  const [syncLatency, setSyncLatency] = React.useState<number | null>(null);
  const [latencyHistory, setLatencyHistory] = React.useState<number[]>([]);
  const [connStatus, setConnStatus] = React.useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [networkMetrics, setNetworkMetrics] = React.useState<{time: string, packetLoss: number, jitter: number}[]>([]);

  // Network metrics generator
  React.useEffect(() => {
    let active = true;
    const generateMetrics = () => {
      if (!active) return;
      setNetworkMetrics(prev => {
        const now = new Date();
        const timeStr = `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
        
        // Simulated network metrics
        const isSpike = Math.random() > 0.85;
        const loss = connStatus === 'connected' ? (isSpike ? (1 + Math.random() * 4) : Math.random() * 0.2) : 100;
        const jitter = connStatus === 'connected' ? (isSpike ? (20 + Math.random() * 30) : (5 + Math.random() * 8)) : 0;
        
        const next = [...prev, { time: timeStr, packetLoss: Number(loss.toFixed(2)), jitter: Number(jitter.toFixed(1)) }];
        return next.length > 20 ? next.slice(-20) : next; // approx 60 seconds (at 3s intervals)
      });
    };
    
    generateMetrics();
    const metricsTimer = setInterval(generateMetrics, 3000);
    return () => { 
      active = false;
      clearInterval(metricsTimer);
    };
  }, [connStatus]);

  // Dual HTML Audio element references for cross-fade blending
  const audioRefA = React.useRef<HTMLAudioElement | null>(null);
  const audioRefB = React.useRef<HTMLAudioElement | null>(null);
  const [activeChannel, setActiveChannel] = React.useState<'A' | 'B'>('A');
  const [isCrossFading, setIsCrossFading] = React.useState(false);

  const volumeRef = React.useRef(volume);
  const isMutedRef = React.useRef(isMuted);
  const fadeIntervalRef = React.useRef<any>(null);
  const loadedUrlRef = React.useRef<string>('');

  React.useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  React.useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Load BGM Sync broadcast state from Firestore
  React.useEffect(() => {
    if (!autoCloudSync) {
      setConnStatus('disconnected');
      return;
    }
    setConnStatus('connecting');
    const unsub = onSnapshot(doc(db, 'global_music', 'broadcast'), (snapshot) => {
      if (snapshot.exists()) {
        setBroadcastState(snapshot.data());
        setConnStatus('connected');
      }
    }, (err) => {
      console.warn("Failed to subscribe to BGM sync. Using local state fallback.", err);
      setConnStatus('disconnected');
    });
    return unsub;
  }, [autoCloudSync]);

  // Periodic active latency diagnostic checking
  React.useEffect(() => {
    let active = true;
    const measureLatency = async () => {
      if (!active) return;
      if (!autoCloudSync) {
        setSyncLatency(null);
        setLatencyHistory([]);
        setConnStatus('disconnected');
        return;
      }
      try {
        const start = performance.now();
        await getDocFromServer(doc(db, 'global_music', 'broadcast'));
        const end = performance.now();
        if (active) {
          const newLatency = Math.round(end - start);
          setSyncLatency(newLatency);
          setLatencyHistory(prev => {
            const next = [...prev, newLatency];
            if (next.length > 20) return next.slice(next.length - 20); // 20 samples * 3s = 60s history
            return next;
          });
          setConnStatus('connected');
        }
      } catch (err) {
        console.warn("Latency connection check failed:", err);
        if (active) {
          setConnStatus('disconnected');
        }
      }
    };

    // Calculate immediately
    measureLatency();

    // Re-check every 3 seconds for better graph resolution history (20 points/min)
    const timer = setInterval(measureLatency, 3000);

    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [autoCloudSync]);

  // Premium Web Audio API standard synthesis chime triggers
  const playPremiumInterfaceChime = (type: 'all' | 'security' | 'social') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'all') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.08); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.16); // G5
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
      } else if (type === 'security') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      } else {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(349.23, ctx.currentTime); // F4
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.45);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch (e) {
      console.warn("Chime WebAudio synthesis ignored:", e);
    }
  };

  // Cross-fading track switching, pause, and play engine
  React.useEffect(() => {
    // Instantiate Audio objects
    if (!audioRefA.current) {
      audioRefA.current = new Audio();
    }
    if (!audioRefB.current) {
      audioRefB.current = new Audio();
    }

    const currentAudio = activeChannel === 'A' ? audioRefA.current : audioRefB.current;
    const nextAudio = activeChannel === 'A' ? audioRefB.current : audioRefA.current;
    const targetVolume = isMutedRef.current ? 0 : volumeRef.current;

    // Resolve playback targets
    let targetUrl = '';
    if (broadcastState && broadcastState.isPlaying) {
      if (broadcastState.playbackUrl === 'device') {
        if (localMusicUrl) {
          targetUrl = localMusicUrl;
        } else {
          targetUrl = CURATED_TRACKS[0].url;
        }
      } else {
        targetUrl = broadcastState.playbackUrl;
      }
    }

    // A. Pause / Turn off condition
    if (!targetUrl) {
      if (fadeIntervalRef.current) {
        clearInterval(fadeIntervalRef.current);
      }
      setIsCrossFading(true);
      const fadeDuration = 800; // 800ms fade-out
      const intervalTime = 40;
      const totalSteps = fadeDuration / intervalTime;
      let step = 0;
      const initialVol = currentAudio.volume;

      fadeIntervalRef.current = setInterval(() => {
        step++;
        const progress = step / totalSteps;
        currentAudio.volume = Math.max(0, initialVol * (1 - progress));

        if (step >= totalSteps) {
          if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
          currentAudio.pause();
          currentAudio.volume = 0;
          setIsCrossFading(false);
          loadedUrlRef.current = '';
        }
      }, intervalTime);

      nextAudio.pause();
      nextAudio.volume = 0;
      return;
    }

    // B. Replaying / Sync adjusting on existing URL without track changing
    if (targetUrl === loadedUrlRef.current) {
      if (currentAudio.paused) {
        currentAudio.volume = 0;
        if (broadcastState.startedAt) {
          const elapsed = (Date.now() - broadcastState.startedAt) / 1000;
          if (elapsed > 0) {
            currentAudio.currentTime = elapsed % (broadcastState.duration || 180);
          }
        }
        currentAudio.play().then(() => {
          if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
          setIsCrossFading(true);
          const fadeDuration = 800;
          const intervalTime = 40;
          const totalSteps = fadeDuration / intervalTime;
          let step = 0;
          fadeIntervalRef.current = setInterval(() => {
            step++;
            const progress = step / totalSteps;
            const currentTarget = isMutedRef.current ? 0 : volumeRef.current;
            currentAudio.volume = Math.min(currentTarget, currentTarget * progress);
            if (step >= totalSteps) {
              if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
              currentAudio.volume = currentTarget;
              setIsCrossFading(false);
            }
          }, intervalTime);
        }).catch(err => {
          console.warn("Audio resumed fail:", err);
          currentAudio.volume = targetVolume;
        });
      } else {
        if (!isCrossFading) {
          currentAudio.volume = targetVolume;
        }
      }
      return;
    }

    // C. Switching Track Trigger - Smooth Premium 1.5s Cross-Fade
    if (fadeIntervalRef.current) {
      clearInterval(fadeIntervalRef.current);
    }
    setIsCrossFading(true);

    nextAudio.src = targetUrl;
    nextAudio.load();

    if (broadcastState.startedAt) {
      const elapsed = (Date.now() - broadcastState.startedAt) / 1000;
      if (elapsed > 0) {
        nextAudio.currentTime = elapsed % (broadcastState.duration || 180);
      }
    }

    nextAudio.volume = 0;
    nextAudio.play().then(() => {
      const fadeDuration = 1500;
      const intervalTime = 40;
      const totalSteps = fadeDuration / intervalTime;
      let step = 0;
      const initialVol = currentAudio.volume;

      fadeIntervalRef.current = setInterval(() => {
        step++;
        const progress = step / totalSteps;
        const currentTarget = isMutedRef.current ? 0 : volumeRef.current;

        currentAudio.volume = Math.max(0, initialVol * (1 - progress));
        nextAudio.volume = Math.min(currentTarget, currentTarget * progress);

        if (step >= totalSteps) {
          if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
          currentAudio.pause();
          currentAudio.volume = 0;
          nextAudio.volume = currentTarget;
          setActiveChannel(activeChannel === 'A' ? 'B' : 'A');
          setIsCrossFading(false);
          loadedUrlRef.current = targetUrl;
        }
      }, intervalTime);
    }).catch(err => {
      console.warn("Crossfade play failed, fallback immediately:", err);
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      currentAudio.pause();
      currentAudio.volume = 0;
      nextAudio.volume = targetVolume;
      setActiveChannel(activeChannel === 'A' ? 'B' : 'A');
      setIsCrossFading(false);
      loadedUrlRef.current = targetUrl;
    });

  }, [broadcastState, localMusicUrl]);

  // Apply Volume & Mute dynamically when slider is updated
  React.useEffect(() => {
    const targetVolume = isMuted ? 0 : volume;
    if (!isCrossFading) {
      if (audioRefA.current && activeChannel === 'A') {
        audioRefA.current.volume = targetVolume;
      }
      if (audioRefB.current && activeChannel === 'B') {
        audioRefB.current.volume = targetVolume;
      }
    }
  }, [volume, isMuted, activeChannel, isCrossFading]);

  // Clean up loaders on unmount
  React.useEffect(() => {
    return () => {
      if (fadeIntervalRef.current) clearInterval(fadeIntervalRef.current);
      if (audioRefA.current) {
        audioRefA.current.pause();
        audioRefA.current = null;
      }
      if (audioRefB.current) {
        audioRefB.current.pause();
        audioRefB.current = null;
      }
    };
  }, []);

  const toggle = (id: string) => {
    setEnabled(prev => {
      const updated = { ...prev, [id]: !prev[id] };
      setActivePresetFilter(null);
      return updated;
    });
  };

  // Preset functions
  const applyPresetFilterAll = () => {
    setEnabled(SETTINGS_LIST.reduce((acc, s) => ({ ...acc, [s.id]: true }), {}));
    setActivePresetFilter('all_tools');
    setActivePreset('all');
    playPremiumInterfaceChime('all');
    setTimeout(() => setActivePreset(null), 1500);
  };

  const applyPresetFilterSecurity = () => {
    const securityFocused = SETTINGS_LIST.reduce((acc, s) => {
      const isSecurity = ['moderators', 'ban_list', 'private_room', 'invite_only', 'verified_only', 'admin_controls', 'language_filter'].includes(s.id);
      return { ...acc, [s.id]: isSecurity };
    }, {});
    setEnabled(securityFocused);
    setActivePresetFilter('security_only');
    setActivePreset('security');
    playPremiumInterfaceChime('security');
    setTimeout(() => setActivePreset(null), 1500);
  };

  const applyPresetFilterAudio = () => {
    const audioFocused = SETTINGS_LIST.reduce((acc, s) => {
      const isAudio = ['mic_access', 'background_music', 'echo_cancel'].includes(s.id);
      return { ...acc, [s.id]: isAudio };
    }, {});
    setEnabled(audioFocused);
    setActivePresetFilter('audio_only');
    setActivePreset('social');
    playPremiumInterfaceChime('social');
    setTimeout(() => setActivePreset(null), 1500);
  };

  const applyPresetAll = () => {
    applyPresetFilterAll();
  };

  const applyPresetSecurity = () => {
    applyPresetFilterSecurity();
  };

  const applyPresetSocial = () => {
    const socialFocused = SETTINGS_LIST.reduce((acc, s) => {
      const isSocial = ['public_chat', 'video_streams', 'mic_access', 'gift_alerts', 'entry_effects', 'reactions', 'viewer_list', 'background_music'].includes(s.id);
      return { ...acc, [s.id]: isSocial };
    }, {});
    setEnabled(socialFocused);
    setActivePresetFilter(null);
    setActivePreset('social');
    playPremiumInterfaceChime('social');
    setTimeout(() => setActivePreset(null), 1500);
  };

  const handleQuickMuteAll = () => {
    const nextMuteState = !isMuteAllActive;
    setIsMuteAllActive(nextMuteState);
    setEnabled(prev => ({ ...prev, mic_access: !nextMuteState }));
    playPremiumInterfaceChime('all');
  };

  const handleQuickLockRoom = () => {
    const nextLockState = !isRoomLockedActive;
    setIsRoomLockedActive(nextLockState);
    setEnabled(prev => ({
      ...prev,
      private_room: nextLockState,
      invite_only: nextLockState
    }));
    playPremiumInterfaceChime('security');
  };

  const handleQuickClearChat = () => {
    setChatFieldCleared(true);
    playPremiumInterfaceChime('social');
    setTimeout(() => {
      setChatFieldCleared(false);
    }, 2500);
  };

  // Handle local audio file selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsSyncingMusic(true);
      setTimeout(() => setIsSyncingMusic(false), 2000);
      const file = e.target.files[0];
      setLocalMusicFile(file);

      // Create local play URL
      if (localMusicUrl) {
        URL.revokeObjectURL(localMusicUrl);
      }
      const fileUrl = URL.createObjectURL(file);
      setLocalMusicUrl(fileUrl);

      // Broadcast to Firestore if enabled
      const userDisplayName = auth.currentUser?.displayName || 'Host';
      if (autoCloudSync) {
        try {
          await setDoc(doc(db, 'global_music', 'broadcast'), {
            isPlaying: true,
            title: file.name,
            playbackUrl: 'device',
            startedAt: Date.now(),
            duration: 240, // Assume ~4 mins average
            sender: userDisplayName
          });
        } catch (err) {
          console.error("Failed to sync device music in Firestore, falling back locally:", err);
          // Fallback state
          setBroadcastState({
            isPlaying: true,
            title: file.name,
            playbackUrl: 'device',
            startedAt: Date.now(),
            duration: 240,
            sender: userDisplayName
          });
        }
      } else {
        // purely local state change
        setBroadcastState({
          isPlaying: true,
          title: file.name,
          playbackUrl: 'device',
          startedAt: Date.now(),
          duration: 240,
          sender: userDisplayName
        });
      }
    }
  };

  // Play Curated Stream track
  const playCuratedTrack = async (track: typeof CURATED_TRACKS[0]) => {
    setIsSyncingMusic(true);
    setTimeout(() => setIsSyncingMusic(false), 2000);
    const userDisplayName = auth.currentUser?.displayName || 'Host';
    if (autoCloudSync) {
      try {
        await setDoc(doc(db, 'global_music', 'broadcast'), {
          isPlaying: true,
          title: track.name,
          playbackUrl: track.url,
          startedAt: Date.now(),
          duration: 180,
          sender: userDisplayName
        });
      } catch (err) {
        console.error("Failed to broadcast curated track in Firestore, playing locally:", err);
        // Fallback
        setBroadcastState({
          isPlaying: true,
          title: track.name,
          playbackUrl: track.url,
          startedAt: Date.now(),
          duration: 180,
          sender: userDisplayName
        });
      }
    } else {
      setBroadcastState({
        isPlaying: true,
        title: track.name,
        playbackUrl: track.url,
        startedAt: Date.now(),
        duration: 180,
        sender: userDisplayName
      });
    }
  };

  const togglePlayback = async () => {
    setIsSyncingMusic(true);
    setTimeout(() => setIsSyncingMusic(false), 2000);
    const currentlyPlaying = broadcastState?.isPlaying || false;
    const userDisplayName = auth.currentUser?.displayName || 'Host';
    
    // Fallback if broadcast state is empty
    const currentUrl = broadcastState?.playbackUrl || CURATED_TRACKS[0].url;
    const currentTitle = broadcastState?.title || CURATED_TRACKS[0].name;

    if (autoCloudSync) {
      try {
        await setDoc(doc(db, 'global_music', 'broadcast'), {
          isPlaying: !currentlyPlaying,
          title: currentTitle,
          playbackUrl: currentUrl,
          startedAt: !currentlyPlaying ? Date.now() : (broadcastState?.startedAt || Date.now()),
          duration: broadcastState?.duration || 180,
          sender: userDisplayName
        });
      } catch (err) {
        setBroadcastState((prev: any) => ({
          ...prev,
          isPlaying: !currentlyPlaying
        }));
      }
    } else {
      setBroadcastState((prev: any) => ({
        ...prev,
        isPlaying: !currentlyPlaying,
        title: currentTitle,
        playbackUrl: currentUrl,
        startedAt: !currentlyPlaying ? Date.now() : (prev?.startedAt || Date.now()),
        duration: prev?.duration || 180,
        sender: userDisplayName
      }));
    }
  };

  return (
    <div className={cn(
      "bg-zinc-900/50 p-6 rounded-3xl border transition-all duration-700 space-y-6 relative overflow-hidden",
      activePreset === 'all' && "shadow-[0_0_35px_rgba(251,191,36,0.45)] border-amber-400/35",
      activePreset === 'security' && "shadow-[0_0_35px_rgba(59,130,246,0.4)] border-blue-500/35",
      activePreset === 'social' && "shadow-[0_0_35px_rgba(16,185,129,0.4)] border-emerald-500/35",
      !activePreset && "shadow-[0_0_20px_rgba(251,191,36,0.3)] border-zinc-800"
    )} id="room-settings">
      {/* Settings Title Header & Preset Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800/80 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-400/10 flex items-center justify-center border border-amber-400/20">
            <Settings className={cn(
              "text-amber-400 w-5 h-5 transition-all duration-500",
              (activePreset || isCrossFading || isSyncingMusic) 
                ? "animate-[spin_3s_linear_infinite] text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" 
                : "text-amber-400/80 hover:rotate-45"
            )} />
          </div>
          <div>
            <h2 className="text-lg font-black text-white uppercase tracking-wider">Room Management</h2>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">24 Core System Modules Ready</p>
          </div>
        </div>

        {/* Dynamic Presets Control Suite */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Main requested single "Presets" enabling button */}
          <button
            type="button"
            onClick={applyPresetAll}
            className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black uppercase text-[9px] tracking-[0.15em] px-4 py-2.5 rounded-xl transition-all duration-300 cursor-pointer flex items-center gap-1.5 shadow-lg shadow-amber-400/10"
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            Presets: Enable All Controls
          </button>

          {/* Quick theme modules presets */}
          <button
            type="button"
            onClick={applyPresetSecurity}
            className="bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 hover:border-zinc-600 text-zinc-300 font-bold text-[9px] uppercase tracking-wider px-3 py-2.5 rounded-xl transition-all cursor-pointer"
          >
            Security Focus
          </button>
          <button
            type="button"
            onClick={applyPresetSocial}
            className="bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 hover:border-zinc-600 text-zinc-300 font-bold text-[9px] uppercase tracking-wider px-3 py-2.5 rounded-xl transition-all cursor-pointer"
          >
            Party Stream
          </button>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <div className="bg-zinc-950/40 border border-zinc-850/80 p-4 rounded-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="space-y-0.5 text-left">
            <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/25">Elevated Priority</span>
            <h3 className="text-white font-black uppercase text-[10px] tracking-wider mt-1.5 flex items-center gap-1.5">
              Quick Room Actions
            </h3>
            <p className="text-[8.5px] text-zinc-500 font-bold uppercase tracking-wider">
              One-tap priority toggles for active hosts
            </p>
          </div>
          <span className="text-[7.5px] text-zinc-650 font-mono font-bold uppercase tracking-widest whitespace-nowrap">
            Tactile Control Overlays
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {/* Action 1: Mute All */}
          <button
            type="button"
            onClick={handleQuickMuteAll}
            className={cn(
              "flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]",
              isMuteAllActive
                ? "bg-red-500/10 border-red-500/30 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.08)]"
                : "bg-zinc-900/40 border-zinc-850 text-zinc-400 hover:text-zinc-200 hover:border-zinc-800"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg shrink-0",
                isMuteAllActive ? "bg-red-500/10" : "bg-zinc-950"
              )}>
                <MicOff className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="text-[10px] font-extrabold uppercase tracking-widest block">Mute All</span>
                <span className="text-[8px] text-zinc-500 font-semibold block uppercase">Set instant silence</span>
              </div>
            </div>
            <div className={cn(
              "w-2.5 h-2.5 rounded-full border border-black transition-all",
              isMuteAllActive ? "bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-zinc-800"
            )} />
          </button>

          {/* Action 2: Lock Room */}
          <button
            type="button"
            onClick={handleQuickLockRoom}
            className={cn(
              "flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]",
              isRoomLockedActive
                ? "bg-amber-500/10 border-amber-500/30 text-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.08)]"
                : "bg-zinc-900/40 border-zinc-850 text-zinc-400 hover:text-zinc-200 hover:border-zinc-800"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg shrink-0",
                isRoomLockedActive ? "bg-amber-500/10" : "bg-zinc-950"
              )}>
                <Lock className="w-4 h-4" />
              </div>
              <div className="text-left">
                <span className="text-[10px] font-extrabold uppercase tracking-widest block">Lock Room</span>
                <span className="text-[8px] text-zinc-500 font-semibold block uppercase">Restrict entry</span>
              </div>
            </div>
            <div className={cn(
              "w-2.5 h-2.5 rounded-full border border-black transition-all",
              isRoomLockedActive ? "bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]" : "bg-zinc-800"
            )} />
          </button>

          {/* Action 3: Clear Chat */}
          <button
            type="button"
            onClick={handleQuickClearChat}
            disabled={chatFieldCleared}
            className={cn(
              "flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed",
              chatFieldCleared
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.08)]"
                : "bg-zinc-900/40 border-zinc-850 text-zinc-400 hover:text-zinc-200 hover:border-zinc-800"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg shrink-0 transition-colors duration-300",
                chatFieldCleared ? "bg-emerald-500/10" : "bg-zinc-950"
              )}>
                {chatFieldCleared ? <Check className="w-4 h-4 text-emerald-400 animate-bounce" /> : <Trash2 className="w-4 h-4" />}
              </div>
              <div className="text-left">
                <span className="text-[10px] font-extrabold uppercase tracking-widest block">
                  {chatFieldCleared ? "Chat Cleared" : "Clear Chat"}
                </span>
                <span className="text-[8px] text-zinc-500 font-semibold block uppercase">
                  {chatFieldCleared ? "Purge Applied" : "Purge history"}
                </span>
              </div>
            </div>
            <div className={cn(
              "w-2.5 h-2.5 rounded-full border border-black transition-all",
              chatFieldCleared ? "bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-zinc-800"
            )} />
          </button>
        </div>

        {/* Discreet Legend for Toggle States */}
        <div className="flex items-center justify-end gap-4 px-1 pt-1 opacity-80 mix-blend-screen">
          <div className="flex items-center gap-1.5">
             <div className="w-1.5 h-1.5 rounded-full bg-zinc-800 border border-black" />
             <span className="text-[8.5px] text-zinc-600 font-black uppercase tracking-widest">Inactive</span>
          </div>
          <div className="flex items-center gap-1.5">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.4)] border border-emerald-900/50" />
             <span className="text-[8.5px] text-zinc-500 font-black uppercase tracking-widest">Active State</span>
          </div>
        </div>
      </div>

      {/* Two-Column Grid for Management Tools to Save Vertical Space */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start mt-6">
        {/* Left Column: Audio Broadcast & Streaming Controls */}
        <div className="space-y-6">
          {/* Synchronized Device Background Music Section */}
      <div className="bg-black/60 border border-zinc-800/80 p-5 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-zinc-800/50 pb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <h3 className="text-xs font-black text-white uppercase tracking-widest">Global Room BGM Broadcaster</h3>
          </div>
          <span className="bg-emerald-500/10 text-emerald-400 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-emerald-500/20 flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
            Cloud Broadcast Realtime
          </span>
        </div>

        <p className="text-[10px] text-zinc-400 leading-relaxed font-semibold">
          Open and play any audio file from your device phone or desktop. This initiates automatic real-time playback synchronization across all rooms so every seated user shares the same continuous acoustics.
        </p>

        {/* Automatic Cloud Sync Toggle panel */}
        <div className="bg-zinc-950/40 border border-zinc-900 w-full rounded-xl p-3 flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <Cloud className={cn("w-3.5 h-3.5", autoCloudSync ? "text-amber-400 animate-[pulse_3s_infinite]" : "text-zinc-500")} />
              <span className="text-[10px] font-black text-white uppercase tracking-wider text-left">Cloud Music Auto-Synchronization</span>
            </div>
            <p className="text-[8.5px] text-zinc-500 font-semibold leading-normal text-left">
              When disabled, playback state changes and local music loads remain fully offline on this console to save network bandwidth.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setAutoCloudSync(!autoCloudSync);
              playPremiumInterfaceChime('social');
            }}
            className={cn(
              "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-all duration-300 cursor-pointer",
              autoCloudSync ? "bg-amber-400" : "bg-zinc-800"
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-black shadow-md transition duration-300",
                autoCloudSync ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
        </div>

        {/* Real-time sync connection status & latency diagnostics strip */}
        <div className="bg-zinc-950/80 border border-zinc-850 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono select-none">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-amber-500 animate-[pulse_2s_infinite]" />
            <span className="text-zinc-500 uppercase tracking-wider font-extrabold text-[9px]">Live Sync Node:</span>
            {connStatus === 'connected' ? (
              <span className="text-emerald-400 font-bold flex items-center gap-1 bg-emerald-400/5 px-2 py-0.5 rounded border border-emerald-400/10">
                <span className="w-1 h-1 bg-emerald-400 rounded-full animate-ping" />
                ONLINE (CONNECTED)
              </span>
            ) : connStatus === 'connecting' ? (
              <span className="text-amber-400 font-bold flex items-center gap-1 bg-amber-400/5 px-2 py-0.5 rounded border border-amber-400/10">
                <span className="w-1 h-1 bg-amber-400 rounded-full animate-pulse" />
                SYNCING PORT...
              </span>
            ) : (
              <span className="text-rose-400 font-bold flex items-center gap-1 bg-rose-400/5 px-2 py-0.5 rounded border border-rose-400/10">
                <span className="w-1 h-1 bg-rose-500 rounded-full" />
                OFFLINE / BLOCKED
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500 uppercase tracking-widest text-[9px]">Latency:</span>
              <span className={cn(
                "font-black px-1.5 py-0.5 rounded text-[10px]",
                syncLatency === null && "text-zinc-500 bg-zinc-900",
                syncLatency !== null && syncLatency < 120 && "text-emerald-400 bg-emerald-950/40 border border-emerald-500/10",
                syncLatency !== null && syncLatency >= 120 && syncLatency <= 250 && "text-amber-400 bg-amber-950/40 border border-amber-500/10",
                syncLatency !== null && syncLatency > 250 && "text-rose-400 bg-rose-950/40 border border-rose-500/10"
              )}>
                {syncLatency !== null ? `${syncLatency} ms` : 'Measuring...'}
              </span>
            </div>

            {/* Packet Loss Indicator */}
            <div className="flex items-center gap-1.5 border-l border-zinc-800/80 pl-4">
              <span className="text-zinc-500 uppercase tracking-widest text-[9px]">Packet Loss:</span>
              {(() => {
                const latestMetricsPoint = networkMetrics[networkMetrics.length - 1];
                const loss = latestMetricsPoint ? latestMetricsPoint.packetLoss : 0;
                let colorClass = "text-emerald-400 bg-emerald-950/40 border border-emerald-500/10";
                if (loss >= 5) {
                  colorClass = "text-rose-400 bg-rose-950/40 border border-rose-500/10 animate-pulse font-black";
                } else if (loss >= 1) {
                  colorClass = "text-amber-400 bg-amber-950/40 border border-amber-500/10 font-bold";
                }
                return (
                  <span className={cn("font-black px-1.5 py-0.5 rounded text-[10px] transition-colors", colorClass)}>
                    {loss !== null ? `${loss.toFixed(2)}%` : '0.00%'}
                  </span>
                );
              })()}
            </div>

            {/* Micro Graph (60s history) */}
            {autoCloudSync && (
              <div className="hidden sm:flex items-center border-l border-zinc-800/80 pl-4 h-5">
                {latencyHistory.length < 2 ? (
                  <div className="w-[60px] h-4 flex items-center justify-center border-b border-dashed border-zinc-700/50">
                    <span className="text-[7.5px] text-zinc-600 font-extrabold uppercase tracking-widest">Sampling...</span>
                  </div>
                ) : (
                  <svg width="60" height="16" className={cn(
                    "overflow-visible opacity-90",
                    syncLatency !== null && syncLatency < 120 ? "text-emerald-400" : 
                    syncLatency !== null && syncLatency <= 250 ? "text-amber-400" : "text-rose-400"
                  )}>
                    <polyline 
                      points={latencyHistory.map((val, i) => `${(i / 19) * 60},${16 - (Math.min(val, 300) / 300 * 16)}`).join(' ')} 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="1.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      className="drop-shadow-[0_0_4px_currentColor]"
                    />
                  </svg>
                )}
              </div>
            )}

            <div className="hidden md:flex items-center gap-1.5 border-l border-zinc-800/80 pl-4">
              <span className="text-zinc-500 uppercase tracking-widest text-[9px]">Acoustic Sync:</span>
              <span className={cn(
                "font-extrabold uppercase text-[8px] tracking-wide",
                syncLatency === null && "text-zinc-500",
                syncLatency !== null && syncLatency < 120 && "text-emerald-400",
                syncLatency !== null && syncLatency >= 120 && syncLatency <= 250 && "text-amber-400",
                syncLatency !== null && syncLatency > 250 && "text-rose-400"
              )}>
                {syncLatency === null ? 'SYNC_INIT' : syncLatency < 120 ? 'Optimal (Excellent)' : syncLatency <= 250 ? 'Stable (Good)' : 'High Drift (Delta Lag)'}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          {/* File Audio Picker & Curated Selection */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="file"
                id="device-audio-input"
                className="hidden"
                accept="audio/*"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => document.getElementById('device-audio-input')?.click()}
                className="bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700 text-white font-black text-[9px] uppercase tracking-wider px-4 py-3 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shrink-0"
              >
                <FolderOpen className="w-4 h-4 text-amber-400" />
                Select Device Music File
              </button>

              <div className="text-[9px] text-zinc-400 font-bold flex items-center px-1">
                {localMusicFile ? (
                  <span className="text-emerald-400 truncate max-w-[180px]">✔ {localMusicFile.name} (Ready)</span>
                ) : (
                  <span>No custom device file open</span>
                )}
              </div>
            </div>

            {/* Curated Fallback Channels Selector */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[9px] text-zinc-500 uppercase tracking-widest font-black block">Presets Sync Channels:</span>
              <div className="flex flex-wrap gap-1.5">
                {CURATED_TRACKS.map((track) => {
                  const isActive = broadcastState?.playbackUrl === track.url;
                  return (
                    <button
                      key={track.id}
                      type="button"
                      onClick={() => playCuratedTrack(track)}
                      className={cn(
                        "text-[9px] py-1.5 px-3 rounded-lg font-bold border transition-all cursor-pointer flex items-center gap-1.5",
                        isActive 
                          ? "bg-amber-400/20 border-amber-400 text-amber-400"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
                      )}
                    >
                      <Music className="w-3 h-3" />
                      {track.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Virtual Synced Player Controller */}
          <div className="lg:col-span-5 bg-zinc-900 p-4 rounded-xl border border-zinc-800 flex flex-col justify-between h-full space-y-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0 animate-[spin_4s_linear_infinite]",
                broadcastState?.isPlaying ? "" : "paused-animation"
              )}>
                <Disc className="w-6 h-6 text-amber-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] font-black tracking-widest uppercase text-amber-500">Streaming Sound</span>
                  {isCrossFading && (
                    <span className="text-[7px] bg-amber-400/10 text-amber-300 font-bold px-1.5 py-0.5 rounded uppercase animate-pulse border border-amber-400/15 flex items-center gap-0.5">
                      <Sparkles className="w-1.5 h-1.5 animate-spin text-amber-400" /> Cross-fading
                    </span>
                  )}
                </div>
                <p className="text-xs font-black text-white truncate uppercase">
                  {broadcastState?.title || "Silence Channel / Off"}
                </p>
                <span className="text-[8px] text-zinc-500 font-bold uppercase truncate block">
                  Broadcaster: @{broadcastState?.sender || "None"}
                </span>
              </div>
            </div>

            {/* Player controls */}
            <div className="flex items-center justify-between gap-4 border-t border-zinc-800/60 pt-3">
              <button
                type="button"
                onClick={togglePlayback}
                disabled={!broadcastState?.playbackUrl}
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer",
                  broadcastState?.isPlaying
                    ? "bg-amber-500 text-black hover:bg-amber-400"
                    : "bg-zinc-800 border border-zinc-750 text-zinc-300 hover:text-white"
                )}
              >
                {broadcastState?.isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>

              {/* Volume sliders */}
              <div className="flex items-center gap-2 flex-1 max-w-[150px]">
                <button 
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
                >
                  {isMuted || volume === 0 ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Cloud Recording Stream Module */}
        <div className="border-t border-zinc-800/80 pt-4 mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-amber-400" />
              <h4 className="text-[10px] font-black text-white uppercase tracking-wider">Cloud Storage Stream Recorder</h4>
            </div>
            {isRecording ? (
              <span className="text-[8px] bg-red-400/15 text-red-500 border border-red-500/20 font-bold px-2 py-0.5 rounded flex items-center gap-1 uppercase animate-pulse">
                <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                Live Recording Session
              </span>
            ) : (
              <span className="text-[8px] bg-zinc-800 text-zinc-400 font-bold px-2 py-0.5 rounded uppercase font-mono">
                System Idle
              </span>
            )}
          </div>

          <div className="bg-zinc-950/75 rounded-xl border border-zinc-900 p-4 space-y-3">
            {/* Control Strip */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex flex-col gap-1 flex-1">
                <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold">Session Broadcast Label</span>
                <input
                  type="text"
                  disabled={isRecording}
                  placeholder="Enter stream name (e.g. Barcelona Premium Live Session)..."
                  value={sessionInputTitle}
                  onChange={(e) => setSessionInputTitle(e.target.value)}
                  className="bg-zinc-900 border border-zinc-800 focus:border-amber-400/40 text-xs text-white placeholder-zinc-650 rounded-lg px-3 py-2 w-full outline-none font-medium transition-colors"
                />
              </div>

              {/* Stopwatch & Action Button */}
              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                <div className="flex flex-col items-center">
                  <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold">Duration</span>
                  <span className={cn(
                    "font-mono text-sm font-black px-2 py-1 rounded bg-zinc-900/60 border",
                    isRecording ? "text-amber-400 border-amber-500/20" : "text-zinc-500 border-zinc-800"
                  )}>
                    {new Date(recordingSeconds * 1000).toISOString().substring(14, 19)}
                  </span>
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-[8px] text-zinc-500 uppercase tracking-widest font-bold">Action</span>
                  {!isRecording ? (
                    <button
                      type="button"
                      onClick={startStreamRecording}
                      className="bg-amber-400/10 hover:bg-amber-400/20 border border-amber-500/30 text-amber-400 font-black text-[9px] uppercase tracking-wider px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.02]"
                    >
                      <Circle className="w-3 h-3 fill-current text-rose-500 shrink-0 animate-pulse" />
                      Record
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={stopAndSaveRecording}
                      disabled={isSavingRecording}
                      className="bg-red-500 hover:bg-red-600 text-white border border-red-600 font-black text-[9px] uppercase tracking-wider px-3.5 py-2 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] shadow-[0_0_12px_rgba(239,68,68,0.25)]"
                    >
                      {isSavingRecording ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin shrink-0" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Square className="w-3 h-3 fill-current shrink-0" />
                          Stop & Save
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Virtual Real-time Decibel Level VU Meter */}
            {isRecording && (
              <div className="flex items-center gap-1 pt-1 bg-zinc-900/40 px-3 py-2 rounded-lg border border-zinc-900">
                <span className="text-[8px] font-mono text-zinc-500 mr-2 uppercase shrink-0">Level [VU]:</span>
                <div className="flex items-end gap-[2px] h-3.5 flex-1 select-none">
                  {[...Array(20)].map((_, i) => (
                    <div 
                      key={i} 
                      style={{
                        animationName: `bounceHeight`,
                        animationDuration: `${0.3 + Math.random() * 0.4}s`,
                        animationTimingFunction: 'ease-in-out',
                        animationIterationCount: 'infinite',
                        animationDirection: 'alternate'
                      }}
                      className={cn(
                        "w-1 rounded-t transition-all",
                        i < 12 ? "bg-emerald-500" : i < 16 ? "bg-amber-400" : "bg-red-500"
                      )}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Simulated Storage Bucket Link and List from Firestore */}
            <div className="space-y-2 pt-2 border-t border-zinc-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Database className="w-3 h-3 text-zinc-500" />
                  <span className="text-[9px] text-zinc-400 font-black uppercase tracking-wider">Cloud Storage Bucket Records ({recordingsList.length})</span>
                </div>
                <span className="text-[8px] text-zinc-600 font-mono">gs://barca-live-broadcast-captures</span>
              </div>

              {recordingsList.length === 0 ? (
                <div className="bg-zinc-900/45 border border-dashed border-zinc-800/60 rounded-lg p-4 text-center">
                  <p className="text-[10px] text-zinc-500 uppercase font-black tracking-wider">No stream captures saved yet</p>
                  <p className="text-[9px] text-zinc-600 mt-1">Start recording above to save a live broadcast session directly to the cloud.</p>
                </div>
              ) : (
                <div className="max-h-[140px] overflow-y-auto space-y-1.5 pr-1">
                  {recordingsList.map((rec) => (
                    <div 
                      key={rec.id} 
                      className="bg-zinc-900/80 border border-zinc-850 hover:border-zinc-800 p-2.5 rounded-lg flex items-center justify-between gap-3 text-[10px] font-semibold transition-all group hover:bg-zinc-900"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-white font-black truncate uppercase text-[10px]">{rec.title}</span>
                          <span className="text-[8px] bg-amber-400/10 text-amber-400 border border-amber-400/15 rounded px-1.5 text-[8px] uppercase font-mono font-bold">
                            {(rec.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-500 text-[8px] font-mono flex-wrap">
                          <span>Track: {rec.trackTitle || "External mic stream"}</span>
                          <span>•</span>
                          <span>Time: {new Date(rec.durationSeconds * 1000).toISOString().substring(14, 19)}</span>
                          <span>•</span>
                          <span className="text-zinc-500 select-all font-semibold break-all">
                            GS: {rec.storageBucketUrl}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => deleteCloudRecording(rec.id)}
                        className="p-1 px-2 rounded hover:bg-red-500/10 hover:text-red-400 text-zinc-600 border border-transparent hover:border-red-500/10 cursor-pointer transition-all shrink-0"
                        title="Delete Capture"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Custom bouncing anim styles for VU meter */}
        <style>{`
          @keyframes bounceHeight {
            0% { height: 10%; }
            100% { height: 100%; }
          }
        `}</style>
      </div>
        </div>

        {/* Right Column: Preset Configuration & Switches */}
        <div className="space-y-6">
          {/* Preset Filters Selection Control Box */}
      <div className="bg-zinc-950/50 border border-zinc-900 rounded-2xl p-4.5 space-y-3 shadow-inner">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="space-y-0.5 text-left">
            <h4 className="text-[10px] font-black text-white uppercase tracking-wider">Console Module Preset Filters</h4>
            <p className="text-[8.5px] text-zinc-500 font-bold uppercase tracking-wider">
              Quickly scale and configure interactive workspace modules.
            </p>
          </div>
          <span className="text-[7.5px] text-zinc-500 font-mono font-bold uppercase tracking-widest bg-zinc-900 border border-zinc-850 px-2 py-0.5 rounded">
            Interactive Presets System
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          {/* Preset Preset: All Tools */}
          <button
            type="button"
            onClick={applyPresetFilterAll}
            className={cn(
              "flex-1 flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]",
              activePresetFilter === 'all_tools'
                ? "bg-amber-400/10 border-amber-400/30 text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.06)]"
                : "bg-zinc-900/40 border-zinc-850 text-zinc-400 hover:text-zinc-200 hover:border-zinc-800"
            )}
          >
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-1.5 rounded-lg shrink-0",
                activePresetFilter === 'all_tools' ? "bg-amber-400/10" : "bg-zinc-950"
              )}>
                <Wrench className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <span className="text-[9px] font-extrabold uppercase tracking-widest block">All Tools</span>
                <span className="text-[7.5px] text-zinc-500 font-semibold block uppercase">Enable everything</span>
              </div>
            </div>
            {activePresetFilter === 'all_tools' && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>

          {/* Preset Preset: Security Only */}
          <button
            type="button"
            onClick={applyPresetFilterSecurity}
            className={cn(
              "flex-1 flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]",
              activePresetFilter === 'security_only'
                ? "bg-blue-400/10 border-blue-400/30 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.06)]"
                : "bg-zinc-900/40 border-zinc-855 text-zinc-400 hover:text-zinc-200 hover:border-zinc-800"
            )}
          >
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-1.5 rounded-lg shrink-0",
                activePresetFilter === 'security_only' ? "bg-blue-400/10" : "bg-zinc-950"
              )}>
                <Shield className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <span className="text-[9px] font-extrabold uppercase tracking-widest block">Security Only</span>
                <span className="text-[7.5px] text-zinc-500 font-semibold block uppercase">Strict Admin Rules</span>
              </div>
            </div>
            {activePresetFilter === 'security_only' && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            )}
          </button>

          {/* Preset Preset: Audio Only */}
          <button
            type="button"
            onClick={applyPresetFilterAudio}
            className={cn(
              "flex-1 flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]",
              activePresetFilter === 'audio_only'
                ? "bg-emerald-400/10 border-emerald-400/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.06)]"
                : "bg-zinc-900/40 border-zinc-850 text-zinc-400 hover:text-zinc-200 hover:border-zinc-800"
            )}
          >
            <div className="flex items-center gap-2">
              <div className={cn(
                "p-1.5 rounded-lg shrink-0",
                activePresetFilter === 'audio_only' ? "bg-emerald-400/10" : "bg-zinc-950"
              )}>
                <Volume2 className="w-3.5 h-3.5" />
              </div>
              <div className="text-left">
                <span className="text-[9px] font-extrabold uppercase tracking-widest block">Audio Only</span>
                <span className="text-[7.5px] text-zinc-500 font-semibold block uppercase">Acoustic tools</span>
              </div>
            </div>
            {activePresetFilter === 'audio_only' && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            )}
          </button>
        </div>
      </div>

      {/* The Grid of 24 Controls */}
      <div className="space-y-2">
        <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest block">Interactive Modules Console:</span>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-3 gap-3">
          {SETTINGS_LIST.map((setting) => (
            <button
              key={setting.id}
              id={`setting-${setting.id}`}
              onClick={() => toggle(setting.id)}
              className={cn(
                "flex flex-col items-center justify-center p-3.5 rounded-2xl transition-all duration-300 gap-1.5 border hover:scale-[1.02] active:scale-[0.98] cursor-pointer",
                enabled[setting.id] 
                  ? "bg-amber-400/10 border-amber-400/20 text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.05)]" 
                  : "bg-zinc-850/40 border-zinc-800/60 text-zinc-600 hover:text-zinc-400 hover:border-zinc-700/60"
              )}
            >
              <setting.icon className="w-5 h-5 shrink-0" />
              <span className="text-[9px] font-black uppercase tracking-wider text-center">{setting.name}</span>
            </button>
          ))}
        </div>
      </div>
        </div>
      </div>

      {/* Network Health Real-time Diagnostics Panel */}
      <div className="bg-zinc-950/40 border border-zinc-850 p-5 rounded-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <Wifi className={cn("w-4 h-4", connStatus === 'connected' ? "text-emerald-400" : "text-rose-500")} />
            <div>
              <h3 className="text-xs font-black text-white uppercase tracking-widest">Network Health</h3>
              <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">Stream diagnostics & packet loss over 60s</p>
            </div>
          </div>
          <div className="flex items-center gap-3 bg-zinc-900/50 px-3 py-1.5 rounded-lg border border-zinc-800">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span className="text-[9px] text-zinc-400 font-bold uppercase">Jitter (ms)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              <span className="text-[9px] text-zinc-400 font-bold uppercase">Packet Loss (%)</span>
            </div>
          </div>
        </div>

        {/* Real-time Packet Loss Threshold Alert Board */}
        {(() => {
          const latestMetricsPoint = networkMetrics[networkMetrics.length - 1];
          const loss = latestMetricsPoint ? latestMetricsPoint.packetLoss : 0;
          
          let alertColor = "border-emerald-500/15 bg-emerald-500/5 text-emerald-400";
          let alertLabel = "Optimal Stream Quality";
          let alertDescription = "Packet drop is under 1%. Excellent WebRTC connection state with perfect audio clarity.";
          let dotColor = "bg-emerald-400";

          if (loss >= 5) {
            alertColor = "border-rose-500/25 bg-rose-500/5 text-rose-400";
            alertLabel = "Critical Signal Loss Link";
            alertDescription = "Packet drop exceeds 5%. High audio jitter and voice packet fragmentation detected.";
            dotColor = "bg-rose-400";
          } else if (loss >= 1) {
            alertColor = "border-amber-500/20 bg-amber-500/5 text-amber-400";
            alertLabel = "Slight Network Congestion";
            alertDescription = "Packet drop is between 1% and 5%. Minor signal variance detected. Live stream remains active.";
            dotColor = "bg-amber-400";
          }

          return (
            <div className={`grid grid-cols-1 md:grid-cols-12 gap-4 p-4 rounded-xl border ${alertColor} transition-all duration-300`}>
              <div className="md:col-span-4 flex flex-col justify-center border-b md:border-b-0 md:border-r border-zinc-800/80 pb-3 md:pb-0 md:pr-4">
                <span className="text-[8px] text-zinc-500 font-black uppercase tracking-widest block mb-0.5">Live Packet Loss Rate</span>
                <div className="flex items-baseline gap-1.5">
                  <h4 className="text-xl font-black font-mono text-white">{loss.toFixed(2)}%</h4>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 leading-none">Drop</span>
                </div>
              </div>
              <div className="md:col-span-8 flex items-center gap-3 pl-1">
                <div className="relative flex h-2.5 w-2.5 shrink-0">
                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColor}`} />
                  <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${dotColor}`} />
                </div>
                <div>
                  <h5 className="text-[10px] font-black uppercase tracking-wider text-white">{alertLabel}</h5>
                  <p className="text-[9px] text-zinc-400 font-medium leading-normal mt-0.5">{alertDescription}</p>
                </div>
              </div>
            </div>
          );
        })()}
        
        <div className="h-48 w-full bg-zinc-950 rounded-xl p-4 border border-zinc-900">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={networkMetrics} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
              <XAxis 
                dataKey="time" 
                stroke="#52525b" 
                fontSize={9} 
                tickMargin={10} 
                axisLine={false} 
                tickLine={false} 
                minTickGap={20}
              />
              <YAxis 
                yAxisId="left"
                stroke="#52525b" 
                fontSize={9} 
                axisLine={false} 
                tickLine={false}
                domain={[0, 'dataMax + 10']}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                stroke="#52525b" 
                fontSize={9} 
                axisLine={false} 
                tickLine={false}
                domain={[0, 100]}
                hide={true}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '8px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 900 }}
                itemStyle={{ fontWeight: 900 }}
                labelStyle={{ color: '#a1a1aa', marginBottom: '4px' }}
              />
              <Line 
                yAxisId="left"
                type="monotone" 
                dataKey="jitter" 
                stroke="#fbbf24" 
                strokeWidth={2} 
                dot={false}
                isAnimationActive={true}
                animationDuration={1200}
                animationEasing="ease-in-out"
                activeDot={{ r: 4, fill: "#fbbf24", stroke: "#000", strokeWidth: 2 }}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="packetLoss" 
                stroke="#fb7185" 
                strokeWidth={2} 
                dot={false}
                isAnimationActive={true}
                animationDuration={1200}
                animationEasing="ease-in-out"
                activeDot={{ r: 4, fill: "#fb7185", stroke: "#000", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
