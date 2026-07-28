package com.portfolio.realtimecommunication.backend.model;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SystemNotificationWrapper {
    private String recipientUsername;
    private ChatMessage chatMessagePayload;
}
