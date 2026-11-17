package com.chototmua.crm.application.survey;

import com.chototmua.crm.application.exception.CustomerNotFoundException;
import com.chototmua.crm.application.exception.InvalidSurveyException;
import com.chototmua.crm.application.exception.SegmentNotFoundException;
import com.chototmua.crm.application.exception.SurveyNotFoundException;
import com.chototmua.crm.application.notification.NotificationStore;
import com.chototmua.crm.application.segment.SegmentStore;
import com.chototmua.crm.domain.notification.AppNotification;
import com.chototmua.crm.domain.segment.SegmentMember;
import com.chototmua.crm.domain.survey.Survey;
import com.chototmua.crm.domain.survey.SurveyAnswer;
import com.chototmua.crm.domain.survey.SurveyQuestion;
import com.chototmua.crm.domain.survey.SurveySubmission;
import com.chototmua.crm.port.IdentityPort;
import com.chototmua.crm.port.OrderPort;
import com.chototmua.crm.port.dto.CustomerStatus;
import com.chototmua.crm.port.dto.CustomerView;
import com.chototmua.crm.web.dto.CustomerSurveyAnswerResponse;
import com.chototmua.crm.web.dto.CustomerSurveySheetResponse;
import com.chototmua.crm.web.dto.SkippedRecipientResponse;
import com.chototmua.crm.web.dto.SubmitSurveyAnswerRequest;
import com.chototmua.crm.web.dto.SurveyAnswerBucketResponse;
import com.chototmua.crm.web.dto.SurveyListResponse;
import com.chototmua.crm.web.dto.SurveyQuestionResponse;
import com.chototmua.crm.web.dto.SurveyQuestionStatsResponse;
import com.chototmua.crm.web.dto.SurveyResponse;
import com.chototmua.crm.web.dto.SurveySendResponse;
import com.chototmua.crm.web.dto.SurveyStatsResponse;
import com.chototmua.crm.web.dto.SurveySubmissionResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Tạo, gửi và nhận khảo sát trong ứng dụng. Không gửi thư điện tử.
 * Khách chỉ nộp khi đã nhận thư và tài khoản còn {@code active}.
 */
@Service
public class SurveyService {

    private final IdentityPort identity;
    private final OrderPort orders;
    private final SurveyStore surveys;
    private final SegmentStore segments;
    private final NotificationStore notifications;
    private final Clock clock;

    @Autowired
    public SurveyService(
            IdentityPort identity,
            OrderPort orders,
            SurveyStore surveys,
            SegmentStore segments,
            NotificationStore notifications
    ) {
        this(identity, orders, surveys, segments, notifications, Clock.systemDefaultZone());
    }

    /** Kiểm thử gắn đồng hồ khi ghi thời điểm gửi/nộp. */
    SurveyService(
            IdentityPort identity,
            OrderPort orders,
            SurveyStore surveys,
            SegmentStore segments,
            NotificationStore notifications,
            Clock clock
    ) {
        this.identity = identity;
        this.orders = orders;
        this.surveys = surveys;
        this.segments = segments;
        this.notifications = notifications;
        this.clock = clock;
    }

    /** Danh sách phiếu cho nhân viên CRM. */
    public SurveyListResponse list(UUID actorId) {
        identity.requireCrmStaff(actorId);
        List<SurveyResponse> rows = surveys.findAll().stream().map(this::toResponse).toList();
        return new SurveyListResponse(rows);
    }

    /** Chi tiết một phiếu kèm câu hỏi và đối tượng. */
    public SurveyResponse get(UUID actorId, UUID surveyId) {
        identity.requireCrmStaff(actorId);
        return toResponse(require(surveyId));
    }

    /** Tạo phiếu nháp; có thể gắn phân khúc đối tượng sẵn. */
    public SurveyResponse create(UUID actorId, String title, String description, List<UUID> segmentIds) {
        identity.requireCrmStaff(actorId);
        Survey survey = new Survey(
                UUID.randomUUID(),
                actorId,
                cleanTitle(title),
                cleanDescription(description),
                Survey.DRAFT,
                Instant.now(clock));
        surveys.save(survey, List.of());
        surveys.saveAudience(survey.id(), cleanAudience(segmentIds));
        return toResponse(survey);
    }

