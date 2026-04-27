/**
 * Redux store – single source of truth for the entire app.
 * Add new slices here by extending `reducer`.
 */
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Allow non-serialisable values in auth state if ever needed
      serializableCheck: false,
    }),
  devTools: import.meta.env.DEV,
});

// Infer types directly from the store to avoid duplication
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
