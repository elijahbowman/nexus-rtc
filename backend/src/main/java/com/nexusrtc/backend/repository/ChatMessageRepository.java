package com.nexusrtc.backend.repository;

import com.nexusrtc.backend.model.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    // Full history for one channel, oldest first. KNOWN ISSUE (R4): unbounded; needs cursor pagination.
    List<ChatMessage> findByChannelIdOrderByTimestampAsc(Long channelId);
}