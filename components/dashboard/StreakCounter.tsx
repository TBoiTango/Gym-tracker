"use client";

// Calculates consecutive weeks with at least 1 completed session.
export default function StreakCounter({
  sessions,
}: {
  sessions: { completed_at?: string | null }[];
}) {
  const streak = calculateStreak(sessions);
  return (
    <div className="text-right">
      <p className="text-2xl font-bold text-orange-400">{streak}</p>
      <p className="text-xs text-gray-500">week streak</p>
    </div>
  );
}

function calculateStreak(sessions: { completed_at?: string | null }[]): number {
  const completed = sessions
    .filter((s) => s.completed_at)
    .map((s) => new Date(s.completed_at!));

  if (completed.length === 0) return 0;

  // Check each past week going backwards
  let streak = 0;
  const now = new Date();

  for (let w = 0; w < 52; w++) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - (w + 1) * 7);
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() - w * 7);

    const hasSession = completed.some(
      (d) => d >= weekStart && d < weekEnd
    );

    if (hasSession) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
