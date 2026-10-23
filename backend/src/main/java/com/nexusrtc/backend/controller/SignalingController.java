package com.nexusrtc.backend.controller;

import com.nexusrtc.backend.model.WebRTCMessage;
import com.nexusrtc.backend.config.RedisConfig;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@Slf4j
public class SignalingController {

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    // KNOWN ISSUE (C1, C3, C4): every signal (offer, answer, candidate, hangup) goes to one Redis topic and
    // is delivered to /topic/public, so every connected user receives every call's SDP and ICE candidates.
    // Fix: route with convertAndSendToUser(receiver, ...) and include a call id.
    // KNOWN ISSUE (S5): principal is null for unauthenticated sessions, so these handlers throw an NPE.

    // Caller sends an SDP offer.
    @MessageMapping("/call.offer")
    public void offer(@Payload WebRTCMessage message, Principal principal) {

        log.info("RAW SIGNAL RECEIVED: Type [{}] | Sender [{}] -> Destination Broadcast [/topic/public]",
                message.getType(), principal.getName());

        message.setSender(principal.getName());

        // Publish via Redis so the signal reaches users connected to other pods.
        redisTemplate.convertAndSend(RedisConfig.REDIS_RTC_COORDINATOR_TOPIC, message);
    }

    // Callee sends an SDP answer.
    @MessageMapping("/call.answer")
    public void answer(@Payload WebRTCMessage message, Principal principal) {

        log.info("RAW SIGNAL RECEIVED: Type [{}] | Sender [{}] -> Destination Broadcast [/topic/public]",
                message.getType(), principal.getName());

        message.setSender(principal.getName());

        // Publish via Redis so the signal reaches users connected to other pods.
        redisTemplate.convertAndSend(RedisConfig.REDIS_RTC_COORDINATOR_TOPIC, message);
    }

    // Both peers send ICE candidates.
    @MessageMapping("/call.candidate")
    public void candidate(@Payload WebRTCMessage message, Principal principal) {

        log.info("RAW SIGNAL RECEIVED: Type [{}] | Sender [{}] -> Destination Broadcast [/topic/public]",
                message.getType(), principal.getName());

        message.setSender(principal.getName());

        redisTemplate.convertAndSend(RedisConfig.REDIS_RTC_COORDINATOR_TOPIC, message);
    }

    @MessageMapping("/call.hangup")
    public void hangup(@Payload WebRTCMessage message, Principal principal) {
        log.info("[SIGNAL-HUB] Processing Distributed HANGUP frame out to cluster from: {}", principal.getName());
        message.setSender(principal.getName());
        message.setType("HANGUP");

        // KNOWN ISSUE (C3): broadcast to everyone, so every client in a call ends it on any HANGUP.
        redisTemplate.convertAndSend(RedisConfig.REDIS_RTC_COORDINATOR_TOPIC, message);
    }
}