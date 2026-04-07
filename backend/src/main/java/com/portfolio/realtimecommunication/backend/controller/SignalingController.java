package com.portfolio.realtimecommunication.backend.controller;

import com.portfolio.realtimecommunication.backend.model.WebRTCMessage;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Controller
public class SignalingController {

    // When User A "calls" User B, they send an offer here
    @MessageMapping("/call.offer")
    @SendTo("/topic/public") // In extended version, we'd send to a specific user
    public WebRTCMessage offer(@Payload WebRTCMessage message, Principal principal) {
        message.setSender(principal.getName());
        return message;
    }

    // Peer B sends their "Answer" back
    @MessageMapping("/call.answer")
    @SendTo("/topic/public")
    public WebRTCMessage answer(@Payload WebRTCMessage message, Principal principal) {
        message.setSender(principal.getName());
        return message;
    }

    // Peers exchange ICE Candidates (Network info)
    @MessageMapping("/call.candidate")
    @SendTo("/topic/public")
    public WebRTCMessage candidate(@Payload WebRTCMessage message, Principal principal) {
        message.setSender(principal.getName());
        return message;
    }
}