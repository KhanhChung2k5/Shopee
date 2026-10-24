package com.chotomua.backend.modules.catalog;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;

/**
 * Stores product images in the Supabase Storage bucket when SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
 * are configured (backend/.env), and returns the bucket's public URL. Without them (tests, offline dev)
 * it falls back to the local {@code uploads/} folder served under {@code /uploads/**}.
 */
@Service
public class ProductImageStorage {

    private static final Map<String, String> EXTENSIONS = Map.of(
            "image/jpeg", ".jpg",
            "image/png", ".png",
            "image/webp", ".webp",
            "image/gif", ".gif");

    private final Path uploadDirectory;
    private final String supabaseUrl;
    private final String serviceRoleKey;
    private final String bucket;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    public ProductImageStorage(@Value("${app.upload.dir:uploads}") String uploadDirectory,
                               @Value("${SUPABASE_URL:}") String supabaseUrl,
                               @Value("${SUPABASE_SERVICE_ROLE_KEY:}") String serviceRoleKey,
                               @Value("${SUPABASE_BUCKET:CNPM}") String bucket) {
        this.uploadDirectory = Path.of(uploadDirectory).toAbsolutePath().normalize();
        this.supabaseUrl = supabaseUrl.replaceAll("/+$", "");
        this.serviceRoleKey = serviceRoleKey;
        this.bucket = bucket;
    }

    public String store(MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Ảnh tải lên bị rỗng.");
        }
        String contentType = file.getContentType();
        String extension = contentType == null ? null : EXTENSIONS.get(contentType);
        if (extension == null) {
            throw new IllegalArgumentException("Chỉ hỗ trợ ảnh JPEG, PNG, WebP và GIF.");
        }
        String filename = UUID.randomUUID() + extension;
        if (usesSupabase()) {
            return uploadToBucket("products/uploads/" + filename, contentType, file.getBytes());
        }
        Files.createDirectories(uploadDirectory);
        try (var input = file.getInputStream()) {
            Files.copy(input, uploadDirectory.resolve(filename));
        }
        return "/uploads/" + StringUtils.cleanPath(filename);
    }

    public String resourceLocation() {
        return uploadDirectory.toUri().toString();
    }

    private boolean usesSupabase() {
        return StringUtils.hasText(supabaseUrl) && StringUtils.hasText(serviceRoleKey);
    }

    private String uploadToBucket(String objectPath, String contentType, byte[] bytes) throws IOException {
        HttpRequest request = HttpRequest.newBuilder(URI.create(supabaseUrl + "/storage/v1/object/" + bucket + "/" + objectPath))
                .timeout(Duration.ofSeconds(60))
                .header("Authorization", "Bearer " + serviceRoleKey)
                .header("apikey", serviceRoleKey)
                .header("Content-Type", contentType)
                .header("Cache-Control", "max-age=31536000")
                .POST(HttpRequest.BodyPublishers.ofByteArray(bytes))
                .build();
        HttpResponse<String> response;
        try {
            response = http.send(request, HttpResponse.BodyHandlers.ofString());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("Image upload interrupted", e);
        }
        if (response.statusCode() / 100 != 2) {
            throw new IOException("Supabase Storage upload failed (HTTP " + response.statusCode() + "): " + response.body());
        }
        return supabaseUrl + "/storage/v1/object/public/" + bucket + "/" + objectPath;
    }
}
