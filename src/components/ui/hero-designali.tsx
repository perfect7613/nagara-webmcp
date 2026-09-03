"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { ReactTyped } from "react-typed";
import { cn } from "@/lib/utils";

type NodePoint = {
  x: number;
  y: number;
  vx: number;
  vy: number;
};

type LineState = {
  spring: number;
  friction: number;
  nodes: NodePoint[];
};

const CONFIG = {
  friction: 0.5,
  trails: 48,
  size: 42,
  dampening: 0.025,
  tension: 0.99,
};

class Oscillator {
  phase: number;
  offset: number;
  frequency: number;
  amplitude: number;
  constructor(init: Partial<Oscillator> = {}) {
    this.phase = init.phase ?? 0;
    this.offset = init.offset ?? 0;
    this.frequency = init.frequency ?? 0.001;
    this.amplitude = init.amplitude ?? 1;
  }
  update() {
    this.phase += this.frequency;
    return this.offset + Math.sin(this.phase) * this.amplitude;
  }
}

function createLine(spring: number, pos: { x: number; y: number }): LineState {
  return {
    spring: spring + 0.1 * Math.random() - 0.05,
    friction: CONFIG.friction + 0.01 * Math.random() - 0.005,
    nodes: Array.from({ length: CONFIG.size }, () => ({
      x: pos.x,
      y: pos.y,
      vx: 0,
      vy: 0,
    })),
  };
}

function updateLine(line: LineState, pos: { x: number; y: number }) {
  let spring = line.spring;
  const head = line.nodes[0];
  head.vx += (pos.x - head.x) * spring;
  head.vy += (pos.y - head.y) * spring;
  for (let i = 0; i < line.nodes.length; i += 1) {
    const node = line.nodes[i];
    if (i > 0) {
      const prev = line.nodes[i - 1];
      node.vx += (prev.x - node.x) * spring;
      node.vy += (prev.y - node.y) * spring;
      node.vx += prev.vx * CONFIG.dampening;
      node.vy += prev.vy * CONFIG.dampening;
    }
    node.vx *= line.friction;
    node.vy *= line.friction;
    node.x += node.vx;
    node.y += node.vy;
    spring *= CONFIG.tension;
  }
}

function drawLine(ctx: CanvasRenderingContext2D, line: LineState) {
  const first = line.nodes[0];
  ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i < line.nodes.length - 2; i += 1) {
    const current = line.nodes[i];
    const next = line.nodes[i + 1];
    ctx.quadraticCurveTo(
      current.x,
      current.y,
      0.5 * (current.x + next.x),
      0.5 * (current.y + next.y),
    );
  }
  const last = line.nodes[line.nodes.length - 1];
  const prev = line.nodes[line.nodes.length - 2];
  ctx.quadraticCurveTo(prev.x, prev.y, last.x, last.y);
  ctx.stroke();
  ctx.closePath();
}

/**
 * Safelight cursor trails. Call from a landing-page effect.
 * Returns a disposer — always invoke it on unmount.
 */
