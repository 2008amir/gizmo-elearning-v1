import { createFileRoute, Navigate } from "@tanstack/react-router";
export const Route = createFileRoute("/organisation/users")({ component: () => <Navigate to="/admin/users" /> });
