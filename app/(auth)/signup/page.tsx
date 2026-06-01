import SignupForm from "@/components/auth/SignupForm";

export default function SignupPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-2 text-3xl font-bold text-white">Workout Buddy 💪</h1>
        <p className="mb-8 text-gray-400">Create your account</p>
        <SignupForm />
        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <a href="/login" className="text-orange-400 hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </main>
  );
}
