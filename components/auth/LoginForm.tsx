"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

export default function LoginForm() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Forgot password state
  const [forgotMode, setForgotMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError("Please enter your email address."); return; }
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);
    if (error) { setError(error.message); return; }
    setResetSent(true);
  };

  // ── Forgot password mode ──────────────────────────────────────────────────
  if (forgotMode) {
    if (resetSent) {
      return (
        <div className="space-y-4 text-center">
          <div className="text-4xl">📬</div>
          <p className="text-white font-semibold">Check your email</p>
          <p className="text-sm text-gray-400">
            We sent a password reset link to <span className="text-orange-400">{email}</span>.
            Click the link in the email to set a new password.
          </p>
          <button
            onClick={() => { setForgotMode(false); setResetSent(false); }}
            className="text-sm text-orange-400 hover:underline"
          >
            ← Back to sign in
          </button>
        </div>
      );
    }

    return (
      <form onSubmit={handleForgotPassword} className="space-y-4">
        <div>
          <p className="text-white font-semibold mb-1">Reset your password</p>
          <p className="text-sm text-gray-400">Enter your email and we'll send you a reset link.</p>
        </div>
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <Button type="submit" loading={loading} className="w-full">
          Send Reset Link
        </Button>
        <button
          type="button"
          onClick={() => { setForgotMode(false); setError(""); }}
          className="w-full text-center text-sm text-gray-500 hover:text-gray-300"
        >
          ← Back to sign in
        </button>
      </form>
    );
  }

  // ── Normal login mode ─────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        required
      />
      <Input
        label="Password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="••••••••"
        required
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button type="submit" loading={loading} className="w-full">
        Sign In
      </Button>
      <button
        type="button"
        onClick={() => { setForgotMode(true); setError(""); }}
        className="w-full text-center text-sm text-gray-500 hover:text-gray-300"
      >
        Forgot password?
      </button>
    </form>
  );
}
