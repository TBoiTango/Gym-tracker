export const maxDuration = 30;

// POST /api/suggest-cardio
// Takes last cardio session data + how it felt, returns suggested intervals for today.
import { NextRequest, NextResponse } from "next/server";
import { askClaude, extractJSON } from "@/lib/claude";

interface Interval {
  label: string;
  speedMph?: number;
  incline?: number;
  durationSec?: number;
  split500m?: string;
  level?: number;
}

interface SuggestRequest {
  cardioType: "treadmill" | "row" | "stairs";
  lastIntervals: Interval[];
  lastRounds: number;
  lastFelt: 1 | 2 | 3; // 1=Easy, 2=Moderate, 3=Hard
}

export async function POST(req: NextRequest) {
  try {
    const { cardioType, lastIntervals, lastRounds, lastFelt }: SuggestRequest = await req.json();

    const feltLabel = lastFelt === 1 ? "Easy" : lastFelt === 3 ? "Hard" : "Moderate";

    const typeDescriptions: Record<string, string> = {
      treadmill: "treadmill interval session (speed in mph, incline in %, duration in seconds)",
      row: "rowing machine interval session (split per 500m as 'M:SS' string, duration in seconds)",
      stairs: "stair climber interval session (level 1-20, duration in seconds)",
    };

    const prompt = `You are a personal trainer helping a user progressively improve their ${typeDescriptions[cardioType]}.

Last session:
- Intervals: ${JSON.stringify(lastIntervals, null, 2)}
- Rounds: ${lastRounds}
- How it felt: ${feltLabel}

Based on how it felt, suggest today's intervals following these progressive overload rules:
- Easy: increase intensity meaningfully (e.g. +0.5-1.0 mph speed, or +1-2% incline, or reduce rest interval duration by 15s)
- Moderate: small increase (e.g. +0.5 mph on work intervals only, or +1% incline on work intervals)
- Hard: keep identical or reduce slightly to allow recovery (e.g. -0.5 mph or reduce rounds by 1)

Rules:
1. Keep the same interval structure (same number of intervals, same labels)
2. Keep rounds the same unless felt=Hard (then reduce by 1, minimum 1)
3. Make changes feel achievable, not overwhelming
4. Return ONLY valid JSON, no markdown, no explanation

Return this exact shape:
{
  "suggestion": "one sentence explaining what changed and why",
  "intervals": [ /* same structure as input intervals, with updated values */ ],
  "rounds": 4
}`;

    const raw = await askClaude(prompt);
    const cleaned = extractJSON(raw);
    const result = JSON.parse(cleaned);

    return NextResponse.json(result);
  } catch (err) {
    console.error("suggest-cardio error:", err);
    return NextResponse.json({ error: "Could not generate suggestion." }, { status: 500 });
  }
}
