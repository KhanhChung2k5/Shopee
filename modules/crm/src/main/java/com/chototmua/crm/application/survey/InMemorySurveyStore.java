package com.chototmua.crm.application.survey;

import com.chototmua.crm.application.exception.InvalidSurveyException;
import com.chototmua.crm.application.exception.SurveyNotFoundException;
import com.chototmua.crm.domain.survey.Survey;
import com.chototmua.crm.domain.survey.SurveyQuestion;
import com.chototmua.crm.domain.survey.SurveySubmission;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/** Kho khảo sát trong bộ nhớ. Không viết SQL mới. */
@Component
@Profile("crm-fake")
public class InMemorySurveyStore implements SurveyStore {

    private final Map<UUID, Survey> surveys = new LinkedHashMap<>();
    private final Map<UUID, List<SurveyQuestion>> questions = new LinkedHashMap<>();
    private final Map<UUID, List<UUID>> audience = new LinkedHashMap<>();
    private final Map<String, SurveySubmission> submissions = new LinkedHashMap<>();

    /** Xóa hết phiếu — dùng giữa các bài kiểm thử. */
    public synchronized void clear() {
        surveys.clear();
        questions.clear();
        audience.clear();
        submissions.clear();
    }

    @Override
    public synchronized void save(Survey survey, List<SurveyQuestion> surveyQuestions) {
        surveys.put(survey.id(), survey);
        questions.put(survey.id(), List.copyOf(surveyQuestions));
    }

    @Override
    public synchronized void saveAudience(UUID surveyId, List<UUID> segmentIds) {
        if (!surveys.containsKey(surveyId)) {
            throw new SurveyNotFoundException(surveyId);
        }
        audience.put(surveyId, List.copyOf(segmentIds == null ? List.of() : segmentIds));
    }

    @Override
    public synchronized List<UUID> audienceOf(UUID surveyId) {
        return List.copyOf(audience.getOrDefault(surveyId, List.of()));
    }

    @Override
    public synchronized Optional<Survey> find(UUID id) {
        return Optional.ofNullable(surveys.get(id));
    }

    @Override
    public synchronized List<Survey> findAll() {
        List<Survey> rows = new ArrayList<>(surveys.values());
        rows.sort(Comparator.comparing(Survey::createdAt).reversed());
        return List.copyOf(rows);
    }

    @Override
    public synchronized List<SurveyQuestion> questionsOf(UUID surveyId) {
        List<SurveyQuestion> rows = new ArrayList<>(questions.getOrDefault(surveyId, List.of()));
        rows.sort(Comparator.comparingInt(SurveyQuestion::sortOrder));
        return List.copyOf(rows);
    }

    @Override
    public synchronized void saveSubmission(SurveySubmission submission) {
        String key = key(submission.surveyId(), submission.userId());
        if (submissions.containsKey(key)) {
            throw new InvalidSurveyException("Bạn đã gửi khảo sát này.");
        }
        submissions.put(key, submission);
    }

    @Override
    public synchronized Optional<SurveySubmission> findSubmission(UUID surveyId, UUID userId) {
        return Optional.ofNullable(submissions.get(key(surveyId, userId)));
    }

    @Override
    public synchronized List<SurveySubmission> submissionsOf(UUID surveyId) {
        return submissions.values().stream()
                .filter(row -> row.surveyId().equals(surveyId))
                .toList();
    }

    @Override
    public synchronized void delete(UUID id) {
        surveys.remove(id);
        questions.remove(id);
        audience.remove(id);
        submissions.entrySet().removeIf(entry -> entry.getValue().surveyId().equals(id));
    }

    /** Khóa bài nộp: {@code surveyId:userId}. */
    private static String key(UUID surveyId, UUID userId) {
        return surveyId + ":" + userId;
    }
}
