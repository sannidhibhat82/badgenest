import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Server,
  Database,
  Shield,
  Layers,
  Terminal,
  GitBranch,
  HardDrive,
  Activity,
  Cloud,
  CheckCircle,
  AlertTriangle,
  FileCode,
  Lock,
  Monitor,
  Box,
} from "lucide-react";
import badgenestLogo from "@/assets/badgenest-logo.png";

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-3 text-lg">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground leading-relaxed">
        {children}
      </CardContent>
    </Card>
  );
}

function TechRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <span className="font-medium text-foreground min-w-[140px] shrink-0">{label}</span>
      <span className="text-muted-foreground">{value}</span>
    </div>
  );
}

export default function MigrationGuide() {
  return (
    <>
      <Helmet>
        <title>Migration & Self-Hosting Guide — BadgeNest</title>
        <meta
          name="description"
          content="Technical guide for migrating BadgeNest to a self-hosted production environment. Covers tech stack, architecture, security, and deployment."
        />
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto flex h-16 max-w-5xl items-center gap-4 px-6">
            <Link to="/" className="flex items-center gap-2">
              <img src={badgenestLogo} alt="BadgeNest" className="h-8 w-8" />
              <span className="text-lg font-bold text-foreground">BadgeNest</span>
            </Link>
            <Separator orientation="vertical" className="h-6" />
            <span className="text-sm text-muted-foreground font-medium">Migration & Self-Hosting Guide</span>
            <div className="ml-auto">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Link>
              </Button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-6 py-10 space-y-10">
          {/* Intro */}
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              Migration & Self-Hosting Guide
            </h1>
            <p className="mt-3 text-muted-foreground max-w-3xl leading-relaxed">
              This document provides all technical details your IT team needs to evaluate, migrate, and
              self-host the BadgeNest Digital Badge Platform in an internal production environment.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge variant="secondary">Fully Portable</Badge>
              <Badge variant="secondary">No Vendor Lock-in</Badge>
              <Badge variant="secondary">Open Standards</Badge>
            </div>
          </div>

          <Separator />

          {/* 1. Tech Stack */}
          <section id="tech-stack">
            <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Layers className="h-6 w-6 text-primary" />
              Technology Stack
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Frontend</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <TechRow label="Framework" value="React 18 (TypeScript)" />
                  <TechRow label="Build Tool" value="Vite 5" />
                  <TechRow label="Styling" value="Tailwind CSS 3 + shadcn/ui (Radix UI)" />
                  <TechRow label="Icons" value="Lucide React" />
                  <TechRow label="Routing" value="React Router v6" />
                  <TechRow label="State / Cache" value="TanStack React Query v5" />
                  <TechRow label="Forms" value="React Hook Form + Zod validation" />
                  <TechRow label="Charts" value="Recharts" />
                  <TechRow label="PDF Export" value="jsPDF + html2canvas" />
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Backend</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <TechRow label="Platform" value="Next.js API (Node.js)" />
                  <TechRow label="Database" value="Microsoft SQL Server" />
                  <TechRow label="Auth" value="JWT (email/password, local)" />
                  <TechRow label="File Storage" value="Local filesystem (uploads)" />
                  <TechRow label="Language" value="TypeScript + SQL" />
                </CardContent>
              </Card>
            </div>
          </section>

          <Separator />

          {/* 2. Architecture */}
          <section id="architecture">
            <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Box className="h-6 w-6 text-primary" />
              Architecture Overview
            </h2>

            <Card className="border-border/60 overflow-hidden">
              <CardContent className="p-6">
                <pre className="text-xs md:text-sm text-muted-foreground font-mono leading-relaxed overflow-x-auto">
{`┌──────────────────────────────────────────────────────────┐
│                     Frontend (SPA)                       │
│       React 18 + Vite + Tailwind + shadcn/ui             │
├──────────────────────────────────────────────────────────┤
│                   React Router v6                        │
│  /login  /signup  /dashboard  /admin/*  /verify/:id      │
├──────────────────────────────────────────────────────────┤
│                   REST API client                         │
│         Auth (JWT) · API routes (Next.js)                 │
├──────────────────────────────────────────────────────────┤
│                  Next.js Backend (API)                    │
│  ┌────────────┬──────────┬───────────┬────────────────┐  │
│  │ SQL Server │ JWT Auth │  Uploads  │  API Routes    │  │
│  │  (MSSQL)   │ (bcrypt) │ (local)   │  (Next.js)     │  │
│  └────────────┴──────────┴───────────┴────────────────┘  │
└──────────────────────────────────────────────────────────┘`}
                </pre>
              </CardContent>
            </Card>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border p-4">
                <p className="font-medium text-foreground text-sm">User Types</p>
                <ul className="mt-2 text-sm text-muted-foreground space-y-1">
                  <li>• <strong>Admin</strong> — Full platform management</li>
                  <li>• <strong>Learner</strong> — View & share earned badges</li>
                  <li>• <strong>Public</strong> — Verify badge authenticity</li>
                </ul>
              </div>
              <div className="rounded-lg border p-4">
                <p className="font-medium text-foreground text-sm">Key Directories</p>
                <ul className="mt-2 text-sm text-muted-foreground space-y-1 font-mono text-xs">
                  <li>src/pages/admin/* — Admin pages</li>
                  <li>src/contexts/ — Auth state</li>
                  <li>src/layouts/ — Shell layouts</li>
                  <li>backend/pages/api/ — API routes</li>
                  <li>backend/database/schema.sql — DB schema</li>
                </ul>
              </div>
              <div className="rounded-lg border p-4">
                <p className="font-medium text-foreground text-sm">Edge Functions</p>
                <ul className="mt-2 text-sm text-muted-foreground space-y-1">
                  <li>• <code className="text-xs bg-muted px-1 rounded">public-api</code> — REST API</li>
                  <li>• <code className="text-xs bg-muted px-1 rounded">sign-assertion</code> — HMAC signing</li>
                  <li>• <code className="text-xs bg-muted px-1 rounded">bulk-sign-assertions</code> — Batch sign</li>
                  <li>• <code className="text-xs bg-muted px-1 rounded">send-badge-notification</code> — Email</li>
                </ul>
              </div>
            </div>
          </section>

          <Separator />

          {/* 3. Portability */}
          <section id="portability">
            <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Cloud className="h-6 w-6 text-primary" />
              Portability & Export
            </h2>

            <SectionCard icon={CheckCircle} title="Fully Portable — No Vendor Lock-in">
              <p>
                The entire codebase is a standard <strong>React + Vite + TypeScript</strong> application
                backed by <strong>Next.js API and Microsoft SQL Server</strong>. There are no proprietary APIs or locked-in services. The project can be exported, version-controlled via Git,
                and deployed to any infrastructure.
              </p>
              <ul className="mt-3 space-y-2 list-disc list-inside">
                <li>Frontend: Standard <code className="text-xs bg-muted px-1 rounded">npm run build</code> produces a static <code className="text-xs bg-muted px-1 rounded">dist/</code> folder</li>
                <li>Backend: Schema is in <code className="text-xs bg-muted px-1 rounded">backend/database/schema.sql</code></li>
                <li>Backend: Next.js API routes, JWT auth, local file uploads</li>
                <li>No proprietary SDKs — REST API and JWT auth</li>
              </ul>
            </SectionCard>
          </section>

          <Separator />

          {/* 4. Database */}
          <section id="database">
            <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Database className="h-6 w-6 text-primary" />
              Database Schema & Migrations
            </h2>

            <div className="space-y-4">
              <SectionCard icon={FileCode} title="Schema Export">
                <p>
                  All database schema changes are captured as sequential SQL migration files in{" "}
                  <code className="text-xs bg-muted px-1 rounded">backend/database/schema.sql</code>. This includes table
                  creation, RLS policies, triggers, and database functions.
                </p>
                <div className="mt-3 rounded-md bg-muted/50 p-3 font-mono text-xs">
                  <p># Apply schema to SQL Server</p>
                  <p>sqlcmd -S localhost -d badgenest -i backend/database/schema.sql</p>
                  <p className="mt-2"># Or run schema.sql in SSMS / Azure Data Studio</p>
                </div>
              </SectionCard>

              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Core Tables</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-2 md:grid-cols-2 text-sm">
                    {[
                      { name: "users", desc: "User accounts and profile data" },
                      { name: "user_roles", desc: "RBAC roles (admin, learner)" },
                      { name: "issuers", desc: "Badge-issuing organizations" },
                      { name: "badge_classes", desc: "Badge templates/definitions" },
                      { name: "assertions", desc: "Issued badge instances" },
                      { name: "badge_invites", desc: "Claim invitation links" },
                      { name: "badge_categories", desc: "Badge categorization" },
                      { name: "badge_views", desc: "Public verification view tracking" },
                      { name: "notifications", desc: "In-app user notifications" },
                      { name: "audit_logs", desc: "Admin action audit trail" },
                      { name: "api_keys", desc: "API key management" },
                      { name: "webhooks", desc: "Webhook endpoint configuration" },
                      { name: "tags", desc: "Learner profile tags" },
                      { name: "profile_tags", desc: "Profile-to-tag associations" },
                    ].map((t) => (
                      <div key={t.name} className="flex items-start gap-2 py-1">
                        <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono shrink-0">{t.name}</code>
                        <span className="text-muted-foreground text-xs">{t.desc}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <Separator />

          {/* 5. Auth & Security */}
          <section id="security">
            <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Authentication & Security
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <SectionCard icon={Lock} title="Authentication">
                <ul className="space-y-2">
                  <li><strong>Method:</strong> Email/password, JWT (local)</li>
                  <li><strong>Sessions:</strong> JWT tokens with automatic refresh</li>
                  <li><strong>Password Reset:</strong> Email-based reset flow</li>
                  <li><strong>New User Trigger:</strong> Auto-creates profile + assigns learner role</li>
                  <li><strong>Frontend Guard:</strong> ProtectedRoute component with role checks</li>
                </ul>
              </SectionCard>

              <SectionCard icon={Shield} title="Security Architecture">
                <ul className="space-y-2">
                  <li><strong>RBAC:</strong> Separate <code className="text-xs bg-muted px-1 rounded">user_roles</code> table (not on profiles)</li>
                  <li><strong>RLS:</strong> Row-Level Security on every table</li>
                  <li><strong>Security Definer:</strong> <code className="text-xs bg-muted px-1 rounded">has_role()</code> function prevents RLS recursion</li>
                  <li><strong>Badge Integrity:</strong> HMAC-SHA256 signatures with frozen snapshots</li>
                  <li><strong>API Auth:</strong> Hashed API keys with granular permissions</li>
                  <li><strong>Webhooks:</strong> HMAC-signed payloads</li>
                </ul>
              </SectionCard>
            </div>
          </section>

          <Separator />

          {/* 6. Self-hosting */}
          <section id="self-hosting">
            <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Server className="h-6 w-6 text-primary" />
              Self-Hosting Requirements
            </h2>

            <div className="space-y-4">
              <SectionCard icon={Monitor} title="Frontend Deployment">
                <p>The frontend builds to a static SPA. Host it on any static file server:</p>
                <ul className="mt-2 space-y-1 list-disc list-inside">
                  <li><strong>Nginx / Apache</strong> — Serve <code className="text-xs bg-muted px-1 rounded">dist/</code> with SPA fallback to <code className="text-xs bg-muted px-1 rounded">index.html</code></li>
                  <li><strong>S3 + CloudFront</strong> — Static hosting with CDN</li>
                  <li><strong>Vercel / Netlify / Cloudflare Pages</strong> — Zero-config deployment</li>
                  <li><strong>Docker</strong> — Nginx container serving built assets</li>
                </ul>
                <div className="mt-3 rounded-md bg-muted/50 p-3 font-mono text-xs">
                  <p>npm install</p>
                  <p>npm run build</p>
                  <p># Output: dist/ folder ready for static hosting</p>
                </div>
              </SectionCard>

              <SectionCard icon={Database} title="Backend Deployment">
                <p>Running the backend locally:</p>
                <div className="mt-3 space-y-3">
                  <div className="rounded-md border p-3">
                    <p className="font-medium text-foreground text-sm">Option A: Local development</p>
                    <ul className="mt-1 text-xs space-y-1 list-disc list-inside">
                      <li>Install and run Microsoft SQL Server locally or use a hosted instance</li>
                      <li>Create a database and run <code className="bg-muted px-1 rounded">backend/database/schema.sql</code></li>
                      <li>Configure <code className="bg-muted px-1 rounded">backend/.env</code> with DB_* and JWT_SECRET</li>
                      <li>Set <code className="bg-muted px-1 rounded">VITE_API_URL</code> and configure <code className="bg-muted px-1 rounded">backend/.env</code> (DB_*, JWT_SECRET)</li>
                    </ul>
                  </div>
                  <div className="rounded-md border p-3">
                    <p className="font-medium text-foreground text-sm">Option B: Production</p>
                    <ul className="mt-1 text-xs space-y-1 list-disc list-inside">
                      <li>Deploy Next.js backend (Node host, Vercel, or Docker)</li>
                      <li>Use hosted SQL Server or self-hosted MSSQL</li>
                      <li>Run backend/database/schema.sql on your database</li>
                    </ul>
                  </div>
                </div>
              </SectionCard>

              <SectionCard icon={HardDrive} title="Environment Variables">
                <div className="rounded-md bg-muted/50 p-3 font-mono text-xs space-y-1">
                  <p># Required for the frontend</p>
                  <p>VITE_API_URL=http://localhost:3001</p>
                  <p>Backend backend/.env: DB_SERVER=... DB_DATABASE=badgenest JWT_SECRET=...</p>
                </div>
              </SectionCard>
            </div>
          </section>

          <Separator />

          {/* 7. Multi-env */}
          <section id="environments">
            <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <GitBranch className="h-6 w-6 text-primary" />
              Multi-Environment Support
            </h2>

            <SectionCard icon={GitBranch} title="Dev / Staging / Production">
              <p>Use separate .env files per environment (e.g. .env.development, .env.production) with different DB_* and JWT_SECRET.</p>
              <ul className="mt-3 space-y-1 list-disc list-inside">
                <li>Each environment can use its own database and secrets</li>
                <li>Migrations are applied identically across all environments via CI/CD</li>
                <li>Vite automatically loads the correct <code className="text-xs bg-muted px-1 rounded">.env.[mode]</code> file</li>
                <li>Use <code className="text-xs bg-muted px-1 rounded">npm run build -- --mode staging</code> to target specific environments</li>
              </ul>
            </SectionCard>
          </section>

          <Separator />

          {/* 8. Backup & DR */}
          <section id="backup">
            <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <HardDrive className="h-6 w-6 text-primary" />
              Backup & Disaster Recovery
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <SectionCard icon={Database} title="Database Backups">
                <ul className="space-y-2">
                  <li><strong>SQL Server:</strong> Use your provider&apos;s backup or scheduled backups</li>
                  <li><strong>Self-hosted:</strong> Schedule <code className="text-xs bg-muted px-1 rounded">pg_dump</code> via cron</li>
                  <li><strong>Schema:</strong> Version-controlled in <code className="text-xs bg-muted px-1 rounded">backend/database/schema.sql</code></li>
                </ul>
              </SectionCard>

              <SectionCard icon={HardDrive} title="Storage & Assets">
                <ul className="space-y-2">
                  <li>Three storage buckets: <code className="text-xs bg-muted px-1 rounded">badge-images</code>, <code className="text-xs bg-muted px-1 rounded">issuer-logos</code>, <code className="text-xs bg-muted px-1 rounded">avatars</code></li>
                  <li>Export uploads from <code className="bg-muted px-1 rounded">backend/public/uploads</code></li>
                  <li>Self-hosted: Back up the storage volume alongside PostgreSQL</li>
                </ul>
              </SectionCard>
            </div>
          </section>

          <Separator />

          {/* 9. Logging & Monitoring */}
          <section id="monitoring">
            <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              Logging & Monitoring
            </h2>

            <SectionCard icon={Activity} title="Built-in & External Monitoring">
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-foreground text-sm mb-1">Built-in Audit Trail</p>
                  <p>The <code className="text-xs bg-muted px-1 rounded">audit_logs</code> table records all admin actions (badge issuance, revocations, API key changes) with actor, action, entity, and timestamp. Searchable and filterable from the admin dashboard.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm mb-1">Badge View Analytics</p>
                  <p>The <code className="text-xs bg-muted px-1 rounded">badge_views</code> table tracks public verification page visits with anonymized viewer hashes.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground text-sm mb-1">External Integration Points</p>
                  <ul className="list-disc list-inside text-xs space-y-1 mt-1">
                    <li><strong>Error Tracking:</strong> Add Sentry SDK for frontend error reporting</li>
                    <li><strong>APM:</strong> Use Node.js monitoring (e.g. PM2, Datadog)</li>
                    <li><strong>Log Aggregation:</strong> Pipe PostgreSQL and Edge Function logs to ELK/Datadog</li>
                    <li><strong>Uptime:</strong> Monitor the frontend and backend API URL</li>
                  </ul>
                </div>
              </div>
            </SectionCard>
          </section>

          <Separator />

          {/* 10. Deployment Checklist */}
          <section id="checklist">
            <h2 className="text-2xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Terminal className="h-6 w-6 text-primary" />
              Deployment Checklist
            </h2>

            <Card className="border-border/60">
              <CardContent className="p-6">
                <ol className="space-y-3 text-sm">
                  {[
                    "Provision SQL Server and run backend/database/schema.sql",
                    "Apply schema: run backend/database/schema.sql against SQL Server",
                    "Create storage buckets: badge-images, issuer-logos, avatars",
                    "Start backend: npm run dev:backend",
                    "Set VITE_API_URL and backend/.env (DB_*, JWT_SECRET)",
                    "Build frontend: npm run build",
                    "Deploy dist/ to static host with SPA fallback",
                    "Create initial admin user and assign admin role in user_roles table",
                    "Configure DNS and TLS certificates",
                    "Verify badge issuance, signing, and public verification flow",
                    "Set up automated database backups",
                    "Configure monitoring and alerting",
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {i + 1}
                      </span>
                      <span className="text-muted-foreground">{step}</span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          </section>

          <Separator />

          {/* Important notes */}
          <section id="notes">
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-6 flex gap-4">
                <AlertTriangle className="h-6 w-6 text-destructive shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground space-y-2">
                  <p className="font-semibold text-foreground">Important Notes</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Keep <code className="text-xs bg-muted px-1 rounded">JWT_SECRET</code> and DB credentials secret; rotate periodically.</li>
                    <li>Storage buckets are configured as <strong>public read</strong>; uploads require authentication.</li>
                    <li>RLS policies enforce access control at the database level — never bypass them in production.</li>
                    <li>Password reset and email notifications require custom implementation (e.g. SMTP or a transactional email API).</li>
                    <li>For production, enable email confirmation on signup and configure rate limiting.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </section>

          <div className="pb-10 text-center text-xs text-muted-foreground">
            BadgeNest Migration Guide — Last updated March 2026
          </div>
        </main>
      </div>
    </>
  );
}
