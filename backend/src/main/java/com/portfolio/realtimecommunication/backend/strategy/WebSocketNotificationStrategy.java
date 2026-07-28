package com.portfolio.realtimecommunication.backend.strategy;

import com.portfolio.realtimecommunication.backend.config.RedisConfig;
import com.portfolio.realtimecommunication.backend.model.ChatMessage;
import com.portfolio.realtimecommunication.backend.model.SystemNotificationWrapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketNotificationStrategy implements NotificationStrategy {

    private final RedisTemplate<String, Object> redisTemplate;

    @Override
    public void sendNotification(String recipientName, ChatMessage message) {
        log.info("[REDIS-PRODUCER] Forwarding alert for {} to the Redis cluster.", recipientName);

        // Wrap payload
        SystemNotificationWrapper wrapper = new SystemNotificationWrapper(recipientName, message);

        // Publish to cluster
        redisTemplate.convertAndSend(RedisConfig.REDIS_NOTIFICATIONS_TOPIC, wrapper);
    }
}