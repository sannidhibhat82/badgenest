import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ChevronRight,
  Menu,
  Search,
  Shield,
  Zap,
  Globe,
  Lock,
  BarChart3,
  Users,
  Award,
  Code,
  FileText,
  CheckCircle2,
  XCircle,
  MinusCircle,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import badgenestLogo from "@/assets/badgenest-logo.png";

/* ------------------------------------------------------------------ */
/*  Types & Data                                                      */
/* ------------------------------------------------------------------ */

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  children?: { id: string; title: string }[];
}

const sections: Section[] = [
  {
    id: "overview",
    title: "Platform Overview",
    icon: <Globe className="h-4 w-4" />,
  },
  {
    id: "why-evolve",
    title: "Why BadgeNest?",
    icon: <Zap className="h-4 w-4" />,
  },
  {
    id: "comparison",
    title: "Competitive Comparison",
    icon: <BarChart3 className="h-4 w-4" />,
  },
  {
    id: "features",
    title: "Feature Highlights",
    icon: <Award className="h-4 w-4" />,
    children: [
      { id: "features-admin", title: "Admin Dashboard" },
      { id: "features-learner", title: "Learner Dashboard" },
      { id: "features-verification", title: "Public Verification" },
      { id: "features-invites", title: "Badge Invites & Claims" },
      { id: "features-analytics", title: "Analytics & Reporting" },
    ],
  },
  {
    id: "architecture",
    title: "Architecture & Tech Stack",
    icon: <Code className="h-4 w-4" />,
  },
  {
    id: "security",
    title: "Security & Data Integrity",
    icon: <Shield className="h-4 w-4" />,
    children: [
      { id: "security-auth", title: "Authentication & RBAC" },
      { id: "security-rls", title: "Row-Level Security" },
      { id: "security-signatures", title: "Cryptographic Signatures" },
      { id: "security-snapshots", title: "Immutable Snapshots" },
    ],
  },
  {
    id: "api",
    title: "API & Integrations",
    icon: <FileText className="h-4 w-4" />,
    children: [
      { id: "api-rest", title: "REST API" },
      { id: "api-webhooks", title: "Webhooks" },
      { id: "api-keys", title: "API Key Management" },
    ],
  },
  {
    id: "database",
    title: "Database Schema",
    icon: <Lock className="h-4 w-4" />,
  },
  {
    id: "users",
    title: "User Roles & Permissions",
    icon: <Users className="h-4 w-4" />,
  },
];

/* ------------------------------------------------------------------ */
/*  Small Helpers                                                     */
/* ------------------------------------------------------------------ */

const Yes = () => <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />;
const No = () => <XCircle className="h-4 w-4 text-destructive mx-auto" />;
const Partial = () => (
  <MinusCircle className="h-4 w-4 text-yellow-500 mx-auto" />
);