    /** Sửa tiêu đề, mô tả, đối tượng. Phiếu đã gửi thì cập nhật nội dung thư đã có. */
    public SurveyResponse update(UUID actorId, UUID surveyId, String title, String description, List<UUID> segmentIds) {
        identity.requireCrmStaff(actorId);
        Survey current = require(surveyId);
        if (Survey.CLOSED.equals(current.status())) {
            throw new InvalidSurveyException("Phiếu đã lưu trữ, không sửa được.");
        }
        Survey updated = new Survey(
                current.id(),
                current.createdByEmployeeId(),
                cleanTitle(title),
                cleanDescription(description),
                current.status(),
                current.createdAt());
        surveys.save(updated, surveys.questionsOf(surveyId));
        if (segmentIds != null) {
            surveys.saveAudience(surveyId, cleanAudience(segmentIds));
        }
        if (Survey.SENT.equals(updated.status())) {
            notifications.collapseRecipients("survey", surveyId);
            notifications.updateContent("survey", surveyId, inboxContent(updated));
        }
        return toResponse(updated);
    }

    /** Xóa phiếu nháp hoặc đã gửi. Phiếu lưu trữ giữ lại. Thư khảo sát trong hòm thư khách bị gỡ theo. */
    public void delete(UUID actorId, UUID surveyId) {
        identity.requireCrmStaff(actorId);
        Survey current = require(surveyId);
        if (Survey.CLOSED.equals(current.status())) {
            throw new InvalidSurveyException("Phiếu đã lưu trữ không xóa được.");
        }
        notifications.deleteByReference("survey", surveyId);
        surveys.delete(surveyId);
    }

    /** Đưa phiếu vào kho lưu trữ. Giữ câu hỏi, không cho sửa nữa. */
    public SurveyResponse archive(UUID actorId, UUID surveyId) {
        identity.requireCrmStaff(actorId);
        Survey current = require(surveyId);
        if (Survey.CLOSED.equals(current.status())) {
            return toResponse(current);
        }
        Survey archived = new Survey(
                current.id(),
                current.createdByEmployeeId(),
                current.title(),
                current.description(),
                Survey.CLOSED,
                current.createdAt());
        surveys.save(archived, surveys.questionsOf(surveyId));
        return toResponse(archived);
    }

    /**
     * Đưa khảo sát vào hòm thư in-app của khách đang hoạt động trong phân khúc.
     * Không tạo chiến dịch.
     */
    public SurveySendResponse sendToInbox(UUID actorId, UUID surveyId, List<UUID> segmentIds) {
        identity.requireCrmStaff(actorId);
        Survey current = require(surveyId);
        if (Survey.CLOSED.equals(current.status())) {
            throw new InvalidSurveyException("Phiếu đã lưu trữ, không gửi vào hòm thư.");
        }
        if (segmentIds == null || segmentIds.isEmpty()) {
            throw new InvalidSurveyException("Chọn ít nhất một đối tượng.");
        }
        Set<UUID> unique = new LinkedHashSet<>(segmentIds);
        for (UUID segmentId : unique) {
            if (segments.find(segmentId).isEmpty()) {
                throw new SegmentNotFoundException(segmentId);
            }
        }
        Map<UUID, CustomerView> people = new LinkedHashMap<>();
        for (UUID segmentId : unique) {
            for (SegmentMember member : segments.membersOf(segmentId)) {
                if (people.containsKey(member.userId())) {
                    continue;
                }
                try {
                    people.put(member.userId(), identity.getCustomer(member.userId()));
                } catch (CustomerNotFoundException ignored) {
                    // Thành viên không còn trên cổng danh tính — bỏ qua.
                }
            }
        }
        Instant now = Instant.now(clock);
        String content = inboxContent(current);
        notifications.collapseRecipients("survey", surveyId);
        Set<UUID> already = notifications.recipientIds("survey", surveyId);
        List<AppNotification> created = new ArrayList<>();
        List<SkippedRecipientResponse> skipped = new ArrayList<>();
        int overwritten = 0;
        for (CustomerView customer : people.values()) {
            if (!CustomerStatus.ACTIVE.equals(customer.status())) {
                skipped.add(new SkippedRecipientResponse(customer.id(), customer.fullName(), customer.status()));
                continue;
            }
            if (already.contains(customer.id())) {
                overwritten++;
                continue;
            }
            created.add(new AppNotification(
                    UUID.randomUUID(),
                    customer.id(),
                    "survey",
                    surveyId,
                    "in_app",
                    content,
                    "sent",
                    now));
        }
        if (created.isEmpty() && overwritten == 0) {
            throw new InvalidSurveyException("Không có khách đang hoạt động trong đối tượng đã chọn.");
        }
        if (overwritten > 0) {
            notifications.updateContent("survey", surveyId, content);
        }
        if (!created.isEmpty()) {
            notifications.append(created);
        }
        Survey sent = new Survey(
                current.id(),
                current.createdByEmployeeId(),
                current.title(),
                current.description(),
                Survey.SENT,
                current.createdAt());
        surveys.save(sent, surveys.questionsOf(surveyId));
        surveys.saveAudience(surveyId, List.copyOf(unique));
        return new SurveySendResponse(toResponse(sent), created.size() + overwritten, List.copyOf(skipped));
    }

