package com.tripexpanse.tripsync.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Value("${app.allowed-origins:*}")
    private String allowedOrigins;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry config) {
        // Enable a simple memory-based message broker to send messages back to the client
        // on destinations prefixed with "/topic" or "/queue"
        config.enableSimpleBroker("/topic", "/queue");
        
        // Designate the "/app" prefix for messages that are bound for methods annotated with @MessageMapping
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Register the "/ws-connect" endpoint, enabling SockJS fallback options
        // so that clients can connect even if WebSockets are blocked
        var registration = registry.addEndpoint("/ws-connect");
        
        if (allowedOrigins != null && !allowedOrigins.trim().isEmpty() && !allowedOrigins.equals("*")) {
            registration.setAllowedOrigins(allowedOrigins.split(","));
        } else {
            registration.setAllowedOriginPatterns("*");
        }
        
        registration.withSockJS();
    }
}
