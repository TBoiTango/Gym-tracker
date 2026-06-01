"use client";

// Cardio-only session logger.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

type CardioType = "run" | "treadmill" | "stairs" | "bike" | "row" | "swim";

const CARDIO_TYPES: { type: CardioType; emoji: string; label: string }[] = [
  { type: "run",       emoji: "🏃", label: "Run"      },
  { type: "treadmill", emoji: "⚡", label: "Treadmill" },
  { type: "stairs",    emoji: "🪜", label: "Stairs"    },
  { type: "bike",      emoji: "🚴", label: "Bike"      },
  { type: "row",       emoji: "🚣", label: "Rowing"    },
  { type: "swim",      emoji: "🏊", label: "Swim"      },
];

const SWIM_STROKES = ["Freestyle", "Backstroke", "Breaststroke", "Butterfly", "IM / Mixed"];
const TERRAINS     = ["Road", "Trail", "Track", "Treadmill"];

// ── Interval types ────────────────────────────────────────────────────────────
interface TreadmillInterval { label: string; speedMph: number; incline: number; durationSec: number; }
interface RowInterval       { label: string; split500m: string; durationSec: number; }
interface StairsInterval    { label: string; level: number; durationSec: number; }

function formatSec(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return sec === 0 ? `${m} min` : `${m}:${String(sec).padStart(2, "0")}`;
}

const DEFAULT_TM_INTERVALS: TreadmillInterval[] = [
  { label: "Walk",   speedMph: 3.5, incline: 0, durationSec: 120 },
  { label: "Run",    speedMph: 6.5, incline: 0, durationSec: 60  },
];

const DEFAULT_ROW_INTERVALS: RowInterval[] = [
  { label: "Easy",  split500m: "2:30", durationSec: 120 },
  { label: "Hard",  split500m: "2:00", durationSec: 60  },
];

const DEFAULT_STAIRS_INTERVALS: StairsInterval[] = [
  { label: "Climb",  level: 8,  durationSec: 60  },
  { label: "Rest",   level: 3,  durationSec: 30  },
];

