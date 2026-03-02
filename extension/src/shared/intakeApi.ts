import type { UserId } from "./supabaseClient";

const INTAKE_API_URL = import.meta.env
  .VITE_INTAKE_API_URL as string | undefined;

export type IntakeRequest = {
  userId: UserId;
  rawText: string;
  source: "chrome_side_panel";
  timestamp: string;
};

/** Shape of a task returned by the intake API (if configured). */
export type IntakeTask = {
  title: string;
  notes?: string | null;
  due_at?: string | null;
  scope?: string | null;
  status?: string | null;
};

export type IntakeApiResponse =
  | { tasks: IntakeTask[] }
  | { error: string };

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 8000,
): Promise<Response> {
  const controller = new AbortController();
  const id = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    window.clearTimeout(id);
  }
}

export async function callIntakeApi(
  payload: IntakeRequest,
): Promise<IntakeApiResponse> {
  if (!INTAKE_API_URL) {
    return { error: "Intake API URL is not configured." };
  }

  try {
    const response = await fetchWithTimeout(
      INTAKE_API_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      },
      8000,
    );

    if (!response.ok) {
      return { error: `Intake API returned ${response.status}` };
    }

    const data = (await response.json()) as IntakeApiResponse;
    if ("tasks" in data && Array.isArray(data.tasks)) {
      return data;
    }

    return { error: "Intake API did not return tasks." };
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error("[Anren] intake API error", error);
    return { error: "Intake API call failed." };
  }
}

