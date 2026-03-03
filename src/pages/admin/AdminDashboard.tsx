import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, Users, ShieldCheck, ShieldX } from "lucide-react";

export default function AdminDashboard() {
  return (
    <AdminLayout>
      <div>
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="mt-1 text-muted-foreground">Overview of your badge platform</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { title: "Total Badges", value: "0", icon: Award, color: "text-primary" },
            { title: "Active Assertions", value: "0", icon: ShieldCheck, color: "text-success" },
            { title: "Revoked", value: "0", icon: ShieldX, color: "text-destructive" },
            { title: "Learners", value: "0", icon: Users, color: "text-secondary" },
          ].map((stat) => (
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
