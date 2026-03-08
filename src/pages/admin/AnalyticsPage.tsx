import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import {
  Award,
  Users,
  Eye,
  Share2,
  TrendingUp,
  Lightbulb,
  FileDown,
  Clock,
  CheckCircle2,
  BarChart3,
  CalendarIcon,
  X,
} from "lucide-react";
import {
  format,
  subMonths,
  startOfMonth,
  isWithinInterval,
  startOfDay,
  endOfDay,
} from "date-fns";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Legend,
  CartesianGrid,
} from "recharts";

// ── Data fetching ──────────────────────────────────────────────

function useAnalyticsData() {
  return useQuery({
    queryKey: ["admin-analytics-v2"],
    queryFn: async () => {
      const [
        tagsRes,
        profileTagsRes,
        assertionsRes,
        invitesRes,
        viewsRes,
        badgeClassesRes,
        categoriesRes,
        bccRes,
        profilesRes,
      ] = await Promise.all([
        supabase.from("tags").select("*"),
        supabase.from("profile_tags").select("*"),
        supabase.from("assertions").select("id, badge_class_id, recipient_id, revoked, issued_at, badge_classes(name)"),
        supabase.from("badge_invites").select("id, badge_class_id, email, status, claimed_by, created_at"),
        supabase.from("badge_views").select("id, assertion_id, viewed_at"),
        supabase.from("badge_classes").select("id, name"),
        supabase.from("badge_categories").select("id, name, color"),
        supabase.from("badge_class_categories").select("badge_class_id, category_id"),
        supabase.from("profiles").select("user_id, full_name", { count: "exact" }),
      ]);

      return {
        tags: tagsRes.data ?? [],
        profileTags: profileTagsRes.data ?? [],
        assertions: assertionsRes.data ?? [],
        invites: invitesRes.data ?? [],
        views: viewsRes.data ?? [],
        badgeClasses: badgeClassesRes.data ?? [],
        categories: categoriesRes.data ?? [],
        badgeClassCategories: bccRes.data ?? [],
        profiles: profilesRes.data ?? [],
        totalLearners: profilesRes.count ?? 0,
      };
    },
  });
}

// ── PDF Export ──────────────────────────────────────────────────

