import apiClient from "./api-client";

export interface Campaign {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  required_skills: string[];
  preferred_skills: string[];
  min_experience_years: number;
  max_experience_years: number | null;
  education_requirement: string | null;
  salary_range_min: number | null;
  salary_range_max: number | null;
  location: string | null;
  is_remote: boolean;
  cutoff_score: number;
  created_at: string;
  updated_at: string;
  organization_name?: string | null;
}

export interface CampaignCreate {
  title: string;
  description?: string | null;
  required_skills?: string[];
  preferred_skills?: string[];
  min_experience_years?: number;
  max_experience_years?: number | null;
  education_requirement?: string | null;
  salary_range_min?: number | null;
  salary_range_max?: number | null;
  location?: string | null;
  is_remote?: boolean;
  cutoff_score?: number;
}

export interface CampaignUpdate extends Partial<CampaignCreate> {}

export interface CampaignApplicant {
  interview_id: string;
  status: string;
  ats_score: number | null;
  interview_score: number | null;
  final_score: number | null;
  is_shortlisted: boolean;
  applied_at: string | null;
  candidate: {
    id: string;
    full_name: string;
    email: string;
    phone_number?: string | null;
    resume_url?: string | null;
    resume_category?: string | null;
  };
}

export interface ApplicantStatusUpdate {
  status?: string | null;
  is_shortlisted?: boolean;
  scheduled_at?: string | null;
}

export interface GenerateQuestionsRequest {
  num_questions: number;
  question_type: "technical" | "behavioral" | "situational" | "mixed";
  difficulty: "entry" | "mid" | "senior";
}

export interface InterviewQuestionResponse {
  id: string;
  job_role_id: string;
  question_text: string;
  question_type: string;
  expected_answer_keywords: string[];
  expected_answer: string | null;
  max_score: number;
  order_index: number;
}

export const campaignApi = {
  listCampaigns: async (): Promise<Campaign[]> => {
    const response = await apiClient.get("/campaigns/");
    return response.data;
  },

  createCampaign: async (data: CampaignCreate): Promise<Campaign> => {
    const response = await apiClient.post("/campaigns/", data);
    return response.data;
  },

  getCampaign: async (id: string): Promise<Campaign> => {
    const response = await apiClient.get(`/campaigns/${id}`);
    return response.data;
  },

  updateCampaign: async (id: string, data: CampaignUpdate): Promise<Campaign> => {
    const response = await apiClient.patch(`/campaigns/${id}`, data);
    return response.data;
  },

  listCampaignListings: async (): Promise<Campaign[]> => {
    const response = await apiClient.get("/campaigns/listings/all");
    return response.data;
  },

  applyToCampaign: async (id: string): Promise<any> => {
    const response = await apiClient.post(`/campaigns/${id}/apply`);
    return response.data;
  },

  getCampaignApplicants: async (id: string): Promise<CampaignApplicant[]> => {
    const response = await apiClient.get(`/campaigns/${id}/applicants`);
    return response.data;
  },

  updateApplicantStatus: async (id: string, candidateId: string, data: ApplicantStatusUpdate): Promise<any> => {
    const response = await apiClient.patch(`/campaigns/${id}/applicants/${candidateId}/status`, data);
    return response.data;
  },

  generateCampaignQuestions: async (id: string, data: GenerateQuestionsRequest): Promise<InterviewQuestionResponse[]> => {
    const response = await apiClient.post(`/campaigns/${id}/generate-questions`, data);
    return response.data;
  },

  getCampaignQuestions: async (id: string): Promise<InterviewQuestionResponse[]> => {
    const response = await apiClient.get(`/campaigns/${id}/questions`);
    return response.data;
  },
};
