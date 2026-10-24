package com.nexusrtc.backend.controller;

import com.nexusrtc.backend.service.StorageFacade;
import com.nexusrtc.backend.model.Channel;
import com.nexusrtc.backend.model.ChatMessage;
import com.nexusrtc.backend.repository.ChatMessageRepository;
import com.nexusrtc.backend.service.ChannelService;
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
@CrossOrigin(origins = "*") // KNOWN ISSUE (S12): conflicts with the CORS policy in WebSecurityConfig
@Slf4j
public class ChannelController {

    private final ChannelService channelService;
    private final ChatMessageRepository chatMessageRepository;
    private final StorageFacade storageFacade;

    // Create a channel; the creator is added as a member.
    // KNOWN ISSUE (S1): creatorId comes from the request body, not the JWT.
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

    // List all channels.
    @GetMapping
    public ResponseEntity<List<Channel>> getAllChannels() {
        log.info("REST request to pull all active channel inventories");
        return ResponseEntity.ok(channelService.getAllChannels());
    }

    // List the channels a user belongs to. KNOWN ISSUE (S1): userId is a path parameter, not the caller.
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

    // Join a channel. KNOWN ISSUE (S1): userId is a request parameter, so anyone can add anyone.
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

    // Leave a channel. KNOWN ISSUE (S1): same as join.
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

    // Message history for a channel. KNOWN ISSUE (R4): unpaginated.
    @GetMapping("/{channelId}/messages")
    public ResponseEntity<List<ChatMessage>> getChannelHistory(@PathVariable Long channelId, @RequestParam Long userId) {
        log.info("REST request to fetch conversation history log for channel ID: {} by user ID: {}", channelId, userId);

        // KNOWN ISSUE (S1): this check uses the client-supplied userId, so passing any member's id bypasses it.
        // It must use the authenticated principal instead.
        if (!channelService.isUserMemberOfChannel(channelId, userId)) {
            log.warn("Security Alert: User {} attempted unauthorized history extraction from channel {}", userId, channelId);
            return new ResponseEntity<>(HttpStatus.FORBIDDEN);
        }

        List<ChatMessage> history = chatMessageRepository.findByChannelIdOrderByTimestampAsc(channelId);

        // Presign each attachment (2h expiry). See B7: URLs change on every load and expire in open tabs.
        history.forEach(message -> {
            if (message.getAttachmentPath() != null && !message.getAttachmentPath().isBlank()) {
                try {
                    String secureUrl = storageFacade.getPresignedUrl(message.getAttachmentPath());

                    message.setAttachmentUrl(secureUrl);

                } catch (Exception e) {
                    log.error("Failed to compile pre-signed URL wrapper for message index {}: {}", message.getId(), e.getMessage());
                }
            }
        });

        return ResponseEntity.ok(history);
    }

    // KNOWN ISSUE (S6): no ownership or role check; any authenticated user can delete any channel.
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

    // Request body for channel creation.
    @Data
    public static class ChannelCreationRequest {
        @NotBlank
        private String name;
        private Long creatorId;
    }
}