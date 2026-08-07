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

    // 🚀 INJECTS ACCURATE REPOSITORY: Maps cleanly to your embedded composite key schema layers
    private final ChannelMemberRepository channelMemberRepository;
    private final WebSocketNotificationStrategy notificationStrategy;

    /**
     * 📣 Broadcasts out-of-app notifications to all channel members
     * except the individual who typed the message.
     */
    @Transactional(readOnly = true)
    public void dispatchChannelNotifications(Long channelId, ChatMessage savedMessage, String currentSenderUsername) {
        log.info("[NOTIF-ENGINE] Evaluating subscriber notification requirements for channel room ID: {}", channelId);

        try {
            // 1. Fetch all members joined to this specific channel using your exact repository method
            List<ChannelMember> channelMembers = channelMemberRepository.findById_ChannelId(channelId);
            if (channelMembers == null || channelMembers.isEmpty()) return;

            // 2. Extract the channel name from the first valid record
            String channelName = "unknown";
            if (!channelMembers.isEmpty() && channelMembers.get(0).getChannel() != null) {
                channelName = channelMembers.get(0).getChannel().getName();
            }

            // 3. Loop through the membership list and dispatch notification alerts
            for (ChannelMember membership : channelMembers) {
                if (membership.getUser() == null) continue;

                String recipientUsername = membership.getUser().getUsername();

                // UX CHECKPOINT: Never send a push notification to the user who sent the message!
                if (recipientUsername != null && recipientUsername.equalsIgnoreCase(currentSenderUsername)) {
                    continue;
                }

                // Add channel name
                savedMessage.setChannelName(channelName);

                // Route the alert payload over your active WebSocket strategy
                notificationStrategy.sendNotification(recipientUsername, savedMessage);
            }
        } catch (Exception e) {
            log.error("[NOTIF-ENGINE] Failed to execute notification dispatch sequence: {}", e.getMessage());
        }
    }
}
