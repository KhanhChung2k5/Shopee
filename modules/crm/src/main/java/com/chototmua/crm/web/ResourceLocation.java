package com.chototmua.crm.web;

import org.springframework.lang.NonNull;

import java.net.URI;

/**
 * URI tạo mới cho {@code ResponseEntity.created}. {@code URI.create} không trả null,
 * nhưng JDK không mang chú thích null của Spring.
 */
public final class ResourceLocation {

    private ResourceLocation() {
    }

    @NonNull
    @SuppressWarnings("null")
    public static URI of(String path) {
        return URI.create(path);
    }
}