    /**
     * Phiếu để khách đọc và trả lời. Chỉ khách đã nhận thư, tài khoản còn hoạt động.
     */
    public CustomerSurveySheetResponse sheet(UUID userId, UUID surveyId) {
        CustomerView customer = identity.getCustomer(userId);
        if (!CustomerStatus.ACTIVE.equals(customer.status())) {
            throw new InvalidSurveyException("Tài khoản đang khóa hoặc đã xóa, không trả lời khảo sát được.");
        }
        Survey survey = require(surveyId);
        if (Survey.DRAFT.equals(survey.status())) {
            throw new InvalidSurveyException("Khảo sát chưa gửi hoặc đã lưu trữ.");
        }
        SurveySubmission existing = surveys.findSubmission(surveyId, userId).orElse(null);
        if (existing == null && !invited(userId, surveyId)) {
            throw new InvalidSurveyException("Bạn không nằm trong danh sách nhận khảo sát này.");
        }
        List<CustomerSurveyAnswerResponse> answers = existing == null
                ? List.of()
                : existing.answers().stream()
                        .map(answer -> new CustomerSurveyAnswerResponse(answer.questionId(), answer.answerText()))
                        .toList();
        List<SurveyQuestionResponse> questions = surveys.questionsOf(surveyId).stream()
                .map(question -> new SurveyQuestionResponse(
                        question.id(),
                        question.questionText(),
                        question.answerType(),
                        question.options(),
                        question.sortOrder()))
                .toList();
        return new CustomerSurveySheetResponse(
                survey.id(),
                survey.title(),
                survey.description(),
                survey.status(),
                existing != null,
                questions,
                answers);
    }

    /**
     * Khách nộp phiếu đã nhận qua thông báo in-app.
     * Mỗi khách một lần. {@code orderId} chỉ nhận khi đơn thuộc đúng khách.
     */
    public SurveySubmissionResponse submit(
            UUID userId,
            UUID surveyId,
            UUID orderId,
            List<SubmitSurveyAnswerRequest> answers
    ) {
        CustomerView customer = identity.getCustomer(userId);
        if (!CustomerStatus.ACTIVE.equals(customer.status())) {
            throw new InvalidSurveyException("Tài khoản đang khóa hoặc đã xóa, không trả lời khảo sát được.");
        }
        Survey survey = require(surveyId);
        if (!Survey.SENT.equals(survey.status())) {
            throw new InvalidSurveyException("Khảo sát chưa gửi hoặc đã lưu trữ.");
        }
        if (!invited(userId, surveyId)) {
            throw new InvalidSurveyException("Bạn không nằm trong danh sách nhận khảo sát này.");
        }
        if (surveys.findSubmission(surveyId, userId).isPresent()) {
            throw new InvalidSurveyException("Bạn đã gửi khảo sát này.");
        }
        if (orderId != null && !orders.existsOrder(userId, orderId)) {
            throw new InvalidSurveyException("Không tìm thấy đơn hàng để gắn khảo sát.");
        }
        UUID responseId = UUID.randomUUID();
        List<SurveyAnswer> storedAnswers = buildAnswers(responseId, surveys.questionsOf(surveyId), answers);
        SurveySubmission submission = new SurveySubmission(
                responseId,
                surveyId,
                userId,
                orderId,
                Instant.now(clock),
                storedAnswers);
        surveys.saveSubmission(submission);
        return new SurveySubmissionResponse(
                submission.id(),
                submission.surveyId(),
                submission.userId(),
                submission.orderId(),
                submission.submittedAt());
    }

