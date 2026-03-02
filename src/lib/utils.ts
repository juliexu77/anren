import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Canonical web origin for OAuth-style redirects.
 * Falls back to window.location.origin when no env override is set.
 */
export function getAppOrigin(): string {
  const envOrigin = (import.meta as any).env?.VITE_PUBLIC_WEB_ORIGIN as string | undefined;
  if (envOrigin && envOrigin.length > 0) {
    return envOrigin.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return "";
}

