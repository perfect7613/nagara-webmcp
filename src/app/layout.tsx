import { Outfit, Figtree, JetBrains_Mono } from "next/font/google";
import type { Metadata } from "next";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { ourFileRouter } from "@/adapters/uploadthing/core";
import { PRODUCT_NAME, PRODUCT_PROMISE } from "@/domain/product";
import { AppShell } from "@/ui/app-shell";
import "./globals.css";

const display = Outfit({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const sans = Figtree({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://nagara-webmcp.vercel.app"),
  title: `${PRODUCT_NAME}: Bengaluru civic voices`,
  description: PRODUCT_PROMISE,
  openGraph: {
    title: `${PRODUCT_NAME}: Bengaluru civic voices`,
    description: PRODUCT_PROMISE,
    images: [
      {
        url: "/media/nagara-devpost-thumbnail.png",
        width: 1254,
        height: 1254,
        alt: "Nagara civic map and WebMCP agent network",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${PRODUCT_NAME}: Bengaluru civic voices`,
    description: PRODUCT_PROMISE,
    images: ["/media/nagara-devpost-thumbnail.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`} data-scroll-behavior="smooth">
      <body>
        {process.env.UPLOADTHING_TOKEN ? (
          <NextSSRPlugin routerConfig={extractRouterConfig(ourFileRouter)} />
        ) : null}
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
