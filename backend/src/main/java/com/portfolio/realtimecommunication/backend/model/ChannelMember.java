package com.portfolio.realtimecommunication.backend.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;

@Entity
@Table(name = "channel_members")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChannelMember {

    @EmbeddedId
    private ChannelMemberId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("channelId") // Maps this relationship straight to the embedded key property
    @JoinColumn(name = "channel_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private Channel channel;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("userId") // Maps this relationship straight to the embedded key property
    @JoinColumn(name = "user_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE) // Protects member mapping lookups on user deletion
    private User user;

    @Column(name = "joined_at", nullable = false, updatable = false)
    @Builder.Default
    private LocalDateTime joinedAt = LocalDateTime.now();
}