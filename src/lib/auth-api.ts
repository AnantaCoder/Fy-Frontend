/**
 * Typed wrappers for all /auth API endpoints.
 * Import these in Redux async thunks – never call apiClient directly in components.
 */
import apiClient from "./api-client";

// ── Types matching backend Pydantic schemas ────────────────────────────────

/** Backend user_type values */
export type BackendUserType = "candidate" | "organization" | "admin";

/** Frontend role display values */
export type FrontendRole = "user" | "recruiter" | "admin";

/** Maps frontend role → backend user_type */
export const roleToUserType: Record<FrontendRole, BackendUserType> = {
  user: "candidate",
  recruiter: "organization",
  admin: "admin",
};

/** Maps backend user_type → frontend role */
export const userTypeToRole: Record<BackendUserType, FrontendRole> = {
  candidate: "user",
  organization: "recruiter",
  admin: "admin",
};

export interface TokenPayload {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  expires_at?: number;
}

export interface UserProfilePayload {
  id: string;
  email: string;
  user_type: BackendUserType;
  full_name: string | null;
  avatar_url: string | null;
  email_confirmed_at: string | null;
  address: string | null;
  phone_number: string | null;
  is_active: boolean | null;
  skills: string[] | null;
  job_role: string | null;
  year_of_experience: number | null;
  created_at: string;
  updated_at: string;
}

export interface UserProfileUpdatePayload {
  full_name?: string | null;
  avatar_url?: string | null;
  address?: string | null;
  phone_number?: string | null;
  skills?: string[] | null;
  job_role?: string | null;
  year_of_experience?: number | null;
}

export interface AuthResponsePayload {
  user: UserProfilePayload;
  session: TokenPayload;
}

// ── API calls ──────────────────────────────────────────────────────────────

export const authApi = {
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: FrontendRole
  ) =>
    apiClient
      .post<AuthResponsePayload>("/auth/signup", {
        email,
        password,
        full_name: fullName,
        user_type: roleToUserType[role],
      })
      .then((r) => r.data),

  signIn: (email: string, password: string) =>
    apiClient
      .post<AuthResponsePayload>("/auth/signin", { email, password })
      .then((r) => r.data),

  signOut: (accessToken: string) =>
    apiClient
      .post(
        "/auth/signout",
        {},
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      .then((r) => r.data),

  refreshToken: (refreshToken: string) =>
    apiClient
      .post<TokenPayload>("/auth/refresh", { refresh_token: refreshToken })
      .then((r) => r.data),

  getMe: () =>
    apiClient.get<UserProfilePayload>("/auth/me").then((r) => r.data),

  updateMe: (data: UserProfileUpdatePayload) =>
    apiClient.patch<UserProfilePayload>("/auth/me", data).then((r) => r.data),
};

export default authApi;
