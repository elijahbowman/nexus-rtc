package com.portfolio.realtimecommunication.backend.controller;

import com.portfolio.realtimecommunication.backend.model.ChatMessage;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.time.LocalDateTime;

@Controller
public class ChatController {

    @MessageMapping("/chat.sendMessage") // Client sends to /app/chat.sendMessage
    @SendTo("/topic/public")             // Server broadcasts to /topic/public
    public ChatMessage sendMessage(@Payload ChatMessage chatMessage, Principal principal) {
        chatMessage.setSender(principal.getName());
        chatMessage.setTimestamp(LocalDateTime.now());
        // TODO: For MVP, we can save to DB here or in a Service
        return chatMessage;
    }
}