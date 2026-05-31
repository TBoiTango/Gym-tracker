import { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  variant?: "primary" | "ghost" | "danger";
}

export default function Button({
  children,
  loading = false,
  variant = "primary",
  className = "",
  disabled,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center rounded-xl px-5 py-3 text-base font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 focus:ring-offset-gray-950 disabled:opacity-50";

  const variants = {
    primary: "bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700",
    ghost: "border border-gray-700 text-gray-300 hover:bg-gray-800 active:bg-gray-700",
    danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
  };

  return (
    <button
      className={`${base} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading…
        </span>
      ) : children}
    </button>
  );
}