export function renderCanvas(canvas: HTMLCanvasElement): () => void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => undefined;

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) return () => undefined;

  const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  let lines: LineState[] = [];
  let running = false;
  let raf = 0;
  const hue = new Oscillator({
    phase: Math.random() * 2 * Math.PI,
    amplitude: 18,
    frequency: 0.0015,
    offset: 32,
  });

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const seed = () => {
    lines = [];
    for (let i = 0; i < CONFIG.trails; i += 1) {
      lines.push(createLine(0.45 + (i / CONFIG.trails) * 0.025, pos));
    }
  };

  const move = (event: MouseEvent | TouchEvent) => {
    if ("touches" in event && event.touches[0]) {
      pos.x = event.touches[0].clientX;
      pos.y = event.touches[0].clientY;
    } else if ("clientX" in event) {
      pos.x = event.clientX;
      pos.y = event.clientY;
    }
  };

  const tick = () => {
    if (!running) {
      raf = 0;
      return;
    }
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = "lighter";
    ctx.strokeStyle = `hsla(${Math.round(hue.update())}, 78%, 58%, 0.08)`;
    ctx.lineWidth = 8;
    for (const line of lines) {
      updateLine(line, pos);
      drawLine(ctx, line);
    }
    raf = window.requestAnimationFrame(tick);
  };

  const start = () => {
    if (running) return;
    running = true;
    tick();
  };

  const onFirstMove = (event: MouseEvent | TouchEvent) => {
    document.removeEventListener("mousemove", onFirstMove);
    document.removeEventListener("touchstart", onFirstMove);
    document.addEventListener("mousemove", move, { passive: true });
    document.addEventListener("touchmove", move, { passive: true });
    move(event);
    seed();
    start();
  };

  const onFocus = () => {
    if (lines.length > 0) start();
  };
  const onBlur = () => {
    running = false;
  };

  resize();
  document.addEventListener("mousemove", onFirstMove, { passive: true });
  document.addEventListener("touchstart", onFirstMove, { passive: true });
  window.addEventListener("resize", resize);
  window.addEventListener("focus", onFocus);
  window.addEventListener("blur", onBlur);

  return () => {
    running = false;
    window.cancelAnimationFrame(raf);
    document.removeEventListener("mousemove", onFirstMove);
    document.removeEventListener("touchstart", onFirstMove);
    document.removeEventListener("mousemove", move);
    document.removeEventListener("touchmove", move);
    window.removeEventListener("resize", resize);
    window.removeEventListener("focus", onFocus);
    window.removeEventListener("blur", onBlur);
  };
}

export function TrailCanvas({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    return renderCanvas(ref.current);
  }, []);
  return (
    <canvas
      ref={ref}
      className={cn("pointer-events-none fixed inset-0", className)}
      aria-hidden
    />
  );
}

interface TypeWriterProps {
  strings: string[];
  className?: string;
}

export function TypeWriter({ strings, className }: TypeWriterProps) {
  const [staticCopy, setStaticCopy] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStaticCopy(true);
    }
  }, []);

  if (staticCopy) {
    return <span className={className}>{strings[0]}</span>;
  }

  return (
    <span className={className}>
      <ReactTyped
        loop
        typeSpeed={80}
        backSpeed={20}
        strings={strings}
        smartBackspace
        backDelay={1000}
        loopCount={0}
        showCursor
        cursorChar="|"
      />
    </span>
  );
}

type TColorProp = string | string[];

interface ShineBorderProps {
  borderRadius?: number;
  borderWidth?: number;
  duration?: number;
  color?: TColorProp;
  className?: string;
  children: ReactNode;
}

export function ShineBorder({
  borderRadius = 8,
  borderWidth = 1,
  duration = 14,
  color = "#e3942d",
  className,
  children,
}: ShineBorderProps) {
  return (
    <div
      style={{ "--border-radius": `${borderRadius}px` } as CSSProperties}
      className={cn(
        "relative grid h-full w-full place-items-center rounded-[var(--border-radius)] bg-transparent p-1 transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]",
        className,
      )}
    >
      <div
        style={
          {
            "--border-width": `${borderWidth}px`,
            "--border-radius": `${borderRadius}px`,
            "--shine-pulse-duration": `${duration}s`,
            "--mask-linear-gradient":
              "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            "--background-radial-gradient": `radial-gradient(transparent,transparent, ${Array.isArray(color) ? color.join(",") : color},transparent,transparent)`,
          } as CSSProperties
        }
        className="pointer-events-none absolute inset-0 before:absolute before:inset-0 before:rounded-[var(--border-radius)] before:p-[var(--border-width)] before:content-[''] before:[background-image:var(--background-radial-gradient)] before:[background-size:300%_300%] before:[mask:var(--mask-linear-gradient)] before:[-webkit-mask:var(--mask-linear-gradient)] before:[mask-composite:exclude] before:[-webkit-mask-composite:xor] motion-safe:before:animate-[shine-pulse_var(--shine-pulse-duration)_infinite_linear]"
      />
      {children}
    </div>
  );
}