export default function CardioSessionPage() {
  const router = useRouter();
  const supabase = createClient();

  const [type, setType] = useState<CardioType | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ── Shared ───────────────────────────────────────────────────────────────
  const [durationMins, setDurationMins] = useState(30);
  const [rounds, setRounds] = useState(4);
  const [notes, setNotes] = useState("");

  // ── Treadmill intervals ──────────────────────────────────────────────────
  const [tmIntervals, setTmIntervals] = useState<TreadmillInterval[]>(DEFAULT_TM_INTERVALS);

  const updateTm = (i: number, field: keyof TreadmillInterval, delta: number) => {
    setTmIntervals((prev) => prev.map((iv, idx) => {
      if (idx !== i) return iv;
      let val = typeof iv[field] === "number" ? (iv[field] as number) + delta : iv[field];
      if (field === "speedMph") val = Math.max(0.5, Math.round((val as number) * 10) / 10);
      if (field === "incline")  val = Math.max(0, Math.min(15, val as number));
      if (field === "durationSec") val = Math.max(15, val as number);
      return { ...iv, [field]: val };
    }));
  };

  const addTmInterval = () => setTmIntervals((p) => [...p, { label: "Interval", speedMph: 5.0, incline: 0, durationSec: 60 }]);
  const removeTmInterval = (i: number) => setTmIntervals((p) => p.filter((_, idx) => idx !== i));
  const tmTotal = tmIntervals.reduce((s, iv) => s + iv.durationSec, 0) * rounds;

  // ── Rowing intervals ─────────────────────────────────────────────────────
  const [rowIntervals, setRowIntervals] = useState<RowInterval[]>(DEFAULT_ROW_INTERVALS);

  const updateRow = (i: number, field: keyof RowInterval, delta: number | string) => {
    setRowIntervals((prev) => prev.map((iv, idx) => {
      if (idx !== i) return iv;
      if (field === "split500m") return { ...iv, split500m: delta as string };
      let val = (iv[field] as number) + (delta as number);
      if (field === "durationSec") val = Math.max(15, val);
      return { ...iv, [field]: val };
    }));
  };

  const addRowInterval = () => setRowIntervals((p) => [...p, { label: "Interval", split500m: "2:10", durationSec: 60 }]);
  const removeRowInterval = (i: number) => setRowIntervals((p) => p.filter((_, idx) => idx !== i));
  const rowTotal = rowIntervals.reduce((s, iv) => s + iv.durationSec, 0) * rounds;

  // ── Stairs intervals ─────────────────────────────────────────────────────
  const [stairsIntervals, setStairsIntervals] = useState<StairsInterval[]>(DEFAULT_STAIRS_INTERVALS);

  const updateStairs = (i: number, field: keyof StairsInterval, delta: number) => {
    setStairsIntervals((prev) => prev.map((iv, idx) => {
      if (idx !== i) return iv;
      let val = (iv[field] as number) + delta;
      if (field === "level") val = Math.max(1, Math.min(20, val));
      if (field === "durationSec") val = Math.max(15, val);
      return { ...iv, [field]: val };
    }));
  };

  const addStairsInterval = () => setStairsIntervals((p) => [...p, { label: "Interval", level: 8, durationSec: 45 }]);
  const removeStairsInterval = (i: number) => setStairsIntervals((p) => p.filter((_, idx) => idx !== i));
  const stairsTotal = stairsIntervals.reduce((s, iv) => s + iv.durationSec, 0) * rounds;

  // ── Run ──────────────────────────────────────────────────────────────────
  const [runDistance, setRunDistance] = useState("");
  const [runUnit, setRunUnit] = useState<"miles" | "km">("miles");
  const [runTerrain, setRunTerrain] = useState("Road");

  // ── Bike ─────────────────────────────────────────────────────────────────
  const [bikeDistance, setBikeDistance] = useState("");
  const [bikeResistance, setBikeResistance] = useState("");
  const [bikeType, setBikeType] = useState<"indoor" | "outdoor">("indoor");

  // ── Swim ─────────────────────────────────────────────────────────────────
  const [swimUnit, setSwimUnit] = useState<"yards" | "meters">("yards");
  const [strokes, setStrokes] = useState<{ stroke: string; distance: string }[]>([
    { stroke: "Freestyle", distance: "" },
  ]);

  const addStroke = () => setStrokes((prev) => [...prev, { stroke: "Freestyle", distance: "" }]);
  const updateStroke = (i: number, field: "stroke" | "distance", val: string) =>
    setStrokes((prev) => prev.map((s, idx) => idx === i ? { ...s, [field]: val } : s));
  const removeStroke = (i: number) => setStrokes((prev) => prev.filter((_, idx) => idx !== i));
  const totalSwimDistance = strokes.reduce((sum, s) => sum + (parseFloat(s.distance) || 0), 0);

  // ── Save ─────────────────────────────────────────────────────────────────
  const save = async () => {
    if (!type) return;
    setSaving(true);
    setError("");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.push("/login"); return; }

    let cardioData: Record<string, unknown> = { type, notes };

    if (type === "treadmill") {
      cardioData = { ...cardioData, intervals: tmIntervals, rounds, total_seconds: tmTotal };
    } else if (type === "row") {
      cardioData = { ...cardioData, intervals: rowIntervals, rounds, total_seconds: rowTotal };
    } else if (type === "stairs") {
      cardioData = { ...cardioData, intervals: stairsIntervals, rounds, total_seconds: stairsTotal };
    } else if (type === "run") {
      cardioData = { ...cardioData, duration_minutes: durationMins, distance: parseFloat(runDistance) || 0, unit: runUnit, terrain: runTerrain };
    } else if (type === "bike") {
      cardioData = { ...cardioData, duration_minutes: durationMins, distance: parseFloat(bikeDistance) || 0, resistance: bikeResistance, bike_type: bikeType };
    } else if (type === "swim") {
      const filled = strokes.filter((s) => s.distance);
      cardioData = { ...cardioData, duration_minutes: durationMins, unit: swimUnit, total_distance: totalSwimDistance, strokes: filled };
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

    if (err || !ws) { setError("Failed to save. Please try again."); setSaving(false); return; }
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
      <div className="grid grid-cols-6 gap-2 mb-6">
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

          {/* ── Treadmill Intervals ── */}
          {type === "treadmill" && (
            <IntervalSection
              title="Treadmill Intervals"
              rounds={rounds}
              setRounds={setRounds}
              totalSec={tmTotal}
              onAdd={addTmInterval}
            >
              {tmIntervals.map((iv, i) => (
                <IntervalRow
                  key={i}
                  index={i}
                  label={iv.label}
                  onLabelChange={(v) => setTmIntervals((p) => p.map((x, idx) => idx === i ? { ...x, label: v } : x))}
                  onRemove={tmIntervals.length > 1 ? () => removeTmInterval(i) : undefined}
                >
                  <SpinField label="Speed (mph)" value={iv.speedMph.toFixed(1)} onDown={() => updateTm(i, "speedMph", -0.5)} onUp={() => updateTm(i, "speedMph", 0.5)} />
                  <SpinField label="Incline (%)" value={`${iv.incline}%`} onDown={() => updateTm(i, "incline", -1)} onUp={() => updateTm(i, "incline", 1)} />
                  <SpinField label="Duration" value={formatSec(iv.durationSec)} onDown={() => updateTm(i, "durationSec", -15)} onUp={() => updateTm(i, "durationSec", 15)} />
                </IntervalRow>
              ))}
            </IntervalSection>
          )}

          {/* ── Rowing Intervals ── */}
          {type === "row" && (
            <IntervalSection
              title="Rowing Intervals"
              rounds={rounds}
              setRounds={setRounds}
              totalSec={rowTotal}
              onAdd={addRowInterval}
            >
              {rowIntervals.map((iv, i) => (
                <IntervalRow
                  key={i}
                  index={i}
                  label={iv.label}
                  onLabelChange={(v) => setRowIntervals((p) => p.map((x, idx) => idx === i ? { ...x, label: v } : x))}
                  onRemove={rowIntervals.length > 1 ? () => removeRowInterval(i) : undefined}
                >
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Split /500m</p>
                    <input
                      type="text"
                      value={iv.split500m}
                      onChange={(e) => updateRow(i, "split500m", e.target.value)}
                      placeholder="2:05"
                      className="w-full rounded-lg border border-gray-600 bg-gray-800 px-2 py-1.5 text-center text-sm font-bold text-white focus:border-orange-500 focus:outline-none"
                    />
                  </div>
                  <SpinField label="Duration" value={formatSec(iv.durationSec)} onDown={() => updateRow(i, "durationSec", -15)} onUp={() => updateRow(i, "durationSec", 15)} />
                </IntervalRow>
              ))}
            </IntervalSection>
          )}

          {/* ── Stairs Intervals ── */}
          {type === "stairs" && (
            <IntervalSection
              title="Stair Climber Intervals"
              rounds={rounds}
              setRounds={setRounds}
              totalSec={stairsTotal}
              onAdd={addStairsInterval}
            >
              {stairsIntervals.map((iv, i) => (
                <IntervalRow
                  key={i}
                  index={i}
                  label={iv.label}
                  onLabelChange={(v) => setStairsIntervals((p) => p.map((x, idx) => idx === i ? { ...x, label: v } : x))}
                  onRemove={stairsIntervals.length > 1 ? () => removeStairsInterval(i) : undefined}
                >
                  <SpinField label="Level" value={`${iv.level}`} onDown={() => updateStairs(i, "level", -1)} onUp={() => updateStairs(i, "level", 1)} />
                  <SpinField label="Duration" value={formatSec(iv.durationSec)} onDown={() => updateStairs(i, "durationSec", -15)} onUp={() => updateStairs(i, "durationSec", 15)} />
                </IntervalRow>
              ))}
            </IntervalSection>
          )}

          {/* ── Run ── */}
          {type === "run" && (
            <>
              <Card>
                <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wider">Duration</p>
                <div className="flex items-center gap-4">
                  <StepBtn onClick={() => setDurationMins((d) => Math.max(5, d - 5))}>−</StepBtn>
                  <span className="flex-1 text-center text-2xl font-bold">{durationMins} min</span>
                  <StepBtn onClick={() => setDurationMins((d) => d + 5)}>+</StepBtn>
                </div>
              </Card>
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
            </>
          )}

          {/* ── Bike ── */}
          {type === "bike" && (
            <>
              <Card>
                <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wider">Duration</p>
                <div className="flex items-center gap-4">
                  <StepBtn onClick={() => setDurationMins((d) => Math.max(5, d - 5))}>−</StepBtn>
                  <span className="flex-1 text-center text-2xl font-bold">{durationMins} min</span>
                  <StepBtn onClick={() => setDurationMins((d) => d + 5)}>+</StepBtn>
                </div>
              </Card>
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
            </>
          )}

          {/* ── Swim ── */}
          {type === "swim" && (
            <>
              <Card>
                <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wider">Duration</p>
                <div className="flex items-center gap-4">
                  <StepBtn onClick={() => setDurationMins((d) => Math.max(5, d - 5))}>−</StepBtn>
                  <span className="flex-1 text-center text-2xl font-bold">{durationMins} min</span>
                  <StepBtn onClick={() => setDurationMins((d) => d + 5)}>+</StepBtn>
                </div>
              </Card>
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
                <button onClick={addStroke} className="w-full rounded-xl border border-dashed border-gray-600 py-2 text-sm text-gray-400 hover:border-orange-500 hover:text-orange-400 transition-colors">
                  + Add stroke
                </button>
                {totalSwimDistance > 0 && (
                  <p className="text-center text-sm text-orange-400 font-semibold mt-3">
                    Total: {totalSwimDistance.toLocaleString()} {swimUnit}
                  </p>
                )}
              </Card>
            </>
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

// ── Shared interval UI components ─────────────────────────────────────────────

function IntervalSection({
  title, rounds, setRounds, totalSec, onAdd, children,
}: {
  title: string; rounds: number; setRounds: (r: number) => void;
  totalSec: number; onAdd: () => void; children: React.ReactNode;
}) {
  return (
    <Card>
      <p className="text-xs text-gray-500 mb-3 font-medium uppercase tracking-wider">{title}</p>
      <div className="space-y-3 mb-3">{children}</div>
      <button
        onClick={onAdd}
        className="w-full mb-4 rounded-xl border border-dashed border-gray-600 py-2 text-xs text-gray-400 hover:border-orange-500 hover:text-orange-400 transition-colors"
      >
        + Add interval
      </button>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-gray-400">Rounds</p>
        <div className="flex items-center gap-3">
          <MiniBtn onClick={() => setRounds(Math.max(1, rounds - 1))}>−</MiniBtn>
          <span className="text-lg font-bold w-6 text-center">{rounds}</span>
          <MiniBtn onClick={() => setRounds(rounds + 1)}>+</MiniBtn>
        </div>
      </div>
      <p className="text-xs text-gray-500 text-center">
        Total: {formatSec(totalSec)} · {rounds} rounds
      </p>
    </Card>
  );
}

function IntervalRow({
  index, label, onLabelChange, onRemove, children,
}: {
  index: number; label: string; onLabelChange: (v: string) => void;
  onRemove?: () => void; children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900 p-3">
      <div className="flex items-center justify-between mb-2">
        <input
          value={label}
          onChange={(e) => onLabelChange(e.target.value)}
          className="text-xs font-semibold bg-transparent text-gray-300 border-b border-gray-700 focus:border-orange-500 focus:outline-none w-24"
          placeholder={`Interval ${index + 1}`}
        />
        {onRemove && (
          <button onClick={onRemove} className="text-xs text-red-400 hover:text-red-300">Remove</button>
        )}
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Array.isArray(children) ? (children as React.ReactNode[]).length : 1}, 1fr)` }}>
        {children}
      </div>
    </div>
  );
}

function SpinField({ label, value, onDown, onUp }: { label: string; value: string; onDown: () => void; onUp: () => void }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <div className="flex items-center gap-1">
        <MiniBtn onClick={onDown}>−</MiniBtn>
        <span className="flex-1 text-center text-xs font-bold tabular-nums">{value}</span>
        <MiniBtn onClick={onUp}>+</MiniBtn>
      </div>
    </div>
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

function MiniBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-700 bg-gray-800 text-sm font-bold text-white hover:bg-gray-700 transition-colors">
      {children}
    </button>
  );
}
