"use client";

import Link from "next/link";
import { CATEGORY_LABEL, LANDING_CATEGORIES } from "@/domain/categories";
import { GITHUB_REPO, PRODUCT_NAME, PRODUCT_TAGLINE } from "@/domain/product";
import { useCity } from "@/ui/voice-provider";

const STEPS = [
  {
    n: "01",
    title: "Photograph what failed",
    copy: "A flooded service road, a tanker queue, a lake inlet, an open UGD cut. The photo is the evidence.",
  },
  {
    n: "02",
    title: "Name the area",
    copy: "HSR, Bellandur, Whitefield. We resolve the GBA ward. You and ChatGPT look at the same pin.",
  },
  {
    n: "03",
    title: "Keep it on record",
    copy: "The voice stays on this map with related public tenders, so a person and an agent share the same pin.",
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
          <a href="#record">Pulse</a>
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
          <i /> Live · Bengaluru
        </p>
        <div className="section-head">
          <h1>The city, on record.</h1>
          <p>
            {PRODUCT_NAME} is a shared map for people and WebMCP agents. Drop a photo and an area name. We pin the GBA
            ward and attach related public tenders. Flooded streets and empty wells are one system — the first pins are
            drains, lakes, tankers, and unfinished works.
          </p>
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
        <h2>Three moves. One shared map.</h2>
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

      <section className="section section-dark">
        <p className="kicker">Why WebMCP</p>
        <h2>{PRODUCT_TAGLINE}</h2>
        <p className="lede">
          ChatGPT’s in-app browser registers tools on this origin. The agent resolves the ward, files the voice, and
          attaches stormwater or lake tenders. The pin updates while you watch.
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
