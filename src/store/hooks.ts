/**
 * Typed hooks for the Redux store.
 * Always use these instead of the plain useSelector / useDispatch hooks
 * so TypeScript inference is correct throughout the app.
 */
import { useDispatch, useSelector } from "react-redux";
import type { RootState, AppDispatch } from "./store";

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector = <T>(selector: (state: RootState) => T): T =>
  useSelector(selector);
