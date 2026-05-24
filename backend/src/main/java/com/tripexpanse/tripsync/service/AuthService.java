package com.tripexpanse.tripsync.service;

import com.tripexpanse.tripsync.dto.AuthResponse;
import com.tripexpanse.tripsync.dto.LoginRequest;
import com.tripexpanse.tripsync.dto.RegisterRequest;
import com.tripexpanse.tripsync.dto.UserResponse;
import com.tripexpanse.tripsync.entity.User;
import com.tripexpanse.tripsync.exception.ApiException;
import com.tripexpanse.tripsync.repository.UserRepository;
import com.tripexpanse.tripsync.security.CustomUserDetails;
import com.tripexpanse.tripsync.security.JwtUtil;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final AuthenticationManager authenticationManager;

    public AuthService(UserRepository userRepository, PasswordEncoder passwordEncoder, JwtUtil jwtUtil, AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;
        this.authenticationManager = authenticationManager;
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new ApiException("Email is already registered!");
        }

        String avatarUrl = request.getAvatarUrl();
        if (avatarUrl == null || avatarUrl.trim().isEmpty()) {
            // Generate standard generic avatar from initial of the name
            avatarUrl = "https://api.dicebear.com/7.x/initials/svg?seed=" + request.getName();
        }

        User user = new User(
                request.getEmail(),
                passwordEncoder.encode(request.getPassword()),
                request.getName(),
                avatarUrl
        );

        User savedUser = userRepository.save(user);
        CustomUserDetails userDetails = new CustomUserDetails(savedUser);
        String token = jwtUtil.generateToken(userDetails);

        return new AuthResponse(token, new UserResponse(savedUser));
    }

    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getEmail(),
                        request.getPassword()
                )
        );

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        String token = jwtUtil.generateToken(userDetails);
        
        UserResponse userResponse = new UserResponse(
                userDetails.getId(),
                userDetails.getUsername(), // email is mapped to username in CustomUserDetails
                userDetails.getName(),
                userDetails.getAvatarUrl()
        );
        
        return new AuthResponse(token, userResponse);
    }

    @Transactional(readOnly = true)
    public List<UserResponse> searchUsersByEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            return List.of();
        }
        return userRepository.findByEmailContainingIgnoreCase(email)
                .stream()
                .map(UserResponse::new)
                .collect(Collectors.toList());
    }
}
