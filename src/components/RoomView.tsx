/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ModerationTools from './ModerationTools';
import Games from './Games';
import UserTasks from './UserTasks';
import ResellerCoinSystem from './ResellerCoinSystem';
import { X, Mic, MicOff, Video, VideoOff, MessageSquare, Gift, Share2, Users, Star, MoreHorizontal, Send, ShieldAlert, Slash, Shield, ShieldCheck, Settings, Coins, Plus, Play, Pause, Volume2, VolumeX, Lock, Unlock, Wand2, Sparkles, Ghost, Bot, Music, Volume1, Radio, Trash2, Trophy, Bell, Key, ChevronDown, TrendingUp, Sparkle, Search, User, Target, Gamepad2 } from 'lucide-react';
import { cn } from '../lib/utils';
import Gifts from './Gifts';
import ChatSidebar from './ChatSidebar';
import RoomAnalytics from './RoomAnalytics';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query as firestoreQuery, orderBy as firestoreOrderBy, limit as firestoreLimit, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, getDoc, setDoc, arrayUnion, arrayRemove, increment } from 'firebase/firestore';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  createdAt: any;
}

interface RoomViewProps {
  room: {
    id: string;
    title: string;
    host: string;
    hostId: string;
    type: 'voice' | 'video';
    tier?: string;
    description?: string;
  };
  isHost?: boolean;
  onLeave: () => void;
}

