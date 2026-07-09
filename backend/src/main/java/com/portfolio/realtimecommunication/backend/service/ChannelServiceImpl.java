package com.portfolio.realtimecommunication.backend.service;

import com.portfolio.realtimecommunication.backend.model.Channel;
import com.portfolio.realtimecommunication.backend.model.ChannelMember;
import com.portfolio.realtimecommunication.backend.model.ChannelMemberId;
import com.portfolio.realtimecommunication.backend.model.User;
import com.portfolio.realtimecommunication.backend.repository.ChannelMemberRepository;
import com.portfolio.realtimecommunication.backend.repository.ChannelRepository;
import com.portfolio.realtimecommunication.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional // Guarantees atomic all-or-nothing operations across database calls
@Slf4j
public class ChannelServiceImpl implements ChannelService {

    private final ChannelRepository channelRepository;
    private final ChannelMemberRepository channelMemberRepository;
    private final UserRepository userRepository;

    @Override
    public Channel createChannel(String name, Long creatorId) {
        // Enforce standardized clean lowercase text tokens (e.g., "#General" -> "general")
        String sanitizedName = name.trim().toLowerCase().replaceAll("[^a-z0-9-]", "");

        if (sanitizedName.length() < 2 || sanitizedName.length() > 50) {
            throw new IllegalArgumentException("Channel name must be between 2 and 50 characters alphanumeric.");
        }

        if (channelRepository.existsByName(sanitizedName)) {
            throw new IllegalStateException("Channel name '" + sanitizedName + "' already exists.");
        }

        log.info("Provisioning brand-new distributed chat channel room: #{}", sanitizedName);
        Channel channel = Channel.builder()
                .name(sanitizedName)
                .build();

        Channel savedChannel = channelRepository.save(channel);

        // Senior Deliverable: The creator automatically joins the channel they just provisioned
        if (creatorId != null) {
            joinChannel(savedChannel.getId(), creatorId);
        }

        return savedChannel;
    }

    @Override
    public void joinChannel(Long channelId, Long userId) {
        ChannelMemberId memberId = new ChannelMemberId(channelId, userId);

        if (channelMemberRepository.existsById(memberId)) {
            log.warn("User {} attempted duplicate membership submission into channel {}", userId, channelId);
            return; // Silently skip to prevent constraint crashes
        }

        Channel channel = channelRepository.findById(channelId)
                .orElseThrow(() -> new IllegalArgumentException("Target channel context not found."));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("Target user identity profile not found."));

        ChannelMember member = ChannelMember.builder()
                .id(memberId)
                .channel(channel)
                .user(user)
                .build();

        channelMemberRepository.save(member);
        log.info("User {} successfully bonded to multi-channel room #{}", userId, channel.getName());
    }

    @Override
    public void leaveChannel(Long channelId, Long userId) {
        ChannelMemberId memberId = new ChannelMemberId(channelId, userId);
        if (!channelMemberRepository.existsById(memberId)) {
            throw new IllegalArgumentException("User is not registered inside this target channel scope.");
        }
        channelMemberRepository.deleteById(memberId);
        log.info("Purged membership index link for user {} out of channel room {}", userId, channelId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Channel> getAllChannels() {
        return channelRepository.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Channel> getChannelsForUser(Long userId) {
        if (!userRepository.existsById(userId)) {
            throw new IllegalArgumentException("Target identity context parameters not resolved.");
        }
        return channelMemberRepository.findChannelsByUserId(userId);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isUserMemberOfChannel(Long channelId, Long userId) {
        if (channelId == null || userId == null) return false;
        return channelMemberRepository.existsById_ChannelIdAndId_UserId(channelId, userId);
    }

    @Override
    public void deleteChannel(Long channelId) {
        if (!channelRepository.existsById(channelId)) {
            throw new IllegalArgumentException("Target channel context cannot be resolved.");
        }
        log.info("Executing administrative cascading wipe for channel ID: {}", channelId);

        // Cascades down automatically to clear all channel_members and messages via DDL constraints!
        channelRepository.deleteById(channelId);
    }
}