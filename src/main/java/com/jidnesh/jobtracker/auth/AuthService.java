package com.jidnesh.jobtracker.auth;

import com.jidnesh.jobtracker.security.JwtService;
import com.jidnesh.jobtracker.user.User;
import com.jidnesh.jobtracker.user.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;

    public AuthService(UserRepository users, PasswordEncoder encoder, JwtService jwt) {
        this.users = users;
        this.encoder = encoder;
        this.jwt = jwt;
    }

    @Transactional
    public AuthDtos.AuthResponse register(AuthDtos.RegisterRequest req) {
        if (users.existsByEmail(req.email())) {
            throw new IllegalArgumentException("Email already registered");
        }

        User user = new User();
        user.setEmail(req.email());
        user.setPasswordHash(encoder.encode(req.password()));
        users.save(user);

        return new AuthDtos.AuthResponse(
            jwt.issue(user.getId(), user.getEmail()),
            user.getEmail(),
            jwt.getExpirationMs()
        );
    }

    @Transactional(readOnly = true)
    public AuthDtos.AuthResponse login(AuthDtos.LoginRequest req) {
        User user = users.findByEmail(req.email())
            .orElseThrow(() -> new IllegalArgumentException("Invalid email or password"));

        if (!encoder.matches(req.password(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid email or password");
        }

        return new AuthDtos.AuthResponse(
            jwt.issue(user.getId(), user.getEmail()),
            user.getEmail(),
            jwt.getExpirationMs()
        );
    }
}
