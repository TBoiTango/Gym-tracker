"use client";

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <div className="text-6xl mb-4">💪</div>
      <h1 className="text-2xl font-bold text-white mb-2">You're offline</h1>
      <p className="text-gray-400 text-sm mb-6">
        No internet connection. Connect to log your workout.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="rounded-xl bg-orange-500 px-6 py-3 font-semibold text-white hover:bg-orange-600"
      >
        Try again
      </button>
    </main>
  );
}