async function exportPdf(el: HTMLElement, title: string) {
  const html2canvas = (await import("html2canvas")).default;
  const { jsPDF } = await import("jspdf");

  // Capture the report section
  const canvas = await html2canvas(el, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const usableWidth = pageWidth - margin * 2;
  const imgHeight = (canvas.height * usableWidth) / canvas.width;

  // Add pages if content is taller than one page
  let yOffset = 0;
  const usableHeight = pageHeight - margin * 2;

  while (yOffset < imgHeight) {
    if (yOffset > 0) pdf.addPage();
    pdf.addImage(
      imgData,
      "PNG",
      margin,
      margin - yOffset,
      usableWidth,
      imgHeight
    );
    yOffset += usableHeight;
  }

  pdf.save(`${title}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}

// ── Date Range Picker ──────────────────────────────────────────

function DateRangePicker({
  from,
  to,
  onFromChange,
  onToChange,
  onClear,
}: {
  from: Date | undefined;
  to: Date | undefined;
  onFromChange: (d: Date | undefined) => void;
  onToChange: (d: Date | undefined) => void;
  onClear: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "w-[130px] justify-start text-left font-normal",
              !from && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
            {from ? format(from, "MMM d, yyyy") : "From"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={from}
            onSelect={onFromChange}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
      <span className="text-xs text-muted-foreground">→</span>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "w-[130px] justify-start text-left font-normal",
              !to && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
            {to ? format(to, "MMM d, yyyy") : "To"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={to}
            onSelect={onToChange}
            disabled={(date) => (from ? date < from : false)}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
      {(from || to) && (
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClear}>
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────

export default function AnalyticsPage() {
  const { data } = useAnalyticsData();
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Derive filtered user IDs based on selected tag
  const filteredUserIds = useMemo(() => {
    if (!data) return null;
    if (selectedTag === "all") return null;
    return new Set(
      data.profileTags
        .filter((pt) => pt.tag_id === selectedTag)
        .map((pt) => pt.profile_user_id)
    );
  }, [data, selectedTag]);

  // Date filter helper
  const inDateRange = (dateStr: string) => {
    if (!dateFrom && !dateTo) return true;
    const d = new Date(dateStr);
    if (dateFrom && dateTo)
      return isWithinInterval(d, { start: startOfDay(dateFrom), end: endOfDay(dateTo) });
    if (dateFrom) return d >= startOfDay(dateFrom);
    if (dateTo) return d <= endOfDay(dateTo);
    return true;
  };

  const metrics = useMemo(() => {
    if (!data) return null;

    const filterUser = (userId: string) =>
      filteredUserIds === null || filteredUserIds.has(userId);

    // Filtered data (tag + date)
    const assertions = data.assertions.filter(
      (a) => filterUser(a.recipient_id) && inDateRange(a.issued_at)
    );

    const learnerCount =
      filteredUserIds === null ? data.totalLearners : filteredUserIds.size;

    const assertionUserIds = new Set(assertions.map((a) => a.recipient_id));
    // Build a lookup map to avoid O(n*m) .find() inside .filter()
    const assertionRecipientMap = new Map(data.assertions.map((a) => [a.id, a.recipient_id]));
    const viewsForUsers = data.views.filter((v) => {
      const recipientId = assertionRecipientMap.get(v.assertion_id);
      return recipientId && filterUser(recipientId) && inDateRange(v.viewed_at);
    });

    const active = assertions.filter((a) => !a.revoked).length;
    const totalIssued = assertions.length;

    // Acceptance rate (date-filtered invites)
    const filteredInvites = data.invites.filter((i) => inDateRange(i.created_at));
    const allSent = filteredInvites.length;
    const allClaimed = filteredInvites.filter((i) => i.status === "claimed").length;
    const acceptanceRate = allSent > 0 ? Math.round((allClaimed / allSent) * 100) : 0;

    const avgBadgesPerLearner =
      learnerCount > 0 ? (totalIssued / learnerCount).toFixed(1) : "0";

    const totalViews = viewsForUsers.length;

    // Share rate
    const earnersWithViews = new Set(
      viewsForUsers
        .map((v) => data.assertions.find((a) => a.id === v.assertion_id)?.recipient_id)
        .filter(Boolean)
    );
    const shareRate =
      assertionUserIds.size > 0
        ? Math.round((earnersWithViews.size / assertionUserIds.size) * 100)
        : 0;

    // ── Monthly trend (6 months) ──
    const now = new Date();
    const trendData: { month: string; issued: number; views: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = startOfMonth(subMonths(now, i));
      const key = format(d, "MMM yyyy");
      const nextMonth =
        i > 0
          ? startOfMonth(subMonths(now, i - 1))
          : new Date(now.getFullYear(), now.getMonth() + 1, 1);
      const issued = assertions.filter((a) => {
        const dt = new Date(a.issued_at);
        return dt >= d && dt < nextMonth;
      }).length;
      const views = viewsForUsers.filter((v) => {
        const dt = new Date(v.viewed_at);
        return dt >= d && dt < nextMonth;
      }).length;
      trendData.push({ month: key, issued, views });
    }

    // ── Acceptance funnel ──
    const funnelData = [
      { stage: "Invites Sent", count: allSent },
      { stage: "Claimed", count: allClaimed },
      { stage: "Active Badges", count: active },
    ];

    // ── Skill radar ──
    const categoryCountMap: Record<string, number> = {};
    for (const a of assertions) {
      const bccs = data.badgeClassCategories.filter(
        (bcc) => bcc.badge_class_id === a.badge_class_id
      );
      for (const bcc of bccs) {
        categoryCountMap[bcc.category_id] =
          (categoryCountMap[bcc.category_id] || 0) + 1;
      }
    }
    const radarData = data.categories.map((cat) => ({
      category: cat.name,
      count: categoryCountMap[cat.id] || 0,
    }));

    // ── Tag comparison ──
    const tagComparison = data.tags
      .map((tag) => {
        const userIds = new Set(
          data.profileTags
            .filter((pt) => pt.tag_id === tag.id)
            .map((pt) => pt.profile_user_id)
        );
        const tagAssertions = data.assertions.filter(
          (a) => userIds.has(a.recipient_id) && inDateRange(a.issued_at)
        );
        return {
          tag: tag.name,
          badges: tagAssertions.length,
          learners: userIds.size,
          avgBadges:
            userIds.size > 0
              ? +(tagAssertions.length / userIds.size).toFixed(1)
              : 0,
        };
      })
      .sort((a, b) => b.badges - a.badges);

    // ── Per-badge breakdown ──
    const badgeCounts: Record<string, { name: string; count: number }> = {};
    for (const a of assertions) {
      const name = (a as any).badge_classes?.name || "Unknown";
      if (!badgeCounts[a.badge_class_id])
        badgeCounts[a.badge_class_id] = { name, count: 0 };
      badgeCounts[a.badge_class_id].count++;
    }
    const badgeBreakdown = Object.values(badgeCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // ── Recent activity ──
    const profileMap = Object.fromEntries(
      data.profiles.map((p) => [p.user_id, p])
    );
    const recent = assertions
      .sort(
        (a, b) =>
          new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime()
      )
      .slice(0, 8)
      .map((a: any) => ({
        ...a,
        learnerName: profileMap[a.recipient_id]?.full_name || "Unknown",
        badgeName: a.badge_classes?.name || "Unknown",
      }));

    // ── Insights ──
    const insights: {
      icon: typeof TrendingUp;
      text: string;
      type: "positive" | "neutral" | "highlight";
    }[] = [];

    if (learnerCount > 0) {
      const earnedPct = Math.round(
        (assertionUserIds.size / learnerCount) * 100
      );
      const tagLabel =
        selectedTag === "all"
          ? "all learners"
          : `learners in "${data.tags.find((t) => t.id === selectedTag)?.name}"`;
      insights.push({
        icon: CheckCircle2,
        text: `${earnedPct}% of ${tagLabel} have earned at least one badge.`,
        type: earnedPct > 70 ? "positive" : "neutral",
      });
    }

    if (tagComparison.length > 0) {
      const top = tagComparison[0];
      insights.push({
        icon: TrendingUp,
        text: `Top performing group: "${top.tag}" with ${top.avgBadges} avg badges per learner.`,
        type: "highlight",
      });
    }

    if (shareRate > 0) {
      insights.push({
        icon: Share2,
        text: `${shareRate}% of badge earners have had their credentials viewed, indicating active sharing.`,
        type: shareRate > 50 ? "positive" : "neutral",
      });
    }

    if (acceptanceRate > 0) {
      insights.push({
        icon: Award,
        text: `Badge acceptance rate is ${acceptanceRate}% — ${acceptanceRate > 80 ? "excellent engagement!" : "consider follow-up reminders."}`,
        type: acceptanceRate > 80 ? "positive" : "neutral",
      });
    }

    return {
      totalIssued,
      active,
      acceptanceRate,
      avgBadgesPerLearner,
      totalViews,
      shareRate,
      learnerCount,
      trendData,
      funnelData,
      radarData,
      tagComparison,
      badgeBreakdown,
      recent,
      insights,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, filteredUserIds, selectedTag, dateFrom, dateTo]);

  // ── PDF Export handler ──
  const handleExportPdf = async () => {
    if (!reportRef.current || !metrics) return;
    setExporting(true);
    try {
      const tagLabel =
        selectedTag === "all"
          ? "All Learners"
          : data?.tags.find((t) => t.id === selectedTag)?.name ?? "Report";
      await exportPdf(reportRef.current, `analytics-${tagLabel.replace(/\s+/g, "-").toLowerCase()}`);
    } finally {
      setExporting(false);
    }
  };

  const kpiCards = metrics
    ? [
        {
          title: "Badges Issued",
          value: metrics.totalIssued,
          icon: Award,
          subtitle: `${metrics.active} active`,
        },
        {
          title: "Acceptance Rate",
          value: `${metrics.acceptanceRate}%`,
          icon: CheckCircle2,
          subtitle: "invites → claimed",
        },
        {
          title: "Avg Badges / Learner",
          value: metrics.avgBadgesPerLearner,
          icon: Users,
          subtitle: `${metrics.learnerCount} learners`,
        },
        {
          title: "Verification Views",
          value: metrics.totalViews,
          icon: Eye,
          subtitle: `${metrics.shareRate}% share rate`,
        },
      ]
    : [];

  const insightColors = {
    positive: "border-emerald-500/30 bg-emerald-500/5",
    neutral: "border-border",
    highlight: "border-primary/30 bg-primary/5",
  };

  const dateRangeLabel =
    dateFrom && dateTo
      ? `${format(dateFrom, "MMM d, yyyy")} – ${format(dateTo, "MMM d, yyyy")}`
      : dateFrom
        ? `From ${format(dateFrom, "MMM d, yyyy")}`
        : dateTo
          ? `Until ${format(dateTo, "MMM d, yyyy")}`
          : null;

  return (
    <AdminLayout>
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="mt-1 text-muted-foreground">
            Institutional insights &amp; credential performance
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-3">
            <Select value={selectedTag} onValueChange={setSelectedTag}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Learners</SelectItem>
                {data?.tags.map((tag) => (
                  <SelectItem key={tag.id} value={tag.id}>
                    {tag.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPdf}
              disabled={!metrics || exporting}
            >
              <FileDown className="mr-2 h-4 w-4" />
              {exporting ? "Generating…" : "Export PDF"}
            </Button>
          </div>
          <DateRangePicker
            from={dateFrom}
            to={dateTo}
            onFromChange={setDateFrom}
            onToChange={setDateTo}
            onClear={() => {
              setDateFrom(undefined);
              setDateTo(undefined);
            }}
          />
        </div>
      </div>

      {/* Report content — captured for PDF */}
      <div ref={reportRef}>
        {/* Date range badge */}
        {dateRangeLabel && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
            <CalendarIcon className="h-3 w-3" />
            {dateRangeLabel}
          </div>
        )}

        {/* KPI Cards */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpiCards.map((c) => (
            <Card key={c.title} className="glass">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {c.title}
                </CardTitle>
                <c.icon className="h-5 w-5 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{c.value}</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {c.subtitle}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Row: Issuance Trend + Acceptance Funnel */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4" />
                Issuance &amp; Engagement Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics?.trendData ?? []}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border"
                    />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="issued"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name="Badges Issued"
                    />
                    <Line
                      type="monotone"
                      dataKey="views"
                      stroke="hsl(var(--secondary))"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name="Views"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4" />
                Acceptance Funnel
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={metrics?.funnelData ?? []}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-border"
                    />
                    <XAxis dataKey="stage" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Insights */}
        {metrics && metrics.insights.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
              <Lightbulb className="h-5 w-5 text-primary" />
              Insights
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {metrics.insights.map((insight, i) => (
                <Card
                  key={i}
                  className={`border ${insightColors[insight.type]}`}
                >
                  <CardContent className="flex items-start gap-3 p-4">
                    <insight.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <p className="text-sm leading-relaxed">{insight.text}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Row: Skill Radar + Tag Comparison */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {metrics && metrics.radarData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Skill Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={metrics.radarData}>
                      <PolarGrid className="stroke-border" />
                      <PolarAngleAxis
                        dataKey="category"
                        tick={{ fontSize: 11 }}
                      />
                      <PolarRadiusAxis
                        allowDecimals={false}
                        tick={{ fontSize: 10 }}
                      />
                      <Radar
                        dataKey="count"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.2}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {metrics && metrics.tagComparison.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tag Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={metrics.tagComparison}
                      layout="vertical"
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-border"
                      />
                      <XAxis
                        type="number"
                        allowDecimals={false}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        type="category"
                        dataKey="tag"
                        width={120}
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                      <Legend />
                      <Bar
                        dataKey="badges"
                        fill="hsl(var(--primary))"
                        radius={[0, 4, 4, 0]}
                        name="Badges"
                      />
                      <Bar
                        dataKey="learners"
                        fill="hsl(var(--secondary))"
                        radius={[0, 4, 4, 0]}
                        name="Learners"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Badge Breakdown + Recent Activity */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Issuance per Badge</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={metrics?.badgeBreakdown ?? []}
                    layout="vertical"
                  >
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={140}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar
                      dataKey="count"
                      fill="hsl(var(--primary))"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!metrics?.recent?.length ? (
                <p className="text-sm text-muted-foreground">
                  No recent activity.
                </p>
              ) : (
                <ul className="space-y-2">
                  {metrics.recent.map((a: any) => (
                    <li
                      key={a.id}
                      className="flex items-center justify-between rounded-md border p-3 text-sm"
                    >
                      <span>
                        <span className="font-medium">{a.learnerName}</span>
                        <span className="text-muted-foreground"> earned </span>
                        <span className="font-medium">{a.badgeName}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(a.issued_at), "MMM d, yyyy")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
