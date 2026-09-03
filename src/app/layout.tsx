import { Fraunces, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import type { Metadata } from "next";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { ourFileRouter } from "@/adapters/uploadthing/core";
import { PRODUCT_NAME, PRODUCT_PROMISE } from "@/domain/product";
import "./globals.css";

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
});

const sans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: `${PRODUCT_NAME} — a WebMCP photo workspace`,
  description: PRODUCT_PROMISE,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${sans.variable} ${mono.variable} h-full`}
    >
      <body className="h-full">
        {process.env.UPLOADTHING_TOKEN ? (
          <NextSSRPlugin routerConfig={extractRouterConfig(ourFileRouter)} />
        ) : null}
        {children}
      </body>
    </html>
  );
}
