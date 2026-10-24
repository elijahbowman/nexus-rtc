package com.nexusrtc.backend.repository;

import com.nexusrtc.backend.model.Channel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface ChannelRepository extends JpaRepository<Channel, Long> {
    // Look up a channel by normalized name, e.g. "general".
    Optional<Channel> findByName(String name);

    // Name check. Not race-safe; the unique constraint is the real guard (B3).
    boolean existsByName(String name);
}