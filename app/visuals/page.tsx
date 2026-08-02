import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SolarSystemLazy } from "@/components/threejs/solar-system-lazy";

export default function VisualsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-[0.2em] uppercase text-foreground">
          Visuals
        </h1>
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">
          Interactive 3D visualizations and data representations
        </p>
      </div>

      <Card className="border-cyan-500/40 bg-card/60">
        <CardHeader>
          <CardTitle className="font-display text-base font-bold tracking-[0.2em] uppercase">
            Solar System
          </CardTitle>
        </CardHeader>
        <CardContent className="h-[400px]">
          <SolarSystemLazy />
        </CardContent>
      </Card>
    </div>
  );
}
