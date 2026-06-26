package com.portfolio.realtimecommunication.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.portfolio.realtimecommunication.backend.model.User;
import com.portfolio.realtimecommunication.backend.payload.SignupRequest;
import com.portfolio.realtimecommunication.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
public class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @BeforeEach
    public void setup() {
        userRepository.deleteAll();
    }

    @Test
    public void testSuccessfulRegistration() throws Exception {
        SignupRequest request = new SignupRequest();
        request.setUsername("pipeline_user");
        request.setEmail("pipeline@test.com");
        request.setPassword("password123");

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());
    }

    @Test
    public void testDuplicateUsernameRejected() throws Exception {
        // Pre-populate database with a conflicting user
        User existingUser = User.builder()
                .username("conflict_user")
                .email("old@test.com")
                .password("encoded_string")
                .build();
        userRepository.save(existingUser);

        SignupRequest request = new SignupRequest();
        request.setUsername("conflict_user"); // Duplicate name
        request.setEmail("new@test.com");
        request.setPassword("password123");

        mockMvc.perform(post("/api/auth/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest()); // Core architecture security constraint
    }
}