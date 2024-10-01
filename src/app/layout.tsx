// src/app/layout.tsx

import "~/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";

import { TRPCReactProvider } from "~/trpc/react";
import ErrorBoundary from '~/components/ErrorBoundary'; // Import the ErrorBoundary

export const metadata: Metadata = {
  title: "Music Player App",
  description: "Enjoy your favorite tunes offline!",
  icons: [
    { rel: "icon", url: "/favicon.ico" },
    { rel: "apple-touch-icon", url: "/icons/icon-512x512.png" }, // Reference existing favicon for Apple devices
  ],
  manifest: "/manifest.json",
  themeColor: "#ffffff",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable}`}>
      <head>
        {/* PWA primary color */}
        <meta name="theme-color" content="#ffffff" />
        {/* iOS PWA support */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Music Player App" />
      </head>
      <body>
        <ErrorBoundary>
          <TRPCReactProvider>{children}</TRPCReactProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
