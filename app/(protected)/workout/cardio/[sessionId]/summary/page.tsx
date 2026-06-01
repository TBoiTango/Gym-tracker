// Cardio session summary page.
import { redirect } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import Card from "@/components/ui/Card";

interface Props { params: { sessionId: string } }

function formatDuration(mins: number) {
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

export default async function CardioSummaryPage({ params }: Props) {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: ws } = await supabase
    .from("workout_sessions")
    .select("id, plan_day, started_at, cardio_data, user_id")
    .eq("id", params.sessionId)
    .single();

  if (!ws || ws.user_id !== session.user.id) redirect("/dashboard");

  const cd = ws.cardio_data as Record<string, unknown>;
  const type = cd?.type as string;
  const duration = cd?.duration_minutes as number;
  const notes = cd?.notes as string;

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Cardio Logged 🎉</h1>
        <p className="text-gray-400 mt-1">{ws.plan_day}</p>
        <p className="text-sm text-gray-500 mt-0.5">
          {new Date(ws.started_at).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" })}
        </p>
      </div>

      <Card className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">Summary</p>

        <div className="space-y-3">
          <Row label="Duration" value={formatDuration(duration)} />

          {type === "run" && <>
            <Row label="Distance" value={`${cd.distance} ${cd.unit}`} />
            <Row label="Terrain" value={cd.terrain as string} />
          </>}

          {type === "treadmill" && <>
            {cd.distance && <Row label="Distance" value={`${cd.distance} mi`} />}
            <Row label="Speed" value={`${cd.speed_mph} mph`} />
            <Row label="Incline" value={`${cd.incline_pct}%`} />
          </>}

          {type === "bike" && <>
            {cd.distance && <Row label="Distance" value={`${cd.distance} mi`} />}
            <Row label="Type" value={cd.bike_type as string} />
            {cd.resistance && <Row label={cd.bike_type === "indoor" ? "Resistance" : "Terrain"} value={cd.resistance as string} />}
          </>}

          {type === "row" && <>
            {cd.distance_meters && <Row label="Distance" value={`${cd.distance_meters} m`} />}
            {cd.split_500m && <Row label="Split /500m" value={cd.split_500m as string} />}
          </>}

          {type === "swim" && <>
            <Row label="Total Distance" value={`${cd.total_distance} ${cd.unit}`} />
            {(cd.strokes as { stroke: string; distance: number }[]).map((s, i) => (
              <Row key={i} label={s.stroke} value={`${s.distance} ${cd.unit}`} />
            ))}
          </>}
        </div>

        {notes && (
          <div className="mt-4 pt-4 border-t border-gray-800">
            <p className="text-xs text-gray-500 mb-1">Notes</p>
            <p className="text-sm text-gray-300">{notes}</p>
          </div>
        )}
      </Card>

      <Link href="/dashboard"
        className="block w-full rounded-xl bg-orange-500 py-4 text-center text-lg font-semibold text-white hover:bg-orange-600 transition-colors">
        Back to Dashboard
      </Link>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-400">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
