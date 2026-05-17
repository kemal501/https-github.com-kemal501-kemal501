/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mic, MicOff, Video, VideoOff, MessageSquare, Gift, Share2, Users, Star, MoreHorizontal, Send, ShieldAlert, Slash, ShieldCheck, Settings, Coins, Plus, Play, Pause, Volume2, VolumeX, Lock, Unlock, Wand2, Sparkles, Ghost, Bot, Music, Volume1, Radio, Trash2, Trophy, Bell } from 'lucide-react';
import { cn } from '../lib/utils';
import Gifts from './Gifts';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, deleteDoc, doc, updateDoc, getDoc, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

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
    type: 'voice' | 'video';
    tier?: string;
  };
  isHost?: boolean;
  onLeave: () => void;
}

export default function RoomView({ room, isHost, onLeave }: RoomViewProps) {
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
      } catch (err) {
        console.error("Failed to get microphone", err);
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
  const [showVoiceFX, setShowVoiceFX] = React.useState(false);
  const [selectedConsoleUser, setSelectedConsoleUser] = React.useState<string | null>(null);
  const [selectedVoiceEffect, setSelectedVoiceEffect] = React.useState('none');
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
  const [streamQuality, setStreamQuality] = React.useState('1080p');
  const [activeConsoleTab, setActiveConsoleTab] = React.useState<'broadcast' | 'users' | 'settings'>('broadcast');
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

  // 24 seat simulation logic
  // Dynamic Seats State
  const [seats, setSeats] = React.useState<{ id: number, occupied: boolean, user: any, isLocked?: boolean }[]>(() => 
    Array.from({ length: 24 }).map((_, i) => ({
      id: i,
      occupied: i < 3, // Start with some initial users
      user: i < 3 ? { 
        name: i === 0 ? room.host : (i === 1 ? 'Melat' : 'Guest_2'), 
        avatar: `https://i.pravatar.cc/100?u=${i}`,
        videoEnabled: i === 0, // Host starts with video
        isMuted: false,
        voiceEffect: 'none'
      } : null,
      isLocked: false
    }))
  );

  const prevSeatsRef = React.useRef(seats);

  const [blockedUsers, setBlockedUsers] = React.useState<string[]>([]);
  const [bannedUsers, setBannedUsers] = React.useState<string[]>([]);

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
        }
        if (data.bannedUsers) {
          setBannedUsers(data.bannedUsers);
        }
        if (data.title) setRoomTitle(data.title);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `rooms/${room.id}`);
    });

    return () => unsubscribe();
  }, [room.id]);

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

  // Real-time chat listener
  React.useEffect(() => {
    if (room.id.startsWith('room_')) return;

    const messagesRef = collection(db, 'rooms', room.id, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'), limit(50));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(newMessages);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `rooms/${room.id}/messages`);
    });

    return () => unsubscribe();
  }, [room.id]);

  // Scroll to bottom when messages change
  React.useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || !auth.currentUser) return;

    const originalMessage = chatMessage;
    setChatMessage('');

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
    const userRef = doc(db, 'users', auth.currentUser.uid);
    try {
      const userDoc = await getDoc(userRef);
      if (userDoc.exists() && userDoc.data().coins >= gift.price) {
        await updateDoc(userRef, {
          coins: userDoc.data().coins - gift.price // Simple subtraction instead of increment, given our mocks
        });
        
        setActiveGift(gift);
        setTimeout(() => setActiveGift(null), 3500);
        setShowGifts(false);
        
        await addDoc(collection(db, 'rooms', room.id, 'messages'), {
          senderId: 'system',
          senderName: 'System',
          text: `${auth.currentUser.displayName || 'A user'} sent a ${gift.name} to ${target === 'host' ? room.host : 'themselves'}!`,
          createdAt: serverTimestamp()
        });

        // Record it in earnings section for the target
        const transactionRef = collection(db, 'users', auth.currentUser.uid, 'transactions');
        await addDoc(transactionRef, {
          fromId: auth.currentUser.uid,
          toId: target === 'host' ? room.host : auth.currentUser.uid,
          amount: gift.price,
          type: 'gift',
          status: 'completed',
          createdAt: serverTimestamp()
        });
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

  const handleSeatClick = (seat: any) => {
    if (activeSeatInfoId === seat.id) {
      setActiveSeatInfoId(null);
    } else {
      setActiveSeatInfoId(seat.id);
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

  const SeatOverlay = ({ seat, onModerate }: { seat: any, onModerate: () => void }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="absolute z-[100] left-full ml-2 w-32 bg-black/90 backdrop-blur-md rounded-xl p-3 text-white text-[10px] shadow-2xl border border-zinc-800"
      onClick={(e) => { e.stopPropagation(); onModerate(); }}
    >
      <p className="font-bold mb-1 truncate">{seat.user?.name || `Seat ${seat.id + 1}`}</p>
      {seat.occupied && seat.user && (
        <>
          <p className="opacity-70 flex items-center gap-1 mb-0.5">
            {seat.user.isMuted ? <MicOff className="w-3 h-3 text-red-500" /> : <Mic className="w-3 h-3 text-green-500" />}
            {seat.user.isMuted ? 'Muted' : 'Speaking'}
          </p>
          <p className="opacity-70 flex items-center gap-1">
            <Wand2 className="w-3 h-3 text-purple-400" />
            {seat.user.voiceEffect || 'None'}
          </p>
          {isHost && (
            <div className="mt-2 space-y-2">
              <button onClick={onModerate} className="w-full bg-amber-400 text-black py-1 font-bold rounded-lg text-[9px] hover:bg-amber-300">Moderate</button>
              <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest text-center mt-1">Apply FX</p>
              <div className="grid grid-cols-3 gap-1">
                {['deep', 'helium', 'robotic'].map(effect => (
                    <button 
                      key={effect}
                      onClick={(e) => { e.stopPropagation(); applyVoiceEffect(seat.user.name, effect); }}
                      className="bg-zinc-800 text-[8px] p-1 rounded-md hover:bg-purple-600 truncate"
                    >
                      {effect}
                    </button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );

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
          { icon: <Gift className="w-6 h-6" />, label: '🎁' }
        ].map((item, i) => (
          <div key={i} className="w-14 h-14 bg-black/40 backdrop-blur-md rounded-2xl flex items-center justify-center text-white border border-white/10 hover:border-amber-400 transition-colors cursor-pointer">
            {item.icon}
          </div>
        ))}
      </div>

      {/* Room Header */}
      <div className="p-6 flex items-center justify-between border-b border-zinc-900/50 bg-black/40 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-amber-400/50 shadow-lg shadow-amber-400/10">
            <img src={`https://i.pravatar.cc/150?u=${room.host}`} alt={room.host} />
          </div>
          <div>
            <h2 className="text-white font-black uppercase tracking-tight text-sm flex items-center gap-2">
              {roomTitle}
              {room.type === 'video' && <Video className="w-3 h-3 text-blue-400" />}
              {isPrivate && <Lock className="w-3 h-3 text-amber-400" />}
            </h2>
            <div className="flex items-center gap-2 mt-0.5">
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
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
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

      {/* Main Content: 24 Seat Grid */}
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
            <p className="text-zinc-400 text-xs">
                Welcome to the voice chat room! Please follow room rules.
                Be respectful and enjoy chatting together.
            </p>
          </div>

          {/* Seat Grid (3 rows of 8 or customized) */}
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4">
            {seats.map((seat) => (
              <motion.div 
                key={seat.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ scale: 1.05 }}
                animate={shakingSeatId === seat.id ? { x: [-3, 3, -3, 3, 0], backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.5)' } : {}}
                transition={{ duration: 0.3, type: 'spring', stiffness: 200, damping: 20 }}
                onClick={() => handleSeatClick(seat)}
                className={cn(
                  "aspect-square rounded-2xl flex flex-col items-center justify-center gap-1 transition-all border relative cursor-pointer overflow-hidden",
                  seat.occupied 
                    ? "bg-zinc-900 border-zinc-800" 
                    : "bg-zinc-950 border-zinc-900 border-dashed hover:border-zinc-700",
                  seat.user && blockedUsers.includes(seat.user.name) && "opacity-40 grayscale",
                  requestedSeats.some(r => r.seatId === seat.id) && "border-amber-400/50 bg-amber-400/5"
                )}
              >
                {activeSeatInfoId === seat.id && (
                  <SeatOverlay seat={seat} onModerate={() => openModeration(seat)} />
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
                    <div className="relative w-full h-full flex items-center justify-center p-1 z-10">
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
                        <div className="absolute top-1 right-1 bg-red-500 w-4 h-4 rounded-full border-2 border-black flex items-center justify-center">
                          <Slash className="w-2 h-2 text-white" />
                        </div>
                      ) : (
                        <div className={cn(
                          "absolute bottom-0 right-0 w-6 h-6 rounded-full border-2 border-black flex items-center justify-center shadow-md",
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
                    <span className="absolute bottom-1 text-[7px] font-black text-white/50 uppercase truncate px-1 bg-black/40 backdrop-blur-md rounded-full">
                      {seat.user?.name}
                    </span>
                  </>
                ) : (
                  <>
                    <div className={cn(
                      "w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all",
                      seat.isLocked
                        ? "border-red-500/50 bg-red-500/10 text-red-500"
                        : requestedSeats.includes(seat.id) 
                          ? "border-amber-400 bg-amber-400/20 text-amber-400 rotate-12" 
                          : "border-zinc-800/50 text-zinc-800"
                    )}>
                      {seat.isLocked ? <Lock className="w-4 h-4" /> : (requestedSeats.some(r => r.seatId === seat.id) ? <Send className="w-4 h-4" /> : <Star className="w-4 h-4" />)}
                    </div>
                    {seat.isLocked ? (
                       <span className="text-[6px] font-black text-red-500 uppercase tracking-tighter">
                         Locked
                       </span>
                    ) : (
                      requestedSeats.some(r => r.seatId === seat.id) && (
                        <span className="text-[6px] font-black text-amber-500 uppercase tracking-tighter animate-pulse">
                          Request Sent
                        </span>
                      )
                    )}
                  </>
                )}
              </motion.div>
            ))}
          </div>

          {/* Virtual Chat Area */}
          <div className="bg-black/50 border border-zinc-900 p-6 rounded-[2rem] h-[300px] flex flex-col justify-end gap-2 overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black to-transparent z-10">
              <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">Live Room Chat</span>
            </div>
            
            <div className="space-y-3 overflow-y-auto no-scrollbar scroll-smooth">
              <div className="flex gap-3">
                <span className="text-amber-400 font-black text-xs">System:</span>
                <p className="text-zinc-500 text-xs">Welcome to Barca-live! Remember to follow community guidelines.</p>
              </div>
              
              {messages.filter(msg => !blockedUsers.includes(msg.senderName)).map((msg) => (
                <div key={msg.id} className="group flex items-start justify-between gap-3">
                  <div className="flex gap-3 min-w-0">
                    <span className={cn(
                      "font-bold text-xs flex-shrink-0",
                      msg.senderId === auth.currentUser?.uid ? "text-amber-400" : 
                      msg.senderName === room.host ? "text-blue-400" : "text-zinc-400"
                    )}>
                      {msg.senderName}:
                    </span>
                    <p className="text-zinc-300 text-xs break-words">
                      {msg.text}
                    </p>
                  </div>
                  {isHost && (
                    <button 
                      onClick={() => deleteMessage(msg.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-500 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="p-6 bg-black/80 backdrop-blur-2xl border-t border-zinc-900 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="relative"
            >
              <input 
                type="text" 
                placeholder="Say something..."
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-4 px-6 text-white text-sm focus:outline-none focus:border-amber-400/50 transition-all placeholder:text-zinc-600"
              />
              <button 
                type="submit"
                className={cn(
                  "absolute right-2 top-2 p-2 rounded-xl transition-all",
                  chatMessage ? "bg-amber-400 text-black shadow-lg" : "bg-transparent text-zinc-700"
                )}
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          </div>
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
                  { id: 'requests', label: 'Requests', icon: Bell },
                  { id: 'users', label: 'Users', icon: Users },
                  { id: 'settings', label: 'Settings', icon: Settings }
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
                          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2.5rem] flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={cn("w-3 h-3 rounded-full", isStreaming ? "bg-red-500 animate-pulse outline outline-4 outline-red-500/20" : "bg-zinc-800")} />
                              <div>
                                <p className="text-white font-bold tracking-tight">{isStreaming ? 'STREAMING LIVE' : 'BROADCAST IDLE'}</p>
                                <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">{streamQuality} • 60fps • 4.2 Mbps</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => setIsStreaming(!isStreaming)}
                              className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-xl",
                                isStreaming ? "bg-red-500 text-white shadow-red-500/20" : "bg-green-500 text-white shadow-green-500/20"
                              )}
                            >
                              {isStreaming ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
                            </button>
                          </div>

                          <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center justify-between">
                            <span className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">Quality Preset</span>
                            <div className="flex gap-2">
                              {['720p', '1080p', '4K'].map(q => (
                                <button 
                                  key={q}
                                  onClick={() => setStreamQuality(q)}
                                  className={cn(
                                    "px-3 py-1 rounded-lg text-[9px] font-black transition-all",
                                    streamQuality === q ? "bg-amber-400 text-black" : "bg-zinc-800 text-zinc-500 hover:text-white"
                                  )}
                                >
                                  {q}
                                </button>
                              ))}
                            </div>
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
                        <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Room Identity</h3>
                        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2.5rem] space-y-6">
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
                              onClick={() => setVoiceFXEnabled(!voiceFXEnabled)}
                              className={cn(
                                "w-12 h-7 rounded-full relative transition-all duration-300 p-1",
                                voiceFXEnabled ? "bg-purple-500" : "bg-zinc-800"
                              )}
                            >
                              <div className={cn(
                                "w-5 h-5 bg-white rounded-full transition-all shadow-md",
                                voiceFXEnabled ? "ml-5" : "ml-0"
                              )} />
                            </button>
                          </div>
                        </div>
                      </section>

                      {/* Privacy & Fee */}
                      <section className="space-y-4">
                        <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Privacy & Revenue</h3>
                        <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 space-y-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={cn("p-2 rounded-xl", isPrivate ? "bg-amber-400 text-black" : "bg-zinc-800 text-zinc-400")}>
                                {isPrivate ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                              </div>
                              <div>
                                <p className="text-white font-bold text-xs uppercase tracking-tight">Private Room</p>
                                <p className="text-zinc-500 text-[10px] font-medium uppercase">{isPrivate ? 'Paid Entry Active' : 'Free Entry for All'}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => setIsPrivate(!isPrivate)}
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
                                <div className="flex items-center justify-between">
                                  <p className="text-zinc-400 text-[10px] font-black uppercase tracking-widest">Entry Fee (Coins)</p>
                                  <div className="flex items-center gap-3">
                                    <button 
                                      onClick={() => setEntryFee(Math.max(50, entryFee - 50))}
                                      className="w-8 h-8 rounded-lg bg-zinc-800 text-white font-bold"
                                    >
                                      -
                                    </button>
                                    <span className="text-amber-400 font-black text-sm w-12 text-center">{entryFee}</span>
                                    <button 
                                      onClick={() => setEntryFee(entryFee + 50)}
                                      className="w-8 h-8 rounded-lg bg-zinc-800 text-white font-bold"
                                    >
                                      +
                                    </button>
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
                              onClick={toggleBgm}
                              className="w-10 h-6 bg-zinc-800 rounded-full relative p-1"
                            >
                              <div className={cn("w-4 h-4 rounded-full transition-all shadow-md", isBgmEnabled ? "bg-amber-400 ml-4" : "bg-zinc-600")} />
                            </button>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold uppercase text-zinc-400">Seating Entry Effects</p>
                            <button 
                              onClick={toggleEntryEffects}
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
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
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
                    <div className="grid grid-cols-6 gap-2">
                      {[
                        { id: 'none', icon: Mic, color: 'text-zinc-400' },
                        { id: 'deep', icon: Volume1, color: 'text-blue-400' },
                        { id: 'helium', icon: Sparkles, color: 'text-amber-400' },
                        { id: 'robotic', icon: Bot, color: 'text-zinc-500' },
                        { id: 'ghost', icon: Ghost, color: 'text-white' },
                        { id: 'echo', icon: Music, color: 'text-purple-400' },
                      ].map(fx => (
                        <button
                          key={fx.id}
                          onClick={() => applyVoiceEffect(selectedUserToModerate.name, fx.id)}
                          className={cn(
                            "flex flex-col items-center justify-center p-2 rounded-xl transition-all",
                            (selectedUserToModerate.voiceEffect || 'none') === fx.id 
                              ? "bg-purple-600/20 shadow-inner" 
                              : "hover:bg-zinc-800"
                          )}
                        >
                          <fx.icon className={cn("w-4 h-4", (selectedUserToModerate.voiceEffect || 'none') === fx.id ? "text-purple-400" : fx.color)} />
                          <span className="text-[6px] font-black uppercase tracking-widest mt-1 text-zinc-500">{fx.id}</span>
                        </button>
                      ))}
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

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'none', label: 'Original', icon: Mic, desc: 'Pure input', color: 'text-zinc-400' },
                    { id: 'deep', label: 'Deep', icon: Volume1, desc: 'Bass boost', color: 'text-blue-400' },
                    { id: 'helium', label: 'Chipmunk', icon: Sparkles, desc: 'High pitch', color: 'text-amber-400' },
                    { id: 'robotic', label: 'Droid', icon: Bot, desc: 'Metallic freq', color: 'text-zinc-500' },
                    { id: 'ghost', label: 'Spectral', icon: Ghost, desc: 'Echo trails', color: 'text-white' },
                    { id: 'echo', label: 'Studio', icon: Music, desc: 'Reverb max', color: 'text-purple-400' },
                  ].map(fx => (
                    <button
                      key={fx.id}
                      onClick={() => {
                        setSelectedVoiceEffect(fx.id);
                      }}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-3xl border transition-all group relative overflow-hidden",
                        selectedVoiceEffect === fx.id 
                          ? "bg-purple-600 border-purple-400 text-white shadow-xl shadow-purple-500/40 scale-105 z-10" 
                          : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700 hover:bg-zinc-800/50"
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
                      <div className="text-center">
                        <p className="text-[9px] font-black uppercase tracking-widest">{fx.label}</p>
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
