package com.portfolio.realtimecommunication.backend.strategy;

import com.portfolio.realtimecommunication.backend.model.ChatMessage;

public interface NotificationStrategy {
    /**
     * Dispatches a real-time notification to a specific target user.
     */
    void sendNotification(String recipientName, ChatMessage message);
}