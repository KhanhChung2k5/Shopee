package com.chototmua.crm.adapter.jdbc;

import com.chototmua.crm.application.exception.InvalidSurveyException;
import com.chototmua.crm.application.exception.SurveyNotFoundException;
import com.chototmua.crm.application.survey.SurveyDescriptionText;
import com.chototmua.crm.application.survey.SurveyQuestionText;
import com.chototmua.crm.application.survey.SurveyStore;
import com.chototmua.crm.domain.survey.Survey;
import com.chototmua.crm.domain.survey.SurveyAnswer;
import com.chototmua.crm.domain.survey.SurveyQuestion;
import com.chototmua.crm.domain.survey.SurveySubmission;
import org.springframework.context.annotation.Profile;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Khảo sát trên {@code surveys} / {@code survey_questions}.
 * Lựa chọn trắc nghiệm nằm trong {@code question_text} vì schema không có bảng option.
 */
@Component
@Profile("crm-db")
public class JdbcSurveyStore implements SurveyStore {

    private final JdbcTemplate jdbc;

    public JdbcSurveyStore(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    @Transactional
    public void save(Survey survey, List<SurveyQuestion> questions) {
        String stored = SurveyDescriptionText.encode(survey.description(), audienceOf(survey.id()));
        jdbc.update("""
                INSERT INTO surveys (id, created_by_employee_id, title, description, status, created_at)
                VALUES (?, ?, ?, ?, ?, ?)
                ON CONFLICT (id) DO UPDATE SET
                    title = EXCLUDED.title,
                    description = EXCLUDED.description,
                    status = EXCLUDED.status
                """,
                survey.id(),
                employeeId(survey.createdByEmployeeId()),
                survey.title(),
                stored,
                survey.status(),
                Timestamp.from(survey.createdAt()));
        replaceQuestions(survey.id(), questions);
    }

    @Override
    public void saveAudience(UUID surveyId, List<UUID> segmentIds) {
        SurveyDescriptionText.Decoded current = SurveyDescriptionText.decode(readRawDescription(surveyId));
        String stored = SurveyDescriptionText.encode(current.description(), segmentIds);
        int updated = jdbc.update("UPDATE surveys SET description = ? WHERE id = ?", stored, surveyId);
        if (updated == 0) {
            throw new SurveyNotFoundException(surveyId);
        }
    }

    @Override
    public List<UUID> audienceOf(UUID surveyId) {
        return SurveyDescriptionText.decode(readRawDescription(surveyId)).segmentIds();
    }

    /**
     * Ghi câu hỏi mà không xóa câu còn giữ, để câu trả lời đã nộp không mất khóa ngoại.
     */
    private void replaceQuestions(UUID surveyId, List<SurveyQuestion> questions) {
        if (questions.isEmpty()) {
            jdbc.update("""
                    DELETE FROM survey_answers
                    WHERE question_id IN (SELECT id FROM survey_questions WHERE survey_id = ?)
                    """, surveyId);
            jdbc.update("DELETE FROM survey_questions WHERE survey_id = ?", surveyId);
            return;
        }
        for (SurveyQuestion question : questions) {
            jdbc.update("""
                    INSERT INTO survey_questions (id, survey_id, question_text, answer_type, sort_order)
                    VALUES (?, ?, ?, ?, ?)
                    ON CONFLICT (id) DO UPDATE SET
                        survey_id = EXCLUDED.survey_id,
                        question_text = EXCLUDED.question_text,
                        answer_type = EXCLUDED.answer_type,
                        sort_order = EXCLUDED.sort_order
                    """,
                    question.id(),
                    question.surveyId(),
                    SurveyQuestionText.encode(question.questionText(), question.answerType(), question.options()),
                    question.answerType(),
                    question.sortOrder());
        }
        String placeholders = "?,".repeat(questions.size());
        placeholders = placeholders.substring(0, placeholders.length() - 1);
        Object[] args = new Object[questions.size() + 1];
        args[0] = surveyId;
        for (int i = 0; i < questions.size(); i++) {
            args[i + 1] = questions.get(i).id();
        }
        jdbc.update("""
                DELETE FROM survey_answers
                WHERE question_id IN (
                    SELECT id FROM survey_questions
                    WHERE survey_id = ? AND id NOT IN (%s)
                )
                """.formatted(placeholders), args);
        jdbc.update("""
                DELETE FROM survey_questions
                WHERE survey_id = ? AND id NOT IN (%s)
                """.formatted(placeholders), args);
    }

    @Override
    public Optional<Survey> find(UUID id) {
        List<Survey> rows = jdbc.query("""
                SELECT id, created_by_employee_id, title, description, status, created_at
                FROM surveys
                WHERE id = ?
                """, (rs, rowNum) -> mapSurvey(rs.getObject("id", UUID.class),
                rs.getObject("created_by_employee_id", UUID.class),
                rs.getString("title"),
                rs.getString("description"),
                rs.getString("status"),
                rs.getTimestamp("created_at")), id);
        return rows.stream().findFirst();
    }

    @Override
    public List<Survey> findAll() {
        return jdbc.query("""
                SELECT id, created_by_employee_id, title, description, status, created_at
                FROM surveys
                ORDER BY created_at DESC
                """, (rs, rowNum) -> mapSurvey(rs.getObject("id", UUID.class),
                rs.getObject("created_by_employee_id", UUID.class),
                rs.getString("title"),
                rs.getString("description"),
                rs.getString("status"),
                rs.getTimestamp("created_at")));
    }

    @Override
    public List<SurveyQuestion> questionsOf(UUID surveyId) {
        return jdbc.query("""
                SELECT id, survey_id, question_text, answer_type, sort_order
                FROM survey_questions
                WHERE survey_id = ?
                ORDER BY sort_order
                """, (rs, rowNum) -> {
            String answerType = rs.getString("answer_type");
            SurveyQuestionText.Decoded decoded = SurveyQuestionText.decode(rs.getString("question_text"), answerType);
            return new SurveyQuestion(
                    rs.getObject("id", UUID.class),
                    rs.getObject("survey_id", UUID.class),
                    decoded.questionText(),
                    answerType,
                    decoded.options(),
                    rs.getInt("sort_order"));
        }, surveyId);
    }

    @Override
    @Transactional
    public void saveSubmission(SurveySubmission submission) {
        try {
            jdbc.update("""
                    INSERT INTO survey_responses (id, survey_id, user_id, order_id, submitted_at)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    submission.id(),
                    submission.surveyId(),
                    submission.userId(),
                    submission.orderId(),
                    Timestamp.from(submission.submittedAt()));
        } catch (DataIntegrityViolationException ex) {
            throw new InvalidSurveyException("Bạn đã gửi khảo sát này.");
        }
        for (SurveyAnswer answer : submission.answers()) {
            jdbc.update("""
                    INSERT INTO survey_answers (id, response_id, question_id, answer_text)
                    VALUES (?, ?, ?, ?)
                    """,
                    answer.id(),
                    answer.responseId(),
                    answer.questionId(),
                    answer.answerText());
        }
    }

    @Override
    public Optional<SurveySubmission> findSubmission(UUID surveyId, UUID userId) {
        List<SurveySubmission> rows = loadHeaders("""
                SELECT id, survey_id, user_id, order_id, submitted_at
                FROM survey_responses
                WHERE survey_id = ? AND user_id = ?
                """, surveyId, userId);
        return rows.stream().findFirst().map(this::withAnswers);
    }

    @Override
    public List<SurveySubmission> submissionsOf(UUID surveyId) {
        return loadHeaders("""
                SELECT id, survey_id, user_id, order_id, submitted_at
                FROM survey_responses
                WHERE survey_id = ?
                ORDER BY submitted_at
                """, surveyId).stream().map(this::withAnswers).toList();
    }

    @Override
    @Transactional
    public void delete(UUID id) {
        jdbc.update("""
                DELETE FROM survey_answers
                WHERE question_id IN (SELECT id FROM survey_questions WHERE survey_id = ?)
                   OR response_id IN (SELECT id FROM survey_responses WHERE survey_id = ?)
                """, id, id);
        jdbc.update("DELETE FROM surveys WHERE id = ?", id);
    }

    private UUID employeeId(UUID actorOrEmployee) {
        List<UUID> rows = jdbc.query("""
                SELECT id FROM employees
                WHERE id = ? OR user_id = ?
                """, (rs, rowNum) -> rs.getObject("id", UUID.class), actorOrEmployee, actorOrEmployee);
        if (rows.isEmpty()) {
            throw new InvalidSurveyException("Không tìm thấy nhân viên tạo khảo sát.");
        }
        return rows.get(0);
    }

    private List<SurveySubmission> loadHeaders(String sql, Object... args) {
        return jdbc.query(sql, (rs, rowNum) -> {
            Timestamp submittedAt = rs.getTimestamp("submitted_at");
            Instant submitted = submittedAt == null ? Instant.EPOCH : submittedAt.toInstant();
            return new SurveySubmission(
                    rs.getObject("id", UUID.class),
                    rs.getObject("survey_id", UUID.class),
                    rs.getObject("user_id", UUID.class),
                    rs.getObject("order_id", UUID.class),
                    submitted,
                    List.of());
        }, args);
    }

    private SurveySubmission withAnswers(SurveySubmission header) {
        List<SurveyAnswer> answers = jdbc.query("""
                SELECT id, response_id, question_id, answer_text
                FROM survey_answers
                WHERE response_id = ?
                """, (rs, rowNum) -> new SurveyAnswer(
                rs.getObject("id", UUID.class),
                rs.getObject("response_id", UUID.class),
                rs.getObject("question_id", UUID.class),
                rs.getString("answer_text")), header.id());
        return new SurveySubmission(
                header.id(),
                header.surveyId(),
                header.userId(),
                header.orderId(),
                header.submittedAt(),
                answers);
    }

    private String readRawDescription(UUID id) {
        List<String> rows = jdbc.query(
                "SELECT description FROM surveys WHERE id = ?",
                (rs, rowNum) -> rs.getString("description"),
                id);
        return rows.isEmpty() ? null : rows.get(0);
    }

    private static Survey mapSurvey(
            UUID id,
            UUID createdBy,
            String title,
            String description,
            String status,
            Timestamp createdAt
    ) {
        Instant created = createdAt == null ? Instant.EPOCH : createdAt.toInstant();
        SurveyDescriptionText.Decoded decoded = SurveyDescriptionText.decode(description);
        return new Survey(id, createdBy, title, decoded.description(), status, created);
    }
}
