package com.chotomua.backend.modules.identity.dto;

/** Shown once to the staff member who issued it: only its hash is stored. */
public record TemporaryPasswordResponse(String temporaryPassword) {
}
