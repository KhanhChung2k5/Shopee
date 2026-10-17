package com.chotomua.backend.modules.catalog;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.UUID;

@Service
public class ProductImageStorage {

    private static final Map<String, String> EXTENSIONS = Map.of(
            "image/jpeg", ".jpg",
            "image/png", ".png",
            "image/webp", ".webp",
            "image/gif", ".gif");

    private final Path uploadDirectory;

    public ProductImageStorage(@Value("${app.upload.dir:uploads}") String uploadDirectory) {
        this.uploadDirectory = Path.of(uploadDirectory).toAbsolutePath().normalize();
    }

    public String store(MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Uploaded image is empty.");
        }
        String contentType = file.getContentType();
        String extension = contentType == null ? null : EXTENSIONS.get(contentType);
        if (extension == null) {
            throw new IllegalArgumentException("Only JPEG, PNG, WebP, and GIF images are supported.");
        }
        Files.createDirectories(uploadDirectory);
        String filename = UUID.randomUUID() + extension;
        try (var input = file.getInputStream()) {
            Files.copy(input, uploadDirectory.resolve(filename));
        }
        return "/uploads/" + StringUtils.cleanPath(filename);
    }

    public String resourceLocation() {
        return uploadDirectory.toUri().toString();
    }
}
