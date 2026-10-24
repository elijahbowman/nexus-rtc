package com.nexusrtc.backend.config;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
@Slf4j
public class RedisMessageSubscriber implements MessageListener {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private ObjectMapper objectMapper;

    @Override
    public void onMessage(Message message, byte[] pattern) {
        // MessageListener entry point, used if the subscriber is registered directly.
        receiveMessage(new String(message.getBody()));
    }

    public void receiveMessage(String messageBody) {
        try {
            log.info("[REDIS-SUBSCRIBER] Intercepted cross-node cluster event payload.");

            JsonNode jsonNode = objectMapper.readTree(messageBody);

            // KNOWN ISSUE (R6): the destination is inferred from which JSON fields are present, so adding a
            // field to a model can reroute messages. Route by Redis channel name instead.
            // Signaling message: has data/receiver.
            if (jsonNode.has("receiver") || jsonNode.has("data")) {
                messagingTemplate.convertAndSend("/topic/public", jsonNode);
            }
            // Chat message: has channelId.
            else if (jsonNode.has("channelId")) {
                Long channelId = jsonNode.get("channelId").asLong();
                messagingTemplate.convertAndSend("/topic/channels/" + channelId, jsonNode);
            }
            // Notification.
            else if (jsonNode.has("recipientUsername") && jsonNode.has("chatMessagePayload")) {
                String targetUser = jsonNode.get("recipientUsername").asText();
                JsonNode messagePayload = jsonNode.get("chatMessagePayload");

                log.info("[REDIS-SUBSCRIBER] Broadcasting local in-app alert down to websocket: {}", targetUser);
                messagingTemplate.convertAndSend("/queue/notifications/" + targetUser, messagePayload);
            }
        } catch (Exception e) {
            log.error("[REDIS-SUBSCRIBER] Critical failure routing distributed message packet: ", e);
        }
    }
}
