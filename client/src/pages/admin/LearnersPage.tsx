import { useQuery } from "@tanstack/react-query";
import { admin as adminApi } from "@/lib/api";
import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { User, ExternalLink } from "lucide-react";
import { format } from "date-fns";

export default function LearnersPage() {
  const { data: learners = [], isLoading } = useQuery({
    queryKey: ["learners"],
    queryFn: () => adminApi.learners(),
  });

  return (
    <AdminLayout>
      <div>
        <h1 className="text-3xl font-bold">Learners</h1>
        <p className="mt-1 text-muted-foreground">View all registered learners</p>
      </div>

      <Card className="mt-6">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-[100px]">Profile</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8">Loading…</TableCell></TableRow>
              ) : learners.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No learners yet.</TableCell></TableRow>
              ) : (
                (learners as any[]).map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{u.email}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{format(new Date(u.created_at), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link to={`/profile/${u.id}`}><ExternalLink className="h-4 w-4" /></Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
