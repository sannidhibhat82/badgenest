import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, Users, ShieldCheck, ShieldX } from "lucide-react";

export default function AdminDashboard() {
  const { data: stats } = useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      const [badgesRes, assertionsRes, learnersRes] = await Promise.all([
        supabase.from("badge_classes").select("id", { count: "exact", head: true }),
        supabase.from("assertions").select("id, revoked"),
        supabase.from("profiles").select("user_id", { count: "exact", head: true }),
      ]);
      const assertions = assertionsRes.data ?? [];
      return {
        totalBadges: badgesRes.count ?? 0,
        active: assertions.filter((a) => !a.revoked).length,
        revoked: assertions.filter((a) => a.revoked).length,
        totalLearners: learnersRes.count ?? 0,
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
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="mt-1 text-muted-foreground">Overview of your badge platform</p>

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
      </div>
    </AdminLayout>
  );
}
