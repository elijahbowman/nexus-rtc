package com.portfolio.realtimecommunication.backend.repository;

import com.portfolio.realtimecommunication.backend.model.ChannelMember;
import com.portfolio.realtimecommunication.backend.model.ChannelMemberId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ChannelMemberRepository extends JpaRepository<ChannelMember, ChannelMemberId> {

    // SIDEBAR LIST LOADING: High-utility query to fetch all channels a specific user populates
    @Query("SELECT cm.channel FROM ChannelMember cm WHERE cm.id.userId = :userId")
    List<com.portfolio.realtimecommunication.backend.model.Channel> findChannelsByUserId(@Param("userId") Long userId);

    // Room Roster lookup: Fetches all members currently joined to a specific chat room
    List<ChannelMember> findById_ChannelId(Long channelId);

    // Access Authorization Gate: Confirms if a specific user has permission to read/write to a room
    boolean existsById_ChannelIdAndId_UserId(Long channelId, Long userId);
}