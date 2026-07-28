import api from '../api/axios';

// Define clear TypeScript interfaces to guarantee absolute type-safety across views
export interface Channel {
  id: number;
  name: string;
  createdAt: string;
}

// Explicit message data model interface matching backend object
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
  attachmentUrl?: string; // Captures transient presigned target urls
}

export interface ChannelCreationRequest {
  name: string;
  creatorId?: number; // Optional until user login contextual flows freeze
}

export const channelService = {

  // 1. CREATE: Dispatches a room initialization payload to the backend data layer
  createChannel: async (request: ChannelCreationRequest): Promise<Channel> => {
    const response = await api.post<Channel>(`/channels`, request);
    return response.data;
  },

  // 2. READ ALL: Fetches a raw inventory array of every active public chat room
  getAllChannels: async (): Promise<Channel[]> => {
    const response = await api.get<Channel[]>(`/channels`);
    return response.data;
  },

  // 3. READ FOR USER: Loads all channel spaces a specific identity profile populates
  getChannelsForUser: async (userId: number): Promise<Channel[]> => {
    const response = await api.get<Channel[]>(`/channels/user/${userId}`);
    return response.data;
  },

  // 4. JOIN: Bonds a user tracking profile to a target channel roster list
  joinChannel: async (channelId: number, userId: number): Promise<void> => {
    await api.post(`/channels/${channelId}/join`, null, {
      params: { userId }
    });
  },

  // 5. LEAVE: Safely removes the user reference out of the room tracking parameters
  leaveChannel: async (channelId: number, userId: number): Promise<void> => {
    await api.post(`/channels/${channelId}/leave`, null, {
      params: { userId }
    });
  },

  // 6. Extracts historical logs chronologically
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