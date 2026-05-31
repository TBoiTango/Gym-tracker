import { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: "sm" | "md" | "lg";
}

export default function Card({ children, padding = "md", className = "", ...props }: CardProps) {
  const paddingClasses = { sm: "p-3", md: "p-5", lg: "p-7" };

  return (
    <div
      className={`rounded-2xl border border-gray-800 bg-gray-900 ${paddingClasses[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
