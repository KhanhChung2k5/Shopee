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

    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

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

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new IllegalArgumentException("Email đã được sử dụng");
        }
        if (request.phone() != null && userRepository.existsByPhone(request.phone())) {
            throw new IllegalArgumentException("Số điện thoại đã được sử dụng");
        }

        User user = new User("buyer", passwordEncoder.encode(request.password()));
        user.setEmail(request.email());
        user.setPhone(request.phone());
        user.setFullName(request.fullName());
        user = userRepository.save(user);

        String token = jwtService.generateToken(user.getId(), user.getRole(), null);
        return new AuthResponse(token, user.getId(), user.getRole(), user.getFullName(), null);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.emailOrPhone())
                .or(() -> userRepository.findByPhone(request.emailOrPhone()))
                .orElseThrow(() -> new BadCredentialsException("Email/số điện thoại hoặc mật khẩu không đúng"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BadCredentialsException("Email/số điện thoại hoặc mật khẩu không đúng");
        }
        if (!"active".equals(user.getStatus())) {
            throw new BadCredentialsException("Tài khoản đã bị khoá hoặc xoá");
        }

        String department = employeeRepository.findByUserId(user.getId())
                .map(Employee::getDepartment)
                .orElse(null);

        String token = jwtService.generateToken(user.getId(), user.getRole(), department);
        return new AuthResponse(token, user.getId(), user.getRole(), user.getFullName(), department);
    }
}
