import Link from "next/link";
import CityHero from "@/components/ui/scroll-locked-video-hero";

export function LandingPage() {
  return (
    <main className="landing-lock">
      <section className="hero-stage">
        <CityHero />
        <Link className="enter-world" href="/world">
          Enter the world
        </Link>
      </section>
    </main>
  );
}
