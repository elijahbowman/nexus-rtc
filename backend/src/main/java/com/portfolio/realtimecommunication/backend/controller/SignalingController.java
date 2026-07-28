package com.portfolio.realtimecommunication.backend.controller;

import com.portfolio.realtimecommunication.backend.config.RedisConfig;
import com.portfolio.realtimecommunication.backend.model.WebRTCMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@Slf4j
public class SignalingController {

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    // When User A "calls" User B, they send an offer here
    @MessageMapping("/call.offer")
    public void offer(@Payload WebRTCMessage message, Principal principal) {

        log.info("RAW SIGNAL RECEIVED: Type [{}] | Sender [{}] -> Destination Broadcast [/topic/public]",
                message.getType(), principal.getName());

        message.setSender(principal.getName());

        // Publish to the cluster instead of broadcasting to a single node's memory
        redisTemplate.convertAndSend(RedisConfig.REDIS_RTC_COORDINATOR_TOPIC, message);
    }

    // Peer B sends their "Answer" back
    @MessageMapping("/call.answer")
    public void answer(@Payload WebRTCMessage message, Principal principal) {

        log.info("RAW SIGNAL RECEIVED: Type [{}] | Sender [{}] -> Destination Broadcast [/topic/public]",
                message.getType(), principal.getName());

        message.setSender(principal.getName());

        // Publish to the cluster instead of broadcasting to a single node's memory
        redisTemplate.convertAndSend(RedisConfig.REDIS_RTC_COORDINATOR_TOPIC, message);
    }

    // Peers exchange ICE Candidates (Network info)
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

        // Broadcast across all scaled pods via the shared Redis coordinator topic channel!
        redisTemplate.convertAndSend(RedisConfig.REDIS_RTC_COORDINATOR_TOPIC, message);
    }
}