package com.portfolio.realtimecommunication.backend.controller;

import com.portfolio.realtimecommunication.backend.model.ChatMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.time.LocalDateTime;

@Controller
@Slf4j
public class ChatController {

    @MessageMapping("/chat.sendMessage") // Client sends to /app/chat.sendMessage
    @SendTo("/topic/public")             // Server broadcasts to /topic/public
    public ChatMessage sendMessage(@Payload ChatMessage chatMessage, Principal principal) {
        log.info("CHAT MESSAGE PROCESSOR: Broadcaster [{}] dispatched payload frame. Size: {} characters.",
                principal.getName(),
                chatMessage.getContent() != null ? chatMessage.getContent().length() : 0);

        chatMessage.setSender(principal.getName());
        chatMessage.setTimestamp(LocalDateTime.now());
        // TODO: For MVP, we can save to DB here or in a Service
        return chatMessage;
    }
}