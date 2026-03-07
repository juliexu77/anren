import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface HouseholdState {
  /** True if the current user is a viewer in someone else's household */
  isViewer: boolean;
  /** The owner's user_id (if viewer) */
  ownerId: string | null;
  /** The owner's display name */
  ownerName: string | null;
  /** The household id */
  householdId: string | null;
  /** True if the current user owns a household */
  isOwner: boolean;
  /** Owner's household id */
  ownedHouseholdId: string | null;
  /** Partner info (if owner and someone has joined) */
  partner: { userId: string; displayName: string | null; joinedAt: string } | null;
  /** Active invite token (if owner) */
  inviteToken: string | null;
  /** Loading state */
  loading: boolean;
}

export function useHousehold(): HouseholdState & {
  generateInvite: () => Promise<string | null>;
  revokeInvite: () => Promise<void>;
  removePartner: () => Promise<void>;
} {
  const { user } = useAuth();
  const [state, setState] = useState<HouseholdState>({
    isViewer: false,
    ownerId: null,
    ownerName: null,
    householdId: null,
    isOwner: false,
    ownedHouseholdId: null,
    partner: null,
    inviteToken: null,
    loading: true,
  });

  useEffect(() => {
    if (!user) {
      setState((s) => ({ ...s, loading: false }));
      return;
    }

    const fetch = async () => {
      // Check if user is a viewer in any household
      const { data: membership } = await supabase
        .from("household_members")
        .select("household_id, households(owner_id)")
        .eq("user_id", user.id)
        .eq("role", "viewer")
        .limit(1)
        .maybeSingle();

      let isViewer = false;
      let ownerId: string | null = null;
      let ownerName: string | null = null;
      let viewerHouseholdId: string | null = null;

      if (membership) {
        isViewer = true;
        viewerHouseholdId = membership.household_id;
        ownerId = (membership as any).households?.owner_id ?? null;

        if (ownerId) {
          const { data: ownerProfile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("user_id", ownerId)
            .single();
          ownerName = ownerProfile?.display_name ?? null;
        }
      }

      // Check if user owns a household
      const { data: owned } = await supabase
        .from("households")
        .select("id")
        .eq("owner_id", user.id)
        .limit(1)
        .maybeSingle();

      let partner: HouseholdState["partner"] = null;
      let inviteToken: string | null = null;

      if (owned) {
        // Get partner
        const { data: members } = await supabase
          .from("household_members")
          .select("user_id, joined_at")
          .eq("household_id", owned.id)
          .eq("role", "viewer")
          .limit(1);

        if (members && members.length > 0) {
          const m = members[0];
          const { data: partnerProfile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("user_id", m.user_id)
            .single();
          partner = {
            userId: m.user_id,
            displayName: partnerProfile?.display_name ?? null,
            joinedAt: m.joined_at,
          };
        }

        // Get active invite
        const { data: invite } = await supabase
          .from("household_invites")
          .select("token")
          .eq("household_id", owned.id)
          .gt("expires_at", new Date().toISOString())
          .limit(1)
          .maybeSingle();

        inviteToken = invite?.token ?? null;
      }

      setState({
        isViewer,
        ownerId,
        ownerName,
        householdId: viewerHouseholdId,
        isOwner: !!owned,
        ownedHouseholdId: owned?.id ?? null,
        partner,
        inviteToken,
        loading: false,
      });
    };

    fetch();
  }, [user]);

  const generateInvite = async (): Promise<string | null> => {
    if (!user) return null;

    let householdId = state.ownedHouseholdId;

    // Create household if needed
    if (!householdId) {
      const { data: h, error } = await supabase
        .from("households")
        .insert({ owner_id: user.id })
        .select("id")
        .single();
      if (error || !h) return null;
      householdId = h.id;
    }

    // Create invite
    const { data: invite, error } = await supabase
      .from("household_invites")
      .insert({ household_id: householdId })
      .select("token")
      .single();

    if (error || !invite) return null;

    setState((s) => ({
      ...s,
      isOwner: true,
      ownedHouseholdId: householdId,
      inviteToken: invite.token,
    }));

    return invite.token;
  };

  const revokeInvite = async () => {
    if (!state.ownedHouseholdId) return;
    await supabase
      .from("household_invites")
      .delete()
      .eq("household_id", state.ownedHouseholdId);
    setState((s) => ({ ...s, inviteToken: null }));
  };

  const removePartner = async () => {
    if (!state.ownedHouseholdId || !state.partner) return;
    await supabase
      .from("household_members")
      .delete()
      .eq("household_id", state.ownedHouseholdId)
      .eq("user_id", state.partner.userId);
    setState((s) => ({ ...s, partner: null }));
  };

  return { ...state, generateInvite, revokeInvite, removePartner };
}