const SectionHeading = ({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) => (
  <h2
    id={id}
    className="text-2xl font-bold tracking-tight text-foreground mt-12 mb-4 scroll-mt-20 border-b border-border pb-2"
  >
    {children}
  </h2>
);

const SubHeading = ({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) => (
  <h3
    id={id}
    className="text-lg font-semibold text-foreground mt-8 mb-3 scroll-mt-20"
  >
    {children}
  </h3>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <p className="text-muted-foreground leading-relaxed mb-4">{children}</p>
);

const FeatureCard = ({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) => (
  <div className="rounded-xl border border-border bg-card p-5 hover:shadow-md transition-shadow">
    <div className="flex items-center gap-3 mb-2">
      <div className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</div>
      <h4 className="font-semibold text-card-foreground">{title}</h4>
    </div>
    <p className="text-sm text-muted-foreground leading-relaxed">
      {description}
    </p>
  </div>
);

/* ------------------------------------------------------------------ */
/*  TOC Sidebar                                                       */
/* ------------------------------------------------------------------ */

function TOC({
  activeId,
  search,
  onSearch,
  onNavigate,
}: {
  activeId: string;
  search: string;
  onSearch: (v: string) => void;
  onNavigate?: () => void;
}) {
  const filtered = sections.filter((s) => {
    const q = search.toLowerCase();
    if (s.title.toLowerCase().includes(q)) return true;
    return s.children?.some((c) => c.title.toLowerCase().includes(q));
  });

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <Link to="/" className="flex items-center gap-2 mb-4">
          <img src={badgenestLogo} alt="BadgeNest" className="h-7" />
          <span className="font-bold text-foreground text-sm">Docs</span>
        </Link>
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search docs…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <nav className="p-3 space-y-0.5">
          {filtered.map((s) => (
            <div key={s.id}>
              <a
                href={`#${s.id}`}
                onClick={onNavigate}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                  activeId === s.id
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {s.icon}
                {s.title}
              </a>
              {s.children && (
                <div className="ml-7 border-l border-border pl-2 space-y-0.5">
                  {s.children
                    .filter((c) =>
                      c.title.toLowerCase().includes(search.toLowerCase())
                    )
                    .map((c) => (
                      <a
                        key={c.id}
                        href={`#${c.id}`}
                        onClick={onNavigate}
                        className={`block rounded-md px-3 py-1.5 text-xs transition-colors ${
                          activeId === c.id
                            ? "text-primary font-medium"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {c.title}
                      </a>
                    ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </ScrollArea>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                         */
/* ------------------------------------------------------------------ */

export default function Documentation() {
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState("overview");
  const [mobileOpen, setMobileOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  // Intersection observer for active section tracking
  useEffect(() => {
    const ids = sections.flatMap((s) => [
      s.id,
      ...(s.children?.map((c) => c.id) ?? []),
    ]);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length > 0) {
          setActiveId(visible[0].target.id);
        }
      },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <Helmet>
        <title>Documentation — BadgeNest Digital Badge Platform</title>
        <meta
          name="description"
          content="Complete documentation for the BadgeNest Digital Badge Platform. Features, architecture, API reference, security, and competitive comparison."
        />
      </Helmet>

      <div className="flex min-h-screen bg-background">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-72 flex-col border-r border-border sticky top-0 h-screen">
          <TOC activeId={activeId} search={search} onSearch={setSearch} />
        </aside>

        {/* Mobile header */}
        <div className="lg:hidden fixed top-0 inset-x-0 z-40 h-14 flex items-center gap-3 border-b border-border bg-background/95 backdrop-blur px-4">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <SheetTitle className="sr-only">Documentation Navigation</SheetTitle>
              <TOC
                activeId={activeId}
                search={search}
                onSearch={setSearch}
                onNavigate={() => setMobileOpen(false)}
              />
            </SheetContent>
          </Sheet>
          <img src={badgenestLogo} alt="BadgeNest" className="h-6" />
          <span className="font-semibold text-foreground text-sm">
            Documentation
          </span>
        </div>

        {/* Content */}
        <main
          ref={contentRef}
          className="flex-1 min-w-0 lg:pt-0 pt-14"
        >
          <div className="max-w-4xl mx-auto px-6 py-10 lg:py-16">
            {/* Back link */}
            <Link
              to="/"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" /> Back to app
            </Link>

            {/* ---- OVERVIEW ---- */}
            <SectionHeading id="overview">Platform Overview</SectionHeading>
            <P>
              Evolve Careers is a <strong>private-label digital badge platform</strong> built for
              organisations that want full control over how they issue, manage, and verify professional
              credentials. Unlike SaaS marketplaces that lock you into their ecosystem, Evolve Careers
              gives you complete data ownership, white-label branding, and cryptographic verification —
              all on modern, open-source infrastructure.
            </P>
            <P>
              The platform supports the full credential lifecycle: designing badge classes, issuing
              assertions (with optional HMAC-SHA256 signatures), inviting learners to claim badges,
              public verification pages with JSON-LD metadata, analytics dashboards, audit trails, REST
              APIs, and webhook integrations.
            </P>
            <div className="grid sm:grid-cols-3 gap-4 my-6">
              {[
                { label: "Badge Classes", desc: "Design & manage credential templates" },
                { label: "Assertions", desc: "Issue, sign & revoke credentials" },
                { label: "Verification", desc: "Public, tamper-proof badge pages" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-border bg-card p-4 text-center"
                >
                  <div className="text-lg font-bold text-primary mb-1">
                    {item.label}
                  </div>
                  <div className="text-xs text-muted-foreground">{item.desc}</div>
                </div>
              ))}
            </div>

            {/* ---- WHY EVOLVE ---- */}
            <SectionHeading id="why-evolve">Why Evolve Careers?</SectionHeading>
            <P>
              Credential platforms like Credly, Accredible, and Badgr have made digital badges
              mainstream — but they come with trade-offs. Here's why organisations choose Evolve Careers
              instead:
            </P>
            <div className="grid sm:grid-cols-2 gap-4 my-6">
              <FeatureCard
                icon={<Lock className="h-5 w-5" />}
                title="Full Data Ownership"
                description="Your credential data lives in your own database. No vendor lock-in, no surprise API changes, no data held hostage."
              />
              <FeatureCard
                icon={<Shield className="h-5 w-5" />}
                title="Cryptographic Integrity"
                description="Every assertion is HMAC-SHA256 signed with an immutable snapshot. Tamper-proof by design, not by trust."
              />
              <FeatureCard
                icon={<Globe className="h-5 w-5" />}
                title="White-Label Ready"
                description="Your brand, your domain, your colours. No 'Powered by' badges forced on your learners' credentials."
              />
              <FeatureCard
                icon={<Code className="h-5 w-5" />}
                title="Open & Extensible API"
                description="Full REST API with webhook support. Integrate with your LMS, HR system, or any workflow — no middleware needed."
              />
              <FeatureCard
                icon={<Zap className="h-5 w-5" />}
                title="Transparent Pricing"
                description="No per-badge fees, no per-learner tiers. Predictable infrastructure costs that scale with your usage."
              />
              <FeatureCard
                icon={<BarChart3 className="h-5 w-5" />}
                title="Built-In Analytics"
                description="Track issuance trends, badge views, learner engagement, and export reports — all without third-party tools."
              />
            </div>

            {/* ---- COMPARISON ---- */}
            <SectionHeading id="comparison">Competitive Comparison</SectionHeading>
            <P>
              See how Evolve Careers stacks up against the most popular credentialing platforms on the
              features that matter most to organisations issuing at scale.
            </P>
            <div className="overflow-x-auto my-6 rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold min-w-[180px]">Feature</TableHead>
                    <TableHead className="text-center font-semibold">
                      <span className="text-primary">Evolve Careers</span>
                    </TableHead>
                    <TableHead className="text-center font-semibold">Credly</TableHead>
                    <TableHead className="text-center font-semibold">Accredible</TableHead>
                    <TableHead className="text-center font-semibold">Badgr / Canvas</TableHead>
                    <TableHead className="text-center font-semibold">Open Badge Factory</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    ["Full data ownership", true, false, false, "partial", "partial"],
                    ["White-label branding", true, false, true, false, true],
                    ["Cryptographic signing (HMAC)", true, false, false, false, false],
                    ["Immutable snapshots", true, false, false, false, false],
                    ["REST API included", true, true, true, true, true],
                    ["Webhook integrations", true, true, true, "partial", "partial"],
                    ["No per-badge pricing", true, false, false, true, false],
                    ["Open Badges 2.0 metadata", true, true, true, true, true],
                    ["Built-in analytics", true, true, true, "partial", "partial"],
                    ["Audit trail", true, "partial", "partial", false, false],
                    ["Bulk CSV issuance", true, true, true, true, true],
                    ["Badge invite & claim flow", true, false, true, false, false],
                    ["Public verification page", true, true, true, true, true],
                    ["Learner portfolio", true, true, true, true, "partial"],
                    ["Self-hostable", true, false, false, "partial", false],
                  ].map(([feature, ...vals], i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-sm">{feature as string}</TableCell>
                      {(vals as (boolean | string)[]).map((v, j) => (
                        <TableCell key={j} className="text-center">
                          {v === true ? <Yes /> : v === false ? <No /> : <Partial />}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <P>
              <strong>Key takeaway:</strong> Evolve Careers is the only platform that combines full
              data ownership, cryptographic integrity, white-label branding, and transparent pricing in
              a single package.
            </P>

            {/* ---- FEATURES ---- */}
            <SectionHeading id="features">Feature Highlights</SectionHeading>

            <SubHeading id="features-admin">Admin Dashboard</SubHeading>
            <P>
              The admin dashboard provides a centralised command centre for managing every aspect of
              your credentialing programme.
            </P>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1.5 mb-6 ml-2">
              <li><strong>Issuer Management</strong> — Create and manage issuing organisations with logos, descriptions, and contact details.</li>
              <li><strong>Badge Class Designer</strong> — Build credential templates with custom artwork, criteria, categories, and optional expiry periods.</li>
              <li><strong>Assertion Issuance</strong> — Issue badges individually or in bulk via CSV upload. Optionally attach evidence URLs.</li>
              <li><strong>Revocation</strong> — Revoke assertions with a reason; revocations are reflected on public verification pages instantly.</li>
              <li><strong>Learner Management</strong> — View, search, tag, and manage all learner profiles. Bulk-tag via CSV.</li>
              <li><strong>Analytics</strong> — KPI cards, trend charts, tag/date filters, and PDF export.</li>
              <li><strong>Audit Log</strong> — Every admin action is logged with actor, entity, timestamp, and details. Searchable and filterable.</li>
            </ul>

            <SubHeading id="features-learner">Learner Dashboard</SubHeading>
            <P>
              Learners get a personal dashboard to view, manage, and share their earned credentials.
            </P>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1.5 mb-6 ml-2">
              <li><strong>Badge Portfolio</strong> — Grid or list view of all earned badges with search and category filters.</li>
              <li><strong>Stats Overview</strong> — Total badges, active credentials, and recent activity at a glance.</li>
              <li><strong>Sharing</strong> — Copy verification links or share directly to LinkedIn.</li>
              <li><strong>Profile Settings</strong> — Update display name, avatar, and password.</li>
              <li><strong>Public Profile</strong> — A shareable portfolio page showing all earned badges.</li>
            </ul>

            <SubHeading id="features-verification">Public Verification</SubHeading>
            <P>
              Every issued badge has a unique, public verification URL (<code className="text-xs bg-muted px-1.5 py-0.5 rounded">/verify/:assertionId</code>)
              that anyone can visit to confirm authenticity.
            </P>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1.5 mb-6 ml-2">
              <li>Badge artwork, name, issuer, criteria, and issuance date.</li>
              <li>Live status indicator (active, expired, or revoked).</li>
              <li>HMAC-SHA256 signature verification with pass/fail indicator.</li>
              <li>JSON-LD Open Badges 2.0 metadata in the page <code className="text-xs bg-muted px-1.5 py-0.5 rounded">&lt;head&gt;</code> for machine-readable verification.</li>
              <li>View tracking (anonymous hash-based, no cookies).</li>
            </ul>

            <SubHeading id="features-invites">Badge Invites &amp; Claims</SubHeading>
            <P>
              Admins can send badge invitations to learners who haven't yet created an account. The
              invite flow generates a unique claim token that the learner uses to sign up and
              automatically receive their credential.
            </P>

            <SubHeading id="features-analytics">Analytics &amp; Reporting</SubHeading>
            <P>
              The analytics dashboard offers issuance trend charts, top badges, category breakdowns,
              and tag-based cohort analysis. Reports can be exported as PDF documents for stakeholder
              presentations.
            </P>

            {/* ---- ARCHITECTURE ---- */}
            <SectionHeading id="architecture">Architecture &amp; Tech Stack</SectionHeading>
            <div className="overflow-x-auto my-6 rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Layer</TableHead>
                    <TableHead className="font-semibold">Technology</TableHead>
                    <TableHead className="font-semibold">Purpose</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    ["Frontend", "React 18 + Vite + TypeScript", "SPA with fast HMR development"],
                    ["Styling", "Tailwind CSS + shadcn/ui", "Design system with semantic tokens"],
                    ["State", "TanStack React Query", "Server-state caching & synchronisation"],
                    ["Routing", "React Router v6", "Client-side routing with protected routes"],
                    ["Backend", "Lovable Cloud (Supabase)", "Postgres DB, Auth, Storage, Edge Functions"],
                    ["Edge Functions", "Deno (TypeScript)", "Serverless API, signing, notifications"],
                    ["Auth", "Supabase Auth", "Email/password, session management, password reset"],
                    ["Security", "RLS + RBAC + HMAC", "Row-level security, role checks, signed metadata"],
                  ].map(([layer, tech, purpose], i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium text-sm">{layer}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{tech}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{purpose}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* ---- SECURITY ---- */}
            <SectionHeading id="security">Security &amp; Data Integrity</SectionHeading>

            <SubHeading id="security-auth">Authentication &amp; RBAC</SubHeading>
            <P>
              The platform uses email/password authentication with session-based tokens. On signup, a
              database trigger creates a profile record and assigns the <Badge variant="secondary">learner</Badge> role.
              Admins are assigned the <Badge variant="secondary">admin</Badge> role via the <code className="text-xs bg-muted px-1.5 py-0.5 rounded">user_roles</code> table.
            </P>
            <P>
              A <code className="text-xs bg-muted px-1.5 py-0.5 rounded">has_role(_user_id, _role)</code> security-definer
              function allows RLS policies to check roles without recursive lookups. The
              frontend's <code className="text-xs bg-muted px-1.5 py-0.5 rounded">ProtectedRoute</code> component gates
              access to admin and learner pages based on the user's role.
            </P>

            <SubHeading id="security-rls">Row-Level Security</SubHeading>
            <P>
              Every table has RLS enabled. Policies ensure that learners can only read their own
              assertions, profiles, and notifications, while admins have broader access for management
              operations. Public-facing data (verification pages, public profiles) uses carefully
              scoped policies that expose only the minimum necessary fields.
            </P>

            <SubHeading id="security-signatures">Cryptographic Signatures</SubHeading>
            <P>
              When an assertion is issued, the platform creates an HMAC-SHA256 signature over a canonical
              JSON representation of the badge metadata (issuer, badge class, recipient, dates). This
              signature is stored alongside the assertion and verified on the public verification page.
              Any tampering with the underlying data will cause the signature check to fail.
            </P>

            <SubHeading id="security-snapshots">Immutable Snapshots</SubHeading>
            <P>
              At signing time, a complete JSON snapshot of the badge class and issuer data is stored in
              the <code className="text-xs bg-muted px-1.5 py-0.5 rounded">snapshot_json</code> column. Even if the
              badge class or issuer is later modified, the verification page always shows the data as it
              existed at issuance time — ensuring historical accuracy.
            </P>

            {/* ---- API ---- */}
            <SectionHeading id="api">API &amp; Integrations</SectionHeading>

            <SubHeading id="api-rest">REST API</SubHeading>
            <P>
              The public REST API is served via the <code className="text-xs bg-muted px-1.5 py-0.5 rounded">public-api</code> edge
              function and authenticated with API keys (passed via <code className="text-xs bg-muted px-1.5 py-0.5 rounded">Authorization: Bearer</code> header).
            </P>
            <div className="overflow-x-auto my-4 rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Method</TableHead>
                    <TableHead className="font-semibold">Endpoint</TableHead>
                    <TableHead className="font-semibold">Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    ["GET", "/public-api/badges", "List all badge classes"],
                    ["GET", "/public-api/assertions?badge_id=&email=", "Query assertions with filters"],
                    ["POST", "/public-api/assertions", "Issue a new assertion"],
                    ["POST", "/public-api/assertions/:id/revoke", "Revoke an assertion"],
                  ].map(([method, endpoint, desc], i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Badge variant={method === "GET" ? "secondary" : "default"} className="text-xs">
                          {method}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">{endpoint}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{desc}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <SubHeading id="api-webhooks">Webhooks</SubHeading>
            <P>
              Configure webhook endpoints to receive real-time notifications when events occur (e.g.,
              badge issued, assertion revoked). Each webhook has a signing secret for payload
              verification, configurable event filters, and automatic failure tracking with retry logic.
            </P>

            <SubHeading id="api-keys">API Key Management</SubHeading>
            <P>
              API keys are created in the admin dashboard with configurable permissions and optional
              expiry dates. Keys are stored as SHA-256 hashes — the raw key is shown only once at
              creation time. Keys can be revoked at any time, and usage is tracked via
              the <code className="text-xs bg-muted px-1.5 py-0.5 rounded">last_used_at</code> timestamp.
            </P>

            {/* ---- DATABASE ---- */}
            <SectionHeading id="database">Database Schema</SectionHeading>
            <P>
              The platform uses a PostgreSQL database with the following core tables:
            </P>
            <div className="overflow-x-auto my-4 rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Table</TableHead>
                    <TableHead className="font-semibold">Purpose</TableHead>
                    <TableHead className="font-semibold">Key Columns</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    ["profiles", "User profile data", "user_id, full_name, email, avatar_url"],
                    ["user_roles", "RBAC role assignments", "user_id, role (admin | learner)"],
                    ["issuers", "Issuing organisations", "name, logo_url, email, website"],
                    ["badge_classes", "Credential templates", "name, issuer_id, criteria, image_url, expiry_days"],
                    ["assertions", "Issued credentials", "badge_class_id, recipient_id, signature, snapshot_json"],
                    ["badge_invites", "Pending badge invitations", "email, badge_class_id, invite_token, status"],
                    ["badge_categories", "Badge classification", "name, color, description"],
                    ["badge_class_categories", "Many-to-many join", "badge_class_id, category_id"],
                    ["badge_views", "Verification page analytics", "assertion_id, viewer_hash, viewed_at"],
                    ["notifications", "In-app notifications", "user_id, title, message, read"],
                    ["tags", "Learner tags", "name, color"],
                    ["profile_tags", "Tag-learner assignments", "profile_user_id, tag_id"],
                    ["audit_logs", "Admin action trail", "actor_id, action, entity_type, details"],
                    ["api_keys", "API authentication", "key_hash, key_prefix, permissions, expires_at"],
                    ["webhooks", "Event subscriptions", "url, events[], secret, active"],
                  ].map(([table, purpose, cols], i) => (
                    <TableRow key={i}>
                      <TableCell className="font-mono text-xs font-medium">{table}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{purpose}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{cols}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* ---- USERS ---- */}
            <SectionHeading id="users">User Roles &amp; Permissions</SectionHeading>
            <div className="overflow-x-auto my-4 rounded-xl border border-border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Capability</TableHead>
                    <TableHead className="text-center font-semibold">Admin</TableHead>
                    <TableHead className="text-center font-semibold">Learner</TableHead>
                    <TableHead className="text-center font-semibold">Public</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[
                    ["Manage issuers & badge classes", true, false, false],
                    ["Issue & revoke assertions", true, false, false],
                    ["Manage learners & tags", true, false, false],
                    ["View analytics & audit logs", true, false, false],
                    ["Manage API keys & webhooks", true, false, false],
                    ["View own badge portfolio", true, true, false],
                    ["Update profile & settings", true, true, false],
                    ["Share badges (link / LinkedIn)", true, true, false],
                    ["Claim badge invitations", false, true, false],
                    ["Verify badge authenticity", false, false, true],
                    ["View public profiles", false, false, true],
                  ].map(([cap, admin, learner, pub], i) => (
                    <TableRow key={i}>
                      <TableCell className="text-sm font-medium">{cap as string}</TableCell>
                      <TableCell className="text-center">{admin ? <Yes /> : <No />}</TableCell>
                      <TableCell className="text-center">{learner ? <Yes /> : <No />}</TableCell>
                      <TableCell className="text-center">{(pub as boolean) ? <Yes /> : <No />}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Footer */}
            <div className="mt-16 pt-8 border-t border-border text-center">
              <P>
                Built with ❤️ by Evolve Careers. Questions?{" "}
                <a href="mailto:support@evolvecareers.com" className="text-primary hover:underline">
                  Get in touch
                </a>
                .
              </P>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
