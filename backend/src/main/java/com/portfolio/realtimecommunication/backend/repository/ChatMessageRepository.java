package com.portfolio.realtimecommunication.backend.repository;

import com.portfolio.realtimecommunication.backend.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    // CHANNEL-ISOLATION: Fetches the message history scoped strictly to one target chat room
    // Ordered chronologically so frontend chat feed prints from oldest to newest text frame
    List<ChatMessage> findByChannelIdOrderByTimestampAsc(Long channelId);
}