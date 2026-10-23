package com.chotomua.backend.modules.crm.web.audit;

import com.chotomua.backend.modules.crm.application.audit.OperationLogRecorder;
import com.chotomua.backend.modules.crm.domain.audit.OperationLog;
import com.chotomua.backend.modules.crm.port.ActorDirectory;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** Real accounts are logged by email + full name (not UUID); demo accounts keep their fixed labels. */
class OperationLogInterceptorActorTest {

    private final List<OperationLog> recorded = new ArrayList<>();
    private final OperationLogRecorder recorder = new OperationLogRecorder(null) {
        @Override
        public void record(OperationLog entry) {
            recorded.add(entry);
        }
    };

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void realStaffAccountIsLoggedByEmailAndFullName() {
        UUID minh = UUID.fromString("7a2f0c1e-5b6d-4e8f-9a0b-1c2d3e4f5a6b");
        ActorDirectory directory = id -> minh.equals(id)
                ? Optional.of(new ActorDirectory.Actor("cs@chototmua.local", "Minh"))
                : Optional.empty();

        callAs(minh.toString(), "DEPT_CS", directory);

        assertThat(recorded).singleElement().satisfies(log -> {
            assertThat(log.actorId()).isEqualTo(minh);
            assertThat(log.actorLogin()).isEqualTo("cs@chototmua.local");
            assertThat(log.actorLabel()).isEqualTo("Minh");
            assertThat(log.department()).isEqualTo("cs");
        });
    }

    @Test
    void unknownAccountFallsBackToDemoLabels() {
        callAs("33333333-3333-3333-3333-333333333333", "DEPT_CS", id -> Optional.empty());

        assertThat(recorded).singleElement().satisfies(log -> {
            assertThat(log.actorLogin()).isEqualTo("cs");
            assertThat(log.actorLabel()).isEqualTo("CSKH");
        });
    }

    private void callAs(String principal, String department, ActorDirectory directory) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                principal, null,
                List.of(new SimpleGrantedAuthority("ROLE_STAFF"), new SimpleGrantedAuthority(department))));
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/customers");
        MockHttpServletResponse response = new MockHttpServletResponse();
        response.setStatus(201);
        new OperationLogInterceptor(recorder, directory).afterCompletion(request, response, new Object(), null);
    }
}
