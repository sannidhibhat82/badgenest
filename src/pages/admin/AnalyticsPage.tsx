import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, Users, ShieldCheck, ShieldX, Clock } from "lucide-react";
import { format } from "date-fns";

export default function AnalyticsPage() {
  const { data: stats } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: async () => {
      const [badgesRes, assertionsRes, learnersRes] = await Promise.all([
        supabase.from("badge_classes").select("id", { count: "exact", head: true }),
        supabase.from("assertions").select("id, revoked, issued_at"),
        supabase.from("profiles").select("user_id", { count: "exact", head: true }),
      ]);

      const assertions = assertionsRes.data ?? [];
      const active = assertions.filter((a) => !a.revoked).length;
      const revoked = assertions.filter((a) => a.revoked).length;

      return {
        totalBadges: badgesRes.count ?? 0,
        totalAssertions: assertions.length,
        active,
        revoked,
        totalLearners: learnersRes.count ?? 0,
        recent: assertions.slice(0, 10),
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

      <Card className="mt-6">
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" />Recent Activity</CardTitle></CardHeader>
        <CardContent>
          {!stats?.recent?.length ? (
            <p className="text-muted-foreground">No recent activity.</p>
          ) : (
            <ul className="space-y-2">
              {stats.recent.map((a: any) => (
                <li key={a.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                  <span>Badge issued</span>
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
