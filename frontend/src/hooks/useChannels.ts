import { useState, useEffect, useCallback } from 'react';
import { channelService, type Channel } from '../services/channelService';

export const useChannels = (currentUserId?: number) => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [userChannels, setUserChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(() => {
    const savedChannel = localStorage.getItem('activeChannel');
    try {
      return savedChannel ? JSON.parse(savedChannel) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all channels and the user's memberships in parallel.
  const refreshChannels = useCallback(async () => {
    if (!currentUserId) return;
    try {
      setLoading(true);
      setError(null);
      
      const [allRooms, memberRooms] = await Promise.all([
        channelService.getAllChannels(),
        channelService.getChannelsForUser(currentUserId)
      ]);

      setChannels(allRooms);
      setUserChannels(memberRooms);

      // No automatic selection: the main panel stays empty until a channel is chosen.
      if (!activeChannel && allRooms.length > 0) {
        console.log("[CHANNELS-HOOK] Standby state initialized. Waiting for user sidebar interaction.");
         setActiveChannel(null);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to sync distributed channel inventories.');
    } finally {
      setLoading(false);
    }
  }, [currentUserId, activeChannel]);

  // Create a channel (the server adds the creator as a member).
  const createNewChannel = async (name: string) => {
    if (!currentUserId) return null;
    try {
      const newRoom = await channelService.createChannel({ name, creatorId: currentUserId });
      await refreshChannels();
      return newRoom;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Room creation constraint failure.');
    }
  };

  // Join a channel.
  const joinTargetChannel = async (channelId: number) => {
    if (!currentUserId) return;
    try {
      await channelService.joinChannel(channelId, currentUserId);
      await refreshChannels();
    } catch (err: any) {
      console.error('Failed to join channel roster context:', err);
    }
  };

  // Initial load plus polling. KNOWN ISSUE: refreshChannels depends on activeChannel, so the interval
  // is torn down and recreated on every channel switch.
  useEffect(() => {
    refreshChannels();

    // Poll every 5s so channels created by other users appear. KNOWN ISSUE (R9): two requests per user
    // every 5s doesn't scale; push channel events over the existing WebSocket instead.
    const pollInterval = setInterval(() => {
      if (currentUserId) {
        Promise.all([
          channelService.getAllChannels(),
          channelService.getChannelsForUser(currentUserId)
        ]).then(([allRooms, memberRooms]) => {
          setChannels(allRooms);
          setUserChannels(memberRooms);
        }).catch(err => console.debug('Polling sync suspended:', err));
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [currentUserId, refreshChannels]);

  const removeChannel = async (channelId: number) => {
    try {
      await channelService.deleteChannel(channelId);
      await refreshChannels();
      if (activeChannel?.id === channelId) {
        setActiveChannel(null); // The active channel was deleted
      }
    } catch (err) {
      console.error('Failed to execute channel deletion tracking loops:', err);
    }
  };

  return {
    channels,
    userChannels,
    activeChannel,
    setActiveChannel,
    loading,
    error,
    refreshChannels,
    createNewChannel,
    joinTargetChannel,
    removeChannel
  };
};
