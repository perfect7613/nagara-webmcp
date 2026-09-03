"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ShineBorder,
  TrailCanvas,
  TypeWriter,
} from "@/components/ui/hero-designali";
import { PRODUCT_NAME, PRODUCT_PROMISE } from "@/domain/product";

const verbs = ["Choose", "Point", "Create", "Cull", "Note", "Export"];

export function Hero() {
  return (
    <main className="relative min-h-full overflow-hidden bg-background text-foreground">
      <TrailCanvas />
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 md:px-10">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center border border-primary font-[family-name:var(--font-display)] text-primary">
            K
          </span>
          <span className="font-[family-name:var(--font-display)] text-lg tracking-tight">
            {PRODUCT_NAME}
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="https://github.com/perfect7613/keepers-webmcp">
              Source
            </Link>
          </Button>
          <Button asChild>
            <Link href="/workspace">
              Open workspace
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </nav>

      <section className="relative z-10 mx-auto flex max-w-5xl flex-col items-center px-6 pb-24 pt-10 text-center md:pt-20">
        <div className="landing-item mb-8">
          <div className="relative inline-flex items-center rounded-full border border-border bg-popover/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm">
            WebMCP Challenge · the canvas is the conversation
            <Link
              href="/workspace"
              className="ml-2 font-medium text-primary transition-colors duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:text-foreground"
            >
              Try the demo
            </Link>
          </div>
        </div>

        <div className="landing-item relative mx-auto w-full max-w-4xl border border-border bg-background/40 px-6 py-12 backdrop-blur-[2px] [mask-image:radial-gradient(900px_28rem_at_center,white,transparent)]">
          <Plus className="absolute -left-3.5 -top-3.5 h-7 w-7 text-primary" strokeWidth={2.5} />
          <Plus className="absolute -right-3.5 -top-3.5 h-7 w-7 text-primary" strokeWidth={2.5} />
          <Plus className="absolute -bottom-3.5 -left-3.5 h-7 w-7 text-primary" strokeWidth={2.5} />
          <Plus className="absolute -bottom-3.5 -right-3.5 h-7 w-7 text-primary" strokeWidth={2.5} />
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-medium leading-[0.95] tracking-tight md:text-7xl">
            Photos remember what you{" "}
            <span className="text-primary">
              <TypeWriter strings={verbs} />
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-sm text-muted-foreground md:text-base">
            {PRODUCT_PROMISE}
          </p>
        </div>

        <div className="landing-item mt-8 flex flex-wrap items-center justify-center gap-3">
          <ShineBorder
            borderWidth={2}
            borderRadius={14}
            color={["#e3942d", "#f4ead6", "#7d9b7a"]}
            className="w-auto bg-transparent"
          >
            <Button asChild className="rounded-xl px-6 active:scale-100">
              <Link href="/workspace">Open the light table</Link>
            </Button>
          </ShineBorder>
          <Button variant="outline" asChild className="rounded-xl">
            <Link href="#loop">How WebMCP fits</Link>
          </Button>
        </div>

        <ul className="landing-item mt-16 grid w-full gap-4 text-left md:grid-cols-3">
          {[
            {
              k: "Choose",
              d: "Pick the laughing frame over the sharpest one. The preference profile updates in plain language.",
            },
            {
              k: "Point",
              d: "Circle, scribble, or note. The agent gets a photo handle and a mask — not tldraw JSON.",
            },
            {
              k: "Create",
              d: "Edits land as ghost variants. Originals stay. Provenance is visible. Undo is one step.",
            },
          ].map((item) => (
            <li key={item.k} className="landing-card border border-border bg-card/70 p-5">
              <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.18em] text-primary">
                {item.k}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.d}</p>
            </li>
          ))}
        </ul>
      </section>

      <section
        id="loop"
        className="relative z-10 mx-auto grid max-w-5xl gap-10 px-6 pb-28 md:grid-cols-[1.1fr_0.9fr] md:items-center"
      >
        <div>
          <p className="font-[family-name:var(--font-mono)] text-[11px] uppercase tracking-[0.18em] text-primary">
            Why WebMCP
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-display)] text-3xl tracking-tight md:text-4xl">
            The page is a shared workspace, not a UI to scrape.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            ChatGPT’s in-app browser and Chrome 149+ discover tools on this
            origin. They call the same commands the human buttons use. Tools
            appear and vanish with selection, groups, and consent.
          </p>
        </div>
        <div className="relative overflow-hidden border border-border">
          <Image
            src="https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1400&q=80"
            alt="Analog camera on a wooden table, contact-sheet light"
            width={1400}
            height={900}
            className="h-64 w-full object-cover md:h-80"
          />
          <p className="absolute bottom-3 left-3 bg-background/80 px-2 py-1 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider text-muted-foreground backdrop-blur-sm">
            Light table, not a chat panel
          </p>
        </div>
      </section>
    </main>
  );
}
