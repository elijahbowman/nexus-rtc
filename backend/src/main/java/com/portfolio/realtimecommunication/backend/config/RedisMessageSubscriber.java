package com.portfolio.realtimecommunication.backend.config;

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

            // Re-broadcast the raw event string directly out to this node's local WebSocket /topic/public subscribers
            messagingTemplate.convertAndSend("/topic/public", objectMapper.readTree(messageBody));

        } catch (Exception e) {
            log.error("[REDIS-SUBSCRIBER] Critical failure routing distributed message packet: ", e);
        }
    }
}
