package com.portfolio.realtimecommunication.backend.controller;

import com.portfolio.realtimecommunication.backend.config.RedisConfig;
import com.portfolio.realtimecommunication.backend.model.ChatMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.time.LocalDateTime;

@Controller
@Slf4j
public class ChatController {

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    @MessageMapping("/chat.sendMessage") // Client sends to /app/chat.sendMessage
    @SendTo("/topic/public")             // Server broadcasts to /topic/public
    public void sendMessage(@Payload ChatMessage chatMessage, Principal principal) {
        log.info("CHAT MESSAGE PROCESSOR: Broadcaster [{}] dispatched payload frame. Size: {} characters.",
                principal.getName(),
                chatMessage.getContent() != null ? chatMessage.getContent().length() : 0);

        chatMessage.setSender(principal.getName());
        chatMessage.setTimestamp(LocalDateTime.now());
        // TODO: For MVP, we can save to DB here or in a Service

        // Publish chat frames to the shared Redis engine
        redisTemplate.convertAndSend(RedisConfig.REDIS_SIGNALING_TOPIC, chatMessage);
    }
}