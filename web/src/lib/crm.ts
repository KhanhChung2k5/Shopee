import { apiFetch } from './api'

/** Types + calls for the CRM module (backend modules/crm). Shapes mirror its web/dto records. */

export type RfmSegment = 'champions' | 'loyal' | 'potential' | 'at_risk' | 'lost' | 'other'

export const RFM_LABEL: Record<string, string> = {
  champions: 'Champions',
  loyal: 'Trung thành',
  potential: 'Tiềm năng',
  at_risk: 'Có nguy cơ rời bỏ',
  lost: 'Đã rời bỏ',
  other: 'Khác',
}

export const RFM_TONE: Record<string, 'success' | 'info' | 'primary' | 'danger' | 'neutral'> = {
  champions: 'success',
  loyal: 'info',
  potential: 'primary',
  at_risk: 'danger',
  lost: 'neutral',
  other: 'neutral',
}

export const AGE_BUCKETS = ['UNDER_18', '18–24', '25–34', '35–44', '45+'] as const
export const AGE_LABEL: Record<string, string> = { UNDER_18: 'Dưới 18', '18–24': '18–24', '25–34': '25–34', '35–44': '35–44', '45+': '45+', UNKNOWN: 'Không rõ' }

// ---------------------------------------------------------------- reports / profiles
export interface ReportBucket { bucket: string; label: string; count: number; percent: number }
export interface ReportCustomer {
  customerId: string
  fullName: string | null
  age: string
  ageLabel: string
  gender: string
  genderLabel: string
  ltv: number
  totalOrders: number
  rfmSegment: string | null
}
export interface CustomerReport {
  totalCustomers: number
  age: ReportBucket[]
  gender: ReportBucket[]
  interests: { categoryId: string | null; categoryName: string; count: number; percent: number }[]
  /** Game genres from delivered game discs. */
  genres: ReportBucket[]
  customers: ReportCustomer[]
}
export interface CustomerProfile {
  userId: string
  fullName: string | null
  status: string
  ltv: number
  totalOrders: number
  rfmSegment: string | null
  lastPurchaseAt: string | null
  calculatedAt: string | null
}

export const fetchCustomerReport = (token: string) => apiFetch<CustomerReport>('/api/crm/reports/customers', {}, token)
export const recalculateProfile = (token: string, userId: string) =>
  apiFetch<CustomerProfile>(`/api/crm/profiles/${userId}/recalculate`, { method: 'POST' }, token)

// ---------------------------------------------------------------- segments
export interface SegmentMember { userId: string; fullName: string | null; status: string; addedAt: string }
export interface Segment {
  id: string
  name: string
  ruleDefinition: Record<string, unknown>
  memberCount: number
  members: SegmentMember[]
  createdAt: string
  locked: boolean
}

export const fetchSegments = (token: string) => apiFetch<{ segments: Segment[] }>('/api/segments', {}, token)
export const createSegment = (token: string, name: string, ruleDefinition: Record<string, unknown>) =>
  apiFetch<Segment>('/api/segments', { method: 'POST', body: JSON.stringify({ name, ruleDefinition }) }, token)
export const deleteSegment = (token: string, id: string) => apiFetch<void>(`/api/segments/${id}`, { method: 'DELETE' }, token)
export const refreshSegment = (token: string, id: string) => apiFetch<Segment>(`/api/segments/${id}/refresh`, { method: 'POST' }, token)

export function describeRule(rule: Record<string, unknown>): string {
  const presets = (Array.isArray(rule.presets) ? rule.presets : [rule.preset]).filter(Boolean) as string[]
  const parts: string[] = []
  if (presets.includes('age')) {
    const buckets = (Array.isArray(rule.buckets) ? rule.buckets : [rule.bucket]).filter(Boolean) as string[]
    parts.push(`Tuổi: ${buckets.map((b) => AGE_LABEL[b] ?? b).join(', ') || 'tất cả'}`)
  }
  if (presets.includes('rfm')) {
    const segs = (Array.isArray(rule.segments) ? rule.segments : [rule.segment ?? rule.rfmSegment]).filter(Boolean) as string[]
    parts.push(`RFM: ${segs.map((s) => RFM_LABEL[s] ?? s).join(', ') || 'tất cả'}`)
  }
  if (presets.includes('category')) {
    const names = (Array.isArray(rule.categoryNames) ? rule.categoryNames : [rule.categoryName]).filter(Boolean) as string[]
    parts.push(`Ngành hàng: ${names.join(', ') || 'đã chọn'}`)
  }
  return parts.join(' · ') || 'Không rõ'
}

