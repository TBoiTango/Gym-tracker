"use client";

// Page the user lands on after clicking the password reset link in their email.
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [validSession, setValidSession] = useState(false);

  // Supabase puts the recovery token in the URL hash — we need to exchange it for a session.
  useEffect(() => {
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setValidSession(true);
      }
    });
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setError("Passwords don't match."); return; }
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) { setError(error.message); return; }
    setDone(true);
    setTimeout(() => router.push("/dashboard"), 2000);
  };

  if (done) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="text-5xl">✅</div>
          <p className="text-xl font-bold text-white">Password updated!</p>
          <p className="text-sm text-gray-400">Taking you to the dashboard…</p>
        </div>
      </main>
    );
  }

  if (!validSession) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="text-5xl">🔗</div>
          <p className="text-white font-semibold">Waiting for reset link…</p>
          <p className="text-sm text-gray-400">
            If you arrived here from an email link, give it a moment to load.
          </p>
          <a href="/login" className="text-sm text-orange-400 hover:underline">
            Back to sign in
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-white mb-2">Set new password</h1>
        <p className="text-sm text-gray-400 mb-8">Choose a new password for your account.</p>

        <form onSubmit={handleReset} className="space-y-4">
          <Input
            label="New password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            required
          />
          <Input
            label="Confirm password"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Same as above"
            required
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button type="submit" loading={loading} className="w-full">
            Update Password
          </Button>
        </form>
      </div>
    </main>
  );
}
