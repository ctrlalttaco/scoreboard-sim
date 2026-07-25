import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const metadataBase: Metadata = {
  title: {
    default: "Legacy Scoreboard Console Trainer",
    template: "%s · Legacy Scoreboard Trainer",
  },
  description:
    "An unofficial, offline-ready training simulator for All Sport 4000 hockey and ice-rink workflows.",
  applicationName: "Legacy Scoreboard Trainer",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/icon-192.png",
  },
  openGraph: {
    type: "website",
    title: "Legacy Scoreboard Console Trainer",
    description:
      "Practice source-backed All Sport 4000 hockey and ice-rink workflows in an offline-ready simulator.",
    images: [
      {
        url: "/og.png",
        width: 1792,
        height: 1024,
        alt: "Legacy scoreboard console trainer with amber scoreboard digits and operator controls",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: ["/og.png"],
  },
};

function getRequestOrigin(requestHeaders: Headers): URL {
  const configuredOrigin = process.env.SITE_ORIGIN;
  if (configuredOrigin) {
    try {
      const origin = new URL(configuredOrigin);
      if (origin.protocol === "https:" || origin.protocol === "http:") {
        return origin;
      }
    } catch {
      // Fall through to validated request metadata.
    }
  }

  const forwardedHost = requestHeaders.get("x-forwarded-host");
  const rawHost = forwardedHost?.split(",")[0]?.trim();
  const host = rawHost ?? requestHeaders.get("host") ?? "localhost:3000";
  const hostMatch = /^([a-z0-9.-]+)(?::(\d{1,5}))?$/i.exec(host);
  const port = hostMatch?.[2] ? Number(hostMatch[2]) : null;
  const safeHost =
    hostMatch && (port === null || (port > 0 && port <= 65_535))
      ? host
      : "localhost:3000";
  const forwardedProtocol = requestHeaders
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const protocol =
    forwardedProtocol === "https" || forwardedProtocol === "http"
      ? forwardedProtocol
      : safeHost.startsWith("localhost")
        ? "http"
        : "https";

  try {
    return new URL(`${protocol}://${safeHost}`);
  } catch {
    return new URL("http://localhost:3000");
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();

  return {
    ...metadataBase,
    metadataBase: getRequestOrigin(requestHeaders),
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#101316",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
