package com.nexusrtc.backend.strategy;

import com.nexusrtc.backend.model.ChatMessage;

public interface NotificationStrategy {
    /**
     * Dispatches a real-time notification to a specific target user.
     */
    void sendNotification(String recipientName, ChatMessage message);
}