import type { UserId } from "./supabaseClient";

const DEV_USER_ID = (import.meta.env.VITE_DEV_USER_ID ||
  "anren-dev-user") as UserId;

export function getCurrentUserId(): UserId {
  return DEV_USER_ID;
}

