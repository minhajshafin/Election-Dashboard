import { LandingShell } from "@/components/landing/LandingShell";
import { getLandingPageData } from "@/lib/data";

export default async function Home() {
  const data = await getLandingPageData();

  return <LandingShell {...data} />;
}
