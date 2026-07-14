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

  // 1. REFRESH PIPELINE: Fetches raw public rooms and user memberships simultaneously
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

      // Auto-select a default fallback room if no active selection is initialized
      if (!activeChannel && allRooms.length > 0) {
        console.log("[CHANNELS-HOOK] Standby state initialized. Waiting for user sidebar interaction.");
         setActiveChannel(null); // Leaves the main panel empty until a channel is actively chosen
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to sync distributed channel inventories.');
    } finally {
      setLoading(false);
    }
  }, [currentUserId, activeChannel]);

  // 2. PROVISIONING HANDLER: Instantiates a room and binds the creator straight to it
  const createNewChannel = async (name: string) => {
    if (!currentUserId) return null;
    try {
      const newRoom = await channelService.createChannel({ name, creatorId: currentUserId });
      await refreshChannels(); // Sync arrays immediately to pull down updates
      return newRoom;
    } catch (err: any) {
      throw new Error(err?.response?.data?.message || 'Room creation constraint failure.');
    }
  };

  // 3. ENTRY HANDLER: Joins a user tracking profile to a target channel roster list
  const joinTargetChannel = async (channelId: number) => {
    if (!currentUserId) return;
    try {
      await channelService.joinChannel(channelId, currentUserId);
      await refreshChannels();
    } catch (err: any) {
      console.error('Failed to join channel roster context:', err);
    }
  };

  // 4. CORE ENGINE INITIALIZATION: Handles automatic state syncing at component mount
  useEffect(() => {
    refreshChannels();

    // High-Utility Polling Loop: Safely auto-polls every 5 seconds to ensure rooms
    // created on different cluster pods inside Kubernetes appear instantly on your sidebar panel.
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
        setActiveChannel(null); // Clear view viewport if active room was deleted
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