    /** Tỷ lệ hoàn thành = số phiếu nộp / số thư mời đã gửi. */
    public SurveyStatsResponse stats(UUID actorId, UUID surveyId) {
        identity.requireCrmStaff(actorId);
        require(surveyId);
        int invited = notifications.countStatus("survey", surveyId, "sent")
                + notifications.countStatus("survey", surveyId, "read");
        List<SurveySubmission> submissions = surveys.submissionsOf(surveyId);
        int submitted = submissions.size();
        int percent = invited == 0 ? 0 : submitted * 100 / invited;
        List<SurveyQuestion> questions = surveys.questionsOf(surveyId);
        List<SurveyQuestionStatsResponse> rows = new ArrayList<>();
        for (SurveyQuestion question : questions) {
            rows.add(questionStats(question, submissions));
        }
        return new SurveyStatsResponse(surveyId, invited, submitted, percent, rows);
    }

    /** Khách đã nhận thư mời khảo sát này và thư còn sent/read. */
    private boolean invited(UUID userId, UUID surveyId) {
        return notifications.findByUser(userId).stream().anyMatch(note ->
                "survey".equals(note.referenceType())
                        && surveyId.equals(note.referenceId())
                        && ("sent".equals(note.status()) || "read".equals(note.status())));
    }

    /** Đủ câu, không trùng, đúng loại (rating / trắc nghiệm / tự luận). */
    private static List<SurveyAnswer> buildAnswers(
            UUID responseId,
            List<SurveyQuestion> questions,
            List<SubmitSurveyAnswerRequest> answers
    ) {
        if (answers == null) {
            throw new InvalidSurveyException("Cần trả lời đủ các câu hỏi.");
        }
        Map<UUID, String> byQuestion = new LinkedHashMap<>();
        for (SubmitSurveyAnswerRequest answer : answers) {
            if (answer.questionId() == null || answer.answerText() == null || answer.answerText().isBlank()) {
                throw new InvalidSurveyException("Mỗi câu cần nội dung trả lời.");
            }
            if (byQuestion.containsKey(answer.questionId())) {
                throw new InvalidSurveyException("Mỗi câu chỉ trả lời một lần.");
            }
            byQuestion.put(answer.questionId(), answer.answerText().trim());
        }
        if (byQuestion.size() != questions.size()) {
            throw new InvalidSurveyException("Cần trả lời đủ các câu hỏi.");
        }
        List<SurveyAnswer> stored = new ArrayList<>();
        for (SurveyQuestion question : questions) {
            String text = byQuestion.remove(question.id());
            if (text == null) {
                throw new InvalidSurveyException("Cần trả lời đủ các câu hỏi.");
            }
            stored.add(new SurveyAnswer(UUID.randomUUID(), responseId, question.id(), checkAnswer(question, text)));
        }
        if (!byQuestion.isEmpty()) {
            throw new InvalidSurveyException("Có câu trả lời không thuộc khảo sát này.");
        }
        return stored;
    }

    /** Kiểm tra một câu trả lời theo {@code answerType}. */
    private static String checkAnswer(SurveyQuestion question, String text) {
        if (SurveyQuestion.RATING.equals(question.answerType())) {
            if (!text.matches("[1-5]")) {
                throw new InvalidSurveyException("Điểm đánh giá phải từ 1 đến 5.");
            }
            return text;
        }
        if (SurveyQuestion.MULTIPLE_CHOICE.equals(question.answerType())) {
            if (!question.options().contains(text)) {
                throw new InvalidSurveyException("Lựa chọn không nằm trong danh sách.");
            }
            return text;
        }
        if (text.length() > 2000) {
            throw new InvalidSurveyException("Câu trả lời tối đa 2000 ký tự.");
        }
        return text;
    }

    /** Phân bố lựa chọn hoặc danh sách câu tự luận cho một câu hỏi. */
    private static SurveyQuestionStatsResponse questionStats(SurveyQuestion question, List<SurveySubmission> submissions) {
        List<String> texts = new ArrayList<>();
        for (SurveySubmission submission : submissions) {
            for (SurveyAnswer answer : submission.answers()) {
                if (question.id().equals(answer.questionId())) {
                    texts.add(answer.answerText());
                }
            }
        }
        if (SurveyQuestion.TEXT.equals(question.answerType())) {
            return new SurveyQuestionStatsResponse(
                    question.id(),
                    question.questionText(),
                    question.answerType(),
                    texts.size(),
                    List.of(),
                    List.copyOf(texts));
        }
        Map<String, Integer> counts = new LinkedHashMap<>();
        if (SurveyQuestion.RATING.equals(question.answerType())) {
            for (int score = 1; score <= 5; score++) {
                counts.put(Integer.toString(score), 0);
            }
        } else {
            for (String option : question.options()) {
                counts.put(option, 0);
            }
        }
        for (String text : texts) {
            counts.merge(text, 1, Integer::sum);
        }
        List<SurveyAnswerBucketResponse> buckets = counts.entrySet().stream()
                .map(entry -> new SurveyAnswerBucketResponse(entry.getKey(), entry.getValue()))
                .toList();
        return new SurveyQuestionStatsResponse(
                question.id(),
                question.questionText(),
                question.answerType(),
                texts.size(),
                buckets,
                List.of());
    }

