"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ExerciseSearch({ exerciseNames }: { exerciseNames: string[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const filtered = query.trim().length > 0
    ? exerciseNames.filter((n) => n.toLowerCase().includes(query.toLowerCase()))
    : [];

  const go = (name: string) => {
    router.push(`/workout/history/exercise/${encodeURIComponent(name)}`);
    setQuery("");
  };

  return (
    <div className="mb-6">
      <p className="text-sm font-semibold uppercase tracking-wider text-gray-500 mb-2">Exercise Search</p>
      <div className="relative">
        <input
          type="text"
          placeholder="Search an exercise (e.g. Bench Press)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-xl border border-gray-700 bg-gray-900 px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-orange-500 focus:outline-none"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
          >✕</button>
        )}
      </div>

      {filtered.length > 0 && (
        <div className="mt-1 rounded-xl border border-gray-700 bg-gray-900 overflow-hidden">
          {filtered.slice(0, 8).map((name) => (
            <button
              key={name}
              onClick={() => go(name)}
              className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors border-b border-gray-800 last:border-0"
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {query.trim() && filtered.length === 0 && (
        <p className="mt-2 text-xs text-gray-600">No exercises matching "{query}" in your history.</p>
      )}
    </div>
  );
}
