package com.nexusrtc.backend.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WebRTCMessage {
    private String type;      // "OFFER", "ANSWER", or "CANDIDATE"
    private String data;      // The actual SDP string or ICE candidate JSON
    private String sender;
    private String receiver;  // Who is this call for?
}