package com.chotomua.backend.modules.identity;

import java.security.SecureRandom;

/** Random passwords staff hand to a customer who cannot log in. They meet the same rules as a chosen password. */
final class TemporaryPasswords {

    private static final SecureRandom RANDOM = new SecureRandom();
    private static final String LETTERS = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ";
    private static final String DIGITS = "23456789";
    private static final String ALL = LETTERS + DIGITS;
    private static final int LENGTH = 12;

    private TemporaryPasswords() {
    }

    static String generate() {
        char[] password = new char[LENGTH];
        for (int i = 0; i < LENGTH; i++) {
            password[i] = pick(ALL);
        }
        int letterAt = RANDOM.nextInt(LENGTH);
        int digitAt = (letterAt + 1 + RANDOM.nextInt(LENGTH - 1)) % LENGTH;
        password[letterAt] = pick(LETTERS);
        password[digitAt] = pick(DIGITS);
        return new String(password);
    }

    private static char pick(String from) {
        return from.charAt(RANDOM.nextInt(from.length()));
    }
}
