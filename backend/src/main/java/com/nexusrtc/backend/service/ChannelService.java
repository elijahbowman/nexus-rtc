package com.nexusrtc.backend.service;

import com.nexusrtc.backend.model.Channel;
import java.util.List;

public interface ChannelService {
    // Creates a channel and adds the creator as a member.
    Channel createChannel(String name, Long creatorId);

    // Adds a user to a channel.
    void joinChannel(Long channelId, Long userId);

    // Removes a user from a channel.
    void leaveChannel(Long channelId, Long userId);

    // Returns all channels.
    List<Channel> getAllChannels();

    // Returns the channels a user belongs to.
    List<Channel> getChannelsForUser(Long userId);

    // Membership check. Only as trustworthy as the userId passed in (see S1).
    boolean isUserMemberOfChannel(Long channelId, Long userId);

    void deleteChannel(Long channelId);
}