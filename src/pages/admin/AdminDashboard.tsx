import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Award, Users, ShieldCheck, ShieldX, Plus, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      const [badgesRes, assertionsRes, learnersRes] = await Promise.all([
        supabase.from("badge_classes").select("id", { count: "exact", head: true }),
        supabase.from("assertions").select("id, revoked, issued_at, recipient_id, badge_classes(name)"),
        supabase.from("profiles").select("user_id", { count: "exact", head: true }),
      ]);
      const assertions = assertionsRes.data ?? [];

      // Fetch profiles for recent activity
      const recentAssertions = assertions.slice(0, 10);
      const recipientIds = [...new Set(recentAssertions.map((a) => a.recipient_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", recipientIds);
      const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.user_id, p]));

      // Monthly chart data (last 6 months)
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
      const chartData = Object.entries(monthlyData).map(([month, count]) => ({ month, count }));

      return {
        totalBadges: badgesRes.count ?? 0,
        active: assertions.filter((a) => !a.revoked).length,
        revoked: assertions.filter((a) => a.revoked).length,
        totalLearners: learnersRes.count ?? 0,
        recent: recentAssertions.map((a: any) => ({
          ...a,
          learnerName: profileMap[a.recipient_id]?.full_name || "Unknown",
          badgeName: a.badge_classes?.name || "Unknown",
        })),
        chartData,
      };
    },
  });

  const cards = [
    { title: "Total Badges", value: stats?.totalBadges ?? 0, icon: Award, color: "text-primary" },
    { title: "Active Assertions", value: stats?.active ?? 0, icon: ShieldCheck, color: "text-success" },
    { title: "Revoked", value: stats?.revoked ?? 0, icon: ShieldX, color: "text-destructive" },
    { title: "Learners", value: stats?.totalLearners ?? 0, icon: Users, color: "text-secondary" },
  ];

  return (
    <AdminLayout>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="mt-1 text-muted-foreground">Overview of your badge platform</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline"><Link to="/admin/assertions"><Plus className="mr-2 h-4 w-4" />Issue Badge</Link></Button>
          <Button asChild variant="outline"><Link to="/admin/analytics"><BarChart3 className="mr-2 h-4 w-4" />Analytics</Link></Button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Issuance Trend Chart */}
      <Card className="mt-6">
        <CardHeader><CardTitle>Issuance Trend (Last 6 Months)</CardTitle></CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.chartData ?? []}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="mt-6">
        <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
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
                  <span className="text-muted-foreground">{format(new Date(a.issued_at), "MMM d, yyyy")}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
