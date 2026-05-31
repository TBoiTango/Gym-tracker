import LoginForm from "@/components/auth/LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-3xl font-bold text-white">Gym Tracker</h1>
        <p className="mb-8 text-gray-400">Sign in to your account</p>
        <LoginForm />
        <p className="mt-6 text-center text-sm text-gray-500">
          No account?{" "}
          <a href="/signup" className="text-orange-400 hover:underline">
            Sign up free
          </a>
        </p>
      </div>
    </main>
  );
}
