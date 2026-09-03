"use client";

import Link from "next/link";
import { CATEGORY_LABEL, LANDING_CATEGORIES } from "@/domain/categories";
import { CODEX_PROMPT, GITHUB_REPO, LIVE_URL, PRODUCT_NAME, PRODUCT_TAGLINE } from "@/domain/product";
import { useCity } from "@/ui/voice-provider";
import { WebMcpStatus } from "@/components/webmcp-status";

const STEPS = [
  {
    n: "01",
    title: "Take a photo of what failed",
    copy: "A flooded service road, a tanker queue, a lake inlet, or an open UGD cut. The photo is the evidence.",
  },
  {
    n: "02",
    title: "Name the area",
    copy: "HSR, Bellandur, Whitefield. We match the GBA ward. You and the agent look at the same pin.",
  },
  {
    n: "03",
    title: "File it on this map",
    copy: "The voice stays here with public stormwater, lake, and UGD records next to it.",
  },
];

export function WorldPage() {
  const { state } = useCity();
  const voices = state.voices;
  const counts = LANDING_CATEGORIES.map((category) => ({
    category,
    n: voices.filter((voice) => voice.category === category).length,
  }));
  const max = Math.max(1, ...counts.map((item) => item.n));
  const latest = voices[0];

  return (
    <main className="world-page">
      <header className="site-nav">
        <nav className="site-nav-links">
          <a href="#how">How it works</a>
          <a href="#agent">For agents</a>
          <Link href="/create">Map</Link>
        </nav>
        <Link href="/" className="wordmark">
          {PRODUCT_NAME.toLowerCase()}
        </Link>
        <div className="site-nav-actions">
          <Link className="btn-quiet" href={GITHUB_REPO} target="_blank" rel="noreferrer">
            Source
          </Link>
          <Link className="btn-solid" href="/create">
            File a voice
          </Link>
        </div>
      </header>

      <section id="record" className="section">
        <p className="kicker live-kicker">
          <i /> Live, Bengaluru
        </p>
        <div className="section-head">
          <h1>What is on the map</h1>
          <p>
            {PRODUCT_NAME} is a shared Bengaluru map. A person drops a photo and an area name. A WebMCP agent can do the
            same from Codex or ChatGPT. We match the GBA ward and pin the voice. Flooded streets and empty wells belong
            on one map. The first pins are drains, lakes, tankers, and unfinished works.
          </p>
          <WebMcpStatus />
        </div>
        <div className="pulse-grid">
          <article className="voice-card">
            <p className="kicker">Latest voice</p>
            {latest ? (
              <>
                <h3>{latest.title}</h3>
                <p>
                  {CATEGORY_LABEL[latest.category]} · {latest.areaName}
                </p>
                <p className="muted">
                  {latest.supporters} joined · {latest.ward?.name}
                </p>
                <Link className="btn-quiet" href={`/create?voice=${latest.id}`} style={{ marginTop: 14 }}>
                  Open on the map
                </Link>
              </>
            ) : (
              <p className="muted">No voices yet. File the first one.</p>
            )}
          </article>
          <article className="stat-card">
            <p className="kicker">Voices on this map</p>
            <p className="stat-num">{voices.length}</p>
            <p className="muted">Same catalog the agent sees.</p>
          </article>
          <article className="bars-card">
            <p className="kicker">What the city is saying</p>
            <ul className="bars">
              {counts.map((item) => (
                <li key={item.category}>
                  <span>{CATEGORY_LABEL[item.category]}</span>
                  <i style={{ width: `${(item.n / max) * 100}%` }} />
                  <b>{item.n}</b>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section id="how" className="section">
        <p className="kicker">How it works</p>
        <h2>How a voice gets on the map</h2>
        <ol className="steps">
          {STEPS.map((step) => (
            <li key={step.n}>
              <span className="kicker">{step.n}</span>
              <h3>{step.title}</h3>
              <p>{step.copy}</p>
            </li>
          ))}
        </ol>
      </section>

      <section id="agent" className="section">
        <p className="kicker">Codex and ChatGPT</p>
        <h2>Give the agent a photo and an area name</h2>
        <p className="lede" style={{ color: "var(--muted)", maxWidth: 640 }}>
          Open {LIVE_URL}/create in Codex or in ChatGPT&apos;s in-app browser. Attach the photo you took and name the
          locality. The agent fills the form with set_draft, files with file_voice, and the pin shows up while you watch.
        </p>
        <pre className="prompt-box">{CODEX_PROMPT}</pre>
        <p className="muted">Tools on this origin: get_workspace_state, attach_photo, set_draft, classify_issue, resolve_ward, file_voice, focus_voice, list_related_tenders, enrich_source.</p>
      </section>

      <section className="section section-dark">
        <p className="kicker">Why WebMCP</p>
        <h2>{PRODUCT_TAGLINE}</h2>
        <p className="lede">
          ChatGPT&apos;s in-app browser registers tools on this origin. The agent does not scrape the buttons. It calls
          the same commands the form uses, so you can see the fields fill and the pin land.
        </p>
        <Link className="btn-on-dark" href="/create">
          Open the map
        </Link>
      </section>

      <footer className="site-foot">
        <p className="wordmark">{PRODUCT_NAME.toLowerCase()}</p>
      </footer>
    </main>
  );
}
