package com.nexusrtc.backend.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.io.Serializable;

@Embeddable
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ChannelMemberId implements Serializable {

    @Column(name = "channel_id")
    private Long channelId;

    @Column(name = "user_id")
    private Long userId;
}