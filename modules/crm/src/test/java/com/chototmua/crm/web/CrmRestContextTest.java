package com.chototmua.crm.web;

import com.chototmua.crm.CrmApplication;
import com.chototmua.crm.port.IdentityPort;
import com.chototmua.crm.port.OrderPort;
import com.chototmua.crm.port.ProductPort;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Kiểm tra ngữ cảnh Spring REST: nạp được ba cổng và điểm kiểm tra sống. */
@SpringBootTest(classes = CrmApplication.class)
@AutoConfigureMockMvc
@ActiveProfiles("crm-fake")
class CrmRestContextTest {

    @Autowired
    private ApplicationContext context;

    @Autowired
    private MockMvc mockMvc;

    @Test
    void contextExposesThreePorts() {
        assertThat(context.getBean(IdentityPort.class)).isNotNull();
        assertThat(context.getBean(ProductPort.class)).isNotNull();
        assertThat(context.getBean(OrderPort.class)).isNotNull();
    }

    @Test
    void healthEndpointReturnsOk() throws Exception {
        mockMvc.perform(get("/api/crm/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.module").value("crm"))
                .andExpect(jsonPath("$.status").value("up"));
    }
}
