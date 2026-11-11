package com.chototmua.crm.application.survey;

import com.chototmua.crm.domain.survey.Survey;
import com.chototmua.crm.domain.survey.SurveyQuestion;
import com.chototmua.crm.domain.survey.SurveySubmission;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/** Kho khảo sát: bảng {@code surveys} khi chạy PostgreSQL, bộ nhớ khi kiểm thử. */
public interface SurveyStore {

    /** Ghi phiếu và thay toàn bộ câu hỏi. */
    void save(Survey survey, List<SurveyQuestion> questions);

    /** Ghi danh sách phân khúc đối tượng. */
    void saveAudience(UUID surveyId, List<UUID> segmentIds);

    List<UUID> audienceOf(UUID surveyId);

    Optional<Survey> find(UUID id);

    List<Survey> findAll();

    List<SurveyQuestion> questionsOf(UUID surveyId);

    /** Lưu phiếu trả lời; mỗi khách mỗi khảo sát một lần. */
    void saveSubmission(SurveySubmission submission);

    Optional<SurveySubmission> findSubmission(UUID surveyId, UUID userId);

    List<SurveySubmission> submissionsOf(UUID surveyId);

    /** Xóa phiếu, câu hỏi, đối tượng và bài nộp. */
    void delete(UUID id);
}
