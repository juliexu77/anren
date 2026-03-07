import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

const InviteJoin = () => {
  const { token } = useParams<{ token: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [inviteInfo, setInviteInfo] = useState<{ ownerName: string | null } | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch invite info
  useEffect(() => {
    if (!token) return;
    const fetchInvite = async () => {
      const { data: invite, error: err } = await supabase
        .from("household_invites")
        .select("household_id, expires_at, households(owner_id)")
        .eq("token", token)
        .single();

      if (err || !invite) {
        setError("This invite link isn't valid.");
        setLoadingInvite(false);
        return;
      }

      if (new Date(invite.expires_at) < new Date()) {
        setError("This invite has expired.");
        setLoadingInvite(false);
        return;
      }

      const ownerId = (invite as any).households?.owner_id;
      let ownerName: string | null = null;
      if (ownerId) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", ownerId)
          .maybeSingle();
        ownerName = profile?.display_name ?? null;
      }

      setInviteInfo({ ownerName });
      setLoadingInvite(false);
    };
    fetchInvite();
  }, [token]);

  // Auto-join if user is already authenticated
  const handleJoin = async () => {
    if (!user || !token) return;
    setJoining(true);
    try {
      const { data, error: err } = await supabase.functions.invoke("accept-invite", {
        body: { token },
      });

      if (err) {
        toast.error("Couldn't join. Please try again.");
        setJoining(false);
        return;
      }

      if (data?.error) {
        toast.error(data.error);
        setJoining(false);
        return;
      }

      toast.success("You've joined the household!");
      navigate("/", { replace: true });
    } catch {
      toast.error("Something went wrong. Please try again.");
      setJoining(false);
    }
  };

  if (authLoading || loadingInvite) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <h1 className="font-display text-2xl font-semibold text-text-primary mb-2">
          Hmm…
        </h1>
        <p className="text-text-muted-color text-sm text-center max-w-xs">
          {error}
        </p>
      </div>
    );
  }

  // Not logged in — redirect to auth with return URL
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-6">
        <div className="text-center">
          <h1 className="font-display text-3xl font-semibold text-text-primary mb-2">
            ANREN
          </h1>
          <p className="text-text-muted-color text-sm max-w-xs mx-auto leading-relaxed">
            {inviteInfo?.ownerName
              ? `${inviteInfo.ownerName} invited you to see what they're holding.`
              : "You've been invited to join a household."}
          </p>
        </div>

        <button
          onClick={() => {
            // Store the invite token for post-auth join
            localStorage.setItem("pending_invite_token", token!);
            navigate("/auth", { replace: true });
          }}
          className="accent-btn w-full max-w-xs rounded-full py-3.5 text-button inline-flex items-center justify-center"
        >
          Sign in to join
        </button>
      </div>
    );
  }

  // Logged in — show join confirmation
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 gap-6">
      <div className="text-center">
        <h1 className="font-display text-3xl font-semibold text-text-primary mb-2">
          ANREN
        </h1>
        <p className="text-text-muted-color text-sm max-w-xs mx-auto leading-relaxed">
          {inviteInfo?.ownerName
            ? `Join ${inviteInfo.ownerName}'s household? You'll be able to see what they're holding.`
            : "Join this household? You'll be able to see what they're holding."}
        </p>
      </div>

      <button
        onClick={handleJoin}
        disabled={joining}
        className="accent-btn w-full max-w-xs rounded-full py-3.5 text-button inline-flex items-center justify-center gap-2"
      >
        {joining && <Loader2 className="w-4 h-4 animate-spin" />}
        {joining ? "Joining…" : "Join household"}
      </button>
    </div>
  );
};

export default InviteJoin;
