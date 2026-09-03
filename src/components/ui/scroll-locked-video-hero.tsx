"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

const DEFAULT_VIDEO = "/media/bengaluru-city.mp4";
const POSTER = "/media/bengaluru-city.jpg";
const CROSSFADE_S = 1;

export interface CityHeroProps {
  title?: string;
  videoSrc?: string;
  className?: string;
  style?: CSSProperties;
}

export default function CityHero({
  title = "nagara",
  videoSrc = DEFAULT_VIDEO,
  className,
  style,
}: CityHeroProps) {
  return (
    <div
      className={className}
      style={{
        position: "relative",
        height: "100%",
        minHeight: "100dvh",
        width: "100%",
        background: "#05060a",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={POSTER}
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
      <SeamlessLoopVideo src={videoSrc} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(3,5,14,0.28) 0%, rgba(3,5,14,0.08) 36%, rgba(3,5,14,0.2) 62%, rgba(3,5,14,0.55) 100%)",
          pointerEvents: "none",
        }}
      />
      <span className="hero-wordmark">{title}</span>
    </div>
  );
}

function SeamlessLoopVideo({ src }: { src: string }) {
  const aRef = useRef<HTMLVideoElement>(null);
  const bRef = useRef<HTMLVideoElement>(null);
  const activeRef = useRef<"a" | "b">("a");
  const crossfadingRef = useRef(false);
  const [aOpacity, setAOpacity] = useState(1);
  const [bOpacity, setBOpacity] = useState(0);

  useEffect(() => {
    const a = aRef.current;
    const b = bRef.current;
    if (!a || !b) return;
    a.muted = true;
    b.muted = true;
    a.play().catch(() => {});
    let rafId = 0;
    const tick = () => {
      const active = activeRef.current === "a" ? a : b;
      const inactive = activeRef.current === "a" ? b : a;
      if (active.duration) {
        const remaining = active.duration - active.currentTime;
        if (!crossfadingRef.current && remaining <= CROSSFADE_S) {
          crossfadingRef.current = true;
          inactive.currentTime = 0;
          inactive.play().catch(() => {});
        }
        if (crossfadingRef.current) {
          const t = Math.min(1, Math.max(0, 1 - remaining / CROSSFADE_S));
          if (activeRef.current === "a") {
            setAOpacity(1 - t);
            setBOpacity(t);
          } else {
            setBOpacity(1 - t);
            setAOpacity(t);
          }
          if (remaining <= 0.03) {
            active.pause();
            crossfadingRef.current = false;
            activeRef.current = activeRef.current === "a" ? "b" : "a";
          }
        }
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const base: CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transform: "none",
  };
  return (
    <>
      <video
        ref={aRef}
        src={src}
        poster={POSTER}
        playsInline
        muted
        autoPlay
        preload="auto"
        style={{ ...base, opacity: aOpacity }}
      />
      <video
        ref={bRef}
        src={src}
        playsInline
        muted
        preload="auto"
        style={{ ...base, opacity: bOpacity }}
      />
    </>
  );
}
