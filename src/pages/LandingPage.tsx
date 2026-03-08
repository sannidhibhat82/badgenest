import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Award,
  Shield,
  Share2,
  Users,
  ArrowRight,
  CheckCircle,
  Globe,
  Zap,
  Lock,
  BarChart3,
} from "lucide-react";
import badgenestLogo from "@/assets/badgenest-logo.png";

const features = [
  {
    icon: Award,
    title: "Issue Digital Badges",
    description: "Create and issue verifiable digital credentials that represent skills, achievements, and certifications.",
  },
  {
    icon: Shield,
    title: "Tamper-Proof Verification",
    description: "Every badge is cryptographically signed and independently verifiable via a unique public URL.",
  },
  {
    icon: Share2,
    title: "Share Anywhere",
    description: "Learners can share badges on LinkedIn, Twitter, and embed them in portfolios with one click.",
  },
  {
    icon: Users,
    title: "Learner Portfolios",
    description: "Each learner gets a public badge portfolio showcasing all their earned credentials.",
  },
  {
    icon: BarChart3,
    title: "Analytics & Insights",
    description: "Track badge issuance, verification views, and learner engagement with detailed analytics.",
  },
  {
    icon: Lock,
    title: "Enterprise-Grade Security",
    description: "Role-based access, row-level security, and audit logging keep your data safe and compliant.",
  },
];

const stats = [
  { value: "Open Badges", label: "Standard Compliant" },
  { value: "Instant", label: "Verification" },
  { value: "Secure", label: "Signed Credentials" },
  { value: "Portable", label: "Share Anywhere" },
];

export default function LandingPage() {
  return (
    <>
      <Helmet>
        <title>BadgeNest — Digital Badge Platform</title>
        <meta
          name="description"
          content="Issue, earn, and verify tamper-proof digital badges. Open Badges compliant credentialing platform by BadgeNest."
        />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Navigation */}
        <nav className="sticky top-0 z-50 glass">
          <div className="container mx-auto flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2.5">
              <img src={evolveLogo} alt="Evolve Careers" className="h-8" />
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/docs">Documentation</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/login">Sign In</Link>
              </Button>
              <Button size="sm" asChild>
                <Link to="/signup">
                  Get Started <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 gradient-mesh" />
          <div className="absolute top-20 -right-32 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-32 w-[400px] h-[400px] bg-secondary/5 rounded-full blur-3xl" />

          <div className="relative container mx-auto max-w-5xl px-4 py-24 md:py-36 text-center">
            <div className="animate-slide-up space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                <Zap className="h-3.5 w-3.5" />
                Open Badges Compliant
              </div>

              <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
                Digital credentials that
                <br />
                <span className="text-primary">prove what you know</span>
              </h1>

              <p className="mx-auto max-w-2xl text-lg text-muted-foreground leading-relaxed">
                Issue, earn, and verify tamper-proof digital badges. Empower your learners
                with portable, shareable credentials that employers trust.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
                <Button size="lg" className="h-12 px-8 text-sm font-semibold" asChild>
                  <Link to="/signup">
                    Start Issuing Badges <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="h-12 px-8 text-sm font-semibold" asChild>
                  <Link to="/docs">
                    <Globe className="mr-2 h-4 w-4" />
                    Read the Docs
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Stats bar */}
        <section className="border-y border-border/60 bg-card/50 backdrop-blur-sm">
          <div className="container mx-auto max-w-5xl px-4 py-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              {stats.map((stat) => (
                <div key={stat.label}>
                  <p className="text-lg font-bold text-primary">{stat.value}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="container mx-auto max-w-5xl px-4 py-20 md:py-28">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Everything you need for digital credentialing
            </h2>
            <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
              A complete platform for organizations to create, issue, and manage verifiable digital badges at scale.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 stagger-children">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={feature.title}
                  className="group border-border/60 hover:border-primary/20 hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                >
                  <CardContent className="p-6">
                    <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-base font-semibold text-foreground mb-1.5">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* How it works */}
        <section className="bg-muted/30 border-y border-border/60">
          <div className="container mx-auto max-w-5xl px-4 py-20 md:py-28">
            <div className="text-center mb-14">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">How it works</h2>
              <p className="mt-3 text-muted-foreground">Three simple steps to start issuing credentials</p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  step: "01",
                  title: "Create Badge Classes",
                  desc: "Design your badges with custom artwork, criteria, and optional expiration periods.",
                },
                {
                  step: "02",
                  title: "Issue to Learners",
                  desc: "Award badges individually or in bulk via CSV. Each badge is signed and timestamped.",
                },
                {
                  step: "03",
                  title: "Verify & Share",
                  desc: "Learners share their badges anywhere. Anyone can verify authenticity via a public URL.",
                },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-xl font-bold">
                    {item.step}
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="container mx-auto max-w-5xl px-4 py-20 md:py-28">
          <div className="relative overflow-hidden rounded-3xl bg-primary p-10 md:p-16 text-center">
            <div className="absolute top-0 right-0 w-80 h-80 bg-primary-foreground/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-60 h-60 bg-primary-foreground/10 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl" />

            <div className="relative z-10 space-y-5">
              <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground">
                Ready to start issuing badges?
              </h2>
              <p className="text-primary-foreground/70 max-w-lg mx-auto">
                Join organizations using Evolve Careers to issue verifiable, portable digital credentials.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Button
                  size="lg"
                  variant="secondary"
                  className="h-12 px-8 text-sm font-semibold bg-primary-foreground text-primary hover:bg-primary-foreground/90"
                  asChild
                >
                  <Link to="/signup">
                    Create Free Account <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 px-8 text-sm font-semibold border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10"
                  asChild
                >
                  <Link to="/login">Sign In</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/60">
          <div className="container mx-auto max-w-5xl px-4 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <img src={evolveLogo} alt="Evolve Careers" className="h-6" />
                <Separator orientation="vertical" className="h-4" />
                <span className="text-xs text-muted-foreground">
                  © {new Date().getFullYear()} Evolve Careers. All rights reserved.
                </span>
              </div>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <Link to="/docs" className="hover:text-foreground transition-colors">
                  Documentation
                </Link>
                <Link to="/login" className="hover:text-foreground transition-colors">
                  Sign In
                </Link>
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 text-success" />
                  Open Badges Compliant
                </span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
