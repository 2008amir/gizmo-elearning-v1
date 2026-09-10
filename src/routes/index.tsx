import { createFileRoute } from "@tanstack/react-router";
import { AuthScreen } from "@/components/AuthScreen";

export const Route = createFileRoute("/")({
  component: AuthScreen,
  head: () => ({
    meta: [
      { title: "Sign in or Create Account — Gizmo Office Plus" },
      { name: "description", content: "Sign in to Gizmo Office Plus or create your free researcher account." },
    ],
  }),
});