import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Workout Buddy",
  description: "AI-powered workout tracking and progressive overload",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // "dark" class on html enables Tailwind's dark mode utilities everywhere
    <html lang="en" className="dark">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
