import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { invites as invitesApi } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, CheckCircle, Gift, ArrowRight, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import badgenestLogo from "@/assets/badgenest-logo.png";

export default function ClaimBadge() {
  const { token } = useParams<{ token: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: invite, isLoading, error } = useQuery({
    queryKey: ["badge-invite", token],
    queryFn: () => invitesApi.getByToken(token!),
    enabled: !!token,
  });

  const claimMutation = useMutation({
    mutationFn: () => invitesApi.claim(invite!.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["badge-invite", token] });
      toast({ title: "Badge claimed!", description: "The badge has been added to your portfolio." });
      navigate("/dashboard");
    },
    onError: (e: Error) => toast({ title: "Claim failed", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-background gradient-mesh">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Loading invite…</p>
      </div>
    </div>
  );

  if (error || !invite) return (
    <div className="min-h-screen flex items-center justify-center bg-background gradient-mesh px-4">
      <Card className="max-w-md w-full border-border/60 shadow-card animate-scale-in">
        <CardContent className="text-center py-12">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
            <Award className="h-8 w-8 text-destructive" />
          </div>
          <p className="text-lg font-semibold text-foreground">Invalid or expired invite</p>
          <p className="text-sm text-muted-foreground mt-1">This link may have already been used or doesn't exist.</p>
          <Link to="/" className="text-primary hover:underline text-sm mt-4 block font-medium">Go to homepage</Link>
        </CardContent>
      </Card>
    </div>
  );

  const badge = invite.badge_classes;
  const issuer = invite.issuer;
  const isClaimed = invite.status === "claimed";

  return (
    <div className="min-h-screen bg-background gradient-mesh flex items-center justify-center px-4 py-12">
      <Card className="max-w-md w-full border-border/60 shadow-elevated animate-scale-in overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-primary via-secondary to-primary" />

        <CardHeader className="text-center pt-8 pb-4">
          <img src={badgenestLogo} alt="BadgeNest" className="mx-auto mb-6 h-10 w-auto" />
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            {isClaimed ? <CheckCircle className="h-7 w-7 text-success" /> : <Gift className="h-7 w-7 text-primary animate-float" />}
          </div>
          <CardTitle className="text-2xl">
            {isClaimed ? "Badge Already Claimed" : "You've Been Invited!"}
          </CardTitle>
          <CardDescription className="mt-1">
            {isClaimed ? "This badge invite has already been claimed." : `Claim the "${badge?.name}" badge below.`}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6 pb-8">
          <div className="flex items-center gap-4 rounded-xl border border-border/60 bg-muted/30 p-4">
            {badge?.image_url ? (
              <img src={badge.image_url} alt={badge.name} className="h-16 w-16 rounded-xl object-contain border border-border/60 bg-card p-1" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
                <Award className="h-8 w-8 text-primary" />
              </div>
            )}
            <div className="min-w-0">
              <p className="font-semibold text-foreground">{badge?.name}</p>
              {issuer && <p className="text-sm text-muted-foreground">by {issuer.name}</p>}
              {badge?.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{badge.description}</p>}
            </div>
          </div>

          {isClaimed ? (
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">This invite was already claimed.</p>
              <Button asChild className="w-full">
                <Link to="/dashboard">Go to Dashboard <ArrowRight className="ml-1 h-4 w-4" /></Link>
              </Button>
            </div>
          ) : !user ? (
            <div className="space-y-4">
              <p className="text-sm text-center text-muted-foreground">Sign in or create an account to claim this badge.</p>
              <div className="flex gap-2">
                <Button asChild className="flex-1">
                  <Link to={`/login?redirect=/claim/${token}`}>Sign In</Link>
                </Button>
                <Button asChild variant="outline" className="flex-1">
                  <Link to={`/signup?redirect=/claim/${token}`}>Sign Up</Link>
                </Button>
              </div>
            </div>
          ) : (
            <Button onClick={() => claimMutation.mutate()} disabled={claimMutation.isPending} className="w-full h-12 text-sm font-semibold" size="lg">
              {claimMutation.isPending ? "Claiming…" : <><Sparkles className="mr-2 h-4 w-4" />Claim Badge</>}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
