import { useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Registers for push notifications on native iOS.
 * Stores the APNs device token in the device_tokens table.
 * No-ops on web.
 */
export function usePushNotifications() {
  const { user } = useAuth();
  const registered = useRef(false);

  useEffect(() => {
    if (!user || registered.current) return;
    if (!Capacitor.isNativePlatform()) return;

    const register = async () => {
      try {
        const perm = await PushNotifications.requestPermissions();
        if (perm.receive !== "granted") {
          console.log("Push permission not granted");
          return;
        }

        await PushNotifications.register();

        PushNotifications.addListener("registration", async (token) => {
          console.log("Push token:", token.value);
          registered.current = true;

          // Upsert token
          await supabase.from("device_tokens").upsert(
            {
              user_id: user.id,
              token: token.value,
              platform: "ios",
            },
            { onConflict: "user_id,token" }
          );
        });

        PushNotifications.addListener("registrationError", (err) => {
          console.error("Push registration error:", err);
        });
      } catch (e) {
        console.error("Push setup error:", e);
      }
    };

    register();
  }, [user]);
}
