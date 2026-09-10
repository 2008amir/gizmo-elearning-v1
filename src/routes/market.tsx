import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/market")({
  component: Market,
  head: () => ({ meta: [{ title: "Market — Gizmo Office Plus" }] }),
});

function Market() {
  const [loading, setLoading] = useState(true);
  return (
    <AppShell title="Market">
      <div className="relative h-[calc(100vh-3.5rem)]">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background">
            <div className="h-12 w-12 rounded-full border-4 border-muted border-t-primary animate-spin" />
          </div>
        )}
        <iframe
          src="https://market-gizmo.vercel.app"
          title="Market"
          onLoad={() => setLoading(false)}
          className="absolute inset-0 w-full h-full border-0 bg-background"
          sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        />
      </div>
    </AppShell>
  );
}
