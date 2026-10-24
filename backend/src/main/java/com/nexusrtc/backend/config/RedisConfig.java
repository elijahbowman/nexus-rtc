package com.nexusrtc.backend.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.PatternTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.data.redis.listener.adapter.MessageListenerAdapter;
import org.springframework.data.redis.serializer.Jackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.StringRedisSerializer;

@Configuration
@Slf4j
public class RedisConfig {

    // Redis pub/sub topics.
    public static final String REDIS_RTC_COORDINATOR_TOPIC = "nexus-rtc-signaling";
    public static final String REDIS_CHAT_CHANNEL_TOPIC_PREFIX = "app:channel:";
    public static final String REDIS_NOTIFICATIONS_TOPIC = "app-system-notifications";

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);

        // Jackson serializer with Java time support.
        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();

        // JSR-310 module for LocalDateTime.
        mapper.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());

        // Write dates as ISO-8601 strings rather than numeric timestamps.
        mapper.disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        Jackson2JsonRedisSerializer<Object> jsonSerializer = new Jackson2JsonRedisSerializer<>(mapper, Object.class);

        // String keys, JSON values.
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(jsonSerializer);
        template.setHashKeySerializer(new StringRedisSerializer());
        template.setHashValueSerializer(jsonSerializer);

        log.info("[REDIS-INFRA] Serializer templates successfully established with Java 8 Time Module support.");
        return template;
    }

    @Bean
    public RedisMessageListenerContainer container(RedisConnectionFactory connectionFactory,
                                                   MessageListenerAdapter listenerAdapter) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);

        // WebRTC signaling topic.
        container.addMessageListener(listenerAdapter, new ChannelTopic(REDIS_RTC_COORDINATOR_TOPIC));

        // All chat channels. Pattern subscription: every pod receives every channel's messages.
        container.addMessageListener(listenerAdapter, new PatternTopic(REDIS_CHAT_CHANNEL_TOPIC_PREFIX + "*"));

        // Notifications topic. Every pod receives every notification.
        container.addMessageListener(listenerAdapter, new ChannelTopic(REDIS_NOTIFICATIONS_TOPIC));

        log.info("[REDIS-INFRA] Distributed Pub/Sub Listener Container mapped to topics");
        return container;
    }

    @Bean
    public MessageListenerAdapter listenerAdapter(RedisMessageSubscriber subscriber) {
        // Delegates to RedisMessageSubscriber.receiveMessage(String). The Redis channel name is dropped
        // here, which is why the subscriber has to route by payload shape (R6).
        return new MessageListenerAdapter(subscriber, "receiveMessage");
    }
}
