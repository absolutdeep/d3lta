import type { Metadata } from "next";
import { SshTerminal } from "@/components/terminal/ssh-terminal";

export const metadata: Metadata = {
  title: "Shell · d3lta",
  description: "Browser terminal on the local host.",
};

export default function ShellPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-[0.2em] uppercase text-foreground">
          Shell
        </h1>
        <p className="text-xs font-semibold tracking-[0.2em] uppercase text-muted-foreground">
          Web terminal · secured loopback bridge · /bin/bash
        </p>
      </div>

      <SshTerminal />
    </div>
  );
}
