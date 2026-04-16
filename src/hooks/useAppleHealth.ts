import { useCallback, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { App as CapacitorApp } from "@capacitor/app";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const READ_PERMISSIONS = [
  "HKQuantityTypeIdentifierStepCount",
  "HKQuantityTypeIdentifierHeartRate",
  "HKQuantityTypeIdentifierHeartRateVariabilitySDNN",
  "HKCategoryTypeIdentifierSleepAnalysis",
  "HKWorkoutTypeIdentifier",
];

/**
 * Apple HealthKit bridge. Native iOS only.
 *
 * - requestAuthorization(): prompts the user once, returns true on success
 * - syncNow(): pulls last 7 days of sleep, steps, workouts, HR, HRV and POSTs to ingest-apple-health
 * - useAutoSyncOnForeground(): re-syncs when the app returns to foreground (no server cron — data lives on device)
 */
export function useAppleHealth() {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const isNative = Capacitor.isNativePlatform();

  const requestAuthorization = useCallback(async (): Promise<boolean> => {
    if (!isNative) return false;
    try {
      const { CapacitorHealthkit } = await import("@perfood/capacitor-healthkit");
      try {
        await CapacitorHealthkit.isAvailable();
      } catch {
        toast.error("Apple Health is not available on this device");
        return false;
      }
      await CapacitorHealthkit.requestAuthorization({
        all: [],
        read: READ_PERMISSIONS,
        write: [],
      });
      return true;
    } catch (e: any) {
      console.error("HealthKit auth error:", e);
      toast.error(e?.message || "Could not request Apple Health permission");
      return false;
    }
  }, [isNative]);

  const syncNow = useCallback(async (): Promise<{ count: number } | null> => {
    if (!isNative || !user) return null;
    setBusy(true);
    try {
      const { CapacitorHealthkit } = await import("@perfood/capacitor-healthkit");
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const safeQuery = async (
        sampleName: string,
        extra: Record<string, unknown> = {}
      ): Promise<any[]> => {
        try {
          const res: any = await CapacitorHealthkit.queryHKitSampleType({
            startDate,
            endDate,
            limit: 0,
            sampleName,
            ...extra,
          });
          return Array.isArray(res?.resultData) ? res.resultData : [];
        } catch (err) {
          console.warn(`HK ${sampleName} query failed`, err);
          return [];
        }
      };

      const [stepsRaw, hrRaw, hrvRaw, sleepRaw, workoutsRaw] = await Promise.all([
        safeQuery("stepCount"),
        safeQuery("heartRate"),
        safeQuery("heartRateVariabilitySDNN"),
        safeQuery("sleepAnalysis"),
        safeQuery("workoutType"),
      ]);

      // Aggregate steps per day
      const stepsByDay = new Map<string, number>();
      for (const s of stepsRaw) {
        const day = String(s.startDate || s.endDate || "").slice(0, 10);
        if (!day) continue;
        stepsByDay.set(day, (stepsByDay.get(day) || 0) + (Number(s.value) || 0));
      }

      const payload = {
        steps: Array.from(stepsByDay.entries()).map(([day, count]) => ({
          day,
          count: Math.round(count),
        })),
        heart_rate: hrRaw.map((h) => ({
          recorded_at: h.startDate,
          bpm: Number(h.value) || null,
        })),
        hrv: hrvRaw.map((h) => ({
          recorded_at: h.startDate,
          ms: Number(h.value) || null,
        })),
        sleep: sleepRaw
          // sleepAnalysis returns category samples; only keep "asleep" states (value > 0)
          .filter((s) => Number(s.value) > 0)
          .map((s) => {
            const start = new Date(s.startDate).getTime();
            const end = new Date(s.endDate).getTime();
            return {
              start: s.startDate,
              end: s.endDate,
              duration_minutes:
                isFinite(start) && isFinite(end)
                  ? Math.max(0, Math.round((end - start) / 60000))
                  : null,
              source: s.sourceName ?? null,
            };
          }),
        workouts: workoutsRaw.map((w) => {
          const start = new Date(w.startDate).getTime();
          const end = new Date(w.endDate).getTime();
          return {
            start: w.startDate,
            end: w.endDate,
            type: w.workoutActivityName ?? w.workoutActivityType ?? null,
            duration_minutes:
              isFinite(start) && isFinite(end)
                ? Math.max(0, Math.round((end - start) / 60000))
                : null,
            calories: w.totalEnergyBurned ?? null,
            distance_m: w.totalDistance ?? null,
          };
        }),
      };

      const { data, error } = await supabase.functions.invoke("ingest-apple-health", {
        body: payload,
      });
      if (error) throw error;
      return { count: (data as any)?.count ?? 0 };
    } catch (e: any) {
      console.error("Apple Health sync failed:", e);
      toast.error(e?.message || "Apple Health sync failed");
      return null;
    } finally {
      setBusy(false);
    }
  }, [isNative, user]);

  const lastForegroundSync = useRef<number>(0);

  /** Auto-sync on app foreground (throttled to once per 30 min). */
  const useAutoSyncOnForeground = (enabled: boolean) => {
    useEffect(() => {
      if (!isNative || !enabled || !user) return;
      let cleanup: (() => void) | null = null;
      let mounted = true;

      (async () => {
        const handle = await CapacitorApp.addListener("appStateChange", async (state) => {
          if (!state.isActive) return;
          const ts = Date.now();
          if (ts - lastForegroundSync.current < 30 * 60 * 1000) return;
          lastForegroundSync.current = ts;
          await syncNow();
        });
        if (!mounted) {
          await handle.remove();
          return;
        }
        cleanup = () => {
          handle.remove();
        };

        // Initial sync on mount
        const ts = Date.now();
        if (ts - lastForegroundSync.current > 30 * 60 * 1000) {
          lastForegroundSync.current = ts;
          await syncNow();
        }
      })();

      return () => {
        mounted = false;
        cleanup?.();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [enabled, user]);
  };

  return { busy, isNative, requestAuthorization, syncNow, useAutoSyncOnForeground };
}
