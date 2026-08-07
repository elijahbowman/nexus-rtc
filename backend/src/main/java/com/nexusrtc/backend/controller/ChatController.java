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

    // REAL-TIME ISOLATION LAYER: Dynamic Channel Routing Hub
    @MessageMapping("/chat.sendMessage/{channelId}")
    public void sendMessage(@DestinationVariable Long channelId, @Payload ChatMessage chatMessage) {
        if (chatMessage == null) {
            log.error("[WS-METRIC] Rejected inbound messaging frame: Payload is completely null.");
            return;
        }

        log.info("Processing WebSocket text frame payload for distributed channel space ID: {}", channelId);

        // Enforce implicit parameter sync to prevent client payload spoofing
        chatMessage.setChannelId(channelId);

        // Production Security Guard: Bypasses data layer execution if user lacks access metrics
        // (Will be activated once security principal parameters are fully mapped into session context)
        // if (!channelService.isUserMemberOfChannel(channelId, fetchUserPrincipalFromSession())) { return; }

        // THE MULTIMEDIA EXTENSION: Log active file attachment metrics for cluster tracking
        // REAL-TIME HYDRATION: Generate the URL immediately for live users so they don't have to reload!
        if (chatMessage.getAttachmentPath() != null && !chatMessage.getAttachmentPath().isBlank()) {
            log.info("[WS-METRIC] Multimedia payload intercepted inside channel {}. Path: {}, MIME: {}",
                    channelId, chatMessage.getAttachmentPath(), chatMessage.getAttachmentType());
            try {
                String instantUrl = storageFacade.getPresignedUrl(chatMessage.getAttachmentPath());
                chatMessage.setAttachmentUrl(instantUrl); // Hydrate the transient property on the active payload!
            } catch (Exception e) {
                log.error("Failed to hydrate live streaming url frame: {}", e.getMessage());
            }
        }

        // 1. Persist the text record safely to the cloud-native database engine
        ChatMessage savedMessage = chatMessageRepository.save(chatMessage);

        // THE PUSH NOTIFICATION EXTENSION HOOK:
        // Automatically dispatch background badges/alerts to all other room members!
        try {
            notificationController.dispatchChannelNotifications(channelId, savedMessage, savedMessage.getSender());
        } catch (Exception e) {
            log.error("[WS-METRIC] Non-blocking exception inside background notification loop: {}", e.getMessage());
        }

        // 2. BROADCAST: Publish the payload across our Phase 2 Redis horizontal cluster topic layer
        // This ensures that all instances in our Kubernetes cluster intercept the message instantly
        String redisTopicChannel = REDIS_CHAT_CHANNEL_TOPIC_PREFIX + channelId;
        redisTemplate.convertAndSend(redisTopicChannel, chatMessage);
    }

    @MessageMapping("/chat.addUser/{channelId}")
    public void addUser(@DestinationVariable Long channelId, @Payload ChatMessage chatMessage, SimpMessageHeaderAccessor headerAccessor) {
        log.info("Registering user node profile session identifier: {} inside channel: {}", chatMessage.getSender(), channelId);

        // Bind the connection metadata directly to the local session map context tracking layer
        if (headerAccessor.getSessionAttributes() != null) {
            headerAccessor.getSessionAttributes().put("username", chatMessage.getSender());
            headerAccessor.getSessionAttributes().put("channelId", channelId);
        }

        chatMessage.setChannelId(channelId);
        chatMessage.setType(ChatMessage.MessageType.JOIN);

        // Broadcast across the Redis cluster topic pattern mesh!
        String redisTopicChannel = REDIS_CHAT_CHANNEL_TOPIC_PREFIX + channelId;
        redisTemplate.convertAndSend(redisTopicChannel, chatMessage);
    }
}