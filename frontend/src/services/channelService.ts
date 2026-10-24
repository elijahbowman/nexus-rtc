import api from '../api/axios';

export interface Channel {
  id: number;
  name: string;
  createdAt: string;
}

// Mirrors the backend ChatMessage entity.
export interface ChatMessagePayload {
  id?: number;
  channelId: number;
  channelName?: string;
  sender: string;
  content: string;
  type: 'CHAT' | 'JOIN' | 'LEAVE';
  timestamp?: string;
  attachmentPath?: string;
  attachmentType?: string;
  attachmentUrl?: string; // Presigned download URL (not persisted)
}

export interface ChannelCreationRequest {
  name: string;
  creatorId?: number; // KNOWN ISSUE (S1): sent by the client; the server should use the JWT
}

export const channelService = {

  // Create a channel.
  createChannel: async (request: ChannelCreationRequest): Promise<Channel> => {
    const response = await api.post<Channel>(`/channels`, request);
    return response.data;
  },

  // All channels.
  getAllChannels: async (): Promise<Channel[]> => {
    const response = await api.get<Channel[]>(`/channels`);
    return response.data;
  },

  // Channels for a user. KNOWN ISSUE (S1): passes userId explicitly.
  getChannelsForUser: async (userId: number): Promise<Channel[]> => {
    const response = await api.get<Channel[]>(`/channels/user/${userId}`);
    return response.data;
  },

  // Join a channel.
  joinChannel: async (channelId: number, userId: number): Promise<void> => {
    await api.post(`/channels/${channelId}/join`, null, {
      params: { userId }
    });
  },

  // Leave a channel.
  leaveChannel: async (channelId: number, userId: number): Promise<void> => {
    await api.post(`/channels/${channelId}/leave`, null, {
      params: { userId }
    });
  },

  // Message history (unpaginated, R4).
  getChannelHistory: async (channelId: number, userId: number): Promise<ChatMessagePayload[]> => {
    const response = await api.get<ChatMessagePayload[]>(`/channels/${channelId}/messages`, {
      params: { userId }
    });
    return response.data;
  },

  deleteChannel: async (channelId: number): Promise<void> => {
    await api.delete(`/channels/${channelId}`);
  }
};