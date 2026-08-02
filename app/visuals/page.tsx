import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SolarSystemLazy } from "@/components/threejs/solar-system-lazy";

export default function VisualsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Visuals</h1>
        <p className="text-muted-foreground">
          Interactive 3D visualizations and data representations.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Solar System</CardTitle>
        </CardHeader>
        <CardContent className="h-[400px]">
          <SolarSystemLazy />
        </CardContent>
      </Card>
    </div>
  );
}
