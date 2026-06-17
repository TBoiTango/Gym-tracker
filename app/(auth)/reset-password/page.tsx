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

  // Three possible states:
  //   "checking" — waiting to see if a valid recovery session exists
  //   "ready"    — recovery session confirmed, show the form
  //   "invalid"  — link is expired/invalid or no session found
  const [sessionState, setSessionState] = useState<"checking" | "ready" | "invalid">("checking");

  useEffect(() => {
    // Strategy: handle both auth flows
    //
    // PKCE flow (auth-helpers default): the middleware has already exchanged
    // the ?code= param for a session before this page renders. The
    // PASSWORD_RECOVERY event may have already fired — we can't rely on
    // catching it. Instead, call getSession() immediately to see if we're
    // already in a recovery session.
    //
    // Implicit flow (token in URL hash): the client exchanges the hash
    // client-side and fires PASSWORD_RECOVERY. We catch this via the
    // onAuthStateChange listener below.

    let settled = false;
    const settle = (state: "ready" | "invalid") => {
      if (!settled) {
        settled = true;
        setSessionState(state);
      }
    };

    // 1. Check if a session already exists (covers PKCE flow)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) settle("ready");
    });

    // 2. Subscribe for the event (covers implicit/hash flow, and also fires
    //    on PKCE flow if the client hasn't exchanged the code yet)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        settle("ready");
      }
    });

    // 3. Timeout fallback — if neither of the above resolved within 4 seconds,
    //    the link is likely expired or the redirect URL isn't configured correctly
    //    in the Supabase dashboard. Show a clear error rather than spinning forever.
    const timeout = setTimeout(() => settle("invalid"), 4000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
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
    setTimeout(() => {
      router.refresh();
      router.push("/dashboard");
    }, 2000);
  };

  // ── Done ─────────────────────────────────────────────────────────────────────
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

  // ── Checking ─────────────────────────────────────────────────────────────────
  if (sessionState === "checking") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="text-4xl animate-pulse">🔗</div>
          <p className="text-white font-semibold">Verifying reset link…</p>
          <p className="text-sm text-gray-400">Just a moment.</p>
        </div>
      </main>
    );
  }

  // ── Invalid / expired link ────────────────────────────────────────────────────
  if (sessionState === "invalid") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="text-5xl">⚠️</div>
          <p className="text-white font-semibold">Reset link expired or invalid</p>
          <p className="text-sm text-gray-400">
            Password reset links expire after 1 hour. Request a new one from the login page.
          </p>
          <a
            href="/login"
            className="inline-block mt-2 text-sm text-orange-400 hover:underline"
          >
            ← Back to sign in
          </a>
        </div>
      </main>
    );
  }

  // ── Ready — show the form ─────────────────────────────────────────────────────
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
