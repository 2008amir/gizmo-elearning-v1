import { createFileRoute, Navigate } from "@tanstack/react-router";
export const Route = createFileRoute("/organisation/analytics")({ component: () => <Navigate to="/admin" /> });
