/**
 * Typed wrappers for /interviews and /candidate API endpoints.
 * Follows the same pattern as auth-api.ts and campaign-api.ts.
 */
import apiClient from "./api-client";

// ── Types matching backend Pydantic schemas ────────────────────────────────

export interface InterviewData {
  id: string;
  candidate_id: string;
  job_role_id: string;
  scheduled_at: string | null;
  duration_minutes: number;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  ats_score: number | null;
  interview_score: number | null;
  final_score: number | null;
  is_shortlisted: boolean;
  feedback: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface InterviewQuestion {
  id: string;
  job_role_id: string;
  question_text: string;
  question_type: "technical" | "behavioral" | "situational";
  expected_answer_keywords: string[];
  expected_answer: string | null;
  max_score: number;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface InterviewResponseCreate {
  interview_id: string;
  question_id: string;
  response_text: string | null;
}

export interface InterviewResponseDetail {
  id: string;
  interview_id: string;
  question_id: string;
  response_text: string | null;
  response_score: number | null;
  confidence_level: number | null;
  relevance_score: number | null;
  cheating_detected: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CandidateApplication {
  interview_id: string;
  campaign_title: string;
  organization_name: string | null;
  status: string;
  applied_at: string | null;
  ats_score: number | null;
  interview_score: number | null;
  final_score: number | null;
  is_shortlisted: boolean;
}

export interface ProctorResults {
  interview_id: string;
  total_frames: number;
  scores: {
    confidence: number;
    attention: number;
    integrity: number;
    posture: number;
  };
  signal_counts: {
    face_not_visible: number;
    gaze_away: number;
    head_turn: number;
    multi_person: number;
    excessive_movement: number;
  };
  emotion_distribution: Record<string, number>;
  event_log: Array<{
    time: number;
    event: string;
    frame: number;
    [key: string]: unknown;
  }>;
}

/** Real-time update from WebSocket proctoring */
export interface RealTimeUpdate {
  frame_number: number;
  face_visible: boolean;
  gaze_on_screen: boolean;
  head_turned_away: boolean;
  dominant_emotion: string;
  person_count: number;
  multi_person_detected: boolean;
  posture_quality: number;
  excessive_movement: boolean;
  current_scores: {
    confidence: number;
    attention: number;
    integrity: number;
    posture: number;
  };
  alerts: string[];
  error?: string;
}

// ── API calls ──────────────────────────────────────────────────────────────

export const interviewApi = {
  /** List all interviews for the current user */
  listInterviews: () =>
    apiClient.get<InterviewData[]>("/interviews/").then((r) => r.data),

  /** Start an interview (transitions from pending → in_progress) */
  startInterview: (id: string) =>
    apiClient.post<InterviewData>(`/interviews/${id}/start`).then((r) => r.data),

  /** Get questions for an interview */
  getQuestions: (id: string) =>
    apiClient
      .get<InterviewQuestion[]>(`/interviews/${id}/questions`)
      .then((r) => r.data),

  /** Submit a response for a specific question */
  submitResponse: (id: string, data: InterviewResponseCreate) =>
    apiClient
      .post<InterviewResponseDetail>(`/interviews/${id}/responses`, data)
      .then((r) => r.data),

  /** Complete an interview */
  completeInterview: (id: string) =>
    apiClient
      .post<InterviewData>(`/interviews/${id}/complete`)
      .then((r) => r.data),

  /** Get interview results */
  getResults: (id: string) =>
    apiClient
      .get<InterviewData>(`/interviews/${id}/results`)
      .then((r) => r.data),

  /** Get proctoring results */
  getProctorResults: (id: string) =>
    apiClient
      .get<ProctorResults>(`/interviews/${id}/proctor-results`)
      .then((r) => r.data),

  /** Get individual responses for an interview */
  getResponses: (id: string) =>
    apiClient
      .get<InterviewResponseDetail[]>(`/interviews/${id}/responses`)
      .then((r) => r.data),

  /** Get candidate applications */
  getApplications: () =>
    apiClient
      .get<CandidateApplication[]>("/candidate/applications")
      .then((r) => r.data),
};

export default interviewApi;