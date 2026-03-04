import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Registers for push notifications on native iOS (APNs).
 * Stores the APNs device token in the device_tokens table.
 * No-ops on web. Uses dynamic import so the native-only plugin is not bundled for web build.
 */
export function usePushNotifications() {
  const { user } = useAuth();
  const registered = useRef(false);

  useEffect(() => {
    if (!user || registered.current) return;
    if (!Capacitor.isNativePlatform()) return;

    const handles: { remove: () => Promise<void> }[] = [];

    const register = async () => {
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");

        const perm = await PushNotifications.requestPermissions();
        if (perm.receive !== "granted") {
          console.log("Push permission not granted");
          return;
        }

        await PushNotifications.register();

        const regHandle = await PushNotifications.addListener("registration", async (token) => {
          console.log("Push token:", token.value);
          registered.current = true;

          await supabase.from("device_tokens").upsert(
            {
              user_id: user.id,
              token: token.value,
              platform: "ios",
            },
            { onConflict: "user_id,token" }
          );
        });
        handles.push(regHandle);

        const errHandle = await PushNotifications.addListener("registrationError", (err) => {
          console.error("Push registration error:", err);
        });
        handles.push(errHandle);
      } catch (e) {
        console.error("Push setup error:", e);
      }
    };

    register();

    return () => {
      handles.forEach((h) => h.remove());
    };
  }, [user]);
}
