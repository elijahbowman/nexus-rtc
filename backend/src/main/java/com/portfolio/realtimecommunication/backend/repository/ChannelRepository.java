package com.portfolio.realtimecommunication.backend.repository;

import com.portfolio.realtimecommunication.backend.model.Channel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface ChannelRepository extends JpaRepository<Channel, Long> {
    // Used to find a specific room by its clean text handle (e.g., "general")
    Optional<Channel> findByName(String name);

    // Security Check: Verifies if a channel name is already taken before creation
    boolean existsByName(String name);
}