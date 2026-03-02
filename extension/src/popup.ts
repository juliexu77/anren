/**
 * ANREN extension popup — same backend as web app.
 * Use shared: import type { BrainCard } from "shared"; import { createSupabaseClient } from "shared";
 */
document.getElementById("root")!.innerHTML = `
  <div style="min-width: 320px; padding: 16px; font-family: system-ui;">
    <h2 style="margin: 0 0 8px; font-size: 18px;">ANREN</h2>
    <p style="margin: 0; color: #666; font-size: 13px;">Same backend as the web app. Configure Supabase URL and anon key in options or storage.</p>
  </div>
`;
