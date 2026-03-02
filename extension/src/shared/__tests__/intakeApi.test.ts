import { describe, expect, it } from "vitest";
import { callIntakeApi } from "../intakeApi";

describe("callIntakeApi", () => {
  it("returns an error when the intake API URL is not configured", async () => {
    const result = await callIntakeApi({
      userId: "test-user",
      rawText: "Test",
      source: "chrome_side_panel",
      timestamp: new Date().toISOString(),
    });

    expect("error" in result && result.error.length > 0).toBe(true);
  });
});

