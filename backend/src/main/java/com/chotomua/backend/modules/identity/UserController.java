package com.chotomua.backend.modules.identity;

import com.chotomua.backend.modules.identity.dto.UserProfileResponse;
import com.chotomua.backend.modules.identity.dto.UserProfileUpdateRequest;
import jakarta.validation.Valid;
import java.util.NoSuchElementException;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** "/me" always resolves to the caller's own account — the id comes from the JWT, never a path param. */
@RestController
@RequestMapping("/users/me")
public class UserController {

    private final UserRepository userRepository;

    public UserController(UserRepository userRepository) {
        this.userRepository = userRepository;
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
