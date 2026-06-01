"use client";

// Bar chart for weekly volume (lbs) over the last 8 weeks.
interface WeekData {
  label: string;
  volume: number;
}

export default function VolumeChart({ data }: { data: WeekData[] }) {
  const maxVolume = Math.max(...data.map((d) => d.volume), 1);

  return (
    <div className="flex items-end gap-2 h-32">
      {data.map((week, i) => {
        const height = Math.max((week.volume / maxVolume) * 100, 2);
        return (
          <div key={i} className="flex flex-col items-center gap-1 flex-1">
            <span className="text-xs text-gray-500 tabular-nums">
              {week.volume >= 1000 ? `${(week.volume / 1000).toFixed(1)}k` : week.volume}
            </span>
            <div className="w-full flex items-end" style={{ height: "80px" }}>
              <div
                className="w-full rounded-t-sm bg-orange-500 transition-all"
                style={{ height: `${height}%` }}
              />
            </div>
            <span className="text-xs text-gray-600 truncate w-full text-center">{week.label}</span>
          </div>
        );
      })}
    </div>
  );
}
