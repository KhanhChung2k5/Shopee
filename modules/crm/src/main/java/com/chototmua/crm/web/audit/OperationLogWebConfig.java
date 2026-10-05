package com.chototmua.crm.web.audit;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Gắn bộ ghi nhật ký vào mọi API. */
@Configuration
public class OperationLogWebConfig implements WebMvcConfigurer {

    private final OperationLogInterceptor interceptor;

    public OperationLogWebConfig(OperationLogInterceptor interceptor) {
        this.interceptor = interceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(interceptor).addPathPatterns("/api/**");
    }
}
