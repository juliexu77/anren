import { describe, expect, it } from "vitest";
import { hasSupabaseConfig } from "../supabaseClient";

describe("supabase configuration", () => {
  it("is false by default in tests (no env)", () => {
    expect(hasSupabaseConfig()).toBe(false);
  });
});

