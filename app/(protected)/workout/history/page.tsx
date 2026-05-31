// Workout history — a simple list of past sessions.
import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import Card from "@/components/ui/Card";

export default async function HistoryPage() {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: sessions } = await supabase
    .from("workout_sessions")
    .select("id, plan_day, started_at, completed_at")
    .eq("user_id", session.user.id)
    .order("started_at", { ascending: false })
    .limit(50);

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <Link href="/dashboard" className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300">
        ← Dashboard
      </Link>
      <h1 className="text-2xl font-bold mb-6">Workout History</h1>

      {!sessions?.length && (
        <p className="text-gray-500 text-sm">No sessions yet. Start your first workout!</p>
      )}

      <div className="space-y-3">
        {sessions?.map((s) => (
          <Link key={s.id} href={`/workout/${s.id}/summary`}>
            <Card className="hover:border-gray-600 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">{s.plan_day}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(s.started_at).toLocaleDateString("en-GB", {
                      weekday: "short", day: "numeric", month: "short", year: "numeric",
                    })}
                  </p>
                </div>
                <span className={`text-xs font-semibold ${s.completed_at ? "text-green-400" : "text-gray-500"}`}>
                  {s.completed_at ? "Done" : "Incomplete"}
                </span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
