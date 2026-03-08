import { useState } from "react";
import { useHousehold } from "@/hooks/useHousehold";
import { Button } from "@/components/ui/button";
import { Users, Copy, Link2, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

function getInviteUrl(token: string): string {
  const origin = window.location.origin;
  return `${origin}/invite/${token}`;
}

export function SettingsPartnerSection() {
  const {
    isOwner,
    partner,
    inviteToken,
    loading,
    generateInvite,
    revokeInvite,
    removePartner,
  } = useHousehold();

  const [generating, setGenerating] = useState(false);

  if (loading) return null;

  const handleGenerate = async () => {
    setGenerating(true);
    const token = await generateInvite();
    setGenerating(false);
    if (token) {
      await navigator.clipboard?.writeText(getInviteUrl(token)).catch(() => {});
      toast.success("Invite link copied!");
    } else {
      toast.error("Couldn't create invite. Try again.");
    }
  };

  const handleCopy = async () => {
    if (!inviteToken) return;
    try {
      await navigator.clipboard.writeText(getInviteUrl(inviteToken));
      toast.success("Link copied!");
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  const handleShare = async () => {
    if (!inviteToken) return;
    const url = getInviteUrl(inviteToken);
    if (navigator.share) {
      try {
        await navigator.share({ title: "Join my Anren household", url });
      } catch {}
    } else {
      handleCopy();
    }
  };

  const handleRevoke = async () => {
    await revokeInvite();
    toast.success("Invite link revoked");
  };

  const handleRemovePartner = async () => {
    await removePartner();
    toast.success("Partner removed");
  };

  return (
    <section>
      <h2 className="text-section-header text-text-muted-color mb-4">Partner</h2>
      <div className="rounded-2xl border border-divider-color/25 p-4 space-y-4 bg-card-bg-color/50">
        {partner ? (
          <>
            <div className="flex items-center gap-3">
              <Users className="w-4 h-4 text-text-muted-color shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {partner.displayName || "Your partner"}
                </p>
                <p className="text-xs text-text-muted-color">
                  Joined {new Date(partner.joinedAt).toLocaleDateString()}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemovePartner}
                className="text-destructive shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </>
        ) : inviteToken ? (
          <>
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-text-muted-color shrink-0" />
              <span className="text-caption text-text-primary">
                Invite link active
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="flex-1"
              >
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                Share link
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRevoke}
                className="text-destructive shrink-0"
              >
                Revoke
              </Button>
            </div>
            <p className="text-micro text-text-muted-color">
              Your partner can use this link to create an account and see what you're holding.
            </p>
          </>
        ) : (
          <>
            <p className="text-caption text-text-muted-color">
              Invite your partner to see what you're holding. They'll get a read-only view of your items.
            </p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="accent-btn w-full py-3 rounded-full text-button inline-flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : (
                <Users className="w-4 h-4 mr-1.5" />
              )}
              {generating ? "Creating…" : "Invite partner"}
            </Button>
          </>
        )}
      </div>
    </section>
  );
}
