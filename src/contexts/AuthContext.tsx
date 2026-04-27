/**
 * AuthContext – thin React context that wraps the Redux auth slice.
 *
 * WHY keep a context at all?
 *   Existing pages/components already call `useAuth()`.  Rather than refactor
 *   every component, this context delegates to Redux so the rest of the app
 *   gets real auth without touching every call site.
 *
 * The context is intentionally minimal – for rich auth state use the Redux
 * hooks directly (useAppSelector, useAppDispatch) in new components.
 */
import React, { createContext, useContext, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  signIn,
  signUp as signUpThunk,
  signOut,
  fetchMe,
  forceLogout,
  clearError,
} from "@/store/authSlice";
import type { AuthUser } from "@/store/authSlice";

export type UserRole = "user" | "admin" | "recruiter";

// ── Context shape (kept backward-compatible) ───────────────────────────────

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  /** Sign-in – mirrors the old `login(email, password, role)` signature */
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  /** Sign-up (new signature required for name) */
  signup: (
    email: string,
    password: string,
    name: string,
    role: UserRole
  ) => Promise<void>;
  logout: () => Promise<void>;
  clearAuthError: () => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

// ── Provider ───────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const dispatch = useAppDispatch();
  const { user, status, error, accessToken } = useAppSelector((s) => s.auth);

  // ── Hydrate user from stored token on first mount ──────────────────────
  useEffect(() => {
    if (accessToken && !user) {
      dispatch(fetchMe());
    }
  }, []); // run once on mount

  // ── Listen for interceptor-triggered logout events ────────────────────
  useEffect(() => {
    const handler = () => {
      dispatch(forceLogout());
    };
    window.addEventListener("auth:logout", handler);
    return () => window.removeEventListener("auth:logout", handler);
  }, [dispatch]);

  // ── Actions ────────────────────────────────────────────────────────────

  const login = useCallback(
    async (email: string, password: string, _role: UserRole) => {
      // role is ignored during sign-in – the backend returns the real role
      await dispatch(signIn({ email, password })).unwrap();
    },
    [dispatch]
  );

  const signup = useCallback(
    async (
      email: string,
      password: string,
      name: string,
      role: UserRole
    ) => {
      await dispatch(
        signUpThunk({ email, password, fullName: name, role })
      ).unwrap();
    },
    [dispatch]
  );

  const logout = useCallback(async () => {
    await dispatch(signOut());
  }, [dispatch]);

  const clearAuthError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  const value: AuthContextType = {
    user,
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading",
    error,
    login,
    signup,
    logout,
    clearAuthError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
