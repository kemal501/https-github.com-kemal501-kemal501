/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Settings, Shield, UserPlus, MessageSquare, Video, Mic, Share2, Lock, Gift, Star, Zap, Eye, Heart, Bell, Music, Image, Sliders, Globe, Wrench, UserCheck, Ban, CreditCard, HelpCircle, HardDrive } from 'lucide-react';
import { cn } from '../lib/utils';

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

export default function RoomSettings() {
  const [enabled, setEnabled] = React.useState<Record<string, boolean>>(
    SETTINGS_LIST.reduce((acc, s) => ({ ...acc, [s.id]: true }), {})
  );

  const toggle = (id: string) => {
    setEnabled(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800 shadow-xl" id="room-settings">
      <div className="flex items-center gap-3 mb-6">
        <Settings className="text-amber-400 w-6 h-6" />
        <h2 className="text-xl font-bold text-white tracking-tight">Room Management (24 Controls)</h2>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {SETTINGS_LIST.map((setting) => (
          <button
            key={setting.id}
            id={`setting-${setting.id}`}
            onClick={() => toggle(setting.id)}
            className={cn(
              "flex flex-col items-center justify-center p-4 rounded-2xl transition-all duration-300 gap-2 border",
              enabled[setting.id] 
                ? "bg-amber-400/10 border-amber-400/30 text-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.1)]" 
                : "bg-zinc-800/50 border-zinc-700/50 text-zinc-500 hover:border-zinc-600"
            )}
          >
            <setting.icon className="w-6 h-6" />
            <span className="text-[10px] font-bold uppercase tracking-widest">{setting.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