// ---------------------------------------------------------------- campaigns
export interface Campaign {
  id: string
  name: string
  channel: string
  startAt: string | null
  endAt: string | null
  segmentIds: string[]
  referenceType: string | null
  referenceId: string | null
  sentCount: number
  readCount: number
  skipped: { userId: string; fullName: string | null; status: string }[]
  content: string | null
  deliveryStatus: string
}
export interface CampaignFunnel {
  campaignId: string
  name: string
  convertible: boolean
  targeted: number
  sent: number
  converted: number
  conversionRate: number
  stages: ReportBucket[]
}

export const fetchCampaigns = (token: string) => apiFetch<{ campaigns: Campaign[] }>('/api/campaigns', {}, token)
export const createCampaign = (token: string, body: { name: string; segmentIds: string[]; content: string; surveyId?: string }) =>
  apiFetch<Campaign>('/api/campaigns', { method: 'POST', body: JSON.stringify(body) }, token)
export const deleteCampaign = (token: string, id: string) => apiFetch<void>(`/api/campaigns/${id}`, { method: 'DELETE' }, token)
export const fetchCampaignFunnel = (token: string, id: string) =>
  apiFetch<CampaignFunnel>(`/api/crm/reports/campaigns/${id}/funnel`, {}, token)

// ---------------------------------------------------------------- surveys
export type AnswerType = 'text' | 'rating' | 'multiple_choice'
export const ANSWER_TYPE_LABEL: Record<AnswerType, string> = { text: 'Trả lời tự do', rating: 'Chấm điểm 1–5', multiple_choice: 'Chọn một đáp án' }
export interface SurveyQuestion { id: string; questionText: string; answerType: AnswerType; options: string[] | null; sortOrder: number }
export interface Survey {
  id: string
  title: string
  description: string | null
  status: string
  createdAt: string
  questions: SurveyQuestion[]
  segmentIds: string[]
}
export interface SurveyStats {
  surveyId: string
  invitedCount: number
  submittedCount: number
  completionPercent: number
  questions: { questionId: string; questionText: string; answerType: AnswerType; answerCount: number; buckets: { value: string; count: number }[]; texts: string[] }[]
}
export interface SurveySheet {
  id: string
  title: string
  description: string | null
  status: string
  submitted: boolean
  questions: SurveyQuestion[]
  answers: { questionId: string; answerText: string }[]
}

export const SURVEY_STATUS_LABEL: Record<string, string> = { draft: 'Nháp', sent: 'Đã gửi', archived: 'Lưu trữ' }

export const fetchSurveys = (token: string) => apiFetch<{ surveys: Survey[] }>('/api/surveys', {}, token)
export const createSurvey = (token: string, title: string, description: string) =>
  apiFetch<Survey>('/api/surveys', { method: 'POST', body: JSON.stringify({ title, description, segmentIds: [] }) }, token)
export const deleteSurvey = (token: string, id: string) => apiFetch<void>(`/api/surveys/${id}`, { method: 'DELETE' }, token)
export const archiveSurvey = (token: string, id: string) => apiFetch<Survey>(`/api/surveys/${id}/archive`, { method: 'POST' }, token)
export const addSurveyQuestion = (token: string, id: string, q: { questionText: string; answerType: AnswerType; options: string[] }) =>
  apiFetch<Survey>(`/api/surveys/${id}/questions`, { method: 'POST', body: JSON.stringify(q) }, token)
export const deleteSurveyQuestion = (token: string, id: string, questionId: string) =>
  apiFetch<Survey>(`/api/surveys/${id}/questions/${questionId}`, { method: 'DELETE' }, token)
export const sendSurvey = (token: string, id: string, segmentIds: string[]) =>
  apiFetch<{ survey: Survey; sentCount: number; skipped: unknown[] }>(`/api/surveys/${id}/inbox`, { method: 'POST', body: JSON.stringify({ segmentIds }) }, token)
/** Product filter on the survey: a delivered order containing a matching product triggers the NPS survey. */
export interface SurveyProductFilter { productType?: string | null; publishedOnly: boolean }
export interface SurveyProductTarget { surveyId: string; productIds: string[]; filter: SurveyProductFilter | null; resolvedProductIds: string[] }
export const fetchSurveyProductTarget = (token: string, id: string) =>
  apiFetch<SurveyProductTarget>(`/api/surveys/${id}/product-target`, {}, token)
