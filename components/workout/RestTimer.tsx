"use client";

// Auto-starts after every logged set. Counts down and pulses when time is up.
import { useEffect, useState, useRef } from "react";

interface Props {
  seconds: number;      // Total rest duration
  onDismiss: () => void;
}

export default function RestTimer({ seconds, onDismiss }: Props) {
  const [remaining, setRemaining] = useState(seconds);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
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
  }, []);

  const progress = remaining / seconds;
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

      {/* SVG ring */}
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

      <button
        onClick={onDismiss}
        className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
      >
        {done ? "Dismiss" : "Skip rest"}
      </button>
    </div>
  );
}
