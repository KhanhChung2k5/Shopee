package com.chototmua.crm.application.exception;

import java.util.UUID;

/** Địa chỉ không tồn tại hoặc không thuộc khách — REST trả 404. */
public class AddressNotFoundException extends RuntimeException {

    private static final long serialVersionUID = 1L;

    /** Gắn mã địa chỉ vào thông báo lỗi. */
    public AddressNotFoundException(UUID addressId) {
        super("Không tìm thấy địa chỉ: " + addressId);
    }
}
