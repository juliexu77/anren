

# Why Push Permission Is Never Requested

## Root Cause

In `vite.config.ts` line 8, `@capacitor/push-notifications` is listed in `rollupOptions.external`:

```ts
external: ["@capacitor/push-notifications"],
```

This means the plugin's JS code is **excluded from the bundle entirely**. When the native app runs `await import("@capacitor/push-notifications")` at line 24 of `usePushNotifications.ts`, there is no module to resolve — the import throws an error, caught silently by the `try/catch`, and the permission prompt never fires.

Capacitor plugins need their JS wrapper bundled with the app. The native bridge alone is not enough — the JS package provides the API surface (`requestPermissions()`, `register()`, etc.).

## Fix

**`vite.config.ts`** — Remove `@capacitor/push-notifications` from `rollupOptions.external` (delete the entire `rollupOptions` block if it was the only entry, or just remove that entry).

The existing guard `if (!Capacitor.isNativePlatform()) return;` in the hook already prevents the code from executing on web, so there's no need to externalize it. The package is installed (`^8.0.1` in dependencies) and will bundle fine.

## Files to Edit
1. `vite.config.ts` — remove the external entry

