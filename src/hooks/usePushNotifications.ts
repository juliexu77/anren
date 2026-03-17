import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

/**
 * Registers for push notifications on native iOS (APNs).
 * Stores the APNs device token in the device_tokens table.
 * No-ops on web. Uses dynamic import so the native-only plugin is not bundled for web build.
 */
export function usePushNotifications() {
  const { user } = useAuth();
  const registered = useRef(false);

  useEffect(() => {
    if (!user) return;
    if (registered.current) return;
    if (!Capacitor.isNativePlatform()) return;

    const handles: { remove: () => Promise<void> }[] = [];

    const register = async () => {
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");

        // Check current permission status first
        const permStatus = await PushNotifications.checkPermissions();
        console.log("Push permission status:", permStatus.receive);
        toast({ title: "Push: check", description: `Permission: ${permStatus.receive}` });

        if (permStatus.receive === "denied") {
          toast({ title: "Push: denied", description: "Permission previously denied" });
          return;
        }

        // Request permissions (will show system prompt if not yet determined)
        const perm = await PushNotifications.requestPermissions();
        console.log("Push permission after request:", perm.receive);
        toast({ title: "Push: requested", description: `Result: ${perm.receive}` });
        if (perm.receive !== "granted") {
          return;
        }

        // Set up listeners BEFORE calling register()
        const regHandle = await PushNotifications.addListener("registration", async (token) => {
          console.log("Push token received:", token.value);
          registered.current = true;
          toast({ title: "Push: token received", description: token.value.slice(0, 20) + "…" });

          const { error } = await supabase.from("device_tokens").upsert(
            {
              user_id: user.id,
              token: token.value,
              platform: "ios",
            },
            { onConflict: "user_id,token" }
          );
          if (error) {
            console.error("Failed to save push token:", error);
            toast({ title: "Push: save failed", description: error.message, variant: "destructive" });
          } else {
            console.log("Push token saved successfully");
            toast({ title: "Push: saved ✓", description: "Token stored" });
          }
        });
        handles.push(regHandle);

        const errHandle = await PushNotifications.addListener("registrationError", (err) => {
          console.error("Push registration error:", JSON.stringify(err));
          toast({ title: "Push: reg error", description: JSON.stringify(err).slice(0, 80), variant: "destructive" });
        });
        handles.push(errHandle);

        // Now register with APNs
        await PushNotifications.register();
        console.log("PushNotifications.register() called");
        toast({ title: "Push: register() called", description: "Waiting for APNs…" });
      } catch (e) {
        console.error("Push setup error:", e);
        toast({ title: "Push: setup error", description: String(e).slice(0, 80), variant: "destructive" });
      }
    };

    register();

    return () => {
      handles.forEach((h) => h.remove());
    };
  }, [user]);
}
