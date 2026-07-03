import { createFileRoute, redirect } from "@tanstack/react-router";

// Auth was removed — /auth simply redirects to the admin panel.
export const Route = createFileRoute("/auth")({
  beforeLoad: () => {
    throw redirect({ to: "/admin" });
  },
  component: () => null,
});
