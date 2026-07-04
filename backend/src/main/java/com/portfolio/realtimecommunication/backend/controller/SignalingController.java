package com.portfolio.realtimecommunication.backend.controller;

import com.portfolio.realtimecommunication.backend.model.WebRTCMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
@Slf4j
public class SignalingController {

    // When User A "calls" User B, they send an offer here
    @MessageMapping("/call.offer")
    @SendTo("/topic/public") // In extended version, we'd send to a specific user
    public WebRTCMessage offer(@Payload WebRTCMessage message, Principal principal) {

        log.info("RAW SIGNAL RECEIVED: Type [{}] | Sender [{}] -> Destination Broadcast [/topic/public]",
                message.getType(), principal.getName());

        message.setSender(principal.getName());
        return message;
    }

    // Peer B sends their "Answer" back
    @MessageMapping("/call.answer")
    @SendTo("/topic/public")
    public WebRTCMessage answer(@Payload WebRTCMessage message, Principal principal) {

        log.info("RAW SIGNAL RECEIVED: Type [{}] | Sender [{}] -> Destination Broadcast [/topic/public]",
                message.getType(), principal.getName());

        message.setSender(principal.getName());
        return message;
    }

    // Peers exchange ICE Candidates (Network info)
    @MessageMapping("/call.candidate")
    @SendTo("/topic/public")
    public WebRTCMessage candidate(@Payload WebRTCMessage message, Principal principal) {

        log.info("RAW SIGNAL RECEIVED: Type [{}] | Sender [{}] -> Destination Broadcast [/topic/public]",
                message.getType(), principal.getName());

        message.setSender(principal.getName());
        return message;
    }
}