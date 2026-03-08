import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Award, Users, ShieldCheck, ShieldX, Plus, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

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

      const recentAssertions = assertions.slice(0, 10);
      const recipientIds = [...new Set(recentAssertions.map((a) => a.recipient_id))];
      const { data: profiles } = await supabase.from("profiles").select("user_id, full_name").in("user_id", recipientIds);
      const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.user_id, p]));

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
    { title: "Total Badges", value: stats?.totalBadges ?? 0, icon: Award, gradient: "from-primary/10 to-primary/5", iconColor: "text-primary" },
    { title: "Active Assertions", value: stats?.active ?? 0, icon: ShieldCheck, gradient: "from-success/10 to-success/5", iconColor: "text-success" },
    { title: "Revoked", value: stats?.revoked ?? 0, icon: ShieldX, gradient: "from-destructive/10 to-destructive/5", iconColor: "text-destructive" },
    { title: "Learners", value: stats?.totalLearners ?? 0, icon: Users, gradient: "from-secondary/10 to-secondary/5", iconColor: "text-secondary" },
  ];

  return (
    <AdminLayout>
      <div className="animate-fade-in">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="mt-1 text-muted-foreground">Overview of your badge platform</p>
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm" className="shadow-sm">
              <Link to="/admin/assertions"><Plus className="mr-2 h-4 w-4" />Issue Badge</Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/admin/analytics"><BarChart3 className="mr-2 h-4 w-4" />Analytics</Link>
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
          {cards.map((stat) => (
            <Card key={stat.title} className="border-border/60 overflow-hidden transition-all duration-200 hover:shadow-card hover:-translate-y-0.5">
              <CardContent className={`p-5 bg-gradient-to-br ${stat.gradient}`}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <div className={`rounded-lg p-2 bg-card/80 shadow-sm`}>
                    <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Chart */}
        <Card className="mt-6 border-border/60 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Issuance Trend</CardTitle>
            <p className="text-xs text-muted-foreground">Last 6 months</p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats?.chartData ?? []} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px hsl(var(--foreground) / 0.08)",
                      fontSize: "13px",
                    }}
                  />
                  <defs>
                    <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={1} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                  <Bar dataKey="count" fill="url(#barGradient)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="mt-6 border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {!stats?.recent?.length ? (
              <div className="text-center py-8">
                <Award className="mx-auto h-10 w-10 text-muted-foreground/30 mb-2" />
                <p className="text-muted-foreground text-sm">No recent activity.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.recent.map((a: any) => (
                  <div key={a.id} className="flex items-center gap-3 rounded-xl bg-muted/30 p-3 transition-colors hover:bg-muted/50">
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {a.learnerName?.charAt(0)?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-semibold text-foreground">{a.learnerName}</span>
                        <span className="text-muted-foreground"> earned </span>
                        <span className="font-semibold text-foreground">{a.badgeName}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(a.issued_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
