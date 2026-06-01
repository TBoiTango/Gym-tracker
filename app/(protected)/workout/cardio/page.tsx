"use client";

// Cardio-only session logger.
// User picks a type, fills in relevant fields, saves — no lifting involved.
// Stored in workout_sessions with session_type="cardio" and cardio_data jsonb.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

type CardioType = "run" | "treadmill" | "bike" | "row" | "swim";

const CARDIO_TYPES: { type: CardioType; emoji: string; label: string }[] = [
  { type: "run",       emoji: "🏃", label: "Run"            },
  { type: "treadmill", emoji: "⚡", label: "Treadmill"      },
  { type: "bike",      emoji: "🚴", label: "Bike"           },
  { type: "row",       emoji: "🚣", label: "Rowing Machine" },
  { type: "swim",      emoji: "🏊", label: "Swim"           },
];

const SWIM_STROKES = ["Freestyle", "Backstroke", "Breaststroke", "Butterfly", "IM / Mixed"];
const TERRAINS     = ["Road", "Trail", "Track", "Treadmill"];

export default function CardioSessionPage() {
  const router = useRouter();
  const supabase = createClient();

  const [type, setType] = useState<CardioType | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ── Shared fields ────────────────────────────────────────────────────────
  const [durationMins, setDurationMins] = useState(30);
  const [notes, setNotes] = useState("");

  // ── Run ──────────────────────────────────────────────────────────────────
  const [runDistance, setRunDistance] = useState("");
  const [runUnit, setRunUnit] = useState<"miles" | "km">("miles");
  const [runTerrain, setRunTerrain] = useState("Road");

  // ── Treadmill ────────────────────────────────────────────────────────────
  const [tmSpeed, setTmSpeed] = useState("");
  const [tmIncline, setTmIncline] = useState("0");
  const [tmDistance, setTmDistance] = useState("");

  // ── Bike ─────────────────────────────────────────────────────────────────
  const [bikeDistance, setBikeDistance] = useState("");
  const [bikeResistance, setBikeResistance] = useState("");
  const [bikeType, setBikeType] = useState<"indoor" | "outdoor">("indoor");

  // ── Row ──────────────────────────────────────────────────────────────────
  const [rowDistance, setRowDistance] = useState("");
  const [rowSplit, setRowSplit] = useState("");   // min:sec per 500m

  // ── Swim ─────────────────────────────────────────────────────────────────
  const [swimUnit, setSwimUnit] = useState<"yards" | "meters">("yards");
  const [strokes, setStrokes] = useState<{ stroke: string; distance: string }[]>([
    { stroke: "Freestyle", distance: "" },
  ]);

  const addStroke = () => setStrokes((prev) => [...prev, { stroke: "Freestyle", distance: "" }]);
  const updateStroke = (i: number, field: "stroke" | "distance", val: string) => {
    setStrokes((prev) => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  };
  const removeStroke = (i: number) => setStrokes((prev) => prev.filter((_, idx) => idx !== i));
  const totalSwimDistance = strokes.reduce((sum, s) => sum + (parseFloat(s.distance) || 0), 0);

  // ── Save ─────────────────────────────────────────────────────────────────
  const save = async () => {
    if (!type) return;
    setSaving(true);
    setError("");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    let cardioData: Record<string, unknown> = { type, duration_minutes: durationMins, notes };

    if (type === "run") {
      cardioData = { ...cardioData, distance: parseFloat(runDistance) || 0, unit: runUnit, terrain: runTerrain };
    } else if (type === "treadmill") {
      cardioData = { ...cardioData, speed_mph: parseFloat(tmSpeed) || 0, incline_pct: parseFloat(tmIncline) || 0, distance: parseFloat(tmDistance) || 0 };
    } else if (type === "bike") {
      cardioData = { ...cardioData, distance: parseFloat(bikeDistance) || 0, resistance: bikeResistance, bike_type: bikeType };
    } else if (type === "row") {
      cardioData = { ...cardioData, distance_meters: parseFloat(rowDistance) || 0, split_500m: rowSplit };
    } else if (type === "swim") {
      const filled = strokes.filter((s) => s.distance);
      cardioData = { ...cardioData, unit: swimUnit, total_distance: totalSwimDistance, strokes: filled };
    }

    const label = CARDIO_TYPES.find((c) => c.type === type)?.label ?? "Cardio";

    const { data: ws, error: err } = await supabase
      .from("workout_sessions")
      .insert({
        user_id: session.user.id,
        plan_day: label,
        session_type: "cardio",
        cardio_data: cardioData,
        completed_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (err || !ws) {
      setError("Failed to save. Please try again.");
      setSaving(false);
      return;
    }

    router.push(`/workout/cardio/${ws.id}/summary`);
  };

  return (
    <main className="mx-auto max-w-lg px-4 py-8">
      <Link href="/dashboard" className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300">
        ← Dashboard
      </Link>

      <h1 className="text-2xl font-bold mb-1">Cardio Session</h1>
      <p className="text-sm text-gray-400 mb-6">Log a standalone cardio workout.</p>

      {/* Type picker */}
      <div className="grid grid-cols-5 gap-2 mb-6">
        {CARDIO_TYPES.map((c) => (
          <button
            key={c.type}
            onClick={() => setType(c.type)}
            className={`flex flex-col items-center gap-1 rounded-xl border py-3 text-xs font-semibold transition-colors ${
              type === c.type
                ? "border-orange-500 bg-orange-500/10 text-white"
                : "border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500"
            }`}
          >
            <span className="text-xl">{c.emoji}</span>
            {c.label}
          </button>
        ))}
      </div>

      {type && (
        <div className="space-y-5">

          {/* Duration — shared */}
          <Card>
            <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wider">Duration</p>
            <div className="flex items-center gap-4">
              <StepBtn onClick={() => setDurationMins((d) => Math.max(5, d - 5))}>−</StepBtn>
              <span className="flex-1 text-center text-2xl font-bold">{durationMins} min</span>
              <StepBtn onClick={() => setDurationMins((d) => d + 5)}>+</StepBtn>
            </div>
          </Card>

          {/* ── Run ── */}
          {type === "run" && (
            <Card>
              <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wider">Run Details</p>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="number" inputMode="decimal" placeholder="Distance"
                    value={runDistance} onChange={(e) => setRunDistance(e.target.value)}
                    className="flex-1 rounded-xl border border-gray-600 bg-gray-800 px-4 py-3 text-white focus:border-orange-500 focus:outline-none"
                  />
                  <div className="grid grid-cols-2 gap-1">
                    {(["miles", "km"] as const).map((u) => (
                      <button key={u} onClick={() => setRunUnit(u)}
                        className={`rounded-xl border px-3 py-2 text-sm font-semibold transition-colors ${runUnit === u ? "border-orange-500 bg-orange-500/10 text-white" : "border-gray-700 text-gray-400"}`}>
                        {u}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-2">Terrain</p>
                  <div className="grid grid-cols-4 gap-1">
                    {TERRAINS.map((t) => (
                      <button key={t} onClick={() => setRunTerrain(t)}
                        className={`rounded-xl border py-2 text-xs font-semibold transition-colors ${runTerrain === t ? "border-orange-500 bg-orange-500/10 text-white" : "border-gray-700 text-gray-400"}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* ── Treadmill ── */}
          {type === "treadmill" && (
            <Card>
              <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wider">Treadmill Details</p>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Speed (mph)" value={tmSpeed} onChange={setTmSpeed} placeholder="6.5" />
                <Field label="Incline (%)" value={tmIncline} onChange={setTmIncline} placeholder="0" />
                <Field label="Distance (mi)" value={tmDistance} onChange={setTmDistance} placeholder="2.0" />
              </div>
            </Card>
          )}

          {/* ── Bike ── */}
          {type === "bike" && (
            <Card>
              <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wider">Bike Details</p>
              <div className="grid grid-cols-2 gap-2 mb-3">
                {(["indoor", "outdoor"] as const).map((bt) => (
                  <button key={bt} onClick={() => setBikeType(bt)}
                    className={`rounded-xl border py-2 text-sm font-semibold capitalize transition-colors ${bikeType === bt ? "border-orange-500 bg-orange-500/10 text-white" : "border-gray-700 text-gray-400"}`}>
                    {bt}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Distance (mi)" value={bikeDistance} onChange={setBikeDistance} placeholder="10" />
                <Field label={bikeType === "indoor" ? "Resistance" : "Terrain / Route"} value={bikeResistance} onChange={setBikeResistance} placeholder={bikeType === "indoor" ? "12" : "Hilly"} />
              </div>
            </Card>
          )}

          {/* ── Row ── */}
          {type === "row" && (
            <Card>
              <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wider">Rowing Details</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Distance (m)" value={rowDistance} onChange={setRowDistance} placeholder="5000" />
                <Field label="Split /500m" value={rowSplit} onChange={setRowSplit} placeholder="2:05" />
              </div>
            </Card>
          )}

          {/* ── Swim ── */}
          {type === "swim" && (
            <Card>
              <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wider">Swim Details</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {(["yards", "meters"] as const).map((u) => (
                  <button key={u} onClick={() => setSwimUnit(u)}
                    className={`rounded-xl border py-2 text-sm font-semibold capitalize transition-colors ${swimUnit === u ? "border-orange-500 bg-orange-500/10 text-white" : "border-gray-700 text-gray-400"}`}>
                    {u}
                  </button>
                ))}
              </div>

              <div className="space-y-2 mb-3">
                {strokes.map((s, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <select
                      value={s.stroke}
                      onChange={(e) => updateStroke(i, "stroke", e.target.value)}
                      className="flex-1 rounded-xl border border-gray-600 bg-gray-800 px-3 py-2.5 text-sm text-white focus:border-orange-500 focus:outline-none"
                    >
                      {SWIM_STROKES.map((st) => <option key={st}>{st}</option>)}
                    </select>
                    <input
                      type="number" inputMode="numeric" placeholder={swimUnit}
                      value={s.distance} onChange={(e) => updateStroke(i, "distance", e.target.value)}
                      className="w-24 rounded-xl border border-gray-600 bg-gray-800 px-3 py-2.5 text-sm text-white text-center focus:border-orange-500 focus:outline-none"
                    />
                    {strokes.length > 1 && (
                      <button onClick={() => removeStroke(i)} className="text-gray-600 hover:text-red-400 text-lg">✕</button>
                    )}
                  </div>
                ))}
              </div>

              <button
                onClick={addStroke}
                className="w-full rounded-xl border border-dashed border-gray-600 py-2 text-sm text-gray-400 hover:border-orange-500 hover:text-orange-400 transition-colors"
              >
                + Add stroke
              </button>

              {totalSwimDistance > 0 && (
                <p className="text-center text-sm text-orange-400 font-semibold mt-3">
                  Total: {totalSwimDistance.toLocaleString()} {swimUnit}
                </p>
              )}
            </Card>
          )}

          {/* Notes */}
          <Card>
            <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Notes (optional)</p>
            <textarea
              value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="How did it feel? Any PRs?"
              rows={2}
              className="w-full rounded-xl border border-gray-600 bg-gray-800 px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-orange-500 focus:outline-none resize-none"
            />
          </Card>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <Button onClick={save} loading={saving} className="w-full text-lg py-4">
            Save Cardio Session ✅
          </Button>
        </div>
      )}

      {!type && (
        <div className="text-center py-16 text-gray-600">
          <p className="text-5xl mb-3">🏃</p>
          <p className="text-sm">Pick a cardio type above to get started</p>
        </div>
      )}
    </main>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <input
        type="number" inputMode="decimal"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-gray-600 bg-gray-800 px-3 py-2.5 text-white text-center focus:border-orange-500 focus:outline-none"
      />
    </div>
  );
}

function StepBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className="flex h-11 w-11 items-center justify-center rounded-xl border border-gray-700 bg-gray-800 text-xl font-bold text-white hover:bg-gray-700 transition-colors">
      {children}
    </button>
  );
}
