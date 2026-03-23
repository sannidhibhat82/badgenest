import { useQuery } from "@tanstack/react-query";
import { admin as adminApi } from "@/lib/api";
import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Award, Users, ShieldCheck, ShieldX, Plus, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: () => adminApi.dashboardStats(),
  });

  const cards = [
    { title: "Total Badges", value: stats?.total_badges ?? 0, icon: Award, gradient: "from-primary/10 to-primary/5", iconColor: "text-primary" },
    { title: "Active Assertions", value: stats?.active_assertions ?? 0, icon: ShieldCheck, gradient: "from-success/10 to-success/5", iconColor: "text-success" },
    { title: "Revoked", value: stats?.revoked_assertions ?? 0, icon: ShieldX, gradient: "from-destructive/10 to-destructive/5", iconColor: "text-destructive" },
    { title: "Learners", value: stats?.total_learners ?? 0, icon: Users, gradient: "from-secondary/10 to-secondary/5", iconColor: "text-secondary" },
  ];

  const chartData = stats?.chart_data ?? [];
  const recent = (stats?.recent ?? []).map((r: any) => ({
    id: r.id,
    issued_at: r.issued_at,
    revoked: r.revoked,
    learnerName: r.learner_name,
    badgeName: r.badge_name,
  }));

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

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 stagger-children">
          {cards.map((stat) => (
            <Card key={stat.title} className="border-border/60 overflow-hidden transition-all duration-200 hover:shadow-card hover:-translate-y-0.5">
              <CardContent className={`p-5 bg-gradient-to-br ${stat.gradient}`}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <div className="rounded-lg p-2 bg-card/80 shadow-sm">
                    <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-6 border-border/60 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold">Issuance Trend</CardTitle>
            <p className="text-xs text-muted-foreground">Last 6 months</p>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barCategoryGap="20%">
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

        <Card className="mt-6 border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {!recent?.length ? (
              <div className="text-center py-8">
                <Award className="mx-auto h-10 w-10 text-muted-foreground/30 mb-2" />
                <p className="text-muted-foreground text-sm">No recent activity.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recent.map((a: any) => (
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
