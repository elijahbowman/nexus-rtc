package com.nexusrtc.backend.strategy;

import com.nexusrtc.backend.model.SystemNotificationWrapper;
import com.nexusrtc.backend.config.RedisConfig;
import com.nexusrtc.backend.model.ChatMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.RedisTemplate;
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