import { useState } from "react";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import badgenestLogo from "@/assets/badgenest-logo.png";
import { Award, ArrowRight } from "lucide-react";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect");
  const { toast } = useToast();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: "Signup failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Account created!", description: "Check your email to confirm, or sign in if auto-confirmed." });
      navigate(redirect || "/login");
    }
  };

  // Password strength
  const strength = password.length === 0 ? 0 : password.length < 6 ? 1 : password.length < 10 ? 2 : 3;
  const strengthColors = ["bg-muted", "bg-destructive", "bg-warning", "bg-success"];
  const strengthLabels = ["", "Weak", "Fair", "Strong"];

  return (
    <div className="flex min-h-screen">
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-primary">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-secondary to-primary opacity-90" />
        <div className="absolute top-1/3 -right-20 w-96 h-96 rounded-full bg-primary-foreground/5 blur-3xl" />
        <div className="absolute bottom-1/3 left-10 w-72 h-72 rounded-full bg-primary-foreground/10 blur-3xl" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-primary-foreground">
          <img src={evolveLogo} alt="Evolve Careers" className="h-10 w-auto brightness-0 invert" />
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary-foreground/10 px-4 py-2 text-sm font-medium backdrop-blur-sm">
              <Award className="h-4 w-4" />
              Start Your Journey
            </div>
            <h2 className="text-4xl font-bold leading-tight">
              Build your digital<br />credential portfolio.
            </h2>
            <p className="text-lg text-primary-foreground/70 max-w-md">
              Join thousands of learners showcasing verified skills with portable digital badges.
            </p>
          </div>
          <p className="text-xs text-primary-foreground/40">© {new Date().getFullYear()} Evolve Careers</p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="mb-8 lg:hidden">
            <img src={evolveLogo} alt="Evolve Careers" className="h-10 w-auto" />
          </div>

          <div className="space-y-2 mb-8">
            <h1 className="text-3xl font-bold text-foreground">Create account</h1>
            <p className="text-muted-foreground">Sign up to start earning badges</p>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
              <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required placeholder="Jane Doe" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" className="h-11" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" minLength={6} className="h-11" />
              {password.length > 0 && (
                <div className="flex items-center gap-2 pt-1">
                  <div className="flex gap-1 flex-1">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= strength ? strengthColors[strength] : "bg-muted"}`} />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">{strengthLabels[strength]}</span>
                </div>
              )}
            </div>
            <Button type="submit" className="w-full h-11 text-sm font-semibold" disabled={loading}>
              {loading ? "Creating account…" : (
                <>Create Account <ArrowRight className="ml-1 h-4 w-4" /></>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