    /** Nội dung thư hộp thư: tiêu đề — mô tả, cắt 500 ký tự. */
    private static String inboxContent(Survey survey) {
        String title = survey.title() == null ? "Khảo sát" : survey.title().trim();
        String description = survey.description() == null ? "" : survey.description().trim();
        String content = description.isEmpty() ? title : title + " — " + description;
        return content.length() > 500 ? content.substring(0, 500) : content;
    }

    /** Thêm câu hỏi khi phiếu còn nháp. */
    public SurveyResponse addQuestion(
            UUID actorId,
            UUID surveyId,
            String questionText,
            String answerType,
            List<String> options,
            Integer sortOrder
    ) {
        identity.requireCrmStaff(actorId);
        requireDraft(surveyId);
        List<SurveyQuestion> existing = new ArrayList<>(surveys.questionsOf(surveyId));
        int order = sortOrder == null ? nextOrder(existing) : sortOrder;
        SurveyQuestion question = new SurveyQuestion(
                UUID.randomUUID(),
                surveyId,
                cleanQuestion(questionText),
                normalizeType(answerType),
                normalizeOptions(answerType, options),
                order);
        existing.add(question);
        surveys.save(require(surveyId), existing);
        return toResponse(require(surveyId));
    }

    /** Sửa câu hỏi khi phiếu còn nháp. */
    public SurveyResponse updateQuestion(
            UUID actorId,
            UUID surveyId,
            UUID questionId,
            String questionText,
            String answerType,
            List<String> options,
            Integer sortOrder
    ) {
        identity.requireCrmStaff(actorId);
        requireDraft(surveyId);
        List<SurveyQuestion> existing = new ArrayList<>(surveys.questionsOf(surveyId));
        int index = indexOf(existing, questionId);
        SurveyQuestion current = existing.get(index);
        int order = sortOrder == null ? current.sortOrder() : sortOrder;
        existing.set(index, new SurveyQuestion(
                current.id(),
                surveyId,
                cleanQuestion(questionText),
                normalizeType(answerType),
                normalizeOptions(answerType, options),
                order));
        surveys.save(require(surveyId), existing);
        return toResponse(require(surveyId));
    }

    /** Xóa câu hỏi khi phiếu còn nháp. */
    public SurveyResponse deleteQuestion(UUID actorId, UUID surveyId, UUID questionId) {
        identity.requireCrmStaff(actorId);
        requireDraft(surveyId);
        List<SurveyQuestion> existing = new ArrayList<>(surveys.questionsOf(surveyId));
        int index = indexOf(existing, questionId);
        existing.remove(index);
        surveys.save(require(surveyId), existing);
        return toResponse(require(surveyId));
    }

    /** Phiếu tồn tại hoặc 404. */
    private Survey require(UUID surveyId) {
        return surveys.find(surveyId).orElseThrow(() -> new SurveyNotFoundException(surveyId));
    }

    /** Chỉ thao tác câu hỏi khi trạng thái {@code draft}. */
    private Survey requireDraft(UUID surveyId) {
        Survey survey = require(surveyId);
        if (!Survey.DRAFT.equals(survey.status())) {
            throw new InvalidSurveyException("Chỉ sửa khảo sát khi trạng thái là bản nháp.");
        }
        return survey;
    }

    /** Vị trí câu hỏi trong danh sách hoặc 404. */
    private static int indexOf(List<SurveyQuestion> questions, UUID questionId) {
        for (int i = 0; i < questions.size(); i++) {
            if (questions.get(i).id().equals(questionId)) {
                return i;
            }
        }
        throw new SurveyNotFoundException("Không tìm thấy câu hỏi: " + questionId);
    }

