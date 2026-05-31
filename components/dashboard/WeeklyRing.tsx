"use client";

// SVG ring showing how many sessions completed this week vs target.
export default function WeeklyRing({ completed, target }: { completed: number; target: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(completed / target, 1);
  const dashOffset = circumference * (1 - progress);

  return (
    <div className="flex items-center gap-5">
      <svg width="100" height="100" className="-rotate-90">
        {/* Track */}
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#1f2937" strokeWidth="10" />
        {/* Progress */}
        <circle
          cx="50" cy="50" r={radius}
          fill="none"
          stroke="#f97316"
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div>
        <p className="text-3xl font-bold">
          {completed}<span className="text-gray-500 text-lg">/{target}</span>
        </p>
        <p className="text-sm text-gray-400">sessions this week</p>
      </div>
    </div>
  );
}
