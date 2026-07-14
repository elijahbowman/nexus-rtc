package com.portfolio.realtimecommunication.backend.strategy;

import com.portfolio.realtimecommunication.backend.model.ChatMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessageSendingOperations;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class WebSocketNotificationStrategy implements NotificationStrategy {

    private final SimpMessageSendingOperations messagingTemplate;

    @Override
    public void sendNotification(String recipientName, ChatMessage message) {
        // 📡 Route to a private, user-isolated WebSocket queue path
        String destination = "/queue/notifications/" + recipientName;

        log.info("[NOTIF-ENGINE] Routing push notification frame over WebSocket to user: {} on path: {}", recipientName, destination);
        messagingTemplate.convertAndSend(destination, message);
    }
}