package com.chototmua.crm.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

/**
 * Nạp {@code .env} từ thư mục chạy hoặc thư mục gốc repo trước khi Spring khởi động.
 */
public final class DotEnvLoader {

    private DotEnvLoader() {
    }

    public static void load() {
        Path dir = Path.of(System.getProperty("user.dir")).toAbsolutePath().normalize();
        for (int i = 0; i < 4 && dir != null; i++) {
            for (String name : List.of(".env", "d41d8cd9.env")) {
                Path file = dir.resolve(name);
                if (Files.isRegularFile(file)) {
                    apply(file);
                    return;
                }
            }
            dir = dir.getParent();
        }
    }

    private static void apply(Path file) {
        try {
            for (String line : Files.readAllLines(file, StandardCharsets.UTF_8)) {
                String trimmed = line.trim();
                if (trimmed.isEmpty() || trimmed.startsWith("#") || !trimmed.contains("=")) {
                    continue;
                }
                int eq = trimmed.indexOf('=');
                String key = trimmed.substring(0, eq).trim();
                String value = unquote(trimmed.substring(eq + 1).trim());
                if (System.getenv(key) == null && System.getProperty(key) == null) {
                    System.setProperty(key, value);
                }
            }
        } catch (IOException ex) {
            throw new IllegalStateException("Không đọc được file môi trường " + file, ex);
        }
    }

    private static String unquote(String value) {
        if (value.length() >= 2
                && ((value.startsWith("\"") && value.endsWith("\""))
                || (value.startsWith("'") && value.endsWith("'")))) {
            return value.substring(1, value.length() - 1);
        }
        return value;
    }
}
