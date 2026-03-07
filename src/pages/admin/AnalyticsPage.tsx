import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, Users, ShieldCheck, ShieldX, Clock } from "lucide-react";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const PIE_COLORS = ["hsl(var(--primary))", "hsl(var(--destructive))", "hsl(var(--muted-foreground))"];

export default function AnalyticsPage() {
  const { data: stats } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      const [badgesRes, assertionsRes, learnersRes] = await Promise.all([
        supabase.from("badge_classes").select("id, name"),
        supabase.from("assertions").select("id, revoked, issued_at, badge_class_id, recipient_id, badge_classes(name)"),
        supabase.from("profiles").select("user_id, full_name", { count: "exact" }),
      ]);

      const assertions = assertionsRes.data ?? [];
      const active = assertions.filter((a) => !a.revoked).length;
      const revoked = assertions.filter((a) => a.revoked).length;

      // Per-badge counts
      const badgeCounts: Record<string, { name: string; count: number }> = {};
      for (const a of assertions) {
        const name = (a as any).badge_classes?.name || "Unknown";
        if (!badgeCounts[a.badge_class_id]) badgeCounts[a.badge_class_id] = { name, count: 0 };
        badgeCounts[a.badge_class_id].count++;
      }
      const badgeChartData = Object.values(badgeCounts).sort((a, b) => b.count - a.count).slice(0, 10);

      // Monthly trend
      const monthlyData: Record<string, number> = {};
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthlyData[format(d, "MMM yyyy")] = 0;
      }
      for (const a of assertions) {
        const key = format(new Date(a.issued_at), "MMM yyyy");
        if (key in monthlyData) monthlyData[key]++;
      }
      const trendData = Object.entries(monthlyData).map(([month, count]) => ({ month, count }));

      // Pie data
      const expired = assertions.filter((a) => !a.revoked && a.issued_at /* placeholder */).length; // approximate
      const pieData = [
        { name: "Active", value: active },
        { name: "Revoked", value: revoked },
      ].filter((d) => d.value > 0);

      // Recent with names
      const recentAssertions = assertions.slice(0, 10);
      const recipientIds = [...new Set(recentAssertions.map((a) => a.recipient_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", recipientIds);
      const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.user_id, p]));

      return {
        totalBadges: badgesRes.data?.length ?? 0,
        totalAssertions: assertions.length,
        active,
        revoked,
        totalLearners: learnersRes.count ?? 0,
        trendData,
        badgeChartData,
        pieData,
        recent: recentAssertions.map((a: any) => ({
          ...a,
          learnerName: profileMap[a.recipient_id]?.full_name || "Unknown",
          badgeName: a.badge_classes?.name || "Unknown",
        })),
      };
    },
  });

  const cards = [
    { title: "Badge Classes", value: stats?.totalBadges ?? 0, icon: Award, color: "text-primary" },
    { title: "Badges Issued", value: stats?.totalAssertions ?? 0, icon: ShieldCheck, color: "text-primary" },
    { title: "Active", value: stats?.active ?? 0, icon: ShieldCheck, color: "text-success" },
    { title: "Revoked", value: stats?.revoked ?? 0, icon: ShieldX, color: "text-destructive" },
    { title: "Learners", value: stats?.totalLearners ?? 0, icon: Users, color: "text-secondary" },
  ];

  return (
    <AdminLayout>
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="mt-1 text-muted-foreground">Platform overview and activity</p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </CardHeader>
            <CardContent><div className="text-3xl font-bold">{c.value}</div></CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Monthly Trend */}
        <Card>
          <CardHeader><CardTitle>Issuance Trend (6 Months)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.trendData ?? []}>
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Status Pie */}
        <Card>
          <CardHeader><CardTitle>Badge Status Distribution</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stats?.pieData ?? []} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                    {(stats?.pieData ?? []).map((_: any, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Issuance per Badge */}
      <Card className="mt-6">
        <CardHeader><CardTitle>Issuance Count per Badge</CardTitle></CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.badgeChartData ?? []} layout="vertical">
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="mt-6">
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />Recent Activity</CardTitle></CardHeader>
        <CardContent>
          {!stats?.recent?.length ? (
            <p className="text-muted-foreground">No recent activity.</p>
          ) : (
            <ul className="space-y-2">
              {stats.recent.map((a: any) => (
                <li key={a.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <span>
                    <span className="font-medium">{a.learnerName}</span>
                    <span className="text-muted-foreground"> earned </span>
                    <span className="font-medium">{a.badgeName}</span>
                  </span>
                  <span className="text-muted-foreground">{format(new Date(a.issued_at), "MMM d, yyyy h:mm a")}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
