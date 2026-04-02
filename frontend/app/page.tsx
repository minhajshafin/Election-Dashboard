import { LandingShell } from "@/components/landing/LandingShell";
import { getLandingPageData } from "@/lib/data";
import { Suspense } from "react";

export default async function Home() {
  const data = await getLandingPageData();

  return (
    <Suspense fallback={null}>
      <LandingShell {...data} />
    </Suspense>
  );
}
