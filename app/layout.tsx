import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const viewport: Viewport = {
  themeColor: "#f97316",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Workout Buddy",
  description: "AI-powered workout tracking and progressive overload",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Workout Buddy",
  },
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/icon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* iOS PWA: hide browser chrome when launched from home screen */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Workout Buddy" />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
        {/* Service worker registration with build-id cache busting */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  var buildId = document.body.dataset.buildId || 'dev';
                  navigator.serviceWorker.register('/sw.js?v=' + buildId)
                    .then(function(reg) {
                      // Listen for the SW telling us a new version is active
                      navigator.serviceWorker.addEventListener('message', function(event) {
                        if (event.data && event.data.type === 'APP_UPDATED') {
                          // Show a subtle update toast
                          var toast = document.createElement('div');
                          toast.textContent = '✓ App updated';
                          toast.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1f2937;color:#d1fae5;padding:10px 20px;border-radius:999px;font-size:13px;font-weight:600;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,.4);border:1px solid #065f46;';
                          document.body.appendChild(toast);
                          setTimeout(function() { toast.remove(); }, 3500);
                        }
                      });
                    });
                });
              }
            `,
          }}
        />
      </head>
      <body className={inter.className} data-build-id={process.env.NEXT_PUBLIC_BUILD_ID ?? "dev"}>{children}</body>
    </html>
  );
}
