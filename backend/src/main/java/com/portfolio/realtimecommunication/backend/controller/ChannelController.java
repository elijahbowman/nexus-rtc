package com.portfolio.realtimecommunication.backend.controller;

import com.portfolio.realtimecommunication.backend.model.Channel;
import com.portfolio.realtimecommunication.backend.model.ChatMessage;
import com.portfolio.realtimecommunication.backend.repository.ChatMessageRepository;
import com.portfolio.realtimecommunication.backend.service.ChannelService;
import com.portfolio.realtimecommunication.backend.service.StorageFacade;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/channels")
@RequiredArgsConstructor
@CrossOrigin(origins = "*") // Allows clean integration across your local k8s port-forwards
@Slf4j
public class ChannelController {

    private final ChannelService channelService;
    private final ChatMessageRepository chatMessageRepository;
    private final StorageFacade storageFacade;

    // 1. CREATE ROOM: Instantiates a fresh chat space inside the data inventory
    @PostMapping
    public ResponseEntity<Channel> createChannel(@RequestBody ChannelCreationRequest request) {
        log.info("REST request to instantiate channel: #{} by user ID: {}", request.getName(), request.getCreatorId());
        try {
            Channel channel = channelService.createChannel(request.getName(), request.getCreatorId());
            return new ResponseEntity<>(channel, HttpStatus.CREATED);
        } catch (IllegalArgumentException | IllegalStateException e) {
            log.warn("Validation error processing channel creation submission: {}", e.getMessage());
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
    }

    // 2. INVENTORY STREAM: Lists every active channel room registered in the ecosystem
    @GetMapping
    public ResponseEntity<List<Channel>> getAllChannels() {
        log.info("REST request to pull all active channel inventories");
        return ResponseEntity.ok(channelService.getAllChannels());
    }

    // 3. USER STREAM: Fetches all channels a specific user profile populates (Sidebar Loader)
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<Channel>> getChannelsForUser(@PathVariable Long userId) {
        log.info("REST request to pull active channel memberships for user ID: {}", userId);
        try {
            List<Channel> channels = channelService.getChannelsForUser(userId);
            return ResponseEntity.ok(channels);
        } catch (IllegalArgumentException e) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
    }

    // 4. JOIN ROOM ROSTER: Establishes a binding relationship between a user and a channel
    @PostMapping("/{channelId}/join")
    public ResponseEntity<Void> joinChannel(@PathVariable Long channelId, @RequestParam Long userId) {
        log.info("REST request: User ID {} attempting synchronization into channel ID {}", userId, channelId);
        try {
            channelService.joinChannel(channelId, userId);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
    }

    // 5. LEAVE ROOM ROSTER: Safely severs the membership index tracking link
    @PostMapping("/{channelId}/leave")
    public ResponseEntity<Void> leaveChannel(@PathVariable Long channelId, @RequestParam Long userId) {
        log.info("REST request: User ID {} leaving channel ID {}", userId, channelId);
        try {
            channelService.leaveChannel(channelId, userId);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return new ResponseEntity<>(HttpStatus.BAD_REQUEST);
        }
    }

    // 6. CHAT HISTORY STREAM: Fetches all messages chronologically scoped to one target chat room
    @GetMapping("/{channelId}/messages")
    public ResponseEntity<List<ChatMessage>> getChannelHistory(@PathVariable Long channelId, @RequestParam Long userId) {
        log.info("REST request to fetch conversation history log for channel ID: {} by user ID: {}", channelId, userId);

        // Security Checkpoint: Aborts data retrieval instantly if the user is not a member of the room
        if (!channelService.isUserMemberOfChannel(channelId, userId)) {
            log.warn("Security Alert: User {} attempted unauthorized history extraction from channel {}", userId, channelId);
            return new ResponseEntity<>(HttpStatus.FORBIDDEN); // Return a clean 403 Forbidden
        }

        // Pull the raw chronological logs directly out of PostgreSQL memory blocks
        List<ChatMessage> history = chatMessageRepository.findByChannelIdOrderByTimestampAsc(channelId);

        // THE STORAGE TRANSITION ENGINE: Generate pre-signed URL vectors for all attachments
        history.forEach(message -> {
            if (message.getAttachmentPath() != null && !message.getAttachmentPath().isBlank()) {
                try {
                    // Resolve a secure, 2-hour pre-signed access URL straight from MinIO/S3
                    String secureUrl = storageFacade.getPresignedUrl(message.getAttachmentPath());

                    // Assign it straight to the Lombok @Transient field for JSON serialization transport!
                    message.setAttachmentUrl(secureUrl);

                } catch (Exception e) {
                    log.error("Failed to compile pre-signed URL wrapper for message index {}: {}", message.getId(), e.getMessage());
                }
            }
        });

        return ResponseEntity.ok(history);
    }

    @DeleteMapping("/{channelId}")
    public ResponseEntity<Void> deleteChannel(@PathVariable Long channelId) {
        log.info("REST request to administratively delete channel ID: {}", channelId);
        try {
            channelService.deleteChannel(channelId);
            return ResponseEntity.ok().build();
        } catch (IllegalArgumentException e) {
            return new ResponseEntity<>(HttpStatus.NOT_FOUND);
        }
    }

    // Data Transfer Object (DTO) container to securely map JSON payload parameters
    @Data
    public static class ChannelCreationRequest {
        @NotBlank
        private String name;
        private Long creatorId;
    }
}