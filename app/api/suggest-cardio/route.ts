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
  lastFelt: 1 | 2 | 3 | 4; // 1=Easy, 2=Moderate, 3=Hard, 4=All Out
}

export async function POST(req: NextRequest) {
  try {
    const { cardioType, lastIntervals, lastRounds, lastFelt }: SuggestRequest = await req.json();

    const feltLabel =
      lastFelt === 1 ? "Easy" :
      lastFelt === 2 ? "Moderate" :
      lastFelt === 3 ? "Hard" :
      "All Out";

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

Adjust today's session using EXACTLY these progression rules based on how it felt:
- Easy: increase intensity meaningfully (+0.5-1.0 mph on work intervals, or +1-2% incline, or cut rest interval by 15s). Add 1 round if currently under 5.
- Moderate: small increase (+0.5 mph on work intervals only, or +1% incline on work intervals). Keep rounds the same.
- Hard: keep identical — do not increase anything. Reduce rounds by 1 if currently above 3.
- All Out: back off for recovery (-0.5 mph on work intervals, or -1% incline). Reduce rounds by 1, minimum 2. User pushed too hard and needs a recovery session.

Rules:
1. Keep the same interval structure (same number of intervals, same labels)
2. suggestion must be ONE sentence that specifically states what changed and why based on the rating above
3. Make changes feel achievable, not overwhelming
4. Return ONLY valid JSON, no markdown, no explanation

Return this exact shape:
{
  "suggestion": "one sentence — e.g. 'Bumped work intervals to 7.0 mph since last session felt Easy'",
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
