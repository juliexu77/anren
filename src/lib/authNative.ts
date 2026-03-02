import { Capacitor } from "@capacitor/core";
import { SocialLogin, type GoogleLoginOptions, type GoogleLoginResponseOnline } from "@capgo/capacitor-social-login";
import { supabase } from "@/integrations/supabase/client";

type AuthResult = { success: true } | { success: false; message: string };

function getEnv(name: string): string | undefined {
  const value = (import.meta as any).env?.[name] as string | undefined;
  return value && value.length > 0 ? value : undefined;
}

/**
 * Generate a URL-safe random nonce as hex.
 */
function getUrlSafeNonce(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getNoncePair(): Promise<{ rawNonce: string; nonceDigest: string }> {
  const rawNonce = getUrlSafeNonce();
  const nonceDigest = await sha256Hex(rawNonce);
  return { rawNonce, nonceDigest };
}

function decodeJwt(token: string): any | null {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    console.error("Failed to decode JWT:", err);
    return null;
  }
}

function validateJwtAudienceAndNonce(idToken: string, expectedNonceDigest: string, validAudiences: string[]): { ok: boolean; error?: string } {
  const decoded = decodeJwt(idToken);
  if (!decoded) return { ok: false, error: "Failed to decode idToken" };

  const audience = decoded.aud;
  if (!audience || !validAudiences.includes(audience)) {
    return {
      ok: false,
      error: `Invalid audience: expected one of ${validAudiences.join(", ")}, got ${audience}`,
    };
  }

  const tokenNonce = decoded.nonce;
  if (tokenNonce && tokenNonce !== expectedNonceDigest) {
    return {
      ok: false,
      error: `Nonce mismatch: expected ${expectedNonceDigest}, got ${tokenNonce}`,
    };
  }

  return { ok: true };
}

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Native-first Google sign-in for iOS (and other native platforms).
 * Uses Capgo Social Login to obtain a Google ID token, then signs in to Supabase with signInWithIdToken.
 */
export async function signInWithGoogleNative(): Promise<AuthResult> {
  if (!isNativeApp()) {
    return { success: false, message: "Not running in a native Capacitor shell" };
  }

  const webClientId = getEnv("VITE_GOOGLE_WEB_CLIENT_ID");
  const iosClientId = getEnv("VITE_GOOGLE_IOS_CLIENT_ID");

  if (!webClientId || !iosClientId) {
    console.error("Missing VITE_GOOGLE_WEB_CLIENT_ID or VITE_GOOGLE_IOS_CLIENT_ID env vars");
    return {
      success: false,
      message: "Google Sign-In is not fully configured for iOS. Please set VITE_GOOGLE_WEB_CLIENT_ID and VITE_GOOGLE_IOS_CLIENT_ID.",
    };
  }

  const platform = Capacitor.getPlatform();
  const isIOS = platform === "ios";

  const { rawNonce, nonceDigest } = await getNoncePair();

  await SocialLogin.initialize({
    google: {
      webClientId,
      ...(isIOS && { iOSClientId: iosClientId, iOSServerClientId: webClientId }),
      mode: "online",
    },
  });

  const response = await SocialLogin.login({
    provider: "google",
    options: {
      scopes: ["email", "profile", "https://www.googleapis.com/auth/calendar"],
      nonce: nonceDigest,
    } as GoogleLoginOptions,
  });

  if (response.result.responseType !== "online") {
    return { success: false, message: "Google login returned offline mode; expected online idToken." };
  }

  const googleResponse = response.result as GoogleLoginResponseOnline;
  if (!googleResponse.idToken) {
    return { success: false, message: "Google login did not return an idToken." };
  }

  const validation = validateJwtAudienceAndNonce(googleResponse.idToken, nonceDigest, [webClientId, iosClientId]);
  if (!validation.ok) {
    console.warn("Google idToken validation failed:", validation.error);
    return { success: false, message: validation.error || "Google token validation failed." };
  }

  const decoded = decodeJwt(googleResponse.idToken);

  const signInOptions: { provider: "google"; token: string; nonce?: string } = {
    provider: "google",
    token: googleResponse.idToken,
  };

  if (decoded?.nonce) {
    signInOptions.nonce = rawNonce;
  }

  const { data, error } = await supabase.auth.signInWithIdToken(signInOptions);
  if (error) {
    console.error("Supabase signInWithIdToken error:", error);
    return { success: false, message: error.message || "Failed to sign in with Supabase." };
  }

  if (!data.user) {
    return { success: false, message: "Supabase did not return a user after sign-in." };
  }

  return { success: true };
}

