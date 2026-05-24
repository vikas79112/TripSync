package com.tripexpanse.tripsync.repository;

import com.tripexpanse.tripsync.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmail(String email);
    List<User> findByEmailContainingIgnoreCase(String email);
    boolean existsByEmail(String email);
}
