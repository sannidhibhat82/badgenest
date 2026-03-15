import { useQuery } from "@tanstack/react-query";
import { admin as adminApi } from "@/lib/api";
import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, Users, ShieldCheck, ShieldX, BarChart3 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function AnalyticsPage() {
  const { data: stats } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: () => adminApi.dashboardStats(),
  });

  const cards = [
    { title: "Total Badges", value: stats?.total_badges ?? 0, icon: Award },
    { title: "Active Assertions", value: stats?.active_assertions ?? 0, icon: ShieldCheck },
    { title: "Revoked", value: stats?.revoked_assertions ?? 0, icon: ShieldX },
    { title: "Learners", value: stats?.total_learners ?? 0, icon: Users },
  ];

  const chartData = stats?.chart_data ?? [];

  return (
    <AdminLayout>
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="mt-1 text-muted-foreground">Platform metrics and trends</p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.title}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{c.title}</p>
                <c.icon className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-2xl font-bold mt-2">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Issuance Trend
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground flex items-center justify-center h-full">No trend data yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
