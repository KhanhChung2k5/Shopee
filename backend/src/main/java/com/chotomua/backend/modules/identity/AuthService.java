package com.chotomua.backend.modules.identity;

import com.chotomua.backend.common.security.JwtService;
import com.chotomua.backend.modules.identity.dto.AuthResponse;
import com.chotomua.backend.modules.identity.dto.LoginRequest;
import com.chotomua.backend.modules.identity.dto.RegisterRequest;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    // Repository for User
    private final UserRepository userRepository;
    // Repository for Employee
    private final EmployeeRepository employeeRepository;
    // Password encoder
    private final PasswordEncoder passwordEncoder;
    // JWT service
    private final JwtService jwtService;

    // Constructor for AuthService
    public AuthService(
            UserRepository userRepository,
            EmployeeRepository employeeRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService
    ) {
        this.userRepository = userRepository;
        this.employeeRepository = employeeRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    // Register a new user
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        // Check if the email is already in use
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email đã được sử dụng");
        }
        // Check if the phone is already in use
        if (request.phone() != null && userRepository.existsByPhone(request.phone())) {
            throw new IllegalArgumentException("Số điện thoại đã được sử dụng");
        }
        // Create a new user
        User user = new User("buyer", passwordEncoder.encode(request.password()));
        // Every buyer starts at the lowest loyalty tier (marketing.LoyaltyTier.BRONZE)
        user.setLoyaltyTier("bronze");
        // Set the email
        user.setEmail(request.email());
        // Set the phone
        user.setPhone(request.phone());
        // Set the full name
        user.setFullName(request.fullName());
        // Save the user
        user = userRepository.save(user);
        // Generate a new JWT token
        String token = jwtService.generateToken(user.getId(), user.getRole(), null);
        return new AuthResponse(token, user.getId(), user.getRole(), user.getFullName(), null);
    }

    // Login a user
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        // Find the user by email or phone
        User user = userRepository.findByEmail(request.emailOrPhone())
                .or(() -> userRepository.findByPhone(request.emailOrPhone()))
                .orElseThrow(() -> new BadCredentialsException("Email/số điện thoại hoặc mật khẩu không đúng"));

        // Check if the password is correct
        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Email/số điện thoại hoặc mật khẩu không đúng");
        }
        // Check if the user is active
        if (!"active".equals(user.getStatus())) {
            throw new BadCredentialsException("Tài khoản đã bị khoá hoặc xoá");
        }

        // Find the department of the user
        String department = employeeRepository.findByUserId(user.getId())
                .map(Employee::getDepartment)
                .orElse(null);

        // Generate a new JWT token
        String token = jwtService.generateToken(user.getId(), user.getRole(), department);
        return new AuthResponse(token, user.getId(), user.getRole(), user.getFullName(), department);
    }
}