export default function RoomView({ room, isHost, onLeave }: RoomViewProps) {
  const [seats, setSeats] = React.useState<{ id: number, occupied: boolean, user: any, isLocked?: boolean }[]>(() => 
    Array.from({ length: 24 }).map((_, i) => ({
      id: i,
      occupied: false,
      user: null,
      isLocked: false
    }))
  );

  const [isMuted, setIsMuted] = React.useState(false);
  const [localStream, setLocalStream] = React.useState<MediaStream | null>(null);
  
  const currentUserDisplayName = auth.currentUser?.displayName || 'Guest_2';

  const toggleMyMute = async (muted: boolean) => {
    const mySeat = seats.find(s => s.user?.name === currentUserDisplayName);
    if (mySeat) {
      const newSeats = seats.map(s => 
        s.user?.name === currentUserDisplayName ? { ...s, user: { ...s.user, isMuted: muted } } : s
      );
      if (room.id.startsWith('room_')) {
        setSeats(newSeats);
        return;
      }
      try {
        await updateDoc(doc(db, 'rooms', room.id), { seats: newSeats });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `rooms/${room.id}`);
      }
    }
  };

  React.useEffect(() => {
    const connectVoice = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        setLocalStream(stream);
        setMicPermissionError(false);
      } catch (err) {
        console.error("Failed to get microphone", err);
        setMicPermissionError(true);
      }
    };

    const isMeOnSeat = seats.some(s => s.occupied && s.user?.name === currentUserDisplayName);
    if (isMeOnSeat && !localStream) {
      connectVoice();
    } else if (!isMeOnSeat && localStream) {
      localStream.getTracks().forEach(t => t.stop());
      setLocalStream(null);
    }
  }, [seats, localStream, currentUserDisplayName]);

  React.useEffect(() => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
    }
  }, [isMuted, localStream]);

  React.useEffect(() => {
    const mySeat = seats.find(s => s.occupied && s.user?.name === currentUserDisplayName);
    if (mySeat) {
      setIsMuted(!!mySeat.user?.isMuted);
    }
  }, [seats, currentUserDisplayName]);

  const [shakingSeatId, setShakingSeatId] = React.useState<number | null>(null);
  const [showGifts, setShowGifts] = React.useState(false);
  const [showHostConsole, setShowHostConsole] = React.useState(false);
  const [showModeration, setShowModeration] = React.useState(false);
  const [showMinigames, setShowMinigames] = React.useState(false);
  const [showDiscover, setShowDiscover] = React.useState(false);
  const [showTaskAgent, setShowTaskAgent] = React.useState(false);
  const [showMe, setShowMe] = React.useState(false);
  const [showResellerCoin, setShowResellerCoin] = React.useState(false);
  const [micPermissionError, setMicPermissionError] = React.useState(false);
  const [showVoiceFX, setShowVoiceFX] = React.useState(false);
  const [selectedConsoleUser, setSelectedConsoleUser] = React.useState<string | null>(null);
  const [selectedVoiceEffect, setSelectedVoiceEffect] = React.useState('none');
  const [selectedEffectParamTab, setSelectedEffectParamTab] = React.useState('deep');
  const [customProfileName, setCustomProfileName] = React.useState('');
  const [voiceFXEnabled, setVoiceFXEnabled] = React.useState(true);
  const [voiceSettings, setVoiceSettings] = React.useState<Record<string, { pitch: number, reverb: number, echo: number, clarity: number }>>({
    none: { pitch: 50, reverb: 0, echo: 0, clarity: 80 },
    deep: { pitch: 20, reverb: 30, echo: 10, clarity: 70 },
    helium: { pitch: 90, reverb: 10, echo: 5, clarity: 90 },
    robotic: { pitch: 50, reverb: 15, echo: 40, clarity: 60 },
    ghost: { pitch: 55, reverb: 85, echo: 60, clarity: 40 },
    echo: { pitch: 50, reverb: 95, echo: 80, clarity: 50 },
  });
  const [roomTitle, setRoomTitle] = React.useState(room.title);
  const [roomDescription, setRoomDescription] = React.useState(room.description || '');
  const [streamQuality, setStreamQuality] = React.useState('1080p');
  const [activeConsoleTab, setActiveConsoleTab] = React.useState<'broadcast' | 'requests' | 'users' | 'permissions' | 'settings'>('broadcast');
  const [selectedUserToModerate, setSelectedUserToModerate] = React.useState<any>(null);
  const [isPurchaseMode, setIsPurchaseMode] = React.useState(false);
  const [directMessageTarget, setDirectMessageTarget] = React.useState<string | null>(null);
  const [directMessages, setDirectMessages] = React.useState<any[]>([]);
  const [directMessageText, setDirectMessageText] = React.useState('');
  const [volume, setVolume] = React.useState(80);
  const [isMutedVideo, setIsMutedVideo] = React.useState(false);
  const [isPrivate, setIsPrivate] = React.useState(false);
  const [entryFee, setEntryFee] = React.useState(100);
  const [chatMessage, setChatMessage] = React.useState('');
  const [messages, setMessages] = React.useState<Message[]>([]);
  const chatEndRef = React.useRef<HTMLDivElement>(null);
  const [timeLeft, setTimeLeft] = React.useState(3600); // 1 hour simulation
  const [isLocalVideoOn, setIsLocalVideoOn] = React.useState(false);
  const [requestedSeats, setRequestedSeats] = React.useState<{ userId: string, userName: string, seatId: number }[]>([]);
  const [entryEffectsEnabled, setEntryEffectsEnabled] = React.useState(true);
  const [activeEntryEffects, setActiveEntryEffects] = React.useState<number[]>([]);
  const [activeGift, setActiveGift] = React.useState<any>(null);
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isBgmEnabled, setIsBgmEnabled] = React.useState(true);
  const [activeSeatInfoId, setActiveSeatInfoId] = React.useState<number | null>(null);
  const [roomPassword, setRoomPassword] = React.useState('');
  const [showChat, setShowChat] = React.useState(true);
  const [chatLimit, setChatLimit] = React.useState(50);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);

  const [hostProfileDetail, setHostProfileDetail] = React.useState<any>(null);
  const [showHostCard, setShowHostCard] = React.useState(false);

  React.useEffect(() => {
    if (!room?.hostId) return;
    const hostRef = doc(db, 'users', room.hostId);
    const unsub = onSnapshot(hostRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setHostProfileDetail(data);
      } else {
        setHostProfileDetail({
          displayName: room.host,
          performance: 82,
          bio: 'Verified host, running active rooms and direct studio streams under Barca Protection.',
          category: 'Social Room',
          isFaceVerified: true
        });
      }
    }, (error) => {
      console.warn("Could not load host details dynamically:", error);
      setHostProfileDetail({
        displayName: room.host,
        performance: 82,
        bio: 'Verified host, running active rooms and direct studio streams under Barca Protection.',
        category: 'Social Room',
        isFaceVerified: true
      });
    });
    return () => unsub();
  }, [room?.hostId, room?.host]);

  // Synchronized Room background music player with premier dual channel cross-fader
  const [broadcastBgm, setBroadcastBgm] = React.useState<any>(null);
  const bgmAudioRefA = React.useRef<HTMLAudioElement | null>(null);
  const bgmAudioRefB = React.useRef<HTMLAudioElement | null>(null);
  const [bgmActiveChannel, setBgmActiveChannel] = React.useState<'A' | 'B'>('A');
  const bgmFadeIntervalRef = React.useRef<any>(null);
  const bgmLoadedUrlRef = React.useRef<string>('');

  React.useEffect(() => {
    const unsub = onSnapshot(doc(db, 'global_music', 'broadcast'), (snapshot) => {
      if (snapshot.exists()) {
        setBroadcastBgm(snapshot.data());
      }
    }, (err) => {
      console.warn("Failed to subscribe to room synced BGM:", err);
    });
    return () => unsub();
  }, []);

  React.useEffect(() => {
    if (!bgmAudioRefA.current) {
      bgmAudioRefA.current = new Audio();
    }
    if (!bgmAudioRefB.current) {
      bgmAudioRefB.current = new Audio();
    }

    const currentBgm = bgmActiveChannel === 'A' ? bgmAudioRefA.current : bgmAudioRefB.current;
    const nextBgm = bgmActiveChannel === 'A' ? bgmAudioRefB.current : bgmAudioRefA.current;

    const baseVolume = isBgmEnabled ? 0.35 : 0; // Soft baseline volume

    // Determine incoming stream
    let targetUrl = '';
    if (isBgmEnabled && broadcastBgm && broadcastBgm.isPlaying) {
      if (broadcastBgm.playbackUrl === 'device') {
        targetUrl = 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3';
      } else {
        targetUrl = broadcastBgm.playbackUrl;
      }
    }

    // A. Pause condition
    if (!targetUrl) {
      if (bgmFadeIntervalRef.current) {
        clearInterval(bgmFadeIntervalRef.current);
      }
      const fadeDuration = 800;
      const intervalTime = 40;
      const totalSteps = fadeDuration / intervalTime;
      let step = 0;
      const initialVol = currentBgm.volume;

      bgmFadeIntervalRef.current = setInterval(() => {
        step++;
        const progress = step / totalSteps;
        currentBgm.volume = Math.max(0, initialVol * (1 - progress));
        if (step >= totalSteps) {
          if (bgmFadeIntervalRef.current) clearInterval(bgmFadeIntervalRef.current);
          currentBgm.pause();
          currentBgm.volume = 0;
          bgmLoadedUrlRef.current = '';
        }
      }, intervalTime);

      nextBgm.pause();
      nextBgm.volume = 0;
      return;
    }

    // B. Resume / Volume tweak on same URL
    if (targetUrl === bgmLoadedUrlRef.current) {
      if (currentBgm.paused) {
        currentBgm.volume = 0;
        if (broadcastBgm.startedAt) {
          const elapsed = (Date.now() - broadcastBgm.startedAt) / 1000;
          if (elapsed > 0) {
            currentBgm.currentTime = elapsed % (broadcastBgm.duration || 180);
          }
        }
        currentBgm.play().then(() => {
          if (bgmFadeIntervalRef.current) clearInterval(bgmFadeIntervalRef.current);
          const fadeDuration = 800;
          const intervalTime = 40;
          const totalSteps = fadeDuration / intervalTime;
          let step = 0;
          bgmFadeIntervalRef.current = setInterval(() => {
            step++;
            const progress = step / totalSteps;
            currentBgm.volume = Math.min(baseVolume, baseVolume * progress);
            if (step >= totalSteps) {
              if (bgmFadeIntervalRef.current) clearInterval(bgmFadeIntervalRef.current);
              currentBgm.volume = baseVolume;
            }
          }, intervalTime);
        }).catch(err => {
          console.warn("Ambient background music resumed deferred until client interaction:", err);
          currentBgm.volume = baseVolume;
        });
      } else {
        currentBgm.volume = baseVolume;
      }
      return;
    }

    // C. Transitioning switch to next track - cross-fading beautifully
    if (bgmFadeIntervalRef.current) {
      clearInterval(bgmFadeIntervalRef.current);
    }

    nextBgm.src = targetUrl;
    nextBgm.load();

    if (broadcastBgm.startedAt) {
      const elapsed = (Date.now() - broadcastBgm.startedAt) / 1000;
      if (elapsed > 0) {
        nextBgm.currentTime = elapsed % (broadcastBgm.duration || 180);
      }
    }

    nextBgm.volume = 0;
    nextBgm.play().then(() => {
      const fadeDuration = 1500;
      const intervalTime = 40;
      const totalSteps = fadeDuration / intervalTime;
      let step = 0;
      const initialVol = currentBgm.volume;

      bgmFadeIntervalRef.current = setInterval(() => {
        step++;
        const progress = step / totalSteps;

        currentBgm.volume = Math.max(0, initialVol * (1 - progress));
        nextBgm.volume = Math.min(baseVolume, baseVolume * progress);

        if (step >= totalSteps) {
          if (bgmFadeIntervalRef.current) clearInterval(bgmFadeIntervalRef.current);
          currentBgm.pause();
          currentBgm.volume = 0;
          nextBgm.volume = baseVolume;
          setBgmActiveChannel(bgmActiveChannel === 'A' ? 'B' : 'A');
          bgmLoadedUrlRef.current = targetUrl;
        }
      }, intervalTime);
    }).catch(err => {
      console.warn("Client side room background music switch failed / deferred:", err);
      if (bgmFadeIntervalRef.current) clearInterval(bgmFadeIntervalRef.current);
      currentBgm.pause();
      currentBgm.volume = 0;
      nextBgm.volume = baseVolume;
      setBgmActiveChannel(bgmActiveChannel === 'A' ? 'B' : 'A');
      bgmLoadedUrlRef.current = targetUrl;
    });

  }, [broadcastBgm, isBgmEnabled]);

  // Clean up audience audio loop layers on unmount
  React.useEffect(() => {
    return () => {
      if (bgmFadeIntervalRef.current) clearInterval(bgmFadeIntervalRef.current);
      if (bgmAudioRefA.current) {
        bgmAudioRefA.current.pause();
        bgmAudioRefA.current = null;
      }
      if (bgmAudioRefB.current) {
        bgmAudioRefB.current.pause();
        bgmAudioRefB.current = null;
      }
    };
  }, []);

  // Sit & Earn States
  const [showSitEarnPanel, setShowSitEarnPanel] = React.useState(false);
  const [userRegDate, setUserRegDate] = React.useState<Date | null>(null);
  const [sitEarnState, setSitEarnState] = React.useState({
    durationSeconds: 0,
    claimedHalf: false,
    claimedFull: false,
    lastUpdated: new Date()
  });
  const [localDuration, setLocalDuration] = React.useState<number>(0);
  const [isClaimingReward, setIsClaimingReward] = React.useState<string | null>(null);

  const handleUpdateRoomSettings = async (updates: any) => {
    if (room.id.startsWith('room_')) return;
    try {
      await updateDoc(doc(db, 'rooms', room.id), updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${room.id}`);
    }
  };

  // 24 seat simulation logic
  // Dynamic Seats State

  const prevSeatsRef = React.useRef(seats);

  const [blockedUsers, setBlockedUsers] = React.useState<string[]>([]);
  const [bannedUsers, setBannedUsers] = React.useState<string[]>([]);
  const [followedUsers, setFollowedUsers] = React.useState<string[]>([]);

  // Sync blocked users from user profile
  React.useEffect(() => {
    if (!auth.currentUser) return;
    const blockedRef = collection(db, 'users', auth.currentUser.uid, 'blocked');
    const unsub = onSnapshot(blockedRef, (snap) => {
      setBlockedUsers(snap.docs.map(d => d.id));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${auth.currentUser?.uid}/blocked`);
    });
    return () => unsub();
  }, []);

  // Sync followed users from user profile
  React.useEffect(() => {
    if (!auth.currentUser) return;
    const followedRef = collection(db, 'users', auth.currentUser.uid, 'following');
    const unsub = onSnapshot(followedRef, (snap) => {
      setFollowedUsers(snap.docs.map(d => d.id));
    }, (error) => {
      console.warn("Followed users fetch warning:", error);
    });
    return () => unsub();
  }, []);

  const toggleFollow = async (userName: string) => {
    if (!auth.currentUser) return;
    const followingRef = doc(db, 'users', auth.currentUser.uid, 'following', userName);
    try {
      if (followedUsers.includes(userName)) {
        await deleteDoc(followingRef);
      } else {
        await setDoc(followingRef, { followedAt: serverTimestamp() });
      }
    } catch (error) {
      console.error("Failed to follow/unfollow:", error);
    }
  };

  // Sync user registration and Sitting rewards
  const todayStr = React.useMemo(() => new Date().toISOString().split('T')[0], []);
  
  const isNewUser = React.useMemo(() => {
    if (!userRegDate) return false;
    return (new Date().getTime() - userRegDate.getTime()) < (8 * 24 * 60 * 60 * 1000);
  }, [userRegDate]);

  React.useEffect(() => {
    if (!auth.currentUser) return;
    const userRef = doc(db, 'users', auth.currentUser.uid);
    getDoc(userRef).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.createdAt) {
          setUserRegDate(data.createdAt.toDate ? data.createdAt.toDate() : new Date(data.createdAt));
        } else {
          setUserRegDate(new Date());
        }
      }
    }).catch(e => {
      console.error("Error loading user profile", e);
      setUserRegDate(new Date());
    });
  }, []);

  React.useEffect(() => {
    if (!auth.currentUser) return;
    const sitRef = doc(db, 'users', auth.currentUser.uid, 'sitting_rewards', todayStr);
    const unsub = onSnapshot(sitRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setSitEarnState({
          durationSeconds: data.durationSeconds || 0,
          claimedHalf: data.claimedHalf || false,
          claimedFull: data.claimedFull || false,
          lastUpdated: data.lastUpdated ? data.lastUpdated.toDate() : new Date()
        });
      } else {
        setSitEarnState({
          durationSeconds: 0,
          claimedHalf: false,
          claimedFull: false,
          lastUpdated: new Date()
        });
      }
    }, (err) => {
      console.error("Error observing sitting rewards", err);
    });

    return () => unsub();
  }, [todayStr]);

  // Sync state duration seconds to localDuration
  React.useEffect(() => {
    setLocalDuration(sitEarnState.durationSeconds);
  }, [sitEarnState.durationSeconds]);

  const isUserSitting = React.useMemo(() => {
    return seats.some(s => s.occupied && s.user?.name === currentUserDisplayName);
  }, [seats, currentUserDisplayName]);

  // Sitting progress real-time ticker
  React.useEffect(() => {
    if (!isUserSitting) return;

    const interval = setInterval(() => {
      setLocalDuration(prev => {
        const next = prev + 1;
        
        // Every 10 seconds, backup to Firestore
        if (next % 10 === 0 && auth.currentUser) {
          const sitRef = doc(db, 'users', auth.currentUser.uid, 'sitting_rewards', todayStr);
          setDoc(sitRef, {
            durationSeconds: next,
            lastUpdated: serverTimestamp()
          }, { merge: true }).catch(err => console.error("Error backing up sit seconds", err));
        }
        
        return next;
      });
    }, 1000);

    return () => {
      clearInterval(interval);
      // Immediately save progress when stopping sitting
      if (auth.currentUser) {
        setLocalDuration(currentVal => {
          const sitRef = doc(db, 'users', auth.currentUser.uid, 'sitting_rewards', todayStr);
          setDoc(sitRef, {
            durationSeconds: currentVal,
            lastUpdated: serverTimestamp()
          }, { merge: true }).catch(err => console.error("Final persist error", err));
          return currentVal;
        });
      }
    };
  }, [isUserSitting, todayStr]);

  const claimSittingReward = async (isHalf: boolean) => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    const typeStr = isHalf ? 'half' : 'full';
    
    setIsClaimingReward(typeStr);
    
    try {
      const sitRef = doc(db, 'users', userId, 'sitting_rewards', todayStr);
      
      const snap = await getDoc(sitRef);
      const data = snap.data() || {};
      if (isHalf && data.claimedHalf) return;
      if (!isHalf && data.claimedFull) return;

      const rewardCoins = isNewUser
        ? 10000000
        : 5000000;

      await setDoc(sitRef, {
        [isHalf ? 'claimedHalf' : 'claimedFull']: true,
        durationSeconds: localDuration,
        lastUpdated: serverTimestamp()
      }, { merge: true });

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        coins: increment(rewardCoins)
      });

      await addDoc(collection(db, 'users', userId, 'transactions'), {
        type: 'reward',
        amount: rewardCoins,
        description: `Claimed Sit & Earn (${isHalf ? '1 Hour' : '2 Hours'} milestone) as ${isNewUser ? 'New User' : 'Established User'}`,
        createdAt: serverTimestamp(),
        status: 'completed'
      });

      alert(`Success! Deposited +${rewardCoins.toLocaleString()} Coins directly into your balance.`);
    } catch (err) {
      console.error("Error claiming reward", err);
    } finally {
      setIsClaimingReward(null);
    }
  };

  // Sync with Firestore
  React.useEffect(() => {
    const roomRef = doc(db, 'rooms', room.id);
    
    // Ensure room exists for simulation if joined from discover
    const initRoom = async () => {
      try {
        const snap = await getDoc(roomRef);
        if (!snap.exists()) {
          await setDoc(roomRef, {
            id: room.id,
            title: room.title,
            hostId: auth.currentUser?.uid || room.host,
            type: room.type,
            status: 'live',
            viewerCount: 1200,
            seats: seats,
            settings: {
              entryEffectsEnabled: true,
              voiceFXEnabled: true,
              isPrivate: false,
              entryFee: 100
            },
            bannedUsers: [],
            createdAt: serverTimestamp()
          });
        }
      } catch (err) {
        // Might be permission issue if not owner, ignore as this is for simulation/realism mix
      }
    };
    initRoom();

    const unsubscribe = onSnapshot(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.seats) {
          // Detect new joins
          const newSeats = data.seats;
          const currentEntryEffectsEnabled = data.settings?.entryEffectsEnabled ?? true;
          
          if (currentEntryEffectsEnabled) {
            newSeats.forEach((seat: any, index: number) => {
              const prevSeat = prevSeatsRef.current[index];
              if (seat.occupied && (!prevSeat || !prevSeat.occupied)) {
                // Someone joined!
                setActiveEntryEffects(prev => [...prev, seat.id]);
                setTimeout(() => {
                  setActiveEntryEffects(prev => prev.filter(id => id !== seat.id));
                }, 3000);
              }
            });
          }
          
          setSeats(newSeats);
          prevSeatsRef.current = newSeats;
        }
        if (data.settings) {
          setEntryEffectsEnabled(data.settings.entryEffectsEnabled ?? true);
          setVoiceFXEnabled(data.settings.voiceFXEnabled ?? true);
          setIsBgmEnabled(data.settings.isBgmEnabled ?? true);
          setIsPrivate(data.settings.isPrivate ?? false);
          setEntryFee(data.settings.entryFee ?? 100);
          setRoomPassword(data.settings.password || '');
          if (data.settings.voiceSettings) {
            setVoiceSettings(data.settings.voiceSettings);
          }
        }
        if (data.bannedUsers) {
          setBannedUsers(data.bannedUsers);
        }
        if (data.title) setRoomTitle(data.title);
        if (data.description !== undefined) setRoomDescription(data.description);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `rooms/${room.id}`);
    });

    return () => unsubscribe();
  }, [room.id]);

  // Daily Bonus Heartbeat tracking
  React.useEffect(() => {
    if (!auth.currentUser) return;
    const userId = auth.currentUser.uid;
    
    const sendHeartbeat = async () => {
      try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) return;
        
        const data = userSnap.data();
        const today = new Date().toISOString().split('T')[0];
        
        if (data.lastHeatbeatDate !== today) {
           await updateDoc(userRef, {
             minutesInRoomToday: 1,
             lastHeatbeatDate: today
           });
        } else {
           await updateDoc(userRef, {
             minutesInRoomToday: increment(1)
           });
           
           // Auto-complete the engagement task if they hit 60 mins today
           if ((data.minutesInRoomToday || 0) + 1 >= 60) {
             const completionRef = doc(db, `users/${userId}/task_completions/engagement`);
             const completionSnap = await getDoc(completionRef);
             
             if (!completionSnap.exists()) {
               const isNewUser = data.createdAt 
                 ? (new Date().getTime() - data.createdAt.toDate().getTime()) < 8 * 24 * 60 * 60 * 1000 
                 : false;
               const rewardAmount = isNewUser ? 2000 : 1000;
               
               await setDoc(completionRef, {
                 completedAt: serverTimestamp(),
                 rewardClaimed: rewardAmount,
                 autoCompleted: true
               });
               
               await updateDoc(userRef, {
                 coins: increment(rewardAmount)
               });
               
               await addDoc(collection(db, "coin_transactions"), {
                 type: "reward",
                 targetUserId: userId,
                 targetUserName: data.displayName || "Platform User",
                 amount: rewardAmount,
                 description: "Completed: Stay active in room for 1 hour. (Auto)",
                 createdAt: new Date().toISOString(),
                 status: 'completed'
               });
             }
           }
        }
      } catch (e) {
        console.error("Heartbeat failed", e);
      }
    };

    // Send initial heartbeat
    sendHeartbeat();

    // Send every minute
    const interval = setInterval(sendHeartbeat, 60000);
    return () => clearInterval(interval);
  }, []);

  const toggleEntryEffects = async () => {
    const newVal = !entryEffectsEnabled;
    setEntryEffectsEnabled(newVal); // Optimistic update
    if (room.id.startsWith('room_')) return;
    try {
      await updateDoc(doc(db, 'rooms', room.id), {
        'settings.entryEffectsEnabled': newVal
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${room.id}`);
    }
  };

  const toggleBgm = async () => {
    const newVal = !isBgmEnabled;
    setIsBgmEnabled(newVal); // Optimistic update
    if (room.id.startsWith('room_')) return;
    try {
      await updateDoc(doc(db, 'rooms', room.id), {
        'settings.isBgmEnabled': newVal
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${room.id}`);
    }
  };

  // Sync local video state with seat data for demo
  React.useEffect(() => {
    setSeats(prev => prev.map(s => 
      s.user?.name === 'Guest_2' ? { ...s, user: { ...s.user, videoEnabled: isLocalVideoOn } } : s
    ));
  }, [isLocalVideoOn]);

  React.useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const muteUser = async (userName: string) => {
    const newSeats = seats.map(s => 
      s.user?.name === userName ? { ...s, user: { ...s.user, isMuted: !s.user.isMuted } } : s
    );
    if (room.id.startsWith('room_')) {
      setSeats(newSeats);
      setSelectedUserToModerate((prev: any) => ({ ...prev, isMuted: !prev.isMuted }));
      return;
    }
    try {
      await updateDoc(doc(db, 'rooms', room.id), { seats: newSeats });
      setSelectedUserToModerate((prev: any) => ({ ...prev, isMuted: !prev.isMuted }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${room.id}`);
    }
  };

  const toggleVideoUser = async (userName: string) => {
    const newSeats = seats.map(s => 
      s.user?.name === userName ? { ...s, user: { ...s.user, videoEnabled: !s.user.videoEnabled } } : s
    );
    if (room.id.startsWith('room_')) {
      setSeats(newSeats);
      setSelectedUserToModerate((prev: any) => ({ ...prev, videoEnabled: !prev.videoEnabled }));
      return;
    }
    try {
      await updateDoc(doc(db, 'rooms', room.id), { seats: newSeats });
      setSelectedUserToModerate((prev: any) => ({ ...prev, videoEnabled: !prev.videoEnabled }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${room.id}`);
    }
  };

  const kickUser = async (userName: string) => {
    const newSeats = seats.map(s => 
      s.user?.name === userName ? { ...s, occupied: false, user: null } : s
    );
    if (room.id.startsWith('room_')) {
      setSeats(newSeats);
      setSelectedUserToModerate(null);
      return;
    }
    try {
      await updateDoc(doc(db, 'rooms', room.id), { seats: newSeats });
      setSelectedUserToModerate(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${room.id}`);
    }
  };

  const unbanUser = async (userName: string) => {
    if (room.id.startsWith('room_')) {
      setBannedUsers(prev => prev.filter(u => u !== userName));
      return;
    }
    try {
      await updateDoc(doc(db, 'rooms', room.id), {
        bannedUsers: arrayRemove(userName)
      });
      setBannedUsers(prev => prev.filter(u => u !== userName));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${room.id}`);
    }
  };

  const banUser = async (userName: string) => {
    if (room.id.startsWith('room_')) {
      setBannedUsers(prev => [...prev, userName]);
      await kickUser(userName);
      return;
    }
    try {
      await updateDoc(doc(db, 'rooms', room.id), {
        bannedUsers: arrayUnion(userName)
      });
      setBannedUsers(prev => [...prev, userName]);
      await kickUser(userName);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${room.id}`);
    }
  };

  const stripFX = async (userName: string) => {
    const newSeats = seats.map(s => 
      s.user?.name === userName ? { ...s, user: { ...s.user, voiceEffect: 'none' } } : s
    );
    if (room.id.startsWith('room_')) {
      setSeats(newSeats);
      setSelectedUserToModerate(prev => ({ ...prev, voiceEffect: 'none' }));
      return;
    }
    try {
      await updateDoc(doc(db, 'rooms', room.id), { seats: newSeats });
      setSelectedUserToModerate(prev => ({ ...prev, voiceEffect: 'none' }));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${room.id}`);
    }
  };

  const adjustUserVolume = async (userName: string, volume: number) => {
    const newSeats = seats.map(s => 
      s.user?.name === userName ? { ...s, user: { ...s.user, volume } } : s
    );
    if (room.id.startsWith('room_')) {
      setSeats(newSeats);
      if (selectedUserToModerate?.name === userName) {
        setSelectedUserToModerate((prev: any) => ({ ...prev, volume }));
      }
      return;
    }
    try {
      await updateDoc(doc(db, 'rooms', room.id), { seats: newSeats });
      if (selectedUserToModerate?.name === userName) {
        setSelectedUserToModerate((prev: any) => ({ ...prev, volume }));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${room.id}`);
    }
  };

  const applyVoiceEffect = async (userName: string, effect: string) => {
    const newSeats = seats.map(s => 
      s.user?.name === userName ? { ...s, user: { ...s.user, voiceEffect: effect } } : s
    );
    if (room.id.startsWith('room_')) {
      setSeats(newSeats);
      if (selectedUserToModerate?.name === userName) {
        setSelectedUserToModerate((prev: any) => ({ ...prev, voiceEffect: effect }));
      }
      return;
    }
    try {
      await updateDoc(doc(db, 'rooms', room.id), { seats: newSeats });
      if (selectedUserToModerate?.name === userName) {
        setSelectedUserToModerate((prev: any) => ({ ...prev, voiceEffect: effect }));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${room.id}`);
    }
  };

  const acceptRequest = async (request: { userId: string, userName: string, seatId: number }) => {
    const nextEmptySeat = seats.find(s => !s.occupied);
    if (!nextEmptySeat) return;

    const newUser = { 
      name: request.userName, 
      avatar: `https://i.pravatar.cc/100?u=${request.userId}`, 
      videoEnabled: false,
      isMuted: false
    };

    const newSeats = seats.map(s => 
      s.id === nextEmptySeat.id 
        ? { ...s, occupied: true, user: newUser }
        : s
    );
    setSeats(newSeats);

    setRequestedSeats(prev => prev.filter(r => r.seatId !== request.seatId));

    if (room.id.startsWith('room_')) {
      return;
    }

    try {
      await updateDoc(doc(db, 'rooms', room.id), { seats: newSeats });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${room.id}`);
    }
  };

  const toggleBlock = async (userName: string) => {
    if (!auth.currentUser) return;
    const blockedRef = doc(db, 'users', auth.currentUser.uid, 'blocked', userName);
    try {
      if (blockedUsers.includes(userName)) {
        await deleteDoc(blockedRef);
      } else {
        await setDoc(blockedRef, { blockedAt: serverTimestamp() });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `users/${auth.currentUser.uid}/blocked/${userName}`);
    }
  };

  const initialMessagesLoadedRef = React.useRef(false);

  // Real-time chat listener
  React.useEffect(() => {
    if (room.id.startsWith('room_')) return;

    const messagesRef = collection(db, 'rooms', room.id, 'messages');
    const q = firestoreQuery(messagesRef, firestoreOrderBy('createdAt', 'asc'), firestoreLimit(chatLimit));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (initialMessagesLoadedRef.current) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            // Trigger animation for newly added gifts for everyone except the sender 
            // (sender already triggers it locally for immediate feedback)
            if (data.giftData && data.actualSenderId !== auth.currentUser?.uid) {
              setActiveGift(data.giftData);
              setTimeout(() => setActiveGift(null), 3500);
            }
          }
        });
      } else {
        initialMessagesLoadedRef.current = true;
      }

      const newMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(newMessages);
      setIsLoadingMore(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `rooms/${room.id}/messages`);
      setIsLoadingMore(false);
    });

    return () => unsubscribe();
  }, [room.id, chatLimit]);

  // Scroll to bottom when messages change
  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (text?: string) => {
    const messageText = typeof text === 'string' ? text : chatMessage;
    if (!messageText.trim() || !auth.currentUser) return;

    const originalMessage = messageText;
    if (typeof text !== 'string') setChatMessage('');

    if (room.id.startsWith('room_')) {
      const newMsg = {
        id: Math.random().toString(),
        senderId: auth.currentUser.uid,
        senderName: auth.currentUser.displayName || 'Guest',
        text: originalMessage,
        createdAt: new Date()
      };
      setMessages(prev => [...prev, newMsg as Message]);
      return;
    }

    try {
      await addDoc(collection(db, 'rooms', room.id, 'messages'), {
        senderId: auth.currentUser.uid,
        senderName: auth.currentUser.displayName || 'Guest',
        text: originalMessage,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `rooms/${room.id}/messages`);
      setChatMessage(originalMessage);
    }
  };

  const handleSendGift = async (gift: any, target: 'host' | 'self') => {
    if (!auth.currentUser) return;
    const senderRef = doc(db, 'users', auth.currentUser.uid);
    const receiverId = target === 'host' ? room.hostId : auth.currentUser.uid;
    if (!receiverId) return;
    const receiverRef = doc(db, 'users', receiverId);

    try {
      const userDoc = await getDoc(senderRef);
      if (userDoc.exists() && userDoc.data().coins >= gift.price) {
        // Atomic transaction replacement
        await updateDoc(senderRef, {
          coins: increment(-gift.price)
        });
        
        // If target is host, increment their coins too
        if (target === 'host' && receiverId !== auth.currentUser.uid) {
           await updateDoc(receiverRef, {
             coins: increment(gift.price)
           });
        }
        
        setActiveGift(gift);
        setTimeout(() => setActiveGift(null), 3500);
        setShowGifts(false);
        
        await addDoc(collection(db, 'rooms', room.id, 'messages'), {
          senderId: 'system',
          actualSenderId: auth.currentUser.uid,
          senderName: 'System',
          text: `${auth.currentUser.displayName || 'A user'} sent a ${gift.name} to ${target === 'host' ? room.host : 'themselves'}!`,
          giftData: gift,
          createdAt: serverTimestamp()
        });

        // Record it in transactions for both
        await addDoc(collection(db, 'users', auth.currentUser.uid, 'transactions'), {
          fromId: auth.currentUser.uid,
          toId: receiverId,
          amount: gift.price,
          type: 'gift',
          status: 'completed',
          description: `Gift Sent: ${gift.name}`,
          createdAt: serverTimestamp()
        });

        if (target === 'host' && receiverId !== auth.currentUser.uid) {
          await addDoc(collection(db, 'users', receiverId, 'transactions'), {
            fromId: auth.currentUser.uid,
            toId: receiverId,
            amount: gift.price,
            type: 'gift',
            status: 'completed',
            description: `Gift Received: ${gift.name}`,
            createdAt: serverTimestamp()
          });
        }
      } else {
        alert('Not enough coins!');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users/coins');
    }
  };

  const deleteMessage = async (messageId: string) => {
    if (!isHost) return;
    if (room.id.startsWith('room_')) {
       setMessages(prev => prev.filter(m => m.id !== messageId));
       return;
    }
    try {
      await deleteDoc(doc(db, 'rooms', room.id, 'messages', messageId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `rooms/${room.id}/messages/${messageId}`);
    }
  };

  const toggleLockSeat = async (seatId: number) => {
    const newSeats = seats.map(s => 
      s.id === seatId ? { ...s, isLocked: !s.isLocked } : s
    );
    
    if (room.id.startsWith('room_')) {
      setSeats(newSeats);
      if (selectedUserToModerate?.seatId === seatId) {
        setSelectedUserToModerate((prev: any) => ({ ...prev, isLocked: !prev.isLocked }));
      }
      return;
    }

    try {
      await updateDoc(doc(db, 'rooms', room.id), { seats: newSeats });
      if (selectedUserToModerate?.seatId === seatId) {
        setSelectedUserToModerate((prev: any) => ({ ...prev, isLocked: !prev.isLocked }));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${room.id}`);
    }
  };

  const leaveSeat = async () => {
    const newSeats = seats.map(s => 
      s.user?.name === currentUserDisplayName ? { ...s, occupied: false, user: null } : s
    );
    if (room.id.startsWith('room_')) {
      setSeats(newSeats);
      return;
    }
    try {
      await updateDoc(doc(db, 'rooms', room.id), { seats: newSeats });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `rooms/${room.id}`);
    }
  };

  const handleSeatClick = async (seat: any) => {
    const isMySeat = seat.occupied && seat.user && seat.user.name === currentUserDisplayName;

    if (seat.occupied && !isMySeat) {
      if (activeSeatInfoId === seat.id) {
        setActiveSeatInfoId(null);
      } else {
        setActiveSeatInfoId(seat.id);
      }
      return;
    }

    if (isHost) {
      openModeration(seat);
    } else {
      if (seat.occupied) {
        // Just show info for guests if occupied and it is theirs
        if (activeSeatInfoId === seat.id) {
          setActiveSeatInfoId(null);
        } else {
          setActiveSeatInfoId(seat.id);
        }
      } else if (!seat.isLocked) {
        // Instant join if empty and not locked
        const alreadyInSeat = seats.some(s => s.occupied && s.user?.name === currentUserDisplayName);
        if (alreadyInSeat) return;

        const currentUser = auth.currentUser?.displayName || 'Guest';
        if (bannedUsers.includes(currentUser)) {
          alert("You are banned from this room.");
          return;
        }

        const newUser = { 
          name: currentUser, 
          avatar: `https://i.pravatar.cc/100?u=${auth.currentUser?.uid || 'guest'}`, 
          videoEnabled: false,
          isMuted: false
        };

        const newSeats = seats.map(s => 
          s.id === seat.id 
            ? { ...s, occupied: true, user: newUser }
            : s
        );

        if (room.id.startsWith('room_')) {
          setSeats(newSeats);
        } else {
          try {
            await updateDoc(doc(db, 'rooms', room.id), { seats: newSeats });
          } catch (error) {
            handleFirestoreError(error, OperationType.UPDATE, `rooms/${room.id}`);
          }
        }
      } else {
        // Shake if locked
        setShakingSeatId(seat.id);
        setTimeout(() => setShakingSeatId(null), 400);
      }
    }
  };

  const openModeration = (seat: any) => {
    setActiveSeatInfoId(null); // Close overlay
    if (seat.occupied && seat.user) {
      setSelectedUserToModerate({ ...seat.user, seatId: seat.id, isLocked: seat.isLocked });
    } else if (!seat.occupied) {
      if (isHost) {
        setSelectedUserToModerate({ 
          name: `Seat ${seat.id + 1}`, 
          isEmpty: true, 
          seatId: seat.id, 
          isLocked: seat.isLocked,
          avatar: null
        });
      } else if (seat.isLocked) {
        setShakingSeatId(seat.id);
        setTimeout(() => setShakingSeatId(null), 400);
      } else {
        const currentUser = auth.currentUser?.displayName || 'Guest';
        if (bannedUsers.includes(currentUser)) {
          alert("You are banned from this room.");
        } else if (!requestedSeats.find(r => r.seatId === seat.id)) {
          setRequestedSeats(prev => [...prev, { 
            userId: auth.currentUser?.uid || 'anonymous', 
            userName: currentUser, 
            seatId: seat.id 
          }]);
        }
      }
    }
  };

  const SeatOverlay = ({ seat, onModerate, onLeaveSeat }: { seat: any, onModerate: () => void, onLeaveSeat: () => void }) => {
    const isMySeat = seat.occupied && seat.user && seat.user.name === currentUserDisplayName;
    const isFollowed = seat.user ? followedUsers.includes(seat.user.name) : false;
    const isBlocked = seat.user ? blockedUsers.includes(seat.user.name) : false;

    // Simulate speaker metrics based on username hash seed for realism and high premium UI polish
    const simulatedLevel = React.useMemo(() => {
      if (!seat.user) return 1;
      let hash = 0;
      for (let i = 0; i < seat.user.name.length; i++) {
        hash = seat.user.name.charCodeAt(i) + ((hash << 5) - hash);
      }
      return Math.abs(hash % 20) + 1;
    }, [seat.user]);

    const simulatedFollowers = React.useMemo(() => {
      if (!seat.user) return '0';
      let hash = 0;
      for (let i = 0; i < seat.user.name.length; i++) {
        hash = seat.user.name.charCodeAt(i) + ((hash << 5) - hash);
      }
      const base = Math.abs(hash % 100);
      return base < 10 ? `${(base + 1.2).toFixed(1)}K` : `${(base / 10).toFixed(1)}K`;
    }, [seat.user]);

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: 15, x: "-50%" }}
        animate={{ opacity: 1, scale: 1, y: 0, x: "-50%" }}
        exit={{ opacity: 0, scale: 0.85, y: 15, x: "-50%" }}
        transition={{ type: "spring", stiffness: 450, damping: 28 }}
        style={{ originY: 1 }}
        className="absolute z-[100] bottom-full mb-3.5 left-1/2 w-60 bg-zinc-950/95 border border-zinc-800/80 backdrop-blur-xl rounded-2xl p-4 text-white text-[10px] shadow-2xl flex flex-col space-y-3 cursor-default"
        onClick={(e) => { e.stopPropagation(); }}
      >
        {seat.occupied && seat.user ? (
          <>
            {/* Elegant User Profile Card Header */}
            <div className="flex items-center gap-3 pb-2 border-b border-zinc-800/60 text-left">
              <div className="relative">
                <img 
                  src={seat.user.avatar || `https://i.pravatar.cc/100?u=${seat.user.name}`} 
                  alt={seat.user.name} 
                  className="w-10 h-10 rounded-full border border-amber-400/20 object-cover"
                />
                <div className="absolute -bottom-0.5 -right-0.5 bg-zinc-900 border border-zinc-800 px-1 py-0.2 rounded-full text-[6px] font-black text-amber-400 scale-90">
                  Lvl {simulatedLevel}
                </div>
              </div>
              <div className="flex-1 min-w-0 flex flex-col items-start align-top">
                <div className="flex items-center gap-1 justify-start">
                  <span className="font-black text-zinc-100 text-xs truncate uppercase tracking-tight block max-w-[100px]" title={seat.user.name}>
                    {seat.user.name}
                  </span>
                  {seat.user.name === room.host && (
                    <span className="bg-red-500/10 text-red-400 border border-red-500/20 text-[7px] font-bold uppercase px-1 rounded scale-90 flex-shrink-0">
                      Host
                    </span>
                  )}
                </div>
                <p className="text-zinc-500 text-[8px] font-bold tracking-wider uppercase mt-0.5 text-left">
                  {simulatedFollowers} FOLLOWERS • SPEAKER
                </p>
              </div>
            </div>

            {seat.user.name === room.host && (
              <div className="bg-zinc-900/40 border border-zinc-900/60 rounded-xl p-2.5 space-y-1.5 text-left">
                <div className="flex items-center justify-between text-[7px] font-black uppercase tracking-wider text-zinc-400">
                  <span className="flex items-center gap-1">
                    <TrendingUp className="w-2.5 h-2.5 text-amber-400" />
                    Agency Performance
                  </span>
                  <span className="text-amber-400 font-bold">
                    {hostProfileDetail?.performance ?? 82}%
                  </span>
                </div>
                <div className="relative w-full h-1.5 bg-zinc-900 border border-zinc-800 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${hostProfileDetail?.performance ?? 82}%` }}
                    className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full"
                  />
                </div>
              </div>
            )}

            {/* Speaking Status Indicators */}
            <div className="flex items-center justify-between text-[8px] font-bold text-zinc-400 uppercase tracking-widest pl-1">
              <span className="flex items-center gap-1.5 justify-start">
                {seat.user.isMuted ? (
                  <>
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                    <span>Muted</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-green-405">Speaking</span>
                  </>
                )}
              </span>
              {seat.user.voiceEffect && seat.user.voiceEffect !== 'none' && (
                <span className="text-purple-400 flex items-center gap-0.5 justify-end">
                  <Wand2 className="w-2.5 h-2.5" />
                  {seat.user.voiceEffect}
                </span>
              )}
            </div>

            {/* Quick Action Options */}
            {!isMySeat ? (
              isHost ? (
                /* HOST MODERATION CONTROLS */
                <div className="space-y-2 text-left">
                  <div className="grid grid-cols-2 gap-1.5">
                    {/* Toggle Mute */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        muteUser(seat.user.name);
                      }}
                      className={cn(
                        "w-full py-2 font-black uppercase text-[8px] tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all border cursor-pointer",
                        seat.user.isMuted
                          ? "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/20"
                          : "bg-zinc-900 text-zinc-350 border-zinc-800 hover:bg-zinc-850 hover:text-white"
                      )}
                    >
                      {seat.user.isMuted ? (
                        <>
                          <Mic className="w-3 h-3 text-red-400" />
                          Unmute
                        </>
                      ) : (
                        <>
                          <MicOff className="w-3 h-3 text-zinc-400" />
                          Mute
                        </>
                      )}
                    </button>

                    {/* Kick from Seat */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        kickUser(seat.user.name);
                        setActiveSeatInfoId(null);
                      }}
                      className="w-full bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 py-2 py-2 font-black uppercase text-[8px] tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      Kick Seat
                    </button>
                  </div>

                  {/* Ban from Room */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      banUser(seat.user.name);
                      setActiveSeatInfoId(null);
                    }}
                    className="w-full bg-red-650 text-white hover:bg-red-600 border border-red-700/30 py-2 font-black uppercase text-[8px] tracking-widest rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Slash className="w-2.5 h-2.5 text-white/90" />
                    Ban from Room
                  </button>

                  {/* Advance to Full Moderation */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onModerate();
                    }}
                    className="w-full bg-zinc-850 border border-zinc-850 hover:bg-zinc-800 py-1.5 text-zinc-350 hover:text-white text-[8px] font-black uppercase tracking-widest rounded-xl text-center cursor-pointer"
                  >
                    Open Admin Console
                  </button>
                </div>
              ) : (
                /* GUEST BLOCK & FOLLOW CONTROLS */
                <div className="space-y-2 text-left">
                  <div className="grid grid-cols-2 gap-1.5">
                    {/* Follow/Unfollow Toggle */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFollow(seat.user.name);
                      }}
                      className={cn(
                        "w-full py-2.5 font-black uppercase text-[8px] tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all border cursor-pointer",
                        isFollowed
                          ? "border-amber-400/30 text-amber-400 bg-amber-400/5 hover:bg-amber-400/10"
                          : "bg-amber-400 text-black border-amber-400 hover:bg-amber-300 shadow-md shadow-amber-400/5"
                      )}
                    >
                      <Star className={cn("w-3 h-3", isFollowed ? "fill-amber-400" : "fill-transparent")} />
                      {isFollowed ? 'Following' : 'Follow'}
                    </button>

                    {/* Block/Unblock Toggle */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBlock(seat.user.name);
                      }}
                      className={cn(
                        "w-full py-2.5 font-black uppercase text-[8px] tracking-wider rounded-xl flex items-center justify-center gap-1.5 transition-all border cursor-pointer",
                        isBlocked
                          ? "border-red-500/30 text-red-450 bg-red-500/5 hover:bg-red-500/10"
                          : "bg-zinc-900 text-zinc-350 border-zinc-800 hover:bg-zinc-850 hover:text-white"
                      )}
                    >
                      <Lock className="w-3 h-3" />
                      {isBlocked ? 'Blocked' : 'Block'}
                    </button>
                  </div>

                  {/* Direct DM trigger */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDirectMessageTarget(seat.user.name);
                      setActiveSeatInfoId(null);
                    }}
                    className="w-full bg-zinc-900 border border-dashed border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white py-2 font-black uppercase text-[8px] tracking-widest rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <MessageSquare className="w-3 h-3 text-amber-400" />
                    Direct Message
                  </button>
                </div>
              )
            ) : (
              /* ACTIVE USER'S OWN CONTROLS (Leave) */
              <div className="space-y-2 text-center">
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-[7px] text-center">You occupy this seat</p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLeaveSeat();
                    setActiveSeatInfoId(null);
                  }}
                  className="w-full bg-red-500/15 text-red-500 border border-red-500/30 py-2.5 font-black uppercase text-[8px] tracking-widest rounded-xl hover:bg-red-550 hover:text-white transition-all duration-200 cursor-pointer"
                >
                  Leave Seat
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-[8px]">Empty Seat {seat.id + 1}</p>
        )}
      </motion.div>
    );
  };

  const isCustomVoiceRoom = room.type === 'voice' && (isHost || room.hostId === auth.currentUser?.uid);

  // Setup custom stats and simulations for custom Voice Rooms
  const [simulatedSpeakers, setSimulatedSpeakers] = React.useState<Record<number, boolean>>({});
  const [joinNotification, setJoinNotification] = React.useState<string | null>(null);

  // Local state for customizable host profile info
  const [customUsername, setCustomUsername] = React.useState<string>(room.host || currentUserDisplayName);
  const [customPhoto, setCustomPhoto] = React.useState<string>(`https://i.pravatar.cc/150?u=${room.host}`);

  React.useEffect(() => {
    if (!isCustomVoiceRoom) return;

    const triggerJoinAlert = (name: string, delay: number) => {
      return setTimeout(() => {
        setJoinNotification(`🎉 ${name} joined the room`);
        setTimeout(() => {
          setJoinNotification(null);
        }, 4000);
      }, delay);
    };

    const t1 = triggerJoinAlert("Ahmed", 4000);
    const t2 = triggerJoinAlert("Sami", 9000);

    const speakTimer = setInterval(() => {
      const activeState: Record<number, boolean> = {};
      const randomInd = Math.floor(Math.random() * 9);
      if (randomInd !== 0 && seats[randomInd]?.occupied) {
        activeState[randomInd] = true;
      }
      setSimulatedSpeakers(activeState);
    }, 3500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearInterval(speakTimer);
    };
  }, [isCustomVoiceRoom, seats]);

  if (isCustomVoiceRoom) {
    const handleUsernameClick = () => {
      const newName = window.prompt("Enter Your Name", customUsername);
      if (newName && newName.trim() !== "") {
        setCustomUsername(newName.trim());
      }
    };

    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (typeof event.target?.result === 'string') {
            setCustomPhoto(event.target.result);
          }
        };
        reader.readAsDataURL(file);
      }
    };

    const handleMicToggle = async () => {
      const targetMute = !isMuted;
      setIsMuted(targetMute);
      await toggleMyMute(targetMute);
    };

    const handleCopyLink = () => {
      navigator.clipboard.writeText(window.location.href);
      alert("🎉 Room Link Copied to Clipboard!");
    };

    const renderCustomSeatElement = (seatId: number, defaultEmoji: string, isVip: boolean = false) => {
      const seat = seats[seatId] || { id: seatId, occupied: false, user: null, isLocked: false };
      const isUserSpeaking = seatId === 0 && !isMuted;
      const isSimSpeaking = simulatedSpeakers[seatId];
      const isActivelySpeaking = isUserSpeaking || (seat.occupied && isSimSpeaking);

      return (
        <div key={seatId} className="seat flex flex-col items-center relative" onClick={() => handleSeatClick(seat)}>
          <div className={cn(
            "avatar w-[68px] h-[68px] sm:w-[78px] sm:h-[78px] rounded-full bg-white/11 flex items-center justify-center text-2xl sm:text-[28px] border-2 border-white/10 backdrop-blur-md relative overflow-hidden transition-all duration-300",
            isVip && "bg-gradient-to-br from-[#ffb300] to-[#ff9100] border-yellow-400 shadow-[0_0_20px_gold] text-amber-950",
            isActivelySpeaking && "custom-talking custom-talking-wave"
          )}>
            {seat.occupied && seat.user ? (
              <img 
                src={seatId === 0 ? customPhoto : (seat.user.avatar || `https://i.pravatar.cc/100?u=${seat.user.name}`)} 
                alt={seat.user.name} 
                className="w-full h-full object-cover rounded-full border-none"
              />
            ) : (
              <span className="select-none">{defaultEmoji}</span>
            )}

            {/* Lock indicator overlay */}
            {seat.isLocked && (
              <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                <Lock className="w-3.5 h-3.5 text-red-500 animate-pulse" />
              </div>
            )}
          </div>
          <p className="mt-2 text-[10px] sm:text-xs text-zinc-100 font-bold bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full mt-1.5 truncate max-w-[84px] text-center">
            {seat.occupied && seat.user ? (seatId === 0 ? customUsername : seat.user.name) : (seatId + 1)}
          </p>

          <AnimatePresence>
            {activeSeatInfoId === seatId && (
              <div className="absolute z-[150] bottom-full mb-3 left-1/2 -translate-x-1/2 pointer-events-auto">
                <SeatOverlay seat={seat} onModerate={() => openModeration(seat)} onLeaveSeat={leaveSeat} />
              </div>
            )}
          </AnimatePresence>
        </div>
      );
    };

    return (
      <div className="room w-full h-[100vh] min-h-[100vh] max-h-[100vh] relative overflow-hidden text-white font-sans select-none flex flex-col z-[60]" style={{
        backgroundImage: "url('https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1200')",
        backgroundPosition: 'center',
        backgroundSize: 'cover'
      }}>
        {/* BLUR EFFECT BACKGROUND OVERLAY */}
        <div className="absolute inset-0 bg-black/55 backdrop-blur-[5px] z-0" />

        {/* JOIN POPUP BANNER */}
        <AnimatePresence>
          {joinNotification && (
            <motion.div 
              initial={{ y: -50, opacity: 0, x: '-50%' }}
              animate={{ y: 0, opacity: 1, x: '-50%' }}
              exit={{ y: -50, opacity: 0, x: '-50%' }}
              className="absolute top-[90px] left-1/2 -translate-x-1/2 bg-[#00c853] text-white px-6 py-2.5 rounded-full font-bold shadow-[0_4px_20px_rgba(0,0,0,0.4)] z-[200] text-xs sm:text-sm uppercase tracking-wider flex items-center gap-1"
            >
              🎉 {joinNotification}
            </motion.div>
          )}
        </AnimatePresence>

        {/* TOP BAR */}
        <div className="top flex items-center justify-between p-[15px] z-10 w-full shrink-0">
          {/* USER PROFILE */}
          <div className="profile flex items-center gap-3">
            <label htmlFor="photoUpload" className="cursor-pointer relative mt-0.5 group">
              <img 
                id="profilePhoto"
                src={customPhoto}
                alt="Profile photo"
                className="w-[60px] h-[60px] rounded-full object-cover border-2 border-yellow-400 group-hover:scale-105 active:scale-95 transition-all shadow-[0_0_12px_rgba(250,204,21,0.2)]"
              />
              <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] font-black uppercase text-white transition-opacity">
                Pick
              </div>
            </label>
            <input 
              type="file"
              id="photoUpload"
              accept="image/*"
              hidden
              onChange={handlePhotoChange}
            />

            <div className="text-left flex flex-col items-start">
              <h3 
                id="username" 
                onClick={handleUsernameClick} 
                className="font-black text-white text-base sm:text-lg hover:text-amber-400 hover:underline cursor-pointer flex items-center gap-1.5"
                title="Click to edit name"
              >
                {customUsername}
                <span className="text-[10px] bg-amber-400/10 border border-amber-400/25 text-amber-400 px-1.5 py-0.5 rounded-md uppercase tracking-wider scale-90">Host</span>
              </h3>
              <p className="text-[11px] text-white/70 font-mono flex items-center gap-1 select-all">
                ID: <span id="userid" className="font-bold">{room.id.substring(5, 12).toUpperCase()}</span>
              </p>
            </div>
          </div>

          {/* TOP ICONS */}
          <div className="top-icons flex gap-2.5 select-none shrink-0">
            <div 
              onClick={handleCopyLink} 
              className="w-[42px] h-[42px] rounded-full bg-white/15 hover:bg-white/25 active:scale-95 flex justify-center items-center backdrop-blur-[10px] text-lg cursor-pointer transition-all border border-white/5"
              title="Copy Room Invite Link"
            >
              🔗
            </div>
            <div 
              onClick={() => {
                alert("Background Stream status is online");
              }} 
              className="w-[42px] h-[42px] rounded-full bg-white/15 hover:bg-white/25 active:scale-95 flex justify-center items-center backdrop-blur-[10px] text-lg cursor-pointer transition-all border border-white/5"
              title="Stream Settings"
            >
              📺
            </div>
            <div 
              onClick={onLeave} 
              className="w-[42px] h-[42px] rounded-full bg-red-600/30 border border-red-500/20 hover:bg-red-600/50 active:scale-95 flex justify-center items-center backdrop-blur-[10px] text-lg cursor-pointer transition-all"
              title="Leave Voice Room"
            >
              ✖
            </div>
          </div>
        </div>

        {/* MAIN BODY LAYOUT GRID WITH SEATS IN THE CENTER */}
        <div className="flex-1 w-full relative overflow-hidden flex flex-col items-center justify-start py-8 px-4 z-10 select-none">
          {/* SEATS GROUP CONTAINER */}
          <div className="seats w-full max-w-lg space-y-4 sm:space-y-6 mt-4 relative">
            {/* ROW 1 */}
            <div className="row flex justify-center">
              {renderCustomSeatElement(0, "🎤")}
            </div>

            {/* ROW 2 */}
            <div className="row flex justify-center gap-[15px] sm:gap-[25px]">
              {renderCustomSeatElement(1, "👑", true)}
              {renderCustomSeatElement(2, "👑", true)}
              {renderCustomSeatElement(3, "👑", true)}
              {renderCustomSeatElement(4, "🛋")}
            </div>

            {/* ROW 3 */}
            <div className="row flex justify-center gap-[15px] sm:gap-[25px]">
              {renderCustomSeatElement(5, "🛋")}
              {renderCustomSeatElement(6, "🛋")}
              {renderCustomSeatElement(7, "🛋")}
              {renderCustomSeatElement(8, "🛋")}
            </div>
          </div>

          {/* LEFT MENU (FLOATING CONTAINER PANEL) */}
          <div className="left-menu absolute top-[60%] sm:top-1/2 left-[10px] -translate-y-1/2 flex flex-col gap-2 shrink-0">
            <button className="w-[52px] h-[80px] sm:w-[58px] sm:h-[90px] border-none rounded-[30px] bg-[#11d9d2] text-white font-black text-[11px] sm:text-xs uppercase tracking-widest shadow-lg shadow-teal-500/10 active:scale-95 transition-all cursor-pointer">
              All
            </button>
            <button 
              onClick={() => {
                setShowHostConsole(true);
              }}
              className="w-[52px] h-[80px] sm:w-[58px] sm:h-[90px] border-none rounded-[30px] bg-[#222]/80 backdrop-blur-md text-white/80 font-black text-[11px] sm:text-xs uppercase tracking-widest border border-white/5 active:scale-95 transition-all cursor-pointer"
            >
              Room
            </button>
            <button 
              onClick={() => {
                setShowChat(!showChat);
              }}
              className={cn(
                "w-[52px] h-[80px] sm:w-[58px] sm:h-[90px] border-none rounded-[30px] font-black text-[11px] sm:text-xs uppercase tracking-widest border active:scale-95 transition-all cursor-pointer",
                showChat 
                  ? "bg-amber-400 text-black border-amber-400 shadow-md shadow-amber-400/15" 
                  : "bg-[#222]/80 backdrop-blur-md text-white/80 border-white/5"
              )}
            >
              Chat
            </button>
          </div>

          {/* WELCOME ANNOUNCEMENT NOTICE BOX */}
          <div className="notice absolute left-[15px] right-[15px] sm:right-auto sm:max-w-md bottom-[115px] bg-black/60 backdrop-blur-lg border border-white/5 p-5 rounded-[20px] shadow-2xl text-left select-text">
            <h3 className="text-[#ff4444] font-black text-xs sm:text-sm uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#ff4444] animate-pulse" />
              Welcome
            </h3>
            <p className="text-zinc-300 text-[11px] sm:text-xs leading-relaxed font-sans">
              Welcome to Barca-live voice room. Open your microphone and start talking with your friends live.
            </p>
          </div>

          {/* RIGHT ACTION SHORTCUTS */}
          <div className="right absolute right-[10px] top-[60%] sm:top-1/2 -translate-y-1/2 flex flex-col gap-2.5 shrink-0">
            <div 
              onClick={() => setShowHostConsole(true)}
              className="w-[50px] h-[50px] sm:w-[58px] sm:h-[58px] rounded-[18px] bg-white/15 flex justify-center items-center text-xl sm:text-2xl backdrop-blur-[10px] transition-all hover:scale-105 active:scale-95 border border-white/10 shadow-lg cursor-pointer"
              title="Battle / Moderator"
            >
              ⚔
            </div>
            <div 
              onClick={() => setShowGifts(true)}
              className="w-[50px] h-[50px] sm:w-[58px] sm:h-[58px] rounded-[18px] bg-white/15 flex justify-center items-center text-xl sm:text-2xl backdrop-blur-[10px] transition-all hover:scale-105 active:scale-95 border border-white/10 shadow-lg cursor-pointer"
              title="Send Gift"
            >
              🎁
            </div>
            <div 
              onClick={() => setShowSitEarnPanel(true)}
              className="w-[50px] h-[50px] sm:w-[58px] sm:h-[58px] rounded-[18px] bg-white/15 flex justify-center items-center text-xl sm:text-2xl backdrop-blur-[10px] transition-all hover:scale-105 active:scale-95 border border-white/10 shadow-lg cursor-pointer"
              title="Reseller Coins / Sit & Earn"
            >
              💰
            </div>
          </div>
        </div>

        {/* CHAT CONTENT SIDEBAR PANELS (Toggled overlay) */}
        <AnimatePresence>
          {showChat && (
            <motion.div 
              initial={{ opacity: 0, x: 200 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 200 }}
              className="absolute right-[80px] top-[15px] bottom-[105px] w-[320px] bg-black/85 backdrop-blur-xl border border-zinc-900 rounded-[2rem] overflow-hidden z-30 shadow-2xl flex flex-col"
            >
              <div className="flex-1 overflow-hidden relative">
                <ChatSidebar 
                  messages={messages.filter(msg => !blockedUsers.includes(msg.senderName))} 
                  onSendMessage={handleSendMessage}
                  onDeleteMessage={deleteMessage}
                  onSeatClick={handleSeatClick}
                  isHost={isHost}
                  roomHost={room.host}
                  users={seats.filter(s => s.occupied && s.user).map(s => ({ name: s.user.name, avatar: s.user.avatar }))}
                  seats={seats}
                  onUpdateRoom={handleUpdateRoomSettings}
                  roomData={{
                    ...room,
                    settings: {
                      isPrivate,
                      entryEffectsEnabled,
                      isBgmEnabled,
                      entryFee
                    }
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* BOTTOM ACTION BAR */}
        <div className="bottom flex justify-between items-center p-[15px] z-20 w-full shrink-0 select-none pb-8 sm:pb-[18px]">
          {/* MIC ACTION BUTTON */}
          <button 
            onClick={handleMicToggle} 
            className={cn(
              "mic-btn w-[68px] h-[68px] sm:w-[78px] sm:h-[78px] rounded-full border-none text-2xl sm:text-3xl flex justify-center items-center transition-all cursor-pointer shadow-lg active:scale-95",
              !isMuted 
                ? "bg-[#00c853] text-[30px] custom-mic-pulse shadow-[0_0_25px_rgba(0,190,83,0.5)]" 
                : "bg-[#ff004c] text-[30px] shadow-[0_0_25px_rgba(255,0,76,0.5)]"
            )}
            title={!isMuted ? "Mute Microphone" : "Unmute Microphone"}
          >
            {!isMuted ? "🔊" : "🎤"}
          </button>

          {/* BOTTOM QUICK ACTIONS BAR */}
          <div className="bottom-icons flex gap-2.5 sm:gap-[12px]">
            <div 
              onClick={() => setShowDiscover(!showDiscover)} 
              className={cn("w-[48px] h-[48px] sm:w-[55px] sm:h-[55px] rounded-full active:scale-95 flex justify-center items-center text-lg sm:text-2xl backdrop-blur-[10px] cursor-pointer transition-all border", showDiscover ? "bg-amber-400 text-black border-amber-400" : "bg-white/15 text-white border-white/5 hover:bg-white/20")}
              title="Discover"
            >
              <Search className="w-5 h-5"/>
            </div>
            <div 
              onClick={() => setShowTaskAgent(!showTaskAgent)} 
              className={cn("w-[48px] h-[48px] sm:w-[55px] sm:h-[55px] rounded-full active:scale-95 flex justify-center items-center text-lg sm:text-2xl backdrop-blur-[10px] cursor-pointer transition-all border", showTaskAgent ? "bg-amber-400 text-black border-amber-400" : "bg-white/15 text-white border-white/5 hover:bg-white/20")}
              title="Task Agent"
            >
              <Target className="w-5 h-5"/>
            </div>
            <div 
              onClick={() => setShowMinigames(!showMinigames)} 
              className={cn("w-[48px] h-[48px] sm:w-[55px] sm:h-[55px] rounded-full active:scale-95 flex justify-center items-center text-lg sm:text-2xl backdrop-blur-[10px] cursor-pointer transition-all border", showMinigames ? "bg-amber-400 text-black border-amber-400" : "bg-white/15 text-white border-white/5 hover:bg-white/20")}
              title="Minigames"
            >
              <Gamepad2 className="w-5 h-5"/>
            </div>
            <div 
              onClick={() => setShowMe(!showMe)} 
              className={cn("w-[48px] h-[48px] sm:w-[55px] sm:h-[55px] rounded-full active:scale-95 flex justify-center items-center text-lg sm:text-2xl backdrop-blur-[10px] cursor-pointer transition-all border", showMe ? "bg-amber-400 text-black border-amber-400" : "bg-white/15 text-white border-white/5 hover:bg-white/20")}
              title="Me"
            >
              <User className="w-5 h-5"/>
            </div>

            <div 
              onClick={() => setShowGifts(!showGifts)} 
              className={cn("w-[48px] h-[48px] sm:w-[55px] sm:h-[55px] rounded-full active:scale-95 flex justify-center items-center text-lg sm:text-2xl backdrop-blur-[10px] cursor-pointer transition-all border", showGifts ? "bg-amber-400 text-black border-amber-400" : "bg-white/15 text-white border-white/5 hover:bg-white/20")}
              title="Gifting"
            >
              <Gift className="w-5 h-5"/>
            </div>
            <div 
              onClick={() => setShowModeration(!showModeration)} 
              className={cn("w-[48px] h-[48px] sm:w-[55px] sm:h-[55px] rounded-full active:scale-95 flex justify-center items-center text-lg sm:text-2xl backdrop-blur-[10px] cursor-pointer transition-all border", showModeration ? "bg-amber-400 text-black border-amber-400" : "bg-white/15 text-white border-white/5 hover:bg-white/20")}
              title="Moderator Tools"
            >
              <Shield className="w-5 h-5"/>
            </div>
            <div 
              onClick={() => setShowResellerCoin(!showResellerCoin)} 
              className={cn("w-[48px] h-[48px] sm:w-[55px] sm:h-[55px] rounded-full active:scale-95 flex justify-center items-center text-lg sm:text-2xl backdrop-blur-[10px] cursor-pointer transition-all border", showResellerCoin ? "bg-amber-400 text-black border-amber-400" : "bg-white/15 text-white border-white/5 hover:bg-white/20")}
              title="Reseller Portal"
            >
              <Coins className="w-5 h-5"/>
            </div>
            <div 
              onClick={() => setShowHostConsole(true)} 
              className="w-[48px] h-[48px] sm:w-[55px] sm:h-[55px] rounded-full active:scale-95 flex justify-center items-center text-lg sm:text-2xl backdrop-blur-[10px] cursor-pointer transition-all hover:bg-white/20 border border-white/5"
              title="Console Menu"
            >
              <Settings className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* SECONDARY DIALOG ACTIONS MODES INTEGRATION */}
        {/* Panel Container / Overlay */}
        <AnimatePresence>
          {showModeration && (
            <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[180] flex items-center justify-center p-4">
              <div className="bg-zinc-950 border border-zinc-800 rounded-[2.5rem] w-full max-w-lg p-8 relative max-h-[85vh] overflow-y-auto no-scrollbar shadow-2xl">
                <button onClick={() => setShowModeration(false)} className="absolute top-6 right-6 bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl text-zinc-400 hover:text-white transition-all cursor-pointer"><X className="w-5 h-5" /></button>
                <ModerationTools />
              </div>
            </div>
          )}
          {showMinigames && (
            <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[180] flex items-center justify-center p-4">
              <div className="bg-zinc-950 border border-zinc-800 rounded-[2.5rem] w-full max-w-lg p-8 relative max-h-[85vh] overflow-y-auto no-scrollbar shadow-2xl">
                <button onClick={() => setShowMinigames(false)} className="absolute top-6 right-6 bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl text-zinc-400 hover:text-white transition-all cursor-pointer"><X className="w-5 h-5" /></button>
                <Games />
              </div>
            </div>
          )}
          {showTaskAgent && (
            <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[180] flex items-center justify-center p-4">
              <div className="bg-zinc-950 border border-zinc-800 rounded-[2.5rem] w-full max-w-lg p-8 relative max-h-[85vh] overflow-y-auto no-scrollbar shadow-2xl">
                <button onClick={() => setShowTaskAgent(false)} className="absolute top-6 right-6 bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl text-zinc-400 hover:text-white transition-all cursor-pointer"><X className="w-5 h-5" /></button>
                <UserTasks />
              </div>
            </div>
          )}
          {showResellerCoin && (
            <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[180] flex items-center justify-center p-4">
              <div className="bg-zinc-950 border border-zinc-800 rounded-[2.5rem] w-full max-w-lg p-8 relative max-h-[85vh] overflow-y-auto no-scrollbar shadow-2xl">
                <button onClick={() => setShowResellerCoin(false)} className="absolute top-6 right-6 bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl text-zinc-400 hover:text-white transition-all cursor-pointer"><X className="w-5 h-5" /></button>
                <ResellerCoinSystem />
              </div>
            </div>
          )}
        </AnimatePresence>

        {/* Host console & Room Settings Panels */}
        <AnimatePresence>
          {showHostConsole && (
            <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[180] flex items-center justify-center p-4">
              <div className="bg-zinc-950 border border-zinc-800 rounded-[2.5rem] w-full max-w-3xl p-8 relative max-h-[85vh] overflow-y-auto no-scrollbar shadow-2xl">
                <button onClick={() => setShowHostConsole(false)} className="absolute top-6 right-6 bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl text-zinc-400 hover:text-white transition-all cursor-pointer">
                  <X className="w-5 h-5" />
                </button>
                <div className="space-y-6 text-left">
                  <div>
                    <h2 className="text-2xl font-black italic uppercase tracking-tight text-amber-400">Host Command Center</h2>
                    <p className="text-zinc-500 text-[9px] uppercase tracking-widest font-mono">Stream and Seat Moderation Panel</p>
                  </div>
                  <RoomAnalytics roomTitle={room.title} />
                  <div className="border-t border-zinc-900 pt-6">
                    <button 
                      onClick={() => {
                        setShowHostConsole(false);
                        alert("🎉 Host broadcast settings successfully saved & synchronized.");
                      }}
                      className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white py-4 font-black uppercase text-xs tracking-widest rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                    >
                      Apply and Return
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] bg-zinc-950 flex flex-col"
      id="active-room-view"
    >
      {/* Right Floating Icons */}
      <div className="absolute right-6 top-1/2 -translate-y-1/2 z-[70] space-y-4 hidden md:flex flex-col">
        {[
          { icon: <ShieldCheck className="w-6 h-6" />, label: '⚔' },
          { icon: <Coins className="w-6 h-6" />, label: '💰' },
          { icon: <Gift className="w-6 h-6" />, label: '🎁' },
          { icon: <MessageSquare className={cn("w-6 h-6 transition-all", showChat ? "text-amber-400" : "text-white")} />, label: '💬', onClick: () => setShowChat(!showChat) }
        ].map((item, i) => (
          <div 
            key={i} 
            onClick={item.onClick}
            className={cn(
              "w-14 h-14 bg-black/40 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/10 hover:border-amber-400 transition-colors cursor-pointer",
              item.onClick && "hover:scale-110 active:scale-95"
            )}
          >
            {item.icon}
          </div>
        ))}
      </div>

      {/* Room Header */}
      <div className="p-6 flex items-center justify-between border-b border-zinc-900/50 bg-black/40 backdrop-blur-md relative">
        <div className="flex items-center gap-4 relative">
          <div className="relative">
            <button 
              type="button"
              onClick={() => setShowHostCard(!showHostCard)}
              className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-amber-400/50 shadow-lg shadow-amber-400/10 hover:scale-105 hover:border-amber-400 transition-all duration-300 relative bg-zinc-900 flex-shrink-0 cursor-pointer"
              title="Click to view Host Agency Performance rating"
            >
              <img src={`https://i.pravatar.cc/150?u=${room.host}`} alt={room.host} className="object-cover w-full h-full" />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border border-zinc-950 rounded-full animate-pulse" />
            </button>

            {/* Floating Host Profile Card popover */}
            <AnimatePresence>
              {showHostCard && (
                <>
                  <div className="fixed inset-0 z-[140]" onClick={() => setShowHostCard(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.95 }}
                    transition={{ type: "spring", damping: 25, stiffness: 350 }}
                    className="absolute left-0 mt-3 w-80 bg-zinc-950 border border-zinc-800 backdrop-blur-xl rounded-[2rem] p-5 text-white shadow-2xl z-[150] flex flex-col space-y-4 text-left"
                  >
                    <div className="flex items-center gap-4 relative">
                      <div className="relative">
                        <img 
                          src={`https://i.pravatar.cc/150?u=${room.host}`} 
                          alt={room.host} 
                          className="w-14 h-14 rounded-2xl border border-amber-400/20 object-cover shadow-md shadow-amber-400/5"
                        />
                        <div className="absolute -bottom-1 -right-1 bg-[#0d0d10] border border-zinc-800 px-1.5 py-0.5 rounded-full text-[6px] font-black tracking-widest text-amber-400 scale-90">
                          LVL 12
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 justify-start">
                          <span className="font-extrabold text-zinc-100 text-sm truncate uppercase tracking-tight" title={room.host}>
                            {room.host}
                          </span>
                          <span className="bg-red-500/15 text-red-400 border border-red-500/25 text-[7px] font-black uppercase px-2 py-0.5 rounded-md scale-95 flex-shrink-0 tracking-wider">
                            Host
                          </span>
                        </div>
                        <p className="text-zinc-500 text-[8px] font-black tracking-widest uppercase mt-1">
                          {hostProfileDetail?.category || 'PRO SOCIAL'} • ACTIVE STREAMER
                        </p>
                      </div>

                      <button 
                        onClick={() => setShowHostCard(false)}
                        className="text-zinc-500 hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="bg-zinc-900/40 border border-zinc-900 w-full rounded-2xl p-3 text-[10px] text-zinc-400 leading-relaxed font-semibold italic">
                      "{hostProfileDetail?.bio || 'Verified Host streamer. Join and support my active lounge nodes!'}"
                    </div>

                    {/* AGENCY PERFORMANCE PROGRESS BAR INDICATOR (Real Firestore Performance data representation) */}
                    <div className="space-y-2 bg-gradient-to-r from-zinc-950 to-zinc-900 w-full rounded-2xl p-3.5 border border-zinc-900">
                      <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-wider pl-0.5">
                        <span className="text-zinc-400 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-amber-400" />
                          Agency Performance
                        </span>
                        <span className="text-amber-400 font-extrabold text-xs">
                          {hostProfileDetail?.performance ?? 82}%
                        </span>
                      </div>

                      <div className="relative w-full h-2.5 bg-zinc-900 border border-zinc-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${hostProfileDetail?.performance ?? 82}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                          className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-300 rounded-full"
                        />
                      </div>

                      <div className="flex justify-between items-center pt-1">
                        <span className="text-[7px] text-zinc-500 font-black tracking-widest uppercase">
                          Rating: {(hostProfileDetail?.performance ?? 82) >= 90 ? 'ELITE S-TIER' : ((hostProfileDetail?.performance ?? 82) >= 80 ? 'PREMIUM GOLD' : 'ACTIVE PRO')}
                        </span>
                        <span className="text-[7px] text-zinc-500 font-black tracking-widest uppercase block text-right">
                          Target: 100%
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[8px] font-black uppercase tracking-widest">
                      <div className="bg-zinc-900/60 p-2 border border-zinc-800 rounded-xl flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-zinc-500 font-black leading-none">Security</p>
                          <p className="text-zinc-300 font-bold leading-none mt-1">Verified</p>
                        </div>
                      </div>
                      <div className="bg-zinc-900/60 p-2 border border-zinc-800 rounded-xl flex items-center gap-1.5">
                        <Sparkle className="w-3.5 h-3.5 text-amber-400 shrink-0 select-none" />
                        <div className="min-w-0">
                          <p className="text-zinc-500 font-black leading-none">Status</p>
                          <p className="text-zinc-300 font-bold leading-none mt-1">Leaderboard</p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-zinc-900 pt-3 flex gap-2 w-full justify-between">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFollow(room.host);
                        }}
                        className={cn(
                          "flex-1 py-1.5 font-black uppercase tracking-widest text-[8px] rounded-xl flex items-center justify-center gap-1 border cursor-pointer",
                          followedUsers.includes(room.host)
                            ? "border-amber-400/30 text-amber-400 bg-amber-400/5 hover:bg-amber-400/10"
                            : "bg-amber-400 text-black border-amber-400 hover:bg-amber-300"
                        )}
                      >
                        <Star className={cn("w-2.5 h-2.5", followedUsers.includes(room.host) ? "fill-amber-400 text-amber-400" : "fill-transparent")} />
                        {followedUsers.includes(room.host) ? 'Following' : 'Follow'}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDirectMessageTarget(room.host);
                          setShowHostCard(false);
                        }}
                        className="flex-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-350 py-1.5 font-black uppercase tracking-widest text-[8px] rounded-xl flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <MessageSquare className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                        Chat Message
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          <div>
            <h2 className="text-white font-black uppercase tracking-tight text-sm flex items-center gap-2">
              {roomTitle}
              {room.type === 'video' && <Video className="w-3 h-3 text-blue-400" />}
              {isPrivate && <Lock className="w-3 h-3 text-amber-400" />}
            </h2>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest flex items-center gap-1.5">
                Host: @{room.host}
                {room.tier === 'Gold Agency' && (
                  <span className="bg-amber-400/10 text-amber-500 border border-amber-400/20 px-1.5 py-0.5 rounded-md text-[8px] flex items-center gap-1 animate-pulse shadow-lg shadow-amber-400/5">
                    <Trophy className="w-2 h-2" />
                    VIP
                  </span>
                )}
              </span>
              <div className="w-1 h-1 bg-zinc-700 rounded-full" />
              <div className="flex items-center gap-1">
                <Users className="w-3 h-3 text-zinc-400" />
                <span className="text-[10px] text-zinc-400 font-bold">1.2K</span>
              </div>
              <div className="w-1 h-1 bg-zinc-700 rounded-full" />
              <div className="flex items-center gap-1 bg-zinc-800 px-1.5 py-0.5 rounded-lg border border-zinc-700">
                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                <span className="text-[10px] text-amber-400 font-black font-mono">{formatTime(timeLeft)}</span>
              </div>
              
              {/* Agency Performance Badge directly on Host profile card / Room structure */}
              <div className="w-1 h-1 bg-zinc-700 rounded-full" />
              <button
                type="button"
                onClick={() => setShowHostCard(!showHostCard)}
                className="text-[8px] font-black text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-md flex items-center gap-1 hover:bg-amber-400/20 active:scale-95 transition-all select-none cursor-pointer"
                title="Click to view Host Agency Performance rating"
              >
                <TrendingUp className="w-2.5 h-2.5 shrink-0 text-amber-400" />
                PERF: {hostProfileDetail?.performance ?? 82}%
              </button>

              {broadcastBgm && broadcastBgm.isPlaying && (
                <div className="flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-md text-[8px] uppercase font-black tracking-widest animate-pulse max-w-[260px] truncate select-none">
                  <Music className="w-2.5 h-2.5 text-emerald-400 animate-bounce shrink-0" />
                  <span className="truncate">Synced: {broadcastBgm.title}</span>
                </div>
              )}
            </div>
            {roomDescription && (
              <div className="mt-3 max-w-lg bg-zinc-950/40 border border-zinc-900/60 rounded-xl px-4 py-2 text-xs text-zinc-300 leading-relaxed italic relative">
                <span className="absolute -top-2 left-3 bg-[#0a0a0c] px-1.5 text-[8px] font-black uppercase tracking-widest text-zinc-500 border border-zinc-900/40 rounded-full select-none">About Room</span>
                <p className="mt-1 line-clamp-2 md:line-clamp-none font-medium">
                  {roomDescription}
                </p>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex gap-2">
          {/* Sit & Earn Button */}
          <button 
            type="button"
            onClick={() => setShowSitEarnPanel(true)}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-2.5 rounded-xl hover:scale-105 transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2 px-4 border border-indigo-500/30 relative"
          >
            <Coins className="w-5 h-5 text-amber-300 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Sit & Earn</span>
            {isUserSitting && (
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </span>
            )}
          </button>

          {isHost && (
            <button 
              onClick={() => setShowHostConsole(true)}
              className="bg-amber-400 text-black p-2.5 rounded-xl hover:scale-105 transition-all shadow-lg shadow-amber-400/20 flex items-center gap-2 px-4"
            >
              <ShieldCheck className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Console</span>
            </button>
          )}
          <button className="bg-zinc-800 p-2.5 rounded-xl text-zinc-400 hover:text-white transition-colors">
            <Share2 className="w-5 h-5" />
          </button>
          <button 
            onClick={onLeave}
            className="bg-red-500/10 border border-red-500/20 p-2.5 rounded-xl text-red-500 hover:bg-red-500 hover:text-white transition-all shadow-lg shadow-red-500/5"
          >
            <X className="w-5 h-5 font-black" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Gallery / Stage */}
        <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
          <div className="max-w-4xl mx-auto space-y-8">
            
            {/* Top Video Stage (if video) */}
            {room.type === 'video' && (
              <div className="aspect-video w-full rounded-[2.5rem] bg-zinc-900 overflow-hidden relative border border-zinc-800 shadow-2xl group">
                {isStreaming ? (
                  <>
                    <img 
                      src={`https://picsum.photos/seed/${room.id}/1280/720`} 
                      className={cn(
                        "w-full h-full object-cover transition-opacity duration-700",
                        isPlaying ? "opacity-80" : "opacity-40 grayscale"
                      )} 
                      alt="Stream"
                      referrerPolicy="no-referrer"
                    />
                    
                    {/* Video Controls Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <motion.button 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 text-white shadow-2xl"
                      >
                        {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
                      </motion.button>
  
                      {/* Bottom Controls Bar */}
                      <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
                        <div className="flex items-center gap-4 bg-black/40 backdrop-blur-xl p-2 pl-4 rounded-2xl border border-white/5">
                          <button 
                            onClick={() => setIsMutedVideo(!isMutedVideo)}
                            className="text-white hover:text-amber-400 transition-colors"
                          >
                            {isMutedVideo || volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                          </button>
                          <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={isMutedVideo ? 0 : volume}
                            onChange={(e) => {
                              setVolume(parseInt(e.target.value));
                              if (parseInt(e.target.value) > 0) setIsMutedVideo(false);
                            }}
                            className="w-24 h-1.5 bg-white/20 rounded-full appearance-none cursor-pointer accent-amber-400"
                          />
                        </div>
  
                        <div className="bg-black/40 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/5">
                          <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">{streamQuality} HD</span>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-950">
                    <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mb-4">
                      <VideoOff className="w-8 h-8 text-zinc-700" />
                    </div>
                    <p className="text-zinc-600 font-bold uppercase tracking-widest text-xs italic">Stream Paused by Host</p>
                  </div>
                )}
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-xl px-4 py-2 rounded-2xl flex items-center gap-2 border border-white/5">
                  <div className={cn("w-2 h-2 rounded-full", isStreaming ? "bg-red-500 animate-pulse" : "bg-zinc-600")} />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white">
                    {isStreaming ? 'Live Stream' : 'Offline'}
                  </span>
                </div>
              </div>
            )}
  
            {/* Announcement Box */}
            <div className="bg-black/50 border border-zinc-900 p-6 rounded-[2rem] z-10 backdrop-blur-md">
              <h3 className="text-red-500 font-black text-xs uppercase tracking-widest mb-2">Announcement</h3>
              <p className="text-zinc-400 text-xs text-balance">
                  Welcome to the voice chat room! Please follow community guidelines.
                  Be respectful, avoid spam, and enjoy chatting together.
              </p>
            </div>
  
            {/* Seat Grid */}
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
              {seats.map((seat) => (
                <motion.div 
                  key={seat.id}
                  layout
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1,
                    ...(shakingSeatId === seat.id ? { x: [-3, 3, -3, 3, 0], backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.5)' } : {})
                  }}
                  transition={{ duration: 0.3, type: 'spring', stiffness: 200, damping: 20 }}
                  onClick={() => handleSeatClick(seat)}
                  className={cn(
                    "aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border relative cursor-pointer overflow-hidden group",
                    seat.occupied 
                      ? (seat.isLocked ? "bg-red-950/10 border-red-900/50" : "bg-zinc-900 border-zinc-800")
                      : (seat.isLocked ? "bg-red-950/10 border-red-900/30 border-dashed" : "bg-zinc-950 border-zinc-900 border-dashed hover:border-zinc-700"),
                    seat.user && blockedUsers.includes(seat.user.name) && "opacity-40 grayscale",
                    requestedSeats.some(r => r.seatId === seat.id) && "border-amber-400/50 bg-amber-400/5"
                  )}
                >
                  <AnimatePresence>
                    {activeSeatInfoId === seat.id && (
                      <SeatOverlay seat={seat} onModerate={() => openModeration(seat)} onLeaveSeat={leaveSeat} />
                    )}
                  </AnimatePresence>
                  
                  {isHost ? (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleLockSeat(seat.id);
                      }}
                      className={cn(
                        "absolute top-1.5 right-1.5 z-[40] p-1.5 flex items-center justify-center rounded-xl bg-black/60 shadow-lg border backdrop-blur-md transition-all sm:opacity-0 sm:group-hover:opacity-100",
                        seat.isLocked ? "border-red-500/50 sm:hover:bg-red-500/20 opacity-100" : "border-zinc-800 sm:hover:bg-zinc-800/80"
                      )}
                      title={seat.isLocked ? "Unlock Seat" : "Lock Seat"}
                    >
                      {seat.isLocked ? <Unlock className="w-3 h-3 text-red-500" /> : <Lock className="w-3 h-3 text-zinc-400" />}
                    </button>
                  ) : (
                    seat.isLocked && (
                      <div className="absolute top-1.5 right-1.5 z-[30] p-1.5 flex items-center justify-center rounded-xl bg-black/60 shadow-lg border border-red-500/50 backdrop-blur-md">
                        <Lock className="w-3 h-3 text-red-500" />
                      </div>
                    )
                  )}

                  {seat.occupied ? (
                    <>
                      <AnimatePresence>
                        {activeEntryEffects.includes(seat.id) && (
                          <motion.div 
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1.5 }}
                            exit={{ opacity: 0, scale: 2 }}
                            transition={{ duration: 1, repeat: 2 }}
                            className="absolute inset-0 z-0"
                          >
                            <div className="absolute inset-0 bg-amber-400/30 blur-2xl rounded-full" />
                            <Sparkles className="absolute inset-x-0 mx-auto w-full h-full text-amber-400 opacity-40 animate-spin-slow" />
                          </motion.div>
                        )}
                      </AnimatePresence>
                      <div className="relative w-full h-full flex items-center justify-center p-1 z-10 block transition-transform group-hover:scale-95">
                        {seat.user?.videoEnabled ? (
                          <div className="w-full h-full rounded-xl overflow-hidden bg-black">
                            <img 
                              src={`https://picsum.photos/seed/${seat.user.name}/300/300`} 
                              className="w-full h-full object-cover opacity-90 animate-pulse" 
                              alt="User feed"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                          </div>
                        ) : (
                          <div className="relative">
                            <img src={seat.user?.avatar} alt="User" className="w-10 h-10 rounded-full border-2 border-amber-400/20" />
                          </div>
                        )}
  
                        {/* Voice effect indicator */}
                        {(seat.user?.voiceEffect && seat.user.voiceEffect !== 'none') || (seat.user?.name === auth.currentUser?.displayName && selectedVoiceEffect !== 'none') ? (
                          <div className="absolute top-1 left-1 bg-purple-500 w-4 h-4 rounded-full border-2 border-black flex items-center justify-center shadow-lg shadow-purple-500/20">
                            <Wand2 className="w-2 h-2 text-white animate-pulse" />
                          </div>
                        ) : null}
  
                        {blockedUsers.includes(seat.user?.name || '') ? (
                          <div className="absolute top-1 right-1 bg-red-500 w-4 h-4 rounded-full border-2 border-black flex items-center justify-center z-20">
                            <Slash className="w-2 h-2 text-white" />
                          </div>
                        ) : (
                          <div className={cn(
                            "absolute bottom-0 right-0 w-6 h-6 rounded-full border-2 border-black flex items-center justify-center shadow-md z-20",
                            seat.user?.isMuted ? "bg-red-500" : (seat.user?.videoEnabled ? "bg-green-500" : "bg-amber-400")
                          )}>
                            {seat.user?.isMuted ? (
                              <MicOff className="w-3 h-3 text-white" />
                            ) : (
                              <Mic className="w-3 h-3 text-white" />
                            )}
                          </div>
                        )}
                      </div>
                      <span className="absolute bottom-1 text-[7px] font-black text-white/50 uppercase truncate px-1 bg-black/40 backdrop-blur-md rounded-full z-20">
                        {seat.user?.name}
                      </span>
                      {isHost && (
                        <div className="absolute inset-0 bg-black/95 opacity-0 group-hover:opacity-100 transition-all duration-300 flex flex-col items-center justify-center z-[25] rounded-2xl backdrop-blur-md border border-amber-400/40 gap-2 p-2 pointer-events-auto">
                          <span className="text-[8px] font-black uppercase text-amber-400 tracking-widest">
                            {seat.user.name === room.host ? "Host Seat" : "Moderate Seat"}
                          </span>
                          <div className="flex gap-2">
                            {/* Mute Button */}
                            <button
                              onClick={(e) => { 
                                e.stopPropagation(); 
                                muteUser(seat.user.name); 
                              }}
                              className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 hover:border-zinc-700 flex items-center justify-center transition-all active:scale-95 shadow-md"
                              title={seat.user.isMuted ? "Unmute" : "Mute"}
                            >
                              {seat.user.isMuted ? (
                                <Mic className="w-3.5 h-3.5 text-green-400 animate-pulse" />
                              ) : (
                                <MicOff className="w-3.5 h-3.5 text-red-500" />
                              )}
                            </button>

                            {/* Leave or Kick Button */}
                            {seat.user.name === room.host ? (
                              <button
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  leaveSeat(); 
                                }}
                                className="w-8 h-8 rounded-xl bg-red-950/20 border border-red-500/30 hover:bg-red-900/40 hover:border-red-500/50 flex items-center justify-center transition-all active:scale-95 shadow-md"
                                title="Leave Seat"
                              >
                                <X className="w-4 h-4 text-red-500" />
                              </button>
                            ) : (
                              <button
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  kickUser(seat.user.name); 
                                }}
                                className="w-8 h-8 rounded-xl bg-red-950/20 border border-red-500/30 hover:bg-red-900/40 hover:border-red-500/50 flex items-center justify-center transition-all active:scale-95 shadow-md"
                                title="Kick User"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              </button>
                            )}
                          </div>

                          <button
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              openModeration(seat); 
                            }}
                            className="text-[8px] font-black text-amber-400 bg-amber-400/10 px-3 py-1.5 rounded-lg uppercase tracking-wider hover:bg-amber-400/20 transition-colors border border-amber-400/20 active:scale-95 shadow-sm"
                          >
                            Settings Panel
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* Visual representations of non-occupied states (Locked or with/without Pending Requests) */}
                      {seat.isLocked ? (
                        <div className="absolute inset-0 bg-gradient-to-b from-red-950/20 to-red-950/5 flex flex-col items-center justify-center pointer-events-none p-2 select-none">
                          <div className="relative mb-1">
                            <div className="absolute inset-0 bg-red-500/20 blur-md rounded-full" />
                            <Lock className="w-5 h-5 text-red-500 relative z-10 animate-pulse" />
                          </div>
                          <span className="text-[7px] font-black text-red-500 uppercase tracking-[0.25em] text-center opacity-90 drop-shadow">
                            Locked Seat
                          </span>
                        </div>
                      ) : (
                        <>
                          {requestedSeats.some(r => r.seatId === seat.id) ? (
                            <div className="absolute inset-0 bg-gradient-to-b from-amber-400/[0.08] to-transparent flex flex-col items-center justify-center pointer-events-none p-2 select-none">
                              <div className="relative mb-2">
                                <div className="absolute inset-x-0 mx-auto w-8 h-8 rounded-full bg-amber-400/20 animate-ping" />
                                <div className="w-8 h-8 rounded-full bg-amber-400/10 border border-amber-400/40 flex items-center justify-center text-amber-400 relative z-10 shadow-lg shadow-amber-400/10">
                                  {requestedSeats.some(r => r.seatId === seat.id && r.userName === currentUserDisplayName) ? (
                                    <Send className="w-3.5 h-3.5 animate-pulse" />
                                  ) : (
                                    <Users className="w-3.5 h-3.5" />
                                  )}
                                </div>
                              </div>
                              <span className="text-[7px] font-black text-amber-400 uppercase tracking-[0.18em] animate-pulse text-center">
                                {requestedSeats.some(r => r.seatId === seat.id && r.userName === currentUserDisplayName) ? (
                                  "Request Sent"
                                ) : (
                                  `${requestedSeats.filter(r => r.seatId === seat.id).length} Requested`
                                )}
                              </span>
                            </div>
                          ) : (
                            <>
                              <div className={cn(
                                "w-8 h-8 rounded-full border border-dashed flex items-center justify-center transition-all group-hover:scale-110",
                                "border-zinc-800 text-zinc-600 group-hover:border-zinc-500 group-hover:text-zinc-400 group-hover:rotate-45"
                              )}>
                                <Star className="w-4 h-4 transition-transform group-hover:scale-95" />
                              </div>
                              <span className="text-[6px] font-black text-zinc-600 uppercase tracking-widest mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                Join Seat
                              </span>
                            </>
                          )}
                        </>
                      )}
                    </>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Chat Sidebar Wrapper */}
        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: '100%', maxWidth: '380px', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="hidden lg:block border-l border-zinc-900 bg-black/20"
            >
              <div className="flex flex-col h-full">
                {messages.length >= chatLimit && (
                  <button 
                    onClick={() => {
                        setChatLimit(prev => prev + 50);
                        setIsLoadingMore(true);
                    }}
                    disabled={isLoadingMore}
                    className="m-4 py-2 border border-zinc-800 rounded-xl text-[10px] font-black uppercase text-zinc-500 hover:text-white transition-all"
                  >
                    {isLoadingMore ? 'Loading...' : 'Load legacy messages'}
                  </button>
                )}
                <ChatSidebar 
                  messages={messages.filter(msg => !blockedUsers.includes(msg.senderName))} 
                  onSendMessage={handleSendMessage}
                  onDeleteMessage={deleteMessage}
                  onSeatClick={handleSeatClick}
                  isHost={isHost}
                  roomHost={room.host}
                  users={seats.filter(s => s.occupied && s.user).map(s => ({ name: s.user.name, avatar: s.user.avatar }))}
                  seats={seats}
                  onUpdateRoom={handleUpdateRoomSettings}
                  roomData={{
                    ...room,
                    settings: {
                      isPrivate,
                      entryEffectsEnabled,
                      isBgmEnabled,
                      entryFee
                    }
                  }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Chat Overlay Toggle */}
      <div className="lg:hidden absolute bottom-32 right-6 z-[70]">
         <button 
           onClick={() => setShowChat(!showChat)}
           className="w-14 h-14 bg-amber-400 text-black rounded-full shadow-2xl flex items-center justify-center animate-bounce"
         >
           <MessageSquare className="w-6 h-6" />
         </button>
      </div>
      
      {/* Mobile Chat Panel */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            className="lg:hidden fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col pt-12"
          >
            <button 
              onClick={() => setShowChat(false)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white"
            >
              <ChevronDown className="w-8 h-8" />
            </button>
            <div className="flex-1 overflow-hidden">
               <ChatSidebar 
                messages={messages.filter(msg => !blockedUsers.includes(msg.senderName))} 
                onSendMessage={handleSendMessage}
                onDeleteMessage={deleteMessage}
                isHost={isHost}
                roomHost={room.host}
                users={seats.filter(s => s.occupied && s.user).map(s => ({ name: s.user.name, avatar: s.user.avatar }))}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Control Bar */}
      <div className="p-6 bg-black/80 backdrop-blur-2xl border-t border-zinc-900 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowChat(!showChat)}
            className={cn(
              "p-4 rounded-2xl flex items-center gap-2 transition-all",
              showChat ? "bg-amber-400 text-black shadow-lg shadow-amber-400/20" : "bg-zinc-900 text-zinc-400 border border-zinc-800"
            )}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">
              {showChat ? 'Hide Chat' : 'Show Chat'}
            </span>
          </button>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={() => setIsLocalVideoOn(!isLocalVideoOn)}
            className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center transition-all",
              isLocalVideoOn ? "bg-amber-400 text-black" : "bg-zinc-900 text-zinc-400 border border-zinc-800"
            )}
          >
            {isLocalVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
          </button>
          <button 
            onClick={() => setShowVoiceFX(true)}
            disabled={!voiceFXEnabled && !isHost}
            className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center transition-all border",
              selectedVoiceEffect !== 'none' ? "bg-purple-500 text-white border-purple-400 shadow-lg shadow-purple-500/20" : "bg-zinc-900 text-zinc-400 border-zinc-800",
              (!voiceFXEnabled && !isHost) && "opacity-20 grayscale cursor-not-allowed"
            )}
          >
            <Wand2 className="w-6 h-6" />
          </button>
          <button 
            onClick={() => {
              const newMuted = !isMuted;
              setIsMuted(newMuted);
              toggleMyMute(newMuted);
            }}
            className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center transition-all",
              isMuted ? "bg-red-500 text-white" : "bg-zinc-900 text-zinc-400 border border-zinc-800"
            )}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>
          <button 
            onClick={() => {
              setIsPurchaseMode(false);
              setShowGifts(true);
            }}
            className="w-14 h-14 bg-amber-400 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-400/20 active:scale-95 transition-all"
          >
            <Gift className="w-6 h-6 text-black" />
          </button>
          <button className="w-14 h-14 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center text-zinc-400">
            <MoreHorizontal className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Sit & Earn Modal Overlay */}
      <AnimatePresence>
        {showSitEarnPanel && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSitEarnPanel(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-md z-[150]"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="fixed inset-0 flex items-center justify-center p-6 z-[160] pointer-events-none"
            >
              <div className="bg-zinc-950 border border-zinc-900 rounded-[3rem] w-full max-w-lg overflow-hidden pointer-events-auto shadow-2xl relative">
                <button
                  type="button"
                  onClick={() => setShowSitEarnPanel(false)}
                  className="absolute top-6 right-6 bg-zinc-900 p-2 rounded-xl text-zinc-400 hover:text-white transition-all z-10 border border-zinc-850"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="p-8">
                  {/* Title Header */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-purple-500/10 rounded-2xl flex items-center justify-center border border-purple-500/20 shadow-lg shadow-purple-500/5">
                      <Coins className="w-6 h-6 text-amber-300 pointer-events-none" />
                    </div>
                    <div className="text-left">
                      <h2 className="text-2xl font-black text-white italic uppercase tracking-tight flex items-center gap-2">
                        Barca Sit & Earn
                        <Sparkles className="w-4 h-4 text-amber-400" />
                      </h2>
                      <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest text-left">Sit down on a seat to start earning</p>
                    </div>
                  </div>

                  {/* Sitting Status Alert Banner */}
                  <div className={cn(
                    "p-4 rounded-2xl border text-[10px] font-bold uppercase tracking-widest flex items-center gap-3 mb-6",
                    isUserSitting 
                      ? "bg-green-500/5 border-green-500/20 text-green-400" 
                      : "bg-amber-500/5 border-amber-500/20 text-amber-400"
                  )}>
                    <div className={cn(
                      "w-2.5 h-2.5 rounded-full flex-shrink-0",
                      isUserSitting ? "bg-green-500 animate-pulse" : "bg-amber-500"
                    )} />
                    <span className="text-left leading-relaxed">
                      {isUserSitting 
                        ? "Active earning: Sitting on a seat 🟢" 
                        : "Inactive: Find an empty seat and sit down to start counting progress ⚪"}
                    </span>
                  </div>

                  {/* Dynamic Registration Status Banner */}
                  <div className="p-4 rounded-2xl border border-zinc-900 bg-zinc-900/40 space-y-1 mb-6 text-left">
                    <div className="flex items-center gap-2">
                      <Trophy className={cn("w-4 h-4", isNewUser ? "text-amber-400" : "text-blue-400")} />
                      <span className={cn(
                        "text-[10px] font-black uppercase tracking-wider",
                        isNewUser ? "text-amber-400" : "text-blue-400"
                      )}>
                        {isNewUser ? "⚡ New User Eligibility" : "⭐ Established User"}
                      </span>
                    </div>
                    <p className="text-zinc-500 text-[9px] font-medium leading-relaxed uppercase">
                      {isNewUser 
                        ? "Registered within 8 days. Daily rewards have a pool of 20,000,000 (20k) coins maximum per day." 
                        : "Registered 8+ days ago. Daily rewards have a pool of 10,000,000 (10k) coins maximum per day, earned without limit forever!"}
                    </p>
                  </div>

                  {/* Timer Progress Block */}
                  <div className="space-y-3 bg-black/40 border border-zinc-900 rounded-[2rem] p-6 mb-6">
                    <div className="flex justify-between items-end">
                      <div className="space-y-1 text-left">
                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">Today's Sitting Time</span>
                        <div className="text-2xl font-black font-mono text-white tracking-wider">
                          {Math.floor(localDuration / 3600).toString().padStart(2, '0')}h{' '}
                          {Math.floor((localDuration % 3600) / 60).toString().padStart(2, '0')}m{' '}
                          {(localDuration % 60).toString().padStart(2, '0')}s
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">Goal Milestone</span>
                        <span className="text-xs font-black text-amber-400 font-mono">2h 00m 00s</span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1">
                      <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-850">
                        <motion.div 
                          className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-amber-400"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (localDuration / 7200) * 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[8px] font-black text-zinc-600 uppercase tracking-widest">
                        <span>Started</span>
                        <span>1 Hour (Half)</span>
                        <span>2 Hours (Full)</span>
                      </div>
                    </div>
                  </div>

                  {/* Milestones Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* milestone 1 */}
                    <div className={cn(
                      "p-5 rounded-3xl border flex flex-col justify-between h-40 transition-all text-left",
                      localDuration >= 3600 
                        ? "bg-purple-500/5 border-purple-500/20" 
                        : "bg-zinc-900/10 border-zinc-900/50 opacity-60"
                    )}>
                      <div>
                        <div className="flex items-center gap-1 text-purple-400 bg-purple-500/10 border border-purple-500/20 rounded-lg px-2 py-0.5 w-max mb-3">
                          <Trophy className="w-3 h-3" />
                          <span className="text-[8px] font-black uppercase tracking-widest">Half Task</span>
                        </div>
                        <h4 className="text-xs font-black text-white uppercase tracking-tight">60 Min Milestone</h4>
                        <p className="text-[10px] text-amber-400 font-bold mt-1 font-mono flex items-center gap-1">
                          <Coins className="w-3 h-3 text-amber-400" />
                          +{isNewUser ? "10,000,000" : "5,000,000"}
                        </p>
                      </div>

                      {sitEarnState.claimedHalf ? (
                        <div className="bg-green-500/10 border border-green-500/20 text-green-400 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest text-center">
                          Claimed ✓
                        </div>
                      ) : localDuration >= 3600 ? (
                        <button
                          type="button"
                          onClick={() => claimSittingReward(true)}
                          disabled={isClaimingReward !== null}
                          className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-white font-black py-3 rounded-2xl text-[9px] uppercase tracking-widest text-center hover:scale-[1.03] active:scale-[0.97] transition-all shadow-lg"
                        >
                          {isClaimingReward === 'half' ? "Claiming..." : "Claim Coins"}
                        </button>
                      ) : (
                        <div className="bg-zinc-900 border border-zinc-800 text-zinc-500 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest text-center">
                          {Math.floor(localDuration / 60)}/60 min lock
                        </div>
                      )}
                    </div>

                    {/* milestone 2 */}
                    <div className={cn(
                      "p-5 rounded-3xl border flex flex-col justify-between h-40 transition-all text-left",
                      localDuration >= 7200 
                        ? "bg-indigo-500/5 border-indigo-500/20" 
                        : "bg-zinc-900/10 border-zinc-900/50 opacity-60"
                    )}>
                      <div>
                        <div className="flex items-center gap-1 text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-2 py-0.5 w-max mb-3">
                          <Trophy className="w-3 h-3" />
                          <span className="text-[8px] font-black uppercase tracking-widest">Full Task</span>
                        </div>
                        <h4 className="text-xs font-black text-white uppercase tracking-tight">120 Min Milestone</h4>
                        <p className="text-[10px] text-amber-400 font-bold mt-1 font-mono flex items-center gap-1">
                          <Coins className="w-3 h-3 text-amber-400" />
                          +{isNewUser ? "10,000,000" : "5,000,000"}
                        </p>
                      </div>

                      {sitEarnState.claimedFull ? (
                        <div className="bg-green-500/10 border border-green-500/20 text-green-400 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest text-center">
                          Claimed ✓
                        </div>
                      ) : localDuration >= 7200 ? (
                        <button
                          type="button"
                          onClick={() => claimSittingReward(false)}
                          disabled={isClaimingReward !== null}
                          className="w-full bg-gradient-to-r from-amber-400 to-orange-500 text-white font-black py-3 rounded-2xl text-[9px] uppercase tracking-widest text-center hover:scale-[1.03] active:scale-[0.97] transition-all shadow-lg"
                        >
                          {isClaimingReward === 'full' ? "Claiming..." : "Claim Coins"}
                        </button>
                      ) : (
                        <div className="bg-zinc-900 border border-zinc-800 text-zinc-500 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest text-center">
                          {Math.floor(localDuration / 60)}/120 min lock
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Host Console Overlay */}
      <AnimatePresence>
        {showHostConsole && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowHostConsole(false)}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70]"
            />
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-zinc-950 border-l border-zinc-900 z-[80] shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-zinc-900 bg-black/40 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-amber-400 p-2 rounded-xl text-black">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-black text-white italic uppercase tracking-tighter">Host Console</h2>
                </div>
                <button 
                  onClick={() => setShowHostConsole(false)}
                  className="bg-zinc-900 p-2 rounded-xl text-zinc-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex border-b border-zinc-900 bg-zinc-950/50">
                {[
                  { id: 'broadcast', label: 'Broadcast', icon: Radio },
                  { id: 'analytics', label: 'Analytics', icon: TrendingUp },
                  { id: 'requests', label: 'Requests', icon: Bell },
                  { id: 'users', label: 'Participants', icon: Users },
                  { id: 'permissions', label: 'Moderation', icon: Shield },
                  { id: 'settings', label: 'Room', icon: Settings }
                ].map((tab: any) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveConsoleTab(tab.id)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative",
                      activeConsoleTab === tab.id ? "text-amber-400" : "text-zinc-500 hover:text-zinc-300"
                    )}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                    {activeConsoleTab === tab.id && (
                      <motion.div 
                        layoutId="console-tab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400"
                      />
                    )}
                    {tab.id === 'requests' && requestedSeats.length > 0 && (
                      <span className="absolute top-2 right-4 w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-12 no-scrollbar">
                <AnimatePresence mode="wait">
                  {activeConsoleTab === 'broadcast' && (
                    <motion.div
                      key="broadcast-tab"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-12"
                    >
                      {/* Streaming Controls */}
                      <section className="space-y-4">
                        <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Broadcast Management</h3>
                        <div className="space-y-4">
                          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2.5rem] flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                              <div className={cn("w-3 h-3 rounded-full", isStreaming ? "bg-red-500 animate-pulse outline outline-4 outline-red-500/20" : "bg-zinc-800")} />
                              <div>
                                <p className="text-white font-bold tracking-tight">{isStreaming ? 'STREAMING LIVE' : 'BROADCAST IDLE'}</p>
                                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">
                                  {streamQuality} • 60fps • {
                                    streamQuality === '4K' ? '25 Mbps' : 
                                    streamQuality === '1080p' ? '6.0 Mbps' : '2.5 Mbps'
                                  }
                                </p>
                              </div>
                            </div>
                              <button 
                                onClick={async () => {
                                  const newVal = !isStreaming;
                                  setIsStreaming(newVal);
                                  handleUpdateRoomSettings({ status: newVal ? 'live' : 'idle' });
                                }}
                                className={cn(
                                  "px-6 py-3 rounded-2xl flex items-center gap-2 transition-all shadow-xl font-black text-[10px] uppercase tracking-widest",
                                  isStreaming ? "bg-red-500 text-white shadow-red-500/20" : "bg-green-500 text-white shadow-green-500/20"
                                )}
                              >
                                {isStreaming ? (
                                  <>
                                    <VideoOff className="w-4 h-4" />
                                    Stop Broadcast
                                  </>
                                ) : (
                                  <>
                                    <Radio className="w-4 h-4" />
                                    Start Broadcast
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Video Preview Feed */}
                            <div className="bg-black/40 border border-zinc-800 rounded-[2.5rem] p-2 overflow-hidden aspect-video relative group">
                              {isStreaming ? (
                                <>
                                  <img 
                                    src={`https://picsum.photos/seed/preview-${room.id}/640/360`} 
                                    className={cn("w-full h-full object-cover rounded-[2rem] transition-opacity", !isPlaying && "opacity-40 grayscale")} 
                                    alt="Preview"
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button 
                                      onClick={() => setIsPlaying(!isPlaying)}
                                      className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 text-white"
                                    >
                                      {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                                    </button>
                                  </div>
                                  <div className="absolute bottom-6 left-6 px-3 py-1 bg-black/60 backdrop-blur-lg rounded-full border border-white/10">
                                    <span className="text-[8px] font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                                      Live Preview
                                    </span>
                                  </div>
                                </>
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                                  <VideoOff className="w-10 h-10 text-zinc-800" />
                                  <p className="text-zinc-700 text-[10px] font-black uppercase tracking-widest italic">Preview Not Available</p>
                                </div>
                              )}
                            </div>
                        </div>
                      </section>

                      {/* Performance Stats */}
                      <section className="space-y-4">
                        <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Stream Analytics</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem] space-y-2">
                            <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest">Concurrent</p>
                            <p className="text-xl font-black text-white italic">1,242</p>
                          </div>
                          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem] space-y-2">
                            <p className="text-zinc-500 text-[9px] font-black uppercase tracking-widest">Gifts Value</p>
                            <p className="text-xl font-black text-amber-500 italic">42.8K</p>
                          </div>
                        </div>
                      </section>
                    </motion.div>
                  )}

                  {activeConsoleTab === 'analytics' && (
                    <motion.div
                      key="analytics-tab"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-12"
                    >
                      <RoomAnalytics roomTitle={room.id} />
                    </motion.div>
                  )}

                  {activeConsoleTab === 'requests' && (
                    <motion.div
                      key="requests-tab"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-12"
                    >
                      {/* Stage Requests */}
                      <section className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Stage Requests</h3>
                          {requestedSeats.length > 0 && (
                            <span className="bg-amber-400 text-black text-[9px] font-black px-2 py-0.5 rounded-full">
                              {requestedSeats.length} NEW
                            </span>
                          )}
                        </div>
                        
                        <div className="space-y-3">
                          {requestedSeats.length > 0 ? (
                            requestedSeats.map(request => (
                              <div key={request.seatId} className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between group">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-500">
                                    {request.seatId + 1}
                                  </div>
                                  <div>
                                    <p className="text-white text-xs font-bold uppercase tracking-tight">{request.userName}</p>
                                    <p className="text-zinc-500 text-[10px] font-medium uppercase">Join Request - Seat {request.seatId + 1}</p>
                                  </div>
                                </div>
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => setRequestedSeats(prev => prev.filter(r => r.seatId !== request.seatId))}
                                    className="bg-black text-zinc-400 p-2 rounded-lg hover:text-white transition-colors"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                  <button 
                                    onClick={() => acceptRequest(request)}
                                    className="bg-amber-400 text-black p-2 rounded-lg hover:bg-amber-300 transition-colors"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="bg-zinc-900/30 border border-zinc-900 border-dashed p-8 rounded-[2rem] text-center">
                              <Bell className="w-8 h-8 text-zinc-800 mx-auto mb-2" />
                              <p className="text-zinc-600 text-[10px] font-black uppercase tracking-widest italic">No pending requests</p>
                            </div>
                          )}
                        </div>
                      </section>
                    </motion.div>
                  )}

                  {activeConsoleTab === 'users' && (
                    <motion.div
                      key="users-tab"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-12"
                    >
                      {/* Participant Management */}
                      <section className="space-y-4">
                        <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Manage Participants</h3>
                        <div className="space-y-4">
                          {seats.filter(s => s.occupied && s.user).map((seat) => {
                            const user = seat.user;
                            const isSelected = selectedConsoleUser === user.name;
                            return (
                              <div 
                                key={user.name} 
                                className={cn(
                                  "bg-zinc-900 border transition-all rounded-2xl overflow-hidden flex flex-col group",
                                  isSelected ? "border-amber-400" : "border-zinc-800 hover:border-zinc-700"
                                )}
                              >
                                <div 
                                  className="flex items-center justify-between p-4 cursor-pointer"
                                  onClick={() => setSelectedConsoleUser(isSelected ? null : user.name)}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="relative">
                                      <img src={user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} className="w-8 h-8 rounded-full border border-zinc-700" alt={user.name} />
                                      {user.isMuted && <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-0.5"><MicOff className="w-2.5 h-2.5 text-white" /></div>}
                                    </div>
                                    <div>
                                      <p className="text-zinc-200 text-xs font-bold">{user.name}</p>
                                      <p className="text-[8px] text-zinc-500 font-black uppercase tracking-widest">{user.name === room.host ? 'Host' : 'Participant'}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedUserToModerate({ ...user, seatId: seat.id, isLocked: seat.isLocked });
                                        setShowHostConsole(false);
                                      }}
                                      className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                                      title="Open Full Moderation View"
                                    >
                                      <Settings className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                                {isSelected && (
                                  <div className="px-4 pb-4 space-y-4 border-t border-zinc-800/50 pt-4 bg-black/20">
                                    <div className="flex flex-wrap gap-2">
                                      <div className="flex-1 bg-zinc-950 border border-zinc-800/50 rounded-xl p-3 flex flex-col justify-center items-center gap-1">
                                        {user.isMuted ? <MicOff className="w-4 h-4 text-red-500" /> : <Mic className="w-4 h-4 text-green-500" />}
                                        <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Audio {user.isMuted ? 'Muted' : 'On'}</span>
                                      </div>
                                      {room.type === 'video' && (
                                        <div className="flex-1 bg-zinc-950 border border-zinc-800/50 rounded-xl p-3 flex flex-col justify-center items-center gap-1">
                                          {!user.videoEnabled ? <VideoOff className="w-4 h-4 text-red-500" /> : <Video className="w-4 h-4 text-green-500" />}
                                          <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Video {user.videoEnabled ? 'On' : 'Off'}</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <button 
                                        onClick={() => muteUser(user.name)}
                                        className={cn("flex-1 p-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2", user.isMuted ? "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30" : "bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700")}
                                      >
                                        {user.isMuted ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
                                        {user.isMuted ? "Unmute" : "Mute"}
                                      </button>
                                      {room.type === 'video' && (
                                        <button 
                                          onClick={() => toggleVideoUser(user.name)}
                                          className={cn("flex-1 p-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2", !user.videoEnabled ? "bg-amber-500/20 text-amber-500 hover:bg-amber-500/30" : "bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700")}
                                        >
                                          {!user.videoEnabled ? <Video className="w-3 h-3" /> : <VideoOff className="w-3 h-3" />}
                                          {!user.videoEnabled ? "Enable Cam" : "Disable Cam"}
                                        </button>
                                      )}
                                    </div>
                                    <div className="space-y-2 bg-zinc-950 p-3 rounded-xl border border-zinc-800/50">
                                      <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-zinc-500">
                                        <span>User Volume</span>
                                        <span>{Math.round((user.volume ?? 1) * 100)}%</span>
                                      </div>
                                      <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.05"
                                        value={user.volume ?? 1}
                                        onChange={(e) => adjustUserVolume(user.name, parseFloat(e.target.value))}
                                        className="w-full accent-amber-400 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                                      />
                                    </div>
                                    <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/50">
                                      <button 
                                        onClick={() => kickUser(user.name)}
                                        className="flex-1 p-2 rounded-lg text-orange-500 hover:text-white bg-orange-500/10 hover:bg-orange-500 transition-colors text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                                      >
                                        <ShieldAlert className="w-3 h-3" />
                                        Kick
                                      </button>
                                      <button 
                                        onClick={() => banUser(user.name)}
                                        className="flex-1 p-2 rounded-lg text-red-500 hover:text-white bg-red-500/10 hover:bg-red-500 transition-colors text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                                      >
                                        <Slash className="w-3 h-3" />
                                        Ban
                                      </button>
                                    </div>
                                    <div className="space-y-2 bg-zinc-950 p-3 rounded-xl border border-zinc-800/50">
                                      <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-zinc-500">
                                        <span>Voice Effect</span>
                                        <span>{user.voiceEffect || 'None'}</span>
                                      </div>
                                      <div className="grid grid-cols-4 gap-1">
                                        {['none', ...Object.keys(voiceSettings).filter(k => k !== 'none')].map(effectId => (
                                          <button
                                            key={effectId}
                                            onClick={() => applyVoiceEffect(user.name, effectId)}
                                            className={cn(
                                              "text-[8px] p-1.5 rounded-md font-bold uppercase tracking-wider transition-all truncate",
                                              (user.voiceEffect || 'none') === effectId ? "bg-purple-600 text-white shadow-md shadow-purple-500/20" : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
                                            )}
                                            title={effectId}
                                          >
                                            {effectId === 'none' ? 'None' : effectId === 'robotic' ? 'Robot' : effectId}
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </section>

                      {/* Moderators list */}
                      <section className="space-y-4">
                        <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Authorized Moderators</h3>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 space-y-4">
                          {[
                            { name: 'Admin_Ziyad', role: 'Super Admin' },
                            { name: 'System_Bot', role: 'Security' }
                          ].map(mod => (
                            <div key={mod.name} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-amber-400/10 flex items-center justify-center text-amber-400">
                                  <ShieldCheck className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="text-white text-xs font-bold tracking-tight">{mod.name}</p>
                                  <span className="text-zinc-500 text-[8px] font-black uppercase tracking-widest">{mod.role}</span>
                                </div>
                              </div>
                              <button className="text-zinc-600 hover:text-red-500 transition-colors">
                                <Slash className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                          <button className="w-full bg-zinc-800 text-zinc-400 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest hover:text-white transition-all border border-zinc-700/50">
                            Add Moderator
                          </button>
                        </div>
                      </section>

                      {/* Ban List */}
                      <section className="space-y-4">
                        <h3 className="text-[10px] font-black text-red-500/80 uppercase tracking-[0.3em]">Ban List</h3>
                        <div className="bg-zinc-900/50 border border-red-900/30 rounded-[2.5rem] p-6 space-y-4">
                          {bannedUsers.length > 0 ? (
                            bannedUsers.map(bannedUser => (
                              <div key={bannedUser} className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-zinc-800/50">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                                    <Slash className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className="text-zinc-300 text-xs font-bold">{bannedUser}</p>
                                    <span className="text-zinc-600 text-[8px] font-black uppercase tracking-widest">Banned</span>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => unbanUser(bannedUser)}
                                  className="text-zinc-500 hover:text-white bg-zinc-800/50 hover:bg-zinc-700 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all"
                                >
                                  Unban
                                </button>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-6">
                              <p className="text-zinc-500 text-xs italic tracking-widest font-black uppercase">No Banned Users</p>
                            </div>
                          )}
                        </div>
                      </section>
                    </motion.div>
                  )}

                  {activeConsoleTab === 'permissions' && (
                    <motion.div
                      key="permissions-tab"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-12"
                    >
                      {/* Global Control Center */}
                      <section className="space-y-4">
                        <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Room Guard Center</h3>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 space-y-6">
                           <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="bg-red-500/10 p-2 rounded-xl text-red-500">
                                <MicOff className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-white text-xs font-bold tracking-tight">Mute All Participants</p>
                                <p className="text-zinc-500 text-[8px] font-black uppercase tracking-widest mt-0.5">Instant global silence</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => {
                                const newSeats = seats.map(s => s.occupied ? { ...s, user: { ...s.user, isMuted: true } } : s);
                                setSeats(newSeats);
                                handleUpdateRoomSettings({ seats: newSeats });
                              }}
                              className="bg-zinc-800 px-4 py-2 rounded-xl text-[9px] font-black text-white uppercase tracking-widest hover:bg-zinc-700 transition-all border border-zinc-700/50 active:scale-95"
                            >
                              Apply
                            </button>
                          </div>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="bg-amber-400/10 p-2 rounded-xl text-amber-400">
                                <Lock className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-white text-xs font-bold tracking-tight">Lock Empty Seats</p>
                                <p className="text-zinc-500 text-[8px] font-black uppercase tracking-widest mt-0.5">Prevent new joins</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => {
                                const newSeats = seats.map(s => !s.occupied ? { ...s, isLocked: true } : s);
                                setSeats(newSeats);
                                handleUpdateRoomSettings({ seats: newSeats });
                              }}
                              className="bg-zinc-800 px-4 py-2 rounded-xl text-[9px] font-black text-white uppercase tracking-widest hover:bg-zinc-700 transition-all border border-zinc-700/50 active:scale-95"
                            >
                              Lock All
                            </button>
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t border-zinc-800/50">
                            <div className="flex items-center gap-3">
                              <div className="bg-blue-500/10 p-2 rounded-xl text-blue-500">
                                <ShieldAlert className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-white text-xs font-bold tracking-tight">Clear Chat History</p>
                                <p className="text-zinc-500 text-[8px] font-black uppercase tracking-widest mt-0.5">Atomic purge of all messages</p>
                              </div>
                            </div>
                            <button 
                              onClick={async () => {
                                if (window.confirm('Purge all chat history?')) {
                                  // Simplified logic: delete docs in messages collection
                                  // In simulation, we just clear the local state if it's a simulated room
                                  setMessages([]);
                                }
                              }}
                              className="bg-zinc-800 px-4 py-2 rounded-xl text-[9px] font-black text-white uppercase tracking-widest hover:bg-red-500 transition-all border border-zinc-700/50 active:scale-95"
                            >
                              Purge
                            </button>
                          </div>
                        </div>
                      </section>

                      {/* Participant Permission Grid */}
                      <section className="space-y-4">
                        <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Participant Permissions</h3>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] overflow-hidden">
                          <div className="p-4 bg-black/40 border-b border-zinc-800 flex items-center justify-between px-6">
                            <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 italic">User Identity</span>
                            <div className="flex gap-8 px-2">
                               <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 italic">Talk</span>
                               <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 italic">Cam</span>
                               <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 italic">Expel</span>
                            </div>
                          </div>
                          <div className="divide-y divide-zinc-800/50 max-h-[400px] overflow-y-auto no-scrollbar">
                            {seats.filter(s => s.occupied && s.user).map(s => (
                              <div key={s.user.name} className="p-4 px-6 flex items-center justify-between hover:bg-white/5 transition-all group">
                                <div className="flex items-center gap-3">
                                  <div className="relative">
                                    <img src={s.user.avatar} className="w-8 h-8 rounded-xl object-cover grayscale group-hover:grayscale-0 transition-all" />
                                    {s.user.name === room.host && (
                                       <div className="absolute -top-1 -left-1 bg-amber-400 p-0.5 rounded-full ring-2 ring-zinc-950">
                                         <Star className="w-2 h-2 text-black fill-current" />
                                       </div>
                                    )}
                                  </div>
                                  <div>
                                    <p className="text-white text-xs font-bold tracking-tight">{s.user.name}</p>
                                    <p className="text-[7px] text-zinc-500 font-black uppercase tracking-[0.2em]">{s.user.name === room.host ? 'Room Owner' : 'Verified User'}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-10">
                                  <button 
                                    onClick={() => muteUser(s.user.name)} 
                                    className={cn(
                                      "p-2 rounded-lg transition-all active:scale-90", 
                                      s.user.isMuted ? "text-red-500 bg-red-500/10" : "text-zinc-600 hover:text-green-500 hover:bg-green-500/10"
                                    )}
                                  >
                                    {s.user.isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                                  </button>
                                  <button 
                                    onClick={() => toggleVideoUser(s.user.name)} 
                                    className={cn(
                                      "p-2 rounded-lg transition-all active:scale-90", 
                                      !s.user.videoEnabled ? "text-red-500 bg-red-500/10" : "text-zinc-600 hover:text-green-500 hover:bg-green-500/10"
                                    )}
                                  >
                                    {!s.user.videoEnabled ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                                  </button>
                                  <button 
                                    onClick={() => s.user.name !== room.host && kickUser(s.user.name)} 
                                    disabled={s.user.name === room.host}
                                    className={cn(
                                      "p-2 rounded-lg transition-all active:scale-90",
                                      s.user.name === room.host ? "opacity-20 cursor-not-allowed" : "text-zinc-600 hover:text-orange-500 hover:bg-orange-500/10"
                                    )}
                                  >
                                    <ShieldAlert className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                            {seats.filter(s => s.occupied && s.user).length === 0 && (
                              <div className="p-12 text-center">
                                <p className="text-zinc-700 text-[10px] font-black uppercase tracking-[0.3em] italic">No active participants</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </section>

                      {/* Blacklist Management */}
                      <section className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                           <h3 className="text-[10px] font-black text-red-500/60 uppercase tracking-[0.3em]">Room Blacklist</h3>
                           <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">{bannedUsers.length} ENTRIES</span>
                        </div>
                        <div className="bg-zinc-900 border border-red-900/10 rounded-[2.5rem] p-6 space-y-4">
                          {bannedUsers.length > 0 ? (
                            bannedUsers.map(bannedUser => (
                              <div key={bannedUser} className="flex items-center justify-between p-4 rounded-2xl bg-black/40 border border-zinc-800/50 group">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 group-hover:bg-red-500 group-hover:text-white transition-all">
                                    <Slash className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className="text-zinc-300 text-xs font-bold">{bannedUser}</p>
                                    <span className="text-red-500/60 text-[8px] font-black uppercase tracking-widest">Permanent Ban</span>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => unbanUser(bannedUser)}
                                  className="text-zinc-500 hover:text-white bg-zinc-800/50 hover:bg-zinc-700 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                                >
                                  Pardon
                                </button>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8">
                              <ShieldCheck className="w-10 h-10 text-zinc-900 mx-auto mb-3" />
                              <p className="text-zinc-700 text-[10px] font-black uppercase tracking-widest italic">Zero Banned Entities</p>
                            </div>
                          )}
                        </div>
                      </section>
                    </motion.div>
                  )}

                  {activeConsoleTab === 'settings' && (
                    <motion.div
                      key="settings-tab"
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="space-y-12"
                    >
                      {/* Room Info */}
                      <section className="space-y-4">
                        <div className="flex items-center justify-between px-2">
                          <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Room Identity</h3>
                          <button 
                            onClick={() => handleUpdateRoomSettings({ title: roomTitle, description: roomDescription })}
                            className="text-[9px] font-black text-amber-400 uppercase tracking-widest hover:text-amber-300 transition-colors"
                          >
                            Sync Changes
                          </button>
                        </div>
                        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2.5rem] space-y-6">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest ml-1">Room Title</label>
                              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl px-1 py-1 flex items-center">
                                <input 
                                  type="text" 
                                  value={roomTitle} 
                                  onChange={(e) => setRoomTitle(e.target.value)}
                                  className="w-full bg-transparent px-4 py-3 text-white text-xs font-bold outline-none"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest ml-1">Room Description (Optional)</label>
                              <div className="bg-zinc-950 border border-zinc-800 rounded-2xl px-1 py-1 flex items-center">
                                <textarea
                                  value={roomDescription}
                                  onChange={(e) => setRoomDescription(e.target.value)}
                                  placeholder="What's this room about?"
                                  className="w-full bg-transparent px-4 py-3 text-white text-xs font-bold outline-none resize-none h-24"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </section>

                      {/* Stream Quality & Bitrate */}
                      <section className="space-y-4">
                        <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Stream Quality & Bitrate</h3>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 space-y-4">
                          <div className="grid grid-cols-3 gap-3">
                            {[
                              { id: '720p', label: 'HD 720p', bitrate: '2.5 Mbps' },
                              { id: '1080p', label: 'FULL HD', bitrate: '6.0 Mbps' },
                              { id: '4K', label: 'ULTRA 4K', bitrate: '25 Mbps' }
                            ].map((q) => (
                              <button 
                                key={q.id}
                                onClick={() => {
                                  setStreamQuality(q.id);
                                  handleUpdateRoomSettings({ 'settings.streamQuality': q.id });
                                }}
                                className={cn(
                                  "flex flex-col items-center justify-center p-4 rounded-3xl border transition-all gap-1",
                                  streamQuality === q.id 
                                    ? "bg-amber-400 border-amber-400 text-black shadow-lg shadow-amber-400/20" 
                                    : "bg-zinc-950 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300"
                                )}
                              >
                                <span className="text-[10px] font-black uppercase tracking-tighter">{q.label}</span>
                                <span className={cn("text-[8px] font-bold", streamQuality === q.id ? "text-black/60" : "text-zinc-600")}>{q.bitrate}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </section>

                      {/* Global Audio Environment */}
                      <section className="space-y-4">
                        <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Audio Environment</h3>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 space-y-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn("p-2 rounded-xl", voiceFXEnabled ? "bg-purple-500 text-white" : "bg-zinc-800 text-zinc-400")}>
                                <Wand2 className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="text-white font-bold text-xs uppercase tracking-tight">Voice Modulation</p>
                                <p className="text-zinc-500 text-[10px] font-medium uppercase">{voiceFXEnabled ? 'Effects Enabled' : 'Effects Restricted'}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => {
                                const newVal = !voiceFXEnabled;
                                setVoiceFXEnabled(newVal);
                                handleUpdateRoomSettings({ 'settings.voiceFXEnabled': newVal });
                              }}
                              className={cn(
                                "w-12 h-7 rounded-full relative transition-all duration-300 p-1 shrink-0",
                                voiceFXEnabled ? "bg-purple-500" : "bg-zinc-800"
                              )}
                            >
                              <div className={cn(
                                "w-5 h-5 bg-white rounded-full transition-all shadow-md",
                                voiceFXEnabled ? "ml-5" : "ml-0"
                              )} />
                            </button>
                          </div>

                          <AnimatePresence>
                            {voiceFXEnabled && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="pt-4 border-t border-zinc-800 space-y-6">
                                  <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-none">
                                    {Object.keys(voiceSettings).filter(k => k !== 'none').map(effect => (
                                      <button
                                        key={effect}
                                        onClick={() => setSelectedEffectParamTab(effect)}
                                        className={cn(
                                          "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-colors",
                                          selectedEffectParamTab === effect ? "bg-purple-500 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200"
                                        )}
                                      >
                                        {effect}
                                      </button>
                                    ))}
                                  </div>
                                  
                                  <div className="space-y-4">
                                    {['pitch', 'reverb', 'echo', 'clarity'].map(param => (
                                      <div key={param} className="space-y-2 relative">
                                        <div className="flex items-center justify-between">
                                          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{param}</span>
                                          <span className="text-[10px] font-mono text-purple-400 font-bold">
                                            {voiceSettings[selectedEffectParamTab]?.[param as keyof typeof voiceSettings['deep']] || 0}%
                                          </span>
                                        </div>
                                        <input
                                          type="range"
                                          min="0"
                                          max="100"
                                          value={voiceSettings[selectedEffectParamTab]?.[param as keyof typeof voiceSettings['deep']] || 0}
                                          onChange={(e) => {
                                            setVoiceSettings(prev => ({
                                              ...prev,
                                              [selectedEffectParamTab]: {
                                                ...prev[selectedEffectParamTab],
                                                [param]: parseInt(e.target.value)
                                              }
                                            }))
                                          }}
                                          className="w-full relative z-10 appearance-none h-1.5 bg-zinc-800 rounded-full cursor-pointer accent-purple-500"
                                        />
                                      </div>
                                    ))}
                                  </div>

                                  {/* Custom Profiles & Actions for Host Console */}
                                  <div className="pt-4 border-t border-zinc-800 space-y-4">
                                    <div className="flex gap-2">
                                      <button
                                        type="button"
                                        onClick={async () => {
                                          try {
                                            await handleUpdateRoomSettings({
                                              'settings.voiceSettings': voiceSettings
                                            });
                                            alert(`Profile "${selectedEffectParamTab}" saved to server successfully!`);
                                          } catch (err) {
                                            console.error(err);
                                          }
                                        }}
                                        className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-2xl transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                                      >
                                        Save All Changes
                                      </button>

                                      {!['deep', 'helium', 'robotic', 'ghost', 'echo'].includes(selectedEffectParamTab) && (
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            const confirmDel = confirm(`Are you sure you want to delete custom voice profile "${selectedEffectParamTab}"?`);
                                            if (!confirmDel) return;
                                            const copy = { ...voiceSettings };
                                            delete copy[selectedEffectParamTab];
                                            setVoiceSettings(copy);
                                            setSelectedEffectParamTab('deep');
                                            try {
                                              await handleUpdateRoomSettings({
                                                'settings.voiceSettings': copy
                                              });
                                            } catch (err) {
                                              console.error(err);
                                            }
                                          }}
                                          className="bg-red-500/10 hover:bg-red-500 border border-red-500/20 hover:border-red-500 text-red-500 hover:text-white text-[10px] font-black uppercase tracking-widest py-3 px-4 rounded-2xl transition-all active:scale-[0.98]"
                                        >
                                          Delete Profile
                                        </button>
                                      )}
                                    </div>

                                    <div className="bg-black/30 border border-zinc-900 rounded-2xl p-4 space-y-3 text-left">
                                      <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">Create Custom Profile</p>
                                      <div className="flex gap-2">
                                        <input
                                          type="text"
                                          placeholder="e.g. Space Echo, Alien DJ"
                                          value={customProfileName}
                                          onChange={(e) => setCustomProfileName(e.target.value)}
                                          className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-[11px] text-white placeholder-zinc-600 font-bold outline-none focus:border-purple-500 transition-colors"
                                        />
                                        <button
                                          type="button"
                                          onClick={async () => {
                                            const trimmed = customProfileName.trim();
                                            if (!trimmed) {
                                              alert('Please enter a custom profile name!');
                                              return;
                                            }
                                            if (voiceSettings[trimmed]) {
                                              alert('A profile with this name already exists!');
                                              return;
                                            }

                                            const currentParams = voiceSettings[selectedEffectParamTab] || { pitch: 50, reverb: 20, echo: 10, clarity: 80 };
                                            const updatedSettings = {
                                              ...voiceSettings,
                                              [trimmed]: { ...currentParams }
                                            };

                                            setVoiceSettings(updatedSettings);
                                            setSelectedEffectParamTab(trimmed);
                                            setCustomProfileName('');

                                            try {
                                              await handleUpdateRoomSettings({
                                                'settings.voiceSettings': updatedSettings
                                              });
                                              alert(`Custom profile "${trimmed}" created and saved!`);
                                            } catch (err) {
                                              console.error(err);
                                            }
                                          }}
                                          className="bg-zinc-800 hover:bg-zinc-700 text-amber-400 text-[10px] font-bold uppercase tracking-wider px-4 py-2 rounded-xl border border-zinc-700 active:scale-[0.98] transition-all"
                                        >
                                          Save Profile
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </section>

                      {/* Privacy & Fee */}
                      <section className="space-y-4">
                        <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Privacy Settings</h3>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 space-y-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn("p-2 rounded-xl", isPrivate ? "bg-amber-400 text-black" : "bg-zinc-800 text-zinc-400")}>
                                {isPrivate ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                              </div>
                              <div>
                                <p className="text-white font-bold text-xs uppercase tracking-tight">Room Privacy</p>
                                <p className="text-zinc-500 text-[10px] font-medium uppercase">{isPrivate ? 'Private' : 'Public'}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => {
                                const newVal = !isPrivate;
                                setIsPrivate(newVal);
                                handleUpdateRoomSettings({ 'settings.isPrivate': newVal });
                              }}
                              className={cn(
                                "w-12 h-7 rounded-full relative transition-all duration-300 p-1",
                                isPrivate ? "bg-amber-400" : "bg-zinc-800"
                              )}
                            >
                              <div className={cn(
                                "w-5 h-5 bg-white rounded-full transition-all shadow-md",
                                isPrivate ? "ml-5" : "ml-0"
                              )} />
                            </button>
                          </div>

                          <AnimatePresence>
                            {isPrivate && (
                              <motion.div 
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden space-y-4 pt-4 border-t border-zinc-800"
                              >
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">Entry Fee (Coins)</p>
                                    <div className="flex items-center gap-3">
                                      <button 
                                        onClick={() => {
                                          const newVal = Math.max(50, entryFee - 50);
                                          setEntryFee(newVal);
                                          handleUpdateRoomSettings({ 'settings.entryFee': newVal });
                                        }}
                                        className="w-8 h-8 rounded-lg bg-zinc-800 text-white font-bold"
                                      >
                                        -
                                      </button>
                                      <span className="text-amber-400 font-black text-sm w-12 text-center">{entryFee}</span>
                                      <button 
                                        onClick={() => {
                                          const newVal = entryFee + 50;
                                          setEntryFee(newVal);
                                          handleUpdateRoomSettings({ 'settings.entryFee': newVal });
                                        }}
                                        className="w-8 h-8 rounded-lg bg-zinc-800 text-white font-bold"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                  
                                  <div className="space-y-2">
                                    <label className="text-zinc-500 text-[10px] font-black uppercase tracking-widest ml-1 flex items-center gap-2">
                                      <Key className="w-3 h-3" />
                                      Access Password
                                    </label>
                                    <div className="bg-zinc-950 border border-zinc-800 rounded-2xl px-1 py-1 flex items-center gap-2">
                                      <input 
                                        type="password" 
                                        placeholder="Optional password..."
                                        value={roomPassword}
                                        onChange={(e) => setRoomPassword(e.target.value)}
                                        className="w-full bg-transparent px-4 py-3 text-white text-xs font-bold outline-none"
                                      />
                                      <button 
                                        onClick={() => handleUpdateRoomSettings({ 'settings.password': roomPassword })}
                                        className="bg-zinc-900 text-zinc-400 px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest hover:text-white transition-all whitespace-nowrap mr-1"
                                      >
                                        Update
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </section>

                      {/* Participant Rules (Toggles) */}
                      <section className="space-y-4">
                        <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Room Policies</h3>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 space-y-4">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold uppercase text-zinc-400">Background Music</p>
                            <button 
                              onClick={() => {
                                const newVal = !isBgmEnabled;
                                setIsBgmEnabled(newVal);
                                handleUpdateRoomSettings({ 'settings.isBgmEnabled': newVal });
                              }}
                              className="w-10 h-6 bg-zinc-800 rounded-full relative p-1"
                            >
                              <div className={cn("w-4 h-4 rounded-full transition-all shadow-md", isBgmEnabled ? "bg-amber-400 ml-4" : "bg-zinc-600")} />
                            </button>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold uppercase text-zinc-400">Seating Entry Effects</p>
                            <button 
                              onClick={() => {
                                const newVal = !entryEffectsEnabled;
                                setEntryEffectsEnabled(newVal);
                                handleUpdateRoomSettings({ 'settings.entryEffectsEnabled': newVal });
                              }}
                              className="w-10 h-6 bg-zinc-800 rounded-full relative p-1"
                            >
                              <div className={cn("w-4 h-4 rounded-full transition-all shadow-md", entryEffectsEnabled ? "bg-amber-400 ml-4" : "bg-zinc-600")} />
                            </button>
                          </div>
                          {[
                            { label: 'Entrance Announcements', active: true },
                            { label: 'Mute Guest on Entry', active: false },
                            { label: 'Lock the Room', active: false, dangerous: true },
                          ].map(policy => (
                            <div key={policy.label} className="flex items-center justify-between">
                              <p className={cn("text-xs font-bold uppercase", policy.dangerous ? "text-red-500" : "text-zinc-400")}>{policy.label}</p>
                              <button className="w-10 h-6 bg-zinc-800 rounded-full relative p-1">
                                <div className={cn("w-4 h-4 rounded-full transition-all shadow-md", policy.active ? "bg-amber-400 ml-4" : "bg-zinc-600")} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </section>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="p-8 border-t border-zinc-900 bg-black/40">
                <button 
                  onClick={onLeave}
                  className="w-full bg-red-600 text-white font-black py-5 rounded-2xl uppercase tracking-[0.3em] text-xs shadow-2xl shadow-red-600/20 active:scale-95 transition-all outline outline-offset-4 outline-red-600/10"
                >
                  Terminate Room
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* User Interaction Modal (Moderation for Host, Block/Unblock for Users) */}
      <AnimatePresence>
        {selectedUserToModerate && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUserToModerate(null)}
              className="fixed inset-0 bg-black/90 backdrop-blur-md z-[150] flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 30 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-zinc-950 border border-zinc-800 rounded-[3rem] w-full max-w-sm overflow-hidden shadow-2xl"
              >
                <div className="p-10 text-center border-b border-zinc-900">
                  <div className="w-24 h-24 rounded-full border-4 border-amber-400/20 mx-auto mb-6 relative bg-zinc-900 flex items-center justify-center">
                    {selectedUserToModerate.avatar ? (
                      <img src={selectedUserToModerate.avatar} alt="User" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <Users className="w-10 h-10 text-zinc-700" />
                    )}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-t from-black/60 to-transparent" />
                  </div>
                  <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">{selectedUserToModerate.name}</h3>
                  <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-2 bg-zinc-900 inline-block px-3 py-1 rounded-full">
                    {selectedUserToModerate.name === room.host ? 'Host' : (selectedUserToModerate.isEmpty ? 'Empty Seat' : 'Active In Room')}
                  </p>
                </div>

                <div className={cn(
                  "grid divide-x divide-zinc-900 bg-zinc-900/20",
                  isHost ? (selectedUserToModerate.isEmpty ? "grid-cols-2" : "grid-cols-6") : "grid-cols-1"
                )}>
                  {isHost && (
                    <>
                      {selectedUserToModerate.isEmpty ? (
                        <>
                          <button 
                            onClick={() => toggleLockSeat(selectedUserToModerate.seatId)}
                            className="p-4 flex flex-col items-center gap-2 hover:bg-zinc-900 transition-all group"
                          >
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                              selectedUserToModerate.isLocked ? "bg-red-500/20 text-red-500" : "bg-zinc-800 text-zinc-500 group-hover:text-amber-400"
                            )}>
                              {selectedUserToModerate.isLocked ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                            </div>
                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest group-hover:text-amber-400">
                              {selectedUserToModerate.isLocked ? 'Unlock Seat' : 'Lock Seat'}
                            </span>
                          </button>
                          <button 
                            className="p-4 flex flex-col items-center gap-2 hover:bg-zinc-900 transition-all group cursor-not-allowed opacity-40"
                          >
                            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-500">
                              <MoreHorizontal className="w-5 h-5" />
                            </div>
                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest">More</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => muteUser(selectedUserToModerate.name)}
                            className="p-4 flex flex-col items-center gap-2 hover:bg-zinc-900 transition-all group"
                          >
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                              selectedUserToModerate.isMuted ? "bg-red-500/20 text-red-500" : "bg-zinc-800 text-zinc-500 group-hover:text-amber-400"
                            )}>
                              {selectedUserToModerate.isMuted ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                            </div>
                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest group-hover:text-amber-400">
                              {selectedUserToModerate.isMuted ? 'Unmute' : 'Mute'}
                            </span>
                          </button>
                          {room.type === 'video' && (
                            <button 
                              onClick={() => toggleVideoUser(selectedUserToModerate.name)}
                              className="p-4 flex flex-col items-center gap-2 hover:bg-zinc-900 transition-all group"
                            >
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                !selectedUserToModerate.videoEnabled ? "bg-red-500/20 text-red-500" : "bg-zinc-800 text-zinc-500 group-hover:text-amber-400"
                              )}>
                                {!selectedUserToModerate.videoEnabled ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                              </div>
                              <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest group-hover:text-amber-400 text-center">
                                {!selectedUserToModerate.videoEnabled ? 'Enable Cam' : 'Disable Cam'}
                              </span>
                            </button>
                          )}
                          <button 
                            onClick={() => stripFX(selectedUserToModerate.name)}
                            className="p-4 flex flex-col items-center gap-2 hover:bg-zinc-900 transition-all group"
                          >
                            <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-purple-400">
                              <Wand2 className="w-5 h-5" />
                            </div>
                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest group-hover:text-purple-400">Strip FX</span>
                          </button>
                          <button 
                            onClick={() => toggleLockSeat(selectedUserToModerate.seatId)}
                            className="p-4 flex flex-col items-center gap-2 hover:bg-zinc-900 transition-all group"
                          >
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                              selectedUserToModerate.isLocked ? "bg-red-500/20 text-red-500" : "bg-zinc-800 text-zinc-500 group-hover:text-amber-400"
                            )}>
                              {selectedUserToModerate.isLocked ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                            </div>
                            <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest group-hover:text-amber-400">
                              {selectedUserToModerate.isLocked ? 'Unlock' : 'Lock'}
                            </span>
                          </button>
                        </>
                      )}
                    </>
                  )
                  }

                  {!isHost && selectedUserToModerate.name === room.host && (
                    <button 
                      onClick={() => {
                        setDirectMessageTarget(selectedUserToModerate.name);
                        setSelectedUserToModerate(null);
                      }}
                      className={cn(
                        "p-4 flex flex-col items-center gap-2 hover:bg-zinc-900 transition-all group",
                        !isHost && "py-8"
                      )}
                    >
                      <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-blue-400">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest group-hover:text-blue-400">
                        Message
                      </span>
                    </button>
                  )}

                  {!selectedUserToModerate.isEmpty && (
                    <button 
                      onClick={() => {
                        toggleBlock(selectedUserToModerate.name);
                        setSelectedUserToModerate(null);
                      }}
                      className={cn(
                        "p-4 flex flex-col items-center gap-2 hover:bg-zinc-900 transition-all group",
                        !isHost && "py-8"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                        blockedUsers.includes(selectedUserToModerate.name) ? "bg-orange-500/20 text-orange-500" : "bg-zinc-800 text-zinc-500 group-hover:text-white"
                      )}>
                        <Slash className="w-5 h-5" />
                      </div>
                      <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest group-hover:text-white">
                        {blockedUsers.includes(selectedUserToModerate.name) ? 'Unblock' : 'Block'}
                      </span>
                    </button>
                  )}

                  {isHost && !selectedUserToModerate.isEmpty && (
                    <>
                      <button 
                        onClick={() => kickUser(selectedUserToModerate.name)}
                        className="p-4 flex flex-col items-center gap-2 hover:bg-zinc-900 transition-all group"
                      >
                        <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-orange-500">
                          <ShieldAlert className="w-5 h-5" />
                        </div>
                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest group-hover:text-orange-500">Kick</span>
                      </button>
                      <button 
                        onClick={() => banUser(selectedUserToModerate.name)}
                        className="p-4 flex flex-col items-center gap-2 hover:bg-red-500 group transition-all"
                      >
                        <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:text-white">
                          <Slash className="w-5 h-5" />
                        </div>
                        <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest group-hover:text-white">Ban</span>
                      </button>
                    </>
                  )}
                </div>

                {isHost && !selectedUserToModerate.isEmpty && (
                  <div className="p-6 border-t border-zinc-900 bg-zinc-900/10 space-y-4">
                    <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest text-center">Voice Effects</h4>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {Object.keys(voiceSettings).map(id => {
                        const iconMap: Record<string, any> = {
                          none: Mic,
                          deep: Volume1,
                          helium: Sparkles,
                          robotic: Bot,
                          ghost: Ghost,
                          echo: Music,
                        };
                        const colorMap: Record<string, string> = {
                          none: 'text-zinc-400',
                          deep: 'text-blue-400',
                          helium: 'text-amber-400',
                          robotic: 'text-zinc-500',
                          ghost: 'text-white',
                          echo: 'text-purple-400',
                        };

                        const IconCmp = iconMap[id] || Wand2;
                        const iconColor = colorMap[id] || 'text-purple-400 animate-pulse';

                        return (
                          <button
                            key={id}
                            onClick={() => applyVoiceEffect(selectedUserToModerate.name, id)}
                            className={cn(
                              "flex flex-col items-center justify-center p-2 rounded-xl transition-all border border-transparent",
                              (selectedUserToModerate.voiceEffect || 'none') === id 
                                ? "bg-purple-600/20 border-purple-500/40 shadow-inner" 
                                : "hover:bg-zinc-800"
                            )}
                          >
                            <IconCmp className={cn("w-4 h-4", (selectedUserToModerate.voiceEffect || 'none') === id ? "text-purple-400" : iconColor)} />
                            <span className="text-[6.5px] font-black uppercase tracking-widest mt-1 text-zinc-500 truncate max-w-full" title={id}>{id}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="p-8">
                  <button 
                    onClick={() => setSelectedUserToModerate(null)}
                    className="w-full bg-zinc-900 text-zinc-400 font-black py-4 rounded-2xl uppercase tracking-[0.2em] text-[10px] hover:text-white transition-all border border-zinc-800"
                  >
                    Close Menu
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Voice FX Selection Modal */}
      <AnimatePresence>
        {showVoiceFX && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowVoiceFX(false)}
              className="fixed inset-0 bg-black/90 backdrop-blur-md z-[150] flex items-end justify-center sm:items-center p-6"
            />
            <motion.div 
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              className="fixed bottom-0 sm:bottom-auto sm:relative left-0 right-0 sm:left-auto sm:right-auto z-[160] w-full max-w-sm"
              onClick={e => e.stopPropagation()}
            >
              <div className="bg-zinc-950 border border-zinc-800 rounded-t-[3rem] sm:rounded-[3rem] overflow-hidden shadow-2xl p-8 space-y-8">
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 bg-purple-500/20 rounded-[2rem] flex items-center justify-center mx-auto">
                    <Wand2 className="w-8 h-8 text-purple-400" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">Voice Magic</h3>
                    {!voiceFXEnabled && !isHost ? (
                      <p className="text-red-500 text-[8px] font-black uppercase tracking-[0.2em] bg-red-500/10 inline-block px-3 py-1 rounded-full border border-red-500/20">
                        Capabilities Restricted by Host
                      </p>
                    ) : (
                      <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest italic">Alter your spectral voice profile</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 max-h-60 overflow-y-auto pr-1">
                  {[
                    { id: 'none', label: 'Original', icon: Mic, desc: 'Pure input', color: 'text-zinc-400' },
                    { id: 'deep', label: 'Deep', icon: Volume1, desc: 'Bass boost', color: 'text-blue-400' },
                    { id: 'helium', label: 'Chipmunk', icon: Sparkles, desc: 'High pitch', color: 'text-amber-400' },
                    { id: 'robotic', label: 'Droid', icon: Bot, desc: 'Metallic freq', color: 'text-zinc-500' },
                    { id: 'ghost', label: 'Spectral', icon: Ghost, desc: 'Echo trails', color: 'text-white' },
                    { id: 'echo', label: 'Studio', icon: Music, desc: 'Reverb max', color: 'text-purple-400' },
                    ...Object.keys(voiceSettings)
                      .filter(k => !['none', 'deep', 'helium', 'robotic', 'ghost', 'echo'].includes(k))
                      .map(key => ({
                        id: key,
                        label: key,
                        icon: Wand2,
                        desc: 'Custom FX',
                        color: 'text-purple-400 animate-pulse'
                      }))
                  ].map(fx => (
                    <button
                      key={fx.id}
                      onClick={() => {
                        setSelectedVoiceEffect(fx.id);
                      }}
                      className={cn(
                        "flex flex-col items-center gap-2 p-3 sm:p-4 rounded-3xl border transition-all group relative overflow-hidden",
                        selectedVoiceEffect === fx.id 
                          ? "bg-purple-600 border-purple-400 text-white shadow-xl shadow-purple-500/40 scale-105 z-10" 
                          : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:bg-zinc-800/10"
                      )}
                    >
                      {selectedVoiceEffect === fx.id && (
                        <motion.div 
                          layoutId="fx-active"
                          className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"
                        />
                      )}
                      <fx.icon className={cn(
                        "w-5 h-5 transition-all duration-300 group-active:scale-90",
                        selectedVoiceEffect === fx.id ? "text-white scale-110" : fx.color
                      )} />
                      <div className="text-center w-full">
                        <p className="text-[9px] font-black uppercase tracking-widest truncate">{fx.label}</p>
                        <p className={cn("text-[6px] font-bold uppercase tracking-tighter mt-0.5 opacity-60")}>{fx.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="bg-black/40 border border-zinc-900 rounded-[2rem] p-6 space-y-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-white italic uppercase tracking-[0.2em] flex items-center gap-2">
                      <Sparkles className="w-3 h-3 text-purple-400" />
                      Fine-Tuning: {selectedVoiceEffect.toUpperCase()}
                    </span>
                    <button 
                      onClick={() => setVoiceSettings({
                        ...voiceSettings,
                        [selectedVoiceEffect]: { pitch: 50, reverb: 20, echo: 10, clarity: 80 }
                      })}
                      className="text-[8px] font-black text-zinc-600 uppercase hover:text-purple-400 transition-colors"
                    >
                      Reset Profile
                    </button>
                  </div>

                  <div className="grid gap-6">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Radio className="w-3 h-3 text-zinc-500" />
                          <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Spectral Shift</span>
                        </div>
                        <span className="text-[8px] font-black text-purple-400 uppercase tracking-widest font-mono">{voiceSettings[selectedVoiceEffect].pitch}%</span>
                      </div>
                      <input 
                        type="range"
                        min="1"
                        max="100"
                        value={voiceSettings[selectedVoiceEffect].pitch}
                        onChange={(e) => setVoiceSettings({
                          ...voiceSettings,
                          [selectedVoiceEffect]: { ...voiceSettings[selectedVoiceEffect], pitch: parseInt(e.target.value) }
                        })}
                        className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-purple-500"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Volume2 className="w-3 h-3 text-zinc-500" />
                          <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Reverb Depth</span>
                        </div>
                        <span className="text-[8px] font-black text-purple-400 uppercase tracking-widest font-mono">{voiceSettings[selectedVoiceEffect].reverb}%</span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max="100"
                        value={voiceSettings[selectedVoiceEffect].reverb}
                        onChange={(e) => setVoiceSettings({
                          ...voiceSettings,
                          [selectedVoiceEffect]: { ...voiceSettings[selectedVoiceEffect], reverb: parseInt(e.target.value) }
                        })}
                        className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-purple-500"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Ghost className="w-3 h-3 text-zinc-500" />
                          <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Echo Intensity</span>
                        </div>
                        <span className="text-[8px] font-black text-purple-400 uppercase tracking-widest font-mono">{voiceSettings[selectedVoiceEffect].echo}%</span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max="100"
                        value={voiceSettings[selectedVoiceEffect].echo}
                        onChange={(e) => setVoiceSettings({
                          ...voiceSettings,
                          [selectedVoiceEffect]: { ...voiceSettings[selectedVoiceEffect], echo: parseInt(e.target.value) }
                        })}
                        className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-purple-500"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Wand2 className="w-3 h-3 text-zinc-500" />
                          <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Voice Clarity</span>
                        </div>
                        <span className="text-[8px] font-black text-purple-400 uppercase tracking-widest font-mono">{voiceSettings[selectedVoiceEffect].clarity}%</span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max="100"
                        value={voiceSettings[selectedVoiceEffect].clarity}
                        onChange={(e) => setVoiceSettings({
                          ...voiceSettings,
                          [selectedVoiceEffect]: { ...voiceSettings[selectedVoiceEffect], clarity: parseInt(e.target.value) }
                        })}
                        className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-purple-500"
                      />
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setShowVoiceFX(false)}
                  className="w-full bg-zinc-900 text-zinc-400 font-black py-5 rounded-2xl uppercase tracking-[0.2em] text-[10px] hover:text-white transition-all border border-zinc-800"
                >
                  Close Magic Shop
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Gift Panel Overlay */}
      <AnimatePresence>
        {showGifts && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowGifts(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
            >
              <div className="max-w-md mx-auto pointer-events-auto">
                <Gifts initialIsPurchasing={isPurchaseMode} onSendGift={handleSendGift} onClose={() => setShowGifts(false)} />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Direct Message Overlay */}
      <AnimatePresence>
        {directMessageTarget && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDirectMessageTarget(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 w-full sm:max-w-lg z-50 pointer-events-none"
            >
              <div className="bg-zinc-950 border border-zinc-800 rounded-[2rem] p-6 shadow-2xl pointer-events-auto h-[500px] flex flex-col">
                <h3 className="text-xl font-black text-white italic uppercase tracking-tighter mb-4">Chat with {directMessageTarget}</h3>
                <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                  {directMessages.map((msg, i) => (
                    <div key={i} className={cn("p-3 rounded-2xl text-xs", msg.sender === 'me' ? "bg-amber-500/20 text-amber-200 ml-auto" : "bg-zinc-800 text-zinc-300")}>
                      {msg.text}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={directMessageText}
                    onChange={(e) => setDirectMessageText(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white text-xs"
                    placeholder="Type a message..."
                    onKeyPress={(e) => e.key === 'Enter' && directMessageText && setDirectMessages([...directMessages, { sender: 'me', text: directMessageText }]) || (e.key === 'Enter' && directMessageText && setDirectMessageText(''))}
                  />
                  <button
                    onClick={() => {
                      if (!directMessageText) return;
                      setDirectMessages([...directMessages, { sender: 'me', text: directMessageText }]);
                      setDirectMessageText('');
                    }}
                    className="bg-amber-400 text-black px-4 rounded-xl font-bold text-xs"
                  >
                    Send
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Floating Gift Animation */}
      <AnimatePresence>
        {activeGift && (
          <motion.div
            initial={{ opacity: 0, scale: 0, y: 100, x: '-50%' }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.5, 2, 2.5, 1.5], y: -200, x: '-50%' }}
            exit={{ opacity: 0 }}
            transition={{ duration: 3.5, ease: 'easeOut' }}
            className="fixed top-1/2 left-1/2 z-[200] pointer-events-none flex flex-col items-center"
          >
            <div className={cn("w-32 h-32 rounded-full flex items-center justify-center bg-zinc-900 shadow-[0_0_50px_rgba(251,191,36,0.3)] border border-amber-400/50", activeGift.color)}>
              <Gift className="w-16 h-16 animate-bounce" />
            </div>
            <p className="font-black text-amber-400 text-2xl uppercase italic drop-shadow-lg mt-4 animate-pulse">
              {activeGift.name}!
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