export const setSurveyProductTarget = (token: string, id: string, filter: SurveyProductFilter | null) =>
  apiFetch<SurveyProductTarget>(`/api/surveys/${id}/product-target`, { method: 'PUT', body: JSON.stringify({ productIds: [], filter }) }, token)
export const fetchSurveyStats = (token: string, id: string) => apiFetch<SurveyStats>(`/api/surveys/${id}/stats`, {}, token)
export const fetchSurveySheet = (token: string, id: string) => apiFetch<SurveySheet>(`/api/surveys/${id}/sheet`, {}, token)
export const submitSurvey = (token: string, id: string, answers: { questionId: string; answerText: string }[], orderId?: string | null) =>
  apiFetch<unknown>(`/api/surveys/${id}/responses`, { method: 'POST', body: JSON.stringify({ orderId: orderId ?? null, answers }) }, token)

// ---------------------------------------------------------------- notifications
export interface AppNotification {
  id: string
  userId: string
  referenceType: string | null
  referenceId: string | null
  channel: string
  content: string
  status: string
  sentAt: string
}
export const fetchNotifications = (token: string) => apiFetch<{ notifications: AppNotification[] }>('/api/notifications', {}, token)
export const markNotificationRead = (token: string, id: string) =>
  apiFetch<AppNotification>(`/api/notifications/${id}/read`, { method: 'POST' }, token)

// ---------------------------------------------------------------- conversations
export const TOPIC_OPTIONS = [
  ['hoi_don', 'Hỏi đơn hàng'],
  ['bao_hanh', 'Bảo hành'],
  ['tu_van', 'Tư vấn'],
  ['khac', 'Khác'],
] as const

export interface ConversationMessage {
  id: string
  senderId: string | null
  senderName: string | null
  senderRole: string | null
  kind: string
  content: string
  score: number | null
  sentAt: string
  side: string
}
export interface ConversationSummary {
  id: string
  code: string
  userId: string
  customerName: string | null
  type: string
  channelLabel: string
  topicLabel: string
  status: string
  statusLabel: string
  priority: string
  preview: string | null
  lastMessageAt: string
  slaState: string | null
  assigneeName: string | null
  mine: boolean
}
export interface ConversationDetail extends Omit<ConversationSummary, 'preview' | 'mine'> {
  topic: string
  orderId: string | null
  openedAt: string
  agentOnline: boolean
  csatScore: number | null
  assigneeId: string | null
  messages: ConversationMessage[]
  customer: { fullName: string | null; tierLabel: string | null; totalSpend: number | null; totalOrders: number } | null
}
export interface SupportAgent { userId: string; fullName: string; department: string; roleLabel: string }

export const fetchConversations = (token: string, filter?: string) =>
  apiFetch<{ items: ConversationSummary[]; agentOnline: boolean }>(`/api/conversations${filter ? `?filter=${filter}` : ''}`, {}, token)
export const fetchConversation = (token: string, id: string) => apiFetch<ConversationDetail>(`/api/conversations/${id}`, {}, token)
export const openConversation = (token: string, body: { type: 'ticket' | 'chat'; topic: string; content: string; orderId?: string | null }) =>
  apiFetch<ConversationDetail>('/api/conversations', { method: 'POST', body: JSON.stringify(body) }, token)
export const sendConversationMessage = (token: string, id: string, content: string, kind: 'public' | 'internal' = 'public') =>
  apiFetch<ConversationDetail>(`/api/conversations/${id}/messages`, { method: 'POST', body: JSON.stringify({ content, kind }) }, token)
export const patchConversation = (token: string, id: string, body: { status?: string; priority?: string }) =>
  apiFetch<ConversationDetail>(`/api/conversations/${id}`, { method: 'PATCH', body: JSON.stringify(body) }, token)
export const rateConversation = (token: string, id: string, score: number) =>
  apiFetch<ConversationDetail>(`/api/conversations/${id}/csat`, { method: 'POST', body: JSON.stringify({ score }) }, token)
export const fetchSupportAgents = (token: string) => apiFetch<SupportAgent[]>('/api/conversations/agents', {}, token)
export const escalateConversation = (token: string, id: string, employeeId: string) =>
  apiFetch<ConversationDetail>(`/api/conversations/${id}/escalate`, { method: 'POST', body: JSON.stringify({ employeeId }) }, token)

export const timeVi = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' }) : '—')
