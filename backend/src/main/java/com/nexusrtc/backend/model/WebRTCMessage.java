package com.nexusrtc.backend.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class WebRTCMessage {
    private String type;      // "OFFER", "ANSWER", "CANDIDATE" or "HANGUP"
    private String data;      // The actual SDP string or ICE candidate JSON
    private String sender;
    private String receiver;  // Intended recipient. KNOWN ISSUE (C1): not used for routing yet
}