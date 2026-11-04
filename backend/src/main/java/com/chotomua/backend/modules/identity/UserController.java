package com.chotomua.backend.modules.identity;

import com.chotomua.backend.modules.identity.dto.ChangePasswordRequest;
import com.chotomua.backend.modules.identity.dto.UserProfileResponse;
import com.chotomua.backend.modules.identity.dto.UserProfileUpdateRequest;
import jakarta.validation.Valid;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** "/me" always resolves to the caller's own account — the id comes from the JWT, never a path param. */
@RestController
@RequestMapping("/users/me")
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserController(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /** Change your own password: the current one must be given, so a borrowed session alone cannot do it. */
    @PostMapping("/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Transactional
    public void changePassword(Authentication authentication, @Valid @RequestBody ChangePasswordRequest request) {
        User user = currentUser(authentication);
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Mật khẩu hiện tại không đúng");
        }
        if (request.currentPassword().equals(request.newPassword())) {
            throw new IllegalArgumentException("Mật khẩu mới phải khác mật khẩu hiện tại");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
    }

    @GetMapping
    @Transactional(readOnly = true)
    public UserProfileResponse me(Authentication authentication) {
        return UserProfileResponse.from(currentUser(authentication));
    }

    @PatchMapping
    @Transactional
    public UserProfileResponse update(Authentication authentication, @Valid @RequestBody UserProfileUpdateRequest request) {
        User user = currentUser(authentication);
        user.setFullName(request.fullName());
        user.setAvatarUrl(request.avatarUrl());
        user.setGender(request.gender());
        user.setDob(request.dob());
        return UserProfileResponse.from(user);
    }

    private User currentUser(Authentication authentication) {
        UUID userId = UUID.fromString((String) authentication.getPrincipal());
        return userRepository.findById(userId)
                .orElseThrow(() -> new NoSuchElementException("Không tìm thấy user"));
    }
}
