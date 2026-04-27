/**
 * Auth Redux slice.
 *
 * State machine:
 *   idle ──sign-in/up──► loading ──success──► authenticated
 *                                └──failure──► error (idle)
 *   authenticated ──logout──► idle
 *
 * Tokens are persisted to localStorage by the extra reducers so the session
 * survives page refreshes.  The slice itself is the single source of truth
 * for all auth state – nothing else touches localStorage directly.
 */
import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { toast } from "sonner";

import authApi, {
  userTypeToRole,
  type FrontendRole,
  type AuthResponsePayload,
  type UserProfilePayload,
} from "@/lib/auth-api";
import { TOKEN_KEYS } from "@/lib/api-client";

// ── State shape ────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: FrontendRole;
  avatarUrl?: string;
  address?: string | null;
  phoneNumber?: string | null;
  isActive?: boolean | null;
  skills?: string[] | null;
  jobRole?: string | null;
  yearOfExperience?: number | null;
}

export type AuthStatus = "idle" | "loading" | "authenticated" | "error";

export interface AuthState {
  user: AuthUser | null;
  status: AuthStatus;
  error: string | null;
  accessToken: string | null;
  refreshToken: string | null;
}

// ── Token persistence helpers ──────────────────────────────────────────────

function persistTokens(access: string, refresh: string) {
  localStorage.setItem(TOKEN_KEYS.access, access);
  localStorage.setItem(TOKEN_KEYS.refresh, refresh);
}

function clearTokens() {
  localStorage.removeItem(TOKEN_KEYS.access);
  localStorage.removeItem(TOKEN_KEYS.refresh);
}

function mapPayloadToUser(u: UserProfilePayload): AuthUser {
  return {
    id: u.id,
    email: u.email,
    name: u.full_name ?? u.email.split("@")[0],
    role: userTypeToRole[u.user_type],
    avatarUrl: u.avatar_url ?? undefined,
    address: u.address,
    phoneNumber: u.phone_number,
    isActive: u.is_active,
    skills: u.skills,
    jobRole: u.job_role,
    yearOfExperience: u.year_of_experience,
  };
}

function buildInitialState(): AuthState {
  const access = localStorage.getItem(TOKEN_KEYS.access);
  const refresh = localStorage.getItem(TOKEN_KEYS.refresh);

  // Attempt to restore user identity from stored token (without a network round-trip).
  // The /auth/me fetch happens in AuthInitializer after the store mounts.
  return {
    user: null,
    status: access ? "loading" : "idle", // loading until /me resolves
    error: null,
    accessToken: access,
    refreshToken: refresh,
  };
}

// ── Async thunks ───────────────────────────────────────────────────────────

export const signIn = createAsyncThunk(
  "auth/signIn",
  async (
    { email, password }: { email: string; password: string },
    { rejectWithValue }
  ) => {
    try {
      return await authApi.signIn(email, password);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Sign-in failed. Please try again.";
      return rejectWithValue(msg);
    }
  }
);

export const signUp = createAsyncThunk(
  "auth/signUp",
  async (
    {
      email,
      password,
      fullName,
      role,
    }: { email: string; password: string; fullName: string; role: FrontendRole },
    { rejectWithValue }
  ) => {
    try {
      return await authApi.signUp(email, password, fullName, role);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Sign-up failed. Please try again.";
      return rejectWithValue(msg);
    }
  }
);

export const signOut = createAsyncThunk(
  "auth/signOut",
  async (_, { getState }) => {
    const { auth } = getState() as { auth: AuthState };
    if (auth.accessToken) {
      try {
        await authApi.signOut(auth.accessToken);
      } catch {
        // Swallow – we clear client-side regardless
      }
    }
  }
);

export const fetchMe = createAsyncThunk(
  "auth/fetchMe",
  async (_, { rejectWithValue }) => {
    try {
      return await authApi.getMe();
    } catch {
      return rejectWithValue("Session expired");
    }
  }
);

export const updateProfile = createAsyncThunk(
  "auth/updateProfile",
  async (
    data: import("@/lib/auth-api").UserProfileUpdatePayload,
    { rejectWithValue }
  ) => {
    try {
      return await authApi.updateMe(data);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? "Profile update failed.";
      return rejectWithValue(msg);
    }
  }
);

// ── Slice ──────────────────────────────────────────────────────────────────

function applyAuthSuccess(
  state: AuthState,
  payload: AuthResponsePayload
) {
  const { user, session } = payload;
  state.user = mapPayloadToUser(user);
  state.accessToken = session.access_token;
  state.refreshToken = session.refresh_token;
  state.status = "authenticated";
  state.error = null;
  persistTokens(session.access_token, session.refresh_token);
}

const authSlice = createSlice({
  name: "auth",
  initialState: buildInitialState,
  reducers: {
    /** Called by the auth:logout window event (interceptor-triggered logout) */
    forceLogout(state) {
      state.user = null;
      state.status = "idle";
      state.error = null;
      state.accessToken = null;
      state.refreshToken = null;
      clearTokens();
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // ── signIn ─────────────────────────────────────────────────────────────
    builder
      .addCase(signIn.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(signIn.fulfilled, (state, action) => {
        applyAuthSuccess(state, action.payload);
        toast.success("Welcome back!");
      })
      .addCase(signIn.rejected, (state, action) => {
        state.status = "error";
        state.error = action.payload as string;
        toast.error(action.payload as string);
      });

    // ── signUp ─────────────────────────────────────────────────────────────
    builder
      .addCase(signUp.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(signUp.fulfilled, (state, action) => {
        applyAuthSuccess(state, action.payload);
        toast.success("Account created! Welcome aboard.");
      })
      .addCase(signUp.rejected, (state, action) => {
        state.status = "error";
        state.error = action.payload as string;
        toast.error(action.payload as string);
      });

    // ── signOut ────────────────────────────────────────────────────────────
    builder
      .addCase(signOut.fulfilled, (state) => {
        state.user = null;
        state.status = "idle";
        state.error = null;
        state.accessToken = null;
        state.refreshToken = null;
        clearTokens();
      });

    // ── fetchMe ────────────────────────────────────────────────────────────
    builder
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = mapPayloadToUser(action.payload);
        state.status = "authenticated";
        state.error = null;
      })
      .addCase(fetchMe.rejected, (state) => {
        // Stored token is invalid – clear everything
        state.user = null;
        state.status = "idle";
        state.accessToken = null;
        state.refreshToken = null;
        clearTokens();
      });

    // ── updateProfile ──────────────────────────────────────────────────────
    builder
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.user = mapPayloadToUser(action.payload);
      })
      .addCase(updateProfile.rejected, (_, action) => {
        toast.error(action.payload as string);
      });
  },
});

export const { forceLogout, clearError } = authSlice.actions;
export default authSlice.reducer;
