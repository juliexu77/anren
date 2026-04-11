import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const LOCAL_CARDS_KEY = "anren_local_cards";
const ONBOARDING_STEP_KEY = "anren_onboarding_step";

interface LocalCard {
  id: string;
  title: string;
  body: string;
  source: string;
  imageUrl?: string;
}

export function useOnboarding() {
  const { user } = useAuth();
  const [step, setStep] = useState(() => {
    const saved = localStorage.getItem(ONBOARDING_STEP_KEY);
    return saved ? parseInt(saved, 10) : 1;
  });

  // Persist step
  useEffect(() => {
    localStorage.setItem(ONBOARDING_STEP_KEY, String(step));
  }, [step]);

  const nextStep = useCallback(() => setStep((s) => Math.min(s + 1, 5)), []);
  const skipStep = useCallback(() => setStep((s) => Math.min(s + 1, 5)), []);

  // Local card management (pre-auth)
  const getLocalCards = useCallback((): LocalCard[] => {
    try {
      return JSON.parse(localStorage.getItem(LOCAL_CARDS_KEY) || "[]");
    } catch {
      return [];
    }
  }, []);

  const addLocalCard = useCallback((card: Omit<LocalCard, "id">) => {
    const cards = JSON.parse(localStorage.getItem(LOCAL_CARDS_KEY) || "[]");
    cards.push({ ...card, id: crypto.randomUUID() });
    localStorage.setItem(LOCAL_CARDS_KEY, JSON.stringify(cards));
  }, []);

  // Migrate local cards to database after auth
  const migrateLocalCards = useCallback(async () => {
    if (!user) return;
    const cards = getLocalCards();
    if (cards.length === 0) return;

    const rows = cards.map((c) => ({
      user_id: user.id,
      title: c.title,
      body: c.body,
      source: c.source,
      image_url: c.imageUrl || null,
    }));

    const { error } = await supabase.from("cards").insert(rows);
    if (!error) {
      localStorage.removeItem(LOCAL_CARDS_KEY);
    } else {
      console.error("Failed to migrate local cards:", error);
    }
  }, [user, getLocalCards]);

  const completeOnboarding = useCallback(async () => {
    localStorage.removeItem(ONBOARDING_STEP_KEY);
    localStorage.removeItem(LOCAL_CARDS_KEY);
    if (user) {
      await supabase
        .from("profiles")
        .update({ onboarding_completed: true })
        .eq("user_id", user.id);
    }
  }, [user]);

  // Check if onboarding is done (for routing)
  const isOnboardingComplete = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    const { data } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("user_id", user.id)
      .single();
    return data?.onboarding_completed === true;
  }, [user]);

  return {
    step,
    setStep,
    nextStep,
    skipStep,
    getLocalCards,
    addLocalCard,
    migrateLocalCards,
    completeOnboarding,
    isOnboardingComplete,
  };
}