    /** {@code sortOrder} tiếp theo = max hiện có + 1. */
    private static int nextOrder(List<SurveyQuestion> questions) {
        int max = 0;
        for (SurveyQuestion question : questions) {
            max = Math.max(max, question.sortOrder());
        }
        return max + 1;
    }

    /** Tiêu đề bắt buộc, tối đa 255 ký tự. */
    private static String cleanTitle(String title) {
        if (title == null || title.isBlank()) {
            throw new InvalidSurveyException("Tiêu đề khảo sát không được để trống.");
        }
        String trimmed = title.trim();
        if (trimmed.length() > 255) {
            throw new InvalidSurveyException("Tiêu đề khảo sát tối đa 255 ký tự.");
        }
        return trimmed;
    }

    /** Loại trùng và kiểm tra phân khúc còn tồn tại. */
    private List<UUID> cleanAudience(List<UUID> segmentIds) {
        if (segmentIds == null || segmentIds.isEmpty()) {
            return List.of();
        }
        Set<UUID> unique = new LinkedHashSet<>(segmentIds);
        for (UUID segmentId : unique) {
            if (segments.find(segmentId).isEmpty()) {
                throw new SegmentNotFoundException(segmentId);
            }
        }
        return List.copyOf(unique);
    }

    /** Mô tả tùy chọn; trống thì {@code null}. */
    private static String cleanDescription(String description) {
        if (description == null || description.isBlank()) {
            return null;
        }
        return description.trim();
    }

    /** Nội dung câu hỏi bắt buộc. */
    private static String cleanQuestion(String questionText) {
        if (questionText == null || questionText.isBlank()) {
            throw new InvalidSurveyException("Nội dung câu hỏi không được để trống.");
        }
        return questionText.trim();
    }

    /** Chuẩn hóa {@code text} / {@code rating} / {@code multiple_choice}. */
    private static String normalizeType(String answerType) {
        if (answerType == null || answerType.isBlank()) {
            throw new InvalidSurveyException("Loại câu trả lời phải là text, rating hoặc multiple_choice.");
        }
        String normalized = answerType.trim().toLowerCase(Locale.ROOT);
        if (!SurveyQuestion.TEXT.equals(normalized)
                && !SurveyQuestion.RATING.equals(normalized)
                && !SurveyQuestion.MULTIPLE_CHOICE.equals(normalized)) {
            throw new InvalidSurveyException("Loại câu trả lời phải là text, rating hoặc multiple_choice.");
        }
        return normalized;
    }

    /** Trắc nghiệm cần ≥ 2 lựa chọn; loại khác không được có options. */
    private static List<String> normalizeOptions(String answerType, List<String> options) {
        String type = normalizeType(answerType);
        List<String> cleaned = cleanOptions(options);
        if (SurveyQuestion.MULTIPLE_CHOICE.equals(type)) {
            if (cleaned.size() < 2) {
                throw new InvalidSurveyException("Câu trắc nghiệm cần ít nhất hai lựa chọn.");
            }
            return cleaned;
        }
        if (!cleaned.isEmpty()) {
            throw new InvalidSurveyException("Chỉ câu trắc nghiệm mới có lựa chọn.");
        }
        return List.of();
    }

    /** Cắt khoảng trắng, loại trùng, không chấp nhận lựa chọn trống. */
    private static List<String> cleanOptions(List<String> options) {
        if (options == null || options.isEmpty()) {
            return List.of();
        }
        Set<String> unique = new LinkedHashSet<>();
        for (String option : options) {
            if (option == null || option.isBlank()) {
                throw new InvalidSurveyException("Lựa chọn không được để trống.");
            }
            unique.add(option.trim());
        }
        return List.copyOf(unique);
    }

    /** DTO phiếu: câu hỏi + danh sách phân khúc đối tượng. */
    private SurveyResponse toResponse(Survey survey) {
        List<SurveyQuestionResponse> questions = surveys.questionsOf(survey.id()).stream()
                .map(question -> new SurveyQuestionResponse(
                        question.id(),
                        question.questionText(),
                        question.answerType(),
                        question.options(),
                        question.sortOrder()))
                .toList();
        return new SurveyResponse(
                survey.id(),
                survey.createdByEmployeeId(),
                survey.title(),
                survey.description(),
                survey.status(),
                survey.createdAt(),
                questions,
                surveys.audienceOf(survey.id()));
    }
}
