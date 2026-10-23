package com.nexusrtc.backend.config;

import com.nexusrtc.backend.security.JwtUtils;
import com.nexusrtc.backend.service.UserDetailsServiceImpl;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
@Slf4j
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private UserDetailsServiceImpl userDetailsService;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Destinations handled by the in-memory broker (topics and queues).
        config.enableSimpleBroker("/topic", "/queue");
        // Client SEND frames with this prefix go to @MessageMapping controllers.
        config.setApplicationDestinationPrefixes("/app");
        // Prefix for user destinations (/user/...). Not used yet: notifications go to
        // /queue/notifications/{username}, which any client can subscribe to (S4).
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOrigins(
                        "http://localhost",
                        "http://nexus-rtc.localhost"
                ); // Match React URLs
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new ChannelInterceptor() {
            @Override
            public Message<?> preSend(Message<?> message, MessageChannel channel) {
                StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

                // KNOWN ISSUE (S5): a CONNECT with a missing or invalid token is still accepted as an anonymous
                // session. It should be rejected by throwing here.
                // KNOWN ISSUE (S4): SUBSCRIBE and SEND frames are never authorized, and clients can SEND straight to
                // broker destinations (/topic/...), bypassing the controllers entirely.
                if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                    String authHeader = accessor.getFirstNativeHeader("Authorization");
                    if (authHeader != null && authHeader.startsWith("Bearer ")) {
                        String token = authHeader.substring(7);
                        if (jwtUtils.validateJwtToken(token)) {
                            String username = jwtUtils.getUserNameFromJwtToken(token);

                            log.info("WebSocket Interceptor: Processing CONNECT frame for user: {}", username);

                            UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                            UsernamePasswordAuthenticationToken auth =
                                    new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());

                            // Set the user into the WebSocket session
                            accessor.setUser(auth);

                            log.info("JWT Cryptographically Verified. Mapping session to Principal: {}", username);
                        }
                    }
                }
                return message;
            }
        });
    }

}