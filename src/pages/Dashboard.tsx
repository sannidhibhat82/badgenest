import { useAuth } from "@/contexts/AuthContext";
import LearnerLayout from "@/layouts/LearnerLayout";
import { Award } from "lucide-react";

export default function LearnerDashboard() {
  const { profile } = useAuth();

  return (
    <LearnerLayout>
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-bold">
          Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}! 👋
        </h1>
        <p className="mt-1 text-muted-foreground">Here are your earned badges</p>

        <div className="mt-8 flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center">
          <Award className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-lg font-medium text-muted-foreground">No badges earned yet</p>
          <p className="text-sm text-muted-foreground/70">
            Badges you earn will appear here
          </p>
        </div>
      </div>
    </LearnerLayout>
  );
}
