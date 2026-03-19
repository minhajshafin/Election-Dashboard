import { getClusterDataset } from "@/lib/data";

export default async function ClustersPage() {
  const dataset = await getClusterDataset();

  return (
    <main className="min-h-screen bg-[#0d0d0b] px-4 pb-10 text-[#f0ece2] sm:px-10">
      <section className="grid gap-4 xl:grid-cols-2">
        {dataset.profiles.map((profile) => (
          <article key={profile.cluster} className="border border-white/10 bg-[#141412] p-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#c9a84c]">Cluster {profile.cluster}</p>
            <h2 className="mt-1 text-xl" style={{ fontFamily: "var(--font-playfair), serif" }}>
              {profile.n} constituencies
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {Object.entries(profile)
                .filter(([key]) => key !== "cluster" && key !== "n")
                .map(([key, value]) => (
                  <div key={key} className="border border-white/10 bg-[#181814] px-3 py-2 text-sm">
                    <p className="font-mono text-[9px] uppercase tracking-[0.13em] text-[#5a5848]">{key}</p>
                    <p className="mt-1 text-[#d8d3c6]">{value.toFixed(3)}</p>
                  </div>
                ))}
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
