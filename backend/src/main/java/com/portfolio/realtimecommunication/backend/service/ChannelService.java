package com.portfolio.realtimecommunication.backend.service;

import com.portfolio.realtimecommunication.backend.model.Channel;
import java.util.List;

public interface ChannelService {
    // Instantiates a brand-new chat room channel in the platform register
    Channel createChannel(String name, Long creatorId);

    // Grants a specific user access rights and attaches them to a room roster
    void joinChannel(Long channelId, Long userId);

    // Safely removes a user's entry record out of a channel space membership
    void leaveChannel(Long channelId, Long userId);

    // Returns a clean array listing of all channels currently active in the ecosystem
    List<Channel> getAllChannels();

    // Sidebar Synchronization: Fetches all rooms a specific profile populates
    List<Channel> getChannelsForUser(Long userId);

    // Security Checkpoint: Assures user is verified to send/receive frames in a room
    boolean isUserMemberOfChannel(Long channelId, Long userId);

    void deleteChannel(Long channelId);
}