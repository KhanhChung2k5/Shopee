package com.chototmua.crm.application.audit;

import com.chototmua.crm.domain.audit.OperationLog;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/** Ghi một dòng nhật ký. Lỗi kho không được làm hỏng thao tác gốc. */
@Component
public class OperationLogRecorder {

    private static final Logger log = LoggerFactory.getLogger(OperationLogRecorder.class);

    private final OperationLogStore store;

    public OperationLogRecorder(OperationLogStore store) {
        this.store = store;
    }

    public void record(OperationLog entry) {
        try {
            store.append(entry);
        } catch (RuntimeException ex) {
            log.warn("Không ghi được nhật ký thao tác: {}", ex.getMessage());
        }
    }
}
