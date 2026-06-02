export const maxDuration = 30;

// POST /api/rest-day-tips
// Given the user's last workout muscle focus, returns personalised recovery tips + stretching routine.
import { NextRequest, NextResponse } from "next/server";
import { askClaude, extractJSON } from "@/lib/claude";

export async function POST(req: NextRequest) {
  try {
    const { lastMuscleFocus, dayName } = await req.json();

    const prompt = `You are an expert personal trainer giving a rest-day recovery briefing.

The user's most recent workout focused on: ${lastMuscleFocus ?? "general strength"} (${dayName ?? "workout"}).

Return ONLY valid JSON, no markdown, no explanation:
{
  "headline": "One punchy, motivating rest-day headline (max 10 words)",
  "why_it_matters": "2-3 sentences on why rest is essential after this specific workout.",
  "tips": [
    { "icon": "💧", "title": "Hydration", "body": "Specific tip" },
    { "icon": "😴", "title": "Sleep", "body": "Specific tip" },
    { "icon": "🥗", "title": "Nutrition", "body": "Specific tip tailored to this muscle group" }
  ],
  "stretches": [
    { "name": "Stretch name", "duration": "30-45 sec", "note": "Brief form cue" },
    { "name": "Stretch name", "duration": "30-45 sec", "note": "Brief form cue" },
    { "name": "Stretch name", "duration": "30-45 sec", "note": "Brief form cue" },
    { "name": "Stretch name", "duration": "30-45 sec", "note": "Brief form cue" }
  ],
  "tomorrow_preview": "One sentence teasing what muscle group they should hit next and why the rest helped."
}

Make stretches specific to the muscles just worked (${lastMuscleFocus ?? "full body"}).`;

    const raw = await askClaude(prompt);
    const cleaned = extractJSON(raw);
    const result = JSON.parse(cleaned);
    return NextResponse.json(result);
  } catch (err) {
    console.error("rest-day-tips error:", err);
    return NextResponse.json({ error: "Could not generate tips." }, { status: 500 });
  }
}
