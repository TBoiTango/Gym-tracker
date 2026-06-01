"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const SLIDES = [
  {
    id: 1,
    content: (
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="text-6xl mb-2">💪</div>
        <h1 className="text-3xl font-bold">Welcome to<br />Workout Buddy</h1>
        <p className="text-gray-400 text-base leading-relaxed max-w-xs">
          Your personal AI-powered training partner. Every workout is built fresh for you — based on your goals, your equipment, and how much time you have today.
        </p>
      </div>
    ),
  },
  {
    id: 2,
    content: (
      <div className="flex flex-col space-y-6">
        <h2 className="text-2xl font-bold text-center">Here's what to expect</h2>
        <div className="space-y-5">
          {[
            {
              emoji: "🏋️",
              title: "Your plan, your way",
              body: "Tell us your goal, experience level, and what equipment you have. We'll build a personalised training split.",
            },
            {
              emoji: "⚡",
              title: "Fresh workouts every time",
              body: "On the day, pick your duration, cardio, and core preference. Your session is generated just for you.",
            },
            {
              emoji: "📊",
              title: "Track everything",
              body: "Log every set and rep as you go. Rest timers keep you on pace. Analytics show your progress over time.",
            },
            {
              emoji: "🔁",
              title: "Always in control",
              body: "Add exercises on the fly, reorder your session, or squeeze in an extra set whenever you want.",
            },
          ].map((item) => (
            <div key={item.title} className="flex gap-4 items-start">
              <span className="text-2xl shrink-0">{item.emoji}</span>
              <div>
                <p className="font-semibold text-white">{item.title}</p>
                <p className="text-sm text-gray-400 mt-0.5 leading-relaxed">{item.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
  },
  {
    id: 3,
    content: (
      <div className="flex flex-col space-y-5">
        <div className="text-center">
          <div className="text-5xl mb-3">📱</div>
          <h2 className="text-2xl font-bold">Add to your Home Screen</h2>
          <p className="text-gray-400 text-sm mt-2 leading-relaxed">
            Workout Buddy opens full screen like a native app — no browser bar in the way.
          </p>
        </div>

        <div className="space-y-4">
          {/* iPhone */}
          <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
            <p className="font-semibold text-sm mb-3 flex items-center gap-2">
              <span>🍎</span> iPhone / iPad (Safari)
            </p>
            <ol className="space-y-2">
              {[
                <>Tap the <span className="font-semibold text-orange-400">Share</span> button (□↑) at the bottom of Safari</>,
                <>Scroll down and tap <span className="font-semibold text-orange-400">Add to Home Screen</span></>,
                <>Tap <span className="font-semibold text-orange-400">Add</span> in the top right</>,
              ].map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-300">
                  <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Android */}
          <div className="rounded-xl border border-gray-700 bg-gray-900 p-4">
            <p className="font-semibold text-sm mb-3 flex items-center gap-2">
              <span>🤖</span> Android (Chrome)
            </p>
            <ol className="space-y-2">
              {[
                <>Tap the <span className="font-semibold text-orange-400">three dots menu</span> (⋮) in the top right</>,
                <>Tap <span className="font-semibold text-orange-400">Add to Home Screen</span></>,
                <>Tap <span className="font-semibold text-orange-400">Add</span> to confirm</>,
              ].map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-gray-300">
                  <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    ),
  },
];

export default function WelcomePage() {
  const router = useRouter();
  const [current, setCurrent] = useState(0);

  const isLast = current === SLIDES.length - 1;

  const next = () => {
    if (isLast) {
      finish();
    } else {
      setCurrent((c) => c + 1);
    }
  };

  const back = () => setCurrent((c) => Math.max(0, c - 1));

  const finish = () => {
    try { localStorage.setItem("wb_welcomed", "1"); } catch {}
    router.push("/setup");
  };

  return (
    <main className="min-h-screen bg-gray-950 flex flex-col">
      {/* Skip */}
      <div className="flex justify-end px-6 pt-6">
        <button
          onClick={finish}
          className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
        >
          Skip
        </button>
      </div>

      {/* Slide content */}
      <div className="flex-1 flex flex-col justify-center px-6 py-4 max-w-lg mx-auto w-full">
        {SLIDES[current].content}
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-2 pb-4">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-2 rounded-full transition-all ${
              i === current ? "w-6 bg-orange-500" : "w-2 bg-gray-700"
            }`}
          />
        ))}
      </div>

      {/* Navigation buttons */}
      <div className="px-6 pb-10 max-w-lg mx-auto w-full space-y-3">
        <button
          onClick={next}
          className="w-full rounded-xl bg-orange-500 py-4 font-semibold text-white hover:bg-orange-600 active:bg-orange-700 transition-colors"
        >
          {isLast ? "Got it, let's set up my profile →" : "Next"}
        </button>

        {current > 0 && (
          <button
            onClick={back}
            className="w-full rounded-xl border border-gray-700 py-3 text-sm text-gray-400 hover:border-gray-500 transition-colors"
          >
            Back
          </button>
        )}
      </div>
    </main>
  );
}
