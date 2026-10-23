package com.nexusrtc.backend.controller;

import com.nexusrtc.backend.repository.ChatMessageRepository;
import com.nexusrtc.backend.service.StorageFacade;
import com.nexusrtc.backend.model.ChatMessage;
import com.nexusrtc.backend.service.ChannelService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Controller;

@Controller
@Slf4j
@RequiredArgsConstructor
public class ChatController {

    private final RedisTemplate<String, Object> redisTemplate;
    private final SimpMessageSendingOperations messagingTemplate;
    private final ChatMessageRepository chatMessageRepository;
    private final ChannelService channelService;
    private final StorageFacade storageFacade;
    private final NotificationController notificationController;
    public static final String REDIS_CHAT_CHANNEL_TOPIC_PREFIX = "app:channel:";

    // Receives a chat message for one channel, persists it, and fans it out to all pods via Redis.
    // KNOWN ISSUE (S3): the payload is bound directly to the JPA entity, so the client controls `sender`,
    // `timestamp` and `id`. A supplied `id` makes save() overwrite an existing message.
    // Fix: accept an inbound DTO and take the sender from the authenticated Principal.
    @MessageMapping("/chat.sendMessage/{channelId}")
    public void sendMessage(@DestinationVariable Long channelId, @Payload ChatMessage chatMessage) {
        if (chatMessage == null) {
            log.error("[WS-METRIC] Rejected inbound messaging frame: Payload is completely null.");
            return;
        }

        log.info("Processing WebSocket text frame payload for distributed channel space ID: {}", channelId);

        // Use the channel id from the destination path, not the payload.
        chatMessage.setChannelId(channelId);

        // KNOWN ISSUE (S4): no membership check; any connected client can post to any channel.
        // if (!channelService.isUserMemberOfChannel(channelId, fetchUserPrincipalFromSession())) { return; }

        // Attach a presigned download URL so live clients can render the attachment immediately.
        // KNOWN ISSUE (S7): attachmentPath comes from the client, so any object key can be presigned.
        if (chatMessage.getAttachmentPath() != null && !chatMessage.getAttachmentPath().isBlank()) {
            log.info("[WS-METRIC] Multimedia payload intercepted inside channel {}. Path: {}, MIME: {}",
                    channelId, chatMessage.getAttachmentPath(), chatMessage.getAttachmentType());
            try {
                String instantUrl = storageFacade.getPresignedUrl(chatMessage.getAttachmentPath());
                chatMessage.setAttachmentUrl(instantUrl);
            } catch (Exception e) {
                log.error("Failed to hydrate live streaming url frame: {}", e.getMessage());
            }
        }

        // Persist the message.
        ChatMessage savedMessage = chatMessageRepository.save(chatMessage);

        // Notify other channel members. KNOWN ISSUE (R5): runs synchronously, one Redis publish per member.
        try {
            notificationController.dispatchChannelNotifications(channelId, savedMessage, savedMessage.getSender());
        } catch (Exception e) {
            log.error("[WS-METRIC] Non-blocking exception inside background notification loop: {}", e.getMessage());
        }

        // Publish to Redis so every backend pod delivers it to its local subscribers of /topic/channels/{id}.
        String redisTopicChannel = REDIS_CHAT_CHANNEL_TOPIC_PREFIX + channelId;
        redisTemplate.convertAndSend(redisTopicChannel, chatMessage);
    }

    @MessageMapping("/chat.addUser/{channelId}")
    public void addUser(@DestinationVariable Long channelId, @Payload ChatMessage chatMessage, SimpMessageHeaderAccessor headerAccessor) {
        log.info("Registering user node profile session identifier: {} inside channel: {}", chatMessage.getSender(), channelId);

        // Stored on the session but not read anywhere yet (no disconnect handler; see R7).
        if (headerAccessor.getSessionAttributes() != null) {
            headerAccessor.getSessionAttributes().put("username", chatMessage.getSender());
            headerAccessor.getSessionAttributes().put("channelId", channelId);
        }

        chatMessage.setChannelId(channelId);
        chatMessage.setType(ChatMessage.MessageType.JOIN);

        // Broadcast the JOIN event. KNOWN ISSUE (R7): sent on every connect and reconnect; LEAVE is never sent.
        String redisTopicChannel = REDIS_CHAT_CHANNEL_TOPIC_PREFIX + channelId;
        redisTemplate.convertAndSend(redisTopicChannel, chatMessage);
    }
}