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

    // Global pub/sub topic channel string matching our broadcast design
    public static final String REDIS_RTC_COORDINATOR_TOPIC = "nexus-rtc-signaling";
    public static final String REDIS_CHAT_CHANNEL_TOPIC_PREFIX = "app:channel:";
    public static final String REDIS_NOTIFICATIONS_TOPIC = "app-system-notifications";

    @Bean
    public RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        RedisTemplate<String, Object> template = new RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);

        // 1. Construct a custom Jackson serializer equipped for modern Java 8 times
        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();

        // Register the missing JSR310 module mentioned in your stack trace
        mapper.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());

        // Instruct Jackson to write clean ISO-8601 strings instead of messy raw timestamps
        mapper.disable(com.fasterxml.jackson.databind.SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        Jackson2JsonRedisSerializer<Object> jsonSerializer = new Jackson2JsonRedisSerializer<>(mapper, Object.class);

        // 2. Map serialization styles to template scopes
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

        // 1. Intercept the explicit static WebRTC video/audio calling and screensharing traffic
        container.addMessageListener(listenerAdapter, new ChannelTopic(REDIS_RTC_COORDINATOR_TOPIC));

        // 2. Intercept all text chat channel traffic across pods
        container.addMessageListener(listenerAdapter, new PatternTopic(REDIS_CHAT_CHANNEL_TOPIC_PREFIX + "*"));

        // 3. Bind cluster-wide notification channel topic context
        container.addMessageListener(listenerAdapter, new ChannelTopic(REDIS_NOTIFICATIONS_TOPIC));

        log.info("[REDIS-INFRA] Distributed Pub/Sub Listener Container mapped to topics");
        return container;
    }

    @Bean
    public MessageListenerAdapter listenerAdapter(RedisMessageSubscriber subscriber) {
        // Tie incoming Redis payloads straight to the 'receiveMessage' method inside our subscriber
        return new MessageListenerAdapter(subscriber, "receiveMessage");
    }
}
