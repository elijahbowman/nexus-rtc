package com.nexusrtc.backend.controller;

import com.nexusrtc.backend.model.ChannelMember;
import com.nexusrtc.backend.model.ChatMessage;
import com.nexusrtc.backend.repository.ChannelMemberRepository;
import com.nexusrtc.backend.strategy.WebSocketNotificationStrategy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationController {

    private final ChannelMemberRepository channelMemberRepository;
    private final WebSocketNotificationStrategy notificationStrategy;

    /**
     * Sends a notification to every channel member except the sender.
     * KNOWN ISSUE (B2): this is a service, not a controller; rename to NotificationService.
     * KNOWN ISSUE (R5): loads every member (N+1), publishes once per member, runs synchronously in the
     * send path, and notifies users who are offline or already viewing the channel.
     */
    @Transactional(readOnly = true)
    public void dispatchChannelNotifications(Long channelId, ChatMessage savedMessage, String currentSenderUsername) {
        log.info("[NOTIF-ENGINE] Evaluating subscriber notification requirements for channel room ID: {}", channelId);

        try {
            // Load channel members.
            List<ChannelMember> channelMembers = channelMemberRepository.findById_ChannelId(channelId);
            if (channelMembers == null || channelMembers.isEmpty()) return;

            // Channel name for the notification text.
            String channelName = "unknown";
            if (!channelMembers.isEmpty() && channelMembers.get(0).getChannel() != null) {
                channelName = channelMembers.get(0).getChannel().getName();
            }

            // One notification per member.
            for (ChannelMember membership : channelMembers) {
                if (membership.getUser() == null) continue;

                String recipientUsername = membership.getUser().getUsername();

                // Skip the sender.
                if (recipientUsername != null && recipientUsername.equalsIgnoreCase(currentSenderUsername)) {
                    continue;
                }

                // Add channel name
                savedMessage.setChannelName(channelName);

                // Deliver via the configured NotificationStrategy.
                notificationStrategy.sendNotification(recipientUsername, savedMessage);
            }
        } catch (Exception e) {
            log.error("[NOTIF-ENGINE] Failed to execute notification dispatch sequence: {}", e.getMessage());
        }
    }
}
