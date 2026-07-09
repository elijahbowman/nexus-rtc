import React, { useState } from 'react';
import { type Channel } from '../services/channelService';

interface SidebarProps {
  channels: Channel[];
  userChannels: Channel[];
  activeChannel: Channel | null;
  onSelectChannel: (channel: Channel) => void;
  onCreateChannel: (name: string) => Promise<any>;
  currentUsername: string;
  onDeleteChannel: (channelId: number) => Promise<void>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  channels,
  userChannels,
  activeChannel,
  onSelectChannel,
  onCreateChannel,
  currentUsername,
  onDeleteChannel
}) => {
  const [newChannelName, setNewChannelName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Submit Handler for Room Provisioning
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    
    if (!newChannelName.trim()) return;

    try {
      await onCreateChannel(newChannelName);
      setNewChannelName('');
      setIsCreating(false);
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create channel.');
    }
  };

  // Helper tracking rule to check if the current user has already joined a room list
  const isMember = (channelId: number) => userChannels.some(c => c.id === channelId);

  return (
    <div className="w-64 bg-slate-900 text-slate-100 flex flex-col h-full border-r border-slate-800">
      {/* Brand & Identity Section */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg text-indigo-400">NexusRTC ☸️</h1>
          <p className="text-xs text-slate-400 truncate">👤 {currentUsername}</p>
        </div>
      </div>

      {/* Channels List Layout */}
      <div className="flex-1 overflow-y-auto p-3 space-y-6">
        <div>
          <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 px-2">
            <span>Text Channels</span>
            <button 
              onClick={() => setIsCreating(!isCreating)}
              className="hover:text-indigo-400 text-sm font-bold transition-colors"
              title="Create Channel"
            >
              ＋
            </button>
          </div>

          {/* Dynamic Creation Form Box */}
          {isCreating && (
            <form onSubmit={handleSubmit} className="mb-4 p-2 bg-slate-800 rounded-md">
              <input
                type="text"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder="e.g. general"
                maxLength={50}
                className="w-full text-sm bg-slate-950 text-slate-100 p-2 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                autoFocus
              />
              {formError && <p className="text-rose-400 text-xs mt-1 px-1">{formError}</p>}
              <div className="flex justify-end space-y-0 space-x-2 mt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="text-xs bg-indigo-600 hover:bg-indigo-500 px-2 py-1 rounded font-medium transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          )}

          {/* Rooms Iteration View */}
          <div className="space-y-1">
            {channels.length === 0 ? (
              <p className="text-xs text-slate-500 italic px-2">No active channels found.</p>
            ) : (
              channels.map((channel) => {
                const isActive = activeChannel?.id === channel.id;
                const hasJoined = isMember(channel.id);

                return (
                  <div key={channel.id} className="group relative flex items-center justify-between rounded-md transition-all">
                    <button
                      onClick={() => onSelectChannel(channel)}
                      className={`w-full flex items-center justify-between text-sm px-3 py-2 rounded-md text-left transition-all ${
                        isActive 
                          ? 'bg-indigo-600/90 text-white font-medium shadow-sm shadow-indigo-600/20' 
                          : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate pr-6">
                        <span className="text-slate-500 font-mono">#</span>
                        <span className="truncate">{channel.name}</span>
                      </div>

                      {/* Dynamic Access Indicator Badges */}
                      {!hasJoined && (
                        <span className="text-[10px] bg-slate-800 text-slate-400 group-hover:bg-indigo-500/20 group-hover:text-indigo-300 px-1.5 py-0.5 rounded font-medium">Join</span>
                      )}
                    </button>

                    {/* ADMIN TRASH BUTTON: Visible smoothly on row hover */}
                    {hasJoined && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Avoid triggering route focus selection triggers
                          if (confirm(`Delete channel #${channel.name}?`)) onDeleteChannel(channel.id);
                        }}
                        className="absolute right-2 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition-all p-1 text-xs"
                        title="Delete Channel"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* System Status Footnote */}
      <div className="p-3 bg-slate-950/40 border-t border-slate-800/60 text-[10px] text-slate-500 flex items-center space-x-2">
        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <span className="font-mono">Cluster Sync: Online</span>
      </div>
    </div>
  );
};
