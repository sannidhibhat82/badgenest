import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, CheckCircle, Gift } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import evolveLogo from "@/assets/evolve-logo.png";

export default function ClaimBadge() {
  const { token } = useParams<{ token: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: invite, isLoading, error } = useQuery({
    queryKey: ["badge-invite", token],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("badge_invites")
        .select("*, badge_classes(name, description, image_url, issuer_id)")
        .eq("invite_token", token!)
        .single();
      if (error) throw error;

      // Fetch issuer
      if (data.badge_classes) {
        const { data: issuer } = await supabase
          .from("issuers")
          .select("name, logo_url")
          .eq("id", (data.badge_classes as any).issuer_id)
          .single();
        return { ...data, issuer };
      }
      return data;
    },
    enabled: !!token,
  });

  const claimMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("You must be signed in to claim a badge");
      if (!invite) throw new Error("Invalid invite");

      // Create assertion
      const { error: assertErr } = await supabase.from("assertions").insert({
        recipient_id: user.id,
        badge_class_id: invite.badge_class_id,
        evidence_url: invite.evidence_url || null,
      });
      if (assertErr) throw assertErr;

      // Mark invite as claimed
      const { error: updateErr } = await supabase
        .from("badge_invites")
        .update({ status: "claimed", claimed_by: user.id, claimed_at: new Date().toISOString() })
        .eq("id", invite.id);
      if (updateErr) throw updateErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["badge-invite", token] });
      toast({ title: "Badge claimed!", description: "The badge has been added to your portfolio." });
      navigate("/dashboard");
    },
    onError: (e: Error) => toast({ title: "Claim failed", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading invite…</p></div>;
  if (error || !invite) return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="max-w-md w-full mx-4">
        <CardContent className="text-center py-10">
          <p className="text-destructive font-medium">Invalid or expired invite link.</p>
          <Link to="/" className="text-primary hover:underline text-sm mt-2 block">Go to homepage</Link>
        </CardContent>
      </Card>
    </div>
  );

  const badge = invite.badge_classes as any;
  const issuer = (invite as any).issuer;
  const isClaimed = invite.status === "claimed";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <img src={evolveLogo} alt="Evolve Careers" className="mx-auto mb-4 h-10 w-auto" />
          <Gift className="mx-auto h-12 w-12 text-primary mb-3" />
          <CardTitle className="text-2xl">
            {isClaimed ? "Badge Already Claimed" : "You've Been Invited!"}
          </CardTitle>
          <CardDescription>
            {isClaimed
              ? "This badge invite has already been claimed."
              : `You've been invited to claim the "${badge?.name}" badge.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Badge preview */}
          <div className="flex items-center gap-4 rounded-lg border p-4">
            {badge?.image_url ? (
              <img src={badge.image_url} alt={badge.name} className="h-16 w-16 rounded-lg object-contain border" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
                <Award className="h-8 w-8 text-primary" />
              </div>
            )}
            <div>
              <p className="font-semibold text-foreground">{badge?.name}</p>
              {issuer && <p className="text-sm text-muted-foreground">by {issuer.name}</p>}
              {badge?.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{badge.description}</p>}
            </div>
          </div>

          {isClaimed ? (
            <div className="text-center">
              <CheckCircle className="mx-auto h-8 w-8 text-green-600 mb-2" />
              <p className="text-sm text-muted-foreground">This invite was already claimed.</p>
              <Button asChild className="mt-4 w-full"><Link to="/dashboard">Go to Dashboard</Link></Button>
            </div>
          ) : !user ? (
            <div className="space-y-3">
              <p className="text-sm text-center text-muted-foreground">Sign in or create an account to claim this badge.</p>
              <div className="flex gap-2">
                <Button asChild className="flex-1"><Link to={`/login?redirect=/claim/${token}`}>Sign In</Link></Button>
                <Button asChild variant="outline" className="flex-1"><Link to={`/signup?redirect=/claim/${token}`}>Sign Up</Link></Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => claimMutation.mutate()} disabled={claimMutation.isPending} className="w-full" size="lg">
              {claimMutation.isPending ? "Claiming…" : "Claim Badge"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
