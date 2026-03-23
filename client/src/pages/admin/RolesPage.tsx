import AdminLayout from "@/layouts/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";

export default function RolesPage() {
  return (
    <AdminLayout>
      <div>
        <h1 className="text-3xl font-bold">Roles</h1>
        <p className="mt-1 text-muted-foreground">User roles are managed via the database (user_roles table). Admin and learner roles are assigned there.</p>
      </div>
      <Card className="mt-6">
        <CardContent className="py-8 text-center text-muted-foreground">
          To promote a user to admin, insert a row into the <code className="bg-muted px-1 rounded">user_roles</code> table with <code className="bg-muted px-1 rounded">role = &apos;admin&apos;</code> for that user&apos;s id.
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
