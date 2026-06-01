export const maxDuration = 60;

// POST /api/generate-warmup
// Generates a tailored warmup based on the day's muscle focus.
import { NextRequest, NextResponse } from "next/server";
import { askClaude, extractJSON } from "@/lib/claude";

export interface WarmupExercise {
  name: string;
  duration: string;   // e.g. "45 seconds" or "10 reps each side"
  note: string;
}

export async function POST(req: NextRequest) {
  try {
    const { muscle_focus, day_name } = await req.json();

    const prompt = `You are a strength coach. Generate a 5-minute warmup routine for a ${day_name} (${muscle_focus}) lifting session.

Include 5-6 exercises covering:
1. Light movement / pulse raising (1-2 exercises)
2. Mobility work for the target muscles (2-3 exercises)
3. Warmup activation (1-2 exercises)

Rules:
- No equipment required (bodyweight only)
- Each exercise takes 30-60 seconds
- Practical coaching note, one sentence each
- Return ONLY valid JSON, no markdown, no explanation

Return exactly this JSON shape:
{
  "exercises": [
    {
      "name": "Arm Circles",
      "duration": "30 seconds each direction",
      "note": "Start small and gradually increase the circle size."
    }
  ]
}`;

    const raw = await askClaude(prompt);
    const cleaned = extractJSON(raw);

    try {
      const data = JSON.parse(cleaned);
      return NextResponse.json(data);
    } catch {
      console.error("Warmup JSON parse failed:", raw);
      return NextResponse.json({ error: "Failed to generate warmup." }, { status: 500 });
    }
  } catch (err) {
    console.error("generate-warmup error:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
