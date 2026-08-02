"use client";

import dynamic from "next/dynamic";

// Client-only wrapper so Three.js is dynamically imported and never rendered
// on the server (WebGL needs the browser). `next/dynamic` with `ssr: false`
// is only valid inside a Client Component, so this thin wrapper exists
// specifically to host it — the server page imports this instead.
const SolarSystem = dynamic(
  () => import("@/components/threejs/solar-system").then((m) => m.SolarSystem),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Loading 3D…
      </div>
    ),
  },
);

export function SolarSystemLazy() {
  return <SolarSystem />;
}
