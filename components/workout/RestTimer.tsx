"use client";

// Auto-starts after every logged set. Counts down and pulses when time is up.
// +15 / -15 buttons let you adjust the rest on the fly.
import { useEffect, useState, useRef } from "react";

interface Props {
  seconds: number;      // Recommended rest duration
  onDismiss: () => void;
}

export default function RestTimer({ seconds, onDismiss }: Props) {
  const [total, setTotal] = useState(seconds);
  const [remaining, setRemaining] = useState(seconds);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Start/restart the interval whenever `total` changes (user adjusted)
  useEffect(() => {
    if (done) return;
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(intervalRef.current!);
          setDone(true);
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [total, done]);

  const adjust = (delta: number) => {
    if (done) return;
    const newTotal = Math.max(15, Math.min(180, total + delta));
    const newRemaining = Math.max(1, Math.min(newTotal, remaining + delta));
    setTotal(newTotal);
    setRemaining(newRemaining);
  };

  const progress = total > 0 ? remaining / total : 0;
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * progress;

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const timeStr = mins > 0
    ? `${mins}:${String(secs).padStart(2, "0")}`
    : `${secs}s`;

  return (
    <div className={`my-4 flex flex-col items-center gap-3 rounded-2xl border p-5 transition-colors ${
      done
        ? "border-green-500/50 bg-green-500/10 animate-pulse"
        : "border-gray-700 bg-gray-900"
    }`}>
      <p className={`text-sm font-semibold ${done ? "text-green-400" : "text-gray-400"}`}>
        {done ? "✅ Rest complete — next set!" : "⏱ Rest timer"}
      </p>

      {/* SVG ring + adjust buttons */}
      <div className="flex items-center gap-5">
        {/* −15s */}
        {!done && (
          <button
            onClick={() => adjust(-15)}
            disabled={remaining <= 15}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-700 bg-gray-800 text-sm font-bold text-gray-300 hover:bg-gray-700 disabled:opacity-30 transition-colors"
          >
            −15
          </button>
        )}

        <div className="relative">
          <svg width="96" height="96" className="-rotate-90">
            <circle cx="48" cy="48" r={radius} fill="none" stroke="#1f2937" strokeWidth="8" />
            <circle
              cx="48" cy="48" r={radius}
              fill="none"
              stroke={done ? "#22c55e" : "#f97316"}
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 1s linear" }}
            />
          </svg>
          <span className={`absolute inset-0 flex items-center justify-center text-xl font-bold tabular-nums ${done ? "text-green-400" : "text-white"}`}>
            {done ? "GO!" : timeStr}
          </span>
        </div>

        {/* +15s */}
        {!done && (
          <button
            onClick={() => adjust(15)}
            disabled={remaining >= 180}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-700 bg-gray-800 text-sm font-bold text-gray-300 hover:bg-gray-700 disabled:opacity-30 transition-colors"
          >
            +15
          </button>
        )}
      </div>

      <button
        onClick={onDismiss}
        className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
      >
        {done ? "Dismiss" : "Skip rest"}
      </button>
    </div>
  );
}
