package com.tripexpanse.tripsync.controller;

import com.tripexpanse.tripsync.dto.UserResponse;
import com.tripexpanse.tripsync.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/users")
public class UserController {

    private final AuthService authService;

    public UserController(AuthService authService) {
        this.authService = authService;
    }

    @GetMapping("/search")
    public ResponseEntity<List<UserResponse>> searchUsers(@RequestParam("email") String email) {
        List<UserResponse> users = authService.searchUsersByEmail(email);
        return ResponseEntity.ok(users);
    }
}
