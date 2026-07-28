package com.portfolio.realtimecommunication.backend.config;

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
        // Satisfies formal MessageListener interface requirements if direct invocation is triggered
        receiveMessage(new String(message.getBody()));
    }

    public void receiveMessage(String messageBody) {
        try {
            log.info("[REDIS-SUBSCRIBER] Intercepted cross-node cluster event payload.");

            JsonNode jsonNode = objectMapper.readTree(messageBody);

            // WebRTC Signaling Catch: Checks for data/receiver attributes to route calls
            if (jsonNode.has("receiver") || jsonNode.has("data")) {
                messagingTemplate.convertAndSend("/topic/public", jsonNode);
            }
            // Chat Channel Catch
            else if (jsonNode.has("channelId")) {
                Long channelId = jsonNode.get("channelId").asLong();
                messagingTemplate.convertAndSend("/topic/channels/" + channelId, jsonNode);
            }
            // System Notification Catch
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
