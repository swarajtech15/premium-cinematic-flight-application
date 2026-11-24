import { CinematicLoader } from "@/components/CinematicLoader";
import { Hero } from "@/components/Hero";
import { ClosingCta, Destinations, Experience, Marquee, SearchSection } from "@/components/HomeSections";

export default function HomePage() {
  return (
    <>
      <CinematicLoader />
      <Hero />
      <SearchSection />
      <Destinations />
      <Marquee />
      <Experience />
      <ClosingCta />
    </>
  );
}
